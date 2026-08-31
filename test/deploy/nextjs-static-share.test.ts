import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const ENTRYPOINT = join(import.meta.dir, '../../scripts/nextjs-entrypoint.sh');

let tmpRoot: string | undefined;

afterEach(async () => {
  if (!tmpRoot) return;

  await rm(tmpRoot, { recursive: true, force: true });
  tmpRoot = undefined;
});

async function makeRoot(): Promise<string> {
  tmpRoot = await mkdtemp(join(tmpdir(), 'nextjs-static-share-'));

  return tmpRoot;
}

async function writeTree(
  root: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [ rel, body ] of Object.entries(files)) {
    const path = join(root, rel);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }
}

async function runShare(
 {
  src,
  share,
  buildIdFile,
  keep,
 }: {
  src: string,
  share: string,
  buildIdFile: string,
  keep?: number,
 },
): Promise<{ exitCode: number, stdout: string, stderr: string }> {
  const child = Bun.spawn([ 'sh', ENTRYPOINT, 'true' ], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NEXT_STATIC_SRC: src,
      NEXT_STATIC_SHARE: share,
      NEXT_BUILD_ID_FILE: buildIdFile,
      NEXT_STATIC_KEEP_BUILDS: String(keep ?? 3),
    },
  });

  const [ stdout, stderr, exitCode ] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  return { exitCode, stdout, stderr };
}

async function deployBuild(
 {
  root,
  share,
  buildId,
  files,
  keep,
 }: {
  root: string,
  share: string,
  buildId: string,
  files: Record<string, string>,
  keep?: number,
 },
): Promise<{ exitCode: number, stdout: string, stderr: string }> {
  const src = join(root, `src-${buildId}-${Date.now()}-${Math.random()}`);
  const buildIdFile = join(root, `build-${buildId}-${Date.now()}`);

  await mkdir(src, { recursive: true });
  await writeTree(src, files);
  await writeFile(buildIdFile, `${buildId}\n`);

  return runShare({ src, share, buildIdFile, keep });
}

describe('nextjs static share', () => {
  test('merges the current build onto an empty volume', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');

    const result = await deployBuild({
      root,
      share,
      buildId: 'aaa111',
      files: {
        'chunks/a.js': 'a',
        'css/a.css': 'a-css',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(share, 'chunks/a.js'))).toBe(true);
    expect(existsSync(join(share, 'css/a.css'))).toBe(true);
    expect(existsSync(join(share, '.sparkvey-builds/aaa111'))).toBe(true);
  });

  test('keeps untracked volume files during the first scripted roll', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');

    await writeTree(share, {
      'chunks/old.js': 'old',
      'css/old.css': 'old-css',
    });

    const result = await deployBuild({
      root,
      share,
      buildId: 'bbb222',
      files: {
        'chunks/new.js': 'new',
        'css/new.css': 'new-css',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(share, 'chunks/old.js'))).toBe(true);
    expect(existsSync(join(share, 'css/old.css'))).toBe(true);
    expect(existsSync(join(share, 'chunks/new.js'))).toBe(true);
    expect(existsSync(join(share, '.sparkvey-builds/_pre-existing'))).toBe(true);
  });

  test('does not delete the previous build while two replicas overlap', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');

    await deployBuild({
      root,
      share,
      buildId: 'oldbuild',
      files: {
        'chunks/old.js': 'old',
        'chunks/shared.js': 'shared',
      },
    });

    const result = await deployBuild({
      root,
      share,
      buildId: 'newbuild',
      files: {
        'chunks/new.js': 'new',
        'chunks/shared.js': 'shared',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(share, 'chunks/old.js'))).toBe(true);
    expect(existsSync(join(share, 'chunks/new.js'))).toBe(true);
    expect(existsSync(join(share, 'chunks/shared.js'))).toBe(true);
  });

  test('drops files once they fall outside the last N builds', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');
    const keep = 3;

    await deployBuild({
      root,
      share,
      buildId: 'build1',
      keep,
      files: { 'chunks/one.js': '1' },
    });
    await deployBuild({
      root,
      share,
      buildId: 'build2',
      keep,
      files: { 'chunks/two.js': '2' },
    });
    await deployBuild({
      root,
      share,
      buildId: 'build3',
      keep,
      files: { 'chunks/three.js': '3' },
    });
    const result = await deployBuild({
      root,
      share,
      buildId: 'build4',
      keep,
      files: { 'chunks/four.js': '4' },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(share, 'chunks/one.js'))).toBe(false);
    expect(existsSync(join(share, '.sparkvey-builds/build1'))).toBe(false);
    expect(existsSync(join(share, 'chunks/two.js'))).toBe(true);
    expect(existsSync(join(share, 'chunks/three.js'))).toBe(true);
    expect(existsSync(join(share, 'chunks/four.js'))).toBe(true);
  });

  test('keeps a file that later builds still reference', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');
    const keep = 3;

    await deployBuild({
      root,
      share,
      buildId: 'build1',
      keep,
      files: {
        'chunks/shared.js': 'shared',
        'chunks/one.js': '1',
      },
    });
    await deployBuild({
      root,
      share,
      buildId: 'build2',
      keep,
      files: { 'chunks/shared.js': 'shared' },
    });
    await deployBuild({
      root,
      share,
      buildId: 'build3',
      keep,
      files: { 'chunks/shared.js': 'shared' },
    });
    await deployBuild({
      root,
      share,
      buildId: 'build4',
      keep,
      files: { 'chunks/shared.js': 'shared' },
    });

    expect(existsSync(join(share, 'chunks/shared.js'))).toBe(true);
    expect(existsSync(join(share, 'chunks/one.js'))).toBe(false);
  });

  test('points src at the shared volume', async () => {
    const root = await makeRoot();
    const share = join(root, 'share');
    const src = join(root, 'src');
    const buildIdFile = join(root, 'BUILD_ID');

    await mkdir(src, { recursive: true });
    await writeTree(src, { 'chunks/a.js': 'a' });
    await writeFile(buildIdFile, 'linkme\n');

    const result = await runShare({ src, share, buildIdFile });

    expect(result.exitCode).toBe(0);
    expect(await readlink(src)).toBe(share);
  });

  test('rejects a missing static directory', async () => {
    const root = await makeRoot();
    const result = await runShare({
      src: join(root, 'missing'),
      share: join(root, 'share'),
      buildIdFile: join(root, 'BUILD_ID'),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('static directory missing');
  });

  test('rejects an invalid BUILD_ID', async () => {
    const root = await makeRoot();
    const src = join(root, 'src');
    const buildIdFile = join(root, 'BUILD_ID');

    await mkdir(src, { recursive: true });
    await writeTree(src, { 'chunks/a.js': 'a' });
    await writeFile(buildIdFile, '../escape\n');

    const result = await runShare({
      src,
      share: join(root, 'share'),
      buildIdFile,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('invalid Next BUILD_ID');
  });
});

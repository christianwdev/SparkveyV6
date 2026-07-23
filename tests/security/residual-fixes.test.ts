import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import type UserSession from 'types/UserSession';
import { createEarningsDb, MemoryCollection } from '../postback/memoryCollection';

const store = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createEarningsDb(store),
  }),
}));

const { sanitizeUserSession, deleteUserSession } = await import('backend/utils/session');
const { claimEmailActionable, releaseEmailActionable } = await import('backend/utils/emailActionable');

function sessionFixture(overrides: Partial<UserSession> = {}): UserSession {
  const now = new Date();

  return {
    sessionID: 'cookie-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    revokeID: 'revoke-public-bbbbbbbbbbbbbbbb',
    userID: 'user_1',
    accessedDate: now,
    expiryDate: new Date(now.getTime() + 60_000),
    userAgent: 'Mozilla/5.0',
    issueDate: now,
    initialIPAddress: '1.2.3.4',
    ipAddresses: [ '1.2.3.4' ],
    currentIPAddress: '1.2.3.4',
    twoFactor: { verified: false },
    ...overrides,
  };
}

describe('residual security fixes', () => {
  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    store.reset();
  });

  test('A: sanitizeUserSession exposes revokeID, never cookie sessionID', () => {
    const session = sessionFixture();
    const sanitized = sanitizeUserSession(session, session.sessionID);

    expect(sanitized.sessionID).toBe(session.revokeID);
    expect(sanitized.sessionID).not.toBe(session.sessionID);
    expect(sanitized.isCurrent).toBe(true);
  });

  test('B: deleteUserSession matches revokeID only (cookie secret rejected)', async () => {
    const session = sessionFixture();
    store.docs.push({ ...session });

    const byCookie = await deleteUserSession({
      userID: session.userID,
      sessionID: session.sessionID,
    });

    expect(byCookie.ok).toBe(false);
    if (!byCookie.ok) expect(byCookie.error).toBe('notFound');

    const byRevoke = await deleteUserSession({
      userID: session.userID,
      sessionID: session.revokeID,
    });

    expect(byRevoke.ok).toBe(true);
  });

  test('C: releaseEmailActionable clears claim so token can be retried', async () => {
    const future = new Date(Date.now() + 60_000);
    store.docs.push({
      actionableID: 'action-1',
      type: 'forgotPassword',
      userID: 'user_1',
      email: 'user@example.com',
      expiryDate: future,
      accessedDate: new Date(),
    });

    const release = await releaseEmailActionable({
      actionableID: 'action-1',
      type: 'forgotPassword',
    });

    const doc = store.docs[0];
    const reclaim = await claimEmailActionable({
      actionableID: 'action-1',
      type: 'forgotPassword',
    });

    expect(release.ok).toBe(true);
    expect(doc && 'accessedDate' in doc).toBe(false);
    expect(reclaim.ok).toBe(true);
  });

  test('D: clientRequest aborts credentialed mutations when CSRF missing', async () => {
    mock.module('@utils/csrf', () => ({
      CSRF_HEADER_NAME: 'x-csrf-token',
      ensureCsrfToken: async () => null,
    }));

    // Fresh import after mock (specifier must match clientRequest).
    const mod = await import(`../../src/utils/clientRequest.ts?csrf=${Date.now()}`);
    let threw = false;
    let message = '';

    try {
      await mod.clientRequest({
        url: 'http://127.0.0.1/profile/settings',
        method: 'POST',
        credentials: 'include',
        data: { ok: true },
      });
    } catch (error) {
      threw = true;
      message = error instanceof Error ? error.message : String(error);
    }

    expect(threw).toBe(true);
    expect(message.toLowerCase()).toContain('csrf');
  });

  test('E: source invariants for register / login / google / tremendous', () => {
    const root = join(import.meta.dir, '../..');
    const email = readFileSync(join(root, 'backend/routes/auth/email.ts'), 'utf8');
    const google = readFileSync(join(root, 'backend/utils/auth/google.ts'), 'utf8');
    const redemption = readFileSync(join(root, 'backend/utils/redemption.ts'), 'utf8');
    const clientRequest = readFileSync(join(root, 'src/utils/clientRequest.ts'), 'utf8');

    const registerStart = email.search(/['"]\/register['"]/);
    const loginStart = email.search(/['"]\/login['"]/);
    const registerBlock = registerStart >= 0 && loginStart > registerStart
      ? email.slice(registerStart, loginStart)
      : '';
    const loginBlock = loginStart >= 0 ? email.slice(loginStart) : '';

    const registerStartsSession = /startSession\s*\(/.test(registerBlock);
    const loginAlwaysDummy = email.includes('DUMMY_PASSWORD_HASH')
      && email.includes('Bun.password.verify(password, passwordHash)');
    const loginBlocksUnverified = loginBlock.includes('Please verify your email before signing in')
      || /if\s*\(\s*!user\.emailInformation\.verifiedAt\s*\)/.test(loginBlock);
    const googleReclaim = google.includes('clearPassword: true')
      && google.includes('google_account_exists');
    const tremendousNoRollbackAfterOrder = redemption.includes('failTremendousProcessing')
      && redemption.indexOf('const orderResult = await createTremendousOrder')
        < redemption.indexOf("failureReason: 'missingTremendousReward'");
    const csrfAbort = clientRequest.includes('Unable to obtain CSRF token');

    expect(registerStartsSession).toBe(true);
    expect(loginAlwaysDummy).toBe(true);
    expect(loginBlocksUnverified).toBe(false);
    expect(googleReclaim).toBe(true);
    expect(tremendousNoRollbackAfterOrder).toBe(true);
    expect(csrfAbort).toBe(true);
  });
});

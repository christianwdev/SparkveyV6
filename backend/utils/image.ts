import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import sharp from 'sharp';

const MAX_DIMENSION = 300;
const DEFAULT_DIMENSION = 200;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

const blockedAddresses = new BlockList();
blockedAddresses.addAddress('127.0.0.1');
blockedAddresses.addAddress('::1', 'ipv6');
blockedAddresses.addSubnet('0.0.0.0', 8);
blockedAddresses.addSubnet('10.0.0.0', 8);
blockedAddresses.addSubnet('100.64.0.0', 10);
blockedAddresses.addSubnet('127.0.0.0', 8);
blockedAddresses.addSubnet('169.254.0.0', 16);
blockedAddresses.addSubnet('172.16.0.0', 12);
blockedAddresses.addSubnet('192.168.0.0', 16);
blockedAddresses.addSubnet('224.0.0.0', 4);
blockedAddresses.addSubnet('240.0.0.0', 4);
blockedAddresses.addSubnet('fc00::', 7, 'ipv6');
blockedAddresses.addSubnet('fe80::', 10, 'ipv6');

export async function transformImage(
  imageURL: string,
  queryWidth: number,
  queryHeight: number,
): Promise<Buffer | null> {
  try {
    const imageBuffer = await fetchPublicImage(imageURL);
    if (!imageBuffer) return null;

    const width = sanitizeDimension(queryWidth);
    const height = sanitizeDimension(queryHeight);
    const metadata = await sharp(imageBuffer).metadata();
    const animated = (metadata.pages ?? 1) > 1;

    return await sharp(imageBuffer, { animated })
      .resize({
        width,
        height,
        fit: sharp.fit.inside,
      })
      .webp({
        quality: animated ? 80 : 90,
      })
      .toBuffer();
  } catch (error) {
    console.error(error);

    return null;
  }
}

function sanitizeDimension(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DIMENSION;

  return Math.min(Math.floor(value), MAX_DIMENSION);
}

async function fetchPublicImage(imageURL: string): Promise<Buffer | null> {
  let currentURL: URL;
  try {
    currentURL = new URL(imageURL);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isSafeImageURL(currentURL))) return null;

    const response = await fetch(currentURL, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REDIRECTS) return null;

      currentURL = new URL(location, currentURL);
      continue;
    }

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('image') && contentType !== 'application/octet-stream') {
      return null;
    }

    return readLimitedBody(response);
  }

  return null;
}

async function isSafeImageURL(url: URL): Promise<boolean> {
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.pathname.startsWith('/img/avatar/')) return false;

  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '');
  if (!hostname) return false;
  if (isBlockedHostname(hostname)) return false;

  const ipVersion = isIP(hostname);
  if (ipVersion !== 0) return !isBlockedAddress(hostname);

  try {
    const records = await lookup(hostname, { all: true });
    if (records.length === 0) return false;

    return records.every(record => !isBlockedAddress(record.address));
  } catch {
    return false;
  }
}

function isBlockedHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === 'metadata.google.internal') return true;

  return hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname.endsWith('.arpa');
}

function isBlockedAddress(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isBlockedAddress(mapped[1]);

  const version = isIP(address);
  if (version === 4) return blockedAddresses.check(address, 'ipv4');
  if (version === 6) return blockedAddresses.check(address, 'ipv6');

  return true;
}

async function readLimitedBody(response: Response): Promise<Buffer | null> {
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) return null;

  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();

      return null;
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

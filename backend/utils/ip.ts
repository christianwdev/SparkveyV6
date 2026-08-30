import { isIP } from 'node:net';

const CLASS_E_MIN_OCTET = 240; // Cloudflare Pseudo IPv4 uses 240.0.0.0/4

export function normalizeIP(ip: string): string {
  let trimmed = ip.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    trimmed = trimmed.slice(1, -1);
  }

  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];

  return trimmed;
}

function isClassEAddress(ip: string): boolean {
  const firstOctet = Number(ip.split('.')[0]);

  return firstOctet >= CLASS_E_MIN_OCTET;
}

export function preferIPv4(candidates: Array<string | undefined>): string | undefined {
  const ips: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const part of candidate.split(',')) {
      const ip = normalizeIP(part);
      if (ip) ips.push(ip);
    }
  }

  const ipv4 = ips.find(ip => isIP(ip) === 4 && !isClassEAddress(ip));
  if (ipv4) return ipv4;

  const ipv6 = ips.find(ip => isIP(ip) === 6);
  if (ipv6) return ipv6;

  return ips.find(ip => isIP(ip) === 4);
}

function expandIPv6(ip: string): string | null {
  if (!ip.includes(':')) return null;
  const parts = ip.split('::');
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(':').filter(Boolean) : [];
  const tail = parts[1] ? parts[1].split(':').filter(Boolean) : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  const full = [
    ...head,
    ...Array.from({ length: missing }, () => '0'),
    ...tail,
  ];

  return full.map(part => part.padStart(4, '0')).join(':').toLowerCase();
}

function ipv6Prefix64(ip: string): string | null {
  const expanded = expandIPv6(ip);
  if (!expanded) return null;

  return expanded.split(':').slice(0, 4).join(':');
}

function matchIPEntry(normalizedIP: string, entry: string): boolean {
  const trimmedEntry = entry.trim();

  if (trimmedEntry.includes('/')) {
    const [ prefix, bits ] = trimmedEntry.split('/');
    if (bits === '64' && prefix.includes(':')) {
      const ipPrefix = ipv6Prefix64(normalizedIP);
      const entryPrefix = ipv6Prefix64(prefix);

      return Boolean(ipPrefix && entryPrefix && ipPrefix === entryPrefix);
    }
  }

  if (trimmedEntry.includes(':') || normalizedIP.includes(':')) {
    const ipPrefix = ipv6Prefix64(normalizedIP);
    const entryPrefix = ipv6Prefix64(trimmedEntry.replace(/\/\d+$/, ''));
    if (ipPrefix && entryPrefix) {
      return ipPrefix === entryPrefix;
    }
  }

  return normalizedIP === trimmedEntry;
}

export function isIPWhitelisted(
  ip: string | undefined,
  whitelist: readonly string[] | undefined,
): boolean {
  if (!ip || !whitelist?.length) return false;
  const normalizedIP = normalizeIP(ip);

  return whitelist.some(entry => matchIPEntry(normalizedIP, entry));
}

export function maskIPAddress(ipAddress?: string): string {
  if (!ipAddress) return '•••';

  const normalized = normalizeIP(ipAddress);

  if (normalized.includes(':')) {
    const groups = normalized.split(':').filter(Boolean);
    if (groups.length === 0) return '•••';

    return `${groups.slice(0, 2).join(':')}:••••`;
  }

  const octets = normalized.split('.');
  if (octets.length !== 4) return '•••';

  return `${octets[0]}.${octets[1]}.***.***`;
}

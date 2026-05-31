export function normalizeIP(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  return trimmed;
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

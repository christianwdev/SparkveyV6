/** Swarm configs keep wrapping quotes that Compose strips. */
export function stripEnvQuotes(raw: string): string {
  let value = raw.replace(/^\uFEFF/, '').trim();

  for (let pass = 0; pass < 3; pass += 1) {
    if (value.startsWith('%22') && value.endsWith('%22') && value.length > 6) {
      value = value.slice(3, -3).trim();
      continue;
    }

    const quote = value[0];
    if (
      value.length >= 2
      && (quote === '"' || quote === "'")
      && value.endsWith(quote)
    ) {
      value = value.slice(1, -1).trim();
      continue;
    }

    break;
  }

  return value;
}

export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;

  const value = stripEnvQuotes(raw);

  return value || undefined;
}

export function unquoteProcessEnv(): void {
  for (const [ key, value ] of Object.entries(process.env)) {
    if (value === undefined) continue;

    const unquoted = stripEnvQuotes(value);
    if (unquoted !== value) process.env[key] = unquoted;
  }
}

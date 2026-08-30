/** Swarm configs keep wrapping quotes that Compose strips. */
export function stripEnvQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return trimmed;

  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;

  return stripEnvQuotes(raw);
}

export function unquoteProcessEnv(): void {
  for (const [ key, value ] of Object.entries(process.env)) {
    if (value === undefined) continue;

    const unquoted = stripEnvQuotes(value);
    if (unquoted !== value) process.env[key] = unquoted;
  }
}

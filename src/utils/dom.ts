export function canUseDom(): boolean {
  return 'document' in globalThis && globalThis.document !== undefined;
}

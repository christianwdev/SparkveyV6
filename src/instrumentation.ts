export async function register() {
  const { unquoteProcessEnv } = await import('../backend/utils/env');
  unquoteProcessEnv();
}

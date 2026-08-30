export async function register() {
  const { unquoteProcessEnv } = await import('@utils/env');
  unquoteProcessEnv();
}

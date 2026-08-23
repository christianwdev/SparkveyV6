import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = Number(process.env.E2E_PORT ?? 4173);
const E2E_HOST = process.env.E2E_HOST ?? '127.0.0.1';
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? `http://${E2E_HOST}:${E2E_PORT}`;
const WEB_SERVER_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 60_000;
const EXPECT_TIMEOUT_MS = 15_000;
const NAVIGATION_TIMEOUT_MS = 60_000;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    [ 'list' ],
    [ 'html', { open: 'never' } ],
  ],
  timeout: TEST_TIMEOUT_MS,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
  },
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Frontend-only: public pages soft-fail when the API is down.
  // NEXT_PUBLIC_ENV=development keeps SSR/client requests off production.
  webServer: {
    command: `./node_modules/.bin/next dev src/ --hostname ${E2E_HOST} --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: WEB_SERVER_TIMEOUT_MS,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NEXT_PUBLIC_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});

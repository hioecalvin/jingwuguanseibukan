import { defineConfig, devices } from '@playwright/test';
import { APP_ORIGIN, NAV_ORIGIN, assertSmokeEnvironment, assertSmokeBuild, smokeEnvironment } from './scripts/browser-smoke-config.mjs';

assertSmokeEnvironment();
assertSmokeBuild();

export default defineConfig({
  testDir: './tests/browser',
  globalTeardown: './scripts/browser-smoke-teardown.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_ORIGIN,
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'chromium-tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-tablet', use: { ...devices['iPad Mini'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    { command: 'node scripts/start-browser-app.mjs', url: `${APP_ORIGIN}/login`, env: smokeEnvironment(), reuseExistingServer: false, ignoreHTTPSErrors: false, timeout: 60_000 },
    { command: 'node scripts/serve-navigation-fixture.mjs', url: `${NAV_ORIGIN}/profile`, env: smokeEnvironment(), reuseExistingServer: false, ignoreHTTPSErrors: false, timeout: 60_000 },
  ],
});

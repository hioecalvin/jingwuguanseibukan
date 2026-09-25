import { defineConfig, devices } from '@playwright/test';

import { STAGING_APP_ORIGIN, assertStagingBrowserRuntime } from './scripts/staging-browser-target.mjs';

assertStagingBrowserRuntime();

export default defineConfig({
  testDir: './tests/staging-browser',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  // Keep each device's role sequence ordered, but run the three isolated
  // device projects concurrently. Every test receives a fresh browser context.
  workers: 3,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: process.env.STAGING_BROWSER_OUTPUT_DIR,
  use: {
    baseURL: STAGING_APP_ORIGIN,
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [] },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    ignoreHTTPSErrors: false,
    acceptDownloads: false,
  },
  projects: [
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-tablet', use: { ...devices['iPad Mini'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
});

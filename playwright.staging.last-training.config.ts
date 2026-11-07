import { defineConfig } from '@playwright/test';

import { STAGING_APP_ORIGIN } from './scripts/staging-browser-target.mjs';
import { assertStagingLastTrainingTarget } from './scripts/staging-last-training-target.mjs';

assertStagingLastTrainingTarget();

export default defineConfig({
  testDir: './tests/staging-browser',
  testMatch: 'last-training.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 75_000,
  expect: { timeout: 15_000 },
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
  ],
});

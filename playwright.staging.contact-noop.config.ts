import { defineConfig } from '@playwright/test';

import { STAGING_APP_ORIGIN } from './scripts/staging-browser-target.mjs';
import { assertStagingContactNoopTarget } from './scripts/staging-contact-noop-target.mjs';

assertStagingContactNoopTarget();

export default defineConfig({
  testDir: './tests/staging-browser',
  testMatch: 'contact-noop.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
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

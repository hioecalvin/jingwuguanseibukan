import type { Page } from '@playwright/test';
import type { FixtureRequestName } from './fixtures/request-gate';

// Install before navigation; the fixture cannot finish before assertions release it.
export async function installRequestGate(page: Page, name: FixtureRequestName) {
  await page.addInitScript((requestName) => {
    let release!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    window.__jwgFixtureRequests ??= {};
    window.__jwgFixtureRequests[requestName] = { wait, release, started: false };
  }, name);
}

export async function releaseRequestGate(page: Page, name: FixtureRequestName) {
  // Loading can render before a passive React effect starts the synthetic RPC.
  // Wait for that start rather than racing the effect or extending fixture timers.
  await page.waitForFunction(
    requestName => window.__jwgFixtureRequests?.[requestName]?.started === true,
    name,
    { timeout: 7000 },
  );
  await page.evaluate((requestName) => {
    const gate = window.__jwgFixtureRequests?.[requestName];
    if (!gate?.started) throw new Error(`Synthetic request not started: ${requestName}`);
    gate.release();
  }, name);
}

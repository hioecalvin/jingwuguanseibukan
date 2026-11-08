import { expect, type Page } from '@playwright/test';

// Use the same disclosure a person taps; never force clicks through hidden UI.
export async function expandCompactRecords(page: Page, text?: string) {
  if (page.viewportSize()!.width >= 1024) return;
  const records = text ? page.locator('.compact-record').filter({ hasText: text }) : page.locator('.compact-record');
  await expect(records.first()).toBeVisible();
  for (const record of await records.all()) {
    const toggle = record.locator(':scope > .compact-record-toggle');
    if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  }
}

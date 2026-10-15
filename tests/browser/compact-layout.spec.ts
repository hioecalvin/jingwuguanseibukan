import AxeBuilder from '@axe-core/playwright';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

for (const role of ['member', 'admin', 'super_admin']) {
  test(`${role} real dashboard uses compact expandable tool groups`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${NAV_ORIGIN}/dashboard-fixture?role=${role}`);
    const group = page.locator('section.compact-record').filter({ hasText: role === 'member' ? 'Quick Access' : 'Management' }).first();
    const toggle = group.locator(':scope > .compact-record-toggle');
    await expect(toggle).toBeVisible();
    if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    await expect(group.locator('button.compact-action').first()).toBeVisible();
    expect((await group.locator('button.compact-action').first().boundingBox())!.height).toBeLessThan(140);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await toggle.click();
    await expect(group.locator('button.compact-action').first()).not.toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${role}-dashboard-compact.png`), fullPage: true });
    await toggle.click();
    await page.screenshot({ path: testInfo.outputPath(`${role}-dashboard-expanded.png`), fullPage: true });
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test(`${role} compact records fit, expand by keyboard, preserve drafts and resize safely`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${NAV_ORIGIN}/profile?role=${role}&compact=1`);
    const record = page.locator('.compact-record').first();
    const toggle = record.locator('.compact-record-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('Notes', { exact: true })).not.toBeVisible();
    expect((await record.boundingBox())!.height).toBeLessThan(110);
    await toggle.focus();
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const notes = page.getByLabel('Notes', { exact: true });
    await notes.fill('Keep this unsaved draft');
    await toggle.click();
    await expect(notes).not.toBeVisible();
    await toggle.click();
    await expect(notes).toHaveValue('Keep this unsaved draft');
    await toggle.click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(toggle).not.toBeVisible();
    await expect(notes).toBeVisible();
    await page.setViewportSize({ width: 320, height: 640 });
    await expect(toggle).toBeVisible();
    await expect(notes).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${role}-compact-320.png`), fullPage: true });
    await toggle.click();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.emulateMedia({ media: 'print' });
    await expect(toggle).not.toBeVisible();
    await expect(notes).toBeVisible();
  });
}

test('validation reveals a collapsed required field without submitting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${NAV_ORIGIN}/profile?compact=1`);
  await page.getByRole('button', { name: 'Validate fixture' }).click();
  await expect(page.getByLabel('Notes', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Notes', { exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(0);
});

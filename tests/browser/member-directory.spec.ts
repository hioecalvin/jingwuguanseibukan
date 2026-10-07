import AxeBuilder from '@axe-core/playwright';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

test('directory keeps namesakes separate, enrolments together and exposes only public details', async ({ page }, testInfo) => {
  await page.goto(`${NAV_ORIGIN}/directory-fixture`);
  const rows = page.locator('.directory-member');
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Amy Example', exact: true })).toHaveCount(2);
  const zoe = rows.filter({ hasText: 'Zoe Example' });
  await expect(zoe.getByRole('listitem')).toHaveCount(2);
  await expect(zoe).toContainText('Aikido · West Dojo · 2 Dan');
  await expect(zoe).toContainText('Karate · East Dojo · 1 Kyu');
  await expect(page.getByRole('link')).toHaveCount(1);
  await expect(page.getByRole('link')).toHaveAttribute('href', 'https://www.instagram.com/zoe.example/');
  await expect(page.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  for (const row of await rows.all()) await expect(row).not.toContainText(/email|DOB|payment|attendance|Member ID/i);
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(zoe.getByRole('link')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`directory-${width}.png`), fullPage: true });
  }
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('directory filters by class and dojo and sorts by name, class or dojo', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/directory-fixture`);
  const names = page.locator('.directory-member h2');
  await expect(names).toHaveText(['Amy Example', 'Zoe Example', 'Amy Example']);
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('dojo');
  await expect(names).toHaveText(['Amy Example', 'Zoe Example', 'Amy Example']);
  await expect(page.locator('.directory-member').first()).toContainText('Karate');
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('name');
  await expect(names).toHaveText(['Amy Example', 'Amy Example', 'Zoe Example']);
  await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption('Karate');
  await page.getByRole('combobox', { name: 'Dojo', exact: true }).selectOption('East Dojo');
  await expect(names).toHaveText(['Amy Example', 'Zoe Example']);
  await expect(page.locator('.directory-member').last()).toContainText('Aikido');
  await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption('Aikido');
  await expect(page.getByRole('combobox', { name: 'Dojo', exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Dojo', exact: true }).getByRole('option', { name: 'East Dojo' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Dojo', exact: true }).selectOption('North Dojo');
  await expect(names).toHaveText(['Amy Example']);
});

for (const mode of ['network-error', 'rpc-error']) {
  test(`directory ${mode} fails closed and supports retry`, async ({ page }) => {
    await page.goto(`${NAV_ORIGIN}/directory-fixture?mode=${mode}`);
    await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
    await expect(page.locator('.directory-member')).toHaveCount(0);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.directory-member')).toHaveCount(3);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('directory empty state contains no stale member rows', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/directory-fixture?mode=empty`);
  await expect(page.getByRole('status')).toHaveText('No members match these filters.');
  await expect(page.locator('.directory-member')).toHaveCount(0);
});

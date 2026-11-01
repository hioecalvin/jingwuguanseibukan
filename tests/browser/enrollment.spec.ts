import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('rejected Member can reapply and cancel without leaving pending approval', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/enrollment`);
  await expect(page).toHaveTitle('Pending approval workflow fixture');
  await expect(page.getByRole('heading', { name: 'Pending approval workflow fixture' })).toBeVisible();
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible();
  await expect(page.getByText('Please confirm your dojo before applying again.')).toBeVisible();

  await page.getByRole('button', { name: 'Enroll in Another Class' }).click();
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-kung-fu');
  await page.getByRole('button', { name: 'Request Enrollment' }).click();
  await expect(page.getByText('Please select a dojo.', { exact: true })).toBeVisible();

  await page.getByLabel('Dojo', { exact: true }).selectOption('fixture-dojo');
  await page.getByLabel('Note', { exact: false }).fill('Updated dojo confirmed');
  await page.getByRole('button', { name: 'Request Enrollment' }).click();
  await expect(page.getByText('Enrollment request submitted successfully.')).toBeVisible();

  const pending = page.locator('article').filter({ hasText: 'Updated dojo confirmed' });
  await expect(pending.getByText('Pending', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await pending.getByRole('button', { name: 'Cancel Request' }).click();
  await expect(page.getByText('Enrollment request cancelled.')).toBeVisible();
  await expect(pending.getByText('Cancelled', { exact: true })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

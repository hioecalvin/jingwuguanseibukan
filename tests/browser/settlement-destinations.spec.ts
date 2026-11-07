import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { expandCompactRecords } from './compact-record-helpers';

test('dojo nomination distinguishes class scopes, preserves failed input and shows recorded destination', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-settlements`);
  await page.getByText('Share destination accounts', { exact: true }).click();
  await page.getByLabel('Class and dojo', { exact: true }).selectOption('fixture-dojo');
  await expect(page.getByRole('link', { name: 'Manage collection account' })).toHaveAttribute('href', '/admin/subscriptions');
  await page.getByLabel('Destination bank', { exact: true }).fill('TEST BANK');
  await page.getByLabel('Destination account holder', { exact: true }).fill('TEST HOLDER');
  await page.getByLabel('Destination account number', { exact: true }).fill('TEST-REJECT');
  await page.getByRole('button', { name: 'Save nominated account' }).click();
  await expect(page.getByRole('alert')).toContainText('The destination changed');
  await expect(page.getByLabel('Destination account number', { exact: true })).toHaveValue('TEST-REJECT');
  await page.getByLabel('Destination account number', { exact: true }).fill('TEST-NEW');
  await page.getByRole('button', { name: 'Save nominated account' }).click();
  await expect(page.getByRole('status')).toContainText('Destination saved for new settlements');
  await page.getByLabel('Class and dojo', { exact: true }).selectOption('karate-dojo');
  await expect(page.getByLabel('Destination account number', { exact: true })).toHaveValue('');
  await expect(page.getByText('Use the separate account nominated by Karate · Chushin for its 25% share.')).toBeVisible();
  await expandCompactRecords(page);
  await page.getByRole('button', { name: 'View recorded destination' }).first().click();
  await expect(page.getByText('TEST-ORIGINAL', { exact: true })).toBeVisible();
});

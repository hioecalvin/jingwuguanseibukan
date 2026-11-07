import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('class appointment requires confirmation and changes only the selected class', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/instructor-appointments');
  await page.getByLabel('Search name or JS ID').fill('JS0002');
  await page.getByRole('button', { name: 'Appoint Second Member for Taijiquan', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appoint Second Member for Taijiquan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appoint Second Member for Taijiquan', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm appointment', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Taijiquan instructor appointment granted');
  await expect(page.getByRole('button', { name: 'Appoint Second Member for Aikido', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Revoke Second Member for Taijiquan', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm revocation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('revoked');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('conflicting instructor edit reloads without claiming success', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/instructor-appointments?conflict=1');
  await page.getByRole('button', { name: 'Revoke First Instructor for Aikido', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm revocation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not confirm');
  await expect(page.getByRole('button', { name: 'Revoke First Instructor for Aikido', exact: true })).toBeVisible();
});

import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('Super Admin changes whole-member status independently from class enrollments', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?multiple=1');
  await page.getByRole('button', { name: 'Member ID 0101: Fixture Member' }).click();
  const editor = page.getByRole('region', { name: 'Member status for Fixture Member' });
  await editor.getByRole('button', { name: 'View member status' }).click();
  const status = editor.getByRole('combobox');
  const save = editor.getByRole('button', { name: 'Save member status' });
  await expect(status).toHaveValue('active');
  await expect(save).toBeDisabled();
  await status.selectOption('terminated');
  await save.click();
  await expect(editor.getByRole('status')).toHaveText('Member status saved as Terminated.');
  expect(await page.evaluate(() => window.__lastTrainingFixture.administrativeChanges)).toEqual([
    { target_member_id: 'fixture-member', expected_status: 'active', new_status: 'terminated' },
  ]);
  await expect(page.getByRole('combobox', { name: 'Enrollment status for Fixture Member' })).toHaveValue('active');
  await page.getByRole('button', { name: 'View Details: Karate at Second Dojo for Fixture Member' }).click();
  await expect(page.getByRole('combobox', { name: 'Enrollment status for Fixture Member' })).toHaveValue('inactive');
  expect(await page.evaluate(() => window.__lastTrainingFixture.trainingCalls)).toEqual([]);
});

test('unenrolled member supports changing status and recovering from a stale edit', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?unenrolled=1');
  await page.locator('summary').filter({ hasText: 'Recovered Person' }).click();
  const editor = page.getByRole('region', { name: 'Member status for Recovered Person' });
  await editor.getByRole('button', { name: 'View member status' }).click();
  await expect(editor.getByRole('combobox')).toHaveValue('inactive');
  await editor.getByRole('combobox').selectOption('active');
  await page.evaluate(() => { window.__lastTrainingFixture.administrativeStatuses['fixture-unenrolled'] = 'terminated'; });
  await editor.getByRole('button', { name: 'Save member status' }).click();
  await expect(editor.getByRole('alert')).toContainText('Reload member status');
  await editor.getByRole('button', { name: 'Reload member status' }).click();
  await expect(editor.getByRole('combobox')).toHaveValue('terminated');
  await editor.getByRole('combobox').selectOption('active');
  await editor.getByRole('button', { name: 'Save member status' }).click();
  await expect(editor.getByRole('status')).toHaveText('Member status saved as Active.');
  expect(await page.evaluate(() => window.__lastTrainingFixture.trainingCalls)).toEqual([]);
});

test('Dojo Admin can see the class enrollment status and has no whole-member editor', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?dojo-admin=1');
  await page.getByRole('button', { name: 'Member ID 0101: Fixture Member' }).click();
  await expect(page.getByRole('combobox', { name: 'Enrollment status for Fixture Member' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Member status for Fixture Member' })).toHaveCount(0);
});

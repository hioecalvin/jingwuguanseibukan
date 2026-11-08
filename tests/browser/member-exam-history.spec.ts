import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('member exams load on demand, stay within the selected class and preserve historical meanings', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?multiple=1&exam=1`);
  const member = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fixture Member', exact: true }) });
  await member.getByRole('button', { name: 'Member ID 0101: Fixture Member', exact: true }).click();
  expect(await page.evaluate(() => window.__lastTrainingFixture.examQueries)).toEqual([]);
  await member.locator('summary').filter({ hasText: /^Exam History$/ }).click();
  await expect(member.locator('summary').filter({ hasText: 'Historical grade' })).toBeVisible();
  await expect(member.locator('summary').filter({ hasText: 'Record lost' })).toBeVisible();
  await expect(member.locator('summary').filter({ hasText: 'Rank skipped' })).toBeVisible();
  await expect(member.getByText('Other class exam', { exact: false })).toHaveCount(0);
  await member.locator('summary').filter({ hasText: 'Historical grade' }).click();
  await expect(member.getByText('2019-0001', { exact: true })).toBeVisible();
  await expect(member.getByText('Recorded value: 2019', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => window.__lastTrainingFixture.examQueries)).toEqual([{ target_member_id: 'fixture-member' }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('member exam failures retry without exposing internal errors or reporting an empty history', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?exam=1`);
  await page.getByRole('button', { name: 'Member ID 0101: Fixture Member', exact: true }).click();
  await page.evaluate(() => { window.__lastTrainingFixture.failNextExam = true; });
  await page.locator('summary').filter({ hasText: /^Exam History$/ }).click();
  await expect(page.getByRole('alert')).toContainText('Exam history could not be loaded.');
  await expect(page.getByText('Private exam failure')).toHaveCount(0);
  await expect(page.getByText('No exam records available for this class.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry exam history' }).click();
  await expect(page.locator('summary').filter({ hasText: 'Record lost' })).toBeVisible();
});

test('missing joining dates remain Unknown and are not taken from exams', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?exam=1&unknown-joined=1`);
  await page.getByRole('button', { name: 'Member ID 0101: Fixture Member', exact: true }).click();
  await expect(page.locator('.member-overview')).toContainText('Date JoinedUnknown');
  await page.locator('summary').filter({ hasText: /^Exam History$/ }).click();
  await expect(page.locator('summary').filter({ hasText: 'Historical grade' })).toBeVisible();
  await expect(page.locator('.member-overview')).toContainText('Date JoinedUnknown');
});

test('recovered profiles remain visible without inventing an enrollment', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?unenrolled=1');
  const panel = page.getByRole('region', { name: 'Members awaiting enrollment review' });
  await expect(panel).toContainText('Showing 1 of 1 profiles without enrollment');
  await page.getByPlaceholder('Name / Member ID / Email / Phone / WhatsApp').fill('JS0124A');
  await expect(panel).toContainText('Recovered Person');
  await panel.locator('summary').filter({ hasText: 'JS-0124A' }).click();
  await panel.locator('summary').filter({ hasText: /^Exam History$/ }).click();
  await expect(panel.locator('summary').filter({ hasText: 'Aikido' })).toContainText('6th Kyu');
  await panel.locator('summary').filter({ hasText: 'Aikido' }).click();
  await expect(panel.getByText('2008-0001', { exact: true })).toBeVisible();
  await expect(panel.getByText('Account disabled', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => window.__lastTrainingFixture.trainingCalls)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Dojo Admin does not receive the unassigned-profile administration panel', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?unenrolled=1&dojo-admin=1');
  await expect(page.getByRole('heading', { name: 'Member Management', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Members awaiting enrollment review' })).toHaveCount(0);
});

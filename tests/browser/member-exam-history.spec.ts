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

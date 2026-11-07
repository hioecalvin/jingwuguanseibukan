import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

test('Super Admin prepares pending certificates and submits one atomic pass/fail assessment', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-assessments`);
  await expect(page).toHaveTitle('Assessment mutation workflow fixture');
  await expect(page.getByRole('heading', { name: 'Bulk Assessments' })).toBeVisible();

  const scope = page.getByRole('region', { name: '1. Assessment scope' });
  const classSelect = scope.getByRole('combobox').nth(0);
  await expect(classSelect).toHaveValue('fixture-class');
  await scope.getByRole('combobox').nth(1).selectOption('fixture-dojo');
  await page.getByRole('button', { name: 'Load eligible roster' }).click();

  await expect(page.getByText('Included 0 of 3 eligible candidates.')).toBeVisible();
  await expect(page.getByText('Legacy member tier', { exact: false })).toHaveCount(0);
  await expect(page.getByText('1st Kyu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Include visible' }).click();
  const assessors = page.getByRole('region', { name: '2. Assessors' });
  await assessors.getByRole('combobox').selectOption('fixture-assessor');
  await expect(assessors.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Prepare roster and pending certificates' }).click();

  await expect(page.getByRole('status')).toContainText('Prepared assessment opened with 3 candidates and 3 certificates.');
  await expect(page.getByRole('heading', { name: 'Prepared certificates' })).toBeVisible();
  await expect(page.getByText('Current status: Pending assessment')).toBeVisible();

  const failedCandidate = page.getByRole('article').filter({ hasText: 'Citra Junior' });
  await failedCandidate.getByLabel('Result').selectOption('fail');
  await failedCandidate.getByLabel('Notes').fill('Re-assess at the next grading.');
  await page.getByRole('button', { name: 'Review all results' }).click();

  const review = page.locator('#assessment-review');
  await expect(review).toContainText('Included3');
  await expect(review).toContainText('Pass2');
  await expect(review).toContainText('Fail1');
  await review.getByLabel(/I confirm the scope/).check();
  await review.getByRole('button', { name: 'Confirm and submit once' }).click();

  await expect(page.getByRole('status')).toContainText('3 results recorded together: 2 passed and 1 failed.');
  await expect(page.getByRole('status')).toContainText('A class grading-results announcement was published.');
  await expect(page.getByText('Current status: Results submitted')).toBeVisible();
  await expect(failedCandidate.getByLabel('Result')).toBeDisabled();

  const fixtureState = await page.evaluate(() =>
    (window as Window & { __assessmentFixture?: unknown }).__assessmentFixture,
  );
  expect(fixtureState).toMatchObject({
    preparedRows: [
      { membership_id: 'membership-high', outcome: 'pass', certificate_status: 'issued' },
      { membership_id: 'membership-middle', outcome: 'pass', certificate_status: 'issued' },
      { membership_id: 'membership-low', outcome: 'fail', certificate_status: 'voided' },
    ],
    submission: {
      promotedMemberships: ['membership-high', 'membership-middle'],
      unchangedMemberships: ['membership-low'],
      announcementClassId: 'fixture-class',
      announcementDojoId: 'fixture-dojo',
      announcementOrder: ['Akira Senior', 'Budi Middle'],
    },
  });
});

test('assessment search finds JS IDs and keeps selected members first', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-assessments');
  await page.getByRole('region', { name: '1. Assessment scope' }).getByRole('combobox').nth(1).selectOption('fixture-dojo');
  await page.getByRole('button', { name: 'Load eligible roster' }).click();
  await expect(page.getByText('Included 0 of 3 eligible candidates.')).toBeVisible();
  const search = page.getByLabel('Search assessment members');
  await search.fill('JS0103');
  await expect(page.getByRole('checkbox', { name: 'Include Citra Junior' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Include Akira Senior' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Include Citra Junior' }).check();
  await search.fill('Akira');
  const choices = page.getByRole('checkbox', { name: /^Include / });
  await expect(choices).toHaveCount(2);
  await expect(choices.first()).toHaveAccessibleName('Include Citra Junior');
  await expect(page.getByText('Included 1 of 3 eligible candidates.')).toBeVisible();
});

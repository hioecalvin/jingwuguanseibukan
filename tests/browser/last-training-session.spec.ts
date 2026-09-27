import AxeBuilder from '@axe-core/playwright';

import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

type LastTrainingFixtureState = {
  failNextTraining: boolean;
  trainingCalls: Array<{ name: string; args: Record<string, unknown> }>;
};

function fixtureState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (window as Window & { __lastTrainingFixture: LastTrainingFixtureState }).__lastTrainingFixture,
  );
}

test('Admin marks today and then corrects the last training session date', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training`);
  await expect(page).toHaveTitle('Last training workflow fixture');
  await expect(page.getByRole('heading', { name: 'Member Management' })).toBeVisible();

  const member = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fixture Member' }) });
  await expect(member.getByText('Last Training Session', { exact: true })).toBeVisible();
  await expect(member).toContainText('01/08/2026');

  await member.getByRole('button', { name: 'Mark Fixture Member as trained today for Aikido' }).click();
  await expect(page.getByText('Fixture Member was marked as trained today.')).toBeVisible();
  await expect(member.getByRole('status')).toHaveText('Training recorded for today.');
  await expect(member).toContainText('Today');
  await expect(member.getByRole('button', { name: 'Trained Today' })).toBeDisabled();

  await member.getByLabel('Correct or backdate the session').fill('2026-09-10');
  await member.getByRole('button', { name: 'Save Date Correction' }).click();
  await expect(page.getByText("Fixture Member's last training session was corrected.")).toBeVisible();
  await expect(member.getByRole('status')).toHaveText('Training date corrected.');
  await expect(member).toContainText('17 days ago');

  expect(await fixtureState(page)).toMatchObject({
    trainingCalls: [
      {
        name: 'mark_membership_trained_today',
        args: { target_membership_id: 'fixture-membership' },
      },
      {
        name: 'set_membership_last_training_session',
        args: {
          target_membership_id: 'fixture-membership',
          new_training_date: '2026-09-10',
        },
      },
    ],
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('Admin can retry a rejected training update without losing the correction date', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training`);
  await page.evaluate(() => {
    (window as Window & { __lastTrainingFixture: LastTrainingFixtureState }).__lastTrainingFixture.failNextTraining = true;
  });

  const member = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fixture Member' }) });
  const date = member.getByLabel('Correct or backdate the session');
  await date.fill('2026-09-10');
  await member.getByRole('button', { name: 'Save Date Correction' }).click();
  await expect(member.getByRole('alert')).toHaveText('Training update rejected for retry.');
  await expect(date).toHaveValue('2026-09-10');
  await expect(member.getByRole('button', { name: 'Save Date Correction' })).toBeEnabled();

  await member.getByRole('button', { name: 'Save Date Correction' }).click();
  await expect(member.getByRole('status')).toHaveText('Training date corrected.');
  await expect(member).toContainText('17 days ago');
  expect((await fixtureState(page)).trainingCalls).toHaveLength(2);
});

test('Member sees server-calculated recency and the safe unavailable fallback', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/profile-contact`);
  const aikido = page.getByRole('article').filter({ hasText: 'Fixture Aikido Dojo' });
  const karate = page.getByRole('article').filter({ hasText: 'Fixture Karate Dojo' });
  await expect(aikido).toContainText('Last Training Session');
  await expect(aikido).toContainText('12 days ago');
  await expect(karate).toContainText('Last Training Session');
  await expect(karate).toContainText('01/08/2026');
  await expect.poll(async () => (await page.evaluate(() =>
    (window as Window & { __profileContactFixture: { trainingRequests: number } }).__profileContactFixture.trainingRequests,
  ))).toBe(1);

  await page.goto(`${NAV_ORIGIN}/profile-contact?training-error=1`);
  await expect(page.getByText('Your profile loaded, but the latest training-session status is temporarily unavailable.')).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Fixture Aikido Dojo' })).toContainText('Temporarily unavailable');
  await expect(page.getByRole('article').filter({ hasText: 'Fixture Karate Dojo' })).toContainText('Temporarily unavailable');
});

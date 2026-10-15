import AxeBuilder from '@axe-core/playwright';

import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

test('Super Admin configures deceased access, annual memorials and initial publication', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-memorial`);
  await expect(page).toHaveTitle('Memorial workflow fixture');
  const panel = page.getByRole('region', { name: 'Deceased member and memorial settings for Fixture Member' });
  await expect(panel).toContainText('Records, grades, certificates, attendance and Member ID are preserved.');
  await expect(panel).toContainText('Deceased is separate from Inactive or Terminated.');

  await panel.getByRole('button', { name: 'Manage Memorial Settings' }).click();
  const deceased = panel.getByRole('checkbox', { name: /Deceased/ });
  const date = panel.getByLabel('Date of Passing');
  await expect(date).toBeDisabled();
  await deceased.check();
  await expect(date).toBeEnabled();
  await date.fill('2025-05-20');

  await panel.getByRole('checkbox', { name: 'Karate' }).check();
  await panel.getByRole('checkbox', { name: /Publish annually on the passing anniversary/ }).check();
  const remembrance = panel.getByRole('group', { name: 'Remembrance Day' });
  await remembrance.getByLabel('Message').fill('Today we remember Fixture Member.');
  await panel.getByRole('checkbox', { name: /Replace the ordinary birthday announcement/ }).check();
  const birthday = panel.getByRole('group', { name: 'Heavenly Birthday' });
  await birthday.getByLabel('Message').fill('Remembering Fixture Member on their heavenly birthday.');

  const initial = panel.getByRole('group', { name: 'Initial Memorial' });
  await initial.getByLabel('Title').fill('In Memory of Fixture Member');
  await initial.getByLabel('Message').fill('With gratitude, we remember our friend and training partner.');
  await panel.getByRole('button', { name: 'Save Deceased & Memorial Settings' }).click();
  await panel.getByRole('button', { name: 'Publish Initial Memorial' }).click();

  const fixtureState = await page.evaluate(() =>
    (window as Window & { __memorialFixture?: unknown }).__memorialFixture,
  );
  expect(fixtureState).toMatchObject({
    savedDraft: {
      isDeceased: true,
      dateOfPassing: '2025-05-20',
      recipientClassIds: ['class-aikido', 'class-karate'],
      remembranceEnabled: true,
      remembranceMessage: 'Today we remember Fixture Member.',
      heavenlyBirthdayEnabled: true,
      heavenlyBirthdayMessage: 'Remembering Fixture Member on their heavenly birthday.',
    },
    publishedDraft: {
      initialMemorialTitle: 'In Memory of Fixture Member',
      initialMemorialMessage: 'With gratitude, we remember our friend and training partner.',
    },
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('clearing Deceased disables memorial controls and clears annual enablement', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-memorial`);
  const panel = page.getByRole('region', { name: 'Deceased member and memorial settings for Fixture Member' });
  await panel.getByRole('button', { name: 'Manage Memorial Settings' }).click();
  const deceased = panel.getByRole('checkbox', { name: /Deceased/ });
  await deceased.check();
  await panel.getByLabel('Date of Passing').fill('2025-05-20');
  await panel.getByRole('checkbox', { name: /Publish annually on the passing anniversary/ }).check();
  await panel.getByRole('checkbox', { name: /Replace the ordinary birthday announcement/ }).check();
  await deceased.uncheck();

  await expect(panel.getByLabel('Date of Passing')).toBeDisabled();
  await expect(panel.getByLabel('Date of Passing')).toHaveValue('');
  await expect(panel.getByRole('checkbox', { name: /Publish annually on the passing anniversary/ })).not.toBeChecked();
  await expect(panel.getByRole('checkbox', { name: /Replace the ordinary birthday announcement/ })).not.toBeChecked();
  const initial = panel.getByRole('group', { name: 'Initial Memorial' });
  await expect(initial.getByLabel('Title')).toBeDisabled();
  await expect(initial.getByLabel('Message')).toBeDisabled();
  await expect(initial.getByRole('button', { name: 'Publish Initial Memorial' })).toBeDisabled();
});

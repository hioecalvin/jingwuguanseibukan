import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

type ProfileContactState = {
  failNextContact: boolean;
  failNextEmail: boolean;
  contactCalls: Array<{ new_phone: string; new_instagram_username: string }>;
  emailCalls: Array<{ authorization: string | null; body: { newEmail?: string } }>;
  trainingRequests: number;
};

function fixtureState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (window as Window & { __profileContactFixture: ProfileContactState }).__profileContactFixture,
  );
}

test('Member updates only contact fields and requests a verified email replacement', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/profile-contact`);
  await expect(page).toHaveTitle('Contact self-service fixture');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();

  const contact = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Phone & Instagram' }) });
  await contact.getByRole('button', { name: 'Edit' }).click();
  await contact.getByLabel('Phone').fill('+62 (812) 345-6789');
  await contact.getByLabel('Instagram username (optional)').fill('@Fixture.Member');
  await contact.getByRole('button', { name: 'Save Contact Details' }).click();

  await expect(page.getByText('Contact details updated successfully.')).toBeVisible();
  await expect(contact).toContainText('+628123456789');
  await expect(contact).toContainText('@fixture.member');
  const personal = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal Details' }) });
  await expect(personal).toContainText('0101');
  await expect(personal).toContainText('Fixture Member');
  await expect(personal).toContainText('member@example.test');

  const email = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Change Email' }) });
  await email.getByLabel('New email address').fill('new@example.test');
  await email.getByRole('button', { name: 'Send Verification' }).click();
  await expect(page.getByText('Verification was sent to the new email address.')).toBeVisible();
  await expect(email).toContainText('Current email: member@example.test');
  await expect(email.getByLabel('New email address')).toHaveValue('');

  expect(await fixtureState(page)).toMatchObject({
    contactCalls: [{
      new_phone: '+62 (812) 345-6789',
      new_instagram_username: '@Fixture.Member',
    }],
    emailCalls: [{
      authorization: 'Bearer fixture-access-token',
      body: { newEmail: 'new@example.test' },
    }],
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Member can retry rejected contact and email changes without losing the form', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/profile-contact`);
  await page.evaluate(() => {
    (window as Window & { __profileContactFixture: ProfileContactState }).__profileContactFixture.failNextContact = true;
  });

  const contact = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Phone & Instagram' }) });
  await contact.getByRole('button', { name: 'Edit' }).click();
  await contact.getByLabel('Phone').fill('0062 811-222-333');
  await contact.getByLabel('Instagram username (optional)').fill('Retry.Member');
  await contact.getByRole('button', { name: 'Save Contact Details' }).click();
  await expect(page.getByText('Contact update rejected for retry.')).toBeVisible();
  await expect(contact.getByRole('button', { name: 'Save Contact Details' })).toBeEnabled();
  await contact.getByRole('button', { name: 'Save Contact Details' }).click();
  await expect(page.getByText('Contact details updated successfully.')).toBeVisible();
  await expect(contact).toContainText('+62811222333');

  await page.evaluate(() => {
    (window as Window & { __profileContactFixture: ProfileContactState }).__profileContactFixture.failNextEmail = true;
  });
  const email = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Change Email' }) });
  await email.getByLabel('New email address').fill('used@example.test');
  await email.getByRole('button', { name: 'Send Verification' }).click();
  await expect(page.getByText('That email address is already in use.')).toBeVisible();
  await expect(email.getByLabel('New email address')).toHaveValue('used@example.test');
  await email.getByLabel('New email address').fill('newer@example.test');
  await email.getByRole('button', { name: 'Send Verification' }).click();
  await expect(page.getByText('Verification was sent to the new email address.')).toBeVisible();
  await expect(email.getByRole('button', { name: 'Send Verification' })).toBeEnabled();

  const state = await fixtureState(page);
  expect(state.contactCalls).toHaveLength(2);
  expect(state.emailCalls.map(call => call.body.newEmail)).toEqual(['used@example.test', 'newer@example.test']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

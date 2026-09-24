import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function typeText(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.click();
  await input.pressSequentially(value);
}

async function registrationFields(page: Page) {
  await typeText(page, 'Aikikai Registration Number (optional)', ' AIKIKAI   100 ');
  await typeText(page, 'Full Name', ' Test   Member ');
  await page.getByLabel('Date of Birth', { exact: true }).fill('2000-01-01');
  await typeText(page, 'Email', 'fixture@example.invalid');
  await typeText(page, 'Phone Number', ' 123   456 ');
  await typeText(page, 'Password', 'FixturePassword123');
  await typeText(page, 'Confirm Password', 'FixturePassword123');
}

test('login keyboard order, visible focus, responsive layout and automated accessibility', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expect(page).toHaveTitle('Member login | Jingwuguan Seibukan');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  const outline = await page.getByLabel('Password', { exact: true }).evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Log In', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Create account' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
});

test('failed login displays an error and releases submission', async ({ page, backend }) => {
  await page.goto('/login');
  await typeText(page, 'Email', 'fixture@example.invalid');
  await typeText(page, 'Password', 'FixturePassword123');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByText('Invalid fixture credentials', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log In', exact: true })).toBeEnabled();
  expect(backend.authCalls).toBe(1);
  await expect(page).toHaveURL(/\/login$/);
});

test('verified and disabled login redirects show safe, accessible feedback', async ({ page }) => {
  await page.goto('/login?verified=true&message=private-detail');
  const verified = page.getByRole('status');
  await expect(verified).toHaveText('Email verified. Log in to check your membership approval status.');
  await expect(page.getByText('private-detail')).toHaveCount(0);
  await expect(verified).toHaveClass(/text-green-400/);

  await page.goto('/login?error=disabled');
  const disabled = page.getByRole('status');
  await expect(disabled).toHaveText('This account is disabled. Contact an administrator for help.');
  await expect(disabled).toHaveAttribute('aria-live', 'assertive');
});

test('invalid confirmation recovery is responsive, keyboard usable and accessible', async ({ page }, testInfo) => {
  await page.goto('/auth/error');
  await expect(page).toHaveTitle('Confirmation link unavailable | Jingwuguan Seibukan');
  await expect(page.getByRole('heading', { name: 'Confirmation link unavailable' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Return to login' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Register', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('confirmation-error.png'), fullPage: true });
});

test('registration class failure and retry recover without submitting', async ({ page, backend }) => {
  backend.classFailures = Infinity;
  await page.goto('/register');
  await expect(page).toHaveTitle('Member registration | Jingwuguan Seibukan');
  await expect(page.getByText('Could not load classes. Registration is temporarily unavailable.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeDisabled();
  backend.classFailures = 0;
  await page.getByRole('button', { name: 'Retry classes' }).click();
  await expect(page.getByLabel('Class', { exact: true })).toBeEnabled();
  await expect(page.getByRole('option', { name: 'Fixture Karate' })).toBeAttached();
  expect(backend.authCalls).toBe(0);
});

test('registration empty class catalog explains why submission is unavailable', async ({ page, backend }) => {
  backend.classes = [];
  await page.goto('/register');
  await expect(page.getByText('No classes are available. Please contact your administrator.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeDisabled();
  expect(backend.authCalls).toBe(0);
});

test('dojo failure blocks submission and retry renders a labelled selector', async ({ page, backend }, testInfo) => {
  backend.dojoFailures = Infinity;
  await page.goto('/register');
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-a');
  await expect(page.getByText('Could not load dojos. Please retry before registering.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeDisabled();
  backend.dojoFailures = 0;
  await page.getByRole('button', { name: 'Retry dojos' }).click();
  await expect(page.getByLabel('Dojo', { exact: true })).toBeVisible();
  await page.getByLabel('Dojo', { exact: true }).selectOption('dojo-a');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('registration-dojo.png'), fullPage: true });
  expect(backend.authCalls).toBe(0);
});

test('late dojo responses cannot replace the newly selected class', async ({ page, backend }) => {
  let release = () => {};
  backend.dojoWait.set('fixture-a', new Promise<void>(resolve => { release = resolve; }));
  await page.goto('/register');
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-a');
  await expect(page.getByText('Loading dojos...', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeDisabled();
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-b');
  await expect(page.getByRole('option', { name: 'Fixture Dojo B' })).toBeAttached();
  const oldResponse = page.waitForResponse(response => response.url().includes('class_id=eq.fixture-a'));
  release();
  await oldResponse;
  await expect(page.getByRole('option', { name: 'Fixture Dojo A' })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'Fixture Dojo B' })).toBeAttached();
  expect(backend.authCalls).toBe(0);
});

test('password mismatch does not call Auth and matching fields send normalized metadata to the mock', async ({ page, backend }) => {
  backend.confirmSignup = true;
  await page.goto('/register');
  await registrationFields(page);
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-a');
  await page.getByLabel('Dojo', { exact: true }).selectOption('dojo-a');
  await page.getByLabel('Confirm Password', { exact: true }).click();
  await page.getByLabel('Confirm Password', { exact: true }).press('ControlOrMeta+A');
  await page.getByLabel('Confirm Password', { exact: true }).pressSequentially('DifferentPassword123');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible();
  expect(backend.authCalls).toBe(0);
  await page.getByLabel('Confirm Password', { exact: true }).press('ControlOrMeta+A');
  await page.getByLabel('Confirm Password', { exact: true }).pressSequentially('FixturePassword123');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText('Registration successful. Please check your email to verify your account.')).toBeVisible();
  expect(backend.authCalls).toBe(1);
  expect(backend.signupPayload?.data.full_name).toBe('Test Member');
  expect(backend.signupPayload?.data.aikikai_registration_number).toBe('AIKIKAI 100');
  expect(backend.signupPayload?.data.registration_number).toBeUndefined();
  expect(backend.signupPayload?.data.requested_dojo_id).toBe('dojo-a');
});

test('a loaded empty dojo catalog retains the approval explanation', async ({ page, backend }) => {
  backend.dojos['fixture-a'] = [];
  await page.goto('/register');
  await page.getByLabel('Class', { exact: true }).selectOption('fixture-a');
  await expect(page.getByText('No dojo is listed for this class. Your administrator will review your registration.')).toBeVisible();
  await expect(page.getByLabel('Dojo', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();
  expect(backend.authCalls).toBe(0);
});

test('signed-out routes redirect and the missing-page recovery is usable', async ({ page, backend }) => {
  for (const route of ['/admin', '/profile', '/change-password']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Log In', exact: true })).toBeVisible();
  }
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to dashboard' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(backend.authCalls).toBe(0);
});

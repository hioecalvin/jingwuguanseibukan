import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';

import { STAGING_APP_ORIGIN } from '../../scripts/staging-browser-target.mjs';
import {
  credentials,
  expect,
  test,
  type BrowserDiagnostics,
  type Credentials,
} from './fixtures';

async function login(
  page: Page,
  account: Credentials,
  requestAudit: string[],
  diagnostics: BrowserDiagnostics,
) {
  // The deployed Next.js page can render its static form before WebKit has
  // attached the client submit handler. Waiting for network-idle prevents a
  // fill/click race where hydration replaces the controlled input values and
  // native form validation silently suppresses submission.
  await page.goto('/login', { waitUntil: 'networkidle' });
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await email.fill(account.email);
  await password.fill(account.password);
  await expect(email).toHaveValue(account.email);
  await expect(password).toHaveValue(account.password);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password';
  }, { timeout: 12_000 }).catch(() => null);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const response = await tokenResponse;
  if (page.url().endsWith('/login')) {
    // Do this before any assertion can create an error-context artifact.
    await password.fill('');
    await email.fill('');
  }
  const diagnosticSummary = [
    `Requests: ${requestAudit.join('; ') || 'none'}`,
    `Console errors: ${diagnostics.consoleErrors.join('; ') || 'none'}`,
    `Page errors: ${diagnostics.pageErrors.join('; ') || 'none'}`,
    `Failed requests: ${diagnostics.failedRequests.join('; ') || 'none'}`,
  ].join(' | ');
  expect(response, `Password-grant response missing. ${diagnosticSummary}`).not.toBeNull();
  expect(response!.status(), 'Supabase password grant must succeed').toBe(200);
  await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
}

test('anonymous registration catalog exposes optional Aikikai input without submitting', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Jingwuguan Seibukan' })).toBeVisible();
  await expect(page.getByText('Member Registration', { exact: true })).toBeVisible();
  const classSelect = page.getByLabel('Class', { exact: true });
  await expect(classSelect).toBeEnabled();
  expect(await classSelect.locator('option').count()).toBeGreaterThan(1);
  const aikikai = page.getByLabel('Aikikai Registration Number (optional)', { exact: true });
  await expect(aikikai).toBeVisible();
  await expect(aikikai).not.toHaveAttribute('required');
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible();
});

test('invalid confirmation reveals only the generic recovery error', async ({ page }) => {
  await page.goto(`/auth/confirm?token_hash=${randomUUID()}&type=signup`);
  await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/auth/error`);
  await expect(page.getByRole('heading', { name: 'Confirmation link unavailable' })).toBeVisible();
  await expect(page.getByText('This link is invalid, expired, or has already been used.', { exact: false })).toBeVisible();
});

test('Member can load their profile and is denied Admin access', async ({ page, requestAudit, browserDiagnostics }) => {
  await login(page, credentials('MEMBER'), requestAudit, browserDiagnostics);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  const contactSection = page
    .getByRole('heading', { name: 'Phone & Instagram' })
    .locator('xpath=ancestor::section');
  await contactSection.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(contactSection.getByLabel('Phone', { exact: true })).toBeVisible();
  await expect(contactSection.getByLabel('Instagram username (optional)', { exact: true })).toBeVisible();

  await page.goto('/schedules');
  await expect(page.getByRole('heading', { name: 'Regular schedules' })).toBeVisible();
  await expect(page.getByText('Loading schedules…', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'By dojo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'By class', exact: true })).toBeVisible();

  await page.goto('/directory');
  await expect(page.getByRole('heading', { name: 'Member Directory' })).toBeVisible();
  await expect(page.getByText('Loading directory...', { exact: true })).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'Repository Upload', exact: true })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
});

test('scoped Admin sees only Aikido members and is denied Super Admin pages', async ({ page, requestAudit, browserDiagnostics }) => {
  await login(page, credentials('ADMIN'), requestAudit, browserDiagnostics);
  await page.goto('/admin/members');
  await expect(page.getByRole('heading', { name: 'Member Management' })).toBeVisible();
  const cards = page.locator('main article');
  await expect(cards.first()).toBeVisible();
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  for (let index = 0; index < cardCount; index++) {
    const classDetail = cards.nth(index).locator('p').filter({ hasText: /^\s*Class:\s*/ });
    await expect(classDetail).toHaveText(/^\s*Class:\s*Aikido\s*$/);
  }

  await page.goto('/admin/schedules');
  await expect(page.getByRole('heading', { name: 'Manage regular schedules' })).toBeVisible();
  await expect(page.getByText('Loading management scope…', { exact: true })).toHaveCount(0);

  await page.goto('/admin/payments');
  await expect(page.getByRole('heading', { name: 'Payment Confirmations' })).toBeVisible();
  await expect(page.getByText('Loading payments...', { exact: true })).toHaveCount(0);

  for (const restricted of ['/admin/applications', '/admin/assessments']) {
    await page.goto(restricted);
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
  }
});

test('Super Admin can load applications and assessments without mutating them', async ({ page, requestAudit, browserDiagnostics }) => {
  await login(page, credentials('SUPER'), requestAudit, browserDiagnostics);
  await page.goto('/admin/applications');
  await expect(page.getByRole('heading', { name: 'Pending Applications' })).toBeVisible();
  await expect(page.getByText('Loading applications...', { exact: true })).toHaveCount(0);

  await page.goto('/admin/assessments');
  await expect(page.getByRole('heading', { name: 'Bulk Assessments' })).toBeVisible();
  await expect(page.getByText('Loading your Admin scope…', { exact: true })).toHaveCount(0);

  await page.goto('/admin/settlements');
  await expect(page.getByRole('heading', { name: 'Dojo Settlements' })).toBeVisible();
  const firstSettlementDetails = page.getByRole('button', { name: 'View Payments', exact: true }).first();
  if (await firstSettlementDetails.count()) {
    await firstSettlementDetails.click();
    await expect(page.getByRole('columnheader', { name: 'Billing Month', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Timing', exact: true })).toBeVisible();
  }

  await page.goto('/admin/repository-uploaders');
  await expect(page.getByRole('heading', { name: 'Repository Uploaders' })).toBeVisible();
  await expect(page.getByText('Loading Repository Uploaders...', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Member', { exact: true })).toBeVisible();
});

test('a random certificate UUID is not found', async ({ page }) => {
  await page.goto(`/certificate/verify/${randomUUID()}`);
  await expect(page.getByRole('heading', { name: 'Certificate not found' })).toBeVisible();
});

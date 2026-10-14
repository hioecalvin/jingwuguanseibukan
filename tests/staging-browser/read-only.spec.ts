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
  const email = page.getByLabel('Email or JS Member ID', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await email.fill(account.email);
  await password.fill(account.password);
  await expect(email).toHaveValue(account.email);
  await expect(password).toHaveValue(account.password);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === STAGING_APP_ORIGIN && url.pathname === '/api/auth/login' && response.request().method() === 'POST';
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
  expect(response, `Application login response missing. ${diagnosticSummary}`).not.toBeNull();
  expect(response!.status(), 'Application login must succeed').toBe(200);
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
  // Next.js also mounts an empty route-announcer alert outside main. Check
  // directory errors, not that framework accessibility live region.
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  await expect(page.locator('.directory-member').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Class', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Dojo', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('name');
  for (const row of await page.locator('.directory-member').all()) {
    await expect(row).not.toContainText(/Member ID|Date of Birth|Last Training|Subscription History/i);
    await expect(row.getByRole('button')).toHaveCount(0);
  }

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
    const toggle = cards.nth(index).getByRole('button', { name: /^Member ID / });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
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
  if (page.viewportSize()!.width < 1024) {
    const settlementToggle = page.locator('section.compact-record > .compact-record-toggle').first();
    if (await settlementToggle.count()) await settlementToggle.click();
  }
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

async function expandFinanceSection(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: new RegExp(`^${name}(?: Hide details| Details & actions)$`) });
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}

test('Member can inspect the multi-month payment form without reporting money', async ({ page, requestAudit, browserDiagnostics }) => {
  await login(page, credentials('MEMBER'), requestAudit, browserDiagnostics);
  const confirmations = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/rest/v1/rpc/get_my_payment_confirmations');
  await page.goto('/subscription');
  expect((await confirmations).ok(), 'Read-only payment history loads').toBe(true);
  await expect(page.getByRole('heading', { name: 'My Subscription', exact: true })).toBeVisible();
  await expandFinanceSection(page, 'Report payment for several months');
  await expect(page.getByText('Your dojo Admin must confirm receipt', { exact: false })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Membership', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review monthly fees', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report payment — awaiting receipt', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const role of ['ADMIN', 'SUPER'] as const) {
  test(`${role} can inspect finance forms and grouped reports without recording receipts`, async ({ page, requestAudit, browserDiagnostics }) => {
    await login(page, credentials(role), requestAudit, browserDiagnostics);
    const reads = ['get_dojo_receiving_account', 'get_dojo_monthly_payment_summary', 'get_pending_advance_payment_groups'];
    const responses = reads.map(name => page.waitForResponse(response =>
      new URL(response.url()).pathname === `/rest/v1/rpc/${name}`));
    await page.goto('/admin/subscriptions');
    for (const response of await Promise.all(responses)) expect(response.ok(), 'Required finance read succeeds').toBe(true);
    await expect(page.getByRole('heading', { name: 'Subscription & Payments', exact: true })).toBeVisible();
    await expect(page.getByText(role === 'SUPER' ? 'Super Admin financial oversight covers all dojos.' : 'Financial access is limited to your assigned dojos.', { exact: true })).toBeVisible();
    for (const name of ['Member Payments', 'Record several months received', 'Payment Confirmations', 'Multi-month payments awaiting receipt']) await expandFinanceSection(page, name);
    await expect(page.getByText('Use only after you have received the full payment.', { exact: false })).toBeVisible();
    await expect(page.getByText('Confirm only after checking the money arrived.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review monthly fees', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm money received', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const [role, memberId, allowedPath, heading, deniedPath] of [
  ['MEMBER', '0101', '/profile', 'My Profile', '/admin'],
  ['ADMIN', '0002', '/admin/members', 'Member Management', '/admin/applications'],
  ['SUPER', '0001', '/admin/applications', 'Pending Applications', null],
] as const) {
  test(`${role} can sign in with exact JS Member ID, retains role boundaries and signs out`, async ({ page, requestAudit, browserDiagnostics }) => {
    const account = credentials(role);
    await login(page, { ...account, email: memberId }, requestAudit, browserDiagnostics);
    await page.goto(allowedPath);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    if (deniedPath) {
      await page.goto(deniedPath);
      await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
    }
    if (page.viewportSize()!.width < 1024) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Account menu', exact: true }).click();
    }
    const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
    await expect(signOut).toBeInViewport({ ratio: 1 });
    const logoutResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local';
    });
    await signOut.click();
    expect((await logoutResponse).ok()).toBe(true);
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/login`);
    for (const protectedPath of ['/profile', allowedPath, '/admin']) {
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    }
  });
}

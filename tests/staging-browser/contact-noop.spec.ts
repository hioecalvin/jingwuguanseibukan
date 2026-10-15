import { expect, test, type Page, type Route } from '@playwright/test';

import { STAGING_APP_ORIGIN } from '../../scripts/staging-browser-target.mjs';
import {
  assertStagingContactNoopTarget,
  canonicalContactBaseline,
  classifyStagingContactNoopRequest,
} from '../../scripts/staging-contact-noop-target.mjs';

assertStagingContactNoopTarget();

const baseline = canonicalContactBaseline(
  process.env.STAGING_CONTACT_BASELINE_PHONE,
  process.env.STAGING_CONTACT_BASELINE_INSTAGRAM_IS_NULL === '1'
    ? null
    : process.env.STAGING_CONTACT_BASELINE_INSTAGRAM,
);

async function beginMemberLogin(
  page: Page,
  requestAudit: string[],
  violations: string[],
) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const email = page.getByLabel('Email or JS Member ID', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await email.fill(process.env.SECURITY_TEST_MEMBER_EMAIL!);
  await password.fill(process.env.SECURITY_TEST_MEMBER_PASSWORD!);
  await expect(email).toHaveValue(process.env.SECURITY_TEST_MEMBER_EMAIL!);
  await expect(password).toHaveValue(process.env.SECURITY_TEST_MEMBER_PASSWORD!);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === STAGING_APP_ORIGIN && url.pathname === '/api/auth/login' && response.request().method() === 'POST';
  }, { timeout: 12_000 }).catch(() => null);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const response = await tokenResponse;
  if (!response) {
    await password.fill('');
    await email.fill('');
  }
  expect(
    response,
    `Application login response missing. Requests: ${requestAudit.join('; ') || 'none'} | ` +
      `Violations: ${violations.join('; ') || 'none'}`,
  ).not.toBeNull();
  expect(response!.status(), 'Application login must succeed').toBe(200);
}

test('Member CAS no-op leaves contact/profile data unchanged', async ({ context, page }) => {
  const violations: string[] = [];
  const requestAudit: string[] = [];
  const state: {
    phone: string;
    instagram: string | null;
    phase: 'new' | 'submitted';
    inFlight: boolean;
  } = { ...baseline, phase: 'new', inFlight: false };
  let mutationCount = 0;
  let loggedIn = false;

  await context.route('**/*', async (route: Route) => {
    const request = route.request();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = undefined;
    }
    const decision = classifyStagingContactNoopRequest(request.method(), request.url(), body, state);
    let requestLabel = `${request.method()} invalid-url`;
    try {
      const requestUrl = new URL(request.url());
      requestLabel = `${request.method()} ${requestUrl.origin}${requestUrl.pathname}`;
    } catch {}
    requestAudit.push(`${requestLabel} (${decision.reason})`);
    if (!decision.allowed) {
      violations.push(`${requestLabel} (${decision.reason})`);
      await route.abort('blockedbyclient');
      return;
    }
    if (!('mutation' in decision)) {
      await route.continue();
      return;
    }

    state.inFlight = true;
    try {
      const response = await route.fetch();
      if (response.ok()) {
        const result = await response.json();
        const row = Array.isArray(result) ? result[0] : result;
        if (!row || row.phone !== baseline.phone ||
            (row.instagram_username ?? null) !== baseline.instagram || row.changed !== false) {
          violations.push('Contact no-op RPC returned values outside the captured baseline');
        }
        state.phase = 'submitted';
        mutationCount += 1;
      }
      await route.fulfill({ response });
    } finally {
      state.inFlight = false;
    }
  });
  await context.routeWebSocket('**/*', socket => {
    violations.push('WebSocket request (not permitted by the contact no-op harness)');
    socket.close();
  });

  try {
    await beginMemberLogin(page, requestAudit, violations);
    loggedIn = true;
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'My Profile', exact: true })).toBeVisible();

    const contact = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Phone & Instagram', exact: true }),
    });
    await expect(contact).toHaveCount(1);
    await contact.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(contact.getByLabel('Phone', { exact: true })).toHaveValue(baseline.phone);
    await expect(contact.getByLabel('Instagram username (optional)', { exact: true }))
      .toHaveValue(baseline.instagram ?? '');
    await contact.getByRole('button', { name: 'Save Contact Details', exact: true }).click();
    await expect(page.getByText('Contact details are already up to date.', { exact: true })).toBeVisible();
    await expect(contact).toContainText(baseline.phone);
    if (baseline.instagram) await expect(contact).toContainText(`@${baseline.instagram}`);

    expect(mutationCount).toBe(1);
    expect(state.phase).toBe('submitted');
    expect(violations, 'No email, provider, off-origin, or unapproved mutation request').toEqual([]);
  } finally {
    if (loggedIn) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const accountMenu = page.getByRole('button', { name: 'Account menu', exact: true });
      await expect(accountMenu, 'A successful login must end with an explicit local logout').toBeVisible();
      await accountMenu.click();
      const logoutResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/auth/v1/logout');
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      expect((await logoutResponse).ok(), 'Local Supabase logout must succeed').toBe(true);
      await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/login`);
    }
  }
});

import { writeFileSync } from 'node:fs';

import { expect, test, type Page, type Route } from '@playwright/test';

import { STAGING_APP_ORIGIN } from '../../scripts/staging-browser-target.mjs';
import {
  assertStagingLastTrainingTarget,
  classifyStagingLastTrainingRequest,
  lastTrainingFixtureFromEnvironment,
} from '../../scripts/staging-last-training-target.mjs';

assertStagingLastTrainingTarget();

const fixture = lastTrainingFixtureFromEnvironment();
const stateFile = process.env.STAGING_LAST_TRAINING_STATE_FILE!;

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email', { exact: true }).fill(process.env.SECURITY_TEST_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.SECURITY_TEST_ADMIN_PASSWORD!);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password';
  });
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  expect((await tokenResponse).status(), 'Supabase password grant must succeed').toBe(200);
}

test('Admin 0002 corrects Member 0101 then marks the same membership trained today', async ({ context, page }) => {
  const violations: string[] = [];
  let loggedIn = false;
  const state: {
    fixture: typeof fixture;
    phase: 'baseline' | 'corrected' | 'today';
    inFlight: boolean;
  } = { fixture, phase: 'baseline', inFlight: false };
  const mutationCounts = { correct: 0, today: 0 };

  await context.route('**/*', async (route: Route) => {
    const request = route.request();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = undefined;
    }
    const decision = classifyStagingLastTrainingRequest(
      request.method(), request.url(), body, state,
    );
    if (!decision.allowed) {
      let label = `${request.method()} invalid-url`;
      try {
        const url = new URL(request.url());
        label = `${request.method()} ${url.origin}${url.pathname}`;
      } catch {}
      violations.push(`${label} (${decision.reason})`);
      await route.abort('blockedbyclient');
      return;
    }
    const mutation = ('mutation' in decision ? decision.mutation : undefined) as
      | keyof typeof mutationCounts
      | undefined;
    if (!mutation) {
      await route.continue();
      return;
    }

    state.inFlight = true;
    try {
      const response = await route.fetch();
      if (response.ok()) {
        const payload = await response.json();
        const result = Array.isArray(payload) ? payload[0] : payload;
        const expectedDate = mutation === 'correct' ? fixture.correctionDate : fixture.businessToday;
        if (!result || result.membership_id !== fixture.membershipId ||
            result.training_date !== expectedDate) {
          violations.push(`${mutation} RPC did not return the exact membership and training date`);
        } else {
          state.phase = mutation === 'correct' ? 'corrected' : 'today';
          mutationCounts[mutation] += 1;
          writeFileSync(stateFile, JSON.stringify({
            membershipId: fixture.membershipId,
            phase: state.phase,
          }), { encoding: 'utf8', mode: 0o600 });
        }
      }
      await route.fulfill({ response });
    } finally {
      state.inFlight = false;
    }
  });
  await context.routeWebSocket('**/*', socket => {
    violations.push('WebSocket request (not permitted by the last-training harness)');
    socket.close();
  });

  try {
    await loginAsAdmin(page);
    loggedIn = true;
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { name: 'Member Management' })).toBeVisible();
    await expect(page.getByText('Loading members...', { exact: true })).toHaveCount(0);
    await page.getByPlaceholder('Name / Member ID / Email / Phone / WhatsApp').fill(fixture.memberNumber);

    const member = page.getByRole('article').filter({ hasText: `Member ID: ${fixture.memberNumber}` });
    await expect(member).toHaveCount(1);
    const correction = member.getByLabel('Correct or backdate the session');
    await correction.fill(fixture.correctionDate);
    await member.getByRole('button', { name: 'Save Date Correction', exact: true }).click();
    await expect(member.getByRole('status')).toHaveText('Training date corrected.');
    await expect(correction).toHaveValue(fixture.correctionDate);

    const markToday = member.getByRole('button', { name: /as trained today for/ });
    await markToday.click();
    await expect(member.getByRole('status')).toHaveText('Training recorded for today.');
    await expect(markToday).toHaveText('Trained Today');
    await expect(markToday).toBeDisabled();
    expect(mutationCounts).toEqual({ correct: 1, today: 1 });
    expect(state.phase).toBe('today');
    expect(violations, 'No off-origin or unapproved mutation request').toEqual([]);
  } finally {
    if (loggedIn) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const accountMenu = page.getByRole('button', { name: 'Account menu', exact: true });
      await expect(accountMenu, 'A successful login must end with an explicit local logout').toBeVisible();
      await accountMenu.click();
      const logoutResponse = page.waitForResponse(
        response => new URL(response.url()).pathname === '/auth/v1/logout',
      );
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      expect((await logoutResponse).ok(), 'Local Supabase logout must succeed').toBe(true);
      await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/login`);
    }
  }
});

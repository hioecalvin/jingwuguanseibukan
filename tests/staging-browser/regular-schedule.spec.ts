import { writeFileSync } from 'node:fs';

import { expect, test, type Page, type Route } from '@playwright/test';

import { STAGING_APP_ORIGIN } from '../../scripts/staging-browser-target.mjs';
import {
  assertStagingRegularScheduleTarget,
  classifyStagingRegularScheduleRequest,
  fixtureFromEnvironment,
} from '../../scripts/staging-regular-schedule-target.mjs';

assertStagingRegularScheduleTarget();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixture = fixtureFromEnvironment();
const stateFile = process.env.STAGING_REGULAR_SCHEDULE_STATE_FILE!;

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email or JS Member ID', { exact: true }).fill(process.env.SECURITY_TEST_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.SECURITY_TEST_ADMIN_PASSWORD!);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === STAGING_APP_ORIGIN && url.pathname === '/api/auth/login' && response.request().method() === 'POST';
  });
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  expect((await tokenResponse).status(), 'Application login must succeed').toBe(200);
}

test('scoped Admin creates, edits and deactivates one zero-residue regular schedule', async ({ context, page }) => {
  const violations: string[] = [];
  let loggedIn = false;
  const state: {
    fixture: typeof fixture;
    createdId?: string;
    phase: 'new' | 'created' | 'updated';
    inFlight: boolean;
  } = { fixture, phase: 'new', inFlight: false };
  const mutationCounts = { create: 0, update: 0 };

  await context.route('**/*', async (route: Route) => {
    const request = route.request();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = undefined;
    }
    const decision = classifyStagingRegularScheduleRequest(
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
      if (response.ok() && mutation === 'create') {
        const createdId = await response.json();
        if (typeof createdId !== 'string' || !UUID.test(createdId)) {
          violations.push('Create RPC did not return one valid regular-schedule UUID');
        } else {
          state.createdId = createdId;
          state.phase = 'created';
          writeFileSync(stateFile, JSON.stringify({
            createdId,
            dojoId: fixture.dojoId,
            marker: fixture.marker,
          }), { encoding: 'utf8', mode: 0o600 });
        }
      } else if (response.ok() && mutation === 'update') {
        state.phase = 'updated';
      }
      if (response.ok()) mutationCounts[mutation] += 1;
      await route.fulfill({ response });
    } finally {
      state.inFlight = false;
    }
  });
  await context.routeWebSocket('**/*', socket => {
    violations.push('WebSocket request (not permitted by the regular-schedule harness)');
    socket.close();
  });

  try {
    await loginAsAdmin(page);
    loggedIn = true;
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
    await page.goto('/admin/schedules');
    await expect(page.getByRole('heading', { name: 'Manage regular schedules' })).toBeVisible();
    await expect(page.getByText('Loading management scope…', { exact: true })).toHaveCount(0);

    await page.getByRole('combobox', { name: 'Dojo and class' }).selectOption(fixture.dojoId);
    await page.getByRole('combobox', { name: 'Day' }).selectOption(String(fixture.dayOfWeek));
    await page.getByLabel('Start time', { exact: true }).fill(fixture.startTime);
    await page.getByLabel('Finish time', { exact: true }).fill(fixture.finishTime);
    await page.getByRole('combobox', { name: 'Instructor' }).selectOption('');
    await page.getByLabel('Venue / room', { exact: false }).fill(fixture.initialVenue);
    await page.getByLabel('Notes', { exact: false }).fill(fixture.notes);
    await page.getByRole('button', { name: 'Add schedule', exact: true }).click();

    await expect(page.getByRole('status')).toHaveText('Schedule created.');
    expect(state.createdId, 'Create RPC UUID must be captured before editing').toMatch(UUID);
    let card = page.getByRole('article').filter({ hasText: fixture.initialVenue });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('ACTIVE');
    await expect(card).toContainText(fixture.notes);

    await card.getByRole('button', { name: 'Edit schedule', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit schedule' })).toBeVisible();
    await page.getByLabel('Venue / room', { exact: false }).fill(fixture.updatedVenue);
    await page.getByLabel('Active and visible to members').uncheck();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect(page.getByRole('status')).toHaveText('Schedule updated.');
    card = page.getByRole('article').filter({ hasText: fixture.updatedVenue });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('INACTIVE');
    expect(mutationCounts).toEqual({ create: 1, update: 1 });
    expect(state.phase).toBe('updated');
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

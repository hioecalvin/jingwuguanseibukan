import { writeFileSync } from 'node:fs';

import { expect, test, type Page, type Route } from '@playwright/test';

import { STAGING_APP_ORIGIN } from '../../scripts/staging-browser-target.mjs';
import {
  assertStagingRepositoryDraftTarget,
  classifyStagingRepositoryDraftRequest,
  repositoryDraftFixture,
} from '../../scripts/staging-repository-draft-target.mjs';

assertStagingRepositoryDraftTarget();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const marker = process.env.STAGING_REPOSITORY_DRAFT_MARKER!;
const stateFile = process.env.STAGING_REPOSITORY_DRAFT_STATE_FILE!;
const fixture = repositoryDraftFixture(marker);

async function loginAsSuper(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email or JS Member ID', { exact: true }).fill(process.env.SECURITY_TEST_SUPER_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.SECURITY_TEST_SUPER_PASSWORD!);
  const tokenResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === STAGING_APP_ORIGIN && url.pathname === '/api/auth/login' && response.request().method() === 'POST';
  });
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  expect((await tokenResponse).status(), 'Application login must succeed').toBe(200);
}

test('Super Admin creates, updates and deletes one zero-residue Repository Draft', async ({ context, page }) => {
  const violations: string[] = [];
  let loggedIn = false;
  const state: {
    marker: string;
    createdId?: string;
    phase: 'new' | 'created' | 'updated' | 'deleted';
    inFlight: boolean;
  } = { marker, phase: 'new', inFlight: false };
  const mutationCounts = { create: 0, update: 0, delete: 0 };

  await context.route('**/*', async (route: Route) => {
    const request = route.request();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = undefined;
    }
    const decision = classifyStagingRepositoryDraftRequest(request.method(), request.url(), body, state);
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
          violations.push('Create RPC did not return one valid content UUID');
        } else {
          const createBody = body as Record<string, string>;
          state.createdId = createdId;
          state.phase = 'created';
          writeFileSync(stateFile, JSON.stringify({
            createdId,
            classId: createBody.target_class,
            rankId: createBody.target_rank,
            tierId: createBody.target_sub_rank,
          }), { encoding: 'utf8', mode: 0o600 });
        }
      }
      if (response.ok() && mutation === 'update') state.phase = 'updated';
      if (response.ok() && mutation === 'delete') state.phase = 'deleted';
      if (response.ok()) mutationCounts[mutation] += 1;
      await route.fulfill({ response });
    } finally {
      state.inFlight = false;
    }
  });
  await context.routeWebSocket('**/*', socket => {
    violations.push('WebSocket request (not permitted by the Repository Draft harness)');
    socket.close();
  });
  page.on('dialog', dialog => dialog.accept());

  try {
    await loginAsSuper(page);
    loggedIn = true;
    await expect(page).toHaveURL(`${STAGING_APP_ORIGIN}/`);
    await page.goto('/repository/upload');
    await expect(page.getByRole('heading', { name: 'Content Management' })).toBeVisible();
    await expect(page.getByText('Loading content manager...', { exact: true })).toHaveCount(0);
    await expect(page.getByText('You do not have an active Repository Uploader appointment.', { exact: true })).toHaveCount(0);

    const form = page.locator('form');
    const selects = form.locator('select');
    await expect(selects).toHaveCount(4);
    await expect(selects.nth(0)).not.toHaveValue('');
    await expect(selects.nth(1)).not.toHaveValue('');
    await expect(selects.nth(2)).not.toHaveValue('');
    await selects.nth(3).selectOption('draft');
    await form.getByPlaceholder('Example: Tai no Henko').fill(fixture.marker);
    await form.getByPlaceholder('Training notes or explanation').fill(fixture.description);
    await form.locator('input[type="number"]').fill(String(fixture.initialSortOrder));
    await form.getByRole('button', { name: 'Add Content', exact: true }).click();
    await expect(page.getByText('Content created successfully.', { exact: true })).toBeVisible();
    expect(state.createdId, 'Create RPC UUID must be captured before editing').toMatch(UUID);

    let article = page.getByRole('article').filter({
      has: page.getByRole('heading', { name: fixture.marker, exact: true }),
    });
    await expect(article).toHaveCount(1);
    await expect(article).toContainText('Draft');
    await expect(article).toContainText(`Sort order: ${fixture.initialSortOrder}`);
    await article.getByRole('button', { name: 'Edit', exact: true }).click();
    await form.getByPlaceholder('Example: Tai no Henko').fill(fixture.updatedMarker);
    await form.getByPlaceholder('Training notes or explanation').fill(fixture.updatedDescription);
    await form.locator('input[type="number"]').fill(String(fixture.updatedSortOrder));
    await form.getByRole('button', { name: 'Update Content', exact: true }).click();
    await expect(page.getByText('Content updated successfully.', { exact: true })).toBeVisible();

    article = page.getByRole('article').filter({
      has: page.getByRole('heading', { name: fixture.updatedMarker, exact: true }),
    });
    await expect(article).toHaveCount(1);
    await expect(article).toContainText(fixture.updatedDescription);
    await expect(article).toContainText(`Sort order: ${fixture.updatedSortOrder}`);
    await article.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Content deleted.', { exact: true })).toBeVisible();
    await expect(article).toHaveCount(0);
    expect(mutationCounts).toEqual({ create: 1, update: 1, delete: 1 });
    expect(state.phase).toBe('deleted');
    expect(violations, 'No off-origin, provider, or unapproved mutation request').toEqual([]);
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

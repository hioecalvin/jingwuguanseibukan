import { test as base, expect, type Page, type Route } from '@playwright/test';

import {
  STAGING_SECURITY_ACCOUNTS,
  assertStagingBrowserRuntime,
  classifyStagingBrowserRequest,
  safeRequestLabel,
} from '../../scripts/staging-browser-target.mjs';

assertStagingBrowserRuntime();

type Role = keyof typeof STAGING_SECURITY_ACCOUNTS;
export type Credentials = { email: string; password: string };
export type BrowserDiagnostics = {
  consoleErrors: string[];
  failedRequests: string[];
  pageErrors: string[];
};

function redactDiagnostic(message: string): string {
  let redacted = message;
  for (const role of Object.keys(STAGING_SECURITY_ACCOUNTS) as Role[]) {
    for (const suffix of ['EMAIL', 'PASSWORD']) {
      const secret = process.env[`SECURITY_TEST_${role}_${suffix}`];
      if (secret) redacted = redacted.split(secret).join('[redacted]');
    }
  }
  return redacted
    .replace(/([?&](?:access_token|refresh_token|token|token_hash)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

function installSafeDiagnostics(page: Page, diagnostics: BrowserDiagnostics) {
  page.on('console', message => {
    if (message.type() === 'error') {
      diagnostics.consoleErrors.push(redactDiagnostic(message.text()));
    }
  });
  page.on('pageerror', error => {
    diagnostics.pageErrors.push(redactDiagnostic(error.message));
  });
  page.on('requestfailed', request => {
    const label = safeRequestLabel(request.method(), request.url());
    const reason = request.failure()?.errorText ?? 'unknown failure';
    diagnostics.failedRequests.push(redactDiagnostic(`${label} (${reason})`));
  });
}

export function credentials(role: Role): Credentials {
  const email = process.env[`SECURITY_TEST_${role}_EMAIL`]?.trim();
  const password = process.env[`SECURITY_TEST_${role}_PASSWORD`]?.trim();
  if (!email || !password || email.toLowerCase() !== STAGING_SECURITY_ACCOUNTS[role]) {
    throw new Error(`Protected ${role} staging credentials are unavailable.`);
  }
  return { email, password };
}

export const test = base.extend<{
  browserDiagnostics: BrowserDiagnostics;
  readOnlyGuard: void;
  requestAudit: string[];
}>({
  browserDiagnostics: async ({ page }, provide) => {
    const diagnostics: BrowserDiagnostics = {
      consoleErrors: [],
      failedRequests: [],
      pageErrors: [],
    };
    installSafeDiagnostics(page, diagnostics);
    await provide(diagnostics);
  },
  requestAudit: async ({}, provide) => provide([]),
  readOnlyGuard: [async ({ context, requestAudit }, provide) => {
    const violations: string[] = [];
    await context.route('**/*', async (route: Route) => {
      const request = route.request();
      const decision = classifyStagingBrowserRequest(request.method(), request.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        requestAudit.push(`${safeRequestLabel(request.method(), request.url())} (${decision.reason})`);
      }
      if (!decision.allowed) {
        violations.push(`${safeRequestLabel(request.method(), request.url())} (${decision.reason})`);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await context.routeWebSocket('**/*', socket => {
      violations.push('WebSocket request (not permitted by the read-only staging harness)');
      socket.close();
    });
    await provide();
    expect(violations, 'No mutation, unapproved RPC, or off-origin browser request').toEqual([]);
  }, { auto: true }],
});

export { expect };

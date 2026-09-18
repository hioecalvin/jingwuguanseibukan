import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRoute, nextServer } from './load-route-test.mjs';

const email = { email_id: 'unit-email', email_type: 'unit', recipient_email: 'unit@example.invalid', subject: 'Unit test', template_data: {} };
const allowRateLimit = {
  configuredRateLimit: (_name, fallback) => fallback,
  consumeDurableRateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 0 }),
  durableRateLimitHeaders: result => ({ 'Retry-After': String(result.retryAfterSeconds), 'X-RateLimit-Remaining': String(result.remaining) }),
};

const healthyEmailQueue = {
  status: 'PASS',
  checks: {
    stuck_processing_emails: 0,
    failed_emails_exhausted: 0,
    old_pending_emails: 0,
    overdue_ready_emails: 0,
    duplicate_dedupe_keys: 0,
  },
  checked_at: '2026-09-17T00:00:00.000Z',
};

function worker({
  claims = [],
  sendError = null,
  markSentError = null,
  markFailedError = null,
  queueHealth = healthyEmailQueue,
  queueHealthError = null,
} = {}) {
  const calls = [];
  let claimIndex = 0;
  const route = loadRoute('app/api/system/email-worker/route.ts', {
    'next/server': nextServer,
    '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'claim_next_email') return claims[claimIndex++] ?? { data: [], error: null };
      if (name === 'mark_email_sent') return { error: markSentError };
      if (name === 'mark_email_failed') return { error: markFailedError };
      if (name === 'email_backend_health_check') return { data: queueHealth, error: queueHealthError };
      throw new Error(`Unexpected RPC: ${name}`);
    } }) },
    '@/lib/email/render-email': { renderEmail: () => '<p>Unit</p>' },
    '@/lib/security/durable-rate-limit': allowRateLimit,
    resend: { Resend: class {
      emails = { send: async (message, options) => {
        calls.push({ name: 'send', message, options });
        return { data: sendError ? null : { id: 'provider-unit' }, error: sendError };
      } };
    } },
  }, { EMAIL_WORKER_SECRET: 'unit-only', RESEND_API_KEY: 'unit-only', EMAIL_FROM_ADDRESS: 'unit@example.invalid' });
  return { ...route, calls, run: (secret = 'unit-only') => route.POST(new Request('http://localhost/api/system/email-worker', { method: 'POST', headers: { 'x-worker-secret': secret } })) };
}

test('email worker rejects incorrect secrets before any database/provider action', async () => {
  const route = worker();
  assert.equal((await route.run('incorrect')).status, 401);
  assert.deepEqual(route.calls, []);
});

test('an empty email queue is a successful zero-work run', async () => {
  const route = worker();
  const response = await route.run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    processed: 0,
    sent: 0,
    failed: 0,
    queueHealth: {
      status: 'PASS',
      checks: {
        stuckProcessingEmails: 0,
        exhaustedFailures: 0,
        oldPendingEmails: 0,
        overdueReadyEmails: 0,
        duplicateDedupeKeys: 0,
      },
      checkedAt: '2026-09-17T00:00:00.000Z',
    },
  });
});

test('email claim failures are not reported as successful runs or exposed to clients', async () => {
  const route = worker({ claims: [{ data: null, error: { message: 'private database detail' } }] });
  const response = await route.run();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.processed, 0);
  assert.doesNotMatch(JSON.stringify(body), /private database detail/);
  assert.deepEqual(route.calls.map(call => call.name), ['claim_next_email']);
});

test('email worker preserves completed counters if a subsequent claim fails', async () => {
  const route = worker({ claims: [{ data: [email], error: null }, { data: null, error: { message: 'unavailable' } }] });
  const response = await route.run();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.processed, 1);
  assert.equal(body.sent, 1);
  assert.equal(body.failed, 0);
  assert.equal(route.calls.find(call => call.name === 'send').options.idempotencyKey, 'email-outbox/unit-email');
});

test('delivery failure is persisted and visible as a non-success worker response', async () => {
  const route = worker({ claims: [{ data: [email], error: null }], sendError: { message: 'unit provider failure' } });
  const response = await route.run();
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.processed, 1);
  assert.equal(body.sent, 0);
  assert.equal(body.failed, 1);
  assert.equal(body.queueHealth.status, 'PASS');
  assert.equal(route.calls.filter(call => call.name === 'mark_email_failed').length, 1);
  assert.equal(route.calls.filter(call => call.name === 'mark_email_sent').length, 0);
});

test('failure to persist retry state aborts the worker with HTTP 500', async () => {
  const route = worker({ claims: [{ data: [email], error: null }], sendError: { message: 'unit delivery error' }, markFailedError: { message: 'private persistence error' } });
  const response = await route.run();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.failed, 1);
  assert.equal(route.calls.filter(call => call.name === 'claim_next_email').length, 1);
  assert.doesNotMatch(JSON.stringify(body), /private persistence error/);
});

test('a delivered email with failed acknowledgement retains its provider retry key', async () => {
  const route = worker({ claims: [{ data: [email], error: null }], markSentError: { message: 'acknowledgement failed' } });
  assert.equal((await route.run()).status, 502);
  assert.equal(route.calls.find(call => call.name === 'send').options.idempotencyKey, 'email-outbox/unit-email');
  assert.equal(route.calls.filter(call => call.name === 'mark_email_failed').length, 1);
});

test('successful worker delivery is capped at twenty claims per run', async () => {
  const route = worker({ claims: Array.from({ length: 21 }, (_, index) => ({ data: [{ ...email, email_id: `unit-${index}` }], error: null })) });
  const response = await route.run();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.processed, 20);
  assert.equal(body.sent, 20);
  assert.equal(body.failed, 0);
  assert.equal(body.queueHealth.status, 'PASS');
  assert.equal(route.calls.filter(call => call.name === 'claim_next_email').length, 20);
});

test('email queue delay or exhausted retries produce an observable unhealthy response', async () => {
  const route = worker({
    queueHealth: {
      ...healthyEmailQueue,
      status: 'FAIL',
      checks: {
        ...healthyEmailQueue.checks,
        overdue_ready_emails: 2,
        failed_emails_exhausted: 1,
      },
    },
  });
  const response = await route.run();
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.queueHealth.checks.overdueReadyEmails, 2);
  assert.equal(body.queueHealth.checks.exhaustedFailures, 1);
});

test('email queue health failures are not reported as successful or exposed', async () => {
  const route = worker({
    queueHealthError: { message: 'private monitoring detail' },
  });
  const response = await route.run();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.doesNotMatch(JSON.stringify(body), /private monitoring detail/);
});

function subscription(authenticated = true) {
  const calls = [];
  return {
    ...loadRoute('app/api/subscribe/route.ts', {
      'next/server': nextServer,
      '@/lib/supabase/server': { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'unit-user' } : null }, error: null }) },
        rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; },
      }) },
      '@/lib/security/durable-rate-limit': allowRateLimit,
    }), calls,
  };
}

test('push handlers reject malformed and non-object JSON without an RPC', async () => {
  for (const method of ['POST', 'DELETE']) {
    for (const body of ['null', '[]', '1', 'true', '"string"', '{']) {
      const route = subscription();
      const response = await route[method](new Request('http://localhost/api/subscribe', { method, body }));
      assert.equal(response.status, 400, `${method} ${body}`);
      assert.deepEqual(route.calls, []);
    }
  }
});

test('push handlers require authentication and use only own-user RPCs', async () => {
  for (const method of ['POST', 'DELETE']) {
    const denied = subscription(false);
    assert.equal((await denied[method](new Request('http://localhost/api/subscribe', { method, body: '{}' }))).status, 401);
    assert.deepEqual(denied.calls, []);
    const route = subscription();
    const response = await route[method](new Request('http://localhost/api/subscribe', { method, body: JSON.stringify({ endpoint: 'https://push.example.invalid/unit', keys: { p256dh: 'unit-key', auth: 'unit-auth' } }) }));
    assert.equal(response.status, 200);
    assert.equal(route.calls[0].name, method === 'POST' ? 'save_my_push_subscription' : 'disable_my_push_subscription');
    assert.equal(Object.hasOwn(route.calls[0].args, 'user_id'), false);
  }
});

function passwordRoute() {
  const calls = [];
  return { ...loadRoute('app/api/account/change-password/route.ts', {
    'next/server': nextServer,
    '@supabase/supabase-js': { createClient: () => { calls.push('createClient'); throw new Error('private configuration detail'); } },
    '@/lib/supabase/admin': { createAdminClient: () => { throw new Error('Unexpected admin action'); } },
    '@/lib/security/durable-rate-limit': allowRateLimit,
  }, { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'unit-only' }), calls };
}

test('password changes reject malformed and non-object JSON before creating clients', async () => {
  for (const body of ['null', '[]', '1', 'true', '"string"', '{']) {
    const route = passwordRoute();
    const response = await route.POST(new Request('http://localhost/api/account/change-password', { method: 'POST', headers: { authorization: 'Bearer unit-token' }, body }));
    assert.equal(response.status, 400, body);
    assert.deepEqual(route.calls, []);
  }
});

test('unexpected password-route exceptions do not expose internal details', async () => {
  const route = passwordRoute();
  const response = await route.POST(new Request('http://localhost/api/account/change-password', { method: 'POST', headers: { authorization: 'Bearer unit-token' }, body: JSON.stringify({ newPassword: 'UnitPassword123' }) }));
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private configuration detail/);
  assert.deepEqual(route.calls, ['createClient']);
});

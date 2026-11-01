import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { loadRoute, nextServer } from './load-route-test.mjs';

const secretHelper = loadRoute('lib/security/constant-time-secret.ts', {
  'server-only': {},
  'node:crypto': crypto,
});

function probe(env = { EMAIL_WORKER_SECRET: 'unit-worker-secret' }) {
  const calls = [];
  const operationalCall = name => function () {
    calls.push(name);
    throw new Error(`Authentication probe attempted ${name}`);
  };
  const route = loadRoute('app/api/system/email-worker/route.ts', {
    'next/server': nextServer,
    '@/lib/security/constant-time-secret': secretHelper,
    '@/lib/supabase/admin': {
      createAdminClient: operationalCall('database client'),
    },
    '@/lib/email/render-email': {
      renderEmail: operationalCall('email rendering'),
    },
    '@/lib/email/worker-runtime': {
      emailProviderAbortSignal: operationalCall('provider abort signal'),
      emailWorkerDeadline: operationalCall('worker deadline'),
      remainingWorkerTimeMs: operationalCall('worker runtime'),
    },
    '@/lib/security/durable-rate-limit': {
      configuredRateLimit: operationalCall('rate-limit configuration'),
      consumeDurableRateLimit: operationalCall('durable rate limit'),
      durableRateLimitHeaders: operationalCall('rate-limit headers'),
    },
    resend: { Resend: operationalCall('provider client') },
  }, env);

  return {
    calls,
    logs: route.logs,
    run(secret) {
      const headers = secret === null ? {} : { 'x-worker-secret': secret };
      return route.GET(new Request('http://localhost/api/system/email-worker', { headers }));
    },
  };
}

test('GET rejects missing, empty and incorrect secrets without operational calls', async () => {
  const route = probe();
  for (const secret of [null, '', 'incorrect', 'unit-worker-secreT', 'unit-worker-secret-extra']) {
    const response = await route.run(secret);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Not authorised.' });
    assert.deepEqual(route.calls, []);
    assert.deepEqual(route.logs, []);
  }
});

test('GET fails closed when the worker secret is not configured', async () => {
  for (const env of [{}, { EMAIL_WORKER_SECRET: '' }]) {
    const route = probe(env);
    for (const suppliedSecret of [null, '', 'unit-worker-secret']) {
      const response = await route.run(suppliedSecret);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { error: 'Not authorised.' });
      assert.deepEqual(route.calls, []);
      assert.deepEqual(route.logs, []);
    }
  }
});

test('GET accepts the exact secret with only a fixed uncached authentication response', async () => {
  const route = probe();
  const response = await route.run('unit-worker-secret');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { code: 'authentication_only' });
  assert.deepEqual(route.calls, []);
  assert.deepEqual(route.logs, []);
});

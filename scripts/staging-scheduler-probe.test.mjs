import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, timingSafeEqual } from 'node:crypto';
import { loadRoute, nextServer } from './load-route-test.mjs';

const guard = loadRoute('lib/email/staging-scheduler-probe.ts', { 'server-only': {} });
const secret = loadRoute('lib/security/constant-time-secret.ts', { 'server-only': {}, 'node:crypto': { createHash, timingSafeEqual } });
const now = Date.now();
const env = {
  SCHEDULER_ACCEPTANCE_ENABLED: 'true', VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: 'release/v1-readiness-20260918',
  STAGING_PROJECT_REF: guard.SCHEDULER_PROBE_PROJECT,
  NEXT_PUBLIC_SUPABASE_URL: `https://${guard.SCHEDULER_PROBE_PROJECT}.supabase.co`,
  NEXT_PUBLIC_SITE_URL: guard.SCHEDULER_PROBE_ORIGIN,
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40), SCHEDULER_ACCEPTANCE_COMMIT: 'a'.repeat(40),
  SCHEDULER_ACCEPTANCE_ID: '22222222-2222-4222-8222-222222222222',
  SCHEDULER_ACCEPTANCE_SECRET: 'b'.repeat(64),
  SCHEDULER_ACCEPTANCE_START: new Date(now - 1000).toISOString(),
  SCHEDULER_ACCEPTANCE_END: new Date(now + 599000).toISOString(),
};
const endpoint = guard.SCHEDULER_PROBE_ORIGIN + guard.SCHEDULER_PROBE_PATH;
const headers = { 'x-scheduler-acceptance-secret': env.SCHEDULER_ACCEPTANCE_SECRET,
  'x-scheduler-acceptance-id': env.SCHEDULER_ACCEPTANCE_ID,
  'x-scheduler-acceptance-commit': env.SCHEDULER_ACCEPTANCE_COMMIT };
function route(overrides = {}, expire = false) {
  let checks = 0;
  return loadRoute('app/api/system/staging-scheduler-probe/route.ts', {
    'next/server': nextServer,
    '@/lib/security/constant-time-secret': secret,
    '@/lib/email/staging-scheduler-probe': { ...guard, schedulerProbeConfig() {
      return expire && ++checks > 1 ? null : guard.schedulerProbeConfig({ ...env, ...overrides }, now);
    } },
  });
}

test('probe requires explicit staging Preview branch/project/origin/commit/window binding', () => {
  assert.ok(guard.schedulerProbeConfig(env, now));
  for (const change of [{ SCHEDULER_ACCEPTANCE_ENABLED: undefined }, { VERCEL_ENV: 'production' },
    { VERCEL_GIT_COMMIT_REF: 'main' }, { STAGING_PROJECT_REF: 'other' },
    { NEXT_PUBLIC_SITE_URL: 'https://jingwuguanseibukan.com' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }, { VERCEL_GIT_COMMIT_SHA: 'c'.repeat(40) },
    { SCHEDULER_ACCEPTANCE_COMMIT: 'short' }, { SCHEDULER_ACCEPTANCE_ID: 'bad' },
    { SCHEDULER_ACCEPTANCE_SECRET: 'short' }, { EMAIL_WORKER_SECRET: env.SCHEDULER_ACCEPTANCE_SECRET },
    { PUSH_API_SECRET: env.SCHEDULER_ACCEPTANCE_SECRET },
    { SCHEDULER_ACCEPTANCE_START: '2026-02-30T00:00:00.000Z' },
    { SCHEDULER_ACCEPTANCE_END: new Date(now + 600000).toISOString() }]) {
    assert.equal(guard.schedulerProbeConfig({ ...env, ...change }, now), null);
  }
  for (const time of [NaN, now - 1001, now + 599000]) assert.equal(guard.schedulerProbeConfig(env, time), null);
});

test('no-send handler has no services/network dependencies and returns explicit scoped proof', async () => {
  const r = route();
  const response = r.POST(new Request(endpoint, { method: 'POST', headers }));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.code, 'no_send_probe'); assert.equal(body.mode, 'no_send');
  assert.equal(body.id, env.SCHEDULER_ACCEPTANCE_ID); assert.equal(body.commit, env.SCHEDULER_ACCEPTANCE_COMMIT);
  assert.equal(body.start, env.SCHEDULER_ACCEPTANCE_START); assert.equal(body.end, env.SCHEDULER_ACCEPTANCE_END);
  assert.equal(JSON.stringify(body).includes(env.SCHEDULER_ACCEPTANCE_SECRET), false);
});

test('probe rejects disabled, unauthorised, wrong-host and wrong-trial requests', () => {
  assert.equal(route({ SCHEDULER_ACCEPTANCE_ENABLED: 'false' }).POST(new Request(endpoint,{method:'POST'})).status, 404);
  for (const changed of [{}, { ...headers, 'x-scheduler-acceptance-secret': 'wrong' },
    { ...headers, 'x-scheduler-acceptance-id': 'wrong' },
    { ...headers, 'x-scheduler-acceptance-commit': 'c'.repeat(40) }]) {
    assert.equal(route().POST(new Request(endpoint,{method:'POST',headers:changed})).status, 403);
  }
  for (const url of [endpoint + '?x=1', endpoint.replace('https:', 'http:'),
    endpoint.replace('jingwuguanseibukan-staging.vercel.app', 'wrong.vercel.app')]) {
    assert.equal(route().POST(new Request(url,{method:'POST',headers})).status, 403);
  }
  assert.equal(route({}, true).POST(new Request(endpoint,{method:'POST',headers})).status, 404);
});

test('content cannot cause delivery: probe never reads a hostile body or invokes services', () => {
  const request = { url: endpoint, headers: new Headers(headers),
    get body() { throw Error('Body must never be read'); } };
  assert.equal(route().POST(request).status, 200);
});

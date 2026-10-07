import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Resend } from 'resend';
import { loadRoute, nextServer } from './load-route-test.mjs';

const guard = loadRoute('lib/email/staging-single-message.ts', {});
const id = 'd296b002-e26f-44bb-a20b-0e787061bdb2';
const now = Date.now();
const baseline = {
  STAGING_EMAIL_TEST_ENABLED: 'true', VERCEL_ENV: 'preview', NODE_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: 'release/v1-readiness-20260918',
  STAGING_PROJECT_REF: guard.STAGING_EMAIL_PROJECT,
  NEXT_PUBLIC_SUPABASE_URL: `https://${guard.STAGING_EMAIL_PROJECT}.supabase.co`,
  NEXT_PUBLIC_SITE_URL: guard.STAGING_EMAIL_ORIGIN,
  STAGING_EMAIL_TEST_COMMIT: 'a'.repeat(40), VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  STAGING_EMAIL_TEST_ID: id, STAGING_EMAIL_TEST_SECRET: 'x'.repeat(48),
  STAGING_EMAIL_TEST_RECIPIENT: 'release-inbox@owned-mail.org',
  STAGING_EMAIL_TEST_RECIPIENT_CONFIRMATION: 'release-inbox@owned-mail.org',
  STAGING_EMAIL_TEST_START: new Date(now - 30_000).toISOString(),
  STAGING_EMAIL_TEST_END: new Date(now + 600_000).toISOString(),
  EMAIL_FROM_ADDRESS: 'sender@owned-mail.org', RESEND_API_KEY: 're_offline-no-network',
};

function fixture() {
  return { id, status: 'cancelled', attempts: 0, max_attempts: 1,
    recipient_email: baseline.STAGING_EMAIL_TEST_RECIPIENT,
    email_type: 'class_event_notification', subject: guard.STAGING_EMAIL_SUBJECT,
    template_data: JSON.stringify(guard.STAGING_EMAIL_TEMPLATE),
    reference_type: 'staging_single_message_v1', reference_id: id,
    dedupe_key: `staging-single-message/${id}`, recipient_user_id: null,
    created_by: null, sent_at: null, failed_at: null, last_attempt_at: null,
    provider_message_id: null, last_error: null, next_attempt_at: null };
}

function harness(options = {}) {
  let configChecks = 0;
  const env = { ...baseline, ...options.env };
  const row = { ...fixture(), ...options.row };
  const calls = { clients: 0, profiles: [], identities: 0, claims: [], sends: [], acks: [] };
  const admin = {
    from(table) {
      if (table === 'profiles') return {
        select() { return this; },
        ilike(column, value) { calls.profiles.push({ column, value }); return this; },
        async limit() { return { data: options.profiles ?? [], error: options.profileError }; },
      };
      assert.equal(table, 'email_outbox');
      const query = { filters: {}, update: null };
      calls.claims.push(query);
      return {
        update(values) { query.update = values; return this; },
        eq(column, value) { query.filters[column] = value; return this; },
        is(column, value) { query.filters[column] = value; return this; },
        async select(columns) {
          assert.equal(columns, 'id');
          if (options.claimError) return { error: true };
          if (!Object.entries(query.filters).every(([k, v]) => row[k] === v)) return { data: [], error: null };
          Object.assign(row, query.update);
          if (options.claimLostResponse) throw Error('secret SQL error');
          return { data: [{ id }], error: null };
        },
      };
    },
    auth: { admin: { async listUsers(parameters) {
      assert.equal(parameters.page, 1); assert.equal(parameters.perPage, 1000);
      calls.identities++;
      return { data: { users: options.users ?? [] }, error: options.authError };
    } } },
    async rpc(name, args) {
      assert.equal(name, 'mark_email_sent'); calls.acks.push(args);
      if (!options.ackError) row.status = 'sent';
      return { error: options.ackError };
    },
  };
  const route = loadRoute('app/api/system/staging-email-test/route.ts', {
    'next/server': nextServer,
    '@/lib/email/staging-single-message': { ...guard, stagingEmailConfig(env) {
      configChecks++;
      return configChecks >= (options.expireAtCheck ?? Infinity) ? null : guard.stagingEmailConfig(env);
    } },
    '@/lib/supabase/admin': { createAdminClient() { calls.clients++; return admin; } },
    '@/lib/security/constant-time-secret': { matchesSecret: (a, b) => a === b },
    '@/lib/email/render-email': { renderEmail(type, data) {
      assert.equal(type, 'class_event_notification'); assert.equal(data, guard.STAGING_EMAIL_TEMPLATE);
      return '<p>synthetic message</p>';
    } },
    '@/lib/email/worker-runtime': { emailProviderAbortSignal: n => { assert.equal(n, 10000); return AbortSignal.timeout(n); } },
    resend: { Resend: class {
      constructor(key, options) {
        assert.equal(key, baseline.RESEND_API_KEY);
        assert.equal(options.baseUrl, 'https://api.resend.com');
        assert.equal(options.userAgent, 'jingwuguan-staging-single-message/1');
      }
      emails = { send: async (message, config) => {
        calls.sends.push({ message, config });
        if (options.sendThrows) throw Error('secret provider error');
        return { data: options.noProviderId ? {} : { id: 'private-provider-id' }, error: options.sendError };
      } };
    } },
  }, env);
  return { ...route, calls, row };
}

function request(options = {}) {
  return new Request(options.url ?? `${guard.STAGING_EMAIL_ORIGIN}/api/system/staging-email-test`, {
    method: 'POST', headers: { 'x-staging-email-secret': baseline.STAGING_EMAIL_TEST_SECRET,
      'x-staging-email-id': id, ...options.headers }, ...options.body && { body: options.body },
    ...(options.body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
}

function emptyStream() {
  return new ReadableStream({ start(controller) { controller.close(); } });
}

test('empty adapter stream follows the same fixed single-send contract as a null body (mock only)', async () => {
  const h = harness(); const req = request({ body: emptyStream() });
  assert.notEqual(req.body, null);
  const result = await h.POST(req);
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(req.body.locked, false);
  assert.equal(h.calls.sends.length, 1); assert.equal(h.row.attempts, 1);
  assert.deepEqual([...h.calls.sends[0].message.to], [baseline.STAGING_EMAIL_TEST_RECIPIENT]);
  assert.equal(h.calls.sends[0].message.subject, guard.STAGING_EMAIL_SUBJECT);
  assert.equal(h.calls.sends[0].config.idempotencyKey, `email-outbox/${id}`);
  assert.equal((await h.POST(request({ body: emptyStream() }))).status, 409);
  assert.equal(h.calls.sends.length, 1);
});

test('stream content and empty chunks are rejected before database work regardless of content-length', async () => {
  for (const bytes of [new Uint8Array(), new TextEncoder().encode('{}'), new Uint8Array([0]), new TextEncoder().encode(' ')]) {
    let cancelled = false;
    const stream = new ReadableStream({start(c) { c.enqueue(bytes); },cancel() { cancelled = true; }});
    const req = request({body: stream, headers: {'content-length': '0'}});
    const h = harness(); const r = await h.POST(req);
    assert.equal(r.status, 400); assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await r.json(), {code: 'body_not_allowed'});
    assert.equal(cancelled, true); assert.equal(req.body.locked, false);
    assert.equal(h.calls.clients, 0); assert.equal(h.calls.sends.length, 0); assert.equal(h.row.attempts, 0);
  }
});

test('errored, consumed, locked or cancellation-failing streams fail closed without raw error disclosure', async () => {
  const errored = request({body: new ReadableStream({start(c) {c.error(Error('private request error'));}})});
  const consumed = request({body: emptyStream()}); await consumed.text();
  const locked = request({body: emptyStream()}); const lock = locked.body.getReader();
  const badCancel = request({body: new ReadableStream({start(c) {c.enqueue(new Uint8Array([1]));},cancel() {throw Error('private cancellation error');}})});
  for (const req of [errored, consumed, locked, badCancel]) {
    const h = harness(); const r = await h.POST(req);
    assert.equal(r.status, 400); assert.deepEqual(await r.json(), {code: 'body_not_allowed'});
    assert.equal(h.calls.clients, 0); assert.equal(h.calls.sends.length, 0); assert.equal(h.logs.length, 0);
  }
  lock.releaseLock();
});

test('disabled or unauthorized gates return before reading any stream', async () => {
  for (const options of [{env: {STAGING_EMAIL_TEST_ENABLED: undefined}}, {}]) {
    let touched = false;
    const req = {url: `${guard.STAGING_EMAIL_ORIGIN}/api/system/staging-email-test`,
      headers: new Headers({'x-staging-email-id': id, 'x-staging-email-secret': 'wrong'}),
      get body() { touched = true; throw Error('must not read'); }};
    const h = harness(options); const r = await h.POST(req);
    assert.equal(r.status, options.env ? 404 : 403); assert.equal(touched, false); assert.equal(h.calls.clients, 0);
  }
});

test('expiry while consuming an empty stream prevents database work or sends', async () => {
  const h = harness({expireAtCheck: 2});
  const r = await h.POST(request({body: emptyStream()}));
  assert.equal(r.status, 404); assert.equal(h.calls.clients, 0);
  assert.equal(h.calls.sends.length, 0); assert.equal(h.row.attempts, 0);
});

test('concurrent empty adapter streams retain the one-claim one-send latch (mock only)', async () => {
  const h = harness();
  const responses = await Promise.all(Array.from({length: 8}, () => h.POST(request({body: emptyStream()}))));
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  assert.equal(responses.filter(r => r.status === 409).length, 7);
  assert.equal(h.calls.sends.length, 1); assert.equal(h.row.attempts, 1);
});

test('gate requires every explicit staging setting and a short unexpired release-bound window', () => {
  assert.ok(guard.stagingEmailConfig(baseline, now));
  for (const key of Object.keys(baseline)) {
    const env = { ...baseline }; delete env[key];
    assert.equal(guard.stagingEmailConfig(env, now), null, key);
  }
  for (const change of [
    { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' }, { NODE_ENV: 'development' },
    { STAGING_PROJECT_REF: 'other' }, { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' },
    { VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }, { VERCEL_GIT_COMMIT_REF: 'main' },
    { NEXT_PUBLIC_SITE_URL: 'https://jingwuguanseibukan.com' },
    { STAGING_EMAIL_TEST_ID: 'not-a-uuid' }, { STAGING_EMAIL_TEST_SECRET: 'short' },
    { EMAIL_WORKER_SECRET: baseline.STAGING_EMAIL_TEST_SECRET },
    { STAGING_EMAIL_TEST_START: new Date(now + 1000).toISOString() },
    { STAGING_EMAIL_TEST_END: new Date(now).toISOString() },
    { STAGING_EMAIL_TEST_START: new Date(now - 3600000).toISOString() },
    { STAGING_EMAIL_TEST_END: 'invalid' }, { EMAIL_FROM_ADDRESS: 'Sender <x@example.org>' },
  ]) assert.equal(guard.stagingEmailConfig({ ...baseline, ...change }, now), null);
});

test('gate excludes role/reserved/sender/test identities and malformed recipients', () => {
  for (const recipient of ['admin@owned-mail.org', 'admin+release@owned-mail.org', 'security@owned-mail.org',
    'a@example.com', 'a@sub.example.org', 'a@foo.test', 'a@foo.invalid', 'a\r\nbcc:x@owned-mail.org',
    'sender@owned-mail.org', 'Two@owned-mail.org', 'x@owned-mail.org,y@owned-mail.org']) {
    assert.equal(guard.stagingEmailConfig({ ...baseline, STAGING_EMAIL_TEST_RECIPIENT: recipient,
      STAGING_EMAIL_TEST_RECIPIENT_CONFIRMATION: recipient }, now), null, recipient);
  }
  assert.equal(guard.stagingEmailConfig({ ...baseline, SECURITY_TEST_MEMBER_EMAIL: baseline.STAGING_EMAIL_TEST_RECIPIENT }, now), null);
});

test('disabled, wrong host/id/secret or request body produce zero database/provider calls', async () => {
  const disabled = harness({ env: { STAGING_EMAIL_TEST_ENABLED: undefined } });
  assert.equal((await disabled.POST(request())).status, 404); assert.equal(disabled.calls.clients, 0);
  for (const options of [
    { url: 'https://jingwuguanseibukan.com/api/system/staging-email-test' },
    { url: `${guard.STAGING_EMAIL_ORIGIN}/api/system/staging-email-test?recipient=other` },
    { headers: { 'x-staging-email-id': 'other' } }, { headers: { 'x-staging-email-secret': 'wrong' } },
    { body: '{}' },
  ]) {
    const h = harness(); assert.ok((await h.POST(request(options))).status >= 400);
    assert.equal(h.calls.clients, 0); assert.equal(h.calls.sends.length, 0);
  }
});

test('profile/Auth inventory errors, existing recipients and pagination uncertainty fail closed', async () => {
  for (const options of [{ profiles: [{ id: 'existing' }] }, { profileError: true }, { authError: true },
    { users: [{ email: baseline.STAGING_EMAIL_TEST_RECIPIENT.toUpperCase() }] },
    { users: [{ identities: [{ identity_data: { email: baseline.STAGING_EMAIL_TEST_RECIPIENT } }] }] },
    { users: Array.from({ length: 1000 }, () => ({ email: 'unrelated@owned-mail.org' })) }]) {
    const h = harness(options); assert.equal((await h.POST(request())).status, 409);
    assert.equal(h.calls.claims.length, 0); assert.equal(h.calls.sends.length, 0);
  }
});

test('every fixture attribute is bound in the atomic claim; altered/ordinary rows cannot send', async () => {
  for (const key of Object.keys(fixture())) {
    const h = harness({ row: { [key]: 'changed' } });
    assert.equal((await h.POST(request())).status, 409, key);
    assert.equal(h.calls.sends.length, 0, key);
  }
});

test('exact fixture sends only fixed content to one recipient then acknowledges the same UUID', async () => {
  const h = harness(); const result = await h.POST(request());
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), { code: 'provider_accepted' });
  assert.equal(h.calls.sends.length, 1); assert.equal(h.row.attempts, 1); assert.equal(h.row.max_attempts, 1);
  assert.deepEqual([...h.calls.sends[0].message.to], [baseline.STAGING_EMAIL_TEST_RECIPIENT]);
  assert.equal(h.calls.sends[0].message.subject, guard.STAGING_EMAIL_SUBJECT);
  assert.equal(h.calls.sends[0].config.idempotencyKey, `email-outbox/${id}`);
  assert.equal(h.calls.sends[0].config.redirect, 'error');
  assert.equal(h.calls.acks[0].target_email_id, id);
  assert.equal((await h.POST(request())).status, 409); assert.equal(h.calls.sends.length, 1);
});

test('concurrent requests share one atomic latch and send at most once', async () => {
  const h = harness(); const responses = await Promise.all(Array.from({ length: 8 }, () => h.POST(request())));
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  assert.equal(responses.filter(r => r.status === 409).length, 7); assert.equal(h.calls.sends.length, 1);
});

test('claim uncertainty never sends; provider/ack uncertainty stays latched without retry or raw errors', async () => {
  for (const options of [{ claimError: true }, { claimLostResponse: true }, { sendError: true },
    { sendThrows: true }, { noProviderId: true }, { ackError: true }]) {
    const h = harness(options); const result = await h.POST(request());
    assert.ok(result.status >= 500); assert.equal(h.logs.length, 0);
    assert.doesNotMatch(await result.text(), /private-provider|secret provider|secret SQL|owned-mail/);
    if (options.claimError || options.claimLostResponse) assert.equal(h.calls.sends.length, 0);
    if (!options.claimError) {
      assert.equal(h.row.attempts, 1); assert.equal(h.row.status, 'processing');
      const count = h.calls.sends.length; assert.equal((await h.POST(request())).status, 409);
      assert.equal(h.calls.sends.length, count);
    }
  }
});

test('no memorial/ordinary worker/automatic retry path or cleanup is exposed', () => {
  const source = readFileSync(new URL('../app/api/system/staging-email-test/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.rpc\(\s*"(?:process_memorial_anniversaries|claim_next_email|mark_email_failed)"/);
  assert.doesNotMatch(source, /\.delete\(|\.insert\(|\.upsert\(|console\./);
  assert.match(source, /\.eq\("status", "cancelled"\)/);
  assert.match(source, /\.eq\("attempts", 0\)/);
  assert.match(source, /\.eq\("max_attempts", 1\)/);
});

test('expiry during inventory or after claim prevents sending and never resets the latch', async () => {
  for (const expireAtCheck of [2, 3]) {
    const h = harness({ expireAtCheck });
    assert.ok((await h.POST(request())).status >= 400);
    assert.equal(h.calls.sends.length, 0);
    assert.equal(h.calls.acks.length, 0);
    assert.equal(h.row.attempts, expireAtCheck === 3 ? 1 : 0);
    assert.equal(h.row.status, expireAtCheck === 3 ? 'processing' : 'cancelled');
  }
});

test('installed provider SDK preserves timeout/redirect/idempotency options and makes no retry (mock fetch only)', async t => {
  const oldMode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => { if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; });
  const errors = t.mock.method(console, 'error', () => {});
  let requests = 0;
  let fail = false;
  const signal = AbortSignal.timeout(10000);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.signal, signal);
    assert.equal(options.headers.get('Idempotency-Key'), `email-outbox/${id}`);
    if (fail) throw new DOMException('mock timeout', 'AbortError');
    return Response.json({ message: 'mock rejection' }, { status: 429 });
  });
  const sdk = new Resend('re_offline-no-network', { baseUrl: 'https://api.resend.com', userAgent: 'offline-test' });
  const options = { signal, redirect: 'error', idempotencyKey: `email-outbox/${id}` };
  assert.ok((await sdk.emails.send({ from: 'fake', to: ['fake'], subject: 'fake', html: 'fake' }, options)).error);
  assert.equal(requests, 1);
  fail = true;
  assert.ok((await sdk.emails.send({ from: 'fake', to: ['fake'], subject: 'fake', html: 'fake' }, options)).error);
  assert.equal(requests, 2);
  assert.equal(errors.mock.callCount(), 0);
});

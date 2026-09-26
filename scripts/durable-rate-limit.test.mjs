import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(new URL('../supabase/migrations/026_durable_api_rate_limits.sql', import.meta.url), 'utf8');
const helper = fs.readFileSync(new URL('../lib/security/durable-rate-limit.ts', import.meta.url), 'utf8');
const routeSources = [
  '../app/api/account/change-email/route.ts',
  '../app/api/account/change-password/route.ts',
  '../app/api/subscribe/route.ts',
  '../app/api/system/email-worker/route.ts',
  '../app/api/push/send/route.ts',
].map(relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));

test('durable rate-limit migration is atomic, private, bounded and service-role-only', () => {
  assert.match(migration, /primary key \(bucket, subject_hash\)/i);
  assert.match(migration, /on conflict \(bucket, subject_hash\) do update/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /revoke all on table public\.api_rate_limit_buckets from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.api_rate_limit_buckets from service_role/i);
  assert.doesNotMatch(migration, /grant [^;]+ on table public\.api_rate_limit_buckets/i);
  assert.match(migration, /revoke all on function public\.consume_api_rate_limit\([^;]+from public, anon, authenticated/is);
  assert.match(migration, /grant execute on function public\.consume_api_rate_limit\([^;]+to service_role/is);
  assert.match(migration, /target_limit not between 1 and 100000/i);
  assert.match(migration, /target_window_seconds not between 1 and 86400/i);
  assert.match(migration, /security definer\s+set search_path = public, pg_temp/i);
});

test('server helper hashes subjects, fails closed and validates database results', () => {
  assert.match(helper, /DURABLE_RATE_LIMIT_SECRET/);
  assert.match(helper, /secret\.length < 32/);
  assert.match(helper, /createHmac\(\s*"sha256"/);
  assert.match(helper, /consume_api_rate_limit/);
  assert.match(helper, /Durable rate-limit persistence failed/);
  assert.match(helper, /typeof row\.allowed !== "boolean"/);
  assert.doesNotMatch(helper, /subject_hash:\s*subject\b/);
});

test('account and worker routes enforce denial and fail closed when persistence is unavailable', () => {
  for (const source of routeSources) {
    assert.match(source, /consumeDurableRateLimit/);
    assert.match(source, /durableRateLimitHeaders/);
    assert.match(source, /status:\s*429/);
    assert.match(source, /status:\s*503/);
  }
});

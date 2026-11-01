import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(
  'supabase/migrations/054_full_payment_only.sql',
  'utf8',
);
const acceptance = fs.readFileSync('tests/sql/054_staging_acceptance.sql', 'utf8');
const postflight = fs.readFileSync('tests/sql/054_staging_postflight.sql', 'utf8');

test('migration 054 requires full settlement for direct and confirmed payments', () => {
  assert.match(sql, /create trigger membership_payments_require_full_balance/i);
  assert.match(sql, /before insert on public\.membership_payments/i);
  assert.match(sql, /new\.amount is null or new\.amount <> remaining_balance/i);
  assert.match(sql, /Payment must equal the full outstanding subscription balance/i);

  assert.match(sql, /create trigger membership_payment_confirmations_require_full_balance/i);
  assert.match(sql, /before insert on public\.membership_payment_confirmations/i);
  assert.match(sql, /Payment confirmation must equal the full outstanding subscription balance/i);
});

test('migration 054 serializes balance checks and preserves historical rows', () => {
  assert.match(sql, /membership_subscription_charges[\s\S]*for update/i);
  assert.match(sql, /coalesce\(sum\(payment\.amount\), 0\)/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.membership_payments/i);
  assert.doesNotMatch(sql, /update\s+public\.membership_payments/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.membership_payment_confirmations/i);
  assert.doesNotMatch(sql, /update\s+public\.membership_payment_confirmations/i);
});

test('migration 054 keeps trigger helpers private and fixes their search paths', () => {
  assert.equal((sql.match(/security definer/gi) ?? []).length, 2);
  assert.equal((sql.match(/set search_path to public, pg_temp/gi) ?? []).length, 2);
  assert.match(sql, /revoke all on function public\.enforce_full_membership_payment\(\) from authenticated/i);
  assert.match(sql, /revoke all on function public\.enforce_full_payment_confirmation\(\) from authenticated/i);
  assert.doesNotMatch(sql, /grant execute/i);
});

test('migration 054 staging checks are rollback-contained and independently verify residue, ledger, and ACLs', () => {
  assert.match(acceptance, /ROLLBACK-CONTAINED PASS: migration 054 full-payment acceptance/i);
  assert.match(acceptance, /Partial direct payment unexpectedly succeeded/i);
  assert.match(acceptance, /Partial Member confirmation unexpectedly succeeded/i);
  assert.match(acceptance, /This subscription charge is already fully paid/i);
  assert.doesNotMatch(acceptance, /\bcommit\b/i);

  assert.match(postflight, /generate_series\(6, 54\)/i);
  assert.match(postflight, /name = 'full_payment_only'/i);
  assert.match(postflight, /Migration 054 acceptance left marker residue/i);
  assert.match(postflight, /has_function_privilege[\s\S]*authenticated/i);
  assert.match(postflight, /search_path=public, pg_temp/i);
});

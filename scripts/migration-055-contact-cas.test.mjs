import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(
  new URL('../supabase/migrations/055_contact_details_compare_and_swap.sql', import.meta.url),
  'utf8',
);
const profilePage = await readFile(
  new URL('../app/(member)/profile/page.tsx', import.meta.url),
  'utf8',
);
const acceptance = await readFile(
  new URL('../tests/sql/055_staging_acceptance.sql', import.meta.url),
  'utf8',
);
const postflight = await readFile(
  new URL('../tests/sql/055_staging_postflight.sql', import.meta.url),
  'utf8',
);

test('migration 055 adds a fixed-search-path compare-and-swap contact boundary', () => {
  assert.match(sql, /create or replace function public\.update_my_contact_details_if_unchanged\(/i);
  assert.match(sql, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(sql, /where profile\.id = caller_id\s+for update/i);
  assert.match(sql, /profile_record\.phone is distinct from expected_phone/i);
  assert.match(sql, /profile_record\.instagram_username is distinct from expected_instagram_username/i);
  assert.match(sql, /errcode = '40001'/i);
});

test('migration 055 writes and audits only changed values and preserves the legacy RPC', () => {
  assert.match(sql, /values_changed :=[\s\S]*phone is distinct from normalized_phone/i);
  assert.match(sql, /if values_changed then[\s\S]*update public\.profiles/i);
  assert.match(sql, /insert into public\.profile_contact_change_audit/gi);
  assert.doesNotMatch(sql, /drop function public\.update_my_contact_details\(text, text\)/i);
  assert.match(sql, /to_regprocedure\('public\.update_my_contact_details\(text,text\)'\)/i);
});

test('migration 055 grants only the intended browser and service roles', () => {
  assert.match(sql, /revoke all[\s\S]*update_my_contact_details_if_unchanged\(text, text, text, text\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant execute[\s\S]*update_my_contact_details_if_unchanged\(text, text, text, text\)[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to (?:public|anon)/i);
});

test('profile editor sends its captured baseline and handles serialization conflicts', () => {
  assert.match(profilePage, /"update_my_contact_details_if_unchanged"/i);
  for (const argument of [
    'expected_phone',
    'expected_instagram_username',
    'new_phone',
    'new_instagram_username',
  ]) assert.match(profilePage, new RegExp(`${argument}:`, 'i'));
  assert.match(profilePage, /error\?\.code === "40001"/i);
  assert.match(profilePage, /Review the refreshed values and try again/i);
  assert.match(profilePage, /row\?\.changed === false/i);
});

test('migration 055 staging checks are rollback-contained and independently verify residue, ledger and ACLs', () => {
  assert.match(acceptance, /ROLLBACK-CONTAINED PASS: migration 055 contact compare-and-swap acceptance/i);
  assert.match(acceptance, /exception when serialization_failure/i);
  assert.match(acceptance, /Exact no-op changed profile or audit state/i);
  assert.match(acceptance, /One stale field did not reject the whole update/i);
  assert.match(acceptance, /NULL Instagram compare-and-swap contract failed/i);
  assert.doesNotMatch(acceptance, /\bcommit\b/i);

  assert.match(postflight, /generate_series\(6, 55\)/i);
  assert.match(postflight, /name = 'contact_details_compare_and_swap'/i);
  assert.match(postflight, /Migration 055 acceptance left marker residue/i);
  assert.match(postflight, /has_function_privilege[\s\S]*authenticated/i);
  assert.match(postflight, /search_path=public, pg_temp/i);
});

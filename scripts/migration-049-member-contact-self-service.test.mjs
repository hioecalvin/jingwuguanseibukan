import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL(
    "../supabase/migrations/049_member_contact_self_service.sql",
    import.meta.url,
  ),
  "utf8",
);

test("migration 049 adds only the agreed member-editable contact field", () => {
  assert.match(sql, /alter table public\.profiles[\s\S]*add column instagram_username text/i);
  assert.match(sql, /store[d]? without a leading @/i);
  assert.doesNotMatch(sql, /add column (?:full_name|registration_number|date_of_birth|aikikai_registration_number)/i);
  assert.match(sql, /profiles_instagram_username_check/i);
});

test("phone and Instagram updates are active-caller-only, normalized and audited", () => {
  assert.match(sql, /create or replace function public\.update_my_contact_details\(\s*new_phone text,\s*new_instagram_username text/i);
  assert.match(sql, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(sql, /where profile\.id = caller_id\s+for update/i);
  assert.match(sql, /regexp_replace\(coalesce\(btrim\(new_phone\)/i);
  assert.match(sql, /regexp_replace\([\s\S]*new_instagram_username[\s\S]*'\^@\+'/i);
  assert.match(sql, /insert into public\.profile_contact_change_audit/gi);
  assert.match(sql, /grant execute[\s\S]*update_my_contact_details\(text, text\)[\s\S]*to authenticated, service_role/i);
  assert.match(sql, /revoke all[\s\S]*update_my_contact_details\(text, text\)[\s\S]*from public, anon, authenticated, service_role/i);
});

test("verified Auth email replacement is the only profile email synchronization boundary", () => {
  assert.match(sql, /create or replace function public\.sync_profile_email_from_auth\(\)/i);
  assert.match(sql, /after update of email on auth\.users/i);
  assert.match(sql, /when \(old\.email is distinct from new\.email\)/i);
  assert.match(sql, /set email = normalized_email/i);
  assert.match(sql, /'auth_email_confirmation'/i);
  assert.match(sql, /profiles_email_normalized_uidx|profile_record\.email is distinct from normalized_email/i);
  assert.doesNotMatch(sql, /update auth\.users/i);
});

test("contact audit is private, forced-RLS and append-only", () => {
  assert.match(sql, /create table public\.profile_contact_change_audit/i);
  assert.match(sql, /alter table public\.profile_contact_change_audit force row level security/i);
  assert.match(sql, /revoke all privileges[\s\S]*profile_contact_change_audit[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select[\s\S]*profile_contact_change_audit[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[\s\S]*profile_contact_change_audit/i);
});

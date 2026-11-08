import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL("../supabase/migrations/040_deceased_member_memorials.sql", import.meta.url),
  "utf8",
);

test("adds a Date of Passing without changing membership status or deleting auth users", () => {
  assert.match(sql, /alter table public\.profiles[\s\S]*add column date_of_passing date/i);
  assert.doesNotMatch(sql, /update\s+public\.class_memberships[\s\S]*set\s+status/i);
  assert.doesNotMatch(sql, /delete\s+from\s+auth\.users/i);
});

test("exposes the agreed memorial RPC contract", () => {
  assert.match(sql, /is_super_admin\(uuid\)'::regprocedure[\s\S]*pronargdefaults = 1/i);
  assert.match(sql, /function public\.get_member_memorial_settings\(\s*target_user_id uuid/i);
  assert.match(sql, /function public\.set_member_deceased\([\s\S]*target_date_of_passing date[\s\S]*target_recipient_class_ids uuid\[\][\s\S]*target_remembrance_enabled boolean[\s\S]*target_heavenly_birthday_enabled boolean/i);
  assert.match(sql, /function public\.publish_initial_memorial\([\s\S]*target_title text[\s\S]*target_message text/i);
  assert.match(sql, /function public\.process_memorial_anniversaries\(\s*target_date date default null/i);
});

test("keeps deceased reversal retry-safe for a partially completed Auth unban", () => {
  assert.match(
    sql,
    /target_date_of_passing is null and previous_date is null[\s\S]*member_memorial_settings[\s\S]*return public\.get_member_memorial_settings\(target_user_id\)/i,
  );
});

test("makes the annual processor service-only and idempotent", () => {
  assert.match(sql, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/i);
  assert.match(sql, /unique \(user_id, memorial_type, occurrence_date\)/i);
  assert.match(sql, /revoke execute on function public\.process_memorial_anniversaries\(date\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.process_memorial_anniversaries\(date\) to service_role/i);
});

test("uses Jakarta business dates and defines leap-day behavior", () => {
  assert.match(sql, /timezone\('Asia\/Jakarta', now\(\)\)/i);
  assert.match(sql, /extract\(month from source_date\) = 2[\s\S]*extract\(day from source_date\) = 29[\s\S]*extract\(day from target_date\) = 28/i);
});

test("adds explicit RLS and ACLs for every new table", () => {
  for (const table of [
    "member_memorial_settings",
    "member_memorial_recipient_classes",
    "member_memorial_audit",
    "member_memorial_publications",
    "announcement_recipient_classes",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
  }
});

test("supports multi-class memorial recipients while preserving legacy class_id", () => {
  assert.match(sql, /create table public\.announcement_recipient_classes/i);
  assert.match(sql, /case when count\(\*\) = 1 then min\(class_id\) else null end/i);
  assert.match(sql, /jsonb_array_length\(target_classes\) = 0[\s\S]*item\.class_id is null/i);
});

test("uses a security-definer announcement visibility helper to avoid RLS-hidden not-exists fallthrough", () => {
  assert.match(sql, /function public\.can_view_announcement\([\s\S]*security definer[\s\S]*announcement_recipient_classes/i);
  assert.match(sql, /or public\.can_view_announcement\(announcements\.id, announcements\.class_id\)/i);
  assert.doesNotMatch(
    sql.match(/create policy "members can view announcements"[\s\S]*?;\s*\n/i)?.[0] ?? "",
    /not exists\s*\([\s\S]*announcement_recipient_classes/i,
  );
});

test("excludes disabled and deceased notification recipients", () => {
  assert.match(sql, /profile\.account_status = 'active'/i);
  assert.match(sql, /profile\.date_of_passing is null/i);
  assert.match(sql, /select distinct membership\.user_id/i);
});

test("preserves the existing event-email trigger", () => {
  assert.doesNotMatch(sql, /drop trigger(?:\s+if exists)?\s+trigger_queue_event_notifications/i);
  assert.match(sql, /if not exists\s*\(\s*select 1 from pg_trigger[\s\S]*?tgname = 'trigger_queue_event_notifications'[\s\S]*?Existing event email trigger was not preserved/i);
});

test("adds a PostgREST pre-request gate for already-issued JWTs", () => {
  assert.match(sql, /function public\.is_active_app_user\([\s\S]*?security definer[\s\S]*?profile\.account_status = 'active'[\s\S]*?profile\.date_of_passing is null/i);
  assert.match(sql, /function public\.enforce_active_account_request\(\)/i);
  assert.match(sql, /function public\.enforce_active_account_request\(\)[\s\S]*?security invoker[\s\S]*?set search_path = public, pg_temp/i);
  assert.match(sql, /alter role authenticator[\s\S]*pgrst\.db_pre_request = 'public\.enforce_active_account_request'/i);
  assert.match(sql, /message = 'Account access is disabled'/i);
  assert.match(sql, /setting = 'pgrst\.db_pre_request=public\.enforce_active_account_request'/i);
});

test("hardens direct and realtime member-facing policies without policy recursion", () => {
  assert.match(sql, /create policy "own memberships"[\s\S]*?is_active_app_user\(auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "read own notifications"[\s\S]*?is_active_app_user\(auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "members can view class events"[\s\S]*?is_active_app_user\(auth\.uid\(\)\)/i);
  assert.doesNotMatch(sql, /create policy "own memberships"[\s\S]*?select 1 from public\.profiles[\s\S]*?create policy "admin scoped memberships"/i);
});

test("keeps deceased rows visible only to Super Admin through the admin view", () => {
  assert.match(sql, /create or replace view public\.admin_visible_members[\s\S]*p\.date_of_passing[\s\S]*p\.account_status/i);
  assert.match(sql, /where p\.date_of_passing is null[\s\S]*or public\.is_super_admin\(\)/i);
});

test("all new privileged routines use a fixed search_path", () => {
  const names = [
    "guard_deceased_profile_fields",
    "is_active_app_user",
    "enforce_active_account_request",
    "get_member_memorial_settings",
    "set_member_deceased",
    "publish_memorial_announcement",
    "publish_initial_memorial",
    "process_memorial_anniversaries",
  ];
  for (const name of names) {
    assert.match(
      sql,
      new RegExp(`function public\\.${name}\\([\\s\\S]*?set search_path = public, pg_temp`, "i"),
    );
  }
});

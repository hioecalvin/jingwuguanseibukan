import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/045_last_training_session.sql",
  "utf8",
);
const adminPage = fs.readFileSync(
  "app/admin/members/page.tsx",
  "utf8",
);
const profilePage = fs.readFileSync(
  "app/(member)/profile/page.tsx",
  "utf8",
);
const dateFormatting = fs.readFileSync(
  "lib/format-date.ts",
  "utf8",
);
const markTodayBody = /create or replace function public\.mark_membership_trained_today\([\s\S]*?as \$function\$([\s\S]*?)\$function\$;/i.exec(
  migration,
)?.[1] ?? "";

test("migration 045 stores one audited instructor-recorded date per membership", () => {
  assert.match(migration, /alter table public\.class_memberships[\s\S]*add column last_training_session_date date/i);
  assert.match(migration, /create table public\.membership_training_session_audit/i);
  assert.match(migration, /previous_training_date date[\s\S]*new_training_date date not null/i);
  assert.doesNotMatch(migration, /add column last_training_session_recorded_(?:at|by)/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /revoke all privileges[\s\S]*membership_training_session_audit[\s\S]*from public, anon, authenticated/i);
});

test("only an active scoped Admin or Super Admin can record a valid date", () => {
  assert.match(migration, /create or replace function public\.set_membership_last_training_session\(/i);
  assert.match(migration, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(migration, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(migration, /public\.is_super_admin\(caller_id\)[\s\S]*public\.is_class_admin\([\s\S]*caller_id/i);
  assert.match(migration, /membership\.status,[\s\S]*for update of membership, profile/i);
  assert.match(migration, /date_of_passing is not null[\s\S]*cannot be recorded for a deceased member/i);
  assert.match(migration, /membership_record\.status::text is distinct from 'active'[\s\S]*Only an active membership can record training/i);
  assert.match(migration, /business_today := \(clock_timestamp\(\) at time zone 'Asia\/Jakarta'\)::date/i);
  assert.match(migration, /effective_training_date > business_today/i);
  assert.match(migration, /effective_training_date < membership_record\.joined_date/i);
  assert.match(migration, /insert into public\.membership_training_session_audit/i);
  assert.match(migration, /update public\.class_memberships/i);
});

test("the server calculates Jakarta recency and exposes no audit rows to browsers", () => {
  assert.match(migration, /now\(\) at time zone 'Asia\/Jakarta'/i);
  assert.match(migration, /create or replace function public\.get_my_last_training_sessions\(\)/i);
  assert.match(migration, /where membership\.user_id = caller_id/i);
  assert.match(migration, /as last_training_days_ago/i);
  assert.match(migration, /with \(security_invoker = true\)/i);
  assert.match(migration, /p\.account_status,[\s\S]*m\.last_training_session_date,[\s\S]*end as last_training_days_ago/i);
  assert.match(migration, /revoke all[\s\S]*set_membership_last_training_session\(uuid, date\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]*set_membership_last_training_session\(uuid, date\)[\s\S]*to authenticated/i);
});

test("an instructor can mark attendance as the Jakarta server date", () => {
  assert.match(migration, /create or replace function public\.mark_membership_trained_today\([\s\S]*target_membership_id uuid/i);
  assert.match(markTodayBody, /public\.set_membership_last_training_session\(\s*target_membership_id,\s*null::date\s*\)/i);
  assert.doesNotMatch(markTodayBody, /now\(\)|clock_timestamp\(\)/i);
  assert.match(migration, /revoke all[\s\S]*mark_membership_trained_today\(uuid\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]*mark_membership_trained_today\(uuid\)[\s\S]*to authenticated/i);
  assert.match(migration, /notify pgrst, 'reload schema'/i);
  assert.match(adminPage, /mark_membership_trained_today/);
  assert.match(adminPage, /Mark Trained Today/);
});

test("member list and profile use server-provided recency with the 30-day display boundary", () => {
  assert.match(adminPage, /set_membership_last_training_session/);
  assert.match(adminPage, /Last Training Session/);
  assert.match(adminPage, /formatTrainingSessionRecency\(/);
  assert.match(profilePage, /get_my_last_training_sessions/);
  assert.match(profilePage, /Last Training Session/);
  assert.match(profilePage, /formatTrainingSessionRecency\(/);
  assert.match(profilePage, /trainingSessionsUnavailable[\s\S]*"Temporarily unavailable"/);
  assert.match(adminPage, /trainingSaving[\s\S]*trainingFeedback/);
  assert.match(adminPage, /last_training_days_ago === 0[\s\S]*"Trained Today"/);
  assert.match(adminPage, /min=\{[\s\S]*member\.joined_date/);
  assert.match(dateFormatting, /daysAgo >= 30[\s\S]*formatDate\(trainingDate\)/);
  assert.match(dateFormatting, /daysAgo === 0[\s\S]*return "Today"/);
  assert.match(dateFormatting, /return `\$\{daysAgo\} days ago`/);
});

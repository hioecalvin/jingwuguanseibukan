import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/048_regular_class_schedules.sql",
  import.meta.url,
);

const sql = await readFile(migrationUrl, "utf8");

test("migration 048 creates an information-only audited weekly timetable", () => {
  assert.match(sql, /create table public\.regular_class_schedules/i);
  assert.match(sql, /day_of_week smallint not null/i);
  assert.match(sql, /start_time time without time zone not null/i);
  assert.match(sql, /finish_time time without time zone not null/i);
  assert.match(sql, /instructor_id uuid references public\.profiles/i);
  assert.match(sql, /venue text/i);
  assert.match(sql, /notes text/i);
  assert.match(sql, /is_active boolean not null default true/i);
  assert.match(sql, /create table public\.regular_class_schedule_audit/i);
  assert.doesNotMatch(sql, /insert into public\.(?:events|notifications|notification_outbox|attendance)/i);
});

test("migration 048 exposes only safe RPC boundaries to browser roles", () => {
  for (const signature of [
    "get_regular_class_schedules(boolean)",
    "get_manageable_schedule_scopes()",
    "get_schedule_instructor_options(uuid)",
  ]) {
    const escaped = signature.replace(/[()]/g, "\\$&");
    assert.match(sql, new RegExp(`revoke all[\\s\\S]*public\\.${escaped}[\\s\\S]*from public, anon, authenticated, service_role`, "i"));
    assert.match(sql, new RegExp(`grant execute[\\s\\S]*public\\.${escaped}[\\s\\S]*to authenticated, service_role`, "i"));
  }

  assert.match(sql, /alter table public\.regular_class_schedules force row level security/i);
  assert.match(sql, /alter table public\.regular_class_schedule_audit force row level security/i);
  assert.match(sql, /revoke all privileges[\s\S]*regular_class_schedules[\s\S]*from public, anon, authenticated, service_role/i);
  assert.doesNotMatch(
    sql,
    /grant\s+(?:select|insert|update|delete)\s+on table\s+public\.regular_class_schedules[^;]*to authenticated/i,
  );
});

test("schedule writes require the exact dojo and class scope and audit every change", () => {
  assert.match(sql, /create or replace function public\.upsert_regular_class_schedule\(/i);
  assert.match(sql, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(sql, /public\.is_class_admin\(target_class_id, target_dojo_id, caller_id\)/i);
  assert.match(sql, /public\.is_class_admin\([\s\S]*existing_record\.class_id,[\s\S]*existing_record\.dojo_id,[\s\S]*caller_id/i);
  assert.match(sql, /instructor must be an active member of this class/i);
  assert.match(sql, /insert into public\.regular_class_schedule_audit/gi);
  assert.match(sql, /finish time must be after start time/i);
});

test("member reads omit private profile and administrative fields", () => {
  const readFunction = sql.match(
    /create or replace function public\.get_regular_class_schedules\([\s\S]*?\$function\$;/i,
  )?.[0];
  assert.ok(readFunction);
  assert.match(readFunction, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(readFunction, /instructor\.full_name/i);
  assert.doesNotMatch(readFunction, /instructor\.(?:email|phone|date_of_birth|registration_number)/i);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL("../supabase/migrations/042_prepare_assessment_certificates.sql", import.meta.url),
  "utf8",
);

test("persists private prepared rosters and pending certificates", () => {
  assert.match(sql, /create table public\.prepared_assessments/i);
  assert.match(sql, /create table public\.prepared_assessment_candidates/i);
  assert.match(sql, /create table public\.prepared_assessment_certificates/i);
  assert.match(sql, /status text not null default 'pending'[\s\S]*'issued'[\s\S]*'voided'/i);
  assert.match(sql, /certificate_number text not null unique/i);
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /revoke all on table public\.prepared_assessments[\s\S]*from public, anon, authenticated/i);
});

test("only an active Super Admin can prepare, open, print or finalize", () => {
  assert.match(sql, /function public\.is_active_super_admin\(caller_id uuid\)/i);
  assert.match(sql, /to_regprocedure\('public\.is_super_admin\(uuid\)'\) is null/i);
  assert.match(sql, /public\.is_super_admin\(caller_id\)/i);
  assert.doesNotMatch(sql, /profile\.role/i);
  assert.match(sql, /profile\.account_status::text = 'active'/i);
  assert.match(sql, /profile\.date_of_passing is null/i);
  assert.match(sql, /Only an active Super Admin can prepare assessments/i);
  assert.match(sql, /Only an active Super Admin can submit prepared assessments/i);
});

test("preparation pins the complete roster and expected destinations", () => {
  assert.match(sql, /function public\.prepare_bulk_assessment\(/i);
  assert.match(sql, /select between 1 and 500 assessment candidates/i);
  assert.match(sql, /A membership may appear only once/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /candidate\.rank_to_id is distinct from selected\.expected_rank_to_id/i);
  assert.match(sql, /candidate\.sub_rank_to_id is distinct from selected\.expected_sub_rank_to_id/i);
  assert.match(sql, /Preparation key was already used for a different roster/i);
});

test("finalization requires every prepared candidate exactly once", () => {
  assert.match(sql, /function public\.finalize_prepared_bulk_assessment\(/i);
  assert.match(sql, /Every prepared candidate must receive exactly one Pass or Fail result/i);
  assert.match(sql, /Results must match the complete prepared roster/i);
  assert.match(sql, /public\.submit_bulk_assessment\([\s\S]*submission_payload/i);
  assert.match(sql, /revoke execute on function public\.submit_bulk_assessment[\s\S]*from authenticated/i);
});

test("one transaction issues pass certificates and voids fail certificates", () => {
  assert.match(sql, /when result_row\.outcome = 'pass' then 'issued' else 'voided'/i);
  assert.match(sql, /when result_row\.outcome = 'pass' then result_row\.promotion_history_id/i);
  assert.match(sql, /when result_row\.outcome = 'fail' then clock_timestamp\(\)/i);
  assert.match(sql, /Not every pending certificate was finalized/i);
  assert.match(sql, /status = 'submitted'/i);
});

test("printing is audited without changing pending status", () => {
  const printRoutine = sql.match(
    /create or replace function public\.record_prepared_assessment_certificate_print[\s\S]*?alter function public\.record_prepared_assessment_certificate_print\(uuid\)/i,
  )?.[0];
  assert.ok(printRoutine);
  assert.match(sql, /function public\.record_prepared_assessment_certificate_print/i);
  assert.match(sql, /print_count = certificate\.print_count \+ 1/i);
  assert.match(sql, /first_printed_at = coalesce/i);
  assert.match(sql, /latest_printed_at = clock_timestamp\(\)/i);
  assert.doesNotMatch(printRoutine, /set status\s*=/i);
});

test("browser roles use guarded RPCs and cannot read preparation tables directly", () => {
  assert.match(sql, /grant execute on function public\.prepare_bulk_assessment/i);
  assert.match(sql, /public\.get_prepared_bulk_assessments\(\)/i);
  assert.match(sql, /public\.get_prepared_bulk_assessment\(uuid\)/i);
  assert.match(sql, /public\.finalize_prepared_bulk_assessment\(uuid,uuid,jsonb\)/i);
  assert.match(sql, /has_table_privilege\('authenticated', 'public\.prepared_assessments', 'SELECT'\)/i);
});

test("database-backed certificate verification remains service-only", () => {
  assert.match(sql, /function public\.verify_prepared_assessment_certificate\(\s*target_certificate_id uuid/i);
  assert.match(sql, /certificate_status text[\s\S]*member_name text[\s\S]*promoted_rank text[\s\S]*promotion_date date[\s\S]*assessor_name text/i);
  assert.match(sql, /revoke all on function public\.verify_prepared_assessment_certificate\(uuid\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.verify_prepared_assessment_certificate\(uuid\)[\s\S]*to service_role/i);
  assert.match(sql, /has_function_privilege\([\s\S]*'authenticated', 'public\.verify_prepared_assessment_certificate\(uuid\)', 'EXECUTE'[\s\S]*\)/i);
});

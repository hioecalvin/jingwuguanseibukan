import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL("../supabase/migrations/041_atomic_bulk_assessments.sql", import.meta.url),
  "utf8",
);

test("exposes scoped candidate and one JSON batch submit contract", () => {
  assert.match(sql, /function public\.get_bulk_assessment_candidates\(\s*target_class_id uuid,\s*target_dojo_id uuid default null/i);
  assert.match(sql, /function public\.submit_bulk_assessment\([\s\S]*submission_key uuid[\s\S]*target_class_id uuid[\s\S]*assessment_date date[\s\S]*assessor_member_id uuid[\s\S]*external_assessor_name text[\s\S]*target_dojo_id uuid[\s\S]*decisions jsonb/i);
  for (const field of [
    "full_name",
    "avatar_url",
    "dojo_name",
    "rank_before_name",
    "rank_to_name",
    "level_to",
  ]) {
    assert.match(sql, new RegExp(`${field} text`, "i"));
  }
  assert.match(sql, /is_rank_promotion boolean/i);
});

test("keeps audited immutable batch and result data behind RPCs", () => {
  assert.match(sql, /create table public\.assessment_batches/i);
  assert.match(sql, /create table public\.assessment_results/i);
  assert.match(sql, /unique \(submitted_by, submission_key\)/i);
  assert.match(sql, /unique \(membership_id, assessment_date\)/i);
  assert.match(sql, /instructor_name_snapshot text/i);
  assert.match(sql, /promotion_history_id uuid unique[\s\S]*membership_grade_history/i);
  assert.match(sql, /certificate_eligible boolean not null/i);
  for (const table of ["assessment_batches", "assessment_results"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table}[\\s\\S]*from public, anon, authenticated`, "i"));
  }
});

test("serializes retries and candidate locks before applying effects", () => {
  const advisory = sql.search(/pg_advisory_xact_lock/i);
  const replayRead = sql.search(/from public\.assessment_batches as batch[\s\S]*for update/i);
  const rowLock = sql.search(/order by membership\.id[\s\S]*for update of membership/i);
  const firstBatchInsert = sql.search(/insert into public\.assessment_batches/i);

  assert.ok(advisory >= 0 && advisory < replayRead);
  assert.ok(rowLock >= 0 && rowLock < firstBatchInsert);
  assert.match(sql, /auth\.uid\(\)::text \|\| ':' \|\| submission_key::text/i);
});

test("rejects stale and duplicate rosters before writes", () => {
  assert.match(sql, /expected_rank_to_id uuid/i);
  assert.match(sql, /expected_sub_rank_to_id uuid/i);
  assert.match(sql, /promotion\.next_rank_id is distinct from decision\.expected_rank_to_id/i);
  assert.match(sql, /promotion\.next_sub_rank_id is distinct from decision\.expected_sub_rank_to_id/i);
  assert.match(sql, /already has an assessment recorded for/i);
});

test("qualifies the assessment-date parameter in same-day duplicate checks", () => {
  assert.match(
    sql,
    /prior_result\.assessment_date\s*=\s*submit_bulk_assessment\.assessment_date/i,
  );
  assert.doesNotMatch(
    sql,
    /prior_result\.assessment_date\s*=\s*assessment_date\b/i,
  );
});

test("promotes pass rows only while retaining fail results", () => {
  assert.match(sql, /if validated_item ->> 'outcome' = 'pass' then\s+new_history_id := public\.promote_membership/i);
  assert.match(sql, /insert into public\.assessment_results/i);
  assert.match(sql, /outcome = 'fail' and promotion_history_id is null/i);
  assert.match(sql, /public\.create_notification\([\s\S]*'grade_promoted'/i);
});

test("publishes exactly one class result announcement only for batches with passes", () => {
  assert.match(sql, /announcement_type in \([\s\S]*'grading_results'/i);
  assert.match(sql, /if pass_count > 0 then[\s\S]*insert into public\.announcements/i);
  assert.match(sql, /published,[\s\S]*announcement_type[\s\S]*true,[\s\S]*'grading_results'/i);
  assert.match(sql, /set announcement_id = new_announcement_id/i);
  assert.match(sql, /'announcement_id', new_announcement_id/i);
  assert.match(sql, /'announcement_id', existing_batch\.announcement_id/i);
  assert.match(sql, /member_name'\) \|\| ', '[\s\S]*rank_before_name[\s\S]*\|\| ' to '[\s\S]*rank_to_name/i);
  assert.match(sql, /'Congratulations — ' \|\| assessment_class_name/i);
});

test("orders promotion announcements by dojo and highest destination rank first", () => {
  assert.match(sql, /select dojo_record\.name::text into assessment_dojo_name/i);
  assert.match(sql, /when target_dojo_id is null then[\s\S]*dojo_name[\s\S]*\|\| ': '/i);
  assert.match(sql, /join public\.ranks as promoted_rank[\s\S]*rank_to_id/i);
  assert.match(sql, /left join public\.sub_ranks as promoted_sub_rank[\s\S]*sub_rank_to_id/i);
  assert.match(sql, /promoted_rank\.sort_order desc[\s\S]*promoted_sub_rank\.sort_order desc nulls last/i);
  assert.match(sql, /assessment_dojo_name is not null then ' — ' \|\| assessment_dojo_name/i);
});

test("retains existing per-destination assessor rules and keeps instructor separate", () => {
  assert.match(sql, /promotion\.next_level::text = 'yudansha'[\s\S]*External assessor name is required/i);
  assert.match(sql, /Member assessor is required for Mudansha grading/i);
  assert.match(sql, /profile\.is_grading_assessor = true/i);
  assert.match(sql, /profile\.account_status = 'active'[\s\S]*profile\.date_of_passing is null[\s\S]*for share of profile/i);
  assert.match(sql, /instructor_name_snapshot is[\s\S]*not a grading assessor/i);
  assert.match(sql, /length\(coalesce\(parsed\.instructor_name, ''\)\) > 200/i);
});

test("rolls back if the applied promotion no longer matches the validated target", () => {
  assert.match(
    sql,
    /from public\.membership_grade_history as applied_history[\s\S]*applied_history\.id = new_history_id[\s\S]*applied_history\.rank_id =[\s\S]*rank_to_id[\s\S]*applied_history\.sub_rank_id is not distinct from[\s\S]*sub_rank_to_id[\s\S]*Promotion target changed while submitting membership/i,
  );
});

test("rejects future assessment dates and bounds external assessor snapshots", () => {
  assert.match(sql, /assessment_date > \(timezone\('Asia\/Jakarta', now\(\)\)\)::date/i);
  assert.match(sql, /length\(coalesce\(external_assessor_name, ''\)\) > 200/i);
});

test("keeps browser RPC grants explicit and tables non-browser-readable", () => {
  for (const signature of [
    "get_bulk_assessment_candidates\\(uuid, uuid\\)",
    "submit_bulk_assessment\\(\\s*uuid, uuid, date, uuid, text, uuid, jsonb\\s*\\)",
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${signature}[\\s\\S]*from public, anon`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]*to authenticated, service_role`, "i"));
  }
});

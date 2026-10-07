import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(
  new URL("../app/admin/assessments/page.tsx", import.meta.url),
  "utf8",
);
const navigation = await readFile(
  new URL("../lib/navigation.ts", import.meta.url),
  "utf8",
);
const assessmentLayout = await readFile(
  new URL("../app/admin/assessments/layout.tsx", import.meta.url),
  "utf8",
);

test("bulk assessment page prepares a persisted roster before atomic finalization", () => {
  assert.match(page, /get_bulk_assessment_candidates/);
  assert.match(page, /prepare_bulk_assessment/);
  assert.match(page, /get_prepared_bulk_assessments/);
  assert.match(page, /get_prepared_bulk_assessment/);
  assert.match(page, /finalize_prepared_bulk_assessment/);
  assert.match(page, /submission_key:\s*submissionKey/);
  assert.doesNotMatch(page, /"submit_bulk_assessment"/);
});

test("every prepared row pins the expected destination grade", () => {
  assert.match(page, /expected_rank_to_id:\s*candidate\.rank_to_id/);
  assert.match(page, /expected_sub_rank_to_id:\s*candidate\.sub_rank_to_id/);
  assert.match(page, /membership_id:\s*candidate\.membership_id/);
  assert.match(page, /outcome:\s*decision\.outcome/);
});

test("roster has explicit inclusion, result, instructor, notes and grade context", () => {
  assert.match(page, /Include \{candidate\.full_name\}/);
  assert.match(page, /Home dojo:/);
  assert.match(page, /Home instructor/);
  assert.match(page, /Current grade/);
  assert.match(page, /Target grade/);
  assert.match(page, /<option value="pass">Pass<\/option>/);
  assert.match(page, /<option value="fail">Fail<\/option>/);
  assert.match(page, /maxLength=\{2000\}/);
});

test("review requires explicit confirmation and prevents repeat submission", () => {
  assert.match(page, /Confirm assessment submission/);
  assert.match(page, /I confirm the scope, assessors, target grades, Pass\/Fail results, and notes/);
  assert.match(page, /if \(submitting \|\| result \|\| !confirmed/);
  assert.match(page, /Confirm and submit once/);
});

test("the prepared roster is immutable and every candidate is submitted together", () => {
  assert.match(page, /Boolean\(preparedAssessmentId\)/);
  assert.match(page, /Every candidate must receive one result/);
  assert.match(page, /fixed candidates/);
  assert.match(page, /Prepare and print the pending certificates before submitting results/);
});

test("both assessor modes and scope controls are available", () => {
  assert.match(page, /get_active_grading_assessors/);
  assert.match(page, /Internal Member assessor/);
  assert.match(page, /External assessor/);
  assert.match(page, /Dojo \(optional\)/);
  assert.match(page, /type="date"/);
});

test("assessments are present only in Super Admin navigation", () => {
  const assessmentNavigation = navigation.match(
    /\{\s*label:\s*"Assessments",[\s\S]*?section:\s*"management",\s*\}/,
  )?.[0];

  assert.ok(assessmentNavigation, "Assessment navigation item should exist");
  assert.match(assessmentNavigation, /href:\s*"\/admin\/assessments"/);
  assert.match(assessmentNavigation, /roles:\s*\[\s*"super_admin",?\s*\]/);
  assert.doesNotMatch(assessmentNavigation, /"admin"/);
});

test("assessment route rejects direct access by scoped Admin", () => {
  assert.match(assessmentLayout, /getCurrentAppUser\(\)/);
  assert.match(
    assessmentLayout,
    /currentUser\.role\s*!==\s*"super_admin"[\s\S]*redirect\("\/"\)/,
  );
});

test("certificates are prepared and printable while pending, then voided rows are excluded", () => {
  assert.match(page, /BulkGradeCertificatesPDF/);
  assert.match(page, /record_prepared_assessment_certificate_print/);
  assert.match(page, /candidate\.certificate_status !== "voided"/);
  assert.match(page, /They remain pending until all results are submitted/);
  assert.match(page, /Passing certificates are issued; failed certificates are voided/);
  assert.match(page, /pending-grading-certificates/);
});

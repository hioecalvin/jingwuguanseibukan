import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL(
    "../supabase/migrations/043_repair_memorial_and_prepared_assessment_runtime.sql",
    import.meta.url,
  ),
  "utf8",
);

test("repairs the unsupported UUID aggregate with a fail-closed definition guard", () => {
  assert.match(sql, /pg_get_functiondef\([\s\S]*publish_memorial_announcement/i);
  assert.match(sql, /function_definition not like '%min\(class_id\)%'/i);
  assert.match(sql, /min\(class_id::text\)::uuid/i);
  assert.match(sql, /Unexpected publish_memorial_announcement definition/i);
});

test("uses the live registration_number profile column for certificate snapshots", () => {
  assert.match(sql, /column_name = 'registration_number'/i);
  assert.match(sql, /profile\.registration_number::text as member_id/i);
  assert.match(sql, /Unexpected prepare_bulk_assessment member-ID lookup/i);
});

test("retains the existing browser and service-role boundaries", () => {
  assert.match(
    sql,
    /revoke all on function public\.publish_memorial_announcement[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.publish_memorial_announcement[\s\S]*to service_role/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.prepare_bulk_assessment[\s\S]*to authenticated, service_role/i,
  );
  assert.match(sql, /has_function_privilege[\s\S]*Repaired function ACL postflight failed/i);
});

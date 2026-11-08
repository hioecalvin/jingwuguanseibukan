import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/046_repair_last_training_audit_insert.sql",
  "utf8",
);

const auditInsert = /insert into public\.membership_training_session_audit\s*\(([\s\S]*?)\)\s*values\s*\(([\s\S]*?)\)/i.exec(
  migration,
);

test("migration 046 repairs the migration 045 audit insert forward-only", () => {
  assert.match(migration, /create or replace function public\.set_membership_last_training_session\(/i);
  assert.ok(auditInsert, "expected the repaired audit insert");
  assert.match(auditInsert[1], /new_training_date/i);
  assert.doesNotMatch(auditInsert[1], /effective_training_date/i);
  assert.match(auditInsert[2], /effective_training_date/i);
  assert.doesNotMatch(auditInsert[2], /\bnew_training_date\b/i);
});

test("migration 046 preserves authorization, locking, validation, and RPC ACLs", () => {
  assert.match(migration, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(migration, /for update of membership, profile/i);
  assert.match(migration, /public\.is_super_admin\(caller_id\)[\s\S]*public\.is_class_admin\(/i);
  assert.match(migration, /date_of_passing is not null/i);
  assert.match(migration, /status::text is distinct from 'active'/i);
  assert.match(migration, /effective_training_date > business_today/i);
  assert.match(migration, /effective_training_date < membership_record\.joined_date/i);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated/i);
  assert.match(migration, /notify pgrst, 'reload schema'/i);
});

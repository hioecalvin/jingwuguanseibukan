import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../supabase/migrations/053_repository_uploader_reappointment_idempotency.sql",
    import.meta.url,
  ),
  "utf8",
);

const functionBody = migration.match(
  /create or replace function public\.assign_repository_uploader\([\s\S]*?\$function\$;/i,
)?.[0] ?? "";

test("migration 053 repairs only the repository uploader appointment boundary", () => {
  assert.match(
    migration,
    /create or replace function public\.assign_repository_uploader\(/i,
  );
  assert.doesNotMatch(
    migration,
    /create or replace function public\.audit_repository_uploader_assignment\(/i,
  );
  assert.doesNotMatch(migration, /create (?:or replace )?trigger/i);
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
});

test("already-active uploader assignment is an idempotent provenance-preserving retry", () => {
  assert.match(
    functionBody,
    /insert into public\.repository_uploader_assignments as assignment[\s\S]*on conflict \(user_id, class_id\)[\s\S]*do update set[\s\S]*where assignment\.active = false;/i,
  );
  assert.doesNotMatch(
    functionBody,
    /where assignment\.active = true/i,
  );
});

test("new appointments and inactive reactivations retain actor metadata and auditing inputs", () => {
  assert.match(
    functionBody,
    /values \([\s\S]*target_user_id,[\s\S]*target_class_id,[\s\S]*true,[\s\S]*caller_id,[\s\S]*now\(\),[\s\S]*null,[\s\S]*null[\s\S]*\)/i,
  );
  assert.match(functionBody, /active = true/i);
  assert.match(functionBody, /assigned_by = excluded\.assigned_by/i);
  assert.match(functionBody, /assigned_at = excluded\.assigned_at/i);
  assert.match(functionBody, /revoked_by = null/i);
  assert.match(functionBody, /revoked_at = null/i);
  assert.match(
    migration,
    /audit_repository_uploader_assignment_trigger[\s\S]*trigger_record\.tgenabled in \('O', 'A'\)/i,
  );
});

test("migration 053 preserves Super Admin authorization and the RPC allowlist", () => {
  assert.match(functionBody, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(functionBody, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(functionBody, /public\.is_super_admin\(caller_id\)/i);
  assert.match(
    migration,
    /revoke all[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute[\s\S]*to authenticated, service_role/i,
  );
  assert.match(migration, /notify pgrst, 'reload schema'/i);
});

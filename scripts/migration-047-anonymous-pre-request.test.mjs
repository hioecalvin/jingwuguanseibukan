import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(
  new URL(
    "../supabase/migrations/047_repair_anonymous_pre_request_gate.sql",
    import.meta.url,
  ),
  "utf8",
);

const hook = /create or replace function public\.enforce_active_account_request\(\)[\s\S]*?\$\$;/i.exec(
  sql,
)?.[0] ?? "";

test("migration 047 exits anonymous PostgREST requests before the protected helper", () => {
  assert.match(hook, /security invoker/i);
  assert.match(hook, /set search_path = public, pg_temp/i);

  const earlyReturn = hook.search(
    /coalesce\(auth\.role\(\), ''\) <> 'authenticated'[\s\S]*?return;/i,
  );
  const helperCall = hook.search(/public\.is_active_app_user\(auth\.uid\(\)\)/i);

  assert.ok(earlyReturn >= 0, "expected a non-authenticated early return");
  assert.ok(helperCall > earlyReturn, "helper must run only after the early return");
  assert.match(hook, /errcode = '42501'[\s\S]*message = 'Account access is disabled'/i);
});

test("migration 047 preserves least-privilege helper and hook ACLs", () => {
  assert.match(
    sql,
    /revoke execute on function public\.is_active_app_user\(uuid\)[\s\S]*?from public, anon/i,
  );
  const helperGrant = /grant execute on function public\.is_active_app_user\(uuid\)\s*to\s+([^;]+);/i.exec(
    sql,
  );
  assert.ok(helperGrant, "expected an explicit helper grant");
  assert.deepEqual(
    helperGrant[1].split(",").map((role) => role.trim().toLowerCase()).sort(),
    ["authenticated", "service_role"],
  );
  assert.match(
    sql,
    /grant execute on function public\.enforce_active_account_request\(\)[\s\S]*?to anon, authenticated, service_role/i,
  );
});

test("migration 047 preserves the authenticator hook and verifies its security contract", () => {
  assert.match(
    sql,
    /alter role authenticator[\s\S]*?pgrst\.db_pre_request = 'public\.enforce_active_account_request'/i,
  );
  assert.match(sql, /pg_db_role_setting/i);
  assert.match(sql, /has_function_privilege\([\s\S]*?'anon'[\s\S]*?'public\.is_active_app_user\(uuid\)'/i);
  assert.match(sql, /notify pgrst, 'reload schema'/i);
  assert.match(sql, /notify pgrst, 'reload config'/i);
});

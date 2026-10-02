import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/migrations/052_repository_uploader_permissions.sql", import.meta.url), "utf8");
const content = await readFile(new URL("../app/admin/content/page.tsx", import.meta.url), "utf8");
const appointments = await readFile(new URL("../app/admin/repository-uploaders/page.tsx", import.meta.url), "utf8");
const navigation = await readFile(new URL("../lib/navigation.ts", import.meta.url), "utf8");

test("repository uploader is a private audited class-scoped appointment", () => {
  assert.match(sql, /create table public\.repository_uploader_assignments/i);
  assert.match(sql, /unique \(user_id, class_id\)/i);
  assert.match(sql, /create table public\.repository_uploader_assignment_audit/i);
  assert.match(sql, /force row level security/gi);
  assert.match(sql, /revoke all on table[\s\S]*repository_uploader_assignments[\s\S]*from public, anon, authenticated/i);
});

test("only active Super Admin appoints or revokes uploaders", () => {
  for (const name of ["assign_repository_uploader", "revoke_repository_uploader", "get_repository_uploader_candidates", "get_repository_uploader_options"]) {
    const body = sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$function\\$;`, "i"))?.[0] ?? "";
    assert.match(body, /public\.is_active_app_user\(caller_id\)/i);
    assert.match(body, /public\.is_super_admin\(caller_id\)/i);
  }
  assert.match(sql, /class_record\.id = target_class_id[\s\S]*class_record\.is_active = true/i);
});

test("content writes and draft reads require uploader permission, not admin permission", () => {
  for (const name of ["create_repository_content", "update_repository_content", "delete_repository_content"]) {
    const body = sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$function\\$;`, "i"))?.[0] ?? "";
    assert.match(body, /public\.is_repository_uploader\(/i);
    assert.doesNotMatch(body, /can_manage_class|is_class_admin|can_manage_dojo/i);
  }
  assert.match(sql, /drop policy if exists "repository managers read all content"/i);
  assert.match(sql, /create policy "repository uploaders read all class content"[\s\S]*is_repository_uploader/i);
});

test("appointed non-Admin members receive a common uploader route and scoped source", () => {
  assert.match(content, /\.rpc\(\s*"get_my_repository_upload_scopes"/);
  assert.match(content, /id:\s*scope\.class_id/);
  assert.match(content, /name:\s*scope\.class_name/);
  assert.doesNotMatch(content, /\.from\("classes"\)[\s\S]*setClasses/);
  assert.match(navigation, /label: "Repository Upload"[\s\S]*href: "\/repository\/upload"[\s\S]*"member"/);
  assert.match(navigation, /label: "Repository Upload"[\s\S]*requiresRepositoryUpload:\s*true/);
  assert.match(appointments, /assign_repository_uploader/);
  assert.match(appointments, /revoke_repository_uploader/);
  assert.match(navigation, /label: "Repository Uploaders"[\s\S]*"super_admin"/);
});

test("browser writes remain RPC-only", () => {
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete)[\s\S]*public\.content[\s\S]*to authenticated/i);
  assert.match(sql, /has_table_privilege\('authenticated', 'public\.content', 'INSERT'\)/i);
  assert.match(sql, /has_function_privilege\('anon', 'public\.is_repository_uploader\(uuid,uuid\)', 'EXECUTE'\)/i);
});

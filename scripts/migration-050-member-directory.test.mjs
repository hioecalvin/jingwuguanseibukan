import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../supabase/migrations/050_member_directory_privacy.sql",
    import.meta.url,
  ),
  "utf8",
);
const page = await readFile(
  new URL(
    "../app/(member)/directory/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const navigation = await readFile(
  new URL(
    "../lib/navigation.ts",
    import.meta.url,
  ),
  "utf8",
);

test("directory RPC returns only the approved narrow projection", () => {
  const signature = migration.match(
    /create or replace function public\.get_my_member_directory\(\)[\s\S]*?language plpgsql/i,
  )?.[0] ?? "";
  for (const field of [
    "class_name text",
    "full_name text",
    "avatar_url text",
    "current_rank text",
    "home_dojo text",
    "instagram_username text",
  ]) {
    assert.match(signature, new RegExp(field, "i"));
  }
  assert.doesNotMatch(signature, /(?:email|phone|date_of_birth|registration_number|membership_status|attendance|payment)/i);
  assert.match(migration, /result_columns is distinct from array[\s\S]*'class_name'[\s\S]*'instagram_username'/i);
});

test("directory membership is same-class, cross-dojo and excludes inactive/deceased accounts", () => {
  assert.match(migration, /public\.is_active_app_user\(caller_id\)/i);
  assert.match(migration, /caller_membership\.class_id = membership\.class_id/i);
  assert.doesNotMatch(migration, /caller_membership\.dojo_id\s*=\s*membership\.dojo_id/i);
  assert.match(migration, /membership\.status::text in \('active', 'break', 'break_1', 'break_2'\)/i);
  assert.match(migration, /profile\.account_status::text = 'active'/i);
  assert.match(migration, /profile\.date_of_passing is null/i);
  assert.match(migration, /class_data\.is_active = true/i);
});

test("directory is RPC-only and available to every signed-in application role", () => {
  assert.match(migration, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(migration, /revoke all[\s\S]*get_my_member_directory\(\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]*get_my_member_directory\(\)[\s\S]*to authenticated, service_role/i);
  assert.match(page, /\.rpc\(\s*"get_my_member_directory"/);
  assert.match(navigation, /label: "Directory"[\s\S]*href: "\/directory"[\s\S]*"member"[\s\S]*"admin"[\s\S]*"super_admin"/);
});

test("directory UI displays only class, photo, name, rank, dojo and optional Instagram", () => {
  assert.match(page, /member\.avatar_url/);
  assert.match(page, /member\.full_name/);
  assert.match(page, /member\.current_rank/);
  assert.match(page, /member\.home_dojo/);
  assert.match(page, /member\.instagram_username/);
  assert.match(page, /member\.class_name/);
  assert.doesNotMatch(page, /member\.(?:email|phone|date_of_birth|registration_number|membership_status|payment|attendance)/);
});

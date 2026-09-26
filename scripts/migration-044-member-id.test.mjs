import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  "supabase/migrations/044_assign_member_id_on_approval.sql",
  "utf8",
);
const register = fs.readFileSync("app/register/page.tsx", "utf8");
const applications = fs.readFileSync("app/admin/applications/page.tsx", "utf8");
const applicationsLayout = fs.readFileSync("app/admin/applications/layout.tsx", "utf8");
const navigation = fs.readFileSync("lib/navigation.ts", "utf8");

test("approval seeds a private JS Member ID sequence above existing numeric IDs", () => {
  assert.match(sql, /create sequence public\.js_member_id_seq[\s\S]*no cycle/i);
  assert.match(sql, /max\(profile\.registration_number::bigint\)[\s\S]*\^\[0-9\]\{1,18\}\$/i);
  assert.match(sql, /setval\([\s\S]*js_member_id_seq[\s\S]*highest_numeric_js_member_id[\s\S]*true/i);
  assert.match(sql, /revoke all on sequence public\.js_member_id_seq[\s\S]*authenticated, service_role/i);
});

test("Super Admin approval assigns a minimum-four-digit ID without truncation or overwrite", () => {
  assert.match(sql, /if not public\.is_super_admin\(\) then[\s\S]*Super Admin only/i);
  assert.doesNotMatch(sql, /public\.is_class_admin\(/i);
  assert.match(sql, /from public\.class_requests[\s\S]*for update/i);
  assert.match(sql, /from public\.profiles[\s\S]*for update/i);
  assert.match(sql, /generated_member_id := nullif\(btrim\(profile_record\.registration_number\), ''\)/i);
  assert.match(sql, /if generated_member_id is null then[\s\S]*generated_member_id := pg_catalog\.nextval\([\s\S]*::text/i);
  assert.match(sql, /if pg_catalog\.length\(generated_member_id\) < 4 then[\s\S]*lpad\([\s\S]*generated_member_id,[\s\S]*4,[\s\S]*'0'/i);
  assert.match(sql, /registration_number = generated_member_id/i);
  assert.match(sql, /'member_id',[\s\S]*profile_record\.registration_number/i);
});

test("the legacy approval RPC delegates to the same atomic ID-assignment boundary", () => {
  assert.match(sql, /create or replace function public\.review_class_request\([\s\S]*perform public\.review_class_request_with_level\(/i);
  assert.match(sql, /grant execute on function public\.review_class_request\([\s\S]*to authenticated, service_role/i);
});

test("applicants may provide Aikikai ID while JS Member ID approval remains Super-Admin-only", () => {
  assert.match(register, /register-aikikai-registration-number/);
  assert.match(register, /aikikai_registration_number:\s*normalizedAikikaiRegistrationNumber/);
  assert.doesNotMatch(register, /registration_number:\s*normalizedMemberId/);
  assert.match(register, /JS\s*Member ID[\s\S]*assigned automatically after approval/i);
  assert.match(applications, /JS Member ID is assigned automatically/i);
  assert.match(applications, /label="Aikikai Registration Number"/i);
  assert.match(applicationsLayout, /currentUser\.role !== "super_admin"[\s\S]*redirect\("\/"\)/i);
  assert.match(navigation, /label: "Applications"[\s\S]*roles:\s*\[\s*"super_admin",?\s*\]/i);
});

test("signup trigger retains an optional Aikikai number without assigning a JS ID", () => {
  assert.match(sql, /create or replace function public\.handle_new_user\(\)/i);
  assert.match(sql, /insert into public\.profiles[\s\S]*aikikai_registration_number[\s\S]*normalized_aikikai_registration_number/i);
  assert.match(sql, /create or replace view public\.admin_visible_requests[\s\S]*profile_record\.aikikai_registration_number/i);
  assert.doesNotMatch(sql, /Aikikai Registration Number is required/i);
  assert.match(sql, /Application-review view security postflight failed/i);
  assert.match(sql, /Signup or JS Member ID ACL postflight failed/i);
});

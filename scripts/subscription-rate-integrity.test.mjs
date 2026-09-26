import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const migration = source(
  "supabase/migrations/030_preserve_subscription_rate_intervals.sql",
);
const subscriptionsPage = source("app/admin/subscriptions/page.tsx");

test("bounded member-rate edits preserve both sides of an existing interval", () => {
  assert.match(
    migration,
    /effective_until\s*=\s*start_date_value\s*-\s*1/is,
  );
  assert.match(
    migration,
    /end_date_value\s*\+\s*1[\s\S]*existing_record\.effective_until/is,
  );
  assert.match(
    migration,
    /elsif\s+end_date_value is not null[\s\S]*set effective_from\s*=\s*end_date_value\s*\+\s*1/is,
  );
  assert.match(
    migration,
    /from public\.class_memberships cm[\s\S]*for update/is,
  );
});

test("dojo scheduling preserves a baseline and retains the latest dated setting", () => {
  assert.match(
    migration,
    /Older installations may have a settings row with no matching baseline[\s\S]*insert into public\.dojo_subscription_rate_history/is,
  );
  assert.match(
    migration,
    /order by h\.effective_from desc, h\.changed_at desc, h\.id desc[\s\S]*insert into public\.dojo_subscription_settings/is,
  );
  assert.match(
    migration,
    /h\.effective_from > effective_date_value[\s\S]*h\.old_fee is not null/is,
  );
  assert.match(
    migration,
    /where h\.dojo_id = target_dojo_id[\s\S]*h\.effective_from = effective_date_value[\s\S]*order by h\.changed_at desc, h\.id desc[\s\S]*limit 1[\s\S]*effective_rate\.new_fee is not distinct from new_fee/is,
  );
  assert.doesNotMatch(
    migration,
    /if exists \([\s\S]*h\.effective_from = effective_date_value[\s\S]*h\.new_fee is not distinct from new_fee/is,
  );
  assert.match(
    migration,
    /greatest\(\s*clock_timestamp\(\),[\s\S]*max\(h\.changed_at\) \+ interval '1 microsecond'[\s\S]*into change_timestamp/is,
  );
  assert.match(
    migration,
    /effective_date_value, auth\.uid\(\), change_timestamp/is,
  );
});

test("subscription RPCs retain hardened execution boundaries", () => {
  for (const signature of [
    "set_dojo_subscription_rate\\(uuid, numeric, date, text\\)",
    "set_member_subscription_rate\\(uuid, numeric, date, date, text, text\\)",
    "remove_member_subscription_rate\\(uuid\\)",
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${signature} from public, anon`, "i"),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${signature} to authenticated, service_role`, "i"),
    );
  }

  assert.match(
    migration,
    /revoke all on function public\.get_membership_subscription_rate\(uuid, date\) from public, anon, authenticated/i,
  );
});

test("Admin selection ignores expired rows and deterministically prefers current then nearest future", () => {
  assert.match(
    subscriptionsPage,
    /override\.effective_until ===\s*null \|\|\s*override\.effective_until >=\s*today/s,
  );
  assert.match(
    subscriptionsPage,
    /leftIsCurrent !==\s*rightIsCurrent[\s\S]*leftIsCurrent\s*\? -1\s*:\s*1/s,
  );
  assert.match(
    subscriptionsPage,
    /return leftIsCurrent\s*\? -dateOrder\s*:\s*dateOrder/s,
  );
  assert.match(
    subscriptionsPage,
    /return left\.id\.localeCompare\(\s*right\.id\s*\)/s,
  );
});

test("Admin removal copy describes the actual end-of-today behavior", () => {
  assert.match(subscriptionsPage, /remains valid through today/);
  assert.match(subscriptionsPage, /dojo default rate applies from tomorrow/);
  assert.match(subscriptionsPage, />\s*End \/ Cancel\s*</);
  assert.doesNotMatch(subscriptionsPage, /special rate was removed/);
});

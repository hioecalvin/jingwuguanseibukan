import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const memberPage = await readFile(
  new URL("../app/(member)/schedules/page.tsx", import.meta.url),
  "utf8",
);
const adminPage = await readFile(
  new URL("../app/admin/schedules/page.tsx", import.meta.url),
  "utf8",
);
const navigation = await readFile(
  new URL("../lib/navigation.ts", import.meta.url),
  "utf8",
);

test("members can browse the same regular schedule source by dojo or class", () => {
  assert.match(memberPage, /get_regular_class_schedules/);
  assert.match(memberPage, /By \{option\}/);
  assert.match(memberPage, /view === "dojo"/);
  assert.match(memberPage, /view === "class"/);
  assert.match(memberPage, /These timetable[\s\S]*do not create events or attendance/i);
});

test("admins maintain only RPC-provided scopes with an existing-member instructor picker", () => {
  assert.match(adminPage, /get_manageable_schedule_scopes/);
  assert.match(adminPage, /get_schedule_instructor_options/);
  assert.match(adminPage, /upsert_regular_class_schedule/);
  assert.match(adminPage, /include_inactive: true/);
  assert.match(adminPage, /Inactive rows remain here for history/i);
  assert.doesNotMatch(adminPage, /\.from\(\s*["']regular_class_schedules/);
});

test("schedule routes are available to members and administrators", () => {
  assert.match(navigation, /label: "Schedules"[\s\S]*href: "\/schedules"[\s\S]*"member"[\s\S]*"admin"[\s\S]*"super_admin"/);
  assert.match(navigation, /label: "Manage Schedules"[\s\S]*href: "\/admin\/schedules"[\s\S]*"admin"[\s\S]*"super_admin"/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("Super Admin deceased-member UI keeps the API and memorial settings contracts wired", () => {
  const members = source("app/admin/members/page.tsx");
  const panel = source("app/admin/members/DeceasedMemorialPanel.tsx");

  assert.match(members, /"get_member_memorial_settings"/);
  assert.match(members, /target_user_id:\s*member\.user_id/);
  assert.match(members, /postMemorialRequest\("\/api\/admin\/members\/deceased"/);
  assert.match(
    members,
    /postMemorialRequest\("\/api\/admin\/members\/deceased\/memorial"/,
  );
  assert.match(members, /Authorization:\s*`Bearer \$\{accessToken\}`/);
  assert.match(members, /statusFilter === "deceased"/);
  assert.match(members, /Deceased is not\s+Inactive or Terminated/);

  for (const field of [
    "dateOfPassing",
    "recipientClassIds",
    "remembranceEnabled",
    "remembranceMessage",
    "heavenlyBirthdayEnabled",
    "heavenlyBirthdayMessage",
  ]) {
    assert.match(members, new RegExp(`${field}:`));
  }

  assert.match(panel, /Date of Passing/);
  assert.match(panel, /Recipient classes/);
  assert.match(panel, /Remembrance Day/);
  assert.match(panel, /Heavenly Birthday/);
  assert.match(panel, /Publish Initial Memorial/);
  assert.match(panel, /aria-expanded=\{open\}/);
  assert.match(panel, /<fieldset/);
});

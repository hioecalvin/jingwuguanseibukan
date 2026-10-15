import assert from "node:assert/strict";
import test from "node:test";

import { loadRoute } from "./load-route-test.mjs";

const { renderEmail } = loadRoute("lib/email/render-email.ts");

test("member activation renders an escaped HTTPS link", () => {
  const html = renderEmail("member_approved", {
    member_name: "Member",
    member_id: "1001",
    activation_url: "https://app.example.org/activate?member=1&source=email",
  });
  assert.match(html, /href="https:\/\/app\.example\.org\/activate\?member=1&amp;source=email"/);
});

test("member activation omits executable and malformed URL schemes", () => {
  for (const activation_url of [
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "not a URL",
  ]) {
    const html = renderEmail("member_approved", {
      member_name: "Member",
      member_id: "1001",
      activation_url,
    });
    assert.doesNotMatch(html, /Activate Account/);
    assert.doesNotMatch(html, /javascript:|data:text/i);
  }
});

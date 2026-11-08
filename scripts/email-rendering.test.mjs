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

test('member claim email preserves fragment proof and explains Dojo approval', () => {
  const html=renderEmail('member_claim_verification',{verification_url:'https://app.example.org/claim-id/verify#claim=example&token=opaque'});
  assert.match(html,/href="https:\/\/app\.example\.org\/claim-id\/verify#claim=example&amp;token=opaque"/);
  assert.match(html,/Dojo Admin/); assert.match(html,/24 hours/);
});
test('member claim email rejects executable links and has a usable fallback', () => {
  for(const verification_url of ['javascript:alert(1)','data:text/html,unsafe','not a URL']) {
    const html=renderEmail('member_claim_verification',{verification_url});
    assert.doesNotMatch(html,/href=/);assert.match(html,/request a new verification link/);
  }
});


test('member claim setup email has an HTTPS action and no plaintext password',()=>{
 const html=renderEmail('member_claim_setup',{setup_url:'https://app.example.org/claim-id/setup#claim=id&token=opaque',password:'must-not-render'});
 assert.match(html,/href="https:\/\/app\.example\.org\/claim-id\/setup#claim=id&amp;token=opaque"/);
 assert.doesNotMatch(html,/must-not-render/);assert.match(html,/24 hours/);
});
test('member claim setup email rejects executable links',()=>{
 const html=renderEmail('member_claim_setup',{setup_url:'javascript:alert(1)'});
 assert.doesNotMatch(html,/href=/);assert.match(html,/contact your Dojo Admin/);
});

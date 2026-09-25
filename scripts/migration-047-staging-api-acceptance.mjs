import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const expectedRef = "eomubndonbetszdbhsrj";
const expectedOrigin = `https://${expectedRef}.supabase.co`;

assert.equal(process.env.CONFIRM_STAGING, expectedRef, "exact staging confirmation is required");
assert.equal(process.env.STAGING_PROJECT_REF, expectedRef, "staging project ref mismatch");

const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
assert.equal(origin.origin, expectedOrigin, "Supabase origin mismatch");
assert.equal(origin.pathname, "/", "Supabase URL must be an origin");

const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
assert.ok(publishableKey, "staging publishable key is required");
assert.ok(secretKey, "staging secret key is required");
assert.notEqual(publishableKey, secretKey, "browser and server keys must differ");

function headers(key) {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
}

async function request(path, key, init = {}) {
  return fetch(new URL(path, origin), {
    redirect: "error",
    ...init,
    headers: { ...headers(key), ...(init.headers ?? {}) },
  });
}

async function jsonArray(path) {
  const response = await request(path, publishableKey);
  assert.equal(response.status, 200, `${path} must return 200`);
  const value = await response.json();
  assert.ok(Array.isArray(value), `${path} must return an array`);
  return value;
}

const activeClasses = await jsonArray(
  "/rest/v1/classes?select=id,is_active&order=name.asc",
);
assert.ok(activeClasses.length > 0, "active class catalog must not be empty");
assert.ok(activeClasses.every((item) => item.is_active === true), "class catalog leaked an inactive row");

const inactiveClasses = await jsonArray(
  "/rest/v1/classes?select=id,is_active&is_active=eq.false",
);
assert.equal(inactiveClasses.length, 0, "anonymous caller can read inactive classes");

const activeDojos = await jsonArray(
  "/rest/v1/dojos?select=id,active&active=eq.true&order=name.asc",
);
assert.ok(activeDojos.length > 0, "active dojo catalog must not be empty");
assert.ok(activeDojos.every((item) => item.active === true), "dojo catalog leaked an inactive row");

const inactiveDojos = await jsonArray(
  "/rest/v1/dojos?select=id,active&active=eq.false",
);
assert.equal(inactiveDojos.length, 0, "anonymous caller can read inactive dojos");

const anonymousHelper = await request(
  "/rest/v1/rpc/is_active_app_user",
  publishableKey,
  { method: "POST", body: JSON.stringify({ target_user_id: randomUUID() }) },
);
assert.ok(
  [401, 403, 404].includes(anonymousHelper.status),
  "anonymous caller can execute the protected active-user helper",
);

const anonymousWrapper = await request(
  "/rest/v1/rpc/enforce_active_account_request",
  publishableKey,
  { method: "POST", body: "{}" },
);
assert.ok(
  [200, 204].includes(anonymousWrapper.status),
  "anonymous pre-request wrapper did not return safely",
);

for (const relation of [
  "profiles",
  "admin_visible_members",
  "class_memberships",
  "email_outbox",
  "member_memorial_settings",
  "membership_training_session_audit",
]) {
  const response = await request(
    `/rest/v1/${relation}?select=*&limit=1`,
    publishableKey,
  );
  assert.ok(
    [401, 403, 404].includes(response.status),
    `anonymous caller unexpectedly read ${relation}`,
  );
}

const serviceWrapper = await request(
  "/rest/v1/rpc/enforce_active_account_request",
  secretKey,
  { method: "POST", body: "{}" },
);
assert.ok([200, 204].includes(serviceWrapper.status), "service-role wrapper call failed");

const serviceHelper = await request(
  "/rest/v1/rpc/is_active_app_user",
  secretKey,
  { method: "POST", body: JSON.stringify({ target_user_id: randomUUID() }) },
);
assert.equal(serviceHelper.status, 200, "service-role helper call failed");
assert.equal(await serviceHelper.json(), false, "unknown service-role target was reported active");

console.log(
  JSON.stringify(
    {
      ready: true,
      checks: {
        activeClasses: activeClasses.length,
        activeDojos: activeDojos.length,
        inactiveCatalogRowsVisible: 0,
        anonymousHelperDenied: true,
        anonymousSensitiveRelationsDenied: 6,
        anonymousWrapperSafe: true,
        serviceBoundaryPassed: true,
      },
    },
    null,
    2,
  ),
);

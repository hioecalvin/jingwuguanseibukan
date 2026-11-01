import assert from "node:assert/strict";
import test from "node:test";

import { loadRoute, nextServer } from "./load-route-test.mjs";

const CALLER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

function resetRoute(overrides = {}) {
  const state = {
    callerProfile: { id: CALLER_ID, full_name: "Super Admin", is_super_admin: true },
    callerAssignments: [],
    resetRequest: {
      id: REQUEST_ID,
      user_id: MEMBER_ID,
      status: "approved",
      reviewed_by: CALLER_ID,
      reviewed_at: "2026-09-30T00:00:00.000Z",
      password_reset_at: null,
    },
    targetMemberships: [],
    memberProfile: {
      id: MEMBER_ID,
      registration_number: "0101",
      full_name: "Member Fixture",
      email: " Member@Example.Invalid ",
    },
    existingEmail: null,
    recoveredEmail: null,
    queueError: null,
    markErrors: [],
    ...overrides,
  };
  const calls = [];
  let emailOutboxReads = 0;

  function resultFor(table, filters, terminal) {
    const id = filters.find(([column]) => column === "id")?.[1];
    if (table === "profiles") {
      return { data: id === CALLER_ID ? state.callerProfile : state.memberProfile, error: null };
    }
    if (table === "dojo_admin_assignments") {
      return { data: state.callerAssignments, error: null };
    }
    if (table === "password_reset_requests") {
      return { data: state.resetRequest, error: null };
    }
    if (table === "class_memberships") {
      return { data: state.targetMemberships, error: null };
    }
    if (table === "email_outbox") {
      emailOutboxReads += 1;
      return {
        data: emailOutboxReads === 1 ? state.existingEmail : state.recoveredEmail,
        error: null,
      };
    }
    throw new Error(`Unexpected table ${table} (${terminal})`);
  }

  function query(table) {
    const filters = [];
    const builder = {
      select() { return builder; },
      eq(column, value) { filters.push([column, value]); return builder; },
      maybeSingle() {
        calls.push({ kind: "read", table, filters: [...filters], terminal: "maybeSingle" });
        return Promise.resolve(resultFor(table, filters, "maybeSingle"));
      },
      then(resolve, reject) {
        calls.push({ kind: "read", table, filters: [...filters], terminal: "many" });
        return Promise.resolve(resultFor(table, filters, "many")).then(resolve, reject);
      },
    };
    return builder;
  }

  const admin = {
    from(table) { return query(table); },
    auth: {
      admin: {
        async updateUserById(userId, attributes) {
          calls.push({ kind: "update-password", userId, attributes });
          return { error: null };
        },
      },
    },
    async rpc(name, args) {
      calls.push({ kind: "rpc", name, args });
      if (name === "queue_email") {
        return { data: state.queueError ? null : "44444444-4444-4444-8444-444444444444", error: state.queueError };
      }
      if (name === "mark_password_reset_applied") {
        return { data: null, error: state.markErrors.shift() ?? null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };

  const route = loadRoute("app/api/admin/password-reset/[requestId]/apply/route.ts", {
    "next/server": nextServer,
    "node:crypto": { randomInt: (minimum) => minimum },
    "@supabase/supabase-js": {
      createClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: CALLER_ID } }, error: null }),
        },
      }),
    },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
  }, {
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.invalid",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-public-key",
  });

  return {
    calls,
    logs: route.logs,
    async run({ authorization = "Bearer fixture-token", requestId = REQUEST_ID } = {}) {
      const headers = authorization === null ? {} : { authorization };
      return route.POST(
        new Request("https://app.example.invalid/api/admin/password-reset/apply", { method: "POST", headers }),
        { params: Promise.resolve({ requestId }) },
      );
    },
  };
}

test("password reset apply rejects unauthenticated requests before privileged work", async () => {
  const fixture = resetRoute();
  const response = await fixture.run({ authorization: null });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Not authenticated." });
  assert.deepEqual(fixture.calls, []);
});

test("scoped Admin cannot reset a Member outside the Admin's current scope", async () => {
  const fixture = resetRoute({
    callerProfile: { id: CALLER_ID, full_name: "Scoped Admin", is_super_admin: false },
    callerAssignments: [{ class_id: "class-a", dojo_id: null }],
    targetMemberships: [{ class_id: "class-b", dojo_id: "dojo-b" }],
  });
  const response = await fixture.run();

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "You are not authorised to apply this password reset." });
  assert.equal(fixture.calls.some(({ kind }) => kind === "update-password"), false);
  assert.equal(fixture.calls.some(({ kind }) => kind === "rpc"), false);
});

test("successful reset keeps the temporary password out of the response and logs", async () => {
  const fixture = resetRoute();
  const response = await fixture.run();
  const body = await response.json();
  const passwordCall = fixture.calls.find(({ kind }) => kind === "update-password");
  const queueCall = fixture.calls.find(({ name }) => name === "queue_email");
  const temporaryPassword = passwordCall.attributes.password;

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.alreadyApplied, false);
  assert.equal(body.mustChangePassword, true);
  assert.equal(passwordCall.userId, MEMBER_ID);
  assert.equal(temporaryPassword.length, 16);
  assert.match(temporaryPassword, /[A-Z]/);
  assert.match(temporaryPassword, /[a-z]/);
  assert.match(temporaryPassword, /[0-9]/);
  assert.match(temporaryPassword, /[!@#$%*_\-]/);
  assert.equal(queueCall.args.target_email, "member@example.invalid");
  assert.equal(queueCall.args.target_template_data.temporary_password, temporaryPassword);
  assert.equal(queueCall.args.target_dedupe_key, `password-reset-approved:${REQUEST_ID}`);
  assert.equal(JSON.stringify(body).includes(temporaryPassword), false);
  assert.equal(JSON.stringify(fixture.logs).includes(temporaryPassword), false);
  assert.equal(fixture.calls.filter(({ name }) => name === "mark_password_reset_applied").length, 1);
});

test("an existing queued email makes retry idempotent and repairs the applied mark", async () => {
  const fixture = resetRoute({
    existingEmail: { id: "existing-email", status: "pending", sent_at: null },
    resetRequest: {
      id: REQUEST_ID,
      user_id: MEMBER_ID,
      status: "approved",
      reviewed_by: CALLER_ID,
      reviewed_at: "2026-09-30T00:00:00.000Z",
      password_reset_at: null,
    },
  });
  const response = await fixture.run();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.alreadyApplied, true);
  assert.equal(body.emailQueued, true);
  assert.equal(body.emailSent, false);
  assert.equal(fixture.calls.some(({ kind }) => kind === "update-password"), false);
  assert.equal(fixture.calls.some(({ name }) => name === "queue_email"), false);
  assert.equal(fixture.calls.filter(({ name }) => name === "mark_password_reset_applied").length, 1);
});

test("a lost queue response recovers by dedupe key and completes the reset mark", async () => {
  const fixture = resetRoute({
    queueError: { message: "synthetic lost response" },
    recoveredEmail: { id: "recovered-email" },
  });
  const response = await fixture.run();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.emailId, "recovered-email");
  assert.equal(fixture.calls.filter(({ name }) => name === "queue_email").length, 1);
  assert.equal(fixture.calls.filter(({ name }) => name === "mark_password_reset_applied").length, 1);
  assert.equal(JSON.stringify(body).includes("synthetic lost response"), false);
});

test("mark failure is sanitized and a later existing-email retry repairs only the mark", async () => {
  const first = resetRoute({ markErrors: [{ message: "private mark failure" }] });
  const firstResponse = await first.run();
  const firstBody = await firstResponse.json();

  assert.equal(firstResponse.status, 500);
  assert.match(firstBody.error, /could not be finalised/i);
  assert.doesNotMatch(JSON.stringify(firstBody), /private mark failure/i);
  assert.equal(first.calls.filter(({ kind }) => kind === "update-password").length, 1);
  assert.equal(first.calls.filter(({ name }) => name === "queue_email").length, 1);

  const retry = resetRoute({
    existingEmail: { id: "existing-email", status: "pending", sent_at: null },
  });
  const retryResponse = await retry.run();

  assert.equal(retryResponse.status, 200);
  assert.equal((await retryResponse.json()).alreadyApplied, true);
  assert.equal(retry.calls.some(({ kind }) => kind === "update-password"), false);
  assert.equal(retry.calls.some(({ name }) => name === "queue_email"), false);
  assert.equal(retry.calls.filter(({ name }) => name === "mark_password_reset_applied").length, 1);
});

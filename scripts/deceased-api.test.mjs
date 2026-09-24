import assert from "node:assert/strict";
import test from "node:test";

import { loadRoute, nextServer } from "./load-route-test.mjs";

const adminId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const classId = "33333333-3333-4333-8333-333333333333";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://unit.supabase.invalid",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "unit-public-key",
};
const plain = (value) => JSON.parse(JSON.stringify(value));

function deceasedRoute({
  authenticated = true,
  superAdmin = true,
  rpcError = null,
  authUpdateError = null,
} = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async (token) => {
        calls.push({ name: "getUser", token });
        return {
          data: { user: authenticated ? { id: adminId } : null },
          error: authenticated ? null : { message: "private auth detail" },
        };
      },
    },
    from: (table) => ({
      select: (selection) => ({
        eq: (column, value) => ({
          maybeSingle: async () => {
            calls.push({ name: "profile", table, selection, column, value });
            return {
              data: {
                is_super_admin: superAdmin,
                account_status: "active",
              },
              error: null,
            };
          },
        }),
      }),
    }),
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: { user_id: memberId }, error: rpcError };
    },
  };
  const admin = {
    auth: {
      admin: {
        updateUserById: async (id, attributes) => {
          calls.push({ name: "updateUserById", id, attributes });
          return { error: authUpdateError };
        },
      },
    },
  };

  const route = loadRoute(
    "app/api/admin/members/deceased/route.ts",
    {
      "next/server": nextServer,
      "@supabase/supabase-js": {
        createClient: () => client,
      },
      "@/lib/supabase/admin": {
        createAdminClient: () => admin,
      },
    },
    env,
  );

  const body = {
    targetUserId: memberId,
    dateOfPassing: "2020-05-01",
    recipientClassIds: [classId, classId],
    remembranceEnabled: true,
    heavenlyBirthdayEnabled: true,
    remembranceMessage: "We remember.",
    heavenlyBirthdayMessage: "Heavenly birthday.",
  };

  return {
    ...route,
    calls,
    run: (overrides = {}, token = "unit-token") =>
      route.POST(
        new Request("http://localhost/api/admin/members/deceased", {
          method: "POST",
          headers: {
            authorization: token ? `Bearer ${token}` : "",
            "content-type": "application/json",
          },
          body: JSON.stringify({ ...body, ...overrides }),
        }),
      ),
  };
}

test("deceased-member updates require authentication and active Super Admin access", async () => {
  const unauthenticated = deceasedRoute({ authenticated: false });
  assert.equal((await unauthenticated.run()).status, 401);
  assert.equal(
    unauthenticated.calls.some((call) => call.name === "set_member_deceased"),
    false,
  );

  const scopedAdmin = deceasedRoute({ superAdmin: false });
  assert.equal((await scopedAdmin.run()).status, 403);
  assert.equal(
    scopedAdmin.calls.some((call) => call.name === "set_member_deceased"),
    false,
  );
});

test("deceased-member updates validate before database or Auth mutations", async () => {
  const route = deceasedRoute();
  for (const overrides of [
    { targetUserId: "invalid" },
    { dateOfPassing: "2026-02-30" },
    { recipientClassIds: [] },
    { remembranceEnabled: "yes" },
    { remembranceMessage: "" },
  ]) {
    assert.equal((await route.run(overrides)).status, 400);
  }
  assert.deepEqual(route.calls, []);
});

test("deceased-member update deduplicates classes, saves first, then disables future sign-in", async () => {
  const route = deceasedRoute();
  const response = await route.run();
  assert.equal(response.status, 200);

  const rpc = route.calls.find((call) => call.name === "set_member_deceased");
  assert.deepEqual(plain(rpc.args), {
    target_user_id: memberId,
    target_date_of_passing: "2020-05-01",
    target_recipient_class_ids: [classId],
    target_remembrance_enabled: true,
    target_heavenly_birthday_enabled: true,
    target_remembrance_message: "We remember.",
    target_heavenly_birthday_message: "Heavenly birthday.",
  });
  const update = route.calls.find((call) => call.name === "updateUserById");
  assert.deepEqual(plain(update), {
    name: "updateUserById",
    id: memberId,
    attributes: { ban_duration: "876000h" },
  });
  assert.ok(route.calls.indexOf(rpc) < route.calls.indexOf(update));
});

test("reversal restores future sign-in and remains an explicit null-date operation", async () => {
  const route = deceasedRoute();
  const response = await route.run({
    dateOfPassing: null,
    recipientClassIds: [],
    remembranceEnabled: false,
    heavenlyBirthdayEnabled: false,
    remembranceMessage: "",
    heavenlyBirthdayMessage: "",
  });
  assert.equal(response.status, 200);
  assert.equal(
    route.calls.find((call) => call.name === "set_member_deceased").args
      .target_date_of_passing,
    null,
  );
  assert.deepEqual(
    plain(route.calls.find((call) => call.name === "updateUserById").attributes),
    { ban_duration: "none" },
  );
});

test("database failure blocks Auth mutation and Auth failure exposes retry-safe partial state", async () => {
  const databaseFailure = deceasedRoute({
    rpcError: { message: "private database detail" },
  });
  const databaseResponse = await databaseFailure.run();
  assert.equal(databaseResponse.status, 500);
  assert.equal(
    databaseFailure.calls.some((call) => call.name === "updateUserById"),
    false,
  );
  assert.doesNotMatch(JSON.stringify(await databaseResponse.json()), /private database/);

  const authFailure = deceasedRoute({
    authUpdateError: { message: "private Auth detail" },
  });
  const authResponse = await authFailure.run();
  assert.equal(authResponse.status, 503);
  assert.deepEqual(await authResponse.json(), {
    success: false,
    databaseUpdated: true,
    authAccessUpdated: false,
    retryRequired: true,
    error: "The member record was saved, but the Auth access update must be retried.",
  });
});

function memorialRoute({ superAdmin = true, rpcError = null } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: adminId } }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { is_super_admin: superAdmin, account_status: "active" },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data: { created: true, announcement_id: memberId },
        error: rpcError,
      };
    },
  };
  const route = loadRoute(
    "app/api/admin/members/deceased/memorial/route.ts",
    {
      "next/server": nextServer,
      "@supabase/supabase-js": { createClient: () => client },
    },
    env,
  );
  return {
    ...route,
    calls,
    run: (body = { targetUserId: memberId, title: "In Memoriam", message: "Remembered." }) =>
      route.POST(
        new Request("http://localhost/api/admin/members/deceased/memorial", {
          method: "POST",
          headers: {
            authorization: "Bearer unit-token",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        }),
      ),
  };
}

test("initial memorial publishing is Super-Admin-only and uses the exact RPC contract", async () => {
  assert.equal((await memorialRoute({ superAdmin: false }).run()).status, 403);

  const route = memorialRoute();
  const response = await route.run();
  assert.equal(response.status, 200);
  assert.deepEqual(plain(route.calls), [
    {
      name: "publish_initial_memorial",
      args: {
        target_user_id: memberId,
        target_title: "In Memoriam",
        target_message: "Remembered.",
      },
    },
  ]);
  assert.deepEqual(await response.json(), {
    success: true,
    created: true,
    announcementId: memberId,
  });
});

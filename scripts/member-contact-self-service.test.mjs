import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRoute,
  nextServer,
} from "./load-route-test.mjs";

const profileSource = await readFile(
  new URL(
    "../app/(member)/profile/page.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("profile UI exposes only the agreed contact self-service actions", () => {
  assert.match(profileSource, /instagram_username: string \| null/);
  assert.match(profileSource, /\.rpc\(\s*"update_my_contact_details"/);
  assert.match(profileSource, /new_phone:\s*phoneInput/);
  assert.match(profileSource, /new_instagram_username:\s*instagramInput/);
  assert.match(profileSource, /`@\$\{profile\.instagram_username\}`/);
  assert.match(profileSource, /fetch\(\s*"\/api\/account\/change-email"/);
  assert.match(profileSource, /Bearer \$\{session\.access_token\}/);
  assert.doesNotMatch(profileSource, /update_my_(?:name|date_of_birth|registration_number)/);
});

const allowedRateLimit = {
  configuredRateLimit: (_name, fallback) => fallback,
  consumeDurableRateLimit: async () => ({
    allowed: true,
    remaining: 2,
    retryAfterSeconds: 0,
  }),
  durableRateLimitHeaders: (result) => ({
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Remaining": String(result.remaining),
  }),
};

function emailRoute({
  profile = {
    id: "member-1",
    email: "current@example.test",
    account_status: "active",
    date_of_passing: null,
  },
  duplicate = null,
  profileError = null,
  duplicateError = null,
  user = { id: "member-1" },
  userError = null,
  updateError = null,
  rateLimit = allowedRateLimit,
} = {}) {
  const calls = [];
  let lookup = 0;
  const authenticatedClient = {
    auth: {
      getUser: async (token) => {
        calls.push({ name: "getUser", token });
        return {
          data: { user },
          error: userError,
        };
      },
      updateUser: async (attributes, options) => {
        calls.push({
          name: "updateUser",
          attributes,
          options,
        });
        return { error: updateError };
      },
    },
  };
  const query = {
    select() { return this; },
    eq() { return this; },
    neq() { return this; },
    limit() { return this; },
    async maybeSingle() {
      lookup += 1;
      return lookup === 1
        ? { data: profile, error: profileError }
        : { data: duplicate, error: duplicateError };
    },
  };
  const route = loadRoute(
    "app/api/account/change-email/route.ts",
    {
      "next/server": nextServer,
      "@supabase/supabase-js": {
        createClient: () => authenticatedClient,
      },
      "@/lib/security/durable-rate-limit": rateLimit,
      "@/lib/supabase/admin": {
        createAdminClient: () => ({
          from: () => query,
        }),
      },
    },
    {
      NEXT_PUBLIC_SITE_URL:
        "https://staging.example.test",
      NEXT_PUBLIC_SUPABASE_URL:
        "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "unit-only",
    },
  );

  return {
    ...route,
    calls,
    run: (body, origin = "https://staging.example.test") =>
      route.POST(
        new Request(
          "https://staging.example.test/api/account/change-email",
          {
            method: "POST",
            headers: {
              authorization:
                "Bearer unit-token",
              "content-type":
                "application/json",
              origin,
            },
            body,
          },
        ),
      ),
  };
}

test("email route rejects off-origin and malformed requests before Auth", async () => {
  const offOrigin = emailRoute();
  assert.equal(
    (await offOrigin.run(
      JSON.stringify({ newEmail: "new@example.test" }),
      "https://evil.example.test",
    )).status,
    403,
  );
  assert.deepEqual(offOrigin.calls, []);

  for (const body of [
    "null",
    "[]",
    "true",
    "{",
    JSON.stringify({ newEmail: "invalid" }),
  ]) {
    const route = emailRoute();
    assert.equal((await route.run(body)).status, 400);
    assert.deepEqual(route.calls, []);
  }
});

test("email route blocks disabled and duplicate accounts before requesting Auth change", async () => {
  const disabled = emailRoute({
    profile: {
      id: "member-1",
      email: "current@example.test",
      account_status: "disabled",
      date_of_passing: null,
    },
  });
  assert.equal(
    (await disabled.run(JSON.stringify({ newEmail: "new@example.test" }))).status,
    403,
  );
  assert.equal(disabled.calls.some((call) => call.name === "updateUser"), false);

  const duplicate = emailRoute({
    duplicate: { id: "member-2" },
  });
  assert.equal(
    (await duplicate.run(JSON.stringify({ newEmail: "USED@example.test" }))).status,
    409,
  );
  assert.equal(duplicate.calls.some((call) => call.name === "updateUser"), false);
});

test("email route requests verified Auth replacement with the exact confirmation callback", async () => {
  const route = emailRoute();
  const response = await route.run(
    JSON.stringify({
      newEmail:
        "  New.Address@Example.Test ",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  const update = route.calls.find((call) => call.name === "updateUser");
  assert.equal(
    update.attributes.email,
    "new.address@example.test",
  );
  assert.equal(
    update.options.emailRedirectTo,
    "https://staging.example.test/auth/confirm",
  );
});

test("email route never exposes internal provider errors", async () => {
  const route = emailRoute({
    updateError: {
      message:
        "private provider configuration detail",
    },
  });
  const response = await route.run(
    JSON.stringify({
      newEmail:
        "new@example.test",
    }),
  );

  assert.equal(response.status, 400);
  assert.doesNotMatch(
    JSON.stringify(await response.json()),
    /private provider configuration detail/,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { isIP } from "node:net";
import { loadRoute } from "./load-route-test.mjs";

function harness(config = {}) {
  const calls = { limits: [], queries: [], passwords: [], cookies: [], revoked: 0, lookups: [] };
  const user = { id: "member-uuid", email: "authoritative@example.test", email_confirmed_at: "2026-01-01", ...config.user };
  const admin = {
    from(table) {
      const query = { table };
      calls.queries.push(query);
      return {
        select(columns) { query.columns = columns; return this; },
        eq(column, value) { Object.assign(query, { column, value }); return this; },
        async limit(value) { query.limit = value; return { data: config.matches ?? [{ id: "member-uuid" }], error: config.lookupError }; },
        async maybeSingle() {
          if (config.profileThrows) throw new Error("private provider error");
          return { data: config.missingProfile ? null : { id: user.id, account_status: "active", date_of_passing: null, ...config.profile }, error: config.profileError };
        },
      };
    },
    auth: { admin: { async getUserById(id) { calls.lookups.push(id); return { data: { user: { ...user, id: "member-uuid", ...config.identity } }, error: config.identityError }; } } },
  };
  const route = loadRoute("app/api/auth/login/route.ts", {
    "node:net": { isIP },
    "node:timers/promises": { setTimeout: async () => {} },
    "next/server": { NextResponse: { json(body, init) {
      const response = Response.json(body, init);
      response.cookies = { set(...args) { calls.cookies.push(args); response.headers.append("set-cookie", `${args[0]}=${args[1]}`); } };
      return response;
    } } },
    "@/lib/application-origin": { configuredApplicationOrigin: () => "https://app.example.test" },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/security/durable-rate-limit": { async consumeDurableRateLimit(options) {
      calls.limits.push(options);
      if (config.limitThrows) throw new Error("private limiter error");
      return { allowed: options.bucket !== config.denyBucket };
    } },
    "@supabase/ssr": { createServerClient(url, key, options) {
      assert.equal(key, "publishable-key");
      assert.equal(options.cookies.getAll().length, 0);
      return { auth: {
        async signInWithPassword(input) {
          calls.passwords.push(input);
          if (!config.noCookies) options.cookies.setAll([{ name: "sb-session", value: "private-session", options: { path: "/" } }]);
          return { data: { user, session: config.noSession ? null : { access_token: "private-session" } }, error: config.authError };
        },
        async signOut(options) { assert.equal(options.scope, "local"); calls.revoked++; if (config.revokeThrows) throw new Error("private revoke error"); },
      } };
    } },
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://db.example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key", ...config.env });
  return { ...route, calls };
}

function request(body = { identifier: "0101", password: " password " }, headers = {}) {
  return new Request("https://app.example.test/api/auth/login", { method: "POST", headers: { origin: "https://app.example.test", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

test("exact JS ID preserves zeros and uses Auth email; response reveals only success", async () => {
  const h = harness();
  const result = await h.POST(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true });
  assert.equal(h.calls.queries[0].value, "0101");
  assert.equal(h.calls.queries[0].column, "registration_number");
  assert.equal(h.calls.queries[0].limit, 2);
  assert.equal(h.calls.passwords[0].email, "authoritative@example.test");
  assert.equal(h.calls.passwords[0].password, " password ");
  assert.equal(h.calls.cookies.length, 1);
  assert.equal(h.calls.cookies[0][2].secure, true);
  assert.equal(h.calls.revoked, 0);
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("email login normalizes email and allows active pending profile without memberships", async () => {
  const h = harness();
  assert.equal((await h.POST(request({ identifier: " Person@Example.test ", password: "pass" }))).status, 200);
  assert.equal(h.calls.passwords[0].email, "person@example.test");
  assert.equal(h.calls.lookups.length, 0);
  assert.equal(h.calls.queries.length, 1);
});

for (const [name, config] of Object.entries({ absent: { matches: [] }, ambiguous: { matches: [{ id: "a" }, { id: "b" }] }, lookupError: { lookupError: {} }, wrongPassword: { authError: {} }, unconfirmed: { user: { email_confirmed_at: null } }, identityMismatch: { user: { id: "other" } }, disabled: { profile: { account_status: "disabled" } }, deceased: { profile: { date_of_passing: "2026-01-01" } }, missingProfile: { missingProfile: true }, profileError: { profileError: {} }, noSession: { noSession: true } })) {
  test(`${name} fails generically with no cookies or identity leak`, async () => {
    const h = harness(config);
    const result = await h.POST(request());
    assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), { error: "Unable to sign in. Check your email or JS Member ID and password." });
    assert.equal(h.calls.cookies.length, 0);
    assert.equal(h.calls.revoked, h.calls.passwords.length && !config.noSession ? 1 : 0);
    assert.equal(h.logs.length, 0);
  });
}

test("post-auth exception revokes session and never logs or emits it", async () => {
  const h = harness({ profileThrows: true, revokeThrows: true });
  assert.equal((await h.POST(request())).status, 503);
  assert.equal(h.calls.revoked, 1);
  assert.equal(h.calls.cookies.length, 0);
  assert.equal(h.logs.length, 0);
});

test("session without issued cookies is denied and revoked", async () => {
  const h = harness({ noCookies: true });
  assert.equal((await h.POST(request())).status, 401);
  assert.equal(h.calls.revoked, 1);
  assert.equal(h.calls.cookies.length, 0);
});

test("successful login clears only same-project stale session chunks", async () => {
  const h = harness();
  assert.equal((await h.POST(request(undefined, { cookie: "sb-db-auth-token.2=old; sb-other-auth-token.2=keep; theme=dark; sb-db-auth-token.evil=keep" }))).status, 200);
  assert.equal(h.calls.cookies.length, 2);
  assert.equal(h.calls.cookies[0][0], "sb-db-auth-token.2");
  assert.equal(h.calls.cookies[0][2].maxAge, 0);
});

test("origin is pinned to configured origin; forged Host does not authorize", async () => {
  const h = harness();
  assert.equal((await h.POST(request(undefined, { origin: "https://evil.test", host: "evil.test" }))).status, 403);
  assert.equal(h.calls.limits.length, 0);
});

test("body validation bounds actual streamed bytes without content-length", async () => {
  for (const body of ["x".repeat(8193), "{", [], { identifier: "x", password: "p".repeat(1025) }, { identifier: 101, password: "pass" }]) {
    const h = harness();
    assert.equal((await h.POST(request(body))).status, 400);
    assert.equal(h.calls.passwords.length, 0);
    assert.equal(h.calls.queries.length, 0);
  }
});

test("all limiter failures stop before lookup/auth", async () => {
  for (const config of [{ denyBucket: "login-global" }, { denyBucket: "login-client" }, { denyBucket: "login-identifier" }, { limitThrows: true }]) {
    const h = harness(config);
    assert.equal((await h.POST(request())).status, config.limitThrows ? 503 : 429);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.calls.passwords.length, 0);
  }
});

test("only Vercel platform IP header is trusted, with shared fallback", async () => {
  for (const [env, headers, expected] of [
    [{}, { "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "1.2.3.4" }, "shared"],
    [{ VERCEL: "1" }, { "x-vercel-forwarded-for": "1.2.3.4" }, "1.2.3.4"],
    [{ VERCEL: "1" }, { "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8" }, "shared"],
  ]) {
    const h = harness({ env });
    await h.POST(request(undefined, headers));
    assert.equal(h.calls.limits[1].subject, expected);
  }
});

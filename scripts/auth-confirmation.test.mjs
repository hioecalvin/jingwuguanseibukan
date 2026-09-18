import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadRoute } from "./load-route-test.mjs";

function confirmationRoute({ otpError = null, codeError = null } = {}) {
  const calls = [];
  const route = loadRoute("app/auth/confirm/route.ts", {
    "next/server": {
      NextResponse: {
        redirect: (target) => Response.redirect(target),
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          verifyOtp: async (args) => {
            calls.push({ method: "verifyOtp", args });
            return { error: otpError };
          },
          exchangeCodeForSession: async (code) => {
            calls.push({ method: "exchangeCodeForSession", code });
            return { error: codeError };
          },
        },
      }),
    },
  });

  return {
    calls,
    run(path) {
      const url = new URL(path, "https://app.example.invalid");
      return route.GET({
        url: url.toString(),
        nextUrl: { clone: () => new URL(url) },
      });
    },
  };
}

test("email OTP confirmation redirects to sanitized verified login", async () => {
  const fixture = confirmationRoute();
  const response = await fixture.run(
    "/auth/confirm?token_hash=secret-token&type=signup&campaign=welcome",
  );
  const target = new URL(response.headers.get("location"));

  assert.equal(target.pathname, "/login");
  assert.equal(target.searchParams.get("verified"), "true");
  assert.equal(target.searchParams.get("campaign"), "welcome");
  assert.equal(target.searchParams.has("token_hash"), false);
  assert.equal(target.searchParams.has("type"), false);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].method, "verifyOtp");
  assert.equal(fixture.calls[0].args.type, "signup");
  assert.equal(fixture.calls[0].args.token_hash, "secret-token");
});

test("PKCE confirmation exchanges its code and removes it from the redirect", async () => {
  const fixture = confirmationRoute();
  const response = await fixture.run("/auth/confirm?code=private-code");
  const target = new URL(response.headers.get("location"));

  assert.equal(target.pathname, "/login");
  assert.equal(target.searchParams.get("verified"), "true");
  assert.equal(target.searchParams.has("code"), false);
  assert.deepEqual(fixture.calls, [
    { method: "exchangeCodeForSession", code: "private-code" },
  ]);
});

test("invalid and missing confirmations reach a real generic error page", async () => {
  const failed = confirmationRoute({ otpError: new Error("private provider detail") });
  const failedResponse = await failed.run(
    "/auth/confirm?token_hash=private-token&type=signup",
  );
  const failedTarget = new URL(failedResponse.headers.get("location"));

  assert.equal(failedTarget.pathname, "/auth/error");
  assert.equal(failedTarget.searchParams.has("token_hash"), false);
  assert.equal(failedTarget.searchParams.has("type"), false);

  const missing = confirmationRoute();
  const missingResponse = await missing.run("/auth/confirm");
  assert.equal(new URL(missingResponse.headers.get("location")).pathname, "/auth/error");

  const errorPage = fs.readFileSync("app/auth/error/page.tsx", "utf8");
  assert.match(errorPage, /invalid, expired, or has already been used/i);
  assert.doesNotMatch(errorPage, /private provider detail|token_hash/i);
});

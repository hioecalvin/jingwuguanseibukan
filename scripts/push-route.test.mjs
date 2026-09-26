import assert from "node:assert/strict";
import test from "node:test";

import { loadRoute, nextServer } from "./load-route-test.mjs";

const allowRateLimit = {
  configuredRateLimit: (_name, fallback) => fallback,
  consumeDurableRateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 0 }),
  durableRateLimitHeaders: () => ({}),
};

function route({ subscriptions = [], subscriptionError = null, sendError = null, updateError = null } = {}) {
  const calls = [];
  const supabase = {
    from(name) {
      assert.equal(name, "push_subscriptions");
      return {
        select() {
          let count = 0;
          const builder = {
            eq() {
              count += 1;
              return count === 2
                ? Promise.resolve({ data: subscriptions, error: subscriptionError })
                : builder;
            },
          };
          return builder;
        },
        update(update) {
          return {
            async eq(_field, id) {
              calls.push({ name: "update", id, update });
              return { error: updateError };
            },
          };
        },
      };
    },
  };
  const loaded = loadRoute("app/api/push/send/route.ts", {
    "next/server": nextServer,
    "@/lib/push/server": {
      async sendWebPush(subscription, payload) {
        calls.push({ name: "send", subscription, payload });
        if (sendError) throw sendError;
      },
    },
    "@/lib/supabase/admin": { createAdminClient: () => supabase },
    "@/lib/security/durable-rate-limit": allowRateLimit,
  }, { PUSH_API_SECRET: "unit-push-secret" });
  return { ...loaded, calls };
}

function request(body, secret = "unit-push-secret") {
  return new Request("http://localhost/api/push/send", {
    method: "POST",
    headers: { "x-push-secret": secret },
    body,
  });
}

const validBody = JSON.stringify({
  userId: "12345678-1234-4123-8123-123456789abc",
  title: "Class update",
  body: "Training starts at 6 pm.",
  url: "/notifications",
});

test("push worker rejects non-object JSON before database or provider work", async () => {
  for (const body of ["null", "[]", "true", '"text"']) {
    const loaded = route();
    const response = await loaded.POST(request(body));
    assert.equal(response.status, 400, body);
    assert.deepEqual(loaded.calls, []);
  }
});

test("push worker rejects cross-origin and backslash notification targets", async () => {
  for (const url of [
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/notifications\nhttps://evil.example/",
  ]) {
    const loaded = route();
    const response = await loaded.POST(request(JSON.stringify({
      ...JSON.parse(validBody),
      url,
    })));
    assert.equal(response.status, 400, JSON.stringify(url));
    assert.deepEqual(loaded.calls, []);
  }
});

test("a provider delivery failure is an observable non-success response", async () => {
  const loaded = route({
    subscriptions: [{ id: "subscription-1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" }],
    sendError: new Error("private provider detail"),
  });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { success: false, sent: 0, failed: 1, stateFailed: 0, total: 1 });
  assert.equal(loaded.calls.filter(({ name }) => name === "update").length, 1);
});

test("push subscription state persistence failures are observable", async () => {
  const loaded = route({
    subscriptions: [{ id: "subscription-1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" }],
    updateError: new Error("private persistence detail"),
  });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, sent: 1, failed: 0, stateFailed: 1, total: 1 });
});

test("subscription query failures do not expose internal details", async () => {
  const loaded = route({ subscriptionError: new Error("private database detail") });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Push delivery failed." });
  assert.doesNotMatch(JSON.stringify(await Promise.resolve(loaded.logs)), /private database detail/);
});

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
    "@/lib/security/constant-time-secret": {
      matchesSecret: (received, expected) =>
        typeof received === "string" && typeof expected === "string" &&
        expected.length > 0 && received === expected,
    },
  }, { PUSH_API_SECRET: "unit-push-secret" });
  return { ...loaded, calls };
}

function request(body, secret = "unit-push-secret") {
  const headers = secret === null
    ? {}
    : { "x-push-secret": secret };

  return new Request("http://localhost/api/push/send", {
    method: "POST",
    headers,
    body,
  });
}

const validBody = JSON.stringify({
  userId: "12345678-1234-4123-8123-123456789abc",
  title: "Class update",
  body: "Training starts at 6 pm.",
  url: "/notifications",
});

test("push worker rejects incorrect or missing secrets before database or provider work", async () => {
  for (const secret of ["incorrect", "", null]) {
    const loaded = route();
    const response = await loaded.POST(request(validBody, secret));
    assert.equal(response.status, 401);
    assert.deepEqual(loaded.calls, []);
  }
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
  const privateEndpoint = "https://push.example/private-endpoint-token";
  const privateBody = "private provider response body";
  const privateHeader = "private provider response header";
  const loaded = route({
    subscriptions: [{ id: "subscription-1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" }],
    sendError: {
      statusCode: 503,
      endpoint: privateEndpoint,
      body: privateBody,
      headers: { "x-provider-detail": privateHeader },
    },
  });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { success: false, sent: 0, failed: 1, stateFailed: 0, total: 1 });
  assert.equal(loaded.calls.filter(({ name }) => name === "update").length, 1);
  const logs = JSON.stringify(loaded.logs);
  assert.match(logs, /503/);
  assert.doesNotMatch(logs, /private-endpoint-token|private provider response/);
});

test("push subscription state persistence failures are observable", async () => {
  const loaded = route({
    subscriptions: [{ id: "subscription-1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" }],
    updateError: { message: "private persistence detail", row: "private database row" },
  });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, sent: 1, failed: 0, stateFailed: 1, total: 1 });
  assert.doesNotMatch(JSON.stringify(loaded.logs), /private persistence detail|private database row/);
});

test("subscription query failures do not expose internal details", async () => {
  const loaded = route({ subscriptionError: { message: "private database detail", row: "private database row" } });
  const response = await loaded.POST(request(validBody));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Push delivery failed." });
  assert.doesNotMatch(JSON.stringify(loaded.logs), /private database detail|private database row/);
});

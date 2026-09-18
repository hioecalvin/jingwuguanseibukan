import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("migration 033 makes delayed ready email and exhausted retries observable", () => {
  const sql = fs.readFileSync(
    new URL("../supabase/migrations/033_email_queue_operational_health.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create or replace function public\.email_backend_health_check\(\)/i);
  assert.match(sql, /coalesce\(next_attempt_at, created_at\) < now\(\) - interval '2 minutes'/i);
  assert.match(sql, /where status = 'pending'\s+and coalesce\(next_attempt_at, created_at\) < now\(\) - interval '2 minutes'/i);
  assert.match(sql, /attempts < max_attempts/i);
  assert.match(sql, /failed_emails_exhausted/i);
  assert.match(sql, /overdue_ready_emails/i);
  assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from)\s+public\.email_outbox/i);
});

test("the email scheduler response exposes only a normalized queue-health summary", () => {
  const source = fs.readFileSync(
    new URL("../app/api/system/email-worker/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /email_backend_health_check/);
  assert.match(source, /normaliseQueueHealth/);
  assert.match(source, /overdueReadyEmails/);
  assert.match(source, /queueHealthy[\s\S]*status[\s\S]*503/);
});

test("push delivery and the service worker both constrain click targets to local paths", () => {
  const route = fs.readFileSync(
    new URL("../app/api/push/send/route.ts", import.meta.url),
    "utf8",
  );
  const worker = fs.readFileSync(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );

  for (const source of [route, worker]) {
    assert.match(source, /safeApplicationPath/);
    assert.match(source, /value\.includes\("\\\\"\)/);
    assert.match(source, /startsWith\("\/\/"\)/);
  }
  assert.match(worker, /parsed\.origin ===[\s\S]*self\.location\.origin/);
});

test("the service worker replaces unsafe push and click targets at runtime", async () => {
  const listeners = new Map();
  const shown = [];
  const opened = [];
  const clients = {
    async matchAll() {
      return [];
    },
    async openWindow(url) {
      opened.push(url);
    },
  };
  const self = {
    location: { origin: "https://app.example.org" },
    registration: {
      async showNotification(title, options) {
        shown.push({ title, options });
      },
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
  };

  vm.runInNewContext(
    fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    { self, clients, URL },
  );

  for (const target of ["//evil.example/", "/\\evil.example/"]) {
    let pending;
    listeners.get("push")({
      data: { json: () => ({ title: "Test", body: "Body", url: target }) },
      waitUntil(promise) {
        pending = promise;
      },
    });
    await pending;
    assert.equal(shown.at(-1).options.data.url, "/notifications");

    listeners.get("notificationclick")({
      notification: {
        data: { url: target },
        close() {},
      },
      waitUntil(promise) {
        pending = promise;
      },
    });
    await pending;
    assert.equal(opened.at(-1), "/notifications");
  }

  let pending;
  listeners.get("notificationclick")({
    notification: {
      data: { url: "/notifications?filter=unread#latest" },
      close() {},
    },
    waitUntil(promise) {
      pending = promise;
    },
  });
  await pending;
  assert.equal(opened.at(-1), "/notifications?filter=unread#latest");
});

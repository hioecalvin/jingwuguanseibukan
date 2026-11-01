import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/browser-smoke.yml", import.meta.url),
  "utf8",
);

test("common CI checks retain audits, production build and desktop uploader verification", () => {
  const checks = workflow.match(/jobs:\s*[\s\S]*?\n  browser-smoke:/)?.[0] ?? "";
  assert.match(checks, /npm audit --audit-level=high/);
  assert.match(checks, /npm audit --omit=dev --audit-level=high/);
  assert.match(checks, /npm run lint/);
  assert.match(checks, /npm test/);
  assert.match(
    checks,
    /name: Build production application[\s\S]*?run: npm run build[\s\S]*?NEXT_PUBLIC_SITE_URL: https:\/\/app\.invalid[\s\S]*?NEXT_PUBLIC_SUPABASE_URL: https:\/\/supabase\.invalid[\s\S]*?NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_build_placeholder/,
  );
  assert.match(checks, /working-directory: desktop\/js-video-uploader[\s\S]*?npm ci/);
  assert.match(checks, /working-directory: desktop\/js-video-uploader[\s\S]*?npm test/);
  assert.match(checks, /working-directory: desktop\/js-video-uploader[\s\S]*?npm audit --audit-level=high/);
});

test("CI remains secret-free and does not authorize a deployment", () => {
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /vercel\s+(?:deploy|promote)|supabase\s+db\s+push/i);
  assert.match(workflow, /persist-credentials: false/g);
  assert.doesNotMatch(workflow, /eomubndonbetszdbhsrj|pkmllhaavadhaozmwapz/);
});

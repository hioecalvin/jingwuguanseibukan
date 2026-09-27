// Read-only audit with the existing staging Super Admin fixture. No database writes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { DesktopAuth, publicConfig } from "../tests/load-auth.mjs";

const envPath = process.argv[2];
assert.ok(envPath, "Usage: npm run audit:staging-logos -- C:\\protected\\jingwuguan-staging.env");
const env = parseEnv(await readFile(envPath, "utf8"));
const config = publicConfig({
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  environment: "Staging",
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  googleClientId: null,
  youtubeChannelId: null,
});
assert.ok(config, "Only the approved staging project is allowed");
const email = "0001@dummy.jingwuguan.test";
assert.equal(env.SECURITY_TEST_SUPER_EMAIL, email);
assert.ok(env.SECURITY_TEST_SUPER_PASSWORD);

const auth = new DesktopAuth(config);
try {
  const result = await auth.signIn(email, env.SECURITY_TEST_SUPER_PASSWORD);
  assert.ok(result.user, result.message);
  assert.equal(result.user.role, "Super Admin");
  const allowedOrigins = new Set([new URL(config.url).origin, new URL(config.siteUrl).origin]);
  const rows = result.user.classes.map(item => {
    if (!item.logoUrl) return { class: item.name, status: "missing", origin: null };
    try {
      const origin = new URL(item.logoUrl, config.siteUrl).origin;
      return { class: item.name, status: allowedOrigins.has(origin) ? "current" : "retired-or-untrusted", origin };
    } catch { return { class: item.name, status: "invalid", origin: null }; }
  });
  for (const row of rows) console.log(`${row.status === "current" ? "PASS" : "BLOCKER"}: ${row.class}; ${row.status}${row.origin ? `; ${row.origin}` : ""}`);
  const blocked = rows.filter(row => row.status !== "current");
  console.log(`SUMMARY: ${rows.length - blocked.length}/${rows.length} class logos use an approved current origin; ${blocked.length} require attention.`);
} finally {
  await auth.signOut();
}

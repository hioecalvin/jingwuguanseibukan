// Read-only acceptance with existing staging fixtures; no database writes or service key.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { DesktopAuth, publicConfig } from "../tests/load-auth.mjs";
const env = parseEnv(await readFile(process.argv[2], "utf8"));
const config = publicConfig({
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  environment: "Staging",
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  googleClientId: null,
  youtubeChannelId: null,
});
assert.ok(config, "Only the approved staging project is allowed");
const emails = { MEMBER: "0101@dummy.jingwuguan.test", ADMIN: "0002@dummy.jingwuguan.test", SUPER: "0001@dummy.jingwuguan.test" };
for (const [role, email] of Object.entries(emails)) {
  assert.equal(env[`SECURITY_TEST_${role}_EMAIL`], email);
  assert.ok(env[`SECURITY_TEST_${role}_PASSWORD`]);
}
for (const role of ["MEMBER", "ADMIN", "SUPER"]) {
  const auth = new DesktopAuth(config);
  try {
    const result = await auth.signIn(emails[role], env[`SECURITY_TEST_${role}_PASSWORD`]);
    if (role !== "SUPER") { assert.equal(result.user, null); assert.match(result.message, /Repository Uploader appointment/); }
    else {
      assert.ok(result.user, result.message);
      assert.equal(result.user.role, "Super Admin");
      assert.deepEqual(result.user.classes.map(x => x.name).sort(), ["Aikido", "Karate", "Kungfu Kids", "Taiji", "Xingyi"]);
      assert.deepEqual((await auth.refresh()).user, result.user);
    }
    console.log(`PASS: staging ${role}; ${result.user ? result.user.classes.map(x => x.name).join(", ") : "access denied"}`);
  } finally { await auth.signOut(); assert.equal((await auth.refresh()).user, null); }
}

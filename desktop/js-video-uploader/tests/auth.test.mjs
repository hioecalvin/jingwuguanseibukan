import test from "node:test";
import assert from "node:assert/strict";
import { DesktopAuth, publicConfig } from "./load-auth.mjs";
const config = {
  url: "https://eomubndonbetszdbhsrj.supabase.co",
  key: "sb_publishable_test",
  environment: "Staging",
  siteUrl: "https://jingwuguanseibukan-staging.vercel.app",
  googleClientId: null,
  youtubeChannelId: null,
};
function fake(options = {}) {
  const state = { permissions: ["a"], active: true, ...options, signouts: [] };
  const response = data => ({ data, error: null });
  const client = {
    auth: {
      signInWithPassword: async () => { if (state.wait) await state.wait; return { error: state.badPassword ? {} : null }; },
      getUser: async () => state.expired ? { error: {} } : response({ user: { id: "u" } }),
      stopAutoRefresh() {},
      signOut: async options => { state.signouts.push(options); },
    },
    from: name => {
      const rows = name === "classes"
        ? [{ id: "a", name: "Aikido", logo_url: "https://eomubndonbetszdbhsrj.supabase.co/storage/v1/object/public/class-logos/a/logo.png" }, { id: "k", name: "Karate", logo_url: null }].filter(item => state.permissions.includes(item.id))
        : name === "ranks"
          ? [{ id: "ra", class_id: "a", name: "5th Kyu", sort_order: 1 }, { id: "rk", class_id: "k", name: "White Belt", sort_order: 1 }].filter(item => state.permissions.includes(item.class_id))
          : [{ id: "ta", rank_id: "ra", name: "Basics", sort_order: 1 }, { id: "tk", rank_id: "rk", name: "Basics", sort_order: 1 }].filter(item => state.permissions.includes(item.rank_id === "ra" ? "a" : "k"));
      const query = { select: () => query, eq: () => query, in: () => query,
        single: async () => response({ full_name: "Test Admin", account_status: state.active ? "active" : "suspended", date_of_passing: state.deceased ? "2020-01-01" : null, must_change_password: state.mustChange }),
        order: async () => response(rows),
      }; return query;
    },
    rpc: async name => state.rpcError ? { error: {} } : response(
      name === "is_super_admin" ? !!state.super
        : name === "is_active_app_user" ? state.active
          : name === "get_my_repository_upload_scopes" ? state.permissions.map(id => ({ class_id: id, class_name: id === "a" ? "Aikido" : "Karate" }))
            : null,
    ),
  };
  return { client, state, auth: new DesktopAuth(config, () => client) };
}
test("installer config accepts only staging with a public key", () => {
  assert.deepEqual(publicConfig(config), config);
  for (const override of [{ key: "sb_secret_test" }, { url: "https://production.supabase.co" }, { environment: "Production" }, { key: `a.${Buffer.from('{"role":"service_role"}').toString("base64url")}.b` }]) assert.equal(publicConfig({ ...config, ...override }), null);
  const youtube = { googleClientId: "123456-example.apps.googleusercontent.com", youtubeChannelId: "UC1234567890123456789012" };
  assert.deepEqual(publicConfig({ ...config, ...youtube }), { ...config, ...youtube });
  assert.equal(publicConfig({ ...config, googleClientId: youtube.googleClientId }), null);
  assert.equal(publicConfig({ ...config, youtubeChannelId: youtube.youtubeChannelId }), null);
});
test("class Admin sees only database-authorized classes; no token crosses bridge", async () => {
  const { auth } = fake();
  const result = await auth.signIn("admin@example.test", "password");
  assert.equal(result.user.role, "Repository Uploader");
  assert.deepEqual(result.user.classes.map(item => item.name), ["Aikido"]);
  assert.deepEqual(result.user.classes[0].ranks[0].tiers.map(item => item.name), ["Basics"]);
  assert.equal(result.message, "Repository upload access verified");
});
test("Super Admin still receives classes from database permission checks", async () => {
  const { auth } = fake({ super: true, permissions: ["a", "k"] });
  const result = await auth.signIn("super@example.test", "password");
  assert.equal(result.user.role, "Super Admin"); assert.equal(result.user.classes.length, 2);
});
for (const [name, options] of Object.entries({ member: { permissions: [] }, inactive: { active: false }, deceased: { deceased: true }, passwordChange: { mustChange: true }, wrongPassword: { badPassword: true }, networkFailure: { rpcError: true }, expiredSession: { expired: true } })) {
  test(`${name} cannot access the uploader`, async () => {
    const { auth, state } = fake(options);
    assert.equal((await auth.signIn("test@example.test", "password")).user, null);
    assert.deepEqual(state.signouts, [{ scope: "local" }]);
  });
}
test("revoked class access is removed on revalidation", async () => {
  const { auth, state } = fake();
  await auth.signIn("test@example.test", "password"); state.permissions = [];
  assert.equal((await auth.refresh()).user, null);
});
test("revalidation fails closed when database is unavailable", async () => {
  const { auth, state } = fake();
  await auth.signIn("test@example.test", "password"); state.rpcError = true;
  assert.equal((await auth.refresh()).user, null);
});
test("sign-out clears access and revokes only the desktop session", async () => {
  const { auth, state } = fake(); await auth.signIn("test@example.test", "password");
  assert.equal((await auth.signOut()).user, null);
  assert.equal((await auth.refresh()).user, null);
  assert.deepEqual(state.signouts, [{ scope: "local" }]);
});
test("late sign-in cannot restore access after sign-out", async () => {
  let resolve; const wait = new Promise(r => { resolve = r; });
  const { auth } = fake({ wait });
  const login = auth.signIn("test@example.test", "password");
  await auth.signOut(); resolve();
  assert.equal((await login).user, null);
  assert.equal((await auth.refresh()).user, null);
});
test("invalid IPC input does not reach Supabase", async () => {
  const auth = new DesktopAuth(config, () => { throw new Error("must not run"); });
  assert.equal((await auth.signIn({}, [])).user, null);
  assert.equal((await auth.signIn("", "")).user, null);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWN_PRODUCTION_PROJECT_REF,
  passwordUpdatePayload,
  projectRefFromHostedUrl,
  readRotationConfiguration,
  SECURITY_TEST_ACCOUNTS,
  STAGING_PROJECT_REF,
  validateStrongPassword,
  verifyExactAccountSet,
} from "./security-test-account-rotation.mjs";
import { runRotation } from "./rotate-security-test-passwords.mjs";

function encoded(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function validEnvironment() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_PROJECT_REF}.supabase.co`,
    STAGING_PROJECT_REF,
    SUPABASE_SECRET_KEY: `${encoded({ alg: "HS256" })}.${encoded({ role: "service_role" })}.signature`,
    SECURITY_TEST_MEMBER_EMAIL: "member@security.invalid",
    SECURITY_TEST_MEMBER_PASSWORD: "Quartz-Rotation-82!safe",
    SECURITY_TEST_ADMIN_EMAIL: "admin@security.invalid",
    SECURITY_TEST_ADMIN_PASSWORD: "Cobalt-Rotation-73!safe",
    SECURITY_TEST_SUPER_EMAIL: "super@security.invalid",
    SECURITY_TEST_SUPER_PASSWORD: "Topaz-Rotation-64!safe",
  };
}

function identityFixture() {
  const users = SECURITY_TEST_ACCOUNTS.map((account, index) => ({
    id: `user-${index + 1}`,
    email: `${account.key.toLowerCase()}@security.invalid`,
  }));
  const profiles = SECURITY_TEST_ACCOUNTS.map((account, index) => ({
    id: users[index].id,
    registration_number: account.memberNumber,
    is_super_admin: account.role === "super_admin",
    account_status: "active",
    date_of_passing: null,
  }));
  return {
    users,
    profiles,
    assignments: [{ user_id: users[1].id, active: true }],
  };
}

test("rotation is hard-limited to the exact recorded staging origin", () => {
  assert.equal(projectRefFromHostedUrl(`https://${STAGING_PROJECT_REF}.supabase.co`), STAGING_PROJECT_REF);
  for (const url of [
    `http://${STAGING_PROJECT_REF}.supabase.co`,
    `https://${STAGING_PROJECT_REF}.supabase.co/rest/v1`,
    `https://user:secret@${STAGING_PROJECT_REF}.supabase.co`,
  ]) assert.throws(() => projectRefFromHostedUrl(url));

  const production = validEnvironment();
  production.NEXT_PUBLIC_SUPABASE_URL = `https://${KNOWN_PRODUCTION_PROJECT_REF}.supabase.co`;
  production.STAGING_PROJECT_REF = KNOWN_PRODUCTION_PROJECT_REF;
  assert.throws(() => readRotationConfiguration(production), /restricted to the recorded staging project/);
});

test("configuration requires server credentials and three distinct strong password pairs", () => {
  const configuration = readRotationConfiguration(validEnvironment());
  assert.equal(configuration.accounts.length, 3);

  const publishable = validEnvironment();
  publishable.SUPABASE_SECRET_KEY = `sb_publishable_${"a".repeat(32)}`;
  assert.throws(() => readRotationConfiguration(publishable), /must not be a browser publishable key/);

  const weak = validEnvironment();
  weak.SECURITY_TEST_MEMBER_PASSWORD = "weak";
  assert.throws(() => readRotationConfiguration(weak), /16 to 128/);

  const duplicate = validEnvironment();
  duplicate.SECURITY_TEST_ADMIN_PASSWORD = duplicate.SECURITY_TEST_MEMBER_PASSWORD;
  assert.throws(() => readRotationConfiguration(duplicate), /passwords must be distinct/);
});

test("strong-password validation rejects placeholder and mailbox-derived values", () => {
  assert.throws(
    () => validateStrongPassword("Change-me-Strong-82!", "member@security.invalid", "SECRET"),
    /prohibited/
  );
  assert.throws(
    () => validateStrongPassword("Member-Strong-82!safe", "member@security.invalid", "SECRET"),
    /mailbox local part/
  );
});

test("the exact three Auth users, member numbers, and resolved roles are required", () => {
  const fixture = identityFixture();
  const accounts = readRotationConfiguration(validEnvironment()).accounts;
  assert.deepEqual(
    verifyExactAccountSet(accounts, fixture.users, fixture.profiles, fixture.assignments)
      .map(({ label, role }) => ({ label, role })),
    SECURITY_TEST_ACCOUNTS.map(({ label, role }) => ({ label, role }))
  );

  assert.throws(
    () => verifyExactAccountSet(accounts, [...fixture.users, fixture.users[0]], fixture.profiles, fixture.assignments),
    /exactly one existing Auth user/
  );
  assert.throws(
    () => verifyExactAccountSet(accounts, fixture.users, fixture.profiles, []),
    /expected application role/
  );
  assert.throws(
    () => verifyExactAccountSet(accounts, fixture.users, [{ ...fixture.profiles[0], id: "wrong" }, ...fixture.profiles.slice(1)], fixture.assignments),
    /exactly one profile/
  );
});

test("the Auth mutation payload contains only the password", () => {
  assert.deepEqual(Object.keys(passwordUpdatePayload("Strong-Rotation-82!safe")), ["password"]);
});

function fakeClientFor(fixture, updates) {
  return {
    auth: {
      admin: {
        async listUsers() {
          return { data: { users: fixture.users }, error: null };
        },
        async updateUserById(userId, payload) {
          updates.push({ userId, payload });
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
    from(table) {
      if (table === "profiles") {
        return {
          select() {
            return { in: async () => ({ data: fixture.profiles, error: null }) };
          },
        };
      }
      if (table === "dojo_admin_assignments") {
        return {
          select() {
            return {
              in() {
                return { eq: async () => ({ data: fixture.assignments, error: null }) };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test("audit is the default and performs no Auth mutation", async () => {
  const fixture = identityFixture();
  const updates = [];
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = await runRotation({
      argv: [],
      env: validEnvironment(),
      clientFactory: () => fakeClientFor(fixture, updates),
    });
    assert.equal(result.mode, "audit");
    assert.deepEqual(updates, []);
  } finally {
    console.log = originalLog;
  }
});

test("explicit apply updates exactly three users with password-only payloads", async () => {
  const fixture = identityFixture();
  const updates = [];
  const env = validEnvironment();
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = await runRotation({
      argv: ["--apply"],
      env,
      clientFactory: () => fakeClientFor(fixture, updates),
    });
    assert.equal(result.mode, "apply");
    assert.deepEqual(updates.map(({ userId }) => userId), ["user-1", "user-2", "user-3"]);
    assert.deepEqual(updates.map(({ payload }) => Object.keys(payload)), [["password"], ["password"], ["password"]]);
    assert.deepEqual(updates.map(({ payload }) => payload.password), [
      env.SECURITY_TEST_MEMBER_PASSWORD,
      env.SECURITY_TEST_ADMIN_PASSWORD,
      env.SECURITY_TEST_SUPER_PASSWORD,
    ]);
  } finally {
    console.log = originalLog;
  }
});

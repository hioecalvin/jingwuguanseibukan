import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { assignmentCoversMember } from "./security-scope.mjs";
import { allVisibleMembers } from "./security-pagination.mjs";
import { isAssessorAuthorizationDenied, isPermissionDenied, resolveSecurityCredential, validateSecurityTarget } from "./security-target.mjs";


function loadLocalEnvironment() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");

    process.env[key] ??= value;
  }
}


function requiredEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}


function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


async function withFutureJwtRetry(run) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("JWT issued at future") || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
}


function appClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}


async function signIn(url, key, role, credential) {
  const client = appClient(url, key);
  const { data, error } = credential.mode === "session"
    ? await client.auth.setSession({
      access_token: credential.accessToken,
      refresh_token: credential.refreshToken,
    })
    : await client.auth.signInWithPassword({
      email: credential.email,
      password: credential.password,
    });

  assert(!error && data.user, `${role} sign-in failed: ${error?.message}`);

  return {
    client,
    user: data.user,
  };
}


async function assertSuperAdminFlag(session, expected, label) {
  const { data, error } = await session.client.rpc("is_super_admin", {
    uid: session.user.id,
  });

  assert(!error, `${label} role check failed: ${error?.message}`);
  assert(
    data === expected,
    `${label} role check returned ${String(data)} instead of ${String(expected)}`
  );
}


function memberIdentity(row) {
  return row.user_id ?? row.profile_id ?? row.id ?? null;
}


async function assertMemberCannotReadOtherMembers(session) {
  const data = await allVisibleMembers(session.client);

  const foreignRows = (data ?? []).filter(
    (row) => memberIdentity(row) !== session.user.id
  );

  assert(
    foreignRows.length === 0,
    `Member can read ${foreignRows.length} foreign row(s) from admin_visible_members`
  );
}


async function assertAdminScope(session) {
  const { data: assignments, error: assignmentError } = await session.client
    .from("dojo_admin_assignments")
    .select("class_id, dojo_id, active")
    .eq("user_id", session.user.id)
    .eq("active", true);

  assert(
    !assignmentError,
    `Admin assignment query failed: ${assignmentError?.message}`
  );
  assert((assignments ?? []).length > 0, "Admin test account has no active scope");

  const members = await allVisibleMembers(session.client);

  const outOfScope = (members ?? []).filter((member) =>
    !(assignments ?? []).some((assignment) =>
      assignmentCoversMember(assignment, member)
    )
  );

  assert(
    outOfScope.length === 0,
    `Scoped Admin can read ${outOfScope.length} out-of-scope member row(s)`
  );
}


async function assertFinanceHelperCannotImpersonate(member, admin) {
  const { data: assignments, error: assignmentError } = await admin.client
    .from("dojo_admin_assignments")
    .select("dojo_id")
    .eq("user_id", admin.user.id)
    .eq("active", true)
    .not("dojo_id", "is", null)
    .limit(1);

  assert(
    !assignmentError,
    `Finance-scope setup query failed: ${assignmentError?.message}`
  );
  assert(
    assignments?.[0]?.dojo_id,
    "Admin test account has no active dojo assignment for finance-scope testing"
  );

  const { data, error } = await member.client.rpc("can_access_dojo_finance", {
    target_dojo_id: assignments[0].dojo_id,
    target_user_id: admin.user.id,
  });

  assert(
    isPermissionDenied(error) || (!error && data === false),
    "Member can impersonate another caller through can_access_dojo_finance"
  );
}


async function assertRoleHelperCannotImpersonate(member, superAdmin) {
  const { data, error } = await member.client.rpc("is_super_admin", {
    uid: superAdmin.user.id,
  });

  assert(
    isPermissionDenied(error) || (!error && data === false),
    "Member can inspect another caller through is_super_admin"
  );
}


async function assertEffectiveRateIsPrivate(member, admin) {
  const { data: memberships, error: membershipError } = await admin.client
    .from("admin_visible_members")
    .select("membership_id, user_id")
    .neq("user_id", member.user.id)
    .not("membership_id", "is", null)
    .limit(1);

  assert(
    !membershipError,
    `Effective-rate setup query failed: ${membershipError?.message}`
  );
  assert(
    memberships?.[0]?.membership_id,
    "Admin test scope has no foreign membership for effective-rate privacy testing"
  );

  const { error } = await member.client.rpc(
    "get_membership_subscription_rate",
    {
      target_membership_id: memberships[0].membership_id,
    }
  );

  assert(
    isPermissionDenied(error),
    "Member can read another Member's effective subscription rate"
  );
}


async function assertArchiveViewsArePrivate(session) {
  for (const view of ["document_archive", "certificate_archive"]) {
    const { error } = await session.client.from(view).select("*").limit(1);

    assert(
      isPermissionDenied(error),
      `${view} is directly readable; browser roles must use scoped archive RPCs`
    );
  }
}


async function assertSensitiveDeliveryDataIsPrivate(session) {
  const { error: outboxError } = await session.client
    .from("email_outbox")
    .select("id")
    .limit(1);

  assert(
    isPermissionDenied(outboxError),
    "Member can read email_outbox; queued emails may contain one-time secrets"
  );

  const { data: pushRows, error: pushError } = await session.client
    .from("push_subscriptions")
    .select("user_id")
    .limit(1000);

  assert(!pushError, `Push subscription scope check failed: ${pushError?.message}`);
  assert(
    (pushRows ?? []).every((row) => row.user_id === session.user.id),
    "Member can read another Member's push subscription metadata"
  );
}


async function assertPaymentConfirmationTablesArePrivate(session) {
  for (const table of [
    "dojo_receiving_accounts",
    "membership_payment_confirmations",
  ]) {
    const { error } = await session.client.from(table).select("*").limit(1);

    assert(
      isPermissionDenied(error),
      `${table} is directly readable; payment details must be accessed through scoped RPCs`
    );
  }
}


async function assertMemberCannotCallPrivilegedMutation(session) {
  const { error } = await session.client.rpc("set_grading_assessor_status", {
    target_user_id: crypto.randomUUID(),
    new_is_grading_assessor: true,
  });

  assert(isAssessorAuthorizationDenied(error), "Assessor RPC did not return the expected authorization denial");
}


async function main() {
  loadLocalEnvironment();

  const { url, mode, allowMutationProbe } = validateSecurityTarget(process.env);
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Validate every credential before making any Auth request. One-time sessions
  // let an outbound-isolated staging project stay email-disabled during checks.
  const roles = ["MEMBER", "ADMIN", "SUPER"];
  const credentials = roles.map((role) => resolveSecurityCredential(process.env, role));
  const signIns = await Promise.allSettled(
    roles.map((role, index) => signIn(url, key, role, credentials[index]))
  );
  const signInFailure = signIns.find((result) => result.status === "rejected");
  if (signInFailure) {
    await Promise.allSettled(signIns.filter((result) => result.status === "fulfilled")
      .map((result) => result.value.client.auth.signOut({ scope: "local" })));
    throw signInFailure.reason;
  }
  const [member, admin, superAdmin] = signIns.map((result) => result.value);

  const checks = [
    ["Member role flag", () => assertSuperAdminFlag(member, false, "Member")],
    ["Admin role flag", () => assertSuperAdminFlag(admin, false, "Admin")],
    ["Super Admin role flag", () => assertSuperAdminFlag(superAdmin, true, "Super Admin")],
    ["Member row isolation", () => assertMemberCannotReadOtherMembers(member)],
    ["Scoped Admin row isolation", () => assertAdminScope(admin)],
    ["Archive view privacy", () => assertArchiveViewsArePrivate(member)],
    ["Delivery-data privacy", () => assertSensitiveDeliveryDataIsPrivate(member)],
    ["Payment-confirmation table privacy", () => assertPaymentConfirmationTablesArePrivate(member)],
    ["Finance helper caller isolation", () => assertFinanceHelperCannotImpersonate(member, admin)],
    ["Role helper caller isolation", () => assertRoleHelperCannotImpersonate(member, superAdmin)],
    ["Effective-rate privacy", () => assertEffectiveRateIsPrivate(member, admin)],
  ];

  if (allowMutationProbe) {
    checks.push(["Privileged RPC denial (staging only)", () => assertMemberCannotCallPrivilegedMutation(member)]);
  }
  console.log(`Security mode: ${mode}; ${checks.length} checks; mutation probe ${allowMutationProbe ? "enabled" : "disabled"}.`);

  const results = await Promise.allSettled(
    checks.map(([, run]) => withFutureJwtRetry(run))
  );

  await Promise.allSettled([
    member.client.auth.signOut({ scope: "local" }),
    admin.client.auth.signOut({ scope: "local" }),
    superAdmin.client.auth.signOut({ scope: "local" }),
  ]);

  const failures = [];

  results.forEach((result, index) => {
    const label = checks[index][0];

    if (result.status === "fulfilled") {
      console.log(`PASS: ${label}`);
      return;
    }

    const message =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);

    failures.push(`${label}: ${message}`);
    console.error(`FAIL: ${label}: ${message}`);
  });

  if (failures.length > 0) {
    throw new Error(`${failures.length} security smoke check(s) failed.`);
  }

  console.log("Security smoke checks passed for Member, Admin, and Super Admin.");
}


main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

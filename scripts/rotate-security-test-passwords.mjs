/**
 * Audits or rotates only the three recorded staging security-test accounts.
 * Audit is the default; mutation requires the exact --apply flag.
 */
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  passwordUpdatePayload,
  readRotationConfiguration,
  verifyExactAccountSet,
} from "./security-test-account-rotation.mjs";

function usage() {
  return [
    "Usage: node scripts/rotate-security-test-passwords.mjs [--apply]",
    "",
    "Audit-only is the default. Configuration and credentials are read only from the environment.",
    "The target is hard-limited to the recorded staging project; production is prohibited.",
  ].join("\n");
}

async function listAllUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Unable to audit staging Auth users.");
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function loadIdentityRecords(client) {
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, registration_number, is_super_admin, account_status, date_of_passing")
    .in("registration_number", ["0101", "0002", "0001"]);
  if (profileError) throw new Error("Unable to audit staging security-test profiles.");

  const userIds = (profiles ?? []).map(({ id }) => id);
  if (userIds.length === 0) return { profiles: [], assignments: [] };
  const { data: assignments, error: assignmentError } = await client
    .from("dojo_admin_assignments")
    .select("user_id, active")
    .in("user_id", userIds)
    .eq("active", true);
  if (assignmentError) throw new Error("Unable to audit staging Admin assignments.");
  return { profiles: profiles ?? [], assignments: assignments ?? [] };
}

export async function runRotation({ argv = process.argv.slice(2), env = process.env, clientFactory = createClient } = {}) {
  if (argv.includes("--help")) {
    if (argv.length !== 1) throw new Error("--help cannot be combined with other arguments.");
    console.log(usage());
    return { mode: "help", accounts: [] };
  }
  if (argv.some((argument) => argument !== "--apply") || argv.filter((argument) => argument === "--apply").length > 1) {
    throw new Error("Unknown or repeated argument; only --apply is accepted.");
  }

  const apply = argv.includes("--apply");
  const config = readRotationConfiguration(env);
  const client = clientFactory(config.url, config.secret, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const [authUsers, identityRecords] = await Promise.all([
    listAllUsers(client),
    loadIdentityRecords(client),
  ]);
  const verified = verifyExactAccountSet(
    config.accounts,
    authUsers,
    identityRecords.profiles,
    identityRecords.assignments
  );

  if (!apply) {
    console.log(`Audit passed for ${verified.map(({ label }) => label).join(", ")}.`);
    console.log("No passwords changed. Re-run with --apply only after reviewing this audit.");
    return { mode: "audit", accounts: verified.map(({ label, role }) => ({ label, role })) };
  }

  const changed = [];
  for (const account of verified) {
    const { error } = await client.auth.admin.updateUserById(
      account.userId,
      passwordUpdatePayload(account.password)
    );
    if (error) {
      throw new Error(`Password rotation failed for ${account.label}; remaining accounts were not attempted.`);
    }
    changed.push(account);
  }

  console.log(`Password rotation completed for ${changed.map(({ label }) => label).join(", ")}.`);
  return { mode: "apply", accounts: changed.map(({ label, role }) => ({ label, role })) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runRotation().catch((error) => {
    console.error(error instanceof Error ? error.message : "Security-test account rotation failed.");
    process.exitCode = 1;
  });
}

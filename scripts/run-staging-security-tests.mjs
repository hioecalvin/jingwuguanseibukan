import { spawn } from "node:child_process";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
const STAGING_ORIGIN = `https://${STAGING_PROJECT_REF}.supabase.co`;
const CONFIRMATION = "--confirm-staging";
const ACCOUNTS = Object.freeze({
  MEMBER: "0101@dummy.jingwuguan.test",
  ADMIN: "0002@dummy.jingwuguan.test",
  SUPER: "0001@dummy.jingwuguan.test",
});

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertExactTarget() {
  if (process.argv.slice(2).length !== 1 || process.argv[2] !== CONFIRMATION) {
    throw new Error(`Run only with the exact ${CONFIRMATION} confirmation flag.`);
  }
  if (required("STAGING_PROJECT_REF") !== STAGING_PROJECT_REF ||
      required("NEXT_PUBLIC_SUPABASE_URL") !== STAGING_ORIGIN) {
    throw new Error("The protected configuration does not identify the approved staging project.");
  }
  for (const [role, email] of Object.entries(ACCOUNTS)) {
    if (required(`SECURITY_TEST_${role}_EMAIL`).toLowerCase() !== email) {
      throw new Error(`${role} does not identify the approved staging-only account.`);
    }
  }
}

function runSecuritySmoke(environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/security-smoke.mjs"], {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", () => reject(new Error("Unable to start the staging security suite.")));
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error("The staging security suite was interrupted."));
      else resolve(code ?? 1);
    });
  });
}

async function createOneTimeSession(adminClient, publicKey, role, email) {
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new Error(`Unable to generate the approved ${role} one-time session; provider response suppressed.`);
  }

  const verifier = createClient(STAGING_ORIGIN, publicKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data, error } = await verifier.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.session?.access_token || !data.session.refresh_token ||
      data.user?.email?.toLowerCase() !== email) {
    throw new Error(`Unable to verify the approved ${role} one-time session; provider response suppressed.`);
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

async function revokeSession(publicKey, accessToken) {
  const response = await fetch(`${STAGING_ORIGIN}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: publicKey, authorization: `Bearer ${accessToken}` },
  });
  // The child suite signs out every local session first, so an already-invalid
  // bearer is also acceptable. Any other cleanup response remains a failure.
  if (!response.ok && ![401, 403].includes(response.status)) {
    throw new Error("One-time staging session cleanup could not be confirmed.");
  }
}

async function main() {
  assertExactTarget();
  const secret = required("SUPABASE_SECRET_KEY");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const adminClient = createClient(STAGING_ORIGIN, secret, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const sessions = {};

  try {
    for (const [role, email] of Object.entries(ACCOUNTS)) {
      sessions[role] = await createOneTimeSession(adminClient, publicKey, role, email);
    }

    const environment = { ...process.env };
    environment.SECURITY_TEST_ENVIRONMENT = "staging";
    environment.SECURITY_TEST_EXPECTED_HOST = `${STAGING_PROJECT_REF}.supabase.co`;
    environment.NEXT_PUBLIC_SUPABASE_URL = STAGING_ORIGIN;
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicKey;
    for (const role of Object.keys(ACCOUNTS)) {
      delete environment[`SECURITY_TEST_${role}_EMAIL`];
      delete environment[`SECURITY_TEST_${role}_PASSWORD`];
      environment[`SECURITY_TEST_${role}_ACCESS_TOKEN`] = sessions[role].accessToken;
      environment[`SECURITY_TEST_${role}_REFRESH_TOKEN`] = sessions[role].refreshToken;
    }

    await new Promise((resolve) => setTimeout(resolve, 30_000));
    const exitCode = await runSecuritySmoke(environment);
    if (exitCode !== 0) throw new Error("The staging security suite reported a failure.");
  } finally {
    const cleanup = await Promise.allSettled(Object.values(sessions)
      .map(({ accessToken }) => revokeSession(publicKey, accessToken)));
    if (cleanup.some(({ status }) => status === "rejected")) {
      throw new Error("One or more one-time staging sessions could not be confirmed closed.");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Staging security test runner failed.");
  process.exitCode = 1;
});

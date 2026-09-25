export const STAGING_APP_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const STAGING_SUPABASE_ORIGIN = `https://${STAGING_PROJECT_REF}.supabase.co`;
export const STAGING_BROWSER_CONFIRMATION = "--confirm-staging";
export const STAGING_BROWSER_MODE = "deployed-staging-read-only";
export const PROTECTED_STAGING_ENV_FILE = "C:\\protected\\jingwuguan-staging.env";

export const STAGING_SECURITY_ACCOUNTS = Object.freeze({
  MEMBER: "0101@dummy.jingwuguan.test",
  ADMIN: "0002@dummy.jingwuguan.test",
  SUPER: "0001@dummy.jingwuguan.test",
});

const READ_ONLY_RPCS = new Set([
  "get_active_grading_assessors",
  "get_admin_member_subscription_summary",
  "get_available_dojo_admin_assignments",
  "get_bulk_assessment_candidates",
  "get_latest_valid_rank_promotion",
  "get_latest_valid_title_appointment",
  "get_member_memorial_settings",
  "get_membership_grade_history_with_assessor",
  "get_membership_title_history",
  "get_my_last_training_sessions",
  "get_my_available_class_enrollments",
  "get_my_class_enrollment_requests",
  "get_my_membership_break_requests",
  "get_next_membership_promotion",
  "get_official_member_record",
  "get_prepared_bulk_assessment",
  "get_prepared_bulk_assessments",
]);

function value(environment, name) {
  return typeof environment[name] === "string" ? environment[name].trim() : "";
}

function required(environment, name) {
  const current = value(environment, name);
  if (!current) throw new Error(`Missing required protected variable: ${name}.`);
  return current;
}

export function parseExactStagingOrigin(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("The browser target must be a valid absolute URL.");
  }
  if (url.origin !== STAGING_APP_ORIGIN || url.protocol !== "https:" ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Refusing any browser target except the exact approved staging origin.");
  }
  return url.origin;
}

export function validateStagingBrowserInvocation(argv, environment) {
  if (argv.length !== 1 || argv[0] !== STAGING_BROWSER_CONFIRMATION) {
    throw new Error(`Run only with the exact ${STAGING_BROWSER_CONFIRMATION} confirmation flag.`);
  }
  parseExactStagingOrigin(required(environment, "NEXT_PUBLIC_SITE_URL"));
  if (required(environment, "STAGING_PROJECT_REF") !== STAGING_PROJECT_REF ||
      required(environment, "NEXT_PUBLIC_SUPABASE_URL") !== STAGING_SUPABASE_ORIGIN) {
    throw new Error("The protected configuration does not identify the approved staging backend.");
  }
  for (const [role, expectedEmail] of Object.entries(STAGING_SECURITY_ACCOUNTS)) {
    const email = required(environment, `SECURITY_TEST_${role}_EMAIL`).toLowerCase();
    required(environment, `SECURITY_TEST_${role}_PASSWORD`);
    if (email !== expectedEmail) {
      throw new Error(`${role} does not identify the approved staging-only account.`);
    }
  }
  return { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN };
}

export function stagingBrowserEnvironment(environment) {
  validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment);
  const safe = {};
  for (const [name, current] of Object.entries(environment)) {
    if (/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|CI|PLAYWRIGHT_BROWSERS_PATH)$/i.test(name) && current !== undefined) {
      safe[name] = current;
    }
  }
  for (const role of Object.keys(STAGING_SECURITY_ACCOUNTS)) {
    safe[`SECURITY_TEST_${role}_EMAIL`] = required(environment, `SECURITY_TEST_${role}_EMAIL`);
    safe[`SECURITY_TEST_${role}_PASSWORD`] = required(environment, `SECURITY_TEST_${role}_PASSWORD`);
  }
  return {
    ...safe,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    STAGING_BROWSER_MODE,
    STAGING_PROJECT_REF,
    NEXT_PUBLIC_SITE_URL: STAGING_APP_ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_ORIGIN,
  };
}

export function assertStagingBrowserRuntime(environment = process.env) {
  if (value(environment, "STAGING_BROWSER_MODE") !== STAGING_BROWSER_MODE) {
    throw new Error("Refusing a direct or unconfirmed deployed-staging browser run.");
  }
  validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment);
}

function allow(reason) {
  return { allowed: true, reason };
}

function deny(reason) {
  return { allowed: false, reason };
}

export function classifyStagingBrowserRequest(method, rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return deny("invalid URL");
  }
  const normalizedMethod = method.toUpperCase();
  if (![STAGING_APP_ORIGIN, STAGING_SUPABASE_ORIGIN].includes(url.origin)) {
    return deny("off-origin request");
  }
  if (["GET", "HEAD", "OPTIONS"].includes(normalizedMethod)) {
    return allow("read request");
  }
  if (url.origin === STAGING_APP_ORIGIN) {
    return deny("application mutation request");
  }
  if (normalizedMethod !== "POST") {
    return deny("backend mutation request");
  }
  if (url.pathname === "/auth/v1/token" &&
      ["password", "refresh_token"].includes(url.searchParams.get("grant_type") ?? "")) {
    return allow("ephemeral authentication");
  }
  if (url.pathname === "/auth/v1/logout" &&
      (!url.searchParams.has("scope") || url.searchParams.get("scope") === "local")) {
    return allow("ephemeral session cleanup");
  }
  const rpcPrefix = "/rest/v1/rpc/";
  if (url.pathname.startsWith(rpcPrefix)) {
    let rpcName = "";
    try {
      rpcName = decodeURIComponent(url.pathname.slice(rpcPrefix.length));
    } catch {
      return deny("invalid RPC name");
    }
    return READ_ONLY_RPCS.has(rpcName)
      ? allow("allowlisted read-only RPC")
      : deny("mutation or unapproved RPC");
  }
  return deny("backend mutation request");
}

export function safeRequestLabel(method, rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${method.toUpperCase()} ${url.origin}${url.pathname}`;
  } catch {
    return `${method.toUpperCase()} invalid-url`;
  }
}

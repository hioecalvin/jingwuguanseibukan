// The historical project is retired and must never be treated as production.
// Keep future production probes deliberately read-only and bind them to an
// operator-supplied project ref. This is a runner guardrail, not application auth.
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";
export const RETIRED_SUPABASE_HOST = `${RETIRED_PROJECT_REF}.supabase.co`;

export function validateSecurityTarget(environment) {
  const mode = environment.SECURITY_TEST_ENVIRONMENT;
  if (!["staging", "production-read-only"].includes(mode)) {
    throw new Error("Set SECURITY_TEST_ENVIRONMENT to staging or production-read-only explicitly.");
  }
  let url;
  try {
    url = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Use an HTTPS Supabase origin (HTTP is allowed only for loopback), without credentials or a path.");
  }
  if (environment.SECURITY_TEST_EXPECTED_HOST !== url.host) {
    throw new Error("SECURITY_TEST_EXPECTED_HOST must explicitly match the target URL host, including any port.");
  }
  if (url.hostname === RETIRED_SUPABASE_HOST) {
    throw new Error("The retired Supabase project is prohibited.");
  }
  if (mode === "production-read-only") {
    const projectRef = environment.SECURITY_TEST_PRODUCTION_PROJECT_REF?.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(projectRef ?? "") || projectRef === RETIRED_PROJECT_REF) {
      throw new Error("SECURITY_TEST_PRODUCTION_PROJECT_REF must name the exact active production project.");
    }
    if (url.hostname !== `${projectRef}.supabase.co` || url.port) {
      throw new Error("Production read-only tests require the exact hosted project origin.");
    }
  }
  return { url: url.origin, mode, allowMutationProbe: mode === "staging" };
}

export function resolveSecurityCredential(environment, role) {
  const accessToken = environment[`SECURITY_TEST_${role}_ACCESS_TOKEN`]?.trim();
  const refreshToken = environment[`SECURITY_TEST_${role}_REFRESH_TOKEN`]?.trim();
  const email = environment[`SECURITY_TEST_${role}_EMAIL`]?.trim();
  const password = environment[`SECURITY_TEST_${role}_PASSWORD`]?.trim();
  const hasSessionCredential = Boolean(accessToken || refreshToken);
  const hasPasswordCredential = Boolean(email || password);

  if (hasSessionCredential && hasPasswordCredential) {
    throw new Error(`${role} must use either a one-time session or email/password, not both.`);
  }

  if (hasSessionCredential) {
    if (!accessToken || !refreshToken) {
      throw new Error(`${role} requires both access and refresh tokens.`);
    }
    return { mode: "session", accessToken, refreshToken };
  }

  if (!email || !password) {
    throw new Error(`${role} requires either a one-time session or email/password.`);
  }

  return { mode: "password", email, password };
}

export function isPermissionDenied(error) {
  // Network errors, unavailable objects, and schema-cache misses must FAIL,
  // not masquerade as successful privacy checks.
  return error?.code === "42501";
}

export function isAssessorAuthorizationDenied(error) {
  return isPermissionDenied(error) ||
    (error?.code === "P0001" && error.message === "Only Super Admin can manage grading assessors");
}

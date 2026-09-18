// Keep production probes deliberately read-only. This is a guardrail for the
// test runner, not an authorization boundary for the application itself.
export const PRODUCTION_SUPABASE_HOST = "pkmllhaavadhaozmwapz.supabase.co";

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
  if (mode === "staging" && url.hostname === PRODUCTION_SUPABASE_HOST) {
    throw new Error("The known production Supabase project cannot be used for staging tests.");
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

export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const KNOWN_PRODUCTION_PROJECT_REF = "pkmllhaavadhaozmwapz";

export const SECURITY_TEST_ACCOUNTS = Object.freeze([
  Object.freeze({
    key: "MEMBER",
    label: "Member 0101",
    memberNumber: "0101",
    role: "member",
  }),
  Object.freeze({
    key: "ADMIN",
    label: "Admin 0002",
    memberNumber: "0002",
    role: "admin",
  }),
  Object.freeze({
    key: "SUPER",
    label: "Super Admin 0001",
    memberNumber: "0001",
    role: "super_admin",
  }),
]);

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PLACEHOLDER = /(?:change[-_ ]?me|example|dummy|fixture|placeholder|password|test[-_ ]?only|unit[-_ ]?only)/i;

function required(env, name) {
  const value = typeof env[name] === "string" ? env[name].trim() : "";
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function projectRefFromHostedUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
  if (url.protocol !== "https:" || !match || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an exact hosted Supabase HTTPS origin.");
  }
  return match[1].toLowerCase();
}

function validateServerSecret(secret) {
  if (/^(?:sb_publishable_|eyJ)/.test(secret)) {
    if (secret.startsWith("sb_publishable_")) {
      throw new Error("SUPABASE_SECRET_KEY must not be a browser publishable key.");
    }
    const parts = secret.split(".");
    if (parts.length !== 3) {
      throw new Error("SUPABASE_SECRET_KEY is not a valid server credential.");
    }
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.role !== "service_role") throw new Error("wrong role");
    } catch {
      throw new Error("SUPABASE_SECRET_KEY JWT must carry the service_role claim.");
    }
    return;
  }
  if (!secret.startsWith("sb_secret_") || secret.length < 32) {
    throw new Error("SUPABASE_SECRET_KEY must be a Supabase secret or service-role credential.");
  }
}

export function validateStrongPassword(password, email, variableName) {
  if (password.length < 16 || password.length > 128) {
    throw new Error(`${variableName} must contain 16 to 128 characters.`);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error(`${variableName} must contain upper-case, lower-case, numeric, and symbol characters.`);
  }
  if (/[\u0000-\u001f\u007f]/.test(password) || PLACEHOLDER.test(password)) {
    throw new Error(`${variableName} contains a prohibited control or placeholder value.`);
  }
  const localPart = email.split("@", 1)[0];
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart.toLowerCase())) {
    throw new Error(`${variableName} must not contain its mailbox local part.`);
  }
}

export function readRotationConfiguration(env) {
  const url = required(env, "NEXT_PUBLIC_SUPABASE_URL");
  const expectedProjectRef = required(env, "STAGING_PROJECT_REF").toLowerCase();
  const projectRef = projectRefFromHostedUrl(url);
  if (expectedProjectRef !== STAGING_PROJECT_REF || projectRef !== STAGING_PROJECT_REF) {
    throw new Error("Rotation is restricted to the recorded staging project ref.");
  }
  if (expectedProjectRef === KNOWN_PRODUCTION_PROJECT_REF || projectRef === KNOWN_PRODUCTION_PROJECT_REF) {
    throw new Error("The known production project is prohibited.");
  }

  const secret = required(env, "SUPABASE_SECRET_KEY");
  validateServerSecret(secret);

  const accounts = SECURITY_TEST_ACCOUNTS.map((definition) => {
    const emailName = `SECURITY_TEST_${definition.key}_EMAIL`;
    const passwordName = `SECURITY_TEST_${definition.key}_PASSWORD`;
    const email = required(env, emailName).toLowerCase();
    if (!EMAIL.test(email)) throw new Error(`${emailName} must be a valid mailbox address.`);
    const password = required(env, passwordName);
    validateStrongPassword(password, email, passwordName);
    return { ...definition, email, password };
  });

  if (new Set(accounts.map(({ email }) => email)).size !== accounts.length) {
    throw new Error("The three security-test mailbox addresses must be distinct.");
  }
  if (new Set(accounts.map(({ password }) => password)).size !== accounts.length) {
    throw new Error("The three security-test passwords must be distinct.");
  }

  return { url, secret, projectRef, accounts };
}

function resolvedRole(profile, activeAdminUserIds) {
  if (profile.is_super_admin === true) return "super_admin";
  if (activeAdminUserIds.has(profile.id)) return "admin";
  return "member";
}

export function verifyExactAccountSet(configuredAccounts, authUsers, profiles, assignments) {
  const activeAdminUserIds = new Set(
    assignments.filter(({ active }) => active === true).map(({ user_id: userId }) => userId)
  );
  const verified = [];

  for (const account of configuredAccounts) {
    const authMatches = authUsers.filter(
      ({ email }) => typeof email === "string" && email.toLowerCase() === account.email
    );
    if (authMatches.length !== 1) {
      throw new Error(`${account.label} must match exactly one existing Auth user.`);
    }
    const user = authMatches[0];
    const profileMatches = profiles.filter(
      ({ registration_number: number }) => number === account.memberNumber
    );
    if (profileMatches.length !== 1 || profileMatches[0].id !== user.id) {
      throw new Error(`${account.label} must match exactly one profile with the expected member number.`);
    }
    const profile = profileMatches[0];
    if (profile.account_status !== "active" || profile.date_of_passing != null) {
      throw new Error(`${account.label} must be an active, living test profile.`);
    }
    if (resolvedRole(profile, activeAdminUserIds) !== account.role) {
      throw new Error(`${account.label} does not resolve to its expected application role.`);
    }
    verified.push({ ...account, userId: user.id });
  }

  if (new Set(verified.map(({ userId }) => userId)).size !== configuredAccounts.length) {
    throw new Error("Each security-test identity must resolve to a different Auth user.");
  }
  return verified;
}

export function passwordUpdatePayload(password) {
  return { password };
}

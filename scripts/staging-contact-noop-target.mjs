import {
  STAGING_APP_ORIGIN,
  STAGING_PROJECT_REF,
  STAGING_SECURITY_ACCOUNTS,
  STAGING_SUPABASE_ORIGIN,
  classifyStagingBrowserRequest,
  parseExactStagingOrigin,
} from './staging-browser-target.mjs';

export const STAGING_CONTACT_NOOP_CONFIRMATION = '--confirm-staging-contact-noop';
export const STAGING_CONTACT_NOOP_MODE = 'deployed-staging-contact-noop';

const SAFE_PARENT_NAMES = /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|CI|PLAYWRIGHT_BROWSERS_PATH)$/i;

function value(environment, name) {
  return typeof environment[name] === 'string' ? environment[name].trim() : '';
}

function required(environment, name) {
  const current = value(environment, name);
  if (!current) throw new Error(`Missing required protected variable: ${name}.`);
  return current;
}

function deny(reason) {
  return { allowed: false, reason };
}

function exactKeys(body, names) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return JSON.stringify(Object.keys(body).sort()) === JSON.stringify([...names].sort());
}

export function normalizeContactPhone(raw) {
  let normalized = typeof raw === 'string' ? raw.trim() : '';
  normalized = normalized.replace(/[\s().-]+/g, '');
  if (normalized.startsWith('00')) normalized = `+${normalized.slice(2)}`;
  const digits = normalized.replace(/[^0-9]/g, '');
  if (!/^\+?[0-9]+$/.test(normalized) || digits.length < 7 || digits.length > 15) {
    throw new Error('The staging Member phone baseline is not valid.');
  }
  return normalized;
}

export function normalizeContactInstagram(raw) {
  const normalized = (typeof raw === 'string' ? raw.trim() : '')
    .replace(/^@+/, '')
    .toLowerCase();
  if (!normalized) return null;
  if (normalized.length > 30 ||
      !/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(normalized) ||
      normalized.includes('..')) {
    throw new Error('The staging Member Instagram baseline is not valid.');
  }
  return normalized;
}

export function canonicalContactBaseline(phone, instagram) {
  const suppliedPhone = typeof phone === 'string' ? phone : '';
  const suppliedInstagram = instagram == null ? null : String(instagram);
  const normalizedPhone = normalizeContactPhone(suppliedPhone);
  const normalizedInstagram = normalizeContactInstagram(suppliedInstagram);
  if (suppliedPhone !== normalizedPhone || suppliedInstagram !== normalizedInstagram) {
    throw new Error('The staging Member contact baseline is not already canonical.');
  }
  return Object.freeze({ phone: normalizedPhone, instagram: normalizedInstagram });
}

export function validateStagingContactNoopInvocation(argv, environment) {
  if (argv.length !== 1 || argv[0] !== STAGING_CONTACT_NOOP_CONFIRMATION) {
    throw new Error(`Run only with the exact ${STAGING_CONTACT_NOOP_CONFIRMATION} confirmation flag.`);
  }
  parseExactStagingOrigin(required(environment, 'NEXT_PUBLIC_SITE_URL'));
  if (required(environment, 'STAGING_PROJECT_REF') !== STAGING_PROJECT_REF ||
      required(environment, 'NEXT_PUBLIC_SUPABASE_URL') !== STAGING_SUPABASE_ORIGIN) {
    throw new Error('The contact no-op run is not pinned to the approved staging backend.');
  }
  if (required(environment, 'SECURITY_TEST_MEMBER_EMAIL').toLowerCase() !==
      STAGING_SECURITY_ACCOUNTS.MEMBER) {
    throw new Error('MEMBER does not identify the approved staging-only account.');
  }
  required(environment, 'SECURITY_TEST_MEMBER_PASSWORD');
  return { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN };
}

export function stagingContactNoopEnvironment(environment, baseline) {
  validateStagingContactNoopInvocation([STAGING_CONTACT_NOOP_CONFIRMATION], environment);
  const canonical = canonicalContactBaseline(baseline?.phone, baseline?.instagram);
  const safe = {};
  for (const [name, current] of Object.entries(environment)) {
    if (SAFE_PARENT_NAMES.test(name) && current !== undefined) safe[name] = current;
  }
  return {
    ...safe,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    STAGING_BROWSER_MODE: STAGING_CONTACT_NOOP_MODE,
    STAGING_PROJECT_REF,
    NEXT_PUBLIC_SITE_URL: STAGING_APP_ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_ORIGIN,
    SECURITY_TEST_MEMBER_EMAIL: required(environment, 'SECURITY_TEST_MEMBER_EMAIL'),
    SECURITY_TEST_MEMBER_PASSWORD: required(environment, 'SECURITY_TEST_MEMBER_PASSWORD'),
    STAGING_CONTACT_BASELINE_PHONE: canonical.phone,
    STAGING_CONTACT_BASELINE_INSTAGRAM: canonical.instagram ?? '',
    STAGING_CONTACT_BASELINE_INSTAGRAM_IS_NULL: canonical.instagram == null ? '1' : '0',
  };
}

export function assertStagingContactNoopTarget(environment = process.env) {
  if (value(environment, 'STAGING_BROWSER_MODE') !== STAGING_CONTACT_NOOP_MODE) {
    throw new Error('Refusing a direct or unconfirmed staging contact no-op run.');
  }
  validateStagingContactNoopInvocation(
    [STAGING_CONTACT_NOOP_CONFIRMATION],
    environment,
  );
  canonicalContactBaseline(
    value(environment, 'STAGING_CONTACT_BASELINE_PHONE'),
    value(environment, 'STAGING_CONTACT_BASELINE_INSTAGRAM_IS_NULL') === '1'
      ? null
      : value(environment, 'STAGING_CONTACT_BASELINE_INSTAGRAM'),
  );
}

function explicitReadRequest(method, url) {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === 'OPTIONS') {
    return { allowed: true, reason: 'exact-origin preflight' };
  }
  if (!['GET', 'HEAD'].includes(normalizedMethod)) return null;

  if (url.origin === STAGING_APP_ORIGIN) {
    const pathAllowed = [
      '/',
      '/login',
      '/profile',
      '/repository',
      '/calendar',
      '/schedules',
      '/directory',
      '/notifications',
      '/subscription',
      '/favicon.ico',
    ].includes(url.pathname) ||
      url.pathname.startsWith('/_next/');
    return pathAllowed
      ? { allowed: true, reason: 'allowlisted staging document or static asset' }
      : deny('unapproved staging application read path');
  }

  const pathAllowed = ['/auth/v1/settings', '/auth/v1/user'].includes(url.pathname) ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/storage/v1/object/');
  return pathAllowed
    ? { allowed: true, reason: 'allowlisted staging backend read path' }
    : deny('unapproved staging backend read path');
}

export function classifyStagingContactNoopRequest(method, rawUrl, body, state) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return deny('invalid URL');
  }
  if (![STAGING_APP_ORIGIN, STAGING_SUPABASE_ORIGIN].includes(url.origin)) {
    return deny('off-origin request');
  }

  const readDecision = explicitReadRequest(method, url);
  if (readDecision) return readDecision;

  const ordinary = classifyStagingBrowserRequest(method, rawUrl);
  if (ordinary.allowed) return ordinary;

  if (method.toUpperCase() !== 'POST' || url.origin !== STAGING_SUPABASE_ORIGIN ||
      url.pathname !== '/rest/v1/rpc/update_my_contact_details_if_unchanged') {
    return ordinary;
  }

  let baseline;
  try {
    baseline = canonicalContactBaseline(state?.phone, state?.instagram);
  } catch {
    return deny('invalid contact no-op baseline state');
  }
  const valid = state?.phase === 'new' && state?.inFlight !== true &&
    exactKeys(body, [
      'expected_phone',
      'expected_instagram_username',
      'new_phone',
      'new_instagram_username',
    ]) &&
    body.expected_phone === baseline.phone &&
    body.expected_instagram_username === baseline.instagram &&
    body.new_phone === baseline.phone &&
    body.new_instagram_username === (baseline.instagram ?? '');
  return valid
    ? { allowed: true, mutation: 'contact-noop', reason: 'exact contact no-op payload' }
    : deny('contact no-op payload does not match the captured baseline');
}

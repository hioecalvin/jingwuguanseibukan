import {
  STAGING_APP_ORIGIN,
  STAGING_BROWSER_CONFIRMATION,
  STAGING_PROJECT_REF,
  STAGING_SUPABASE_ORIGIN,
  classifyStagingBrowserRequest,
  stagingBrowserEnvironment,
  validateStagingBrowserInvocation,
} from './staging-browser-target.mjs';

export const STAGING_LAST_TRAINING_CONFIRMATION = '--confirm-staging-last-training';
export const STAGING_LAST_TRAINING_MODE = 'deployed-staging-last-training';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value) {
  if (!ISO_DATE.test(value ?? '')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function value(environment, name) {
  return typeof environment[name] === 'string' ? environment[name].trim() : '';
}

function deny(reason) {
  return { allowed: false, reason };
}

function exactKeys(body, names) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return JSON.stringify(Object.keys(body).sort()) === JSON.stringify([...names].sort());
}

export function lastTrainingFixture({ membershipId, correctionDate, businessToday }) {
  if (!UUID.test(membershipId ?? '')) throw new Error('A valid staging membership UUID is required.');
  if (!isIsoDate(correctionDate) || !isIsoDate(businessToday) ||
      correctionDate >= businessToday) {
    throw new Error('The staging last-training fixture requires a past correction date and business date.');
  }
  return Object.freeze({ membershipId, correctionDate, businessToday, memberNumber: '0101' });
}

export function validateStagingLastTrainingInvocation(argv, environment) {
  if (argv.length !== 1 || argv[0] !== STAGING_LAST_TRAINING_CONFIRMATION) {
    throw new Error(`Run only with the exact ${STAGING_LAST_TRAINING_CONFIRMATION} confirmation flag.`);
  }
  validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment);
  return { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN };
}

export function stagingLastTrainingEnvironment(environment, fixtureInput) {
  validateStagingLastTrainingInvocation([STAGING_LAST_TRAINING_CONFIRMATION], environment);
  const fixture = lastTrainingFixture(fixtureInput);
  return {
    ...stagingBrowserEnvironment(environment),
    STAGING_BROWSER_MODE: STAGING_LAST_TRAINING_MODE,
    STAGING_LAST_TRAINING_MEMBERSHIP_ID: fixture.membershipId,
    STAGING_LAST_TRAINING_CORRECTION_DATE: fixture.correctionDate,
    STAGING_LAST_TRAINING_BUSINESS_TODAY: fixture.businessToday,
  };
}

export function lastTrainingFixtureFromEnvironment(environment = process.env) {
  return lastTrainingFixture({
    membershipId: value(environment, 'STAGING_LAST_TRAINING_MEMBERSHIP_ID'),
    correctionDate: value(environment, 'STAGING_LAST_TRAINING_CORRECTION_DATE'),
    businessToday: value(environment, 'STAGING_LAST_TRAINING_BUSINESS_TODAY'),
  });
}

export function assertStagingLastTrainingRuntime(environment = process.env) {
  if (value(environment, 'STAGING_BROWSER_MODE') !== STAGING_LAST_TRAINING_MODE) {
    throw new Error('Refusing a direct or unconfirmed staging last-training run.');
  }
  validateStagingLastTrainingInvocation([STAGING_LAST_TRAINING_CONFIRMATION], environment);
  lastTrainingFixtureFromEnvironment(environment);
}

export function classifyStagingLastTrainingRequest(method, rawUrl, body, state) {
  const ordinary = classifyStagingBrowserRequest(method, rawUrl);
  if (ordinary.allowed) return ordinary;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return ordinary;
  }
  if (method.toUpperCase() !== 'POST' || url.origin !== STAGING_SUPABASE_ORIGIN) return ordinary;
  const prefix = '/rest/v1/rpc/';
  if (!url.pathname.startsWith(prefix)) return ordinary;
  const rpcName = url.pathname.slice(prefix.length);
  if (!['set_membership_last_training_session', 'mark_membership_trained_today'].includes(rpcName)) {
    return ordinary;
  }

  let fixture;
  try {
    fixture = lastTrainingFixture(state?.fixture ?? {});
  } catch {
    return deny('invalid last-training fixture state');
  }
  if (state?.inFlight === true) return deny('a last-training mutation is already in flight');

  if (rpcName === 'set_membership_last_training_session') {
    const valid = state?.phase === 'baseline' && exactKeys(body, [
      'new_training_date', 'target_membership_id',
    ]) && body.target_membership_id === fixture.membershipId &&
      body.new_training_date === fixture.correctionDate;
    return valid
      ? { allowed: true, mutation: 'correct', reason: 'exact last-training correction fixture' }
      : deny('last-training correction does not match the exact fixture');
  }

  const valid = state?.phase === 'corrected' &&
    exactKeys(body, ['target_membership_id']) &&
    body.target_membership_id === fixture.membershipId;
  return valid
    ? { allowed: true, mutation: 'today', reason: 'exact mark-trained-today fixture' }
    : deny('mark-trained-today is out of order or targets another membership');
}

export function assertStagingLastTrainingTarget(environment = process.env) {
  assertStagingLastTrainingRuntime(environment);
  if (value(environment, 'STAGING_PROJECT_REF') !== STAGING_PROJECT_REF ||
      value(environment, 'NEXT_PUBLIC_SUPABASE_URL') !== STAGING_SUPABASE_ORIGIN ||
      value(environment, 'NEXT_PUBLIC_SITE_URL') !== STAGING_APP_ORIGIN ||
      value(environment, 'SECURITY_TEST_MEMBER_EMAIL').toLowerCase() !== '0101@dummy.jingwuguan.test' ||
      value(environment, 'SECURITY_TEST_ADMIN_EMAIL').toLowerCase() !== '0002@dummy.jingwuguan.test') {
    throw new Error('The last-training run is not pinned to the approved staging targets and identities.');
  }
}

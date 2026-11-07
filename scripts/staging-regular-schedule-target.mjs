import {
  STAGING_APP_ORIGIN,
  STAGING_BROWSER_CONFIRMATION,
  STAGING_PROJECT_REF,
  STAGING_SUPABASE_ORIGIN,
  classifyStagingBrowserRequest,
  stagingBrowserEnvironment,
  validateStagingBrowserInvocation,
} from './staging-browser-target.mjs';

export const STAGING_REGULAR_SCHEDULE_CONFIRMATION = '--confirm-staging-regular-schedule';
export const STAGING_REGULAR_SCHEDULE_MODE = 'deployed-staging-regular-schedule';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const MUTATION_RPC = 'upsert_regular_class_schedule';

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

export function regularScheduleFixture({ marker, dojoId, dayOfWeek, startTime, finishTime }) {
  if (!/^JWG-STAGING-SCHEDULE-[A-Za-z0-9-]{12,}$/.test(marker ?? '')) {
    throw new Error('A unique staging regular-schedule marker is required.');
  }
  if (!UUID.test(dojoId ?? '')) throw new Error('A valid staging dojo UUID is required.');
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('The staging schedule day must be an integer from 0 to 6.');
  }
  if (!TIME.test(startTime ?? '') || !TIME.test(finishTime ?? '') || finishTime <= startTime) {
    throw new Error('The staging schedule requires a valid increasing time window.');
  }
  return Object.freeze({
    marker,
    dojoId,
    dayOfWeek,
    startTime,
    finishTime,
    initialVenue: marker,
    updatedVenue: `${marker}-UPDATED`,
    notes: `Guarded zero-residue staging schedule acceptance fixture: ${marker}.`,
  });
}

export function validateStagingRegularScheduleInvocation(argv, environment) {
  if (argv.length !== 1 || argv[0] !== STAGING_REGULAR_SCHEDULE_CONFIRMATION) {
    throw new Error(`Run only with the exact ${STAGING_REGULAR_SCHEDULE_CONFIRMATION} confirmation flag.`);
  }
  validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment);
  return { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN };
}

export function stagingRegularScheduleEnvironment(environment, fixtureInput) {
  validateStagingRegularScheduleInvocation([STAGING_REGULAR_SCHEDULE_CONFIRMATION], environment);
  const fixture = regularScheduleFixture(fixtureInput);
  return {
    ...stagingBrowserEnvironment(environment),
    STAGING_BROWSER_MODE: STAGING_REGULAR_SCHEDULE_MODE,
    STAGING_REGULAR_SCHEDULE_MARKER: fixture.marker,
    STAGING_REGULAR_SCHEDULE_DOJO_ID: fixture.dojoId,
    STAGING_REGULAR_SCHEDULE_DAY: String(fixture.dayOfWeek),
    STAGING_REGULAR_SCHEDULE_START: fixture.startTime,
    STAGING_REGULAR_SCHEDULE_FINISH: fixture.finishTime,
  };
}

export function fixtureFromEnvironment(environment = process.env) {
  return regularScheduleFixture({
    marker: value(environment, 'STAGING_REGULAR_SCHEDULE_MARKER'),
    dojoId: value(environment, 'STAGING_REGULAR_SCHEDULE_DOJO_ID'),
    dayOfWeek: Number(value(environment, 'STAGING_REGULAR_SCHEDULE_DAY')),
    startTime: value(environment, 'STAGING_REGULAR_SCHEDULE_START'),
    finishTime: value(environment, 'STAGING_REGULAR_SCHEDULE_FINISH'),
  });
}

export function assertStagingRegularScheduleRuntime(environment = process.env) {
  if (value(environment, 'STAGING_BROWSER_MODE') !== STAGING_REGULAR_SCHEDULE_MODE) {
    throw new Error('Refusing a direct or unconfirmed staging regular-schedule run.');
  }
  validateStagingRegularScheduleInvocation(
    [STAGING_REGULAR_SCHEDULE_CONFIRMATION],
    environment,
  );
  fixtureFromEnvironment(environment);
}

export function classifyStagingRegularScheduleRequest(method, rawUrl, body, state) {
  const ordinary = classifyStagingBrowserRequest(method, rawUrl);
  if (ordinary.allowed) return ordinary;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return ordinary;
  }
  if (method.toUpperCase() !== 'POST' || url.origin !== STAGING_SUPABASE_ORIGIN ||
      url.pathname !== `/rest/v1/rpc/${MUTATION_RPC}`) {
    return ordinary;
  }

  let fixture;
  try {
    fixture = regularScheduleFixture(state?.fixture ?? {});
  } catch {
    return deny('invalid regular-schedule fixture state');
  }

  const keys = [
    'target_day_of_week', 'target_dojo_id', 'target_finish_time',
    'target_instructor_id', 'target_is_active', 'target_notes',
    'target_schedule_id', 'target_start_time', 'target_venue',
  ];
  if (!exactKeys(body, keys) || state?.inFlight === true ||
      body.target_dojo_id !== fixture.dojoId ||
      body.target_day_of_week !== fixture.dayOfWeek ||
      body.target_start_time !== fixture.startTime ||
      body.target_finish_time !== fixture.finishTime ||
      body.target_instructor_id !== null || body.target_notes !== fixture.notes) {
    return deny('regular-schedule payload does not match the exact fixture');
  }

  if (state?.phase === 'new' && !state?.createdId &&
      body.target_schedule_id === null && body.target_is_active === true &&
      body.target_venue === fixture.initialVenue) {
    return { allowed: true, mutation: 'create', reason: 'exact regular-schedule create fixture' };
  }
  if (state?.phase === 'created' && UUID.test(state?.createdId ?? '') &&
      body.target_schedule_id === state.createdId && body.target_is_active === false &&
      body.target_venue === fixture.updatedVenue) {
    return { allowed: true, mutation: 'update', reason: 'exact regular-schedule update fixture' };
  }
  return deny('regular-schedule mutation is out of order or not bound to the captured UUID');
}

export function assertStagingRegularScheduleTarget(environment = process.env) {
  assertStagingRegularScheduleRuntime(environment);
  if (value(environment, 'STAGING_PROJECT_REF') !== STAGING_PROJECT_REF ||
      value(environment, 'NEXT_PUBLIC_SUPABASE_URL') !== STAGING_SUPABASE_ORIGIN ||
      value(environment, 'NEXT_PUBLIC_SITE_URL') !== STAGING_APP_ORIGIN) {
    throw new Error('The regular-schedule run is not pinned to the approved staging targets.');
  }
}

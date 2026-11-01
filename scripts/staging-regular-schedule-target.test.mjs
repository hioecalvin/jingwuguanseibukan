import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAGING_REGULAR_SCHEDULE_CONFIRMATION,
  classifyStagingRegularScheduleRequest,
  regularScheduleFixture,
  validateStagingRegularScheduleInvocation,
} from './staging-regular-schedule-target.mjs';
import { STAGING_APP_ORIGIN, STAGING_PROJECT_REF, STAGING_SUPABASE_ORIGIN } from './staging-browser-target.mjs';

const marker = 'JWG-STAGING-SCHEDULE-20260929-abcdef123456';
const dojoId = '11111111-1111-4111-8111-111111111111';
const createdId = '22222222-2222-4222-8222-222222222222';
const fixture = regularScheduleFixture({
  marker,
  dojoId,
  dayOfWeek: 6,
  startTime: '22:15',
  finishTime: '22:45',
});

const environment = {
  NEXT_PUBLIC_SITE_URL: STAGING_APP_ORIGIN,
  NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_ORIGIN,
  STAGING_PROJECT_REF,
  SECURITY_TEST_MEMBER_EMAIL: '0101@dummy.jingwuguan.test',
  SECURITY_TEST_MEMBER_PASSWORD: 'Member-Strong-Password-123!',
  SECURITY_TEST_ADMIN_EMAIL: '0002@dummy.jingwuguan.test',
  SECURITY_TEST_ADMIN_PASSWORD: 'Admin-Strong-Password-123!',
  SECURITY_TEST_SUPER_EMAIL: '0001@dummy.jingwuguan.test',
  SECURITY_TEST_SUPER_PASSWORD: 'Super-Strong-Password-123!',
};

function body(overrides = {}) {
  return {
    target_dojo_id: dojoId,
    target_day_of_week: 6,
    target_start_time: '22:15',
    target_finish_time: '22:45',
    target_instructor_id: null,
    target_venue: fixture.initialVenue,
    target_notes: fixture.notes,
    target_is_active: true,
    target_schedule_id: null,
    ...overrides,
  };
}

test('regular-schedule target requires the exact confirmation and staging target', () => {
  assert.deepEqual(
    validateStagingRegularScheduleInvocation([STAGING_REGULAR_SCHEDULE_CONFIRMATION], environment),
    { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN },
  );
  assert.throws(
    () => validateStagingRegularScheduleInvocation([], environment),
    /exact --confirm-staging-regular-schedule/,
  );
  assert.throws(
    () => validateStagingRegularScheduleInvocation(
      [STAGING_REGULAR_SCHEDULE_CONFIRMATION],
      { ...environment, STAGING_PROJECT_REF: 'pkmllhaavadhaozmwapz' },
    ),
    /approved staging backend/,
  );
});

test('request guard permits exactly one create followed by one captured-UUID update', () => {
  const endpoint = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/upsert_regular_class_schedule`;
  const state = { fixture, phase: 'new', inFlight: false };
  assert.deepEqual(
    classifyStagingRegularScheduleRequest('POST', endpoint, body(), state),
    { allowed: true, mutation: 'create', reason: 'exact regular-schedule create fixture' },
  );
  state.phase = 'created';
  state.createdId = createdId;
  assert.deepEqual(
    classifyStagingRegularScheduleRequest('POST', endpoint, body({
      target_schedule_id: createdId,
      target_is_active: false,
      target_venue: fixture.updatedVenue,
    }), state),
    { allowed: true, mutation: 'update', reason: 'exact regular-schedule update fixture' },
  );
});

test('request guard rejects wrong scope, duplicate, active update and off-origin traffic', () => {
  const endpoint = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/upsert_regular_class_schedule`;
  const newState = { fixture, phase: 'new', inFlight: false };
  assert.equal(classifyStagingRegularScheduleRequest('POST', endpoint, body({
    target_dojo_id: '33333333-3333-4333-8333-333333333333',
  }), newState).allowed, false);
  assert.equal(classifyStagingRegularScheduleRequest('POST', endpoint, body({
    target_schedule_id: createdId,
  }), newState).allowed, false);
  const createdState = { fixture, phase: 'created', createdId, inFlight: false };
  assert.equal(classifyStagingRegularScheduleRequest('POST', endpoint, body({
    target_schedule_id: createdId,
    target_venue: fixture.updatedVenue,
  }), createdState).allowed, false);
  assert.equal(classifyStagingRegularScheduleRequest(
    'POST',
    'https://pkmllhaavadhaozmwapz.supabase.co/rest/v1/rpc/upsert_regular_class_schedule',
    body(),
    newState,
  ).allowed, false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAGING_LAST_TRAINING_CONFIRMATION,
  classifyStagingLastTrainingRequest,
  lastTrainingFixture,
  validateStagingLastTrainingInvocation,
} from './staging-last-training-target.mjs';
import { STAGING_APP_ORIGIN, STAGING_PROJECT_REF, STAGING_SUPABASE_ORIGIN } from './staging-browser-target.mjs';

const membershipId = '11111111-1111-4111-8111-111111111111';
const fixture = lastTrainingFixture({
  membershipId,
  correctionDate: '2026-09-27',
  businessToday: '2026-09-29',
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

test('last-training target requires exact confirmation and staging configuration', () => {
  assert.deepEqual(
    validateStagingLastTrainingInvocation([STAGING_LAST_TRAINING_CONFIRMATION], environment),
    { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN },
  );
  assert.throws(() => validateStagingLastTrainingInvocation([], environment), /exact --confirm-staging-last-training/);
  assert.throws(() => validateStagingLastTrainingInvocation(
    [STAGING_LAST_TRAINING_CONFIRMATION],
    { ...environment, NEXT_PUBLIC_SUPABASE_URL: 'https://pkmllhaavadhaozmwapz.supabase.co' },
  ), /approved staging backend/);
  assert.throws(() => lastTrainingFixture({
    membershipId,
    correctionDate: '2026-02-30',
    businessToday: '2026-09-29',
  }), /past correction date/);
});

test('request guard permits the exact correction then mark-today state machine', () => {
  const state = { fixture, phase: 'baseline', inFlight: false };
  const correctionUrl = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/set_membership_last_training_session`;
  const todayUrl = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/mark_membership_trained_today`;
  assert.deepEqual(classifyStagingLastTrainingRequest('POST', correctionUrl, {
    target_membership_id: membershipId,
    new_training_date: fixture.correctionDate,
  }, state), {
    allowed: true,
    mutation: 'correct',
    reason: 'exact last-training correction fixture',
  });
  state.phase = 'corrected';
  assert.deepEqual(classifyStagingLastTrainingRequest('POST', todayUrl, {
    target_membership_id: membershipId,
  }, state), {
    allowed: true,
    mutation: 'today',
    reason: 'exact mark-trained-today fixture',
  });
});

test('request guard rejects wrong membership, date, order, duplicates and retired origin', () => {
  const correctionUrl = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/set_membership_last_training_session`;
  const todayUrl = `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/mark_membership_trained_today`;
  const baseline = { fixture, phase: 'baseline', inFlight: false };
  assert.equal(classifyStagingLastTrainingRequest('POST', correctionUrl, {
    target_membership_id: '22222222-2222-4222-8222-222222222222',
    new_training_date: fixture.correctionDate,
  }, baseline).allowed, false);
  assert.equal(classifyStagingLastTrainingRequest('POST', correctionUrl, {
    target_membership_id: membershipId,
    new_training_date: fixture.businessToday,
  }, baseline).allowed, false);
  assert.equal(classifyStagingLastTrainingRequest('POST', todayUrl, {
    target_membership_id: membershipId,
  }, baseline).allowed, false);
  assert.equal(classifyStagingLastTrainingRequest('POST', correctionUrl, {
    target_membership_id: membershipId,
    new_training_date: fixture.correctionDate,
  }, { ...baseline, phase: 'corrected' }).allowed, false);
  assert.equal(classifyStagingLastTrainingRequest(
    'POST',
    'https://pkmllhaavadhaozmwapz.supabase.co/rest/v1/rpc/set_membership_last_training_session',
    { target_membership_id: membershipId, new_training_date: fixture.correctionDate },
    baseline,
  ).allowed, false);
});

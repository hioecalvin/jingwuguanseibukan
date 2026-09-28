import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAGING_CONTACT_NOOP_CONFIRMATION,
  STAGING_CONTACT_NOOP_MODE,
  canonicalContactBaseline,
  classifyStagingContactNoopRequest,
  stagingContactNoopEnvironment,
  validateStagingContactNoopInvocation,
} from './staging-contact-noop-target.mjs';

function protectedEnvironment(overrides = {}) {
  return {
    NEXT_PUBLIC_SITE_URL: 'https://jingwuguanseibukan-staging.vercel.app',
    NEXT_PUBLIC_SUPABASE_URL: 'https://eomubndonbetszdbhsrj.supabase.co',
    STAGING_PROJECT_REF: 'eomubndonbetszdbhsrj',
    SECURITY_TEST_MEMBER_EMAIL: '0101@dummy.jingwuguan.test',
    SECURITY_TEST_MEMBER_PASSWORD: 'member-password',
    SECURITY_TEST_ADMIN_EMAIL: '0002@dummy.jingwuguan.test',
    SECURITY_TEST_ADMIN_PASSWORD: 'admin-password',
    SECURITY_TEST_SUPER_EMAIL: '0001@dummy.jingwuguan.test',
    SECURITY_TEST_SUPER_PASSWORD: 'super-password',
    SUPABASE_SECRET_KEY: 'must-not-cross',
    ...overrides,
  };
}

test('contact no-op requires the exact confirmation and Member identity', () => {
  assert.throws(
    () => validateStagingContactNoopInvocation([], protectedEnvironment()),
    /exact --confirm-staging-contact-noop/,
  );
  assert.throws(
    () => validateStagingContactNoopInvocation(
      [STAGING_CONTACT_NOOP_CONFIRMATION],
      protectedEnvironment({ SECURITY_TEST_MEMBER_EMAIL: 'other@example.test' }),
    ),
    /approved staging-only account/,
  );
  assert.doesNotThrow(() => validateStagingContactNoopInvocation(
    [STAGING_CONTACT_NOOP_CONFIRMATION],
    protectedEnvironment(),
  ));
});

test('canonical contact baseline rejects values that would normalize or mutate', () => {
  assert.deepEqual(canonicalContactBaseline('+628123456789', 'member.name'), {
    phone: '+628123456789',
    instagram: 'member.name',
  });
  assert.deepEqual(canonicalContactBaseline('+628123456789', null), {
    phone: '+628123456789',
    instagram: null,
  });
  assert.throws(() => canonicalContactBaseline('+62 812-345-6789', 'member.name'), /already canonical/);
  assert.throws(() => canonicalContactBaseline('+628123456789', '@Member.Name'), /already canonical/);
  assert.throws(() => canonicalContactBaseline('123', ''), /phone baseline is not valid/);
});

test('child environment carries only Member credentials and the canonical baseline', () => {
  const child = stagingContactNoopEnvironment(protectedEnvironment({
    RESEND_API_KEY: 'must-not-cross',
    EMAIL_WORKER_SECRET: 'must-not-cross',
  }), { phone: '+628123456789', instagram: null });
  assert.equal(child.STAGING_BROWSER_MODE, STAGING_CONTACT_NOOP_MODE);
  assert.equal(child.STAGING_CONTACT_BASELINE_PHONE, '+628123456789');
  assert.equal(child.STAGING_CONTACT_BASELINE_INSTAGRAM, '');
  assert.equal(child.STAGING_CONTACT_BASELINE_INSTAGRAM_IS_NULL, '1');
  assert.equal(child.SECURITY_TEST_MEMBER_EMAIL, '0101@dummy.jingwuguan.test');
  assert.equal(child.SECURITY_TEST_ADMIN_EMAIL, undefined);
  assert.equal(child.SECURITY_TEST_SUPER_EMAIL, undefined);
  assert.equal(child.SUPABASE_SECRET_KEY, undefined);
  assert.equal(child.RESEND_API_KEY, undefined);
  assert.equal(child.EMAIL_WORKER_SECRET, undefined);
});

test('request guard permits exactly one matching contact no-op RPC', () => {
  const origin = 'https://eomubndonbetszdbhsrj.supabase.co';
  const payload = {
    expected_phone: '+628123456789',
    expected_instagram_username: null,
    new_phone: '+628123456789',
    new_instagram_username: null,
  };
  const state = {
    phone: '+628123456789', instagram: null, phase: 'new', inFlight: false,
  };
  assert.equal(classifyStagingContactNoopRequest(
    'POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, payload, state,
  ).mutation, 'contact-noop');

  for (const [method, url, body, changedState] of [
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, payload, { ...state, inFlight: true }],
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, payload, { ...state, phase: 'submitted' }],
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, { ...payload, new_phone: '+628000000000' }, state],
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, { ...payload, expected_phone: '+628000000000' }, state],
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details_if_unchanged`, { ...payload, extra: true }, state],
    ['POST', `${origin}/rest/v1/rpc/update_my_contact_details`, { new_phone: payload.new_phone, new_instagram_username: null }, state],
    ['POST', `${origin}/rest/v1/rpc/mark_membership_trained_today`, {}, state],
    ['POST', 'https://jingwuguanseibukan-staging.vercel.app/api/account/change-email', {}, state],
    ['POST', 'https://api.resend.com/emails', {}, state],
  ]) {
    assert.equal(
      classifyStagingContactNoopRequest(method, url, body, changedState).allowed,
      false,
    );
  }

  assert.equal(classifyStagingContactNoopRequest(
    'GET', 'https://jingwuguanseibukan-staging.vercel.app/api/mutate', undefined, state,
  ).allowed, false);
  assert.equal(classifyStagingContactNoopRequest(
    'GET', `${origin}/functions/v1/unsafe`, undefined, state,
  ).allowed, false);
});

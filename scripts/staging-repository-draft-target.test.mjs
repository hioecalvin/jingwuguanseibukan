import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAGING_REPOSITORY_DRAFT_CONFIRMATION,
  STAGING_REPOSITORY_DRAFT_MODE,
  classifyStagingRepositoryDraftRequest,
  repositoryDraftFixture,
  stagingRepositoryDraftEnvironment,
  validateStagingRepositoryDraftInvocation,
} from './staging-repository-draft-target.mjs';

const createdId = '11111111-1111-4111-8111-111111111111';
const classId = '22222222-2222-4222-8222-222222222222';
const rankId = '33333333-3333-4333-8333-333333333333';
const tierId = '44444444-4444-4444-8444-444444444444';
const marker = 'JWG-STAGING-DRAFT-20260928-ABC123';

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

test('Repository Draft run requires the exact mutation confirmation', () => {
  assert.throws(
    () => validateStagingRepositoryDraftInvocation([], protectedEnvironment()),
    /exact --confirm-staging-repository-draft/,
  );
  assert.doesNotThrow(() => validateStagingRepositoryDraftInvocation(
    [STAGING_REPOSITORY_DRAFT_CONFIRMATION],
    protectedEnvironment(),
  ));
});

test('Repository Draft child environment is staging-pinned and carries no server/provider secret', () => {
  const child = stagingRepositoryDraftEnvironment(
    protectedEnvironment({ RESEND_API_KEY: 'must-not-cross', EMAIL_WORKER_SECRET: 'must-not-cross' }),
    marker,
  );
  assert.equal(child.STAGING_BROWSER_MODE, STAGING_REPOSITORY_DRAFT_MODE);
  assert.equal(child.STAGING_REPOSITORY_DRAFT_MARKER, marker);
  assert.equal(child.SUPABASE_SECRET_KEY, undefined);
  assert.equal(child.RESEND_API_KEY, undefined);
  assert.equal(child.EMAIL_WORKER_SECRET, undefined);
});

test('request guard permits only the exact three-step fixture state machine', () => {
  const origin = 'https://eomubndonbetszdbhsrj.supabase.co';
  const fixture = repositoryDraftFixture(marker);
  const createBody = {
    target_class: classId,
    target_rank: rankId,
    target_sub_rank: tierId,
    content_title: fixture.marker,
    content_description: fixture.description,
    provider: '',
    provider_video_id: '',
    content_status: 'draft',
    content_sort_order: fixture.initialSortOrder,
  };
  const updateBody = {
    target_content: createdId,
    content_title: fixture.updatedMarker,
    content_description: fixture.updatedDescription,
    provider: '',
    provider_video_id: '',
    content_status: 'draft',
    content_sort_order: fixture.updatedSortOrder,
  };
  assert.equal(classifyStagingRepositoryDraftRequest(
    'POST', `${origin}/rest/v1/rpc/create_repository_content`, createBody, { marker, phase: 'new', inFlight: false },
  ).mutation, 'create');
  assert.equal(classifyStagingRepositoryDraftRequest(
    'POST', `${origin}/rest/v1/rpc/update_repository_content`, updateBody, { marker, createdId, phase: 'created', inFlight: false },
  ).mutation, 'update');
  assert.equal(classifyStagingRepositoryDraftRequest(
    'POST', `${origin}/rest/v1/rpc/delete_repository_content`, { target_content: createdId }, { marker, createdId, phase: 'updated', inFlight: false },
  ).mutation, 'delete');

  for (const [url, body, state] of [
    [`${origin}/rest/v1/rpc/create_repository_content`, { ...createBody, content_status: 'published' }, { marker, phase: 'new' }],
    [`${origin}/rest/v1/rpc/create_repository_content`, createBody, { marker, phase: 'new', inFlight: true }],
    [`${origin}/rest/v1/rpc/update_repository_content`, updateBody, { marker, createdId, phase: 'new' }],
    [`${origin}/rest/v1/rpc/update_repository_content`, { ...updateBody, target_content: classId }, { marker, createdId, phase: 'created' }],
    [`${origin}/rest/v1/rpc/delete_repository_content`, { target_content: createdId }, { marker, createdId, phase: 'created' }],
    [`${origin}/rest/v1/rpc/delete_repository_content`, { target_content: classId }, { marker, createdId, phase: 'updated' }],
    [`${origin}/rest/v1/rpc/assign_repository_uploader`, {}, { marker, createdId, phase: 'updated' }],
    [`${origin}/rest/v1/content`, {}, { marker, createdId, phase: 'updated' }],
    ['https://www.youtube.com/api/upload', {}, { marker, createdId, phase: 'updated' }],
  ]) {
    assert.equal(classifyStagingRepositoryDraftRequest('POST', url, body, state).allowed, false);
  }
});

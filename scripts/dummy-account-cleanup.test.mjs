import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  classifyDummyUsers,
  cleanupConfirmationToken,
  RETIRED_PROJECT_REF,
  projectRefFromUrl,
  validateCleanupTarget,
} from './dummy-account-cleanup.mjs';

test('cleanup targets require an exact hosted project origin and expected ref', () => {
  assert.equal(projectRefFromUrl('https://stage123.supabase.co'), 'stage123');
  for (const url of ['http://stage123.supabase.co', 'https://user:x@stage123.supabase.co', 'https://stage123.supabase.co/rest/v1']) {
    assert.throws(() => projectRefFromUrl(url));
  }
  assert.throws(() => validateCleanupTarget({ url: 'https://stage123.supabase.co', environment: 'staging', expectedProjectRef: 'other' }));
});

test('the retired project is always prohibited and future production is exact', () => {
  const url = `https://${RETIRED_PROJECT_REF}.supabase.co`;
  assert.throws(() => validateCleanupTarget({ url, environment: 'staging', expectedProjectRef: RETIRED_PROJECT_REF }), /retired/);
  assert.throws(() => validateCleanupTarget({ url, environment: 'production', expectedProjectRef: RETIRED_PROJECT_REF }), /retired/);
  assert.equal(validateCleanupTarget({ url: 'https://singapore123.supabase.co', environment: 'production', expectedProjectRef: 'singapore123' }), 'singapore123');
  assert.throws(() => validateCleanupTarget({ url: 'https://singapore123.supabase.co', environment: 'production', expectedProjectRef: 'other' }));
});

test('only accounts with both independent seed markers are deletion candidates', () => {
  const users = [
    { id: 'one', email: '0001@dummy.jingwuguan.test', user_metadata: { dummy_account: true } },
    { id: 'two', email: 'real@example.com', user_metadata: { dummy_account: true } },
    { id: 'three', email: 'member@dummy.jingwuguan.test', user_metadata: {} },
  ];
  const result = classifyDummyUsers(users);
  assert.deepEqual(result.candidates.map((user) => user.id), ['one']);
  assert.deepEqual(result.suspicious.map((user) => user.id), ['three']);
});

test('confirmation tokens are stable but bound to the project and exact candidate set', () => {
  const users = [{ id: 'b' }, { id: 'a' }];
  const token = cleanupConfirmationToken('stage123', users);
  assert.equal(token, cleanupConfirmationToken('stage123', [...users].reverse()));
  assert.notEqual(token, cleanupConfirmationToken('other', users));
  assert.notEqual(token, cleanupConfirmationToken('stage123', [{ id: 'a' }]));
});

test('the seed is staging-only and obtains its password from protected configuration', async () => {
  const source = await readFile(new URL('./seed-dummy-users.mjs', import.meta.url), 'utf8');
  assert.match(source, /validateCleanupTarget/);
  assert.match(source, /option\("environment"\) !== "staging"/);
  assert.match(source, /process\.env\.DUMMY_ACCOUNT_PASSWORD/);
  assert.doesNotMatch(source, /JingwuguanTest2026!/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  classifyDummyUsers,
  cleanupConfirmationToken,
  KNOWN_PRODUCTION_PROJECT_REF,
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

test('the known production project cannot be disguised as staging', () => {
  const url = `https://${KNOWN_PRODUCTION_PROJECT_REF}.supabase.co`;
  assert.throws(() => validateCleanupTarget({ url, environment: 'staging', expectedProjectRef: KNOWN_PRODUCTION_PROJECT_REF }));
  assert.equal(validateCleanupTarget({ url, environment: 'production', expectedProjectRef: KNOWN_PRODUCTION_PROJECT_REF }), KNOWN_PRODUCTION_PROJECT_REF);
  assert.throws(() => validateCleanupTarget({ url: 'https://stage123.supabase.co', environment: 'production', expectedProjectRef: 'stage123' }));
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

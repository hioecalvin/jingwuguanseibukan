import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRoute } from './load-route-test.mjs';

const { adminAccessErrorMessage } = loadRoute('lib/admin-access-error.ts', {});
const fallback = 'Failed to update Administrative Access.';

test('plain PostgREST offline rejection explains the account prerequisite', () => {
  const message = adminAccessErrorMessage({
    code: '23514', message: 'Offline member cannot receive an appointment',
    details: null, hint: null,
  }, fallback);
  assert.equal(message, 'This member does not have a linked login account yet. Activate and link their account before granting dojo Admin access.');
});

test('load, grant and revoke errors retain the actual database reason', () => {
  for (const message of [
    'Only Super Admin can manage Administrator assignments',
    'Member must have a membership in this class',
    'Only Super Admin can revoke dojo administrators',
  ]) {
    assert.equal(adminAccessErrorMessage({ message }, fallback), message);
    assert.equal(adminAccessErrorMessage(new Error(message), fallback), message);
  }
});

test('missing or malformed error messages use the supplied operation fallback', () => {
  for (const error of [null, undefined, 'error', {}, { message: null }, { message: 2 }, { message: '  ' }]) {
    assert.equal(adminAccessErrorMessage(error, fallback), fallback);
    assert.equal(adminAccessErrorMessage(error, 'Failed to load Administrative Access.'), 'Failed to load Administrative Access.');
  }
});

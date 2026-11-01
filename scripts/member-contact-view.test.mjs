import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRoute } from './load-route-test.mjs';

const { filterMemberProfiles, createContactEditorState } = loadRoute(
  'lib/member-contact-view.ts', {},
);
const offline = Object.freeze({
  id: 'offline', full_name: 'Synthetic Offline Member',
  registration_number: 'JS-0099', email: null, phone: null,
});
const online = Object.freeze({
  id: 'online', full_name: 'Synthetic Online Member',
  registration_number: 'JS-0100', email: 'Member@example.invalid',
  phone: '+628123456789',
});
const records = Object.freeze([offline, online]);
const ids = (rows) => Array.from(rows, row => row.id);

test('missing contacts do not crash search, and offline members remain searchable by JS ID/name', () => {
  assert.deepEqual(ids(filterMemberProfiles(records, '  js-0099  ')), ['offline']);
  assert.deepEqual(ids(filterMemberProfiles(records, 'OFFLINE')), ['offline']);
  assert.deepEqual(ids(filterMemberProfiles(records, 'not found')), []);
});

test('online contact searches retain case-insensitive email and phone matching', () => {
  assert.deepEqual(ids(filterMemberProfiles(records, 'MEMBER@EXAMPLE.INVALID')), ['online']);
  assert.deepEqual(ids(filterMemberProfiles(records, '8123456')), ['online']);
});

test('blank search includes both offline and online rows without changing source order or objects', () => {
  const result = filterMemberProfiles(records, ' \t ');
  assert.deepEqual(ids(result), ['offline', 'online']);
  assert.equal(result[0], offline);
  assert.equal(result[1], online);
  assert.notEqual(result, records);
});

test('missing JS ID and contact fields are not searchable as literal null or undefined', () => {
  const record = { ...offline, registration_number: null };
  assert.equal(filterMemberProfiles([record], 'null').length, 0);
  assert.equal(filterMemberProfiles([record], 'undefined').length, 0);
});

test('empty form controls retain NULL in the optimistic-lock baseline and JSON transport', () => {
  const editor = createContactEditorState(Object.freeze({ phone: null, instagram_username: null }));
  assert.equal(editor.phoneInput, '');
  assert.equal(editor.instagramInput, '');
  const payload = JSON.parse(JSON.stringify({
    expected_phone: editor.baseline.phone,
    expected_instagram_username: editor.baseline.instagramUsername,
    new_phone: '+628123456789',
  }));
  assert.equal(payload.expected_phone, null);
  assert.equal(payload.expected_instagram_username, null);
  // Replacing NULL with '' would fail SQL's IS DISTINCT FROM baseline check.
  assert.notEqual(payload.expected_phone, '');
});

test('baseline preserves exact server strings rather than trimming or converting empty text to NULL', () => {
  for (const phone of ['', '  +628123456789  ']) {
    const editor = createContactEditorState({ phone, instagram_username: '' });
    assert.equal(editor.baseline.phone, phone);
    assert.equal(editor.phoneInput, phone);
    assert.equal(editor.baseline.instagramUsername, '');
  }
});

test('editing inputs does not change the captured baseline or the source record', () => {
  const contact = Object.freeze({ phone: null, instagram_username: 'member' });
  const editor = createContactEditorState(contact);
  editor.phoneInput = '+628123456789';
  editor.instagramInput = 'changed';
  assert.equal(editor.baseline.phone, null);
  assert.equal(editor.baseline.instagramUsername, 'member');
  assert.equal(contact.phone, null);
});

test('conflict refresh obtains a separate exact snapshot even when phone changes from text to NULL', () => {
  const initial = createContactEditorState({ phone: '+628123456789', instagram_username: 'first' });
  const refreshed = createContactEditorState({ phone: null, instagram_username: 'latest' });
  assert.equal(initial.baseline.phone, '+628123456789');
  assert.equal(refreshed.baseline.phone, null);
  assert.equal(refreshed.phoneInput, '');
  assert.equal(refreshed.baseline.instagramUsername, 'latest');
  assert.notEqual(initial.baseline, refreshed.baseline);
});

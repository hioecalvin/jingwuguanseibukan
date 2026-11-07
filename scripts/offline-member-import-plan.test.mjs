import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareOfflineMemberImport } from './offline-member-import-plan.mjs';

const references = { classes: [{ name: 'Aikido', dojoNames: ['Chushin'], active: true },
  { name: 'Bagua', dojoNames: ['Zhongxin'], active: false }],
dojos: [{ name: 'Chushin' }, { name: 'Zhongxin' }],
ranks: [{ className: 'Aikido', name: 'Kyu 5' }, { className: 'Bagua', name: 'Chuyi' }] };
const options = { asOf: '2026-10-16', blankTerminationMeansNotTerminated: true,
  unknownDates: 'null', unknownGrade: 'hold', blankMembershipStatus: 'hold' };
const member = (patch = {}) => ({ sourceRow: 6, memberId: 'JS-0001A', fullName: 'Synthetic Person',
  email: null, phone: null, dateOfBirth: null, terminated: '',
  memberships: [{ className: 'Aikido', dojoName: 'Chushin', rankName: 'Kyu 5', status: 'Active' }], ...patch });
const plan = records => prepareOfflineMemberImport(records, references, options);
const holds = (record, code) => assert.ok(plan([record]).held[0]?.reasons.some(r => r.code === code));

test('offline preflight preserves JS ID, unknown dates and no-login state without mutating source', () => {
  const records = [member()]; const before = structuredClone(records);
  const result = plan(records);
  assert.deepEqual(records, before);
  assert.equal(result.executable, false);
  assert.equal(result.ready[0].memberId, 'JS-0001A');
  assert.equal(result.ready[0].dateOfBirth, null);
  assert.equal(result.ready[0].memberships[0].joinedDate, null);
  assert.equal(result.ready[0].authUserId, null);
  assert.equal(result.ready[0].onlineAccess, false);
  assert.equal(result.summary.onlineAccountsCreated, 0);
});
test('even a supplied valid email never grants verification or login', () => {
  const result = plan([member({ email: 'person@example.invalid' })]);
  assert.equal(result.ready[0].emailVerified, false);
  assert.equal(result.ready[0].onlineAccess, false);
});
test('explicit termination disables account; approved blank leaves member active but offline', () => {
  assert.equal(plan([member({ terminated: 'Yes' })]).ready[0].accountStatus, 'disabled');
  assert.equal(plan([member()]).ready[0].accountStatus, 'active');
});
for (const rankName of ['Kyu 6', 'Kyu 7', 'Kyu 8', 'Kyu 9', 'Zongyi', '']) {
  test(`unapproved grade ${rankName || '(blank)'} holds the whole record`, () => {
    holds(member({ memberships: [{ ...member().memberships[0], rankName }] }), 'grade_requires_correction');
  });
}
test('blank membership status is not inferred, including inactive Bagua class', () => {
  holds(member({ memberships: [{ className: 'Bagua', dojoName: 'Zhongxin', rankName: 'Chuyi', status: '' }] }),
    'membership_status_requires_review');
});
test('inactive membership can preserve genuinely unknown start date', () => {
  assert.equal(plan([member({ memberships: [{ ...member().memberships[0], status: 'Inactive' }] })]).ready[0].memberships[0].inactiveSince, null);
});
test('duplicate IDs hold both records, never merge', () => {
  const result = plan([member(), member({ sourceRow: 7, fullName: 'Other Person' })]);
  assert.equal(result.ready.length, 0); assert.equal(result.held.length, 2);
});
test('duplicate emails hold both records even with different IDs and case', () => {
  const result = plan([member({ email: 'same@example.invalid' }), member({ sourceRow: 7,
    memberId: 'JS-0002', fullName: 'Another Person', email: 'SAME@example.invalid' })]);
  assert.equal(result.ready.length, 0);
});
test('same-name records require review instead of automatic identity merge', () => {
  const result = plan([member(), member({ sourceRow: 7, memberId: 'JS-0002' })]);
  assert.equal(result.held.length, 2);
});
test('orphan identity and no enrollment are held', () => {
  holds(member({ memberId: '', fullName: '' }), 'missing_member_id');
  holds(member({ memberships: [] }), 'missing_membership');
});
test('dojo/class mismatch and duplicate class cannot create enrollments', () => {
  holds(member({ memberships: [{ ...member().memberships[0], dojoName: 'Zhongxin' }] }), 'dojo_class_mismatch');
  holds(member({ memberships: [...member().memberships, ...member().memberships] }), 'duplicate_class_membership');
});
for (const field of ['authUserId', 'isSuperAdmin', 'role', 'emailVerified', 'password']) {
  test(`source cannot supply ${field}`, () => holds(member({ [field]: null }), 'forbidden_identity_or_privilege_field'));
}
test('malformed, impossible and future dates are held instead of coerced', () => {
  for (const dateOfBirth of ['2026-02-30', '2027-01-01', '01/02/2000', 40000]) {
    holds(member({ dateOfBirth }), 'invalid_birth_date');
  }
});
test('numeric phone is held to prevent lost leading zeros; valid phone stays text', () => {
  holds(member({ phone: 817123456 }), 'phone_must_be_text');
  assert.equal(plan([member({ phone: '0817123456' })]).ready[0].phone, '0817123456');
});
test('preflight requires explicit decisions, unambiguous references and unique row references', () => {
  assert.throws(() => prepareOfflineMemberImport([member()], references, {}));
  assert.throws(() => prepareOfflineMemberImport([member()], { ...references, dojos: [...references.dojos, references.dojos[0]] }, options));
  assert.throws(() => plan([member(), member()]));
});
test('hold diagnostics contain source locations, not names or contacts', () => {
  const result = plan([member({ email: 'private-invalid-address' })]);
  const output = JSON.stringify(result.held);
  assert.ok(output.includes('sourceRow'));
  assert.ok(!output.includes('Synthetic Person') && !output.includes('private-invalid-address'));
});

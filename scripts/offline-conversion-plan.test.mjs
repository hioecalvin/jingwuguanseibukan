import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareConversionPlans } from './offline-conversion-plan.mjs';
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sample = () => ({
  preflight: { mode: 'offline-dry-run', executable: false, held: [{ sourceRow: 7 }], ready: [{
    sourceRow: 6, memberId: 'JS-0901', fullName: 'Synthetic Member', email: null, phone: null,
    dateOfBirth: null, accountStatus: 'active', authUserId: null, emailVerified: false, onlineAccess: false,
    memberships: [{ className: 'Aikido', dojoName: 'Chushin', rankName: 'Kyu 5', status: 'active', joinedDate: null, inactiveSince: null }] }] },
  references: { classes: [{ id: id(1), name: 'Aikido' }],
    dojos: [{ id: id(2), classId: id(1), sourceName: 'Chushin' }], ranks: [{ id: id(3), classId: id(1), sourceName: 'Kyu 5' }] },
  source: { sha256: 'a'.repeat(64), rows: [{ rowNumber: 6, rowSha256: 'b'.repeat(64), disposition: 'pending_member_conversion' }] },
});
const run = data => prepareConversionPlans(data.preflight, data.references, data.source);
test('maps exact class-specific IDs and preserves unknowns without mutating inputs', () => {
  const input = sample(); const before = structuredClone(input); const result = run(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.summary, { members: 1, memberships: 1, held: 1, authAccounts: 0, messages: 0 });
  assert.equal(result.plans[0].reviewedPlan.memberships[0].rank_id, id(3));
  assert.equal(result.plans[0].reviewedPlan.memberships[0].joined_date, null);
  assert.equal(result.plans[0].reviewedPlan.profile.email, null);
});
test('unranked uses null; terminated and historical dates remain explicit', () => {
  const data = sample(); const m = data.preflight.ready[0]; m.accountStatus = 'disabled';
  Object.assign(m.memberships[0], { rankName: 'Unranked', status: 'inactive', inactiveSince: '2020-01-01' });
  const plan = run(data).plans[0].reviewedPlan;
  assert.equal(plan.profile.account_status, 'disabled'); assert.equal(plan.memberships[0].rank_id, null);
  assert.equal(plan.memberships[0].inactive_since, '2020-01-01');
});
for (const disposition of ['held_for_review', 'existing_owner_preserved', 'orphan_held']) {
  test(`rejects ${disposition}`, () => { const d = sample(); d.source.rows[0].disposition = disposition; assert.throws(() => run(d)); });
}
for (const memberId of ['JS-0103', 'SUPERADMIN']) {
  test(`never recreates ${memberId}`, () => { const d = sample(); d.preflight.ready[0].memberId = memberId; assert.throws(() => run(d)); });
}
test('rejects grade missing from approved definitions and ambiguous break status', () => {
  for (const patch of [{ rankName: 'Kyu 9' }, { status: 'break' }]) {
    const d = sample(); Object.assign(d.preflight.ready[0].memberships[0], patch); assert.throws(() => run(d));
  }
});
test('rejects unresolved, duplicate and cross-class references', () => {
  for (const change of [d => d.references.dojos[0].id = null,
    d => d.references.ranks[0].classId = id(9),
    d => d.references.dojos.push(d.references.dojos[0]),
    d => d.preflight.ready[0].memberships.push(d.preflight.ready[0].memberships[0])]) {
    const d = sample(); change(d); assert.throws(() => run(d));
  }
});
test('rejects changed source identity and unexpected online state', () => {
  for (const change of [d => d.source.rows[0].rowSha256 = 'invalid',
    d => d.preflight.ready.push(d.preflight.ready[0]),
    d => d.preflight.held.push({ sourceRow: 6 }),
    d => d.preflight.ready[0].emailVerified = true]) {
    const d = sample(); change(d); assert.throws(() => run(d));
  }
});

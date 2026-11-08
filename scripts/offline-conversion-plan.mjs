// Pure conversion mapping. Output contains private member data: never log it.
// This does not create configuration, query a provider or execute a migration.
const key = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
function index(rows, identity, label) {
  if (!Array.isArray(rows)) throw new Error(`Missing ${label} mapping`);
  const result = new Map();
  for (const row of rows) {
    const id = identity(row);
    if (!id || result.has(id)) throw new Error(`Ambiguous ${label} mapping`);
    result.set(id, row);
  }
  return result;
}
export function prepareConversionPlans(preflight, references, source) {
  if (preflight?.mode !== 'offline-dry-run' || preflight.executable !== false
    || !Array.isArray(preflight.ready) || !Array.isArray(preflight.held)
    || !hash(source?.sha256)) throw new Error('Reviewed preflight and source hash required');
  const classes = index(references?.classes, r => key(r.name), 'class');
  const dojos = index(references?.dojos, r => `${r.classId}|${key(r.sourceName)}`, 'dojo');
  const ranks = index(references?.ranks, r => `${r.classId}|${key(r.sourceName)}`, 'grade');
  for (const c of classes.values()) if (!uuid(c.id)) throw new Error('Unresolved class UUID');
  for (const r of [...dojos.values(), ...ranks.values()]) {
    if (!uuid(r.id) || ![...classes.values()].some(c => c.id === r.classId)) throw new Error('Unresolved class-specific mapping');
  }
  const rows = index(source.rows, r => r.rowNumber, 'source row');
  const held = new Set(preflight.held.map(r => r.sourceRow));
  const seen = new Set();
  const plans = [];
  for (const member of preflight.ready) {
    const original = rows.get(member.sourceRow);
    if (!Number.isInteger(member.sourceRow) || seen.has(member.sourceRow) || held.has(member.sourceRow)
      || original?.disposition !== 'pending_member_conversion' || !hash(original.rowSha256)) throw new Error('Ineligible or repeated source row');
    seen.add(member.sourceRow);
    if (['js-0103', 'superadmin'].includes(key(member.memberId))) throw new Error('Existing owner must be preserved');
    if (member.authUserId !== null || member.emailVerified !== false || member.onlineAccess !== false
      || !['active', 'disabled'].includes(member.accountStatus)) throw new Error('Offline identity state required');
    if (!Array.isArray(member.memberships) || member.memberships.length < 1) throw new Error('Memberships required');
    const classIds = new Set();
    const memberships = member.memberships.map(m => {
      const c = classes.get(key(m.className));
      if (!c || classIds.has(c.id)) throw new Error('Unresolved or repeated membership class');
      classIds.add(c.id);
      const d = dojos.get(`${c.id}|${key(m.dojoName)}`);
      const r = ranks.get(`${c.id}|${key(m.rankName)}`);
      const unranked = key(m.rankName) === 'unranked';
      if (!d || (!unranked && !r)) throw new Error('Unresolved dojo or approved grade');
      if (!['active', 'inactive', 'break_1', 'break_2'].includes(m.status)) throw new Error('Explicit membership status required');
      return { class_id: c.id, dojo_id: d.id, rank_id: unranked ? null : r.id,
        status: m.status, joined_date: m.joinedDate, inactive_since: m.inactiveSince };
    });
    plans.push({ sourceHash: source.sha256, sourceRow: member.sourceRow, rowHash: original.rowSha256,
      reviewedPlan: { profile: { registration_number: member.memberId, full_name: member.fullName,
        email: member.email, phone: member.phone, date_of_birth: member.dateOfBirth,
        account_status: member.accountStatus }, memberships } });
  }
  return { mode: 'reviewed-conversion-plan', executable: false, plans,
    summary: { members: plans.length, memberships: plans.reduce((n, p) => n + p.reviewedPlan.memberships.length, 0),
      held: held.size, authAccounts: 0, messages: 0 } };
}

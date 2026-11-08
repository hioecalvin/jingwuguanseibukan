// Pure, non-sending preflight. No database/provider client, filesystem or CLI.
// Records are normalized by a separate, read-only source adapter. Never log the
// returned plans: they contain member data. Diagnostics contain only row numbers.
const text = value => typeof value === 'string' ? value.trim() : '';
const key = value => text(value).toLowerCase();
const own = (object, field) => Object.hasOwn(object, field);
const isoDate = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
};
function uniqueMap(items, label, identity) {
  if (!Array.isArray(items)) throw new Error(`Missing ${label} reference`);
  const map = new Map();
  for (const item of items) {
    const itemKey = identity(item);
    if (!itemKey || map.has(itemKey)) throw new Error(`Ambiguous ${label} reference`);
    map.set(itemKey, item);
  }
  return map;
}

export function prepareOfflineMemberImport(records, references, options) {
  if (!Array.isArray(records) || !references || options?.blankTerminationMeansNotTerminated !== true
    || options?.unknownDates !== 'null' || options?.unknownGrade !== 'hold'
    || options?.blankMembershipStatus !== 'hold') throw new Error('Explicit approved import decisions required');
  const asOf = isoDate(options.asOf);
  if (!asOf) throw new Error('Valid as-of date required');
  const classes = uniqueMap(references.classes, 'class', c => key(c.name));
  const dojos = uniqueMap(references.dojos, 'dojo', d => key(d.name));
  const ranks = uniqueMap(references.ranks, 'rank', r => key(r.className) && key(r.name) ? `${key(r.className)}|${key(r.name)}` : '');
  for (const discipline of classes.values()) {
    if (typeof discipline.active !== 'boolean' || !Array.isArray(discipline.dojoNames)
      || discipline.dojoNames.some(name => !dojos.has(key(name)))) throw new Error('Incomplete class reference');
  }
  for (const rank of ranks.values()) if (!classes.has(key(rank.className))) throw new Error('Unknown rank class reference');
  const ids = new Map();
  const emails = new Map();
  const names = new Map();
  const sourceRows = new Set();
  for (const record of records) {
    if (!record || !Number.isInteger(record.sourceRow) || record.sourceRow < 1 || sourceRows.has(record.sourceRow)) {
      throw new Error('Unique positive source row required');
    }
    sourceRows.add(record.sourceRow);
    for (const [map, value] of [[ids, key(record.memberId)], [emails, key(record.email)], [names, key(record.fullName).replace(/\s+/g, ' ')]]) {
      if (value) map.set(value, (map.get(value) ?? 0) + 1);
    }
  }
  const ready = [];
  const held = [];
  for (const record of records) {
    const reasons = [];
    const add = (code, field) => reasons.push({ code, field });
    const memberId = text(record.memberId);
    const fullName = text(record.fullName);
    const email = key(record.email) || null;
    const phone = text(record.phone) || null;
    if (!memberId) add('missing_member_id', 'memberId');
    else if (record.memberId !== memberId || /\s|[\u0000-\u001f\u007f]/.test(memberId)) add('member_id_requires_review', 'memberId');
    if (!fullName) add('missing_name', 'fullName');
    if (ids.get(key(memberId)) > 1) add('duplicate_member_id', 'memberId');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) add('invalid_email', 'email');
    if (email && emails.get(email) > 1) add('duplicate_email', 'email');
    if (names.get(key(fullName).replace(/\s+/g, ' ')) > 1) add('same_name_requires_identity_review', 'fullName');
    if (record.phone != null && typeof record.phone !== 'string') add('phone_must_be_text', 'phone');
    if (record.email != null && typeof record.email !== 'string') add('email_must_be_text', 'email');
    const terminatedValue = key(record.terminated);
    if (!['', 'yes', 'no'].includes(terminatedValue)) add('invalid_termination_flag', 'terminated');
    if (record.terminated != null && typeof record.terminated !== 'string') add('invalid_termination_flag', 'terminated');
    const dateOfBirth = isoDate(record.dateOfBirth);
    if (dateOfBirth === undefined || (dateOfBirth && dateOfBirth > asOf)) add('invalid_birth_date', 'dateOfBirth');
    const memberships = [];
    const classKeys = new Set();
    if (!Array.isArray(record.memberships) || record.memberships.length === 0) add('missing_membership', 'memberships');
    for (const [index, membership] of (Array.isArray(record.memberships) ? record.memberships : []).entries()) {
      const field = `memberships[${index}]`;
      if (!membership || typeof membership !== 'object') { add('invalid_membership', field); continue; }
      const classKey = key(membership.className);
      const discipline = classes.get(classKey);
      const dojo = dojos.get(key(membership.dojoName));
      const rank = ranks.get(`${classKey}|${key(membership.rankName)}`);
      if (classKeys.has(classKey)) add('duplicate_class_membership', field);
      classKeys.add(classKey);
      if (!discipline) add('unknown_class', field);
      if (!dojo) add('unknown_dojo', field);
      if (!rank) add('grade_requires_correction', field);
      if (discipline && dojo && (!Array.isArray(discipline.dojoNames)
        || !discipline.dojoNames.some(name => key(name) === key(dojo.name)))) add('dojo_class_mismatch', field);
      const status = key(membership.status);
      if (!['active', 'inactive', 'break', 'break_1', 'break_2'].includes(status)) add('membership_status_requires_review', field);
      if (discipline?.active === false && status === 'active') add('active_membership_in_inactive_class', field);
      const joinedDate = isoDate(membership.joinedDate);
      const inactiveSince = isoDate(membership.inactiveSince);
      if (joinedDate === undefined || (joinedDate && joinedDate > asOf)) add('invalid_joined_date', field);
      if (inactiveSince === undefined || (inactiveSince && inactiveSince > asOf)) add('invalid_inactive_date', field);
      if (inactiveSince && status !== 'inactive') add('inactive_date_status_conflict', field);
      if (joinedDate && inactiveSince && inactiveSince < joinedDate) add('inactive_before_joined', field);
      if (joinedDate && dateOfBirth && joinedDate < dateOfBirth) add('joined_before_birth', field);
      memberships.push({ className: discipline?.name, dojoName: dojo?.name, rankName: rank?.name,
        status, joinedDate: joinedDate ?? null, inactiveSince: inactiveSince ?? null });
    }
    // Unexpected privilege/link columns are never accepted from imported data.
    for (const field of ['authUserId', 'isSuperAdmin', 'role', 'emailVerified', 'password']) {
      if (own(record, field)) add('forbidden_identity_or_privilege_field', field);
    }
    if (reasons.length) held.push({ sourceRow: record.sourceRow, reasons });
    else ready.push({ sourceRow: record.sourceRow, memberId, fullName, email, phone,
      dateOfBirth: dateOfBirth ?? null, accountStatus: terminatedValue === 'yes' ? 'disabled' : 'active',
      authUserId: null, emailVerified: false, onlineAccess: false, memberships });
  }
  const summary = { sourceRecords: records.length, readyRecords: ready.length, heldRecords: held.length,
    plannedMemberships: ready.reduce((n, r) => n + r.memberships.length, 0), onlineAccountsCreated: 0 };
  return { mode: 'offline-dry-run', executable: false, summary, ready, held,
    blockers: ['Offline-member schema and security integration not yet approved for deployment',
      ...(held.length ? ['Source corrections required; no records have been imported'] : [])] };
}

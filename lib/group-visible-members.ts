type VisibleMembership = { user_id: string; membership_id: string };

// Input must already be permission-scoped. Group only those rows; never fetch
// or infer another enrollment from a display ID or a matching name.
export function groupVisibleMembers<T extends VisibleMembership>(authorized: readonly T[], matching: readonly T[]) {
  const matchingIds = new Set(matching.map(row => row.membership_id));
  const groups = new Map<string, { userId: string; memberships: T[]; preferredMembership: T }>();
  for (const row of authorized) {
    let group = groups.get(row.user_id);
    if (!group) { group = { userId: row.user_id, memberships: [], preferredMembership: row }; groups.set(row.user_id, group); }
    if (!group.memberships.some(item => item.membership_id === row.membership_id)) group.memberships.push(row);
  }
  return [...groups.values()].filter(group => {
    const preferred = group.memberships.find(row => matchingIds.has(row.membership_id));
    if (!preferred) return false;
    group.preferredMembership = preferred;
    return true;
  });
}

export type MemberSort = 'name-asc' | 'name-desc' | 'id-asc' | 'id-desc';
const memberCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const normalizedJsId = (id: string | null) => (id ?? '').trim().replace(/^JS[\s-]*/i, '').replace(/^0+(?=\d)/, '');

// Sort a copy of the groups; enrollment order and permission-scoped inputs stay intact.
export function sortMemberGroups<T extends { userId: string; preferredMembership: { full_name: string; registration_number: string | null } }>(groups: readonly T[], sort: MemberSort): T[] {
  const byId = sort.startsWith('id-');
  const direction = sort.endsWith('-desc') ? -1 : 1;
  return [...groups].sort((a, b) => {
    const left = a.preferredMembership;
    const right = b.preferredMembership;
    const leftId = normalizedJsId(left.registration_number);
    const rightId = normalizedJsId(right.registration_number);
    if (byId && Boolean(leftId) !== Boolean(rightId)) return leftId ? -1 : 1;
    const primary = memberCollator.compare(byId ? leftId : left.full_name, byId ? rightId : right.full_name);
    const secondary = memberCollator.compare(byId ? left.full_name : leftId, byId ? right.full_name : rightId);
    return primary * direction || secondary || memberCollator.compare(a.userId, b.userId);
  });
}

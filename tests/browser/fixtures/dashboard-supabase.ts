export function createClient() {
  const role = new URLSearchParams(window.location.search).get('role') ?? 'member';
  const membership = { role: role === 'member' ? 'user' : 'admin', status: 'active', level: 'mudansha', rank_id: 'rank', sub_rank_id: null, title_level: null, classes: { name: 'Aikido', title_system: 'japanese' }, dojos: { name: 'Central Dojo' }, ranks: { name: '1st Kyu' }, sub_ranks: null };
  const data: Record<string, unknown> = {
    profiles: { full_name: 'Fixture Member', registration_number: '0101', aikikai_registration_number: null, is_super_admin: role === 'super_admin' },
    class_memberships: [membership],
    dojo_admin_assignments: role === 'member' ? [] : [membership],
    announcements: [{ id: 'announcement', title: 'Training update', message: 'Bring your training equipment.', created_at: '2026-10-05T00:00:00Z', classes: { name: 'Aikido' } }],
    events: [],
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }) },
    rpc: async (name: string) => {
      if (name !== 'get_my_repository_upload_scopes') throw new Error('Unexpected fixture RPC');
      return { data: [], error: null };
    },
    from(table: string) {
      if (!(table in data)) throw new Error('Unexpected fixture table');
      const result = { data: data[table], error: null };
      const query = {
        select: () => query, eq: () => query, order: () => query, limit: () => query, gte: () => query,
        single: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  };
}

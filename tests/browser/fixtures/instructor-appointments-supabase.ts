const rows = [
  { member_id: 'one', member_name: 'First Instructor', js_id: 'JS-0001', class_id: 'a', class_name: 'Aikido', is_appointed: true, eligible: true },
  { member_id: 'two', member_name: 'Second Member', js_id: 'JS-0002', class_id: 'a', class_name: 'Aikido', is_appointed: false, eligible: true },
  { member_id: 'two', member_name: 'Second Member', js_id: 'JS-0002', class_id: 'b', class_name: 'Taijiquan', is_appointed: false, eligible: true },
];
export function createClient() {
  return { rpc: async (name: string, args: Record<string, unknown> = {}) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    if (name === 'get_class_instructor_appointments') return { data: structuredClone(rows), error: null };
    if (name === 'set_class_instructor_appointment') {
      const row = rows.find(item => item.member_id === args.target_member_id && item.class_id === args.target_class_id);
      if (!row || row.is_appointed !== args.expected_active || location.search.includes('conflict')) return { data: null, error: { code: '40001' } };
      row.is_appointed = Boolean(args.new_active);
      return { data: row.is_appointed, error: null };
    }
    throw new Error('Unexpected instructor RPC');
  } };
}

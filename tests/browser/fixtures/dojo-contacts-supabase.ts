import type { DojoContact } from '../../../lib/dojo-contact';
const query = new URLSearchParams(location.search);
let saved: DojoContact = {
  dojo_id: 'dojo-a', class_id: 'class-a', class_name: 'Fixture Class', dojo_name: 'North Dojo', active: true,
  contact_name: 'Fixture Instructor', contact_phone: '+62 (812) 555-123', instagram_username: 'fixture_dojo',
  address: 'Fixture North Address', maps_url: query.has('unsafe') ? 'https://google.com.evil.example/maps' : 'https://www.google.com/maps?q=north',
  version: 3, can_manage: query.has('admin-card'),
};
const empty = { ...saved, dojo_id: 'dojo-b', dojo_name: 'South Dojo', active: false, contact_name: null, contact_phone: null, instagram_username: null, address: null, maps_url: null, version: 0, can_manage: false };
export function createClient() {
  return { rpc: async (name: string, args: Record<string, string | number | null> = {}) => {
    if (name === 'get_dojo_contact_details') return { data: args.target_dojo_id ? [saved] : [saved, empty], error: null };
    if (name !== 'update_dojo_contact_details' || !saved.can_manage || args.target_dojo_id !== saved.dojo_id) throw new Error('Unexpected fixture operation');
    if (query.has('conflict') || args.expected_version !== saved.version) return { data: null, error: { code: '40001' } };
    const field = (key: string) => typeof args[key] === 'string' && args[key] ? String(args[key]) : null;
    saved = { ...saved, contact_name: field('new_contact_name'), contact_phone: field('new_contact_phone'), address: field('new_address'), instagram_username: field('new_instagram_username')?.replace(/^@/, '') ?? null, maps_url: field('new_maps_url'), version: saved.version + 1 };
    return { data: saved, error: null };
  }};
}

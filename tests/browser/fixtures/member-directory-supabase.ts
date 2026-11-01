let calls = 0;
const fixtureMembers = [
  { full_name: 'Zoe Example', avatar_url: null, instagram_username: 'zoe.example', enrollments: [
    { class_name: 'Aikido', home_dojo: 'West Dojo', current_rank: '2 Dan' },
    { class_name: 'Karate', home_dojo: 'East Dojo', current_rank: '1 Kyu' },
  ] },
  { full_name: 'Amy Example', avatar_url: null, instagram_username: null, enrollments: [
    { class_name: 'Karate', home_dojo: 'East Dojo', current_rank: '3 Kyu' },
  ] },
  { full_name: 'Amy Example', avatar_url: null, instagram_username: 'javascript:alert(1)', enrollments: [
    { class_name: 'Aikido', home_dojo: 'North Dojo', current_rank: '1 Dan' },
  ] },
];
export function createClient() {
  return { async rpc(name: string) {
    if (name !== 'get_my_member_directory_v2') throw new Error(`Unexpected RPC: ${name}`);
    calls++;
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'network-error' && calls === 1) throw new Error('Synthetic network failure');
    if (mode === 'rpc-error' && calls === 1) return { data: null, error: { message: 'Synthetic ACL denial' } };
    return { data: mode === 'empty' ? [] : fixtureMembers, error: null };
  } };
}

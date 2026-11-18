type Participant = { membership_id: string; member_id: string; full_name: string; dojo_name: string; rank_name: string };
const scope = { dojo_id: 'host', dojo_name: 'Home Dojo', class_name: 'Aikido', class_id: 'aikido' };
const members: Participant[] = [
  { membership_id: 'home-member', member_id: 'JS-0001', full_name: 'Home Member', dojo_name: 'Home Dojo', rank_name: '2nd Kyu' },
  { membership_id: 'visitor', member_id: 'JS-0002', full_name: 'Visiting Member', dojo_name: 'Visitor Dojo', rank_name: '1st Kyu' },
];
type FixtureSession = { id: string; version: number; dojo_id: string; dojo_name: string; class_name: string; session_date: string; details: string; duration_minutes: number; instructor_id: string; instructor_name: string; recorded_by_name: string; participants: Participant[] };
const instructors = [{id:'primary',name:'Primary Teacher',member_id:'JS-0014'},{id:'replacement',name:'Active Member Replacement',member_id:'JS-0056'}];
let sessions: FixtureSession[] = [];
const revisions: Record<string, unknown[]> = {};
let failRoster = new URLSearchParams(location.search).has('roster-fail');
export function createClient() {
  return { rpc: async (name: string, args: Record<string, unknown> = {}) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    if (name === 'get_manageable_training_scopes') return { data: [scope], error: null };
    if (name === 'get_training_sessions') return { data: structuredClone(sessions), error: null };
    if (name === 'get_training_instructor_options') return {data:{primary_instructor_id:new URLSearchParams(location.search).has('no-primary') ? null : 'primary',instructors},error:null};
    if (name === 'get_training_session_roster') {
      if (failRoster) { failRoster = false; return { data: null, error: { message: 'Private database detail' } }; }
      return { data: members, error: null };
    }
    if (name === 'save_training_session_with_instructor') {
      const id = args.target_session_id as string;
      if (new URLSearchParams(location.search).has('conflict')) return { data: null, error: { code: '40001' } };
      const version = Number(args.expected_version) + 1;
      const participants = members.filter(m => (args.attendee_membership_ids as string[]).includes(m.membership_id));
      const instructor = instructors.find(person => person.id === args.target_instructor_id);
      if (!instructor) throw new Error('Missing session instructor');
      const next = { ...scope, id, version, session_date: args.training_date as string, details: args.training_details as string, duration_minutes: Number(args.minutes), instructor_id:instructor.id,instructor_name:instructor.name,recorded_by_name:'Recording Admin', participants };
      sessions = [next, ...sessions.filter(s => s.id !== id)];
      revisions[id] = [{ version, recorded_at: new Date().toISOString(), new_values: { ...next, instructor_name_snapshot:instructor.name,attendees: participants } }, ...(revisions[id] ?? [])];
      return { data: version, error: null };
    }
    if (name === 'get_training_session_audit') return { data: revisions[args.target_session_id as string] ?? [], error: null };
    if (name === 'get_membership_training_totals') return { data: { current_training_days: 1, history: [{ rank_period: 'fixture', rank_name: '2nd Kyu', training_days: 1, duration_minutes: 60, first_session: '2026-11-05', last_session: '2026-11-05' }] }, error: null };
    throw new Error('Unexpected training RPC: ' + name);
  } };
}

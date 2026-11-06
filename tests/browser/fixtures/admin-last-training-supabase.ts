type RpcArguments = Record<string, unknown>;

type TrainingCall = {
  name: string;
  args: RpcArguments;
};

type LastTrainingFixtureState = {
  administrativeStatuses: Record<string, string>;
  administrativeChanges: RpcArguments[];
  examQueries: RpcArguments[];
  failNextExam: boolean;
  failNextTraining: boolean;
  failNextStatus: boolean;
  failNextHistory: boolean;
  historyQueries: Array<{ table: string; filters: Record<string, unknown> }>;
  trainingCalls: TrainingCall[];
};

declare global {
  interface Window {
    __lastTrainingFixture: LastTrainingFixtureState;
  }
}

const user = { id: 'fixture-super-admin' };

export const fixtureState: LastTrainingFixtureState = {
  administrativeStatuses: { 'fixture-member': 'active', 'fixture-unenrolled': 'inactive' },
  administrativeChanges: [],
  examQueries: [],
  failNextExam: false,
  failNextTraining: false,
  failNextStatus: false,
  failNextHistory: false,
  historyQueries: [],
  trainingCalls: [],
};

window.__lastTrainingFixture = fixtureState;

const member = {
  membership_id: 'fixture-membership',
  user_id: 'fixture-member',
  registration_number: '0101',
  aikikai_registration_number: null,
  full_name: 'Fixture Member',
  email: 'member@example.test',
  phone: '0812000000',
  whatsapp_number: null,
  avatar_url: null,
  date_of_birth: '2000-01-01',
  date_of_passing: new URLSearchParams(window.location.search).has('deceased') ? '2026-08-01' : null,
  account_status: 'active',
  class_id: 'fixture-class',
  class_name: 'Aikido',
  dojo_id: 'fixture-dojo',
  dojo_name: 'Fixture Dojo',
  membership_status: 'active',
  break_count: 0,
  level: 'mudansha',
  role: 'user',
  rank_id: 'fixture-rank',
  rank_name: '5th Kyu',
  sub_rank_id: null,
  sub_rank_name: null,
  joined_date: new URLSearchParams(window.location.search).has('unknown-joined') ? null : '2025-01-01',
  last_grading_date: '2026-01-15',
  last_training_session_date: '2026-08-01',
  last_training_days_ago: 57,
  title_system: 'japanese',
  title_level: null,
  title_name: null,
  has_admin_access: false,
  is_grading_assessor: false,
};

const multi = new URLSearchParams(window.location.search).has('multiple');
const fixtureMembers = multi ? [
 member,
 {...member,membership_id:'fixture-karate',class_id:'fixture-karate-class',class_name:'Karate',dojo_id:'fixture-other-dojo',dojo_name:'Second Dojo',rank_name:'4th Kyu',membership_status:'inactive'},
 {...member,membership_id:'fixture-amy',user_id:'fixture-amy-user',registration_number:'JS-0010',full_name:'Amy Member'},
 {...member,membership_id:'fixture-zara',user_id:'fixture-zara-user',registration_number:'JS-0002',full_name:'Zara Member'},
] : [member];

function resultFor(table: string, filters: Record<string, unknown> = {}, rangeStart = 0) {
  if (table === 'membership_subscription_charges' || table === 'membership_payments') {
    fixtureState.historyQueries.push({ table, filters });
    if (!fixtureMembers.some(row => row.membership_id === filters.membership_id)) throw new Error('Missing member-specific history boundary');
    if (filters.membership_id !== member.membership_id) return {data:[],error:null};
    if (fixtureState.failNextHistory) { fixtureState.failNextHistory = false; return { data: null, error: new Error('Fixture read rejected') }; }
    if (table === 'membership_subscription_charges') {
      const rows = Array.from({ length: 13 }, (_, index) => ({ id: `charge-${index}`, billing_month: `${2026 - Math.floor(index / 12)}-${String(12 - index % 12).padStart(2, '0')}-01`, amount: 100000, currency: 'IDR', status: index === 0 ? 'paid' : 'unpaid' }));
      return { data: rows.slice(rangeStart, rangeStart + 13), error: null };
    }
    const chargeIds = filters.charge_id as string[];
    return { data: chargeIds.includes('charge-0') ? [{ id: 'payment-0', charge_id: 'charge-0', payment_date: '2026-12-02', amount: 100000, currency: 'IDR', payment_reference: 'FIXTURE-PAID' }] : [], error: null };
  }
  if (table === 'profiles') {
    if (filters.id) return { data: { is_super_admin: !new URLSearchParams(window.location.search).has('dojo-admin') }, error: null };
    const rows = [{ id: member.user_id, registration_number: member.registration_number, full_name: member.full_name, account_status: 'active' }];
    if (new URLSearchParams(window.location.search).has('unenrolled')) rows.push({ id: 'fixture-unenrolled', registration_number: 'JS-0124A', full_name: 'Recovered Person', account_status: 'disabled' });
    return { data: rows.slice(rangeStart, rangeStart + 500), error: null };
  }
  if (table === 'class_memberships') return { data: fixtureMembers.map(row => ({ id: row.membership_id, user_id: row.user_id })).slice(rangeStart, rangeStart + 500), error: null };
  if (table === 'admin_visible_members') {
    return { data: fixtureMembers.map(row => ({...row})), error: null };
  }
  return { data: [], error: null };
}

function queryFor(table: string) {
  const filters: Record<string, unknown> = {};
  let rangeStart = 0;
  const query: Record<string, unknown> & PromiseLike<ReturnType<typeof resultFor>> = {
    select: () => query,
    eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    in: (key: string, value: unknown) => { filters[key] = value; return query; },
    range: (start: number) => { rangeStart = start; return query; },
    order: () => query,
    single: async () => resultFor(table, filters, rangeStart),
    then: (resolve, reject) => Promise.resolve(resultFor(table, filters, rangeStart)).then(resolve, reject),
  };
  return query;
}

export function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'fixture-access-token' } }, error: null }),
    },
    from: (table: string) => queryFor(table),
    rpc: async (name: string, args: RpcArguments = {}) => {
      if (name === 'get_member_administrative_status' || name === 'set_member_administrative_status') {
        const id = String(args.target_member_id);
        const saved = fixtureState.administrativeStatuses[id];
        if (!saved || new URLSearchParams(window.location.search).has('dojo-admin')) throw new Error('Unexpected administrative status access');
        if (name === 'get_member_administrative_status') return { data: saved, error: null };
        fixtureState.administrativeChanges.push(args);
        if (saved !== args.expected_status) return { data: null, error: new Error('Concurrent change') };
        fixtureState.administrativeStatuses[id] = String(args.new_status);
        return { data: args.new_status, error: null };
      }
      if (name === 'get_assessment_result_history') {
        fixtureState.examQueries.push(args);
        if (args.target_member_id === 'fixture-unenrolled') return { data: [{ result_id: 'recovered-exam', class_id: 'fixture-class', class_name: 'Aikido', assessment_number: '2008-0001', assessment_date: '2008-01-01', rank_before: null, rank_assessed: '6th Kyu', outcome: 'recorded_grade', assessor_name: null, dojo_name: null, notes: 'Original historical evidence' }], error: null };
        if (args.target_member_id !== 'fixture-member') return { data: [], error: null };
        if (fixtureState.failNextExam) { fixtureState.failNextExam = false; return { data: null, error: new Error('Private exam failure') }; }
        const base = { class_id: 'fixture-class', assessment_date: null, rank_before: null, assessor_name: null, dojo_name: null, assessment_number: null };
        return { data: [
          {...base, result_id: 'exam-one', rank_assessed: '5th Kyu', outcome: 'recorded_grade', assessment_number: '2019-0001', assessment_date: '2019-02-03', notes: 'Recorded value: 2019-02-03\nDate precision: date'},
          {...base, result_id: 'exam-lost', rank_assessed: '4th Kyu', outcome: 'lost_record', notes: 'Recorded value: X'},
          {...base, result_id: 'exam-skipped', rank_assessed: '3rd Kyu', outcome: 'skipped_rank', notes: 'Recorded value: >'},
          {...base, result_id: 'exam-other', class_id: 'fixture-karate-class', rank_assessed: 'Other class exam', outcome: 'pass', notes: null},
        ], error: null };
      }
      if (name === 'get_membership_grade_history_with_assessor') {
        if (!fixtureMembers.some(row => row.membership_id === args.target_membership_id)) throw new Error('Unexpected history member');
        if (args.target_membership_id !== member.membership_id) return {data:[],error:null};
        return { data: [{ id: 'grade-1', effective_date: '2026-01-15', created_at: '2026-01-15T00:00:00Z', rank_name: '5th Kyu', sub_rank_name: null, revoked_at: null, assessor_name_snapshot: 'Fixture Assessor' }], error: null };
      }
      if (['record_membership_break', 'return_membership_active', 'set_membership_inactive'].includes(name)) {
        if (args.membership_id !== member.membership_id || member.date_of_passing) throw new Error('Unexpected status member');
        fixtureState.trainingCalls.push({ name, args });
        if (fixtureState.failNextStatus) { fixtureState.failNextStatus = false; return { data: null, error: new Error('Status update rejected for retry.') }; }
        member.membership_status = name === 'record_membership_break' ? 'break_1' : name === 'return_membership_active' ? 'active' : 'inactive';
        return { data: null, error: null };
      }
      if (name === 'get_next_membership_promotion') {
        if (new URLSearchParams(window.location.search).has('promotion')) {
          const rankChange = new URLSearchParams(window.location.search).has('rank-change');
          return { data: { next_rank_id: rankChange ? 'next-rank' : member.rank_id, next_rank_name: rankChange ? '4th Kyu' : '5th Kyu', next_sub_rank_id: 'next-tier', next_sub_rank_name: 'Tier 1', next_level: 'mudansha', is_rank_promotion: rankChange }, error: null };
        }
        return { data: null, error: new Error('Member is already at the highest configured rank.') };
      }
      if (name === 'get_active_grading_assessors') {
        return { data: [], error: null };
      }
      if (name === 'mark_membership_trained_today' || name === 'set_membership_last_training_session') {
        fixtureState.trainingCalls.push({ name, args: { ...args } });
        if (fixtureState.failNextTraining) {
          fixtureState.failNextTraining = false;
          return { data: null, error: new Error('Training update rejected for retry.') };
        }

        const trainingDate = name === 'mark_membership_trained_today'
          ? '2026-09-27'
          : String(args.new_training_date ?? '');
        const daysAgo = trainingDate === '2026-09-27' ? 0 : 17;
        member.last_training_session_date = trainingDate;
        member.last_training_days_ago = daysAgo;
        return { data: [{ training_date: trainingDate, days_ago: daysAgo }], error: null };
      }
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}

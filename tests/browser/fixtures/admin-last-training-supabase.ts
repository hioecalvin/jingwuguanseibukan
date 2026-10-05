type RpcArguments = Record<string, unknown>;

type TrainingCall = {
  name: string;
  args: RpcArguments;
};

type LastTrainingFixtureState = {
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
  joined_date: '2025-01-01',
  last_grading_date: '2026-01-15',
  last_training_session_date: '2026-08-01',
  last_training_days_ago: 57,
  title_system: 'japanese',
  title_level: null,
  title_name: null,
  has_admin_access: false,
  is_grading_assessor: false,
};

function resultFor(table: string, filters: Record<string, unknown> = {}, rangeStart = 0) {
  if (table === 'membership_subscription_charges' || table === 'membership_payments') {
    fixtureState.historyQueries.push({ table, filters });
    if (filters.membership_id !== 'fixture-membership') throw new Error('Missing member-specific history boundary');
    if (fixtureState.failNextHistory) { fixtureState.failNextHistory = false; return { data: null, error: new Error('Fixture read rejected') }; }
    if (table === 'membership_subscription_charges') {
      const rows = Array.from({ length: 13 }, (_, index) => ({ id: `charge-${index}`, billing_month: `${2026 - Math.floor(index / 12)}-${String(12 - index % 12).padStart(2, '0')}-01`, amount: 100000, currency: 'IDR', status: index === 0 ? 'paid' : 'unpaid' }));
      return { data: rows.slice(rangeStart, rangeStart + 13), error: null };
    }
    const chargeIds = filters.charge_id as string[];
    return { data: chargeIds.includes('charge-0') ? [{ id: 'payment-0', charge_id: 'charge-0', payment_date: '2026-12-02', amount: 100000, currency: 'IDR', payment_reference: 'FIXTURE-PAID' }] : [], error: null };
  }
  if (table === 'profiles') {
    return { data: { is_super_admin: true }, error: null };
  }
  if (table === 'admin_visible_members') {
    return { data: [{ ...member }], error: null };
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
      if (name === 'get_membership_grade_history_with_assessor') {
        if (args.target_membership_id !== member.membership_id) throw new Error('Unexpected history member');
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

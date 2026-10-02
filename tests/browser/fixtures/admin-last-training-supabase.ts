type RpcArguments = Record<string, unknown>;

type TrainingCall = {
  name: string;
  args: RpcArguments;
};

type LastTrainingFixtureState = {
  failNextTraining: boolean;
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
  date_of_passing: null,
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

function resultFor(table: string) {
  if (table === 'profiles') {
    return { data: { is_super_admin: true }, error: null };
  }
  if (table === 'admin_visible_members') {
    return { data: [{ ...member }], error: null };
  }
  return { data: [], error: null };
}

function queryFor(table: string) {
  const query: Record<string, unknown> & PromiseLike<ReturnType<typeof resultFor>> = {
    select: () => query,
    eq: () => query,
    order: async () => resultFor(table),
    single: async () => resultFor(table),
    then: (resolve, reject) => Promise.resolve(resultFor(table)).then(resolve, reject),
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
      if (name === 'get_next_membership_promotion') {
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

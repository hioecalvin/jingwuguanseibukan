type ContactArguments = {
  new_phone: string;
  new_instagram_username: string;
};

type EmailCall = {
  authorization: string | null;
  body: { newEmail?: string };
};

export type ProfileContactFixtureState = {
  failNextContact: boolean;
  failNextEmail: boolean;
  contactCalls: ContactArguments[];
  emailCalls: EmailCall[];
  trainingRequests: number;
};

declare global {
  interface Window {
    __profileContactFixture: ProfileContactFixtureState;
  }
}

export const fixtureState: ProfileContactFixtureState = {
  failNextContact: false,
  failNextEmail: false,
  contactCalls: [],
  emailCalls: [],
  trainingRequests: 0,
};

window.__profileContactFixture = fixtureState;

const profile: {
  id: string;
  registration_number: string;
  aikikai_registration_number: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number: string | null;
  instagram_username: string | null;
  date_of_birth: string;
  avatar_url: string | null;
} = {
  id: 'fixture-member',
  registration_number: '0101',
  aikikai_registration_number: 'AIK-0101',
  full_name: 'Fixture Member',
  email: 'member@example.test',
  phone: '0812-000-000',
  whatsapp_number: null,
  instagram_username: null,
  date_of_birth: '2000-01-01',
  avatar_url: null,
};

const memberships = [
  {
    id: 'fixture-membership-aikido',
    class_id: 'fixture-class-aikido',
    dojo_id: 'fixture-dojo-aikido',
    status: 'active',
    level: 'mudansha',
    role: 'user',
    rank_id: 'fixture-rank-aikido',
    sub_rank_id: null,
    title_level: null,
    classes: {
      id: 'fixture-class-aikido',
      name: 'Aikido',
      title_system: 'japanese',
    },
    dojos: {
      id: 'fixture-dojo-aikido',
      name: 'Fixture Aikido Dojo',
    },
    ranks: {
      id: 'fixture-rank-aikido',
      name: '5th Kyu',
    },
    sub_ranks: null,
  },
  {
    id: 'fixture-membership-karate',
    class_id: 'fixture-class-karate',
    dojo_id: 'fixture-dojo-karate',
    status: 'active',
    level: 'mudansha',
    role: 'user',
    rank_id: 'fixture-rank-karate',
    sub_rank_id: null,
    title_level: null,
    classes: {
      id: 'fixture-class-karate',
      name: 'Karate',
      title_system: 'none',
    },
    dojos: {
      id: 'fixture-dojo-karate',
      name: 'Fixture Karate Dojo',
    },
    ranks: {
      id: 'fixture-rank-karate',
      name: '8th Kyu',
    },
    sub_ranks: null,
  },
] as const;

const trainingSessions = [
  {
    membership_id: 'fixture-membership-aikido',
    training_date: '2026-09-15',
    days_ago: 12,
  },
  {
    membership_id: 'fixture-membership-karate',
    training_date: '2026-08-01',
    days_ago: 57,
  },
];

function resultFor(table: string) {
  if (table === 'profiles') return { data: profile, error: null };
  if (table === 'class_memberships') return { data: memberships, error: null };
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
      getUser: async () => ({
        data: { user: { id: profile.id, email: profile.email } },
        error: null,
      }),
      getSession: async () => ({
        data: { session: { access_token: 'fixture-access-token' } },
        error: null,
      }),
    },
    from: (table: string) => queryFor(table),
    rpc: async (name: string, args?: ContactArguments) => {
      if (name === 'get_my_last_training_sessions') {
        fixtureState.trainingRequests += 1;
        if (new URLSearchParams(window.location.search).has('training-error')) {
          return { data: null, error: new Error('Training status is temporarily unavailable.') };
        }
        return { data: trainingSessions, error: null };
      }

      if (
        name === 'get_my_membership_break_requests' ||
        name === 'get_my_available_class_enrollments' ||
        name === 'get_my_class_enrollment_requests'
      ) {
        return { data: [], error: null };
      }

      if (name === 'update_my_contact_details' && args) {
        fixtureState.contactCalls.push({ ...args });
        if (fixtureState.failNextContact) {
          fixtureState.failNextContact = false;
          return { data: null, error: new Error('Contact update rejected for retry.') };
        }

        let phone = args.new_phone.trim().replace(/[\s().-]+/g, '');
        if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
        const enteredInstagram = args.new_instagram_username.trim().toLowerCase().replace(/^@/, '');
        const instagram = enteredInstagram || null;
        profile.phone = phone;
        profile.instagram_username = instagram;
        return { data: [{ phone, instagram_username: instagram }], error: null };
      }

      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Fixture upload is disabled.') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}

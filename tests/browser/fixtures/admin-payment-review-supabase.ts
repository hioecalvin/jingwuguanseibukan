type RpcArguments = Record<string, unknown>;

type PaymentReviewState = {
  failNextReview: boolean;
  reviewCalls: RpcArguments[];
};

type PaymentConfirmation = {
  confirmation_id: string;
  charge_id: string;
  membership_id: string;
  member_id: string;
  member_name: string;
  billing_month: string;
  charge_amount: number;
  transferred_amount: number;
  currency: string;
  payment_method: string;
  transfer_date: string;
  member_note: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;
};

declare global {
  interface Window {
    __paymentReviewFixture: PaymentReviewState;
  }
}

const user = { id: 'fixture-finance-admin' };

export const fixtureState: PaymentReviewState = {
  failNextReview: false,
  reviewCalls: [],
};

window.__paymentReviewFixture = fixtureState;

const scope = {
  dojo_id: 'fixture-dojo',
  dojo_name: 'Fixture Dojo',
  class_id: 'fixture-class',
  class_name: 'Aikido',
};

const confirmations: PaymentConfirmation[] = [
  {
    confirmation_id: 'fixture-approve', charge_id: 'fixture-charge-approve', membership_id: 'fixture-membership-approve',
    member_id: '0101', member_name: 'Approve Member', billing_month: '2026-08-01', charge_amount: 100000,
    transferred_amount: 100000, currency: 'IDR', payment_method: 'Bank transfer', transfer_date: '2026-09-05',
    member_note: 'August subscription', status: 'pending', created_at: '2026-09-05T03:00:00.000Z',
    reviewed_at: null, reviewed_by_name: null, rejection_reason: null,
  },
  {
    confirmation_id: 'fixture-reject', charge_id: 'fixture-charge-reject', membership_id: 'fixture-membership-reject',
    member_id: '0102', member_name: 'Reject Member', billing_month: '2026-09-01', charge_amount: 100000,
    transferred_amount: 50000, currency: 'IDR', payment_method: 'Cash', transfer_date: '2026-09-10',
    member_note: null, status: 'pending', created_at: '2026-09-10T03:00:00.000Z',
    reviewed_at: null, reviewed_by_name: null, rejection_reason: null,
  },
];

function queryFor(table: string) {
  const result = table === 'admin_visible_members'
    ? { data: [scope], error: null }
    : { data: [], error: null };
  const query: Record<string, unknown> & PromiseLike<typeof result> = {
    select: () => query,
    not: () => query,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

export function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table: string) => queryFor(table),
    rpc: async (name: string, args: RpcArguments = {}) => {
      if (name === 'get_dojo_payment_confirmations') {
        return { data: confirmations.map(row => ({ ...row })), error: null };
      }
      if (name === 'review_membership_payment_confirmation') {
        fixtureState.reviewCalls.push({ ...args });
        if (fixtureState.failNextReview) {
          fixtureState.failNextReview = false;
          return { data: null, error: new Error('Payment review rejected for retry.') };
        }
        const row = confirmations.find(item => item.confirmation_id === args.target_confirmation_id);
        if (!row) return { data: null, error: new Error('Payment confirmation not found.') };
        row.status = String(args.decision);
        row.reviewed_at = '2026-09-27T00:00:00.000Z';
        row.reviewed_by_name = 'Fixture Finance Admin';
        row.rejection_reason = args.rejection_note == null ? null : String(args.rejection_note);
        return { data: null, error: null };
      }
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}

type RpcArguments = Record<string, unknown>;

type SettlementFixtureState = {
  failNextDetails: boolean;
  failNextReview: boolean;
  detailCalls: RpcArguments[];
  reviewCalls: RpcArguments[];
};

type Settlement = {
  settlement_id: string;
  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
  settlement_month: string;
  share_percent: number;
  gross_amount: number;
  share_amount: number;
  currency: string;
  status: string;
  notes: string | null;
  submitted_by_name: string | null;
  submitted_at: string | null;
  transfer_amount: number | null;
  transfer_date: string | null;
  transfer_method: string | null;
  transfer_note: string | null;
  transfer_recorded_by_name: string | null;
  transfer_recorded_at: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  item_count: number;
};

declare global {
  interface Window {
    __settlementFixture: SettlementFixtureState;
  }
}

const user = { id: 'fixture-super-admin' };

export const fixtureState: SettlementFixtureState = {
  failNextDetails: false,
  failNextReview: false,
  detailCalls: [],
  reviewCalls: [],
};

window.__settlementFixture = fixtureState;

const config = {
  dojo_id: 'fixture-dojo', dojo_name: 'Fixture Dojo', class_id: 'fixture-class',
  class_name: 'Aikido', requires_share: true, share_percent: 20,
};

const baseSettlement = {
  dojo_id: 'fixture-dojo', dojo_name: 'Fixture Dojo', class_id: 'fixture-class',
  class_name: 'Aikido', settlement_month: '2026-09-01', share_percent: 20,
  gross_amount: 200000, share_amount: 40000, currency: 'IDR',
  submitted_by_name: 'Fixture Admin', submitted_at: '2026-09-20T03:00:00.000Z',
  transfer_amount: 40000, transfer_date: '2026-09-20', transfer_method: 'Bank Transfer',
  transfer_note: 'September share', transfer_recorded_by_name: 'Fixture Admin',
  transfer_recorded_at: '2026-09-20T02:00:00.000Z', reviewed_by_name: null,
  reviewed_at: null, rejection_reason: null, approved_at: null, item_count: 2,
};

const settlements: Settlement[] = [
  {
    ...baseSettlement,
    settlement_id: 'fixture-approve-settlement',
    status: 'submitted',
    notes: 'Approval fixture',
  },
  {
    ...baseSettlement,
    settlement_id: 'fixture-reject-settlement',
    dojo_name: 'Fixture Annex',
    status: 'submitted',
    notes: 'Rejection fixture',
  },
];

const detailRows = [
  {
    item_id: 'fixture-late-item', payment_id: 'fixture-late-payment', membership_id: 'fixture-membership-1',
    member_name: 'Late Member', member_id: 'JS-0101', billing_month: '2026-08-01',
    payment_date: '2026-09-05', is_late_payment: true, payment_amount: 100000,
    payment_method: 'Bank Transfer', payment_reference: 'LATE-REF', share_percent: 20,
    share_amount: 20000, currency: 'IDR',
  },
  {
    item_id: 'fixture-current-item', payment_id: 'fixture-current-payment', membership_id: 'fixture-membership-2',
    member_name: 'Current Member', member_id: 'JS-0102', billing_month: '2026-09-01',
    payment_date: '2026-09-10', is_late_payment: false, payment_amount: 100000,
    payment_method: 'Cash', payment_reference: 'CURRENT-REF', share_percent: 20,
    share_amount: 20000, currency: 'IDR',
  },
];

function queryFor(table: string) {
  const result = table === 'profiles'
    ? { data: { is_super_admin: true }, error: null }
    : { data: [], error: null };
  const query: Record<string, unknown> & PromiseLike<typeof result> = {
    select: () => query,
    eq: () => query,
    not: () => query,
    single: async () => result,
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
      if (name === 'get_dojo_settlement_configs') {
        return { data: [{ ...config }], error: null };
      }
      if (name === 'get_super_admin_settlements') {
        return { data: settlements.map(row => ({ ...row })), error: null };
      }
      if (name === 'get_dojo_admin_settlements') {
        return { data: [], error: null };
      }
      if (name === 'get_dojo_settlement_item_details') {
        fixtureState.detailCalls.push({ ...args });
        if (fixtureState.failNextDetails) {
          fixtureState.failNextDetails = false;
          return { data: null, error: new Error('Settlement details rejected for retry.') };
        }
        return { data: detailRows.map(row => ({ ...row })), error: null };
      }
      if (name === 'review_dojo_settlement') {
        fixtureState.reviewCalls.push({ ...args });
        if (fixtureState.failNextReview) {
          fixtureState.failNextReview = false;
          return { data: null, error: new Error('Settlement review rejected for retry.') };
        }
        const row = settlements.find(item => item.settlement_id === args.target_settlement_id);
        if (!row) return { data: null, error: new Error('Settlement not found.') };
        row.status = String(args.decision);
        row.reviewed_by_name = 'Fixture Super Admin';
        row.reviewed_at = '2026-09-27T00:00:00.000Z';
        row.rejection_reason = args.rejection_note == null ? null : String(args.rejection_note);
        row.approved_at = args.decision === 'approved' ? '2026-09-27T00:00:00.000Z' : null;
        return { data: null, error: null };
      }
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}

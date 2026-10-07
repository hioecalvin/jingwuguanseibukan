type RpcArguments = Record<string, unknown>;

type DirectPaymentState = {
  failNextPayment: boolean;
  paymentCalls: RpcArguments[];
};

declare global {
  interface Window {
    __directPaymentFixture: DirectPaymentState;
  }
}

const user = { id: 'fixture-finance-admin' };

export const fixtureState: DirectPaymentState = {
  failNextPayment: false,
  paymentCalls: [],
};

window.__directPaymentFixture = fixtureState;

const profile = {
  id: user.id,
  full_name: 'Fixture Finance Admin',
  is_super_admin: false,
};

const assignment = {
  dojo_id: 'fixture-dojo',
  class_id: 'fixture-class',
  active: true,
};

const dojo = {
  id: 'fixture-dojo',
  class_id: 'fixture-class',
  name: 'Fixture Dojo',
  active: true,
  classes: { name: 'Aikido' },
};

const member = {
  membership_id: 'fixture-membership',
  user_id: 'fixture-member',
  registration_number: '0101',
  full_name: 'Fixture Member',
  email: 'member@example.test',
  class_id: 'fixture-class',
  class_name: 'Aikido',
  dojo_id: 'fixture-dojo',
  dojo_name: 'Fixture Dojo',
  membership_status: 'active',
};

const charge = {
  id: 'fixture-charge',
  membership_id: member.membership_id,
  dojo_id: dojo.id,
  class_id: dojo.class_id,
  billing_month: '2026-09-01',
  amount: 100000,
  currency: 'IDR',
  rate_source: 'dojo_default',
  status: 'unpaid',
  generated_at: '2026-09-01T00:00:00.000Z',
};

const payments: Array<Record<string, unknown>> = [];

function resultFor(table: string) {
  if (table === 'profiles') return { data: profile, error: null };
  if (table === 'dojo_admin_assignments') return { data: [assignment], error: null };
  if (table === 'dojos') return { data: [dojo], error: null };
  if (table === 'admin_visible_members') return { data: [member], error: null };
  if (table === 'dojo_subscription_settings') {
    return {
      data: [{
        id: 'fixture-setting', dojo_id: dojo.id, class_id: dojo.class_id,
        default_fee: charge.amount, currency: charge.currency,
        effective_from: '2026-01-01', active: true,
        updated_at: '2026-01-01T00:00:00.000Z',
      }],
      error: null,
    };
  }
  if (table === 'membership_subscription_overrides') return { data: [], error: null };
  if (table === 'membership_subscription_charges') return { data: [{ ...charge }], error: null };
  if (table === 'membership_payments') return { data: payments.map(row => ({ ...row })), error: null };
  return { data: [], error: null };
}

function queryFor(table: string) {
  const query: Record<string, unknown> & PromiseLike<ReturnType<typeof resultFor>> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    not: () => query,
    order: async () => resultFor(table),
    single: async () => resultFor(table),
    then: (resolve, reject) => Promise.resolve(resultFor(table)).then(resolve, reject),
  };
  return query;
}

function summary() {
  const paid = payments.reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const fullyPaid = paid >= charge.amount;
  return {
    billing_month: charge.billing_month,
    total_members: 1,
    paid_members: fullyPaid ? 1 : 0,
    pending_confirmation_members: 0,
    partially_paid_members: paid > 0 && !fullyPaid ? 1 : 0,
    unpaid_members: paid === 0 ? 1 : 0,
    special_rate_members: 0,
    total_charged: charge.amount,
    total_collected: paid,
    total_outstanding: Math.max(charge.amount - paid, 0),
  };
}

export function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table: string) => queryFor(table),
    rpc: async (name: string, args: RpcArguments = {}) => {
      if (name === 'get_dojo_receiving_account') {
        return { data: [{ bank_name: 'Fixture Bank', account_holder_name: 'Fixture Dojo', account_number: '123456', instructions: null }], error: null };
      }
      if (name === 'get_dojo_payment_confirmations') return { data: [], error: null };
      if (name === 'get_dojo_monthly_payment_summary') return { data: [summary()], error: null };
      if (name === 'record_membership_payment') {
        fixtureState.paymentCalls.push({ ...args });
        if (fixtureState.failNextPayment) {
          fixtureState.failNextPayment = false;
          return { data: null, error: new Error('Direct payment rejected for retry.') };
        }
        payments.push({
          id: `fixture-payment-${payments.length + 1}`,
          charge_id: charge.id,
          membership_id: member.membership_id,
          dojo_id: dojo.id,
          amount: Number(args.payment_amount),
          currency: charge.currency,
          payment_method: args.payment_method_value,
          payment_reference: args.payment_reference_value,
          payment_date: args.payment_date_value,
          recorded_at: '2026-09-27T00:00:00.000Z',
          notes: args.payment_notes,
        });
        return { data: 'fixture-payment', error: null };
      }
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}

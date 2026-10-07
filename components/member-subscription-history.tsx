"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Charge = { id: string; billing_month: string; amount: number; currency: string; status: string };
type Payment = { id: string; charge_id: string; payment_date: string; amount: number; currency: string; payment_reference: string | null };
const PAGE_SIZE = 12;

/** Reads existing RLS-protected records. No fee changes or payment mutations. */
export default function MemberSubscriptionHistory({ membershipId, active }: { membershipId: string; active: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ loading: boolean; error: boolean; charges: Charge[]; payments: Payment[]; more: boolean }>({ loading: true, error: false, charges: [], payments: [], more: false });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function load() {
      setState({ loading: true, error: false, charges: [], payments: [], more: false });
      try {
        const { data, error } = await supabase.from("membership_subscription_charges")
          .select("id,billing_month,amount,currency,status")
          .eq("membership_id", membershipId).order("billing_month", { ascending: false }).order("id")
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        if (error) throw error;
        const charges = (data ?? []).slice(0, PAGE_SIZE) as Charge[];
        let payments: Payment[] = [];
        if (charges.length) {
          const response = await supabase.from("membership_payments")
            .select("id,charge_id,payment_date,amount,currency,payment_reference")
            .eq("membership_id", membershipId).in("charge_id", charges.map(charge => charge.id))
            .order("payment_date", { ascending: false });
          if (response.error) throw response.error;
          payments = (response.data ?? []) as Payment[];
        }
        if (!cancelled) setState({ loading: false, error: false, charges, payments, more: (data?.length ?? 0) > PAGE_SIZE });
      } catch {
        if (!cancelled) setState({ loading: false, error: true, charges: [], payments: [], more: false });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [active, membershipId, page, retry, supabase]);

  if (state.loading) return <p role="status">Loading subscription history…</p>;
  if (state.error) return <div><p role="alert">Subscription history could not be loaded.</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded-lg border border-neutral-600 px-3 py-2">Retry subscription history</button></div>;
  return <div>
    {!state.charges.length ? <p>No subscription charges recorded.</p> : <ul className="space-y-3">
      {state.charges.map(charge => <li key={charge.id} className="rounded-lg border border-neutral-700 p-3 text-sm">
        <p className="font-semibold">{charge.billing_month.slice(0, 7)} · {charge.currency} {Number(charge.amount).toLocaleString()} · {charge.status}</p>
        {state.payments.filter(payment => payment.charge_id === charge.id).map(payment => <p key={payment.id} className="mt-1 break-words text-neutral-300">Paid {payment.payment_date} · {payment.currency} {Number(payment.amount).toLocaleString()}{payment.payment_reference ? ` · ${payment.payment_reference}` : ""}</p>)}
      </li>)}
    </ul>}
    <div className="mt-3 flex items-center gap-3">
      <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-neutral-600 px-3 py-2 disabled:opacity-40">Newer</button>
      <span className="text-sm">Page {page + 1}</span>
      <button type="button" disabled={!state.more} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-neutral-600 px-3 py-2 disabled:opacity-40">Older</button>
    </div>
  </div>;
}

"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CompactRecord from "@/components/compact-record";

export default function ChargeFeeAdjustment({ charge, onComplete }: {
  charge: { id: string; amount: number; currency: string; billing_month: string };
  onComplete: () => Promise<void>;
}) {
  const client = useMemo(() => createClient(), []);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const latch = useRef(false);
  async function save() {
    if (latch.current || locked) return;
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !reason.trim()) {
      setMessage("Enter a nonnegative fee and a reason. Use 0 to waive this month."); return;
    }
    if (!window.confirm(`${Number(amount) === 0 ? "Waive" : "Adjust"} ${charge.billing_month.slice(0,7)} from ${charge.currency} ${charge.amount} to ${amount}? No payment will be recorded. Other months and standard rates stay unchanged.`)) return;
    latch.current = true; setBusy(true); setMessage(""); let saved = false;
    try {
      const { error } = await client.rpc("adjust_unpaid_subscription_charge", {
        target_charge_id: charge.id, expected_amount: String(charge.amount), new_amount: amount,
        adjustment_reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
      saved = true; setLocked(true);
      setMessage(Number(amount) === 0 ? "Month waived. No money recorded; other months remain due." : "Fee updated for this month only.");
      await onComplete();
    } catch (error) {
      setLocked(true);
      setMessage(saved ? "Saved. Reload to refresh the list." : `${error instanceof Error ? error.message : "Result uncertain."} Refresh and check history before retrying.`);
    } finally { latch.current = false; setBusy(false); }
  }
  return <CompactRecord summary="Adjust or waive this unpaid month" className="mt-3 rounded-lg border border-neutral-700 p-3">
    <p className="mb-2 text-sm text-neutral-400">Only {charge.billing_month.slice(0,7)}. Enter 0 to waive, not mark Paid. Original fee and reason are retained in history.</p>
    <fieldset disabled={busy || locked} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">New fee<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded border border-neutral-600 bg-neutral-950 p-2" /></label>
      <label className="text-sm">Adjustment reason<input maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded border border-neutral-600 bg-neutral-950 p-2" /></label>
      <button type="button" onClick={() => void save()} className="rounded border border-neutral-600 p-2 text-sm disabled:opacity-40">Save month adjustment</button>
    </fieldset>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </CompactRecord>;
}

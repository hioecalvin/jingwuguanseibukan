"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CompactRecord from "@/components/compact-record";

export type PaymentMembership = { id: string; label: string; unpaidMonths?: string[] };
type Quote = { membership_id: string; total: string; currency: string;
  months: { month: string; amount: string; currency: string }[] };
const control = "mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm";
const button = "rounded-lg border border-neutral-600 px-3 py-2 text-sm disabled:opacity-40";

export default function AdvancePaymentForm({ mode, memberships, onComplete }: {
  mode: "member" | "admin"; memberships: PaymentMembership[]; onComplete: () => Promise<void>;
}) {
  const client = useMemo(() => createClient(), []);
  const [membership, setMembership] = useState("");
  const [month, setMonth] = useState("");
  const [count, setCount] = useState("2");
  const [excluded, setExcluded] = useState<string[]>([]);
  const candidates = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(month) || !/^(?:[1-9]|1[0-2])$/.test(count)) return [];
    const start = new Date(`${month}-01T00:00:00Z`);
    if (!Number.isFinite(start.getTime())) return [];
    return Array.from({ length: Number(count) }, (_, n) => {
      const value = new Date(start); value.setUTCMonth(value.getUTCMonth() + n);
      return value.toISOString().slice(0, 10);
    });
  }, [month, count]);
  const selected = candidates.filter(value => !excluded.includes(value));
  const oldest = memberships.find(m => m.id === membership)?.unpaidMonths?.slice().sort()[0];
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const latch = useRef(false);
  function invalidate() { setQuote(null); setConfirmed(false); setMessage(""); }
  async function act(record: boolean) {
    if (latch.current) return;
    if (!memberships.some(m => m.id === membership) || !selected.length) {
      setMessage("Choose a membership and select 1–12 months."); return;
    }
    if (record && (!quote || !confirmed || !date || !amount || !method.trim())) {
      setMessage("Review the quote and complete the payment details and confirmation."); return;
    }
    latch.current = true; setBusy(true); setMessage("");
    let saved = false;
    try {
      const base = { target_membership_id: membership, first_month: selected[0], month_count: selected.length, requested_months: selected };
      const result = record ? await client.rpc(mode === "member" ? "submit_advance_subscription_payment" : "record_advance_subscription_payment", {
        ...base, expected_quote: quote, payment_method_value: method.trim(),
        ...(mode === "member" ? { transferred_amount: amount, transfer_date_value: date, member_note_value: note || null }
          : { received_amount: amount, payment_date_value: date, payment_reference_value: null, payment_notes: note || null }),
      }) : await client.rpc("quote_advance_subscription_payment", base);
      if (result.error) throw new Error(result.error.message);
      if (!record) { setQuote(result.data as Quote); return; }
      saved = true; setQuote(null); setConfirmed(false); setAmount("");
      setMessage(mode === "member" ? "Payment reported. Awaiting your dojo Admin’s confirmation of receipt; not yet Paid."
        : "Receipt recorded. All selected months are now Paid.");
      await onComplete();
    } catch (error) {
      // Never automatically replay a potentially committed financial request.
      if (record) { setQuote(null); setConfirmed(false); }
      setMessage(saved ? "Saved, but the list could not refresh. Reload before taking another action."
        : `${error instanceof Error ? error.message : "Request could not be confirmed."}${record ? " Check payment history before retrying." : ""}`);
    } finally { latch.current = false; setBusy(false); }
  }
  return <CompactRecord summary={mode === "member" ? "Report payment for several months" : "Record several months received"}
    className="my-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
    <p className="mb-3 text-sm text-neutral-400">Choose a month range, then untick months you are not paying. Paid or waived months must be excluded; unselected months remain due. Review monthly fees before reporting.</p>
    <p className="mb-3 text-sm text-neutral-400">{mode === "member"
      ? "Report money already transferred. Your dojo Admin must confirm receipt before the months become Paid."
      : "Use only after you have received the full payment. A member report awaiting receipt must be reviewed under Confirmations."}</p>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Membership<select className={control} value={membership} onChange={e => { setMembership(e.target.value); setMonth(""); setExcluded([]); invalidate(); }}>
        <option value="">Select membership</option>{memberships.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select></label>
      <label className="text-sm">First month<input className={control} type="month" value={month} onChange={e => { setMonth(e.target.value); setExcluded([]); invalidate(); }}/></label>
      <label className="text-sm">Months to show<input className={control} type="number" min="1" max="12" step="1" value={count} onChange={e => { setCount(e.target.value); setExcluded([]); invalidate(); }}/></label>
      {oldest && <button type="button" className={button} onClick={() => { setMonth(oldest.slice(0,7)); setCount("1"); setExcluded([]); invalidate(); }}>Choose oldest unpaid month ({oldest.slice(0,7)})</button>}
      {candidates.length > 0 && <div className="flex flex-wrap gap-3 sm:col-span-2">{candidates.map(value =>
        <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!excluded.includes(value)}
          onChange={e => { setExcluded(current => e.target.checked ? current.filter(v => v !== value) : [...current, value]); invalidate(); }} />Pay {value.slice(0,7)}</label>)}</div>}
      <div className="self-end"><button type="button" className={button} onClick={() => void act(false)}>Review monthly fees</button></div>
      {quote && <>
        <ul className="text-sm sm:col-span-2">{quote.months.map(m => <li key={m.month}>{m.month.slice(0,7)} — {m.currency} {m.amount}</li>)}
          <li className="mt-2 font-semibold">Total: {quote.currency} {quote.total}</li></ul>
        <label className="text-sm">{mode === "member" ? "Amount transferred" : "Amount received"}<input className={control} inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setConfirmed(false); }}/></label>
        <label className="text-sm">Payment date<input className={control} type="date" value={date} onChange={e => { setDate(e.target.value); setConfirmed(false); }}/></label>
        <label className="text-sm">Method<input className={control} maxLength={80} value={method} onChange={e => { setMethod(e.target.value); setConfirmed(false); }}/></label>
        <label className="text-sm">Reference / notes<input className={control} maxLength={1000} value={note} onChange={e => { setNote(e.target.value); setConfirmed(false); }}/></label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>
          {mode === "member" ? "I transferred this full total for the listed months. I understand it is awaiting confirmation."
            : "I have received this full total and confirm the listed months should be marked Paid."}</label>
        <button type="button" className={button} disabled={!confirmed} onClick={() => void act(true)}>
          {mode === "member" ? "Report payment — awaiting receipt" : "Confirm money received"}</button>
      </>}
    </fieldset>
    {busy && <p role="status" className="mt-3 text-sm">Processing…</p>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </CompactRecord>;
}

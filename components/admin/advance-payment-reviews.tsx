"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CompactRecord from "@/components/compact-record";

type Group = { payment_group_id: string; full_name: string; first_month: string; last_month: string; months?: string[];
  month_count: number; total: string; currency: string; payment_method: string; transfer_date: string; member_note: string | null };
export default function AdvancePaymentReviews({ dojoId, onComplete }: { dojoId: string; onComplete: () => Promise<void> }) {
  const client = useMemo(() => createClient(), []);
  const [groups,setGroups] = useState<Group[]>([]);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const latch=useRef(false);
  const load = useCallback(async () => {
    const {data,error}=await client.rpc("get_pending_advance_payment_groups",{target_dojo_id:dojoId});
    if(error)throw new Error(error.message);
    setGroups((data??[]) as Group[]);
  },[client,dojoId]);
  useEffect(() => { let active=true;
    void client.rpc("get_pending_advance_payment_groups",{target_dojo_id:dojoId}).then(({data,error})=>{
      if(active){if(error)setMessage(error.message);else setGroups((data??[]) as Group[]);}
    }); return ()=>{active=false;};
  },[client,dojoId]);
  async function review(group: Group, approve: boolean) {
    if(latch.current)return;
    const reason=approve?null:window.prompt("Reason the payment was not received / declined:");
    if(!approve&&!reason?.trim())return;
    if(!window.confirm(approve?`Confirm you received ${group.currency} ${group.total} from ${group.full_name} for ALL ${group.month_count} listed months?`
      :`Decline all ${group.month_count} months? They will remain unpaid.`))return;
    latch.current=true;setBusy(true);setMessage("");let saved=false;
    try {
      const {error}=await client.rpc("review_advance_subscription_payment",{target_group_id:group.payment_group_id,
        decision:approve?"approved":"rejected",rejection_note:reason});
      if(error)throw new Error(error.message);
      saved=true;setMessage(approve?"Receipt confirmed; all months Paid.":"Report declined; months remain unpaid.");
      await load();await onComplete();
    }catch(error){setMessage(saved?"Saved; refresh the page to update the list.":`${error instanceof Error?error.message:"Review result uncertain."} Refresh and check history before retrying.`);}
    finally{latch.current=false;setBusy(false);}
  }
  return <CompactRecord summary="Multi-month payments awaiting receipt" className="mb-4 rounded-xl border border-neutral-800 p-4">
    <p className="mb-3 text-sm text-neutral-400">Review these grouped payments here, not one month at a time. Confirm only after checking the money arrived.</p>
    {groups.map(g=><div className="border-t border-neutral-800 py-3 text-sm" key={g.payment_group_id}>
      <p className="font-semibold">{g.full_name} — {g.currency} {g.total}</p>
      <p>{g.months ? g.months.map(month => month.slice(0,7)).join(", ") : `${g.first_month.slice(0,7)} to ${g.last_month.slice(0,7)}`} ({g.month_count} months)</p>
      <p>{g.payment_method} · {g.transfer_date}</p><p className="break-words">{g.member_note}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={()=>void review(g,true)} className="rounded border border-green-700 px-3 py-2 disabled:opacity-40">Confirm received — all months</button>
        <button type="button" disabled={busy} onClick={()=>void review(g,false)} className="rounded border border-neutral-600 px-3 py-2 disabled:opacity-40">Decline report</button>
      </div>
    </div>)}
    {!groups.length&&!message&&<p className="text-sm">No grouped payments awaiting receipt.</p>}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  </CompactRecord>;
}

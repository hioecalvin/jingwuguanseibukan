"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Totals = { current_training_days: number; history: { rank_period: string; rank_name: string | null; training_days: number; duration_minutes: number; first_session: string; last_session: string }[] };
export default function MemberTrainingSummary({ membershipId, label = "Training days by rank" }: { membershipId: string; label?: string }) {
  const client = useMemo(() => createClient(), []);
  const [data, setData] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const load = async () => {
    setFailed(false);
    const result = await client.rpc("get_membership_training_totals", { target_membership_id: membershipId });
    if (result.error) { setFailed(true); return; }
    setData(result.data as Totals);
  };
  return <details className="rounded border border-neutral-800 p-2" onToggle={(event) => { if (event.currentTarget.open && !data && !failed) void load(); }}>
    <summary className="cursor-pointer text-sm">{label}</summary>
    {failed ? <p className="mt-2 text-sm" role="alert">Training totals could not be loaded. Access is limited to the member’s home dojo administration. <button type="button" onClick={() => void load()} className="underline">Retry totals</button></p> : !data ? <p className="text-sm">Loading totals…</p> : <div className="mt-2 space-y-2 text-sm">
      <p>Current grade: <strong>{data.current_training_days} training days</strong></p>
      {data.history.map((period) => <p key={period.rank_period}>{period.rank_name ?? "Unrecorded grade"}: {period.training_days} days · {period.duration_minutes} minutes · {period.first_session} – {period.last_session}</p>)}
      {!data.history.length && <p>No instructor-recorded attendance yet.</p>}
    </div>}
  </details>;
}

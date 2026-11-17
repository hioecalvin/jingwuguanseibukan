"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format-date";
import { daysAtRank, rankCalendarDate } from "@/lib/rank-duration";

export default function MemberRankDuration({ membershipId, rankId }: { membershipId: string; rankId: string | null }) {
  const client = useMemo(() => createClient(), []);
  const [start, setStart] = useState<string | null>(null);
  const [today, setToday] = useState(() => rankCalendarDate());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const current = ++request;
      setLoading(true);
      setFailed(false);
      setStart(null);
      try {
        if (!rankId) return;
        const result = await client.rpc("get_membership_current_rank_date", { target_membership_id: membershipId });
        if (!active || request !== current) return;
        if (result.error) throw new Error();
        setStart(typeof result.data === "string" ? result.data : null);
      } catch {
        if (active && request === current) setFailed(true);
      } finally {
        if (active && request === current) setLoading(false);
      }
    };
    const refresh = () => { setToday(rankCalendarDate()); void load(); };
    void load();
    const timer = window.setInterval(() => setToday(rankCalendarDate()), 60_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [client, membershipId, rankId, retry]);

  const days = daysAtRank(start, today);
  return <section aria-label="Time at current rank" className="mt-4 rounded-xl border border-neutral-800 p-4 text-sm">
    <p className="text-neutral-400">Days at current rank</p>
    <p className="mt-1 font-semibold" role="status">{loading ? "Loading…" : failed ? "Temporarily unavailable" : !rankId ? "No rank assigned" : days === null ? "Unknown" : `${days} ${days === 1 ? "day" : "days"}`}</p>
    {!loading && !failed && rankId && <p className="mt-1 text-xs text-neutral-400">Promotion date: {days === null ? "Unknown" : formatDate(start)} · Calendar days, not training attendance.</p>}
    {failed && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 text-sky-300 underline">Retry rank date</button>}
  </section>;
}

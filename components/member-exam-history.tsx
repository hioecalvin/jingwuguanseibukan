"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { assessmentOutcomeLabel } from "@/lib/assessment-history-labels";
import { formatDate } from "@/lib/format-date";

type Exam = {
  result_id: string;
  class_id: string;
  assessment_number: string | null;
  assessment_date: string | null;
  rank_before: string | null;
  rank_assessed: string;
  outcome: string;
  assessor_name: string | null;
  dojo_name: string | null;
  notes: string | null;
};

/** The existing RPC enforces member/Dojo Admin/Super Admin visibility. */
export default function MemberExamHistory({ memberId, classId }: { memberId: string; classId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ scope: string; loading: boolean; error: boolean; rows: Exam[] }>({ scope: "", loading: true, error: false, rows: [] });
  const scope = `${memberId}:${classId}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setState({ scope, loading: true, error: false, rows: [] });
      try {
        const { data, error } = await supabase.rpc("get_assessment_result_history", { target_member_id: memberId });
        if (error || (data !== null && !Array.isArray(data))) throw new Error("History unavailable");
        const rows = ((data ?? []) as Exam[]).filter(row => row.class_id === classId);
        if (!cancelled) setState({ scope, loading: false, error: false, rows });
      } catch {
        if (!cancelled) setState({ scope, loading: false, error: true, rows: [] });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, retry, scope, memberId, classId, supabase]);

  return <details className="mt-3 rounded-xl border border-neutral-800 p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Exam History</summary>
    {open && <div className="mt-3 space-y-3">
      <p className="text-sm text-neutral-400">Assessments and imported exam records for this class. Historical records do not change the member’s current rank.</p>
      {state.scope !== scope || state.loading ? <p role="status">Loading exam history…</p> : state.error ? <div>
        <p role="alert">Exam history could not be loaded.</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded border border-neutral-600 px-3 py-2">Retry exam history</button>
      </div> : state.rows.length === 0 ? <p className="text-sm text-neutral-400">No exam records available for this class.</p> : state.rows.map(exam => <details key={exam.result_id} className="rounded-lg border border-neutral-700 p-3 text-sm">
        <summary className="cursor-pointer break-words">
          {exam.rank_assessed} · {exam.assessment_date ? formatDate(exam.assessment_date) : "Date incomplete — see details"} · {assessmentOutcomeLabel(exam.outcome)}
        </summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-neutral-400">Assessment number</dt><dd>{exam.assessment_number ?? "Not numbered"}</dd></div>
          <div><dt className="text-neutral-400">Previous rank</dt><dd>{exam.rank_before ?? "Unknown"}</dd></div>
          <div><dt className="text-neutral-400">Assessor</dt><dd>{exam.assessor_name ?? "Unknown"}</dd></div>
          <div><dt className="text-neutral-400">Dojo at assessment</dt><dd>{exam.dojo_name ?? "Unknown"}</dd></div>
          {exam.notes && <div className="sm:col-span-2"><dt className="text-neutral-400">Record details</dt><dd className="whitespace-pre-wrap break-words">{exam.notes}</dd></div>}
        </dl>
      </details>)}
    </div>}
  </details>;
}

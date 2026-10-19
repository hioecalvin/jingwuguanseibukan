"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Result = { result_id: string; assessment_number: string; member_id: string | null;
  member_name: string; assessment_date: string; class_name: string; dojo_name: string | null;
  rank_before: string | null; rank_assessed: string; outcome: string; assessor_name: string; notes: string | null };
export default function AssessmentHistoryClient() {
  const supabase = useMemo(() => createClient(), []);
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState("Loading assessment history…");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setStatus("Loading assessment history…");
    try {
      const { data, error } = await supabase.rpc("get_assessment_result_history");
      if (currentRequest !== requestId.current) return;
      if (error || (data !== null && !Array.isArray(data))) throw new Error("History unavailable");
      setResults((data ?? []) as Result[]);
      setStatus(data?.length ? "" : "No submitted assessments yet.");
    } catch {
      if (currentRequest !== requestId.current) return;
      setResults([]);
      setStatus("Unable to load assessment history. Please retry.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [supabase]);
  const cancelPending = useCallback(() => { requestId.current++; }, []);
  useEffect(() => {
    void load();
    return cancelPending;
  }, [load, cancelPending]);
  return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">Assessment History</h1>
    <p className="text-sm text-neutral-400">Every submitted Pass or Fail has its own YYYY-XXXX record number, shared across classes and restarting each year. Reassessments remain separate; pending drafts are not numbered.</p>
    <label className="block">Find a record<input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Assessment number, Member ID, name or class" /></label>
    {status && <p role="status">{status}</p>}
    <button disabled={loading} onClick={() => void load()} className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-50">{loading ? "Loading…" : "Refresh"}</button>
    {results.filter(r => [r.assessment_number,r.member_id,r.member_name,r.class_name].some(v => v?.toLowerCase().includes(filter.toLowerCase()))).map(r => <details key={r.result_id} className="rounded-xl border border-neutral-800 p-3">
      <summary className="cursor-pointer text-sm"><span className="font-mono">{r.assessment_number}</span> · {r.member_id ?? "Unknown Member ID"} · {r.member_name} · {r.assessment_date} · <span className={r.outcome === "pass" ? "text-emerald-400" : "text-amber-400"}>{r.outcome === "pass" ? "Pass" : "Fail"}</span></summary>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt>Class / dojo</dt><dd>{r.class_name} · {r.dojo_name ?? "Unknown"}</dd></div><div><dt>Grade before → assessed grade</dt><dd>{r.rank_before ?? "Unknown"} → {r.rank_assessed}</dd></div><div><dt>Assessor</dt><dd>{r.assessor_name}</dd></div><div><dt>Notes</dt><dd className="whitespace-pre-wrap">{r.notes || "—"}</dd></div></dl>
    </details>)}
  </section>;
}

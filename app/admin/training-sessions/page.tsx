"use client";

import { selectedFirst } from "@/lib/selected-first";

import MemberIdLink from "@/components/member-id-link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MemberTrainingSummary from "@/components/member-training-summary";
import { createClient } from "@/lib/supabase/client";

type Scope = { dojo_id: string; dojo_name: string; class_id: string; class_name: string };
type Attendee = { membership_id: string; member_id: string; full_name: string; dojo_name: string | null; rank_name: string | null };
type Session = { id: string; dojo_id: string; dojo_name: string; class_name: string; session_date: string; details: string; duration_minutes: number; version: number; instructor_name: string; participants: Attendee[] };
type Revision = { version: number; recorded_at: string; new_values: { session_date: string; details: string; duration_minutes: number; attendees: unknown[] } };
const field = "w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm text-white";
function jakartaToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }


export default function TrainingSessionsPage() {
  const client = useMemo(() => createClient(), []);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [roster, setRoster] = useState<Attendee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [dojo, setDojo] = useState("");
  const [date, setDate] = useState(jakartaToday);
  const [details, setDetails] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [editing, setEditing] = useState<Session | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterFailed, setRosterFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisions, setRevisions] = useState<Record<string, Revision[]>>({});
  const [historyBefore, setHistoryBefore] = useState("");
  const requestId = useRef<string | null>(null);
  const rosterGeneration = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async (before = "", cursor: string | null = null) => {
    setLoading(true);
    const [scopeResult, sessionResult] = await Promise.all([
      client.rpc("get_manageable_training_scopes"),
      client.rpc("get_training_sessions", { before_date: before || null, after_session_id: cursor }),
    ]);
    if (scopeResult.error || sessionResult.error) {
      setError("Training sessions could not be loaded. Please retry.");
    } else {
      setScopes(scopeResult.data ?? []);
      setHasMore((sessionResult.data ?? []).length === 200);
      setSessions(previous => cursor ? [...previous, ...(sessionResult.data ?? [])] : sessionResult.data ?? []);
      setError("");
    }
    setLoading(false);
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  const loadRoster = useCallback(async (host: string, retained: Attendee[] = []) => {
    const generation = ++rosterGeneration.current;
    setRoster([]); setRosterFailed(false); setRosterLoading(Boolean(host));
    if (!host) return;
    const response = await client.rpc("get_training_session_roster", { target_dojo_id: host });
    if (generation !== rosterGeneration.current) return;
    setRosterLoading(false);
    if (response.error) { setRosterFailed(true); return; }
    const members = new Map<string, Attendee>();
    for (const member of [...retained, ...(response.data ?? [])] as Attendee[]) members.set(member.membership_id, member);
    setRoster([...members.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, [client]);
  const chooseDojo = (value: string) => { setDojo(value); setSelected([]); requestId.current = null; void loadRoster(value); };
  const reset = () => {
    setEditing(null); setDojo(""); setDate(jakartaToday()); setDetails(""); setMinutes("60"); setSelected([]); setRoster([]); setSearch(""); setRosterFailed(false); setRosterLoading(false); rosterGeneration.current++; requestId.current = null;
  };
  const edit = (session: Session) => {
    setEditing(session); setDojo(session.dojo_id); setDate(session.session_date); setDetails(session.details); setMinutes(String(session.duration_minutes));
    setSelected(session.participants.map((p) => p.membership_id)); setSearch(""); setError(""); setNotice("");
    requestId.current = session.id; void loadRoster(session.dojo_id, session.participants);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving || rosterLoading || rosterFailed) return;
    setSaving(true); setError(""); setNotice("");
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await client.rpc("save_training_session", {
        target_session_id: requestId.current, target_dojo_id: dojo, training_date: date,
        training_details: details.trim(), minutes: Number(minutes), attendee_membership_ids: selected,
        expected_version: editing?.version ?? 0,
      });
      if (result.error) {
        setError(result.error.code === "40001" ? "This session changed or a previous submit succeeded. Reload the history before editing it again." : "The session could not be saved. Check the date, attendance and dojo access. Backdated attendance needs a known rank on that date.");
        return;
      }
      reset(); setRevisions({}); await load(historyBefore); setNotice("Training session saved. Attendance and training totals have been updated.");
    } catch { setError("The result could not be confirmed. Reload history before trying again; your entries have been kept."); }
    finally { setSaving(false); }
  };
  const visibleRoster = selectedFirst(roster, p => selected.includes(p.membership_id)).filter((p) => selected.includes(p.membership_id) || `${p.member_id} ${p.full_name} ${p.dojo_name ?? ""}`.toLowerCase().replace(/[-\s]/g, "").includes(search.toLowerCase().replace(/[-\s]/g, "")));
  const loadAudit = async (id: string) => {
    const result = await client.rpc("get_training_session_audit", { target_session_id: id });
    if (result.error) { setError("Edit history could not be loaded."); return; }
    setRevisions((previous) => ({ ...previous, [id]: result.data ?? [] }));
  };
  return <main className="mx-auto max-w-5xl space-y-5 p-4 text-white sm:p-6">
    <header><h1 className="text-2xl font-semibold">Training Sessions</h1><p className="mt-1 text-sm text-neutral-400">Record attendance at your assigned dojo, including visitors enrolled in the same class.</p></header>
    {error && <p role="alert" className="rounded border border-red-800 p-3 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded border border-emerald-800 p-3 text-sm">{notice}</p>}
    {loading && <p role="status">Loading sessions…</p>}
    {!loading && !scopes.length && <p>No active host dojos are assigned to you.</p>}
    <form ref={formRef} onSubmit={submit} className="space-y-3 rounded-xl border border-neutral-800 p-3 sm:p-4">
      <h2 className="font-semibold">{editing ? "Edit training session" : "New training session"}</h2>
      <fieldset disabled={saving || loading || !scopes.length} className="space-y-3 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Class and host dojo<select className={field} required value={dojo} disabled={!!editing} onChange={(event) => chooseDojo(event.target.value)}><option value="">Select dojo</option>{scopes.map((scope) => <option key={scope.dojo_id} value={scope.dojo_id}>{scope.class_name} · {scope.dojo_name}</option>)}</select></label>
          <label className="text-sm">Training date<input className={field} type="date" required max={jakartaToday()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="text-sm">Duration (minutes)<input className={field} type="number" required min={1} max={1440} step={1} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
        </div>
        <label className="block text-sm">Session details<textarea className={field} required maxLength={4000} rows={3} value={details} onChange={(event) => setDetails(event.target.value)} /></label>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Attendance — {selected.length} selected</legend>
          <input className={field} aria-label="Find attendees" placeholder="Name, JS ID or home dojo" value={search} onChange={(event) => setSearch(event.target.value)} />
          {rosterLoading && <p role="status">Loading eligible members…</p>}
          {rosterFailed && <p role="alert">Attendance could not be loaded. <button type="button" className="underline" onClick={() => void loadRoster(dojo, editing?.participants)}>Retry attendance</button></p>}
          <div className="max-h-80 space-y-1 overflow-y-auto">{visibleRoster.map((person) => <label key={person.membership_id} className="flex cursor-pointer items-start gap-3 rounded border border-neutral-800 p-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={selected.includes(person.membership_id)} onChange={(event) => setSelected((prior) => event.target.checked ? [...prior, person.membership_id] : prior.filter((id) => id !== person.membership_id))} />
            <span className="min-w-0 break-words"><strong><MemberIdLink memberId={person.member_id} /> · {person.full_name}</strong><span className="block text-xs text-neutral-400">{person.dojo_name ?? "Home dojo unknown"} · {person.rank_name ?? "Grade unknown"}</span></span>
          </label>)}</div>
          {dojo && !rosterLoading && !rosterFailed && !visibleRoster.length && <p className="text-sm text-neutral-400">No matching attendees.</p>}
        </fieldset>
        <p className="text-xs text-neutral-400">Each training date counts once per rank. Multiple sessions retain their duration. Clearing an existing session’s attendance removes its contribution but preserves the edit history.</p>
        <div className="flex gap-3"><button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={!dojo || rosterLoading || rosterFailed || (!editing && !selected.length)} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Submit session"}</button><button type="button" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm" onClick={reset}>Cancel / clear</button></div>
      </fieldset>
    </form>
    <section aria-label="Training session history" className="space-y-3">
      <h2 className="font-semibold">Session history</h2>
      <div className="flex flex-wrap items-end gap-2"><label className="text-sm">On or before<input className={field} type="date" value={historyBefore} onChange={(event) => setHistoryBefore(event.target.value)} /></label><button type="button" className="rounded border border-neutral-700 px-3 py-2 text-sm" disabled={loading || saving} onClick={() => void load(historyBefore)}>Reload history</button></div>
      <p className="text-xs text-neutral-400">Latest 200 sessions for this date filter. Use Load older sessions to continue through the history.</p>
      {sessions.map((session) => <details key={`${session.id}:${session.version}`} className="rounded-lg border border-neutral-800 p-3">
        <summary className="cursor-pointer text-sm font-medium">{session.session_date} · {session.class_name} · {session.dojo_name} · {session.participants.length} attendees</summary>
        <div className="mt-3 space-y-3 text-sm"><p className="whitespace-pre-wrap break-words">{session.details}</p><p>{session.duration_minutes} minutes · Instructor: {session.instructor_name} · Revision {session.version}</p>
          {session.participants.map((person) => <div key={`${person.membership_id}:${session.version}`}><MemberIdLink memberId={person.member_id} /> · {person.full_name}<MemberTrainingSummary membershipId={person.membership_id} /></div>)}
          <div className="flex gap-3"><button type="button" disabled={saving} className="rounded border border-neutral-700 px-3 py-2" onClick={() => edit(session)}>Edit session</button><button type="button" className="rounded border border-neutral-700 px-3 py-2" onClick={() => void loadAudit(session.id)}>View edit history</button></div>
          {revisions[session.id]?.map((revision) => <div key={revision.version} className="border-t border-neutral-800 pt-2"><p>Revision {revision.version} · {new Date(revision.recorded_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{revision.new_values.session_date} · {revision.new_values.duration_minutes} minutes · {revision.new_values.attendees.length} attendees — {revision.new_values.details}</p></div>)}
        </div>
      </details>)}
      {hasMore && <button type="button" disabled={loading || saving} className="rounded border border-neutral-700 px-3 py-2 text-sm" onClick={() => { const last = sessions[sessions.length - 1]; void load(last.session_date, last.id); }}>Load older sessions</button>}
      {!loading && !sessions.length && <p className="text-sm text-neutral-400">No sessions recorded in this date range.</p>}
    </section>
  </main>;
}

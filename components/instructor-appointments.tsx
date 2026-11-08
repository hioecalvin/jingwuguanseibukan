"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MemberIdLink from "@/components/member-id-link";

type Appointment = { member_id: string; member_name: string; js_id: string; class_id: string; class_name: string; is_appointed: boolean; eligible: boolean };
const keyOf = (row: Appointment) => `${row.member_id}:${row.class_id}`;
const normalize = (value: string) => value.toLocaleLowerCase().replace(/[\s-]/g, "");

export default function InstructorAppointments() {
  const client = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [pending, setPending] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const operation = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await client.rpc("get_class_instructor_appointments");
      if (result.error) throw new Error();
      setRows(result.data ?? []);
      setError("");
    } catch {
      setRows([]);
      setError("Instructor appointments could not be loaded. Please retry.");
    } finally { setLoading(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!pending || operation.current) return;
    const row = pending;
    operation.current = true;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await client.rpc("set_class_instructor_appointment", {
        target_member_id: row.member_id, target_class_id: row.class_id,
        expected_active: row.is_appointed, new_active: !row.is_appointed,
      });
      if (result.error || result.data !== !row.is_appointed) throw new Error();
      setRows(current => current.map(item => keyOf(item) === keyOf(row) ? { ...item, is_appointed: result.data } : item));
      setNotice(`${row.member_name}: ${row.class_name} instructor appointment ${result.data ? "granted" : "revoked"}.`);
      setPending(null);
    } catch {
      setPending(null);
      await load();
      setError("Could not confirm the change. The list has been reloaded; check the current appointment before retrying.");
    } finally { operation.current = false; setSaving(false); }
  }

  const classes = [...new Map(rows.map(row => [row.class_id, row.class_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const visible = rows.filter(row => (!classId || row.class_id === classId) && normalize(`${row.member_name} ${row.js_id}`).includes(normalize(search)))
    .sort((a, b) => Number(b.is_appointed) - Number(a.is_appointed) || a.member_name.localeCompare(b.member_name) || a.class_name.localeCompare(b.class_name));

  return <div className="mx-auto max-w-5xl space-y-4">
    <h1 className="text-2xl font-semibold">Instructor appointments</h1>
    <p className="text-sm text-neutral-300">Super Admin appoints instructors for each class. Appointments allow schedule selection; recording training also requires access to the host dojo. Every grant and revocation is recorded.</p>
    <div className="flex flex-wrap gap-3">
      <label className="min-w-0 flex-1 text-sm">Search name or JS ID<input value={search} onChange={event => setSearch(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3" /></label>
      <label className="text-sm">Class<select value={classId} onChange={event => setClassId(event.target.value)} className="mt-1 block min-h-11 max-w-full rounded border border-neutral-600 bg-neutral-950 px-3"><option value="">All classes</option>{classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="text-red-200">{error}</p>}
    <p role="status" className="text-sm">{loading ? "Loading instructors…" : notice}</p>
    {pending && <section aria-label="Confirm instructor appointment" className="space-y-3 rounded border border-amber-500 p-3">
      <p>{pending.is_appointed ? "Revoke" : "Grant"} {pending.member_name}’s instructor appointment for {pending.class_name}?</p>
      <div className="flex gap-3"><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded bg-cyan-300 px-4 text-black disabled:opacity-50">Confirm {pending.is_appointed ? "revocation" : "appointment"}</button><button type="button" disabled={saving} onClick={() => setPending(null)} className="min-h-11 rounded border border-neutral-600 px-4">Cancel</button></div>
    </section>}
    {!loading && error && <button type="button" disabled={saving} onClick={() => void load()} className="min-h-11 rounded border border-neutral-600 px-4">Reload instructors</button>}
    {!loading && !error && !visible.length && <p className="text-sm text-neutral-400">No eligible members match.</p>}
    <ul className="space-y-2">{visible.map(row => <li key={keyOf(row)} className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-800 p-3">
      <div className="min-w-0"><p className="break-words font-medium">{row.member_name}</p><div className="flex flex-wrap items-center gap-2 text-sm"><MemberIdLink memberId={row.js_id} /><span>{row.class_name}</span><span className={row.is_appointed ? "text-emerald-300" : "text-neutral-400"}>{row.is_appointed ? "Appointed" : "Not appointed"}</span></div></div>
      <button type="button" disabled={saving || loading || (!row.is_appointed && !row.eligible)} onClick={() => { setPending(row); setNotice(""); }} aria-label={`${row.is_appointed ? "Revoke" : "Appoint"} ${row.member_name} for ${row.class_name}`} className="min-h-11 rounded border border-neutral-600 px-3 text-sm disabled:opacity-50">{row.is_appointed ? "Revoke" : "Appoint"}</button>
    </li>)}</ul>
  </div>;
}

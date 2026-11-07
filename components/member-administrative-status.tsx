"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const labels = { active: "Active", inactive: "Inactive", terminated: "Terminated" } as const;
type MemberStatus = keyof typeof labels;

function isMemberStatus(value: unknown): value is MemberStatus {
  return value === "active" || value === "inactive" || value === "terminated";
}

export default function MemberAdministrativeStatus({ memberId, memberName }: { memberId: string; memberName: string }) {
  const client = useMemo(() => createClient(), []);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<MemberStatus | null>(null);
  const [selected, setSelected] = useState<MemberStatus | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function update(action: "load" | "save") {
    if (operation.current) return;
    if (action === "save" && (!saved || !selected || saved === selected)) return;
    operation.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = action === "load"
        ? await client.rpc("get_member_administrative_status", { target_member_id: memberId })
        : await client.rpc("set_member_administrative_status", { target_member_id: memberId, expected_status: saved, new_status: selected });
      if (result.error || !isMemberStatus(result.data)) throw new Error();
      setSaved(result.data);
      setSelected(result.data);
      if (action === "save") setMessage(`Member status saved as ${labels[result.data]}.`);
    } catch {
      setSaved(null);
      setSelected(null);
      setError(action === "save" ? "Could not confirm the change. Reload member status to check the current value." : "Could not load member status. Please try again.");
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  return <section aria-label={`Member status for ${memberName}`} className="my-3 space-y-2 rounded-lg border border-neutral-700 p-3 text-sm">
    <h3 className="font-semibold">Member status</h3>
    <p className="text-neutral-400">This status applies to the whole member record.</p>
    {saved && selected ? <div className="flex flex-wrap items-end gap-3">
      <label className="block">Member status for {memberName}
        <select value={selected} disabled={busy} onChange={event => {
          if (isMemberStatus(event.target.value)) setSelected(event.target.value);
          setMessage("");
        }} className="mt-1 block min-h-11 rounded border border-neutral-600 bg-neutral-950 px-3 py-2">
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy || selected === saved} onClick={() => void update("save")} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">Save member status</button>
    </div> : <button type="button" disabled={busy} onClick={() => void update("load")} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">{error ? "Reload member status" : "View member status"}</button>}
    {error && <p role="alert" className="text-red-200">{error}</p>}
    <p role="status">{busy ? "Working…" : message}</p>
  </section>;
}

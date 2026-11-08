"use client";

import { useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Values = { full_name: string; date_of_birth: string | null; email: string | null; phone: string | null };
type Details = Values & { has_login: boolean; pending_email: string | null };
type Audit = { id: string; recorded_at: string; actor_name: string; old_values: Values; new_values: Values & { requested_email?: string | null } };
const fields = ["full_name", "date_of_birth", "email", "phone"] as const;
const labels = { full_name: "Name", date_of_birth: "Date of birth", email: "Email", phone: "Phone number" };

/** Database RPCs independently require active Super Admin access. */
export default function MemberPersonalDetailsEditor({ memberId, onSaved }: { memberId: string; onSaved?: () => void }) {
  const client = useMemo(() => createClient(), []);
  const id = useId();
  const operation = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState<Details | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [audit, setAudit] = useState<Audit[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError("");
    try {
      const result = await client.rpc("get_member_personal_details", { target_member_id: memberId });
      if (result.error || !result.data) throw new Error("Personal details could not be loaded. Super Admin access is required.");
      const details = result.data as Details;
      setOriginal(details); setValues({ full_name: details.full_name, date_of_birth: details.date_of_birth, email: details.email, phone: details.phone });
      setOpen(true); setAudit(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load personal details."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!original || !values || operation.current) return;
    operation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/member-personal-details", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, values, expectedValues: Object.fromEntries(fields.map(field => [field, original[field]])) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save personal details. Reload if another administrator edited this member.");
      setMessage(result.message ?? "Personal details saved.");
      // Never replace the displayed login email with an unverified address.
      setOpen(false); setOriginal(null); setValues(null); setAudit(null); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save. Your edits are retained."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function history() {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError("");
    try {
      const result = await client.rpc("get_member_personal_detail_audit", { target_member_id: memberId });
      if (result.error) throw new Error("Change history could not be loaded.");
      setAudit(result.data as Audit[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "History unavailable."); }
    finally { operation.current = false; setBusy(false); }
  }
  return <section aria-label="Edit member personal details" className="my-3 rounded-lg border border-neutral-700 p-3 text-sm" aria-busy={busy}>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">{open ? "Reload saved details" : "Edit personal details"}</button>
      <button type="button" disabled={busy} onClick={() => void history()} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Personal detail history</button>
    </div>
    {error && <p role="alert" className="mt-3 text-red-200">{error}</p>}
    <p role="status" aria-live="polite" className="mt-2">{busy ? "Working…" : message}</p>
    {open && original && values && <form onSubmit={save} className="mt-3 space-y-4">
      <p className="text-neutral-400">{original.has_login ? "This account is already claimed. A new email becomes the login email only after verification. The current email stays active meanwhile." : "These details will be used to verify future account claims. Correcting email or date of birth cancels unfinished claims."}</p>
      {original.pending_email && <p className="break-all text-amber-200">Email verification pending: {original.pending_email}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{fields.map(field => <label key={field} htmlFor={`${id}-${field}`} className="block">{labels[field]}
        <input id={`${id}-${field}`} type={field === "date_of_birth" ? "date" : field === "email" ? "email" : field === "phone" ? "tel" : "text"}
          required={field === "full_name" || (field === "email" && original.has_login)} maxLength={field === "full_name" ? 200 : field === "phone" ? 32 : field === "email" ? 254 : undefined}
          value={values[field] ?? ""} disabled={busy} onChange={event => setValues({ ...values, [field]: event.target.value || (field === "full_name" ? "" : null) })}
          className="mt-1 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" />
      </label>)}</div>
      <div className="flex flex-wrap gap-3"><button disabled={busy} type="submit" className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">Save personal details</button>
        <button disabled={busy} type="button" onClick={() => { setOpen(false); setValues(null); setError(""); }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Cancel</button></div>
    </form>}
    {audit && <div className="mt-4 space-y-3"><h3 className="font-semibold">Personal detail changes</h3>{!audit.length && <p>No personal-detail corrections recorded.</p>}
      {audit.map(change => <details key={change.id} className="rounded border border-neutral-700 p-3"><summary className="cursor-pointer">{new Date(change.recorded_at).toLocaleString()} · {change.actor_name}</summary>
        <dl className="mt-2 space-y-2">{fields.filter(field => change.old_values[field] !== change.new_values[field]).map(field => <div key={field}><dt className="text-neutral-400">{labels[field]}</dt><dd className="break-words">{change.old_values[field] || "Unknown"} → {change.new_values[field] || "Unknown"}</dd></div>)}
          {change.new_values.requested_email && <div><dt className="text-neutral-400">Verification requested for email</dt><dd className="break-all">{change.new_values.requested_email}</dd></div>}</dl>
      </details>)}
    </div>}
  </section>;
}

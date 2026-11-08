"use client";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Contact = { contact_name: string | null; relation: string | null; email: string | null; phone: string | null; version: number };
const fields = ["contact_name", "relation", "email", "phone"] as const;
const labels = { contact_name: "Emergency contact name", relation: "Relation", email: "Emergency contact email", phone: "Emergency contact phone number" };
export default function MemberEmergencyContact() {
  const client = useMemo(() => createClient(), []);
  const id = useId();
  const running = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await client.rpc("get_my_emergency_contact");
      if (result.error || !result.data) throw new Error("Your emergency contact could not be loaded. Please try again.");
      setContact(result.data as Contact); setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load emergency contact."); }
    finally { running.current = false; setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!contact || running.current) return;
    running.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await client.rpc("update_my_emergency_contact", {
        new_contact_name: contact.contact_name, new_relation: contact.relation,
        new_email: contact.email, new_phone: contact.phone, expected_version: contact.version,
      });
      if (result.error || !result.data) throw new Error(result.error?.code === "40001" ? "Your emergency contact changed elsewhere. Reload the saved details before editing again." : "Emergency contact could not be saved. Check the details and try again.");
      setContact(result.data as Contact); setEditing(false); setMessage("Emergency contact saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save emergency contact. Your edits are retained."); }
    finally { running.current = false; setBusy(false); }
  }
  return <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm" aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <button id={`${id}-heading`} type="button" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => { setOpen(!open); if (!open && !contact) void load(); }} className="flex min-h-11 w-full items-center justify-between text-left font-semibold"><span>Emergency contact</span><span aria-hidden="true">{open ? "−" : "+"}</span></button>
    {open && <div id={`${id}-content`} className="mt-3 space-y-3">
      <p className="text-neutral-400">Save a person to contact in an emergency. These details are private and do not appear in the member directory.</p>
      {error && <p role="alert" className="text-red-200">{error}</p>}
      <p role="status" aria-live="polite">{busy ? "Working…" : message}</p>
      {contact && !editing && <><dl className="grid gap-3 sm:grid-cols-2">{fields.map(field => <div key={field}><dt className="text-neutral-400">{labels[field].replace("Emergency contact ", "")}</dt><dd className="break-words">{contact[field] ?? "Not provided"}</dd></div>)}</dl>
        <button type="button" disabled={busy} onClick={() => { setEditing(true); setMessage(""); }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Edit emergency contact</button></>}
      {contact && editing && <form onSubmit={save} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{fields.map(field => <label htmlFor={`${id}-${field}`} key={field} className="block">{labels[field]}
        <input id={`${id}-${field}`} value={contact[field] ?? ""} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} maxLength={field === "contact_name" ? 200 : field === "relation" ? 100 : field === "email" ? 254 : 32} disabled={busy}
          onChange={event => setContact({ ...contact, [field]: event.target.value || null })} className="mt-1 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" />
      </label>)}</div>
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">Save emergency contact</button><button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Cancel edits</button></div>
      </form>}
      {error && <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Reload saved emergency contact</button>}
    </div>}
  </section>;
}

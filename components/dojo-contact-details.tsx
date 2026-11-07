"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { dojoPhoneLink, safeGoogleMapsUrl, type DojoContact } from "@/lib/dojo-contact";
import { instagramProfile } from "@/lib/member-directory";

const fields = ["contact_name", "contact_phone", "instagram_username", "address", "maps_url"] as const;
const labels = { contact_name: "Contact instructor name", contact_phone: "Contact phone number", instagram_username: "Dojo Instagram handle", address: "Dojo address", maps_url: "Google Maps link" };
const limits = { contact_name: 200, contact_phone: 32, instagram_username: 31, address: 1000, maps_url: 2048 };

export default function DojoContactDetails({ dojoId, initialContact }: { dojoId: string; initialContact?: DojoContact }) {
  const client = useMemo(() => createClient(), []);
  const id = useId();
  const running = useRef(false);
  const [open, setOpen] = useState(Boolean(initialContact));
  const [contact, setContact] = useState<DojoContact | null>(initialContact ?? null);
  const [draft, setDraft] = useState<DojoContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await client.rpc("get_dojo_contact_details", { target_dojo_id: dojoId });
      const row = (result.data as DojoContact[] | null)?.[0];
      if (result.error || !row) throw new Error("Dojo details could not be loaded. Please try again.");
      setContact(row); setDraft(null); setConflict(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load dojo details."); }
    finally { running.current = false; setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !contact || conflict || running.current) return;
    if (draft.maps_url?.trim() && !safeGoogleMapsUrl(draft.maps_url.trim())) {
      setError("Enter a Google Maps HTTPS link, such as https://www.google.com/maps/… or https://maps.app.goo.gl/…"); return;
    }
    running.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await client.rpc("update_dojo_contact_details", {
        target_dojo_id: dojoId, expected_version: contact.version,
        new_contact_name: draft.contact_name, new_contact_phone: draft.contact_phone,
        new_instagram_username: draft.instagram_username, new_address: draft.address, new_maps_url: draft.maps_url,
      });
      if (result.error || !result.data) {
        if (result.error?.code === "40001") { setConflict(true); throw new Error("These details changed elsewhere. Your edits are retained below. Reload the saved details before editing again."); }
        throw new Error(result.error?.code === "42501" ? "You no longer have permission to edit this dojo." : "Dojo details could not be saved. Check the fields and try again.");
      }
      setContact(result.data as DojoContact); setDraft(null); setMessage("Dojo details saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save dojo details."); }
    finally { running.current = false; setBusy(false); }
  }
  const instagram = instagramProfile(contact?.instagram_username ?? null);
  const maps = safeGoogleMapsUrl(contact?.maps_url ?? null);
  const phone = dojoPhoneLink(contact?.contact_phone ?? null);
  return <section className="mt-4 border-t border-neutral-700 pt-3 text-sm" aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <button id={`${id}-heading`} type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => { setOpen(!open); if (!open && !contact) void load(); }} className="flex min-h-11 w-full items-center justify-between text-left font-semibold"><span>Dojo contact & location</span><span aria-hidden="true">{open ? "−" : "+"}</span></button>
    {open && <div id={`${id}-body`} className="mt-3 space-y-3">
      {error && <p role="alert" className="text-red-200">{error}</p>}
      <p role="status" aria-live="polite">{busy ? "Working…" : message}</p>
      {contact && !draft && <><dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-neutral-400">Contact instructor</dt><dd className="break-words">{contact.contact_name ?? "Not provided"}</dd></div>
        <div><dt className="text-neutral-400">Phone</dt><dd>{phone ? <a href={phone} className="text-sky-300 underline">{contact.contact_phone}</a> : contact.contact_phone ?? "Not provided"}</dd></div>
        <div><dt className="text-neutral-400">Instagram</dt><dd>{instagram ? <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 underline">@{instagram.handle}</a> : "Not provided"}</dd></div>
        <div><dt className="text-neutral-400">Address</dt><dd className="break-words">{contact.address ?? "Not provided"}</dd></div>
        <div><dt className="text-neutral-400">Google Maps</dt><dd>{maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Open Google Maps</a> : "Not provided"}</dd></div>
      </dl>{contact.can_manage && <button type="button" disabled={busy} onClick={() => { setDraft({ ...contact }); setMessage(""); setError(""); }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Edit dojo details</button>}</>}
      {draft && <form onSubmit={save} className="space-y-3">
        <p className="text-neutral-400">Enter the dojo&apos;s business contact details. All signed-in active members can see these details. Every field is optional.</p>
        <div className="grid gap-3 sm:grid-cols-2">{fields.map(field => <label key={field} htmlFor={`${id}-${field}`} className="block">{labels[field]}<input id={`${id}-${field}`} value={draft[field] ?? ""} type={field === "contact_phone" ? "tel" : field === "maps_url" ? "url" : "text"} maxLength={limits[field]} disabled={busy} onChange={event => setDraft({ ...draft, [field]: event.target.value || null })} className="mt-1 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" /></label>)}</div>
        <div className="flex flex-wrap gap-3"><button disabled={busy || conflict} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">Save dojo details</button><button type="button" disabled={busy} onClick={() => { setDraft(null); setError(""); }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Cancel edits</button></div>
      </form>}
      {(error || conflict) && <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Reload saved dojo details</button>}
    </div>}
  </section>;
}

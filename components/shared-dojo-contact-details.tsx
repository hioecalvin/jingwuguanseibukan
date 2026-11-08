"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeGoogleMapsUrl } from "@/lib/dojo-contact";
import { instagramProfile } from "@/lib/member-directory";

type SharedContact = {
  maps_url: string | null;
  instagram_username: string | null;
  version_token: string;
  can_manage: boolean;
  has_conflicts: boolean;
  source_values: Array<{ dojo_id: string; class_name: string; maps_url: string | null; instagram_username: string | null }>;
};

export default function SharedDojoContactDetails({ dojoId }: { dojoId: string }) {
  const client = useMemo(() => createClient(), []);
  const id = useId();
  const saving = useRef(false);
  const [contact, setContact] = useState<SharedContact | null>(null);
  const [draft, setDraft] = useState<{ maps_url: string; instagram_username: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setBusy(true);
      setError("");
      try {
        const { data, error: failure } = await client.rpc("get_shared_dojo_contact_details", { target_dojo_id: dojoId });
        if (!active) return;
        if (failure || !data?.[0]) throw new Error("Shared dojo details could not be loaded.");
        setContact(data[0] as SharedContact);
        setDraft(null);
        setStale(false);
      } catch {
        if (active) setError("Shared dojo details could not be loaded. Please try again.");
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [client, dojoId, retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!contact || !draft || saving.current || stale) return;
    if (draft.maps_url.trim() && !safeGoogleMapsUrl(draft.maps_url.trim())) {
      setError("Enter a valid Google Maps HTTPS link.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: failure } = await client.rpc("update_shared_dojo_contact_details", {
        target_dojo_id: dojoId, expected_version_token: contact.version_token,
        new_maps_url: draft.maps_url || null, new_instagram_username: draft.instagram_username || null,
      });
      if (failure || !data) {
        if (failure?.code === "40001") {
          setStale(true);
          throw new Error("These details changed elsewhere. Your edits are retained. Reload saved details before editing again.");
        }
        throw new Error(failure?.code === "42501" ? "You no longer have permission to edit this location." : "Shared details could not be saved. Check the fields and try again.");
      }
      setContact(data as SharedContact);
      setDraft(null);
      setMessage("Shared dojo details saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Shared dojo details could not be saved.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const maps = safeGoogleMapsUrl(contact?.maps_url ?? null);
  const instagram = instagramProfile(contact?.instagram_username ?? null);
  return <section aria-label="Shared dojo details" aria-busy={busy} className="mt-4 space-y-3 border-t border-neutral-700 pt-3 text-sm">
    <h3 className="font-semibold">Dojo details</h3>
    {error && <p role="alert" className="text-red-200">{error}</p>}
    <p role="status" aria-live="polite">{busy ? "Working…" : message}</p>
    {contact && !draft && <>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-neutral-400">Google Maps location</dt><dd>{maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Open Google Maps</a> : "Not provided"}</dd></div>
        <div><dt className="text-neutral-400">Instagram</dt><dd>{instagram ? <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">@{instagram.handle}</a> : "Not provided"}</dd></div>
      </dl>
      {contact.has_conflicts && <p className="text-amber-300">The class entries have different contact details. An authorised administrator needs to choose the shared details.</p>}
      {contact.can_manage && <button type="button" disabled={busy} onClick={() => {
        setDraft({ maps_url: contact.maps_url ?? "", instagram_username: contact.instagram_username ?? "" });
        setMessage(""); setError("");
      }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Edit shared dojo details</button>}
    </>}
    {draft && <form onSubmit={save} className="space-y-3">
      <p className="text-neutral-400">These details apply to all classes at this dojo.</p>
      {contact?.has_conflicts && <ul className="space-y-2">{contact.source_values.map(row => <li key={row.dojo_id} className="break-words">
        <span className="font-semibold">{row.class_name}</span>
        <p>{row.maps_url || "No Maps link"} · {row.instagram_username || "No Instagram"}</p>
        <button type="button" disabled={busy} onClick={() => setDraft({ maps_url: row.maps_url ?? "", instagram_username: row.instagram_username ?? "" })} className="min-h-11 text-sky-300 underline">Use {row.class_name} details</button>
      </li>)}</ul>}
      <label className="block" htmlFor={id + "-maps"}>Google Maps link<input id={id + "-maps"} type="url" maxLength={2048} value={draft.maps_url} disabled={busy}
        onChange={event => setDraft({ ...draft, maps_url: event.target.value })} className="mt-1 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" /></label>
      <label className="block" htmlFor={id + "-instagram"}>Dojo Instagram handle<input id={id + "-instagram"} maxLength={31} value={draft.instagram_username} disabled={busy}
        onChange={event => setDraft({ ...draft, instagram_username: event.target.value })} className="mt-1 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" /></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy || stale} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">Save shared dojo details</button>
        <button type="button" disabled={busy} onClick={() => { setDraft(null); setError(""); }} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Cancel edits</button></div>
    </form>}
    {(error || stale) && <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)} className="min-h-11 rounded border border-neutral-600 px-3 py-2">Reload saved dojo details</button>}
  </section>;
}

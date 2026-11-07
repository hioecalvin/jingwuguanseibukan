"use client";

import { useEffect, useMemo, useState } from "react";
import DojoLogo from "@/components/dojo-logo";
import CompactRecord from "@/components/compact-record";
import DojoContactDetails from "@/components/dojo-contact-details";
import { createClient } from "@/lib/supabase/client";
import type { DojoContact } from "@/lib/dojo-contact";

export default function DojosPage() {
  const client = useMemo(() => createClient(), []);
  const [dojos, setDojos] = useState<DojoContact[]>([]);
  const [selectedDojo, setSelectedDojo] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSelectedDojo(new URLSearchParams(window.location.search).get("dojo") ?? "");
    async function load() {
      setLoading(true); setError("");
      const result = await client.rpc("get_dojo_contact_details");
      if (!active) return;
      if (result.error) setError("Dojos could not be loaded. Please try again.");
      else setDojos((result.data ?? []) as DojoContact[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [client, retry]);
  const query = search.trim().toLocaleLowerCase();
  const filtered = dojos.filter(row => (!selectedDojo || row.dojo_id === selectedDojo) && `${row.dojo_name} ${row.class_name}`.toLocaleLowerCase().includes(query));
  return <div className="mx-auto w-full max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-bold">Dojos</h1><p className="mt-2 text-neutral-400">Find dojo locations, Instagram accounts and training schedules.</p></header>
    <label className="block" htmlFor="dojo-search">Search dojos<input id="dojo-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setSelectedDojo(""); }} placeholder="Dojo or class" className="mt-2 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" /></label>
    {selectedDojo && <button type="button" onClick={() => setSelectedDojo("")} className="min-h-11 rounded border border-neutral-600 px-3">Show all dojos</button>}
    {loading && <p role="status">Loading dojos…</p>}
    {error && <div><p role="alert" className="text-red-200">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 rounded border border-neutral-600 px-3 py-2">Retry dojos</button></div>}
    {!loading && !error && <div className="grid gap-4 md:grid-cols-2">{filtered.map(dojo => <CompactRecord key={`${dojo.dojo_id}-${selectedDojo}`} defaultExpanded={dojo.dojo_id === selectedDojo} summary={<span className="flex items-center gap-3"><DojoLogo name={dojo.dojo_name} /><span>{dojo.dojo_name}</span></span>} detail={`${dojo.class_name}${dojo.active ? "" : " · Inactive"}`} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-3"><DojoLogo name={dojo.dojo_name} /><h2 className="break-words text-xl font-semibold">{dojo.dojo_name}</h2></div><p className="text-neutral-400">{dojo.class_name}{!dojo.active && " · Inactive"}</p>
      <DojoContactDetails dojoId={dojo.dojo_id} initialContact={dojo} />
    </CompactRecord>)}</div>}
    {!loading && !error && !filtered.length && <p className="text-neutral-400">No dojos match your search.</p>}
  </div>;
}

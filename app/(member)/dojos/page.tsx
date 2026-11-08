"use client";

import { useEffect, useMemo, useState } from "react";
import DojoMartialArts from "@/components/dojo-martial-arts";
import SharedDojoContactDetails from "@/components/shared-dojo-contact-details";
import DojoLogo from "@/components/dojo-logo";
import DojoContactDetails from "@/components/dojo-contact-details";
import { createClient } from "@/lib/supabase/client";
import { dojoGroupKey, dojoGroupName } from "@/lib/dojo-groups";
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
  const grouped = new Map<string, { key: string; name: string; rows: DojoContact[] }>();
  for (const row of dojos) {
    const key = dojoGroupKey(row);
    const group = grouped.get(key);
    if (group) group.rows.push(row);
    else grouped.set(key, { key, name: dojoGroupName(row) ?? row.dojo_name, rows: [row] });
  }
  const filtered = [...grouped.values()].filter(group =>
    (!selectedDojo || group.rows.some(row => row.dojo_id === selectedDojo)) &&
    group.rows.some(row => (row.dojo_name + " " + row.class_name).toLocaleLowerCase().includes(query))
  );
  return <div className="mx-auto w-full max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-bold">Dojos</h1><p className="mt-2 text-neutral-400">Find dojo locations, Instagram accounts and training schedules.</p></header>
    <label className="block" htmlFor="dojo-search">Search dojos<input id="dojo-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setSelectedDojo(""); }} placeholder="Dojo or class" className="mt-2 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2" /></label>
    {selectedDojo && <button type="button" onClick={() => setSelectedDojo("")} className="min-h-11 rounded border border-neutral-600 px-3">Show all dojos</button>}
    {loading && <p role="status">Loading dojos…</p>}
    {error && <div><p role="alert" className="text-red-200">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 rounded border border-neutral-600 px-3 py-2">Retry dojos</button></div>}
    {!loading && !error && <div className="grid items-start gap-4 md:grid-cols-2">{filtered.map(group => <article
      key={group.key} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="flex items-center gap-3 text-xl font-semibold"><span aria-hidden="true"><DojoLogo name={group.name} /></span>{group.name}</h2>
      <DojoMartialArts classes={group.rows.map(row => ({ dojoId: row.dojo_id, classId: row.class_id, name: row.class_name, active: row.active }))} />
      {group.key.startsWith("location-")
        ? <SharedDojoContactDetails dojoId={group.rows[0].dojo_id} />
        : <DojoContactDetails dojoId={group.rows[0].dojo_id} initialContact={group.rows[0]} />}
    </article>)}</div>}
    {!loading && !error && !filtered.length && <p className="text-neutral-400">No dojos match your search.</p>}
  </div>;
}

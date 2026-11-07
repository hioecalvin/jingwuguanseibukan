"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Scope = {
  dojo_id: string;
  dojo_name: string;
  class_name: string;
  share_percent: number;
  nomination_id: string | null;
  collection_configured: boolean;
};
type Account = {
  nomination_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
};
const fieldClass = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2";

export default function SettlementDestinations() {
  const supabase = useMemo(() => createClient(), []);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await supabase.rpc("get_my_settlement_destinations");
        if (!active) return;
        if (result.error) {
          setError(result.error.message);
        } else {
          setScopes((result.data ?? []) as Scope[]);
        }
      } catch {
        if (active) setError("Unable to load settlement account setup.");
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  if (loaded && !error && scopes.length === 0) return null;
  const scope = scopes.find((row) => row.dojo_id === selected);
  return (
    <details className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <summary className="cursor-pointer font-semibold">Share destination accounts</summary>
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      {!loaded && <p className="mt-3 text-zinc-300">Loading account setup…</p>}
      {scopes.length > 0 && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-zinc-300">
            Each dojo nominates its share account. Record the transfer after making it through your bank.
          </p>
          <label className="block space-y-2">
            <span>Class and dojo</span>
            <select aria-label="Class and dojo" className={fieldClass} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Select class and dojo</option>
              {scopes.map((row) => <option key={row.dojo_id} value={row.dojo_id}>
                {row.class_name} · {row.dojo_name}
              </option>)}
            </select>
          </label>
          {scope && <DestinationForm key={scope.dojo_id} scope={scope} />}
        </div>
      )}
    </details>
  );
}

function DestinationForm({ scope }: { scope: Scope }) {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [bank, setBank] = useState("");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await supabase.rpc("get_settlement_destination_account", {
          target_dojo_id: scope.dojo_id, target_settlement_id: null,
        });
        if (!active) return;
        if (result.error) {
          setError(result.error.message);
          return;
        }
        const current = (result.data?.[0] ?? null) as Account | null;
        setAccount(current);
        setBank(current?.bank_name ?? "");
        setHolder(current?.account_holder_name ?? "");
        setNumber(current?.account_number ?? "");
      } catch {
        if (active) setError("Unable to load the nominated account.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [scope.dojo_id, supabase, revision]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await supabase.rpc("nominate_settlement_destination", {
        target_dojo_id: scope.dojo_id, expected_nomination_id: account?.nomination_id ?? null,
        new_bank_name: bank.trim(), new_account_holder_name: holder.trim(), new_account_number: number.trim(),
      });
      if (result.error) { setError(result.error.message); return; }
      setAccount({ nomination_id: result.data as string, bank_name: bank.trim(),
        account_holder_name: holder.trim(), account_number: number.trim() });
      setMessage("Destination saved for new settlements. Existing drafts keep their recorded destination.");
    } catch {
      setError("Unable to save the nominated account. Check the current account before retrying.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void save(event)} className="space-y-4">
      <p className="text-sm text-zinc-300">
        {scope.collection_configured ? "Member collection account configured." : "Set up the member collection account in Subscriptions."}{" "}
        <Link href="/admin/subscriptions" className="text-blue-300 underline">Manage collection account</Link>
      </p>
      {loading ? <p>Loading nominated account…</p> : <>
        <p className="text-sm text-zinc-300">Use the separate account nominated by {scope.class_name} · {scope.dojo_name} for its {Number(scope.share_percent)}% share.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2"><span>Destination bank</span>
            <input className={fieldClass} required maxLength={120} value={bank} onChange={(event) => setBank(event.target.value)} />
          </label>
          <label className="space-y-2"><span>Destination account holder</span>
            <input className={fieldClass} required maxLength={150} value={holder} onChange={(event) => setHolder(event.target.value)} />
          </label>
          <label className="space-y-2"><span>Destination account number</span>
            <input className={fieldClass} required maxLength={100} autoComplete="off" value={number} onChange={(event) => setNumber(event.target.value)} />
          </label>
        </div>
      </>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {message && <p role="status" className="text-emerald-300">{message}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading || busy}
          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold disabled:opacity-50">
          {busy ? "Saving…" : "Save nominated account"}
        </button>
        <button type="button" disabled={loading || busy} onClick={() => { setMessage(""); setRevision((value) => value + 1); }}
          className="rounded-lg border border-zinc-600 px-4 py-2 disabled:opacity-50">Reload account</button>
      </div>
    </form>
  );
}

export function SettlementDestinationAccount({ dojoId, settlementId }: { dojoId: string; settlementId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await supabase.rpc("get_settlement_destination_account", {
        target_dojo_id: dojoId, target_settlement_id: settlementId,
      });
      if (result.error) { setError(result.error.message); return; }
      setAccount((result.data?.[0] ?? null) as Account | null);
      setLoaded(true);
    } catch {
      setError("Unable to load this settlement's destination.");
    } finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-2">
    <button type="button" onClick={() => void load()} disabled={busy}
      className="rounded-lg border border-zinc-600 px-3 py-2 text-sm disabled:opacity-50">
      {busy ? "Loading…" : "View recorded destination"}
    </button>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {loaded && (account ? <dl className="space-y-1 text-sm">
      <div><dt className="text-zinc-400">Destination bank</dt><dd>{account.bank_name}</dd></div>
      <div><dt className="text-zinc-400">Account holder</dt><dd>{account.account_holder_name}</dd></div>
      <div><dt className="text-zinc-400">Account number</dt><dd>{account.account_number}</dd></div>
    </dl> : <p className="text-sm text-zinc-300">This settlement has no recorded destination account.</p>)}
  </div>;
}

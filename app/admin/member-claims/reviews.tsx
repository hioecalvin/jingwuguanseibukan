"use client";
import { useCallback, useEffect, useState } from "react";
type Claim = { claim_id: string; member_id: string; full_name: string; claimed_email: string; state: "verified" | "approved" };
async function request(body: object) {
  const response = await fetch("/api/admin/member-claims", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to review claims.");
  return result;
}
export default function ClaimReviews() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    try { const result = await request({ action: "list" }); setClaims(result.claims); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load claims."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function review(claimId: string, action: "approve" | "reject" | "retry_setup") {
    if (busy) return;
    setBusy(true); setMessage("");
    try { const result = await request({ claimId, action }); setMessage(result.message); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to review claim."); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 space-y-3" aria-busy={busy}>
    <button disabled={busy} onClick={load} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Refresh claims</button>
    <p role="status" aria-live="polite">{message}</p>
    {!busy && !claims.length && <p>No claims awaiting review.</p>}
    {claims.map(claim => <article key={claim.claim_id} className="rounded border border-neutral-700 p-3">
      <h2 className="font-medium">{claim.member_id} · {claim.full_name}</h2>
      <p className="break-all text-sm text-neutral-300">Verified email: {claim.claimed_email}</p>
      <p className="mt-1 text-sm">{claim.state === "approved" ? "Approved — account setup pending" : "Awaiting identity approval"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {claim.state === "verified" && <button disabled={busy} onClick={() => review(claim.claim_id, "approve")} className="min-h-11 rounded bg-cyan-300 px-3 py-2 text-black disabled:opacity-50">Approve identity</button>}
        {claim.state === "approved" && <button disabled={busy} onClick={() => review(claim.claim_id, "retry_setup")} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Retry setup email</button>}
        <button disabled={busy} onClick={() => review(claim.claim_id, "reject")} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">{claim.state === "approved" ? "Revoke approval" : "Reject claim"}</button>
      </div>
    </article>)}
  </section>;
}

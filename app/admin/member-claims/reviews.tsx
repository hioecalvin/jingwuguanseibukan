"use client";
import MemberIdLink from "@/components/member-id-link";
import { useCallback, useEffect, useRef, useState } from "react";
type Claim = { claim_id: string; member_id: string; full_name: string; claimed_email: string; state: "verified" | "approved" };
type Account = { member_id: string; full_name: string; email: string; verified_at: string; account_status: string };
async function request(body: object) {
  const response = await fetch("/api/admin/member-claims", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to review claims.");
  return result;
}
export default function ClaimReviews() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (targetPage = 1) => {
    const id = ++generation.current;
    setBusy(true); setError("");
    try {
      const [waiting, verified] = await Promise.all([request({ action: "list" }), request({ action: "verified_accounts", page: targetPage })]);
      if (id !== generation.current) return;
      const pages = Math.max(1, Math.ceil(verified.total / 50));
      if (targetPage > pages) { setAccounts([]); setTotal(verified.total); setPage(pages); setError("The account list changed. Refresh to load the current page."); }
      else { setClaims(waiting.claims); setAccounts(verified.accounts); setTotal(verified.total); setPage(targetPage); setLoaded(true); }
    } catch (cause) { if (id === generation.current) setError(cause instanceof Error ? cause.message : "Unable to load claims."); }
    finally { if (id === generation.current) setBusy(false); }
  }, []);
  const cancelRequests = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void load(); return cancelRequests; }, [load, cancelRequests]);
  async function review(claimId: string, action: "approve" | "reject" | "retry_setup") {
    if (busy) return;
    setBusy(true); setMessage(""); setError("");
    try { const result = await request({ claimId, action }); setMessage(result.message); await load(page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to review claim."); }
    finally { setBusy(false); }
  }
  const pageCount = Math.max(1, Math.ceil(total / 50));
  return <div className="mt-4 space-y-6" aria-busy={busy}>
    <button disabled={busy} onClick={() => void load(page)} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Refresh lists</button>
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    <p role="status" aria-live="polite">{busy ? "Loading member accounts…" : message}</p>
    <section aria-labelledby="waiting-claims" className="space-y-3">
      <h2 id="waiting-claims" className="text-xl font-semibold">Waiting for Confirmation</h2>
      <p className="text-sm text-neutral-400">Email-verified claims awaiting identity approval or password setup. Approval does not by itself complete account setup.</p>
      {loaded && !claims.length && <p>No claims waiting for confirmation.</p>}
      {claims.map(claim => <article key={claim.claim_id} className="rounded border border-neutral-700 p-3">
        <h3 className="font-medium"><MemberIdLink memberId={claim.member_id} /> · {claim.full_name}</h3>
        <p className="break-all text-sm text-neutral-300">Verified email: {claim.claimed_email}</p>
        <p className="mt-1 text-sm">{claim.state === "approved" ? "Approved — account setup pending" : "Awaiting identity approval"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {claim.state === "verified" && <button disabled={busy} onClick={() => review(claim.claim_id, "approve")} className="min-h-11 rounded bg-cyan-300 px-3 py-2 text-black disabled:opacity-50">Approve identity</button>}
          {claim.state === "approved" && <button disabled={busy} onClick={() => review(claim.claim_id, "retry_setup")} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Retry setup email</button>}
          <button disabled={busy} onClick={() => review(claim.claim_id, "reject")} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">{claim.state === "approved" ? "Revoke approval" : "Reject claim"}</button>
        </div>
      </article>)}
    </section>
    <section aria-labelledby="verified-accounts" className="space-y-3">
      <h2 id="verified-accounts" className="text-xl font-semibold">Verified Accounts</h2>
      <p className="text-sm text-neutral-400">Linked accounts with verified email addresses, sorted by JS ID. Disabled accounts remain labelled.</p>
      {loaded && <p className="text-sm">{total ? `Showing ${(page - 1) * 50 + 1}–${Math.min(page * 50, total)} of ${total}` : "No verified accounts in your scope."}</p>}
      <ul className="divide-y divide-neutral-800 rounded border border-neutral-700" aria-label="Verified member accounts">
        {accounts.map(account => <li key={account.member_id} className="grid gap-1 p-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
          <MemberIdLink memberId={account.member_id} /><div className="min-w-0"><p className="font-medium">{account.full_name}</p><p className="break-all text-neutral-400">{account.email}</p>{account.account_status !== "active" && <p className="text-amber-300">Account {account.account_status}</p>}</div>
        </li>)}
      </ul>
      <nav aria-label="Verified account pages" className="flex flex-wrap items-center gap-3 text-sm">
        <button disabled={busy || page <= 1} onClick={() => void load(page - 1)} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Previous 50</button>
        <span>Page {page} of {pageCount}</span>
        <button disabled={busy || page >= pageCount} onClick={() => void load(page + 1)} className="min-h-11 rounded border border-neutral-600 px-3 py-2 disabled:opacity-50">Next 50</button>
      </nav>
    </section>
  </div>;
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function VerifyForm() {
  const proof = useRef<{ claimId: string; token: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    // Fragment stays out of HTTP requests; clear browser history immediately.
    // Keep the ref on Strict Mode's second effect invocation after removal.
    if (window.location.hash) {
      const values = new URLSearchParams(window.location.hash.slice(1));
      proof.current = { claimId: values.get("claim") ?? "", token: values.get("token") ?? "" };
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  async function verify() {
    if (busy || done) return;
    if (!proof.current?.claimId || !proof.current.token) { setMessage("Open the complete verification link from your email."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/member-claims/verify", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proof.current),
      });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error ?? "Unable to verify this link.");
      if (response.ok) { proof.current = null; setDone(true); }
    } catch { setMessage("Unable to verify. Please check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 space-y-4" aria-busy={busy}>
    <p className="text-sm text-neutral-300">Confirm that you want to use this email address to claim your member record. Your Dojo Admin must approve the claim before account access is granted.</p>
    <button onClick={verify} disabled={busy || done} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">{done ? "Email verified" : busy ? "Verifying…" : "Verify email address"}</button>
    <p role="status" aria-live="polite">{message}</p>
    <Link href="/claim-id" className="inline-block text-cyan-300 underline">Request a new link</Link>
  </section>;
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
export default function SetupForm() {
  const proof = useRef<{ claimId: string; token: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (window.location.hash) {
      const values = new URLSearchParams(window.location.hash.slice(1));
      proof.current = { claimId: values.get("claim") ?? "", token: values.get("token") ?? "" };
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || done) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = data.get("password");
    if (!proof.current?.claimId || !proof.current.token) { setMessage("Open the complete setup link from your email."); return; }
    if (password !== data.get("confirmation")) { setMessage("The two passwords must match."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/member-claims/setup", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...proof.current, password }) });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error ?? "Unable to complete setup.");
      if (response.ok) { form.reset(); proof.current = null; setDone(true); }
    } catch { setMessage("Unable to confirm setup. Please check your connection before trying again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-4" aria-busy={busy}>
    <p id="claim-password-help" className="text-sm text-neutral-300">Choose 12–128 characters with an uppercase letter, a lowercase letter and a number. Your Dojo Admin will not see your password.</p>
    {!done && <>
      <div><label htmlFor="claim-password">New password</label><input id="claim-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="claim-password-help" className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 p-3" /></div>
      <div><label htmlFor="claim-password-confirm">Confirm password</label><input id="claim-password-confirm" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 p-3" /></div>
      <button disabled={busy} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">{busy ? "Setting up…" : "Set password"}</button>
    </>}
    <p role="status" aria-live="polite">{message}</p>
    <Link href="/login" className="inline-block text-cyan-300 underline">Go to login</Link>
  </form>;
}

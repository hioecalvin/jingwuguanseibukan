"use client";
import { useState, type FormEvent } from "react";

export default function ClaimForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/member-claims/request", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), dateOfBirth: data.get("dateOfBirth") }),
      });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error ?? "Unable to submit your request.");
    } catch { setMessage("Unable to submit your request. Please check your connection."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-4">
    <div><label htmlFor="claim-email" className="block text-sm">Registered email address</label>
      <input id="claim-email" name="email" type="email" required maxLength={254} autoComplete="email"
        className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 p-3" /></div>
    <div><label htmlFor="claim-date-of-birth" className="block text-sm">Registered date of birth</label>
      <input id="claim-date-of-birth" name="dateOfBirth" type="date" required autoComplete="bday"
        className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 p-3" /></div>
    <p className="text-sm text-neutral-300">Missing or incorrect registered details? Contact your Dojo Admin before claiming.</p>
    <button disabled={busy} className="min-h-11 rounded bg-cyan-300 px-4 py-2 font-medium text-black disabled:opacity-50">{busy ? "Submitting…" : "Send verification link"}</button>
    <p role="status" aria-live="polite" className="text-sm text-neutral-200">{message}</p>
  </form>;
}

import Link from "next/link";
import { memberClaimsEnabled } from "@/lib/features/member-claims";
import ClaimForm from "./request-form";

export default function ClaimPage() {
  return <main className="mx-auto min-h-screen max-w-md px-4 py-10 text-white">
    <h1 className="text-2xl font-semibold">Claim your member account</h1>
    <p className="mt-3 text-sm text-neutral-300">Use the email address and date of birth registered on your member record. Verify your email, then your Dojo Admin will check your identity. If either detail is missing or incorrect, contact your Dojo Admin first.</p>
    {memberClaimsEnabled() ? <ClaimForm /> : <p role="status" className="mt-6">Member claiming is not available yet. Please contact your Dojo Admin.</p>}
    <Link href="/login" className="mt-6 inline-block text-cyan-300 underline">Back to login</Link>
  </main>;
}

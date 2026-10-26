import { memberClaimsEnabled } from "@/lib/features/member-claims";
import VerifyForm from "./verify-form";
export default function VerifyPage() {
  return <main className="mx-auto min-h-screen max-w-md px-4 py-10 text-white">
    <h1 className="text-2xl font-semibold">Verify your email</h1>
    {memberClaimsEnabled() ? <VerifyForm /> : <p className="mt-4">Member claiming is not available yet. Please contact your Dojo Admin.</p>}
  </main>;
}

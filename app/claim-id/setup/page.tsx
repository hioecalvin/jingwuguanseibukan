import { memberClaimsEnabled } from "@/lib/features/member-claims";
import SetupForm from "./setup-form";
export default function SetupPage() {
  return <main className="mx-auto min-h-screen max-w-md px-4 py-10 text-white">
    <h1 className="text-2xl font-semibold">Set your password</h1>
    {memberClaimsEnabled() ? <SetupForm /> : <p className="mt-4">Member claiming is not available yet. Please contact your Dojo Admin.</p>}
  </main>;
}

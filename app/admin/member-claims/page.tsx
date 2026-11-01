import { memberClaimsEnabled } from "@/lib/features/member-claims";
import ClaimReviews from "./reviews";
export default function MemberClaimsPage() {
  return <main className="mx-auto max-w-3xl p-4">
    <h1 className="text-2xl font-semibold">Member ID claims</h1>
    <p className="mt-2 text-sm text-neutral-300">Check that the person requesting access is the existing member. Only claims within your current Dojo authority are shown.</p>
    {memberClaimsEnabled() ? <ClaimReviews /> : <p className="mt-4">Member claim review is not enabled yet.</p>}
  </main>;
}

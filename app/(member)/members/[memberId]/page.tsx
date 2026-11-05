
import MemberPersonalDetailsEditor from "@/components/member-personal-details-editor";
import MemberTrainingSummary from "@/components/member-training-summary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberIdLink from "@/components/member-id-link";
import { instagramProfile } from "@/lib/member-directory";

type MemberProfile = {
  member_id: string; full_name: string; avatar_url: string | null; instagram_username: string | null;
  is_self: boolean; can_manage: boolean; personal_edit_id: string | null;
  private_details: { email: string | null; phone: string | null; whatsapp: string | null; date_of_birth: string | null } | null;
  enrollments: { class_name: string; home_dojo: string | null; rank_name: string | null; membership_id: string | null; joined_date: string | null; status: string | null; last_training_date: string | null }[];
};
export default async function MemberProfilePage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const client = await createClient();
  const { data, error } = await client.rpc("get_member_profile_by_js_id", { target_js_id: memberId });
  if (error) return <main className="mx-auto max-w-3xl p-4"><h1 className="text-2xl font-semibold">Member profile</h1><p role="alert" className="mt-3">The profile could not be loaded. Please try again.</p><Link href="/directory" className="mt-4 inline-block text-sky-300 underline">Back to directory</Link></main>;
  if (!data) notFound();
  const person = data as MemberProfile;
  const instagram = instagramProfile(person.instagram_username);
  return <main className="mx-auto max-w-3xl space-y-5 p-4 text-white">
    <header className="flex items-center gap-4">
      {person.avatar_url && <img src={person.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */}
      <div><h1 className="text-2xl font-semibold">{person.full_name}</h1><MemberIdLink memberId={person.member_id} /></div>
    </header>
    {person.private_details && <section aria-label="Member contact details" className="rounded-lg border border-neutral-800 p-4"><dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-neutral-400">Email</dt><dd className="break-words">{person.private_details.email ?? "Unknown"}</dd></div>
      <div><dt className="text-neutral-400">Phone</dt><dd>{person.private_details.phone ?? "Unknown"}</dd></div>
      <div><dt className="text-neutral-400">WhatsApp</dt><dd>{person.private_details.whatsapp ?? "Unknown"}</dd></div>
      <div><dt className="text-neutral-400">Date of birth</dt><dd>{person.private_details.date_of_birth ?? "Unknown"}</dd></div>
    </dl></section>}
    {person.personal_edit_id && <MemberPersonalDetailsEditor memberId={person.personal_edit_id} />}
    <section aria-label="Class enrollments" className="space-y-3"><h2 className="font-semibold">Classes and dojos</h2>
      {person.enrollments.map((enrollment, index) => <article key={enrollment.membership_id ?? index} className="rounded-lg border border-neutral-800 p-3 text-sm">
        <h3 className="font-semibold">{enrollment.class_name} · {enrollment.home_dojo ?? "Dojo not assigned"}</h3><p>{enrollment.rank_name ?? "Rank not recorded"}</p>
        {person.private_details && <p className="mt-2 text-neutral-400">Joined: {enrollment.joined_date ?? "Unknown"} · Status: {enrollment.status ?? "Unknown"} · Last training: {enrollment.last_training_date ?? "Unknown"}</p>}
        {enrollment.membership_id && <MemberTrainingSummary membershipId={enrollment.membership_id} />}
      </article>)}
      {!person.enrollments.length && <p className="text-sm text-neutral-400">No class enrollments available.</p>}
    </section>
    {instagram && <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-block text-sky-300 underline">Instagram @{instagram.handle}</a>}
    <div className="flex flex-wrap gap-4 text-sm">
      {person.is_self && <Link href="/profile" className="text-sky-300 underline">Edit my profile</Link>}
      {person.can_manage && <Link href={`/admin/members?member=${encodeURIComponent(person.member_id)}`} className="text-sky-300 underline">Manage member and official records</Link>}
      <Link href="/directory" className="text-sky-300 underline">Member directory</Link>
    </div>
  </main>;
}

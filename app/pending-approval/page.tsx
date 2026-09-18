import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import ClassEnrollmentPanel from "@/components/class-enrollment-panel";
import UserMenu from "@/components/user-menu";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export default async function PendingApprovalPage() {
  const currentUser = await getCurrentAppUser();

  if (
    currentUser.hasApprovedMembership ||
    currentUser.role !== "member"
  ) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              src="/js-logo.jpeg"
              alt="Jingwuguan Seibukan"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />

            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">
                Jingwuguan Seibukan
              </p>
              <h1 className="truncate text-2xl font-bold">
                Membership approval
              </h1>
            </div>
          </div>

          <UserMenu
            role={currentUser.role}
            memberName={currentUser.fullName}
            memberId={currentUser.memberId}
          />
        </header>

        <section className="mt-8 rounded-2xl border border-amber-900 bg-amber-950/20 p-6">
          <h2 className="text-xl font-semibold text-amber-200">
            Your account is verified and awaiting class approval
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/70">
            An authorised Admin must approve a class membership before the
            Member dashboard and repository become available. You can review,
            cancel, or resubmit eligible class requests below.
          </p>

          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/40"
          >
            Check approval status
          </Link>
        </section>

        <div className="mt-8">
          <ClassEnrollmentPanel />
        </div>
      </div>
    </main>
  );
}

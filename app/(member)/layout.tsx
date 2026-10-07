import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";

import {
  getCurrentAppUser,
} from "@/lib/auth/get-current-app-user";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser =
    await getCurrentAppUser();

  /*
   * Force temporary password changes
   * before entering the main app.
   */

  if (
    currentUser.mustChangePassword
  ) {
    redirect(
      "/change-password"
    );
  }

  /*
   * Disabled accounts cannot enter.
   */

  if (
    currentUser.accountStatus ===
    "disabled"
  ) {
    redirect(
      "/login?error=disabled"
    );
  }

  /*
   * A verified account remains outside the protected
   * Member application until an Admin approves at least
   * one class membership. Admins retain access to their
   * management scope even when they do not train in a
   * class themselves.
   */

  if (
    currentUser.role ===
      "member" &&
    !currentUser.hasApprovedMembership
  ) {
    redirect(
      "/pending-approval"
    );
  }

  /*
   * Member/Admin/Super Admin all use
   * the same application shell.
   */

  return (
    <AppShell
      role={currentUser.role}
      memberName={currentUser.fullName}
      memberId={currentUser.memberId}
      hasRepositoryUpload={currentUser.hasRepositoryUpload}
    >
      {children}
    </AppShell>
  );
}

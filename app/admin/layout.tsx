import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { assessmentHistoryEnabled } from "@/lib/features/assessment-history";

import {
  getCurrentAppUser,
} from "@/lib/auth/get-current-app-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser =
    await getCurrentAppUser();

  /*
   * =====================================================
   * FORCE TEMPORARY PASSWORD CHANGE
   * =====================================================
   */

  if (currentUser.mustChangePassword) {
    redirect("/change-password");
  }

  /*
   * =====================================================
   * ADMIN ACCESS ONLY
   * =====================================================
   */

  if (
    currentUser.role !== "admin" &&
    currentUser.role !== "super_admin"
  ) {
    redirect("/");
  }

  /*
   * =====================================================
   * ADMIN APPLICATION SHELL
   * =====================================================
   */

  return (
    <AppShell
      role={currentUser.role}
      memberName={currentUser.fullName}
      memberId={currentUser.memberId}
      hasRepositoryUpload={currentUser.hasRepositoryUpload}
      assessmentHistoryEnabled={assessmentHistoryEnabled()}
    >
      {children}
    </AppShell>
  );
}

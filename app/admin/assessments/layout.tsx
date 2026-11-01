import { redirect } from "next/navigation";

import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";

export default async function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentAppUser();

  if (currentUser.role !== "super_admin") {
    redirect("/");
  }

  return children;
}

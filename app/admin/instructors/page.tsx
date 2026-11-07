import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user";
import InstructorAppointments from "@/components/instructor-appointments";

export default async function InstructorsPage() {
  const user = await getCurrentAppUser();
  if (user.role !== "super_admin") redirect("/admin");
  return <InstructorAppointments />;
}

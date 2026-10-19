import { notFound } from "next/navigation";
import { assessmentHistoryEnabled } from "@/lib/features/assessment-history";
import AssessmentHistoryClient from "./assessment-history-client";

// Evaluate the deployment gate per request, never bake it into a static page.
export const dynamic = "force-dynamic";

export default function Page() {
  if (!assessmentHistoryEnabled()) notFound();
  // The parent Member layout and the database RPC still enforce account/scope access.
  return <AssessmentHistoryClient />;
}

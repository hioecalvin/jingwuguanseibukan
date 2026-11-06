import Link from "next/link";
import type { ReactNode } from "react";

/** One route for every JS ID. The destination enforces profile visibility. */
export default function MemberIdLink({ memberId, fallback = "Not assigned", className = "", children }: {
  memberId: string | null | undefined;
  fallback?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const value = memberId?.trim();
  if (!value || ["—", "-", "Not assigned", "Unknown", "No Member ID"].includes(value)) return <>{fallback}</>;
  return <Link href={`/members/${encodeURIComponent(value)}`} prefetch={false}
    className={`inline-flex min-h-6 min-w-6 items-center rounded-sm text-sky-300 underline decoration-sky-600 underline-offset-2 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 ${className}`}
    aria-label={`View member profile ${value}`}>{children ?? value}</Link>;
}

"use client";

import Link from "next/link";
import CompactNavigation from "@/components/compact-navigation";
import { usePathname } from "next/navigation";

import {
  getNavigationForRole,
  type AppRole,
} from "@/lib/navigation";


type SidebarProps = {
  role: AppRole;
  memberName?: string | null;
  hasRepositoryUpload?: boolean;
  assessmentHistoryEnabled?: boolean;
};




export default function Sidebar({
  role,
  memberName,
  hasRepositoryUpload = false,
  assessmentHistoryEnabled = false,
}: SidebarProps) {
  const pathname =
    usePathname();

  const items =
    getNavigationForRole(
      role,
      { repositoryUpload: hasRepositoryUpload, assessmentHistory: assessmentHistoryEnabled },
    );




  return (
    <aside
      className="
        hidden
        h-dvh
        sticky
        top-0
        w-60
        shrink-0
        border-r
        border-neutral-800
        bg-neutral-950
        lg:flex
        lg:flex-col
      "
    >
      <div
        className="
          border-b
          border-neutral-800
          px-4
          py-4
        "
      >
        <Link
          href="/"
          className="
            block
          "
        >
          <div
            className="
              text-lg
              font-semibold
              tracking-tight
              text-white
            "
          >
            Jingwuguan Seibukan
          </div>

          <div
            className="
              mt-1
              text-sm
              text-neutral-400
            "
          >
            Member Management
          </div>
        </Link>
      </div>


      <nav aria-label="Desktop primary" className="min-h-0 flex-1 overflow-y-auto p-2">
        <CompactNavigation key={pathname} items={items} pathname={pathname} />
      </nav>


      <div
        className="
          border-t
          border-neutral-800
          px-6
          py-3
        "
      >
        <div
          className="
            truncate
            text-sm
            font-medium
            text-neutral-200
          "
        >
          {memberName ??
            "Member"}
        </div>

        <div
          className="
            mt-1
            text-xs
            capitalize
            text-neutral-400
          "
        >
          {role.replace(
            "_",
            " "
          )}
        </div>
      </div>
    </aside>
  );
}

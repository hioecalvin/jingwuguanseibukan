"use client";

import type { ReactNode } from "react";

import MobileNav from "@/components/mobile-nav";
import Sidebar from "@/components/sidebar";
import UserMenu from "@/components/user-menu";

import type {
  AppRole,
} from "@/lib/navigation";

type AppShellProps = {
  children: ReactNode;

  role: AppRole;

  memberName?: string | null;

  memberId?: string | null;
};

export default function AppShell({
  children,
  role,
  memberName,
  memberId,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <MobileNav
        role={role}
        memberName={memberName}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <Sidebar
          role={role}
          memberName={memberName}
        />

        <div className="min-w-0 flex-1">
          <header
            className="
              hidden
              h-16
              items-center
              justify-end
              border-b
              border-neutral-800
              bg-neutral-950/90
              px-6
              backdrop-blur
              lg:flex
            "
          >
            <UserMenu
              role={role}
              memberName={memberName}
              memberId={memberId}
            />
          </header>

          <main
            className="
              min-w-0
              px-4
              py-5
              sm:px-6
              lg:px-8
            "
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
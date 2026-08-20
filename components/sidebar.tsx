"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getNavigationForRole,
  type AppRole,
} from "@/lib/navigation";


type SidebarProps = {
  role: AppRole;
  memberName?: string | null;
};


const sectionLabels = {
  main: "Main",
  management: "Management",
  content: "Content",
  system: "System",
} as const;


export default function Sidebar({
  role,
  memberName,
}: SidebarProps) {
  const pathname =
    usePathname();

  const items =
    getNavigationForRole(
      role
    );


  const sections = [
    "main",
    "management",
    "content",
    "system",
  ] as const;


  return (
    <aside
      className="
        hidden
        min-h-screen
        w-72
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
          px-6
          py-6
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
              text-neutral-500
            "
          >
            Member Management
          </div>
        </Link>
      </div>


      <nav
        className="
          flex-1
          overflow-y-auto
          px-3
          py-4
        "
      >
        {sections.map(
          (
            section
          ) => {

            const sectionItems =
              items.filter(
                (
                  item
                ) =>
                  item.section ===
                  section
              );


            if (
              sectionItems.length ===
              0
            ) {
              return null;
            }


            return (
              <div
                key={section}
                className="
                  mb-6
                "
              >
                <div
                  className="
                    mb-2
                    px-3
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-neutral-600
                  "
                >
                  {
                    sectionLabels[
                      section
                    ]
                  }
                </div>


                <div
                  className="
                    space-y-1
                  "
                >
                  {sectionItems.map(
                    (
                      item
                    ) => {

                      const active =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname ===
                              item.href ||
                            pathname.startsWith(
                              `${item.href}/`
                            );


                      return (
                        <Link
                          key={
                            item.href
                          }
                          href={
                            item.href
                          }
                          className={[
                            `
                              block
                              rounded-lg
                              px-3
                              py-2.5
                              text-sm
                              font-medium
                              transition
                            `,

                            active
                              ? `
                                  bg-neutral-800
                                  text-white
                                `
                              : `
                                  text-neutral-400
                                  hover:bg-neutral-900
                                  hover:text-white
                                `,
                          ].join(
                            " "
                          )}
                        >
                          {
                            item.label
                          }
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            );
          }
        )}
      </nav>


      <div
        className="
          border-t
          border-neutral-800
          px-6
          py-5
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
            text-neutral-500
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
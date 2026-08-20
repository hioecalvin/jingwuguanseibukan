"use client";

import {
  useState,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getNavigationForRole,
  type AppRole,
} from "@/lib/navigation";


type MobileNavProps = {
  role: AppRole;
  memberName?: string | null;
};


export default function MobileNav({
  role,
  memberName,
}: MobileNavProps) {
  const pathname =
    usePathname();

  const [
    open,
    setOpen,
  ] =
    useState(false);


  const items =
    getNavigationForRole(
      role
    );


  return (
    <>
      <header
        className="
          sticky
          top-0
          z-40
          flex
          h-16
          items-center
          justify-between
          border-b
          border-neutral-800
          bg-neutral-950/95
          px-4
          backdrop-blur
          lg:hidden
        "
      >
        <Link
          href="/"
          className="
            min-w-0
          "
        >
          <div
            className="
              truncate
              text-sm
              font-semibold
              text-white
            "
          >
            Jingwuguan Seibukan
          </div>

          <div
            className="
              truncate
              text-xs
              text-neutral-500
            "
          >
            {memberName ??
              "Member"}
          </div>
        </Link>


        <button
          type="button"
          onClick={() =>
            setOpen(
              true
            )
          }
          className="
            rounded-lg
            border
            border-neutral-800
            px-3
            py-2
            text-sm
            font-medium
            text-neutral-200
            hover:bg-neutral-900
          "
        >
          Menu
        </button>
      </header>


      {open && (
        <div
          className="
            fixed
            inset-0
            z-50
            lg:hidden
          "
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setOpen(
                false
              )
            }
            className="
              absolute
              inset-0
              bg-black/70
            "
          />


          <div
            className="
              absolute
              right-0
              top-0
              flex
              h-full
              w-[86%]
              max-w-sm
              flex-col
              border-l
              border-neutral-800
              bg-neutral-950
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-neutral-800
                px-5
                py-5
              "
            >
              <div>
                <div
                  className="
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  Jingwuguan Seibukan
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


              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="
                  rounded-lg
                  border
                  border-neutral-800
                  px-3
                  py-2
                  text-sm
                  text-neutral-300
                  hover:bg-neutral-900
                "
              >
                Close
              </button>
            </div>


            <nav
              className="
                flex-1
                overflow-y-auto
                p-3
              "
            >
              <div
                className="
                  space-y-1
                "
              >
                {items.map(
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
                        onClick={() =>
                          setOpen(
                            false
                          )
                        }
                        className={[
                          `
                            block
                            rounded-lg
                            px-4
                            py-3
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
            </nav>


            <div
              className="
                border-t
                border-neutral-800
                px-5
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
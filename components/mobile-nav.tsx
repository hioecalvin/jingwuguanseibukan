"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
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
  hasRepositoryUpload?: boolean;
};


export default function MobileNav({
  role,
  memberName,
  hasRepositoryUpload = false,
}: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = useId();

  function closeNavigation() {
    dialogRef.current?.close();
  }

  function openNavigation() {
    dialogRef.current?.showModal();
    setOpen(true);
    closeButtonRef.current?.focus();
  }

  function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = event.currentTarget;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"))
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const active = dialog.ownerDocument.activeElement;
    // Retain native modal inertness while making every navigation control
    // reachable even when a browser's default Tab order skips links.
    if (!controls.length) return;
    const index = controls.findIndex((element) => element === active);
    const next = index < 0 ? 0 : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
  }

  useEffect(() => {
    // Do not leave an invisible modal making the desktop page inert.
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const pathname =
    usePathname();

  const [
    open,
    setOpen,
  ] =
    useState(false);


  const items =
    getNavigationForRole(
      role,
      { repositoryUpload: hasRepositoryUpload },
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
              text-neutral-400
            "
          >
            {memberName ??
              "Member"}
          </div>
        </Link>


        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          onClick={openNavigation}
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


        <dialog
          ref={dialogRef}
          id={dialogId}
          aria-labelledby={titleId}
          data-mobile-navigation
          onClose={() => {
            setOpen(false);
            // Pointer activation does not focus buttons in every engine.
            // Do not try to focus the hidden mobile trigger after a resize.
            if (triggerRef.current?.getClientRects().length) triggerRef.current.focus();
          }}
          onKeyDown={containDialogFocus}
          className="
            fixed
            inset-0
            z-50
            m-0
            h-dvh
            max-h-none
            w-full
            max-w-none
            border-0
            bg-transparent
            p-0
            text-neutral-100
          "
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close navigation"
            onClick={closeNavigation}
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
                  id={titleId}
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
                    text-neutral-400
                  "
                >
                  {role.replace(
                    "_",
                    " "
                  )}
                </div>
              </div>


              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeNavigation}
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
              aria-label="Mobile primary"
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
                        aria-current={active ? "page" : undefined}
                        onClick={closeNavigation}
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
        </dialog>
    </>
  );
}

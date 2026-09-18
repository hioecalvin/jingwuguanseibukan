"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import type {
  AppRole,
} from "@/lib/navigation";

type UserMenuProps = {
  memberName?: string | null;

  memberId?: string | null;

  role: AppRole;
};

export default function UserMenu({
  memberName,
  memberId,
  role,
}: UserMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const router =
    useRouter();

  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    if (open) signOutRef.current?.focus();
  }, [open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  async function handleLogout() {
    if (signingOut) return;
    setErrorMessage("");
    try {
      setSigningOut(true);

      const supabase =
        createClient();

      const { error } =
        await supabase.auth.signOut({ scope: "local" });

      if (error) {
        setErrorMessage("Unable to sign out. Please try again.");
        return;
      }

      router.replace("/login");

      router.refresh();
    } catch {
      setErrorMessage("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const initial =
    (
      memberName
        ?.trim()
        ?.[0] ??
      "M"
    ).toUpperCase();

  return (
    <div className="relative" onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }} onBlur={(event) => {
      // Disabling the focused sign-out button can blur it with no new focus
      // target. Keep its pending/error state visible; close on actual exit.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={triggerRef}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        type="button"
        onClick={() =>
          setOpen(
            (value) =>
              !value
          )
        }
        className="
          flex
          min-w-0
          items-center
          gap-3
          rounded-xl
          border
          border-neutral-800
          bg-neutral-900
          px-3
          py-2
          text-left
          transition
          hover:bg-neutral-800
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-neutral-800
            text-sm
            font-semibold
            text-white
          "
        >
          {initial}
        </div>

        <div className="hidden min-w-0 sm:block">
          <div
            className="
              max-w-40
              truncate
              text-sm
              font-medium
              text-white
            "
          >
            {memberName ?? "Member"}
          </div>

          <div
            className="
              mt-0.5
              text-xs
              capitalize
              text-neutral-400
            "
          >
            {role.replaceAll(
              "_",
              " "
            )}
          </div>
        </div>
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close user menu"
            onClick={closeMenu}
            className="
              fixed
              inset-0
              z-40
              cursor-default
            "
          />

          <div
            id={menuId}
            role="region"
            aria-label="Account menu"
            className="
              absolute
              right-0
              top-full
              z-50
              mt-2
              w-64
              overflow-hidden
              rounded-xl
              border
              border-neutral-800
              bg-neutral-950
              shadow-2xl
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
              <div
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-white
                "
              >
                {memberName ??
                  "Member"}
              </div>

              {memberId && (
                <div
                  className="
                    mt-1
                    text-xs
                    text-neutral-400
                  "
                >
                  Member ID:{" "}
                  {memberId}
                </div>
              )}

              <div
                className="
                  mt-1
                  text-xs
                  capitalize
                  text-neutral-400
                "
              >
                {role.replaceAll(
                  "_",
                  " "
                )}
              </div>
            </div>

            <div className="p-2">
              {errorMessage && <p role="alert" className="px-3 py-2 text-sm text-red-300">{errorMessage}</p>}
              <button
                ref={signOutRef}
                type="button"
                disabled={
                  signingOut
                }
                onClick={
                  handleLogout
                }
                className="
                  w-full
                  rounded-lg
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-medium
                  text-red-300
                  transition-colors
                  hover:bg-red-950/40
                  disabled:cursor-not-allowed
                  disabled:bg-neutral-900
                  disabled:text-red-200
                "
              >
                {signingOut
                  ? "Signing out..."
                  : "Sign out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

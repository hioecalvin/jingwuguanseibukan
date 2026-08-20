"use client";

import { useState } from "react";
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
  const router =
    useRouter();

  const [open, setOpen] =
    useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  async function handleLogout() {
    try {
      setSigningOut(true);

      const supabase =
        createClient();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Sign out error:",
          error
        );

        return;
      }

      router.replace("/login");

      router.refresh();
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
    <div className="relative">
      <button
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
              text-neutral-500
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
            aria-label="Close user menu"
            onClick={() =>
              setOpen(false)
            }
            className="
              fixed
              inset-0
              z-40
              cursor-default
            "
          />

          <div
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
                    text-neutral-500
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
                  text-neutral-500
                "
              >
                {role.replaceAll(
                  "_",
                  " "
                )}
              </div>
            </div>

            <div className="p-2">
              <button
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
                  transition
                  hover:bg-red-950/40
                  disabled:cursor-not-allowed
                  disabled:opacity-50
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
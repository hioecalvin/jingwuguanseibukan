"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


export default function NotificationBell() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {
    let mounted =
      true;


    async function loadUnreadCount() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();


      if (
        !user
      ) {
        if (
          mounted
        ) {
          setLoading(
            false
          );
        }

        return;
      }


      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_my_unread_notification_count"
        );


      if (
        !mounted
      ) {
        return;
      }


      if (
        error
      ) {
        console.error(
          "Failed to load notification count:",
          error
        );

        setUnreadCount(
          0
        );

        setLoading(
          false
        );

        return;
      }


      setUnreadCount(
        Number(
          data ??
          0
        )
      );


      setLoading(
        false
      );
    }


    loadUnreadCount();


    /*
     * Refresh periodically.
     *
     * This keeps things simple for now.
     * Later we can replace this with
     * Supabase Realtime if wanted.
     */

    const interval =
      window.setInterval(
        loadUnreadCount,
        30000
      );


    /*
     * Also refresh whenever the user
     * comes back to this browser tab.
     */

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadUnreadCount();
      }
    }


    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    return () => {
      mounted =
        false;

      window.clearInterval(
        interval
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    supabase,
  ]);


  return (
    <button
      type="button"
      onClick={() =>
        router.push(
          "/notifications"
        )
      }
      aria-label={`Notifications${
        unreadCount >
        0
          ? `, ${unreadCount} unread`
          : ""
      }`}
      title="Notifications"
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 transition hover:border-sky-700 hover:bg-neutral-800 hover:text-white"
    >

      {/* BELL ICON */}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>


      {/* COUNT */}

      {!loading &&
        unreadCount >
          0 && (

        <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-950 bg-red-600 px-1 text-[10px] font-bold leading-none text-white">

          {unreadCount >
          99
            ? "99+"
            : unreadCount}

        </span>

      )}

    </button>
  );
}
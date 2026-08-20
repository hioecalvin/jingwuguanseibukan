"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  class_id: string | null;

  classes: {
    name: string;
  } | null;
};

export default function AnnouncementsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadAnnouncements() {
      //
      // CHECK LOGIN
      //
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      //
      // LOAD ANNOUNCEMENTS
      //
      const {
        data,
        error,
      } = await supabase
        .from("announcements")
        .select(`
          id,
          title,
          message,
          created_at,
          class_id,

          classes (
            name
          )
        `)
        .eq("published", true)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Announcement error:",
          error
        );

        setMessage(error.message);
        setLoading(false);

        return;
      }

      setAnnouncements(
        (data ?? []) as unknown as Announcement[]
      );

      setLoading(false);
    }

    loadAnnouncements();
  }, [router, supabase]);

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
      "en-AU",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  //
  // LOADING
  //
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading announcements...
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <header className="border-b border-neutral-800 pb-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <Image
                src="/js-logo.jpeg"
                alt="Jingwuguan Seibukan"
                width={65}
                height={65}
                className="rounded-xl"
              />

              <div>

                <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">
                  Jingwuguan Seibukan
                </p>

                <h1 className="text-3xl font-bold">
                  Announcements
                </h1>

                <p className="mt-1 text-sm text-neutral-400">
                  Latest updates and
                  notices.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 sm:self-auto"
            >
              ← Home
            </button>

          </div>

        </header>


        {/* ERROR */}

        {message && (

          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300">
            {message}
          </div>

        )}


        {/* NO ANNOUNCEMENTS */}

        {!message &&
          announcements.length === 0 && (

          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

            <h2 className="text-xl font-semibold">
              No Announcements
            </h2>

            <p className="mt-2 text-neutral-400">
              There are no published
              announcements for you at
              the moment.
            </p>

          </div>

        )}


        {/* ANNOUNCEMENTS */}

        <div className="mt-8 space-y-5">

          {announcements.map(
            (announcement) => (

              <article
                key={
                  announcement.id
                }
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
              >

                <div className="flex flex-col justify-between gap-4 sm:flex-row">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">

                      {announcement.class_id
                        ? announcement
                            .classes
                            ?.name ??
                          "Class"
                        : "All Members"}

                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {
                        announcement.title
                      }
                    </h2>

                  </div>

                  <p className="shrink-0 text-xs text-neutral-500">

                    {formatDate(
                      announcement.created_at
                    )}

                  </p>

                </div>

                <div className="mt-5 border-t border-neutral-800 pt-5">

                  <p className="whitespace-pre-line leading-7 text-neutral-300">
                    {
                      announcement.message
                    }
                  </p>

                </div>

              </article>

            )
          )}

        </div>

      </div>

    </main>
  );
}
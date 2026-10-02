"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";


type DirectoryMember = {
  class_name: string;
  full_name: string;
  avatar_url: string | null;
  current_rank: string | null;
  home_dojo: string | null;
  instagram_username: string | null;
};


export default function MemberDirectoryPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [members, setMembers] =
    useState<DirectoryMember[]>([]);
  const [selectedClass, setSelectedClass] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      const {
        data,
        error: directoryError,
      } = await supabase.rpc(
        "get_my_member_directory",
      );

      if (!active) {
        return;
      }

      if (directoryError) {
        setError(
          "The member directory is temporarily unavailable.",
        );
        setLoading(false);
        return;
      }

      setMembers(
        (data ?? []) as DirectoryMember[],
      );
      setLoading(false);
    }

    void loadDirectory();

    return () => {
      active = false;
    };
  }, [supabase]);

  const classNames = useMemo(
    () => [
      ...new Set(
        members.map(
          (member) => member.class_name,
        ),
      ),
    ],
    [members],
  );

  const visibleMembers =
    selectedClass
      ? members.filter(
          (member) =>
            member.class_name ===
            selectedClass,
        )
      : members;

  return (
    <main className="mx-auto w-full max-w-6xl">
      <header className="border-b border-neutral-800 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Community
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Member Directory
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Browse members of your own classes across every dojo. Private contact, identity, attendance and payment information is never shown here.
        </p>
      </header>

      {classNames.length > 1 && (
        <div className="mt-6 max-w-sm">
          <label
            htmlFor="directory-class-filter"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Class
          </label>

          <select
            id="directory-class-filter"
            value={selectedClass}
            onChange={(event) =>
              setSelectedClass(
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-sky-600"
          >
            <option value="">
              All my classes
            </option>

            {classNames.map(
              (className) => (
                <option
                  key={className}
                  value={className}
                >
                  {className}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
          Loading directory...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : visibleMembers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
          No eligible members are listed for your current classes.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleMembers.map(
            (member, index) => (
              <article
                key={`${member.class_name}-${member.full_name}-${member.home_dojo ?? ""}-${index}`}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-700 bg-neutral-800">
                    {member.avatar_url ? (
                      // Supabase avatar URLs may be refreshed independently of this build.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-neutral-500" aria-hidden="true">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-white">
                      {member.full_name}
                    </h2>

                    <p className="mt-1 text-sm font-medium text-sky-300">
                      {member.class_name}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">
                      Current rank
                    </dt>
                    <dd className="mt-1 text-neutral-100">
                      {member.current_rank ?? "Not recorded"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-500">
                      Home dojo
                    </dt>
                    <dd className="mt-1 text-neutral-100">
                      {member.home_dojo ?? "Not assigned"}
                    </dd>
                  </div>

                  {member.instagram_username && (
                    <div>
                      <dt className="text-neutral-500">
                        Instagram
                      </dt>
                      <dd className="mt-1 text-neutral-100">
                        @{member.instagram_username}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}

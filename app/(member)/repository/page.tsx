"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Membership = {
  id: string;

  status:
    | "active"
    | "break_1"
    | "break_2"
    | "inactive";

  classes: {
    id: string;
    name: string;
  } | null;
};

export default function RepositoryPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const router = useRouter();

  const [memberships, setMemberships] =
    useState<Membership[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  /*
   * =====================================================
   * LOAD REPOSITORY ACCESS
   * =====================================================
   */

  useEffect(() => {
    let active = true;

    async function loadRepository() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } =
        await supabase
          .from("class_memberships")
          .select(`
            id,
            status,

            classes (
              id,
              name
            )
          `)
          .eq("user_id", user.id)
          .in("status", [
            "active",
            "break_1",
            "break_2",
          ]);

      if (error) {
        if (active) {
          setMessage(error.message);
          setLoading(false);
        }

        return;
      }

      if (active) {
        /*
         * Remove any membership that somehow
         * does not have a valid linked class.
         */

        const validMemberships = (
          (data ?? []) as unknown as Membership[]
        ).filter(
          (membership) =>
            membership.classes?.id &&
            membership.classes?.name
        );

        /*
         * Sort classes alphabetically.
         */

        validMemberships.sort((a, b) =>
          (a.classes?.name ?? "").localeCompare(
            b.classes?.name ?? ""
          )
        );

        setMemberships(validMemberships);
        setLoading(false);
      }
    }

    loadRepository();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  /*
   * =====================================================
   * HELPERS
   * =====================================================
   */

  function statusLabel(
    status: Membership["status"]
  ) {
    if (status === "break_1") {
      return "Break";
    }

    if (status === "break_2") {
      return "Break";
    }

    if (status === "inactive") {
      return "Inactive";
    }

    return "Active";
  }

  function statusClass(
    status: Membership["status"]
  ) {
    if (status === "active") {
      return `
        border-green-800
        bg-green-950/30
        text-green-300
      `;
    }

    return `
      border-amber-800
      bg-amber-950/30
      text-amber-300
    `;
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-neutral-700
              border-t-sky-400
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-neutral-400
            "
          >
            Loading repository...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-6xl
      "
    >
      {/*
       * HEADER
       */}

      <header
        className="
          border-b
          border-neutral-800
          pb-7
        "
      >
        <p
          className="
            text-sm
            font-semibold
            uppercase
            tracking-[0.2em]
            text-sky-400
          "
        >
          Training Library
        </p>

        <h1
          className="
            mt-2
            text-3xl
            font-bold
            tracking-tight
            sm:text-4xl
          "
        >
          Repository
        </h1>

        <p
          className="
            mt-2
            max-w-2xl
            text-sm
            leading-6
            text-neutral-400
          "
        >
          Access training materials,
          ranks, tiers and videos for
          your registered classes.
        </p>
      </header>

      {/*
       * ERROR
       */}

      {message && (
        <div
          className="
            mt-6
            rounded-xl
            border
            border-red-900
            bg-red-950/30
            p-4
            text-sm
            text-red-300
          "
        >
          {message}
        </div>
      )}

      {/*
       * NO ACCESS
       */}

      {!message &&
        memberships.length === 0 && (
          <section
            className="
              mt-8
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-10
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-neutral-800
                bg-neutral-950
                text-2xl
              "
            >
              ◇
            </div>

            <h2
              className="
                mt-5
                text-xl
                font-semibold
              "
            >
              No Repository Access
            </h2>

            <p
              className="
                mx-auto
                mt-2
                max-w-lg
                text-sm
                leading-6
                text-neutral-400
              "
            >
              You currently do not have
              an active or break-status
              class membership with
              repository access.
            </p>
          </section>
        )}

      {/*
       * CLASS REPOSITORIES
       */}

      {!message &&
        memberships.length > 0 && (
          <section className="mt-8">
            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.15em]
                    text-neutral-500
                  "
                >
                  My Classes
                </p>

                <h2
                  className="
                    mt-1
                    text-2xl
                    font-bold
                  "
                >
                  Select a Repository
                </h2>
              </div>

              <p
                className="
                  text-sm
                  text-neutral-500
                "
              >
                {memberships.length}{" "}
                {memberships.length === 1
                  ? "class"
                  : "classes"}
              </p>
            </div>

            <div
              className="
                mt-5
                grid
                gap-5
                md:grid-cols-2
              "
            >
              {memberships.map(
                (membership) => {
                  const classData =
                    membership.classes;

                  if (!classData) {
                    return null;
                  }

                  return (
                    <button
                      key={membership.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/repository/${classData.id}`
                        )
                      }
                      className="
                        group
                        relative
                        overflow-hidden
                        rounded-2xl
                        border
                        border-neutral-800
                        bg-neutral-900
                        p-6
                        text-left
                        transition
                        hover:border-sky-700
                        hover:bg-neutral-800/80
                      "
                    >
                      {/*
                       * TOP
                       */}

                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-4
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs
                              font-semibold
                              uppercase
                              tracking-[0.15em]
                              text-sky-400
                            "
                          >
                            Class Repository
                          </p>

                          <h3
                            className="
                              mt-2
                              text-2xl
                              font-bold
                              text-white
                            "
                          >
                            {classData.name}
                          </h3>
                        </div>

                        <span
                          className={`
                            shrink-0
                            rounded-full
                            border
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            ${statusClass(
                              membership.status
                            )}
                          `}
                        >
                          {statusLabel(
                            membership.status
                          )}
                        </span>
                      </div>

                      {/*
                       * DESCRIPTION
                       */}

                      <p
                        className="
                          mt-4
                          max-w-md
                          text-sm
                          leading-6
                          text-neutral-400
                        "
                      >
                        Browse ranks,
                        tiers and training
                        videos available
                        for {classData.name}.
                      </p>

                      {/*
                       * FEATURES
                       */}

                      <div
                        className="
                          mt-6
                          grid
                          grid-cols-3
                          gap-2
                        "
                      >
                        <RepositoryFeature
                          label="Ranks"
                        />

                        <RepositoryFeature
                          label="Tiers"
                        />

                        <RepositoryFeature
                          label="Videos"
                        />
                      </div>

                      {/*
                       * OPEN
                       */}

                      <div
                        className="
                          mt-6
                          flex
                          items-center
                          justify-between
                          border-t
                          border-neutral-800
                          pt-5
                        "
                      >
                        <span
                          className="
                            text-sm
                            font-semibold
                            text-sky-400
                          "
                        >
                          Open Repository
                        </span>

                        <span
                          className="
                            text-lg
                            text-sky-400
                            transition-transform
                            group-hover:translate-x-1
                          "
                        >
                          →
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

      {/*
       * INFORMATION
       */}

      {!message &&
        memberships.length > 0 && (
          <section
            className="
              mt-8
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900/50
              p-5
            "
          >
            <p
              className="
                text-sm
                leading-6
                text-neutral-500
              "
            >
              Repository access is based
              on your class membership.
              Content availability inside
              each repository may depend
              on the rank and tier assigned
              to your membership.
            </p>
          </section>
        )}
    </main>
  );
}

/*
 * ============================================================
 * SMALL UI COMPONENT
 * ============================================================
 */

function RepositoryFeature({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="
        rounded-lg
        border
        border-neutral-800
        bg-neutral-950/50
        px-3
        py-2
        text-center
      "
    >
      <p
        className="
          text-xs
          font-medium
          text-neutral-400
        "
      >
        {label}
      </p>
    </div>
  );
}
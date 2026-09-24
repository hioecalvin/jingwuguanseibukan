"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type Profile = {
  full_name: string;
  is_super_admin: boolean;
};

type Membership = {
  classes: {
    name: string;
  } | null;

  dojos: {
    name: string;
  } | null;
};

type AdminCard = {
  title: string;
  description: string;
  href: string;

  tone?:
    | "default"
    | "archive"
    | "super";
};

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function AdminDashboardPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    memberships,
    setMemberships,
  ] =
    useState<Membership[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  /*
   * ============================================================
   * LOAD ADMIN
   * ============================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadAdmin() {
      const {
        data: {
          user,
        },

        error:
          userError,
      } =
        await supabase
          .auth
          .getUser();

      if (
        userError ||
        !user
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      /*
       * PROFILE
       */

      const {
        data:
          profileData,

        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(`
            full_name,
            is_super_admin
          `)
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        profileError ||
        !profileData
      ) {
        router.replace(
          "/"
        );

        return;
      }

      /*
       * ACTIVE ADMIN ASSIGNMENTS
       */

      const {
        data:
          membershipData,

        error:
          membershipError,
      } =
        await supabase
          .from(
            "dojo_admin_assignments"
          )
          .select(`
            classes (
              name
            ),

            dojos (
              name
            )
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "active",
            true
          );

      if (
        membershipError
      ) {
        console.error(
          "Admin membership load error:",
          membershipError
        );

        if (
          active
        ) {
          setMessage(
            "Unable to load your current Admin scope."
          );

          setLoading(
            false
          );
        }

        return;
      }

      const adminMemberships =
        (
          membershipData ??
          []
        ) as unknown as Membership[];

      /*
       * ACCESS CHECK
       */

      if (
        profileData.is_super_admin !==
          true &&
        adminMemberships.length ===
          0
      ) {
        router.replace(
          "/"
        );

        return;
      }

      if (
        active
      ) {
        setProfile(
          profileData as Profile
        );

        setMemberships(
          adminMemberships
        );

        setLoading(
          false
        );
      }
    }

    loadAdmin();

    return () => {
      active =
        false;
    };

  }, [
    router,
    supabase,
  ]);

  /*
   * ============================================================
   * ACCESS
   * ============================================================
   */

  const isSuperAdmin =
    profile
      ?.is_super_admin ===
      true;

  /*
   * ============================================================
   * MANAGEMENT CARDS
   * ============================================================
   */

  const managementCards:
    AdminCard[] = [
      {
        title:
          "Members",

        description:
          "Search Members and manage status, grading, titles and administrative access.",

        href:
          "/admin/members",
      },

      {
        title:
          "Dojo Transfers",

        description:
          "Review pending dojo transfer requests.",

        href:
          "/admin/transfers",
      },

      {
        title:
          "Announcements",

        description:
          "Publish general or class-specific notices for Members.",

        href:
          "/admin/announcements",
      },

      {
        title:
          "Subscriptions",

        description:
          "Manage subscription charges, payment confirmations and Member rates.",

        href:
          "/admin/subscriptions",
      },

      {
        title:
          "Settlements",

        description:
          "Review dojo settlement shares and payment allocations.",

        href:
          "/admin/settlements",
      },

      {
        title:
          "Ranks",

        description:
          "Create and manage class grading ranks.",

        href:
          "/admin/ranks",
      },

      {
        title:
          "Tiers",

        description:
          "Manage Tier 1, Tier 2, Tier 3 and other class tiers.",

        href:
          "/admin/tiers",
      },

      {
        title:
          "Add Content",

        description:
          "Add training videos and references to Class → Rank → Tier.",

        href:
          "/admin/content",
      },

      {
        title:
          "Manage Content",

        description:
          "Publish, draft, edit or remove existing repository content.",

        href:
          "/admin/content/manage",
      },

      {
        title:
          "Certificates",

        description:
          "Manage grading and title certificates for authorised Members.",

        href:
          "/admin/certificates",
      },

      {
        title:
          "Archive",

        description:
          "Search issued certificates and other archived documents. Archive records are read-only.",

        href:
          "/admin/archive",

        tone:
          "archive",
      },

      {
        title:
          "Reports",

        description:
          "Open administrative reports and export available records.",

        href:
          "/admin/reports",
      },
    ];

  /*
   * ============================================================
   * SUPER ADMIN CARDS
   * ============================================================
   */

  const superAdminCards:
    AdminCard[] = [
      {
        title:
          "Applications",

        description:
          "Approve or reject new membership applications and assign permanent Member IDs.",

        href:
          "/admin/applications",

        tone:
          "super",
      },

      {
        title:
          "Events",

        description:
          "Create class events and manage event notifications.",

        href:
          "/admin/events",

        tone:
          "super",
      },

      {
        title:
          "Classes",

        description:
          "Create, rename or deactivate martial arts classes.",

        href:
          "/admin/classes",

        tone:
          "super",
      },

      {
        title:
          "Dojos",

        description:
          "Create and manage dojos under each class.",

        href:
          "/admin/dojos",

        tone:
          "super",
      },

      {
        title:
          "Member IDs",

        description:
          "Assign or change Member identification numbers.",

        href:
          "/admin/member-ids",

        tone:
          "super",
      },

      {
        title:
          "Dojo Migrations",

        description:
          "Manage administrative dojo migration and transfer operations.",

        href:
          "/admin/dojo-migrations",

        tone:
          "super",
      },
    ];

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (
    loading
  ) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-neutral-700
              border-t-red-400
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-neutral-400
            "
          >
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-7xl
      "
    >
      {/*
       * HEADER
       */}

      <header
        className="
          border-b
          border-neutral-800
          pb-8
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-[0.2em]
                text-red-400
              "
            >
              Administration
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
              Admin Dashboard
            </h1>

            <p
              className="
                mt-2
                text-sm
                text-neutral-400
              "
            >
              Welcome,{" "}
              {profile
                ?.full_name ??
                "Administrator"}
            </p>
          </div>

          <button
            type="button"

            onClick={() =>
              router.push(
                "/"
              )
            }

            className="
              self-start
              rounded-lg
              border
              border-neutral-700
              px-4
              py-2
              text-sm
              font-medium
              text-neutral-300
              transition
              hover:bg-neutral-800
              sm:self-auto
            "
          >
            Member Dashboard
          </button>
        </div>
      </header>

      {/*
       * MESSAGE
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
       * ACCESS
       */}

      <section
        className="
          mt-8
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-neutral-800
            bg-neutral-900
            p-6
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.2em]
              text-neutral-500
            "
          >
            Your Access
          </p>

          {isSuperAdmin ? (
            <div
              className="
                mt-4
              "
            >
              <span
                className="
                  inline-flex
                  rounded-full
                  border
                  border-red-800
                  bg-red-950/40
                  px-3
                  py-1
                  text-sm
                  font-medium
                  text-red-300
                "
              >
                Super Admin
              </span>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-neutral-400
                "
              >
                Organisation-wide
                administrative access.
              </p>
            </div>
          ) : (
            <>
              <div
                className="
                  mt-4
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {memberships.map(
                  (
                    membership,
                    index
                  ) => (
                    <span
                      key={
                        `${membership.classes?.name ?? "class"}-${membership.dojos?.name ?? "dojo"}-${index}`
                      }

                      className="
                        rounded-full
                        border
                        border-sky-800
                        bg-sky-950/40
                        px-3
                        py-1
                        text-sm
                        text-sky-300
                      "
                    >
                      {membership
                        .classes
                        ?.name ??
                        "Class"}

                      {membership
                        .dojos
                        ?.name
                        ? ` · ${membership.dojos.name}`
                        : ""}
                    </span>
                  )
                )}
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  leading-6
                  text-neutral-500
                "
              >
                Individual Admin pages
                and backend functions
                continue to enforce the
                classes and dojos you
                are authorised to
                administer.
              </p>
            </>
          )}
        </div>
      </section>

      {/*
       * MANAGEMENT
       */}

      <section
        className="
          mt-10
        "
      >
        <div
          className="
            flex
            flex-col
            gap-2
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-[0.2em]
                text-sky-400
              "
            >
              Administration
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
              "
            >
              Management
            </h2>
          </div>

          <p
            className="
              text-sm
              text-neutral-500
            "
          >
            {managementCards.length} tools
          </p>
        </div>

        <div
          className="
            mt-5
            grid
            gap-4
            md:grid-cols-2
            xl:grid-cols-3
          "
        >
          {managementCards.map(
            (
              card
            ) => (
              <AdminCardButton
                key={
                  card.href
                }

                card={
                  card
                }

                onClick={() =>
                  router.push(
                    card.href
                  )
                }
              />
            )
          )}
        </div>
      </section>

      {/*
       * SUPER ADMIN
       */}

      {isSuperAdmin && (
        <section
          className="
            mt-12
          "
        >
          <div>
            <p
              className="
                text-sm
                font-semibold
                uppercase
                tracking-[0.2em]
                text-red-400
              "
            >
              Super Admin
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
              "
            >
              Organisation Management
            </h2>

            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-neutral-400
              "
            >
              Global configuration and
              organisation-wide
              administrative tools.
            </p>
          </div>

          <div
            className="
              mt-5
              grid
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {superAdminCards.map(
              (
                card
              ) => (
                <AdminCardButton
                  key={
                    card.href
                  }

                  card={
                    card
                  }

                  onClick={() =>
                    router.push(
                      card.href
                    )
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {/*
       * SECURITY NOTE
       */}

      <section
        className="
          mt-12
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
          Frontend visibility does not
          grant database permission.
          Administrative actions remain
          protected by the backend
          functions, RLS policies and
          role checks configured for
          Jingwuguan Seibukan.
        </p>
      </section>
    </main>
  );
}

/*
 * ============================================================
 * ADMIN CARD
 * ============================================================
 */

function AdminCardButton({
  card,
  onClick,
}: {
  card:
    AdminCard;

  onClick:
    () => void;
}) {
  const isArchive =
    card.tone ===
    "archive";

  const isSuper =
    card.tone ===
    "super";

  return (
    <button
      type="button"

      onClick={
        onClick
      }

      className={`
        group
        rounded-2xl
        border
        p-6
        text-left
        transition

        ${
          isArchive
            ? `
                border-amber-900
                bg-amber-950/10
                hover:border-amber-700
                hover:bg-amber-950/20
              `
            : isSuper
            ? `
                border-red-900
                bg-red-950/20
                hover:border-red-700
                hover:bg-red-950/35
              `
            : `
                border-neutral-800
                bg-neutral-900
                hover:border-sky-700
                hover:bg-neutral-800
              `
        }
      `}
    >
      {isArchive && (
        <p
          className="
            mb-2
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-amber-400
          "
        >
          View Only
        </p>
      )}

      {isSuper && (
        <p
          className="
            mb-2
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-red-400
          "
        >
          Super Admin
        </p>
      )}

      <h3
        className="
          text-xl
          font-bold
          text-white
        "
      >
        {card.title}
      </h3>

      <p
        className="
          mt-2
          text-sm
          leading-6
          text-neutral-400
        "
      >
        {card.description}
      </p>

      <div
        className="
          mt-5
          flex
          items-center
          justify-between
        "
      >
        <span
          className={`
            text-sm
            font-semibold

            ${
              isArchive
                ? "text-amber-400"
                : isSuper
                ? "text-red-400"
                : "text-sky-400"
            }
          `}
        >
          Open
        </span>

        <span
          className={`
            transition-transform
            group-hover:translate-x-1

            ${
              isArchive
                ? "text-amber-400"
                : isSuper
                ? "text-red-400"
                : "text-sky-400"
            }
          `}
        >
          →
        </span>
      </div>
    </button>
  );
}

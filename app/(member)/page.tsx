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

  registration_number:
    | string
    | null;

  aikikai_registration_number:
    | string
    | null;

  is_super_admin: boolean;
};

type Membership = {
  role:
    | "user"
    | "admin";

  status:
    | "active"
    | "break_1"
    | "break_2"
    | "inactive";

  level:
    | "mudansha"
    | "yudansha";

  rank_id:
    | string
    | null;

  sub_rank_id:
    | string
    | null;

  title_level:
    | number
    | null;

  classes: {
    name: string;

    title_system:
      | "japanese"
      | "chinese"
      | "none"
      | null;
  } | null;

  dojos: {
    name: string;
  } | null;

  ranks: {
    name: string;
  } | null;

  sub_ranks: {
    name: string;
  } | null;
};

type Announcement = {
  id: string;

  title: string;

  message: string;

  created_at: string;

  class_id:
    | string
    | null;

  classes: {
    name: string;
  } | null;
};

type EventItem = {
  id: string;

  title: string;

  location:
    | string
    | null;

  starts_at: string;

  classes: {
    name: string;
  } | null;
};

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function HomePage() {
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
    useState<
      Profile | null
    >(null);

  const [
    memberships,
    setMemberships,
  ] =
    useState<
      Membership[]
    >([]);

  const [
    announcements,
    setAnnouncements,
  ] =
    useState<
      Announcement[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<
      EventItem[]
    >([]);

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
   * LOAD DASHBOARD
   * ============================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadHome() {
      try {
        /*
         * CURRENT USER
         */

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
              registration_number,
              aikikai_registration_number,
              is_super_admin
            `)
            .eq(
              "id",
              user.id
            )
            .single();

        if (
          profileError
        ) {
          throw new Error(
            profileError.message
          );
        }

        /*
         * MEMBERSHIPS
         */

        const {
          data:
            membershipData,

          error:
            membershipError,
        } =
          await supabase
            .from(
              "class_memberships"
            )
            .select(`
              role,
              status,
              level,
              rank_id,
              sub_rank_id,
              title_level,

              classes (
                name,
                title_system
              ),

              dojos (
                name
              ),

              ranks (
                name
              ),

              sub_ranks (
                name
              )
            `)
            .eq(
              "user_id",
              user.id
            );

        if (
          membershipError
        ) {
          console.error(
            "Membership error:",
            membershipError
          );
        }

        /*
         * ANNOUNCEMENTS
         */

        const {
          data:
            announcementData,

          error:
            announcementError,
        } =
          await supabase
            .from(
              "announcements"
            )
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
            .eq(
              "published",
              true
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              3
            );

        if (
          announcementError
        ) {
          console.error(
            "Announcement error:",
            announcementError
          );
        }

        /*
         * UPCOMING EVENTS
         */

        const {
          data:
            eventData,

          error:
            eventError,
        } =
          await supabase
            .from(
              "events"
            )
            .select(`
              id,
              title,
              location,
              starts_at,

              classes:classes!events_class_id_fkey (
                name
              )
            `)
            .gte(
              "starts_at",
              new Date()
                .toISOString()
            )
            .order(
              "starts_at",
              {
                ascending:
                  true,
              }
            )
            .limit(
              3
            );

        if (
          eventError
        ) {
          console.error(
            "Event error:",
            eventError
          );
        }

        if (
          !active
        ) {
          return;
        }

        setProfile(
          profileData as Profile
        );

        setMemberships(
          (
            membershipData ??
            []
          ) as unknown as Membership[]
        );

        setAnnouncements(
          (
            announcementData ??
            []
          ) as unknown as Announcement[]
        );

        setEvents(
          (
            eventData ??
            []
          ) as unknown as EventItem[]
        );

      } catch (
        error:
          unknown
      ) {
        if (
          active
        ) {
          setMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load the dashboard."
          );
        }

      } finally {
        if (
          active
        ) {
          setLoading(
            false
          );
        }
      }
    }

    loadHome();

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
   * MEMBERSHIP HELPERS
   * ============================================================
   */

  const activeMemberships =
    memberships.filter(
      (
        membership
      ) =>
        membership.status ===
          "active" ||
        membership.status ===
          "break_1" ||
        membership.status ===
          "break_2"
    );

  const isAdmin =
    profile
      ?.is_super_admin ===
      true ||
    activeMemberships.some(
      (
        membership
      ) =>
        membership.role ===
        "admin"
    );

  function titleName(
    membership:
      Membership
  ) {
    const level =
      membership
        .title_level;

    const system =
      membership
        .classes
        ?.title_system;

    if (
      !level ||
      !system ||
      system ===
        "none"
    ) {
      return null;
    }

    if (
      system ===
      "chinese"
    ) {
      if (
        level === 1
      ) {
        return "Fujiaoshi";
      }

      if (
        level === 2
      ) {
        return "Jiaoshi";
      }

      if (
        level === 3
      ) {
        return "Dashi";
      }

      return null;
    }

    if (
      system ===
      "japanese"
    ) {
      if (
        level === 1
      ) {
        return "Fuku Kiyoshi";
      }

      if (
        level === 2
      ) {
        return "Kiyoshi";
      }

      if (
        level === 3
      ) {
        return "Daishi";
      }
    }

    return null;
  }

  function statusLabel(
    status:
      Membership["status"]
  ) {
    if (
      status ===
      "break_1" ||
      status ===
      "break_2"
    ) {
      return "Break";
    }

    if (
      status ===
      "inactive"
    ) {
      return "Inactive";
    }

    return "Active";
  }

  function statusClass(
    status:
      Membership["status"]
  ) {
    if (
      status ===
      "active"
    ) {
      return `
        border-green-800
        bg-green-950/30
        text-green-300
      `;
    }

    if (
      status ===
        "break_1" ||
      status ===
        "break_2"
    ) {
      return `
        border-amber-800
        bg-amber-950/30
        text-amber-300
      `;
    }

    return `
      border-neutral-700
      bg-neutral-800
      text-neutral-400
    `;
  }

  /*
   * ============================================================
   * DATE FORMAT
   * ============================================================
   */

  function formatDate(
    value: string
  ) {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    );
  }

  function formatEventDate(
    value: string
  ) {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    const dateText =
      date.toLocaleDateString(
        "en-GB",
        {
          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",
        }
      );

    const timeText =
      date.toLocaleTimeString(
        "en-AU",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );

    return `${dateText} · ${timeText}`;
  }

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
            Loading Jingwuguan
            Seibukan...
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
        <p
          className="
            text-sm
            font-semibold
            uppercase
            tracking-[0.2em]
            text-sky-400
          "
        >
          Dashboard
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
          Welcome,{" "}
          {profile
            ?.full_name ??
            "Member"}
        </h1>

        <div
          className="
            mt-3
            flex
            flex-wrap
            gap-2
          "
        >
          <span
            className="
              rounded-full
              border
              border-neutral-700
              bg-neutral-900
              px-3
              py-1
              text-xs
              text-neutral-300
            "
          >
            Member ID:{" "}
            {profile
              ?.registration_number ??
              "Not assigned"}
          </span>

          {profile
            ?.is_super_admin && (
            <span
              className="
                rounded-full
                border
                border-red-800
                bg-red-950/30
                px-3
                py-1
                text-xs
                font-semibold
                text-red-300
              "
            >
              Super Admin
            </span>
          )}
        </div>
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
       * QUICK ACTIONS
       */}

      <section
        className="
          mt-8
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
          Quick Access
        </p>

        <div
          className="
            mt-4
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <QuickAction
            title="Repository"
            eyebrow="Training"
            description="Ranks, tiers and training reference videos."
            action="Open Repository"
            onClick={() =>
              router.push(
                "/repository"
              )
            }
          />

          <QuickAction
            title="Calendar"
            eyebrow="Schedule"
            description="View upcoming classes, seminars and events."
            action="Open Calendar"
            onClick={() =>
              router.push(
                "/calendar"
              )
            }
          />

          <QuickAction
            title="Subscription"
            eyebrow="Payments"
            description="View charges and submit payment confirmations."
            action="Open Subscription"
            onClick={() =>
              router.push(
                "/subscription"
              )
            }
          />

          <QuickAction
            title="Notifications"
            eyebrow="Inbox"
            description="View payment, event and account notifications."
            action="Open Notifications"
            onClick={() =>
              router.push(
                "/notifications"
              )
            }
          />
        </div>
      </section>

      {/*
       * MEMBERSHIP
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
              Membership
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
              "
            >
              My Classes
            </h2>
          </div>

          <button
            type="button"

            onClick={() =>
              router.push(
                "/profile"
              )
            }

            className="
              self-start
              text-sm
              font-semibold
              text-sky-400
              transition
              hover:text-sky-300
              sm:self-auto
            "
          >
            View Profile →
          </button>
        </div>

        {memberships.length ===
        0 ? (
          <EmptyState
            text="You do not have any class memberships yet."
          />
        ) : (
          <div
            className="
              mt-4
              grid
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {memberships.map(
              (
                membership,
                index
              ) => {
                const title =
                  titleName(
                    membership
                  );

                const isAikidoYudansha =
                  membership
                    .classes
                    ?.name ===
                    "Aikido" &&
                  membership
                    .level ===
                    "yudansha";

                return (
                  <article
                    key={
                      `${membership.classes?.name ?? "class"}-${index}`
                    }

                    className="
                      rounded-2xl
                      border
                      border-neutral-800
                      bg-neutral-900
                      p-5
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-4
                      "
                    >
                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-sky-400
                          "
                        >
                          {membership
                            .classes
                            ?.name ??
                            "Class"}
                        </p>

                        <h3
                          className="
                            mt-2
                            text-xl
                            font-bold
                          "
                        >
                          {membership
                            .ranks
                            ?.name ??
                            "Rank not assigned"}
                        </h3>

                        {membership
                          .sub_ranks
                          ?.name && (
                          <p
                            className="
                              mt-1
                              text-sm
                              text-neutral-400
                            "
                          >
                            {
                              membership
                                .sub_ranks
                                .name
                            }
                          </p>
                        )}
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

                    <div
                      className="
                        mt-4
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      {membership
                        .dojos
                        ?.name && (
                        <span
                          className="
                            rounded-full
                            border
                            border-neutral-700
                            bg-neutral-950
                            px-3
                            py-1
                            text-xs
                            text-neutral-300
                          "
                        >
                          {
                            membership
                              .dojos
                              .name
                          }
                        </span>
                      )}

                      {title && (
                        <span
                          className="
                            rounded-full
                            border
                            border-amber-800
                            bg-amber-950/30
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-amber-300
                          "
                        >
                          {title}
                        </span>
                      )}
                    </div>

                    <div
                      className="
                        mt-5
                        border-t
                        border-neutral-800
                        pt-4
                      "
                    >
                      <p
                        className="
                          text-xs
                          uppercase
                          tracking-wider
                          text-neutral-500
                        "
                      >
                        {isAikidoYudansha
                          ? "Member ID / Aikikai Registration Number"
                          : "Member ID"}
                      </p>

                      <p
                        className="
                          mt-1
                          break-words
                          text-sm
                          font-medium
                          text-neutral-200
                        "
                      >
                        {profile
                          ?.registration_number ??
                          "Not assigned"}

                        {isAikidoYudansha
                          ? ` / ${
                              profile?.aikikai_registration_number ??
                              "Not assigned"
                            }`
                          : ""}
                      </p>

                      <p
                        className="
                          mt-4
                          text-xs
                          text-neutral-500
                        "
                      >
                        Role:{" "}

                        <span
                          className="
                            font-medium
                            text-neutral-300
                          "
                        >
                          {membership.role ===
                          "admin"
                            ? "Member + Admin"
                            : "Member"}
                        </span>
                      </p>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/*
       * ANNOUNCEMENTS
       */}

      <section
        className="
          mt-10
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
            Latest Updates
          </p>

          <h2
            className="
              mt-1
              text-2xl
              font-bold
            "
          >
            Announcements
          </h2>
        </div>

        {announcements.length ===
        0 ? (
          <EmptyState
            text="No announcements at the moment."
          />
        ) : (
          <div
            className="
              mt-4
              space-y-4
            "
          >
            {announcements.map(
              (
                announcement
              ) => (
                <article
                  key={
                    announcement.id
                  }

                  className="
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900
                    p-6
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      justify-between
                      gap-4
                      sm:flex-row
                    "
                  >
                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wider
                          text-sky-400
                        "
                      >
                        {announcement.class_id
                          ? announcement
                              .classes
                              ?.name ??
                            "Class"
                          : "All Members"}
                      </p>

                      <h3
                        className="
                          mt-2
                          text-xl
                          font-bold
                        "
                      >
                        {
                          announcement.title
                        }
                      </h3>

                      <p
                        className="
                          mt-3
                          whitespace-pre-line
                          text-sm
                          leading-6
                          text-neutral-300
                        "
                      >
                        {
                          announcement.message
                        }
                      </p>
                    </div>

                    <p
                      className="
                        shrink-0
                        text-xs
                        text-neutral-500
                      "
                    >
                      {formatDate(
                        announcement.created_at
                      )}
                    </p>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/*
       * EVENTS
       */}

      <section
        className="
          mt-10
        "
      >
        <div
          className="
            flex
            items-end
            justify-between
            gap-4
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
              Schedule
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-bold
              "
            >
              Upcoming Events
            </h2>
          </div>

          {events.length >
            0 && (
            <button
              type="button"

              onClick={() =>
                router.push(
                  "/calendar"
                )
              }

              className="
                shrink-0
                text-sm
                font-semibold
                text-sky-400
                transition
                hover:text-sky-300
              "
            >
              View Calendar →
            </button>
          )}
        </div>

        {events.length ===
        0 ? (
          <EmptyState
            text="No upcoming events."
          />
        ) : (
          <div
            className="
              mt-4
              grid
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {events.map(
              (
                event
              ) => (
                <button
                  key={
                    event.id
                  }

                  type="button"

                  onClick={() =>
                    router.push(
                      "/calendar"
                    )
                  }

                  className="
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900
                    p-5
                    text-left
                    transition
                    hover:border-sky-800
                    hover:bg-neutral-800
                  "
                >
                  <p
                    className="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wider
                      text-sky-400
                    "
                  >
                    {event
                      .classes
                      ?.name ??
                      "Class"}
                  </p>

                  <h3
                    className="
                      mt-2
                      text-lg
                      font-bold
                    "
                  >
                    {
                      event.title
                    }
                  </h3>

                  <p
                    className="
                      mt-4
                      text-sm
                      text-neutral-300
                    "
                  >
                    {formatEventDate(
                      event.starts_at
                    )}
                  </p>

                  {event.location && (
                    <p
                      className="
                        mt-2
                        text-sm
                        text-neutral-500
                      "
                    >
                      {
                        event.location
                      }
                    </p>
                  )}
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/*
       * ACCOUNT
       */}

      <section
        className="
          mt-10
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
          Account
        </p>

        <h2
          className="
            mt-1
            text-2xl
            font-bold
          "
        >
          Member Services
        </h2>

        <div
          className="
            mt-4
            grid
            gap-4
            md:grid-cols-2
          "
        >
          <QuickAction
            title="My Profile"
            eyebrow="Account"
            description="View your Member ID, profile picture, WhatsApp, grades and titles."
            action="Open Profile"
            onClick={() =>
              router.push(
                "/profile"
              )
            }
          />

          <QuickAction
            title="Notifications"
            eyebrow="Updates"
            description="View important account and organisation activity."
            action="Open Notifications"
            onClick={() =>
              router.push(
                "/notifications"
              )
            }
          />
        </div>
      </section>

      {/*
       * ADMIN ACCESS
       */}

      {isAdmin && (
        <section
          className="
            mt-10
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-red-900
              bg-red-950/20
              p-6
            "
          >
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

            <div
              className="
                mt-3
                flex
                flex-col
                justify-between
                gap-5
                sm:flex-row
                sm:items-center
              "
            >
              <div>
                <h2
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  Admin Dashboard
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
                  Manage Members,
                  grading, subscriptions,
                  settlements, events,
                  certificates, content
                  and other administrative
                  tools.
                </p>
              </div>

              <button
                type="button"

                onClick={() =>
                  router.push(
                    "/admin"
                  )
                }

                className="
                  self-start
                  rounded-lg
                  bg-red-600
                  px-5
                  py-3
                  font-semibold
                  text-white
                  transition
                  hover:bg-red-500
                  sm:self-auto
                "
              >
                Open Admin
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/*
 * ============================================================
 * UI COMPONENTS
 * ============================================================
 */

function QuickAction({
  eyebrow,
  title,
  description,
  action,
  onClick,
}: {
  eyebrow: string;

  title: string;

  description: string;

  action: string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      className="
        group
        rounded-2xl
        border
        border-neutral-800
        bg-neutral-900
        p-6
        text-left
        transition
        hover:border-sky-700
        hover:bg-neutral-800
      "
    >
      <p
        className="
          text-xs
          font-semibold
          uppercase
          tracking-wider
          text-sky-400
        "
      >
        {eyebrow}
      </p>

      <h3
        className="
          mt-2
          text-xl
          font-bold
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-2
          text-sm
          leading-6
          text-neutral-400
        "
      >
        {description}
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
          className="
            text-sm
            font-semibold
            text-sky-400
          "
        >
          {action}
        </span>

        <span
          className="
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

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        mt-4
        rounded-2xl
        border
        border-neutral-800
        bg-neutral-900
        p-6
      "
    >
      <p
        className="
          text-sm
          text-neutral-400
        "
      >
        {text}
      </p>
    </div>
  );
}
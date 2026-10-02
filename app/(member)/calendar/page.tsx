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


type CalendarEvent = {
  id: string;

  title: string;

  description:
    | string
    | null;

  location:
    | string
    | null;

  starts_at: string;

  end_at:
    | string
    | null;

  classes:
    | {
        name: string;
      }
    | null;
};


export default function CalendarPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    pageLoadedAt,
  ] =
    useState(
      () => Date.now()
    );


  const [
    events,
    setEvents,
  ] =
    useState<
      CalendarEvent[]
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
   * =====================================================
   * LOAD EVENTS
   * =====================================================
   */

  useEffect(() => {
    let active =
      true;


    async function loadPage() {
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


      const {
        data,
        error,
      } =
        await supabase
          .from(
            "events"
          )
          .select(`
            id,
            title,
            description,
            location,
            starts_at,
            end_at,

            classes:classes!events_class_id_fkey (
              name
            )
          `)
          .order(
            "starts_at",
            {
              ascending:
                true,
            }
          );


      if (
        error
      ) {
        if (
          active
        ) {
          setMessage(
            error.message
          );

          setLoading(
            false
          );
        }

        return;
      }


      if (
        active
      ) {
        setEvents(
          (
            data ??
            []
          ) as unknown as CalendarEvent[]
        );

        setLoading(
          false
        );
      }
    }


    loadPage();


    return () => {
      active =
        false;
    };

  }, [
    router,
    supabase,
  ]);


  /*
   * =====================================================
   * FORMATTERS
   * =====================================================
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


  function formatWeekday(
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
      return "";
    }


    return date.toLocaleDateString(
      "en-AU",
      {
        weekday:
          "long",
      }
    );
  }


  function formatTime(
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


    return date.toLocaleTimeString(
      "en-AU",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }


  function isPast(
    event:
      CalendarEvent
  ) {
    const comparisonDate =
      new Date(
        event.end_at ??
        event.starts_at
      );


    return (
      comparisonDate.getTime() <
      pageLoadedAt
    );
  }


  /*
   * =====================================================
   * GROUP EVENTS
   * =====================================================
   */

  const upcomingEvents =
    events.filter(
      (
        event
      ) =>
        !isPast(
          event
        )
    );


  const pastEvents =
    events
      .filter(
        (
          event
        ) =>
          isPast(
            event
          )
      )
      .reverse();


  /*
   * =====================================================
   * LOADING
   * =====================================================
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
            Loading calendar...
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
          Schedule
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
          Calendar
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
          View upcoming classes,
          seminars and organisation
          events.
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
       * UPCOMING
       */}

      <section
        className="
          mt-8
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
                text-xs
                font-semibold
                uppercase
                tracking-[0.15em]
                text-sky-400
              "
            >
              Upcoming
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


          <p
            className="
              text-sm
              text-neutral-500
            "
          >
            {upcomingEvents.length}{" "}
            event
            {upcomingEvents.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>


        <div
          className="
            mt-5
            space-y-4
          "
        >
          {upcomingEvents.map(
            (
              event
            ) => (
              <article
                key={
                  event.id
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
                    gap-5
                    sm:flex-row
                    sm:items-start
                  "
                >
                  <div
                    className="
                      min-w-0
                      flex-1
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
                        text-2xl
                        font-bold
                      "
                    >
                      {
                        event.title
                      }
                    </h3>


                    <div
                      className="
                        mt-5
                        grid
                        gap-4
                        sm:grid-cols-2
                        lg:grid-cols-3
                      "
                    >
                      <EventDetail
                        label="Date"

                        value={`${formatWeekday(
                          event.starts_at
                        )}, ${formatDate(
                          event.starts_at
                        )}`}
                      />


                      <EventDetail
                        label="Time"

                        value={
                          event.end_at
                            ? `${formatTime(
                                event.starts_at
                              )} – ${formatTime(
                                event.end_at
                              )}`
                            : formatTime(
                                event.starts_at
                              )
                        }
                      />


                      <EventDetail
                        label="Location"

                        value={
                          event.location ??
                          "To be confirmed"
                        }
                      />
                    </div>


                    {event.description && (
                      <div
                        className="
                          mt-5
                          border-t
                          border-neutral-800
                          pt-5
                        "
                      >
                        <p
                          className="
                            whitespace-pre-line
                            text-sm
                            leading-7
                            text-neutral-300
                          "
                        >
                          {
                            event.description
                          }
                        </p>
                      </div>
                    )}
                  </div>


                  <span
                    className="
                      self-start
                      rounded-full
                      border
                      border-green-800
                      bg-green-950/30
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-green-300
                    "
                  >
                    UPCOMING
                  </span>
                </div>
              </article>
            )
          )}


          {upcomingEvents.length ===
            0 && (
            <div
              className="
                rounded-2xl
                border
                border-neutral-800
                bg-neutral-900
                p-10
                text-center
              "
            >
              <p
                className="
                  text-neutral-400
                "
              >
                No upcoming events.
              </p>
            </div>
          )}
        </div>
      </section>


      {/*
       * PAST EVENTS
       */}

      {pastEvents.length >
        0 && (
        <section
          className="
            mt-10
            border-t
            border-neutral-800
            pt-8
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.15em]
              text-neutral-500
            "
          >
            History
          </p>


          <h2
            className="
              mt-1
              text-2xl
              font-bold
            "
          >
            Past Events
          </h2>


          <div
            className="
              mt-5
              space-y-3
            "
          >
            {pastEvents.map(
              (
                event
              ) => (
                <article
                  key={
                    event.id
                  }
                  className="
                    rounded-xl
                    border
                    border-neutral-800
                    bg-neutral-900/60
                    p-5
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      justify-between
                      gap-3
                      sm:flex-row
                      sm:items-center
                    "
                  >
                    <div>
                      <p
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wider
                          text-neutral-500
                        "
                      >
                        {event
                          .classes
                          ?.name ??
                          "Class"}
                      </p>


                      <h3
                        className="
                          mt-1
                          text-lg
                          font-semibold
                        "
                      >
                        {
                          event.title
                        }
                      </h3>


                      <p
                        className="
                          mt-2
                          text-sm
                          text-neutral-500
                        "
                      >
                        {formatDate(
                          event.starts_at
                        )}

                        {" · "}

                        {formatTime(
                          event.starts_at
                        )}

                        {event.location
                          ? ` · ${event.location}`
                          : ""}
                      </p>
                    </div>


                    <span
                      className="
                        self-start
                        rounded-full
                        border
                        border-neutral-700
                        px-3
                        py-1
                        text-xs
                        text-neutral-500
                        sm:self-auto
                      "
                    >
                      PAST
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}


/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function EventDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-neutral-800
        bg-neutral-950/40
        p-4
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
        {label}
      </p>


      <p
        className="
          mt-1
          text-sm
          font-medium
          text-neutral-200
        "
      >
        {value}
      </p>
    </div>
  );
}

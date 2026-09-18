"use client";

import {
  useCallback,
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

type NotificationRow = {
  notification_id: string;

  notification_type: string;

  title: string;

  message:
    | string
    | null;

  reference_type:
    | string
    | null;

  reference_id:
    | string
    | null;

  metadata:
    | Record<string, unknown>
    | null;

  is_read: boolean;

  read_at:
    | string
    | null;

  created_at: string;
};


type MessageType =
  | "success"
  | "error"
  | "";


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function NotificationsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    processing,
    setProcessing,
  ] =
    useState<
      string | null
    >(null);


  const [
    unreadOnly,
    setUnreadOnly,
  ] =
    useState(false);


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>(
      ""
    );


  /*
   * ============================================================
   * MESSAGE HELPERS
   * ============================================================
   */

  function showSuccess(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "success"
    );
  }


  function showError(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "error"
    );
  }


  function clearMessage() {
    setMessage("");
    setMessageType("");
  }


  /*
   * ============================================================
   * DATE FORMAT
   * ============================================================
   */

  function formatDateTime(
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


    const formattedDate =
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


    const formattedTime =
      date.toLocaleTimeString(
        "en-AU",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );


    return `${formattedDate} · ${formattedTime}`;
  }


  /*
   * ============================================================
   * LOAD NOTIFICATIONS
   * ============================================================
   */

  const loadNotifications =
    useCallback(
      async (
        onlyUnread:
          boolean
      ) => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_my_notifications",
            {
              unread_only:
                onlyUnread,

              result_limit:
                100,
            }
          );


        if (
          error
        ) {
          throw new Error(
            error.message
          );
        }


        setNotifications(
          (
            data ??
            []
          ) as NotificationRow[]
        );
      },

      [
        supabase,
      ]
    );


  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    let active =
      true;


    async function loadPage() {
      try {
        const {
          data: {
            user,
          },

          error,
        } =
          await supabase
            .auth
            .getUser();


        if (
          error ||
          !user
        ) {
          router.replace(
            "/login"
          );

          return;
        }


        await loadNotifications(
          false
        );

      } catch (
        error:
          unknown
      ) {
        if (
          active
        ) {
          showError(
            error instanceof
              Error
              ? error.message
              : "Unable to load notifications."
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


    loadPage();


    return () => {
      active =
        false;
    };

  }, [
    loadNotifications,
    router,
    supabase,
  ]);


  /*
   * ============================================================
   * FILTER
   * ============================================================
   */

  async function changeUnreadFilter(
    value: boolean
  ) {
    setUnreadOnly(
      value
    );

    setLoading(
      true
    );

    clearMessage();


    try {
      await loadNotifications(
        value
      );

    } catch (
      error:
        unknown
    ) {
      showError(
        error instanceof
          Error
          ? error.message
          : "Unable to load notifications."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  /*
   * ============================================================
   * MARK SINGLE NOTIFICATION READ
   * ============================================================
   */

  async function setNotificationRead(
    notification:
      NotificationRow
  ) {
    if (
      notification.is_read
    ) {
      return true;
    }


    const {
      error,
    } =
      await supabase.rpc(
        "mark_notification_read",
        {
          target_notification_id:
            notification.notification_id,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      return false;
    }


    setNotifications(
      (
        current
      ) =>
        unreadOnly
          ? current.filter(
              (
                item
              ) =>
                item.notification_id !==
                notification.notification_id
            )
          : current.map(
              (
                item
              ) =>
                item.notification_id ===
                notification.notification_id
                  ? {
                      ...item,

                      is_read:
                        true,

                      read_at:
                        new Date()
                          .toISOString(),
                    }
                  : item
            )
    );


    return true;
  }


  /*
   * ============================================================
   * OPEN NOTIFICATION
   * ============================================================
   */

  async function handleOpen(
    notification:
      NotificationRow
  ) {
    setProcessing(
      notification.notification_id
    );

    clearMessage();


    const success =
      await setNotificationRead(
        notification
      );


    if (
      !success
    ) {
      setProcessing(
        null
      );

      return;
    }


    setProcessing(
      null
    );


    openNotification(
      notification
    );
  }


  /*
   * ============================================================
   * MARK READ WITHOUT OPENING
   * ============================================================
   */

  async function handleMarkRead(
    notification:
      NotificationRow
  ) {
    setProcessing(
      notification.notification_id
    );

    clearMessage();


    await setNotificationRead(
      notification
    );


    setProcessing(
      null
    );
  }


  /*
   * ============================================================
   * MARK ALL READ
   * ============================================================
   */

  async function markAllRead() {
    const unreadCount =
      notifications.filter(
        (
          item
        ) =>
          !item.is_read
      ).length;


    if (
      unreadCount ===
      0
    ) {
      return;
    }


    setProcessing(
      "all"
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "mark_all_notifications_read"
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    try {
      await loadNotifications(
        unreadOnly
      );


      const updatedCount =
        Number(
          data ??
          unreadCount
        );


      showSuccess(
        `${updatedCount} notification${
          updatedCount ===
          1
            ? ""
            : "s"
        } marked as read.`
      );

    } catch (
      error:
        unknown
    ) {
      showError(
        error instanceof
          Error
          ? error.message
          : "Unable to refresh notifications."
      );

    } finally {
      setProcessing(
        null
      );
    }
  }


  /*
   * ============================================================
   * NOTIFICATION ROUTING
   * ============================================================
   */

  function openNotification(
    notification:
      NotificationRow
  ) {

    /*
     * ==========================================================
     * CLASS ENROLLMENT REQUEST — ADMIN
     * ==========================================================
     *
     * A new request is sent to the relevant Admin(s)
     * and Super Admin(s).
     */

    if (
      notification.notification_type ===
        "class_enrollment_requested"
    ) {
      router.push(
        "/admin/enrollment-requests"
      );

      return;
    }


    /*
     * ==========================================================
     * CLASS ENROLLMENT RESULT — MEMBER
     * ==========================================================
     *
     * Approved / rejected enrollment notifications
     * return the Member to their Profile.
     */

    if (
      notification.notification_type ===
        "class_enrollment_approved" ||
      notification.notification_type ===
        "class_enrollment_rejected"
    ) {
      router.push(
        "/profile"
      );

      return;
    }


    /*
     * Generic enrollment reference fallback.
     *
     * This protects us if we add another enrollment
     * notification type later.
     */

    if (
      notification.reference_type ===
        "class_enrollment_request"
    ) {
      if (
        notification.notification_type ===
        "class_enrollment_requested"
      ) {
        router.push(
          "/admin/enrollment-requests"
        );
      } else {
        router.push(
          "/profile"
        );
      }

      return;
    }


    /*
     * ==========================================================
     * DOJO SETTLEMENT
     * ==========================================================
     */

    if (
      notification.reference_type ===
      "dojo_settlement"
    ) {
      router.push(
        "/admin/settlements"
      );

      return;
    }


    /*
     * ==========================================================
     * ADMIN PAYMENT CONFIRMATION
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "membership_payment_confirmation_pending" ||
      notification.reference_type ===
        "membership_payment_confirmation"
    ) {
      router.push(
        "/admin/subscriptions?tab=confirmations"
      );

      return;
    }


    /*
     * ==========================================================
     * MEMBER SUBSCRIPTION
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "monthly_subscription_charge" ||
      notification.notification_type ===
        "subscription_unpaid_reminder" ||
      notification.notification_type ===
        "membership_payment_confirmation_approved" ||
      notification.notification_type ===
        "membership_payment_confirmation_rejected" ||
      notification.reference_type ===
        "membership_subscription_charge"
    ) {
      router.push(
        "/subscription"
      );

      return;
    }


    /*
     * ==========================================================
     * ANNOUNCEMENT
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "announcement_published" ||
      notification.reference_type ===
        "announcement"
    ) {
      router.push(
        "/announcements"
      );

      return;
    }


    /*
     * ==========================================================
     * EVENT / CALENDAR
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "event_created" ||
      notification.notification_type ===
        "event_updated" ||
      notification.reference_type ===
        "event"
    ) {
      router.push(
        "/calendar"
      );

      return;
    }


    /*
     * ==========================================================
     * GRADE / GRADING
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "grade_promoted" ||
      notification.notification_type ===
        "grading_completed" ||
      notification.reference_type ===
        "membership_grade_history"
    ) {
      router.push(
        "/profile"
      );

      return;
    }


    /*
     * ==========================================================
     * TITLE APPOINTMENT
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "title_granted" ||
      notification.notification_type ===
        "title_revoked" ||
      notification.reference_type ===
        "membership_title_history"
    ) {
      router.push(
        "/profile"
      );

      return;
    }


    /*
     * ==========================================================
     * DOJO TRANSFER
     * ==========================================================
     */

    if (
      notification.notification_type ===
        "dojo_transfer_approved" ||
      notification.notification_type ===
        "dojo_transfer_rejected" ||
      notification.reference_type ===
        "dojo_transfer"
    ) {
      router.push(
        "/profile"
      );

      return;
    }


    /*
     * ==========================================================
     * UNKNOWN
     * ==========================================================
     */

    router.push(
      "/notifications"
    );
  }


  /*
   * ============================================================
   * COUNTS
   * ============================================================
   */

  const unreadCount =
    notifications.filter(
      (
        item
      ) =>
        !item.is_read
    ).length;


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
            Loading notifications...
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
        <div
          className="
            flex
            flex-col
            justify-between
            gap-4
            sm:flex-row
            sm:items-end
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
              Inbox
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
              Notifications
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
              Subscription,
              payment, enrollment,
              announcement, calendar,
              grading, title and account
              activity.
            </p>
          </div>


          {unreadCount >
            0 && (
            <div
              className="
                self-start
                rounded-full
                border
                border-sky-800
                bg-sky-950/30
                px-4
                py-2
                text-sm
                font-semibold
                text-sky-300
                sm:self-auto
              "
            >
              {unreadCount} unread
            </div>
          )}
        </div>
      </header>


      {/*
       * MESSAGE
       */}

      {message && (
        <div
          className={[
            `
              mt-6
              rounded-xl
              border
              p-4
              text-sm
            `,

            messageType ===
            "success"
              ? `
                  border-green-900
                  bg-green-950/30
                  text-green-300
                `
              : `
                  border-red-900
                  bg-red-950/30
                  text-red-300
                `,
          ].join(
            " "
          )}
        >
          {message}
        </div>
      )}


      {/*
       * PUSH NOTIFICATIONS
       */}

      {/*
       * TOOLBAR
       */}

      <section
        className="
          mt-6
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900
          p-4
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"

              onClick={() =>
                changeUnreadFilter(
                  false
                )
              }

              className={`
                rounded-lg
                border
                px-4
                py-2
                text-sm
                font-medium
                transition
                ${
                  !unreadOnly
                    ? `
                        border-sky-700
                        bg-sky-950/30
                        text-sky-300
                      `
                    : `
                        border-neutral-700
                        text-neutral-400
                        hover:bg-neutral-800
                      `
                }
              `}
            >
              All
            </button>


            <button
              type="button"

              onClick={() =>
                changeUnreadFilter(
                  true
                )
              }

              className={`
                rounded-lg
                border
                px-4
                py-2
                text-sm
                font-medium
                transition
                ${
                  unreadOnly
                    ? `
                        border-sky-700
                        bg-sky-950/30
                        text-sky-300
                      `
                    : `
                        border-neutral-700
                        text-neutral-400
                        hover:bg-neutral-800
                      `
                }
              `}
            >
              Unread
            </button>


            <span
              className="
                flex
                items-center
                rounded-lg
                border
                border-neutral-800
                px-3
                py-2
                text-sm
                text-neutral-500
              "
            >
              {notifications.length}{" "}
              notification
              {notifications.length ===
              1
                ? ""
                : "s"}
            </span>
          </div>


          <button
            type="button"

            disabled={
              processing ===
                "all" ||
              unreadCount ===
                0
            }

            onClick={
              markAllRead
            }

            className="
              rounded-lg
              border
              border-green-800
              px-4
              py-2
              text-sm
              font-medium
              text-green-300
              transition
              hover:bg-green-950/30
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {processing ===
            "all"
              ? "Updating..."
              : "Mark All as Read"}
          </button>
        </div>
      </section>


      {/*
       * NOTIFICATION LIST
       */}

      <section
        className="
          mt-5
          space-y-3
        "
      >
        {notifications.map(
          (
            notification
          ) => {

            const busy =
              processing ===
              notification.notification_id;


            return (
              <article
                key={
                  notification.notification_id
                }

                className={`
                  rounded-2xl
                  border
                  p-5
                  transition
                  ${
                    notification.is_read
                      ? `
                          border-neutral-800
                          bg-neutral-900
                        `
                      : `
                          border-sky-800
                          bg-sky-950/10
                        `
                  }
                `}
              >
                <div
                  className="
                    flex
                    gap-4
                  "
                >

                  {/*
                   * READ INDICATOR
                   */}

                  <div
                    className="
                      pt-1.5
                    "
                  >
                    <div
                      className={`
                        h-3
                        w-3
                        rounded-full
                        ${
                          notification.is_read
                            ? "bg-neutral-700"
                            : "bg-sky-400"
                        }
                      `}
                    />
                  </div>


                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        justify-between
                        gap-3
                        sm:flex-row
                        sm:items-start
                      "
                    >
                      <div
                        className="
                          min-w-0
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <h2
                            className="
                              font-semibold
                              text-neutral-100
                            "
                          >
                            {
                              notification.title
                            }
                          </h2>


                          {!notification.is_read && (
                            <span
                              className="
                                rounded-full
                                border
                                border-sky-800
                                bg-sky-950/30
                                px-2
                                py-1
                                text-[10px]
                                font-semibold
                                text-sky-300
                              "
                            >
                              NEW
                            </span>
                          )}
                        </div>


                        {notification.message && (
                          <p
                            className="
                              mt-2
                              whitespace-pre-line
                              text-sm
                              leading-6
                              text-neutral-400
                            "
                          >
                            {
                              notification.message
                            }
                          </p>
                        )}
                      </div>


                      <p
                        className="
                          shrink-0
                          text-xs
                          text-neutral-600
                        "
                      >
                        {formatDateTime(
                          notification.created_at
                        )}
                      </p>
                    </div>


                    <div
                      className="
                        mt-4
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      <button
                        type="button"

                        disabled={
                          busy
                        }

                        onClick={() =>
                          handleOpen(
                            notification
                          )
                        }

                        className="
                          rounded-lg
                          bg-sky-600
                          px-4
                          py-2
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-sky-500
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        {busy
                          ? "Opening..."
                          : notification.is_read
                          ? "Open"
                          : "Open & Mark Read"}
                      </button>


                      {!notification.is_read && (
                        <button
                          type="button"

                          disabled={
                            busy
                          }

                          onClick={() =>
                            handleMarkRead(
                              notification
                            )
                          }

                          className="
                            rounded-lg
                            border
                            border-neutral-700
                            px-4
                            py-2
                            text-sm
                            text-neutral-300
                            transition
                            hover:bg-neutral-800
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          }
        )}


        {notifications.length ===
          0 && (
          <div
            className="
              rounded-2xl
              border
              border-neutral-800
              bg-neutral-900
              p-12
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                border
                border-neutral-800
                bg-neutral-950
                text-xl
              "
            >
              ✓
            </div>


            <p
              className="
                mt-4
                text-lg
                font-semibold
              "
            >
              {unreadOnly
                ? "You're all caught up"
                : "No notifications"}
            </p>


            <p
              className="
                mx-auto
                mt-2
                max-w-lg
                text-sm
                leading-6
                text-neutral-500
              "
            >
              {unreadOnly
                ? "You have no unread notifications."
                : "Subscription, payment, enrollment, announcement, event, grading, title and account updates will appear here."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

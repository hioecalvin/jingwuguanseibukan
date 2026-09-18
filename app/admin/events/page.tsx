"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";

type ClassItem = {
  id: string;
  name: string;
};

type EventItem = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  end_at: string | null;
  email_send_count: number;
  last_email_sent_at: string | null;
  classes: {
    name: string;
  } | null;
};

export default function AdminEventsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingEventId, setProcessingEventId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select(`
        id,
        class_id,
        title,
        description,
        location,
        starts_at,
        end_at,
        email_send_count,
        last_email_sent_at,

        classes:classes!events_class_id_fkey (
          name
        )
      `)
      .order("starts_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setEvents((data ?? []) as unknown as EventItem[]);
  }, [supabase]);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.is_super_admin !== true
      ) {
        router.replace("/admin");
        return;
      }

      const { data: classData, error: classError } =
        await supabase
          .from("classes")
          .select("id, name")
          .eq("active", true)
          .order("name");

      if (classError) {
        setMessage(classError.message);
        setMessageType("error");
        setLoading(false);
        return;
      }

      setClasses((classData ?? []) as ClassItem[]);

      if (classData && classData.length > 0) {
        setSelectedClassId(classData[0].id);
      }

      await loadEvents();

      setLoading(false);
    }

    loadPage();
  }, [loadEvents, router, supabase]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedClassId || !title.trim() || !startAt) {
      setMessage(
        "Please complete Class, Title and Start Date/Time."
      );
      setMessageType("error");
      return;
    }

    if (endAt && new Date(endAt) < new Date(startAt)) {
      setMessage(
        "End time cannot be before start time."
      );
      setMessageType("error");
      return;
    }

    setProcessing(true);
    setMessage("");
    setMessageType("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setMessageType("error");
      setProcessing(false);
      return;
    }

    const { error } = await supabase
      .from("events")
      .insert({
        class_id: selectedClassId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: new Date(startAt).toISOString(),
        end_at: endAt
          ? new Date(endAt).toISOString()
          : null,
        created_by: user.id,
      });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessing(false);
      return;
    }

    setTitle("");
    setDescription("");
    setLocation("");
    setStartAt("");
    setEndAt("");

    setMessage("Event created successfully.");
    setMessageType("success");

    await loadEvents();

    setProcessing(false);
  }
async function sendEventEmail(
  event: EventItem
) {
  if (
    event.email_send_count >= 3
  ) {
    return;
  }

  const nextNumber =
    event.email_send_count + 1;

  const label =
    nextNumber === 1
      ? "initial notification"
      : nextNumber === 2
      ? "reminder"
      : "final reminder";

  const confirmed =
    window.confirm(
      `Send the ${label} for "${event.title}"?

This will email all eligible members enrolled in ${
        event.classes?.name ??
        "this class"
      }.`
    );

  if (!confirmed) {
    return;
  }

  setProcessingEventId(
    event.id
  );

  setMessage("");
  setMessageType("");

  /*
   * STEP 1
   * Queue notifications.
   */
  const {
    data: queuedData,
    error: queueError,
  } = await supabase.rpc(
    "queue_event_email",
    {
      target_event:
        event.id,
    }
  );

  if (queueError) {
    setMessage(
      queueError.message
    );

    setMessageType("error");

    setProcessingEventId(
      null
    );

    return;
  }

  const queuedCount =
    typeof queuedData ===
    "number"
      ? queuedData
      : 0;

  /*
   * Delivery is deliberately asynchronous. The database RPC writes to the
   * durable email outbox and records this notification attempt atomically.
   * A scheduler calls /api/system/email-worker with EMAIL_WORKER_SECRET;
   * that worker claims rows and sends them through Resend idempotently.
   */
  await loadEvents();

  setMessage(
    `${queuedCount} email${
      queuedCount === 1
        ? ""
        : "s"
    } queued for secure delivery.`
  );

  setMessageType("success");

  setProcessingEventId(
    null
  );
}

  async function deleteEvent(
    event: EventItem
  ) {
    const confirmed = window.confirm(
      `Delete "${event.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingEventId(event.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessingEventId(null);
      return;
    }

    setEvents((current) =>
      current.filter(
        (item) => item.id !== event.id
      )
    );

    setMessage("Event deleted.");
    setMessageType("success");
    setProcessingEventId(null);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(
      undefined,
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

  function emailButtonLabel(
    event: EventItem
  ) {
    if (event.email_send_count >= 3) {
      return "Maximum Reached ✓";
    }

    if (event.email_send_count === 0) {
      return "Send Email Notification";
    }

    if (event.email_send_count === 1) {
      return "Send Reminder";
    }

    return "Send Final Reminder";
  }

  function exportEventsExcel() {
    if (events.length === 0) {
      setMessage("There are no events to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: "Jingwuguan-Seibukan-Events",
      sheetName: "Events",
      title: "Jingwuguan Seibukan Events",
      columns: [
        {
          header: "Class",
          key: "class_name",
          value: (event) =>
            event.classes?.name ?? "",
        },
        {
          header: "Event Title",
          key: "title",
        },
        {
          header: "Description",
          key: "description",
        },
        {
          header: "Location",
          key: "location",
        },
        {
          header: "Start",
          key: "starts_at",
          value: (event) =>
            formatDate(event.starts_at),
        },
        {
          header: "End",
          key: "end_at",
          value: (event) =>
            event.end_at
              ? formatDate(event.end_at)
              : "",
        },
        {
          header: "Email Notifications Sent",
          key: "email_send_count",
        },
        {
          header: "Last Email Sent",
          key: "last_email_sent_at",
          value: (event) =>
            event.last_email_sent_at
              ? formatDate(
                  event.last_email_sent_at
                )
              : "",
        },
      ],
      data: events,
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="text-neutral-400">
          Loading events...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/js-logo.jpeg"
              alt="Jingwuguan Seibukan"
              width={65}
              height={65}
              className="rounded-xl"
            />

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Super Admin
              </p>

              <h1 className="text-3xl font-bold">
                Events
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Create class events and send up to 3 email notifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ← Admin
          </button>
        </header>

        {message && (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType === "success"
                ? "border-green-900 bg-green-950/30 text-green-300"
                : "border-red-900 bg-red-950/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-bold">
            Create Event
          </h2>

          <form
            onSubmit={createEvent}
            className="mt-6 space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Class
              </label>

              <select
                value={selectedClassId}
                onChange={(e) =>
                  setSelectedClassId(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              >
                {classes.map(
                  (classItem) => (
                    <option
                      key={classItem.id}
                      value={classItem.id}
                    >
                      {classItem.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Title
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Example: Aikido Seminar"
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Location
              </label>

              <input
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value
                  )
                }
                placeholder="Example: Chushin Dojo"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Start
                </label>

                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) =>
                    setStartAt(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  End
                </label>

                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) =>
                    setEndAt(e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Optional event details"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {processing
                ? "Creating..."
                : "Create Event"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Existing Events
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Export all existing event records to Excel.
              </p>
            </div>

            <button
              type="button"
              disabled={events.length === 0}
              onClick={exportEventsExcel}
              className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>
          </div>

          {events.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
              No events yet.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {events.map((event) => {
                const eventProcessing =
                  processingEventId ===
                  event.id;

                return (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 md:flex-row">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                          {
                            event.classes
                              ?.name
                          }
                        </p>

                        <h3 className="mt-2 text-xl font-bold">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-sm text-neutral-300">
                          {formatDate(
                            event.starts_at
                          )}
                        </p>

                        {event.end_at && (
                          <p className="mt-1 text-sm text-neutral-500">
                            Ends:{" "}
                            {formatDate(
                              event.end_at
                            )}
                          </p>
                        )}

                        {event.location && (
                          <p className="mt-2 text-sm text-neutral-400">
                            📍{" "}
                            {event.location}
                          </p>
                        )}

                        {event.description && (
                          <p className="mt-3 text-sm leading-6 text-neutral-400">
                            {
                              event.description
                            }
                          </p>
                        )}

                        <div className="mt-4 rounded-lg bg-neutral-800 p-3">
                          <p className="text-sm text-neutral-400">
                            Email notifications
                          </p>

                          <p className="mt-1 font-semibold">
                            {
                              event.email_send_count
                            }{" "}
                            / 3
                          </p>

                          {event.last_email_sent_at && (
                            <p className="mt-1 text-xs text-neutral-500">
                              Last sent:{" "}
                              {formatDate(
                                event.last_email_sent_at
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start gap-3">
                        <button
                          type="button"
                          disabled={
                            eventProcessing ||
                            event.email_send_count >=
                              3
                          }
                          onClick={() =>
                            sendEventEmail(
                              event
                            )
                          }
                          className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-950/40 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-500 disabled:hover:bg-transparent"
                        >
                          {eventProcessing
                            ? "Processing..."
                            : emailButtonLabel(
                                event
                              )}
                        </button>

                        <button
                          type="button"
                          disabled={
                            eventProcessing
                          }
                          onClick={() =>
                            deleteEvent(
                              event
                            )
                          }
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

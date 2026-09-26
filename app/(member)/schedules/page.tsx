"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ScheduleRow = {
  schedule_id: string;
  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
  day_of_week: number;
  start_time: string;
  finish_time: string;
  instructor_id: string | null;
  instructor_name: string | null;
  venue: string | null;
  notes: string | null;
  is_active: boolean;
  can_manage: boolean;
  updated_at: string;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

export default function SchedulesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [view, setView] = useState<"dojo" | "class">("dojo");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSchedules() {
      const { data, error } = await supabase.rpc(
        "get_regular_class_schedules",
        { include_inactive: false },
      );

      if (!active) return;

      if (error) {
        setMessage(error.message);
      } else {
        setSchedules((data ?? []) as ScheduleRow[]);
      }

      setLoading(false);
    }

    void loadSchedules();

    return () => {
      active = false;
    };
  }, [supabase]);

  const groups = useMemo(() => {
    const grouped = new Map<string, { title: string; subtitle: string; rows: ScheduleRow[] }>();

    for (const row of schedules) {
      const key = view === "dojo" ? row.dojo_id : row.class_id;
      const title = view === "dojo" ? row.dojo_name : row.class_name;
      const subtitle = view === "dojo" ? row.class_name : "All dojos";
      const existing = grouped.get(key);

      if (existing) {
        existing.rows.push(row);
      } else {
        grouped.set(key, { title, subtitle, rows: [row] });
      }
    }

    return [...grouped.values()];
  }, [schedules, view]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
          Weekly timetable
        </p>
        <h1 className="text-3xl font-semibold text-white">Regular schedules</h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Browse regular training times by dojo or martial-art class. These timetable
          entries are for information only and do not create events or attendance.
        </p>
      </header>

      <div
        aria-label="Schedule grouping"
        className="inline-flex rounded-xl border border-neutral-800 bg-neutral-900 p-1"
        role="group"
      >
        {(["dojo", "class"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === option
                ? "bg-amber-500 text-neutral-950"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            By {option}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-300">
          Loading schedules…
        </p>
      ) : message ? (
        <p role="alert" className="rounded-2xl border border-red-900 bg-red-950/50 p-6 text-red-200">
          {message}
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-300">
          No regular schedules have been published yet.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={`${view}-${group.title}`}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60"
            >
              <div className="border-b border-neutral-800 px-5 py-4">
                <h2 className="text-xl font-semibold text-white">{group.title}</h2>
                <p className="mt-1 text-sm text-neutral-400">{group.subtitle}</p>
              </div>

              <div className="divide-y divide-neutral-800">
                {group.rows.map((row) => (
                  <article key={row.schedule_id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {DAY_NAMES[row.day_of_week] ?? "Unknown day"}
                        </p>
                        <p className="text-sm text-amber-300">
                          {formatTime(row.start_time)} – {formatTime(row.finish_time)}
                        </p>
                      </div>
                      <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                        {view === "class" ? row.dojo_name : row.class_name}
                      </span>
                    </div>

                    <dl className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                      <div>
                        <dt className="text-neutral-500">Instructor</dt>
                        <dd>{row.instructor_name ?? "To be confirmed"}</dd>
                      </div>
                      {row.venue && (
                        <div>
                          <dt className="text-neutral-500">Venue / room</dt>
                          <dd>{row.venue}</dd>
                        </div>
                      )}
                    </dl>

                    {row.notes && <p className="text-sm leading-6 text-neutral-400">{row.notes}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

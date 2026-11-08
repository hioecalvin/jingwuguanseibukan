"use client";

import Link from "next/link";
import type { DojoContact } from "@/lib/dojo-contact";
import DojoLogo from "@/components/dojo-logo";
import ScheduleInstructor from "@/components/schedule-instructor";
import CompactRecord from "@/components/compact-record";

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
  instructor_rank: string | null;
  instructor_phone: string | null;
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
  const [dojos, setDojos] = useState<DojoContact[]>([]);
  const [selectedDojo, setSelectedDojo] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const selected = view === "dojo" ? selectedDojo : selectedClass;
  const [retry, setRetry] = useState(0);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDojos() {
      setLoading(true); setMessage("");
      try {
        const result = await supabase.rpc("get_dojo_contact_details");
        if (!active) return;
        if (result.error) throw new Error("Unable to load schedule categories.");
        const rows = ((result.data ?? []) as DojoContact[]).filter(row => row.active);
        setDojos(rows);
        const requested = new URLSearchParams(window.location.search).get("dojo");
        if (requested && rows.some(row => row.dojo_id === requested)) setSelectedDojo(requested);
        setLoading(false);
      } catch {
        if (active) { setMessage("Schedule categories could not be loaded."); setLoading(false); }
      }
    }
    void loadDojos();
    return () => { active = false; };
  }, [supabase, categoryRetry]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    async function loadSchedules() {
      setLoading(true); setMessage("");
      try {
        const result = await supabase.rpc("get_regular_schedules_with_instructor", { include_inactive: false })
          .eq(view === "dojo" ? "dojo_id" : "class_id", selected);
        if (!active) return;
        if (result.error) throw new Error("Unable to load this schedule.");
        const rows = (result.data ?? []) as ScheduleRow[];
        setSchedules(rows.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time) || a.dojo_name.localeCompare(b.dojo_name)));
      } catch {
        if (active) { setSchedules([]); setMessage("Schedules could not be loaded. Please retry."); }
      } finally { if (active) setLoading(false); }
    }
    void loadSchedules();
    return () => { active = false; };
  }, [supabase, selected, view, retry]);

  const categories = useMemo(() => [...new Map(dojos.map(row => [
    view === "dojo" ? row.dojo_id : row.class_id,
    { id: view === "dojo" ? row.dojo_id : row.class_id, name: view === "dojo" ? `${row.dojo_name} · ${row.class_name}` : row.class_name },
  ])).values()].sort((left, right) => left.name.localeCompare(right.name)), [dojos, view]);
  const groups = useMemo(() => {
    const grouped = new Map<string, { title: string; subtitle: string; rows: ScheduleRow[] }>();

    for (const row of schedules.filter(row => (view === "dojo" ? row.dojo_id : row.class_id) === selected)) {
      const key = view === "dojo" ? row.dojo_id : row.class_id;
      const title = view === "dojo" ? row.dojo_name : row.class_name;
      const subtitle = view === "dojo" ? row.class_name : "";
      const existing = grouped.get(key);

      if (existing) {
        existing.rows.push(row);
      } else {
        grouped.set(key, { title, subtitle, rows: [row] });
      }
    }

    return [...grouped.values()];
  }, [schedules, view, selected]);

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
            onClick={() => {
              if (option === view) return;
              setView(option);
              setSchedules([]);
              setSelectedDojo("");
              setSelectedClass("");
              if (dojos.length) { setLoading(false); setMessage(""); }
            }}
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

      <label className="block" htmlFor="schedule-category">Choose {view}
        <select id="schedule-category" value={selected} onChange={event => {
          const id = event.target.value;
          if (view === "dojo") setSelectedDojo(id);
          else setSelectedClass(id);
          setSchedules([]);
          setLoading(Boolean(id));
          setMessage("");
        }} className="mt-2 block min-h-11 w-full rounded border border-neutral-600 bg-neutral-950 px-3 py-2">
          <option value="">{categories.length ? `Select a ${view}` : "No categories available"}</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      {(selected || message) && <button type="button" disabled={loading} onClick={() => dojos.length ? setRetry(value => value + 1) : setCategoryRetry(value => value + 1)} className="min-h-11 rounded border px-3 disabled:opacity-50">{message ? "Retry schedules" : "Refresh schedules"}</button>}
      {loading ? (
        <p className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-300">
          Loading schedules…
        </p>
      ) : message ? (
        <p role="alert" className="rounded-2xl border border-red-900 bg-red-950/50 p-6 text-red-200">
          {message}
        </p>
      ) : !selected ? null : groups.length === 0 ? (
        <p className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-300">
          No regular schedules for this {view}.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={`${view}-${group.title}`}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60"
            >
              <div className="border-b border-neutral-800 px-5 py-4">
                {view === "dojo" && <DojoLogo name={group.title} className="mb-2" />}
                <h2 className="text-xl font-semibold text-white">{view === "dojo" ? <Link className="underline text-sky-300" href={`/dojos?dojo=${encodeURIComponent(group.rows[0].dojo_id)}`}>{group.title}</Link> : group.title}</h2>
                {group.subtitle && <p className="mt-1 text-sm text-neutral-400">{group.subtitle}</p>}
              </div>

              <div className="divide-y divide-neutral-800">
                {group.rows.map((row) => (
                  <CompactRecord alwaysCollapsible summary={<>{DAY_NAMES[row.day_of_week]} · {formatTime(row.start_time)} – {formatTime(row.finish_time)}</>} detail={view === "class" ? row.dojo_name : row.class_name} key={row.schedule_id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {view === "class" && <DojoLogo name={row.dojo_name} />}
                      <div>
                        <p className="font-semibold text-white">
                          {DAY_NAMES[row.day_of_week] ?? "Unknown day"}
                        </p>
                        <p className="text-sm text-amber-300">
                          {formatTime(row.start_time)} – {formatTime(row.finish_time)}
                        </p>
                      </div>
                      <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                        <Link className="underline text-sky-300" href={`/dojos?dojo=${encodeURIComponent(row.dojo_id)}`}>{row.dojo_name}</Link>
                      </span>
                    </div>

                    <dl className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                      <div>
                        <dt className="text-neutral-500">Instructor</dt>
                        <dd><ScheduleInstructor name={row.instructor_name} rank={row.instructor_rank} phone={row.instructor_phone} /></dd>
                      </div>
                      {row.venue && (
                        <div>
                          <dt className="text-neutral-500">Venue / room</dt>
                          <dd>{row.venue}</dd>
                        </div>
                      )}
                    </dl>

                    {row.notes && <p className="text-sm leading-6 text-neutral-400">{row.notes}</p>}
                  </CompactRecord>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

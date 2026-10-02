"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ScheduleScope = {
  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
};

type InstructorOption = {
  instructor_id: string;
  instructor_name: string;
};

type ScheduleRow = ScheduleScope & {
  schedule_id: string;
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

const EMPTY_FORM = {
  scheduleId: "",
  dojoId: "",
  dayOfWeek: "2",
  startTime: "19:00",
  finishTime: "21:00",
  instructorId: "",
  venue: "",
  notes: "",
  isActive: true,
};

function displayTime(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

export default function ScheduleManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const [scopes, setScopes] = useState<ScheduleScope[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const loadPage = useCallback(async () => {
    const [scopeResponse, scheduleResponse] = await Promise.all([
      supabase.rpc("get_manageable_schedule_scopes"),
      supabase.rpc("get_regular_class_schedules", { include_inactive: true }),
    ]);

    if (scopeResponse.error || scheduleResponse.error) {
      setMessage(scopeResponse.error?.message ?? scheduleResponse.error?.message ?? "Unable to load schedules.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const nextScopes = (scopeResponse.data ?? []) as ScheduleScope[];
    setScopes(nextScopes);
    setSchedules(
      ((scheduleResponse.data ?? []) as ScheduleRow[]).filter((row) => row.can_manage),
    );
    setForm((current) => ({
      ...current,
      dojoId: current.dojoId || nextScopes[0]?.dojo_id || "",
    }));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    let active = true;

    async function loadInstructors() {
      if (!form.dojoId) {
        setInstructors([]);
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_schedule_instructor_options",
        { target_dojo_id: form.dojoId },
      );

      if (!active) return;

      if (error) {
        setInstructors([]);
        setMessage(error.message);
        setMessageType("error");
      } else {
        setInstructors((data ?? []) as InstructorOption[]);
      }
    }

    void loadInstructors();

    return () => {
      active = false;
    };
  }, [form.dojoId, supabase]);

  function resetForm(preferredDojoId = form.dojoId) {
    setForm({
      ...EMPTY_FORM,
      dojoId: preferredDojoId || scopes[0]?.dojo_id || "",
    });
  }

  function editSchedule(row: ScheduleRow) {
    setForm({
      scheduleId: row.schedule_id,
      dojoId: row.dojo_id,
      dayOfWeek: String(row.day_of_week),
      startTime: row.start_time.slice(0, 5),
      finishTime: row.finish_time.slice(0, 5),
      instructorId: row.instructor_id ?? "",
      venue: row.venue ?? "",
      notes: row.notes ?? "",
      isActive: row.is_active,
    });
    setMessage("");
    setMessageType("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc("upsert_regular_class_schedule", {
      target_dojo_id: form.dojoId,
      target_day_of_week: Number(form.dayOfWeek),
      target_start_time: form.startTime,
      target_finish_time: form.finishTime,
      target_instructor_id: form.instructorId || null,
      target_venue: form.venue.trim() || null,
      target_notes: form.notes.trim() || null,
      target_is_active: form.isActive,
      target_schedule_id: form.scheduleId || null,
    });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setSaving(false);
      return;
    }

    const retainedDojoId = form.dojoId;
    setMessage(form.scheduleId ? "Schedule updated." : "Schedule created.");
    setMessageType("success");
    resetForm(retainedDojoId);
    await loadPage();
    setSaving(false);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
          Dojo and class administration
        </p>
        <h1 className="text-3xl font-semibold text-white">Manage regular schedules</h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Maintain weekly timetable information only inside your assigned dojo and class scope.
          Saving a schedule does not create an event, attendance session, reminder or notification.
        </p>
      </header>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageType === "error"
              ? "border-red-900 bg-red-950/50 text-red-200"
              : "border-emerald-900 bg-emerald-950/50 text-emerald-200"
          }`}
        >
          {message}
        </p>
      )}

      <section aria-labelledby="schedule-form-heading" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="schedule-form-heading" className="text-xl font-semibold text-white">
              {form.scheduleId ? "Edit schedule" : "Add schedule"}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">Times are local to the listed dojo.</p>
          </div>
          {form.scheduleId && (
            <button
              type="button"
              onClick={() => resetForm()}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel editing
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-300">Loading management scope…</p>
        ) : scopes.length === 0 ? (
          <p className="text-neutral-300">No active dojo and class scope is assigned to this account.</p>
        ) : (
          <form onSubmit={saveSchedule} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Dojo and class</span>
              <select
                required
                value={form.dojoId}
                onChange={(event) => setForm((current) => ({ ...current, dojoId: event.target.value, instructorId: "" }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              >
                {scopes.map((scope) => (
                  <option key={scope.dojo_id} value={scope.dojo_id}>
                    {scope.dojo_name} — {scope.class_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Day</span>
              <select
                value={form.dayOfWeek}
                onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              >
                {DAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>

            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Start time</span>
              <input
                required
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Finish time</span>
              <input
                required
                type="time"
                value={form.finishTime}
                onChange={(event) => setForm((current) => ({ ...current, finishTime: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Instructor</span>
              <select
                value={form.instructorId}
                onChange={(event) => setForm((current) => ({ ...current, instructorId: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              >
                <option value="">To be confirmed</option>
                {instructors.map((instructor) => (
                  <option key={instructor.instructor_id} value={instructor.instructor_id}>
                    {instructor.instructor_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-neutral-300">
              <span className="mb-1 block font-medium">Venue / room (optional)</span>
              <input
                maxLength={200}
                value={form.venue}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm text-neutral-300 md:col-span-2">
              <span className="mb-1 block font-medium">Notes (optional)</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 accent-amber-500"
              />
              Active and visible to members
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || !form.dojoId}
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : form.scheduleId ? "Save changes" : "Add schedule"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="managed-schedules-heading" className="space-y-4">
        <div>
          <h2 id="managed-schedules-heading" className="text-xl font-semibold text-white">Your managed schedules</h2>
          <p className="mt-1 text-sm text-neutral-400">Inactive rows remain here for history and can be reactivated.</p>
        </div>

        {schedules.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-neutral-300">No schedules exist in your scope.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {schedules.map((row) => (
              <article key={row.schedule_id} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{row.dojo_name} — {row.class_name}</h3>
                    <p className="mt-1 text-sm text-amber-300">
                      {DAY_NAMES[row.day_of_week]} · {displayTime(row.start_time)} – {displayTime(row.finish_time)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.is_active ? "bg-emerald-950 text-emerald-300" : "bg-neutral-800 text-neutral-400"}`}>
                    {row.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-neutral-300">Instructor: {row.instructor_name ?? "To be confirmed"}</p>
                {row.venue && <p className="mt-1 text-sm text-neutral-400">Venue: {row.venue}</p>}
                {row.notes && <p className="mt-3 text-sm leading-6 text-neutral-400">{row.notes}</p>}
                <button
                  type="button"
                  onClick={() => editSchedule(row)}
                  className="mt-4 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
                >
                  Edit schedule
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

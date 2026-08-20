"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";

type MembershipLevel = "mudansha" | "yudansha";

type Application = {
  request_id: string;
  user_id: string;
  class_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  class_name: string | null;
  dojo_name: string | null;
  status: string;
};

export default function ApplicationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<
    Record<string, MembershipLevel>
  >({});

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  /*
   * ============================================================
   * LOAD APPLICATIONS
   * ============================================================
   */

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const { data, error } = await supabase
        .from("admin_visible_requests")
        .select("*")
        .eq("status", "pending");

      if (!active) {
        return;
      }

      if (error) {
        console.error("Applications load error:", error);

        setMessage(error.message);
        setMessageType("error");
        setLoading(false);

        return;
      }

      setApplications((data ?? []) as Application[]);
      setLoading(false);
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, [supabase]);

  /*
   * ============================================================
   * APPROVE
   * ============================================================
   */

  async function approveApplication(application: Application) {
    if (processingId) {
      return;
    }

    setProcessingId(application.request_id);
    setMessage("");
    setMessageType("");

    const level =
      selectedLevels[application.request_id] ?? "mudansha";

    /*
     * Approve membership request.
     */

    const { error: approveError } = await supabase.rpc(
      "review_class_request",
      {
        request_id: application.request_id,
        decision: "approved",
        reason: null,
      }
    );

    if (approveError) {
      setMessage(approveError.message);
      setMessageType("error");
      setProcessingId(null);

      return;
    }

    /*
     * Locate newly-created membership.
     */

    const { data: membership, error: membershipError } = await supabase
      .from("class_memberships")
      .select("id")
      .eq("user_id", application.user_id)
      .eq("class_id", application.class_id)
      .single();

    if (membershipError || !membership) {
      console.error(
        "Membership lookup after approval failed:",
        membershipError
      );

      setMessage(
        "The application was approved, but its membership level could not be updated. Please check the Member record."
      );

      setMessageType("error");
      setProcessingId(null);

      return;
    }

    /*
     * Assign Mudansha / Yudansha.
     */

    const { error: levelError } = await supabase.rpc(
      "set_membership_level",
      {
        membership_id: membership.id,
        new_level: level,
      }
    );

    if (levelError) {
      console.error("Membership level update failed:", levelError);

      setMessage(
        "The application was approved, but its membership level could not be updated. Please check the Member record."
      );

      setMessageType("error");
      setProcessingId(null);

      return;
    }

    /*
     * Remove from pending list.
     */

    setApplications((current) =>
      current.filter(
        (item) => item.request_id !== application.request_id
      )
    );

    setSelectedLevels((current) => {
      const updated = { ...current };

      delete updated[application.request_id];

      return updated;
    });

    setMessage(
      `${application.full_name ?? "Member"} was approved as ${
        level === "yudansha" ? "Yudansha" : "Mudansha"
      }.`
    );

    setMessageType("success");
    setProcessingId(null);
  }

  /*
   * ============================================================
   * REJECT
   * ============================================================
   */

  async function rejectApplication(application: Application) {
    if (processingId) {
      return;
    }

    const reason = window.prompt(
      `Reason for rejecting ${
        application.full_name ?? "this application"
      }:`
    );

    if (reason === null) {
      return;
    }

    setProcessingId(application.request_id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc("review_class_request", {
      request_id: application.request_id,
      decision: "rejected",
      reason: reason.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessingId(null);

      return;
    }

    setApplications((current) =>
      current.filter(
        (item) => item.request_id !== application.request_id
      )
    );

    setSelectedLevels((current) => {
      const updated = { ...current };

      delete updated[application.request_id];

      return updated;
    });

    setMessage(
      `${application.full_name ?? "Application"} was rejected.`
    );

    setMessageType("success");
    setProcessingId(null);
  }

  /*
   * ============================================================
   * EXCEL EXPORT
   * ============================================================
   */

  function exportApplicationsExcel() {
    if (applications.length === 0) {
      setMessage("There are no pending applications to export.");
      setMessageType("error");

      return;
    }

    exportToExcel({
      filename: "Pending-Membership-Applications",
      sheetName: "Applications",
      title: "Pending Membership Applications",

      columns: [
        {
          header: "Full Name",
          key: "full_name",
          value: (row) => row.full_name ?? "",
        },
        {
          header: "Email",
          key: "email",
          value: (row) => row.email ?? "",
        },
        {
          header: "Phone",
          key: "phone",
          value: (row) => row.phone ?? "",
        },
        {
          header: "Date of Birth",
          key: "date_of_birth",
          value: (row) => formatDate(row.date_of_birth),
        },
        {
          header: "Class",
          key: "class_name",
          value: (row) => row.class_name ?? "",
        },
        {
          header: "Dojo",
          key: "dojo_name",
          value: (row) => row.dojo_name ?? "",
        },
        {
          header: "Status",
          key: "status",
        },
        {
          header: "Selected Membership Level",
          key: "selected_level",
          value: (row) => {
            const level =
              selectedLevels[row.request_id] ?? "mudansha";

            return level === "yudansha"
              ? "Yudansha"
              : "Mudansha";
          },
        },
      ],

      data: applications,
    });
  }

  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  function formatDate(value: string | null) {
    if (!value) {
      return "-";
    }

    /*
     * Avoid timezone shifting for PostgreSQL DATE values.
     */

    const dateOnly = value.slice(0, 10);
    const parts = dateOnly.split("-");

    if (parts.length === 3) {
      const [year, month, day] = parts;

      return `${day}/${month}/${year}`;
    }

    return value;
  }

  /*
   * ============================================================
   * COUNTS
   * ============================================================
   */

  const mudanshaCount = applications.filter(
    (application) =>
      (selectedLevels[application.request_id] ?? "mudansha") ===
      "mudansha"
  ).length;

  const yudanshaCount = applications.filter(
    (application) =>
      selectedLevels[application.request_id] === "yudansha"
  ).length;

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="mx-auto w-full max-w-7xl">
      {/*
       * HEADER
       */}

      <header className="border-b border-neutral-800 pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              Membership
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Pending Applications
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Review new membership requests and assign the
              Member&apos;s initial membership level.
            </p>
          </div>

          <button
            type="button"
            disabled={loading || applications.length === 0}
            onClick={exportApplicationsExcel}
            className="
              self-start
              rounded-lg
              border
              border-green-800
              bg-green-950/20
              px-5
              py-2.5
              text-sm
              font-semibold
              text-green-300
              transition
              hover:bg-green-950/40
              disabled:cursor-not-allowed
              disabled:opacity-40
              sm:self-auto
            "
          >
            Export Excel
          </button>
        </div>
      </header>

      {/*
       * MESSAGE
       */}

      {message && (
        <div
          className={`
            mt-6
            rounded-xl
            border
            p-4
            text-sm

            ${
              messageType === "success"
                ? `
                    border-green-900
                    bg-green-950/30
                    text-green-300
                  `
                : `
                    border-red-900
                    bg-red-950/30
                    text-red-300
                  `
            }
          `}
        >
          {message}
        </div>
      )}

      {/*
       * SUMMARY
       */}

      {!loading && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Pending"
            value={applications.length}
          />

          <SummaryCard
            label="Mudansha"
            value={mudanshaCount}
          />

          <SummaryCard
            label="Yudansha"
            value={yudanshaCount}
          />
        </section>
      )}

      {/*
       * LOADING
       */}

      {loading && (
        <section className="mt-8 flex min-h-[300px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900">
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

            <p className="mt-4 text-sm text-neutral-400">
              Loading applications...
            </p>
          </div>
        </section>
      )}

      {/*
       * EMPTY
       */}

      {!loading && applications.length === 0 && (
        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950 text-2xl text-neutral-500">
            ✓
          </div>

          <h2 className="mt-5 text-xl font-semibold">
            No pending applications
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
            There are currently no membership requests waiting for
            administrative review.
          </p>
        </section>
      )}

      {/*
       * APPLICATIONS
       */}

      {!loading && applications.length > 0 && (
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                Review Queue
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Membership Requests
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {applications.length}{" "}
              {applications.length === 1
                ? "application"
                : "applications"}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {applications.map((application) => {
              const selectedLevel =
                selectedLevels[application.request_id] ?? "mudansha";

              const isProcessing =
                processingId === application.request_id;

              const anotherApplicationProcessing =
                processingId !== null && !isProcessing;

              return (
                <article
                  key={application.request_id}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900
                  "
                >
                  {/*
                   * MEMBER DETAILS
                   */}

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-5 md:flex-row">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold">
                            {application.full_name ?? "Unknown Member"}
                          </h3>

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
                            Pending
                          </span>
                        </div>

                        <div className="mt-5 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          <Detail
                            label="Email"
                            value={application.email}
                          />

                          <Detail
                            label="Phone"
                            value={application.phone}
                          />

                          <Detail
                            label="Date of Birth"
                            value={formatDate(
                              application.date_of_birth
                            )}
                          />

                          <Detail
                            label="Class"
                            value={application.class_name}
                          />

                          <Detail
                            label="Dojo"
                            value={application.dojo_name}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/*
                   * REVIEW
                   */}

                  <div
                    className="
                      border-t
                      border-neutral-800
                      bg-neutral-950/40
                      p-5
                      sm:p-6
                    "
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                      <div className="w-full max-w-sm">
                        <label
                          htmlFor={`level-${application.request_id}`}
                          className="
                            block
                            text-xs
                            font-semibold
                            uppercase
                            tracking-[0.15em]
                            text-neutral-500
                          "
                        >
                          Initial Membership Level
                        </label>

                        <select
                          id={`level-${application.request_id}`}
                          value={selectedLevel}
                          disabled={
                            isProcessing ||
                            anotherApplicationProcessing
                          }
                          onChange={(event) =>
                            setSelectedLevels((current) => ({
                              ...current,

                              [application.request_id]:
                                event.target
                                  .value as MembershipLevel,
                            }))
                          }
                          className="
                            mt-2
                            w-full
                            rounded-lg
                            border
                            border-neutral-700
                            bg-neutral-900
                            px-3
                            py-2.5
                            text-sm
                            text-white
                            outline-none
                            focus:border-sky-600
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <option value="mudansha">
                            Mudansha
                          </option>

                          <option value="yudansha">
                            Yudansha
                          </option>
                        </select>

                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          This sets the Member&apos;s initial level
                          after the application is approved. Their
                          actual grade can be managed from the Members
                          page.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            isProcessing ||
                            anotherApplicationProcessing
                          }
                          onClick={() =>
                            approveApplication(application)
                          }
                          className="
                            rounded-lg
                            bg-green-600
                            px-5
                            py-2.5
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-green-500
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          {isProcessing
                            ? "Processing..."
                            : `Approve as ${
                                selectedLevel === "yudansha"
                                  ? "Yudansha"
                                  : "Mudansha"
                              }`}
                        </button>

                        <button
                          type="button"
                          disabled={
                            isProcessing ||
                            anotherApplicationProcessing
                          }
                          onClick={() =>
                            rejectApplication(application)
                          }
                          className="
                            rounded-lg
                            border
                            border-red-800
                            bg-red-950/30
                            px-5
                            py-2.5
                            text-sm
                            font-semibold
                            text-red-300
                            transition
                            hover:bg-red-950/60
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/*
       * INFORMATION
       */}

      {!loading && applications.length > 0 && (
        <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
          <p className="text-sm leading-6 text-neutral-500">
            Approval creates or activates the Member&apos;s class
            membership. Select Mudansha or Yudansha before approval.
            Rank, tier, grading history and other Member records can be
            managed afterwards from Admin → Members.
          </p>
        </section>
      )}
    </main>
  );
}

/*
 * ============================================================
 * SUMMARY CARD
 * ============================================================
 */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * DETAIL
 * ============================================================
 */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm text-neutral-200">
        {value || "-"}
      </p>
    </div>
  );
}
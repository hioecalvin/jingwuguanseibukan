"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";


type ReportRow = {
  audit_id: string;

  document_reference: string;

  report_type: string;

  generated_at: string;

  generated_by: string;

  generated_by_name: string | null;

  generated_by_role: string;

  membership_id: string;

  member_id: string | null;

  member_name: string;

  class_name: string;

  dojo_name: string | null;

  membership_status: string;
};


export default function OfficialReportHistoryPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    reports,
    setReports,
  ] =
    useState<ReportRow[]>([]);


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


  const [
    messageType,
    setMessageType,
  ] =
    useState<
      | "success"
      | "error"
      | ""
    >("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    classFilter,
    setClassFilter,
  ] =
    useState("all");


  const [
    adminFilter,
    setAdminFilter,
  ] =
    useState("all");


  useEffect(() => {
    async function loadPage() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();


      if (!user) {
        router.replace(
          "/login"
        );

        return;
      }


      await loadReports();

      setLoading(
        false
      );
    }


    loadPage();
  }, []);


  async function loadReports() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_member_report_history"
      );


    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      return;
    }


    setReports(
      (data ??
        []) as ReportRow[]
    );
  }


  const classes =
    Array.from(
      new Set(
        reports.map(
          (item) =>
            item.class_name
        )
      )
    ).sort();


  const admins =
    Array.from(
      new Map(
        reports.map(
          (item) => [
            item.generated_by,
            item.generated_by_name ??
              "Unknown Administrator",
          ]
        )
      )
    );


  const filteredReports =
    reports.filter(
      (report) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const searchMatch =
          !query ||

          report
            .document_reference
            .toLowerCase()
            .includes(query) ||

          report
            .member_name
            .toLowerCase()
            .includes(query) ||

          (
            report
              .member_id ??
            ""
          )
            .toLowerCase()
            .includes(query) ||

          report
            .class_name
            .toLowerCase()
            .includes(query) ||

          (
            report
              .generated_by_name ??
            ""
          )
            .toLowerCase()
            .includes(query);


        const classMatch =
          classFilter ===
            "all" ||
          report.class_name ===
            classFilter;


        const adminMatch =
          adminFilter ===
            "all" ||
          report.generated_by ===
            adminFilter;


        return (
          searchMatch &&
          classMatch &&
          adminMatch
        );
      }
    );


  function formatTimestamp(
    value: string
  ) {
    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }


    return date.toLocaleString(
      "en-AU",
      {
        day: "numeric",
        month: "short",
        year: "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }


  function statusLabel(
    status: string
  ) {
    if (
      status ===
        "break_1" ||
      status ===
        "break_2" ||
      status.toLowerCase() ===
        "break"
    ) {
      return "Break";
    }


    if (
      status.toLowerCase() ===
      "inactive"
    ) {
      return "Inactive";
    }


    return "Active";
  }


  function statusClass(
    status: string
  ) {
    const normalized =
      statusLabel(
        status
      );


    if (
      normalized ===
      "Active"
    ) {
      return "border-green-800 bg-green-950/30 text-green-300";
    }


    if (
      normalized ===
      "Break"
    ) {
      return "border-yellow-800 bg-yellow-950/30 text-yellow-300";
    }


    return "border-red-900 bg-red-950/30 text-red-300";
  }


  function exportReportsExcel() {
    if (filteredReports.length === 0) {
      setMessage("There are no official reports to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: "Official-Report-History",
      sheetName: "Report History",
      title: "Official Report History",
      columns: [
        { header: "Document Reference", key: "document_reference" },
        { header: "Member ID", key: "member_id", value: (row) => row.member_id ?? "" },
        { header: "Member Name", key: "member_name" },
        { header: "Class", key: "class_name" },
        { header: "Dojo", key: "dojo_name", value: (row) => row.dojo_name ?? "" },
        { header: "Membership Status", key: "membership_status", value: (row) => statusLabel(row.membership_status) },
        { header: "Report Type", key: "report_type", value: () => "Official Member Record" },
        { header: "Generated At", key: "generated_at", value: (row) => formatTimestamp(row.generated_at) },
        { header: "Generated By", key: "generated_by_name", value: (row) => row.generated_by_name ?? "Unknown Administrator" },
        { header: "Generator Role", key: "generated_by_role" },
      ],
      data: filteredReports,
    });
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading report history...
        </p>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
                Administration
              </p>


              <h1 className="text-3xl font-bold">
                Official Report History
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Audit history for every official member record generated by the system.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
            className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ← Admin
          </button>

        </header>


        {/* MESSAGE */}

        {message && (

          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType ===
              "success"
                ? "border-green-900 bg-green-950/30 text-green-300"
                : "border-red-900 bg-red-950/30 text-red-300"
            }`}
          >
            {message}
          </div>

        )}


        {/* FILTERS */}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

          <div className="grid gap-4 md:grid-cols-3">

            <input
              type="search"
              value={
                search
              }
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Reference / Member / Class / Admin"
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />


            <select
              value={
                classFilter
              }
              onChange={(e) =>
                setClassFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Classes
              </option>


              {classes.map(
                (
                  className
                ) => (

                  <option
                    key={
                      className
                    }
                    value={
                      className
                    }
                  >
                    {className}
                  </option>

                )
              )}

            </select>


            <select
              value={
                adminFilter
              }
              onChange={(e) =>
                setAdminFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Administrators
              </option>


              {admins.map(
                (
                  [
                    adminId,
                    adminName,
                  ]
                ) => (

                  <option
                    key={
                      adminId
                    }
                    value={
                      adminId
                    }
                  >
                    {adminName}
                  </option>

                )
              )}

            </select>

          </div>


          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-neutral-500">
              Showing{" "}
              <span className="text-neutral-300">
                {
                  filteredReports.length
                }
              </span>{" "}
              of{" "}
              <span className="text-neutral-300">
                {
                  reports.length
                }
              </span>{" "}
              generated reports
            </p>

            <button
              type="button"
              disabled={filteredReports.length === 0}
              onClick={exportReportsExcel}
              className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
            >
              Export Excel
            </button>

          </div>

        </section>


        {/* REPORTS */}

        <section className="mt-6 space-y-4">

          {filteredReports.length ===
          0 ? (

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

              <p className="text-neutral-400">
                No official reports found.
              </p>

            </div>

          ) : (

            filteredReports.map(
              (
                report
              ) => (

                <article
                  key={
                    report.audit_id
                  }
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                >

                  <div className="flex flex-col justify-between gap-5 lg:flex-row">

                    <div>

                      <div className="flex flex-wrap items-center gap-3">

                        <h2 className="text-xl font-bold">
                          {
                            report.member_name
                          }
                        </h2>


                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            report.membership_status
                          )}`}
                        >
                          {statusLabel(
                            report.membership_status
                          )}
                        </span>

                      </div>


                      <p className="mt-2 break-all font-mono text-sm text-amber-300">
                        {
                          report.document_reference
                        }
                      </p>


                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">

                        <p>
                          <span className="text-neutral-500">
                            Member ID:
                          </span>{" "}

                          {report.member_id ??
                            "-"}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Class:
                          </span>{" "}

                          {
                            report.class_name
                          }
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Dojo:
                          </span>{" "}

                          {report.dojo_name ??
                            "-"}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Report Type:
                          </span>{" "}

                          Official Member Record
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Generated:
                          </span>{" "}

                          {formatTimestamp(
                            report.generated_at
                          )}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Generated By:
                          </span>{" "}

                          {report.generated_by_name ??
                            "Unknown Administrator"}
                        </p>

                      </div>


                      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Generator
                        </p>


                        <p className="mt-2 font-medium text-neutral-200">
                          {report.generated_by_name ??
                            "Unknown Administrator"}
                        </p>


                        <p className="mt-1 text-sm text-neutral-500">
                          {
                            report.generated_by_role
                          }
                        </p>

                      </div>

                    </div>


                    <div className="self-start rounded-xl border border-amber-900 bg-amber-950/10 px-4 py-3">

                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                        Audit Record
                      </p>


                      <p className="mt-2 text-xs text-neutral-400">
                        This entry records that an official PDF was generated.
                      </p>

                    </div>

                  </div>

                </article>

              )
            )

          )}

        </section>

      </div>

    </main>
  );
}
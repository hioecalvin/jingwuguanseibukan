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


type CertificateRow = {
  certificate_id: string;
  certificate_number: string;

  membership_id: string;

  member_id: string | null;
  member_name: string;

  class_name: string;
  rank_name: string;

  promotion_date: string;

  certificate_created_at: string;
  certificate_created_by_name: string | null;

  latest_print_at: string | null;
  latest_print_by_name: string | null;

  print_count: number;

  certificate_status:
    | "valid"
    | "revoked";

  revoked_at: string | null;
  revoke_reason: string | null;
  revoked_by_name: string | null;
};


type PrintLogRow = {
  id: string;

  certificate_id: string;

  printed_at: string;

  printed_by: string;

  printed_by_name: string | null;

  print_type:
    | "original"
    | "reprint";
};


export default function CertificateHistoryPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    certificates,
    setCertificates,
  ] =
    useState<
      CertificateRow[]
    >([]);


  const [
    printLogs,
    setPrintLogs,
  ] =
    useState<
      Record<
        string,
        PrintLogRow[]
      >
    >({});


  const [
    openLogs,
    setOpenLogs,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


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
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      | "all"
      | "valid"
      | "revoked"
    >("all");


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


      await loadCertificates();

      setLoading(
        false
      );
    }


    loadPage();
  }, []);


  async function loadCertificates() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_certificate_history"
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


    setCertificates(
      (data ??
        []) as CertificateRow[]
    );
  }


  async function loadPrintLog(
    certificateId: string
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_certificate_print_log",
        {
          target_certificate_id:
            certificateId,
        }
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


    setPrintLogs(
      (current) => ({
        ...current,

        [certificateId]:
          (data ??
            []) as PrintLogRow[],
      })
    );
  }


  async function togglePrintLog(
    certificateId: string
  ) {
    const opening =
      !openLogs[
        certificateId
      ];


    setOpenLogs(
      (current) => ({
        ...current,

        [certificateId]:
          opening,
      })
    );


    if (
      opening &&
      !printLogs[
        certificateId
      ]
    ) {
      await loadPrintLog(
        certificateId
      );
    }
  }


  const classes =
    Array.from(
      new Set(
        certificates.map(
          (item) =>
            item.class_name
        )
      )
    ).sort();


  const filteredCertificates =
    certificates.filter(
      (certificate) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const searchMatch =
          !query ||

          certificate
            .certificate_number
            .toLowerCase()
            .includes(query) ||

          certificate
            .member_name
            .toLowerCase()
            .includes(query) ||

          (
            certificate
              .member_id ??
            ""
          )
            .toLowerCase()
            .includes(query) ||

          certificate
            .rank_name
            .toLowerCase()
            .includes(query) ||

          certificate
            .class_name
            .toLowerCase()
            .includes(query);


        const classMatch =
          classFilter ===
            "all" ||
          certificate
            .class_name ===
            classFilter;


        const statusMatch =
          statusFilter ===
            "all" ||
          certificate
            .certificate_status ===
            statusFilter;


        return (
          searchMatch &&
          classMatch &&
          statusMatch
        );
      }
    );


  function formatDate(
    value:
      | string
      | null
  ) {
    if (!value) {
      return "-";
    }


    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
        ? new Date(
            `${value}T00:00:00`
          )
        : new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }


    return date.toLocaleDateString(
      "en-AU",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }


  function formatTimestamp(
    value:
      | string
      | null
  ) {
    if (!value) {
      return "-";
    }


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


  function exportCertificatesExcel() {
    if (filteredCertificates.length === 0) {
      setMessage("There are no certificates to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: "Certificate-History",
      sheetName: "Certificates",
      title: "Certificate History",
      columns: [
        { header: "Certificate Number", key: "certificate_number" },
        { header: "Member ID", key: "member_id", value: (row) => row.member_id ?? "" },
        { header: "Member Name", key: "member_name" },
        { header: "Class", key: "class_name" },
        { header: "Rank", key: "rank_name" },
        { header: "Promotion Date", key: "promotion_date", value: (row) => formatDate(row.promotion_date) },
        { header: "Status", key: "certificate_status", value: (row) => row.certificate_status === "valid" ? "Valid" : "Revoked / Invalid" },
        { header: "Certificate Created", key: "certificate_created_at", value: (row) => formatTimestamp(row.certificate_created_at) },
        { header: "Created By", key: "certificate_created_by_name", value: (row) => row.certificate_created_by_name ?? "Unknown Administrator" },
        { header: "Total Prints", key: "print_count" },
        { header: "Latest Print", key: "latest_print_at", value: (row) => row.latest_print_at ? formatTimestamp(row.latest_print_at) : "" },
        { header: "Latest Print By", key: "latest_print_by_name", value: (row) => row.latest_print_by_name ?? "" },
        { header: "Revoked At", key: "revoked_at", value: (row) => row.revoked_at ? formatTimestamp(row.revoked_at) : "" },
        { header: "Revoked By", key: "revoked_by_name", value: (row) => row.revoked_by_name ?? "" },
        { header: "Revoke Reason", key: "revoke_reason", value: (row) => row.revoke_reason ?? "" },
      ],
      data: filteredCertificates,
    });
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading certificates...
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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-400">
                Administration
              </p>


              <h1 className="text-3xl font-bold">
                Certificate History
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Official certificate numbers, validity status and complete print audit history.
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
              placeholder="Certificate / Member / Rank / Class"
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
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "all"
                    | "valid"
                    | "revoked"
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Certificate Status
              </option>

              <option value="valid">
                Valid
              </option>

              <option value="revoked">
                Revoked / Invalid
              </option>

            </select>

          </div>


          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap gap-4 text-sm text-neutral-500">

            <p>
              Showing{" "}
              <span className="text-neutral-300">
                {
                  filteredCertificates.length
                }
              </span>{" "}
              of{" "}
              <span className="text-neutral-300">
                {
                  certificates.length
                }
              </span>{" "}
              certificates
            </p>


            <p>
              Valid:{" "}
              <span className="text-green-400">
                {
                  certificates.filter(
                    (
                      item
                    ) =>
                      item.certificate_status ===
                      "valid"
                  ).length
                }
              </span>
            </p>


            <p>
              Revoked:{" "}
              <span className="text-red-400">
                {
                  certificates.filter(
                    (
                      item
                    ) =>
                      item.certificate_status ===
                      "revoked"
                  ).length
                }
              </span>
            </p>

            </div>

            <button
              type="button"
              disabled={filteredCertificates.length === 0}
              onClick={exportCertificatesExcel}
              className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
            >
              Export Excel
            </button>

          </div>

        </section>


        {/* CERTIFICATES */}

        <section className="mt-6 space-y-4">

          {filteredCertificates.length ===
          0 ? (

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

              <p className="text-neutral-400">
                No certificates found.
              </p>

            </div>

          ) : (

            filteredCertificates.map(
              (
                certificate
              ) => {

                const logsOpen =
                  openLogs[
                    certificate
                      .certificate_id
                  ] ?? false;


                const logs =
                  printLogs[
                    certificate
                      .certificate_id
                  ];


                const revoked =
                  certificate
                    .certificate_status ===
                  "revoked";


                return (
                  <article
                    key={
                      certificate
                        .certificate_id
                    }
                    className={`rounded-2xl border p-6 ${
                      revoked
                        ? "border-red-900 bg-red-950/10"
                        : "border-neutral-800 bg-neutral-900"
                    }`}
                  >

                    {/* CERTIFICATE HEADER */}

                    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <h2 className="text-xl font-bold">
                            {
                              certificate
                                .member_name
                            }
                          </h2>


                          <span className="rounded-full border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-semibold text-purple-300">
                            {
                              certificate
                                .rank_name
                            }
                          </span>


                          {revoked ? (

                            <span className="rounded-full border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-bold text-red-300">
                              REVOKED / INVALID
                            </span>

                          ) : (

                            <span className="rounded-full border border-green-800 bg-green-950/30 px-3 py-1 text-xs font-bold text-green-300">
                              VALID
                            </span>

                          )}

                        </div>


                        <p className="mt-2 break-all font-mono text-sm text-amber-300">
                          {
                            certificate
                              .certificate_number
                          }
                        </p>


                        {/* DETAILS */}

                        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">

                          <p>
                            <span className="text-neutral-500">
                              Member ID:
                            </span>{" "}

                            {certificate
                              .member_id ??
                              "-"}
                          </p>


                          <p>
                            <span className="text-neutral-500">
                              Class:
                            </span>{" "}

                            {
                              certificate
                                .class_name
                            }
                          </p>


                          <p>
                            <span className="text-neutral-500">
                              Promotion Date:
                            </span>{" "}

                            {formatDate(
                              certificate
                                .promotion_date
                            )}
                          </p>


                          <p>
                            <span className="text-neutral-500">
                              Certificate Created:
                            </span>{" "}

                            {formatTimestamp(
                              certificate
                                .certificate_created_at
                            )}
                          </p>


                          <p>
                            <span className="text-neutral-500">
                              Created By:
                            </span>{" "}

                            {certificate
                              .certificate_created_by_name ??
                              "Unknown Administrator"}
                          </p>


                          <p>
                            <span className="text-neutral-500">
                              Total Prints:
                            </span>{" "}

                            {
                              certificate
                                .print_count
                            }
                          </p>

                        </div>


                        {/* LATEST PRINT */}

                        {certificate
                          .latest_print_at && (

                          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              Latest Print
                            </p>


                            <p className="mt-2 text-sm text-neutral-300">

                              {formatTimestamp(
                                certificate
                                  .latest_print_at
                              )}

                              {" · "}

                              {certificate
                                .latest_print_by_name ??
                                "Unknown Administrator"}

                            </p>

                          </div>

                        )}


                        {/* REVOKED INFORMATION */}

                        {revoked && (

                          <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4">

                            <p className="font-semibold text-red-300">
                              Certificate Invalidated
                            </p>


                            <p className="mt-2 text-sm leading-6 text-red-200">
                              The promotion associated with this certificate was revoked. This certificate is retained for audit purposes but must no longer be treated as a valid grading certificate.
                            </p>


                            <div className="mt-4 grid gap-2 text-sm">

                              <p>
                                <span className="text-neutral-500">
                                  Reason:
                                </span>{" "}

                                <span className="text-red-200">
                                  {certificate
                                    .revoke_reason ??
                                    "No reason recorded"}
                                </span>
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Revoked By:
                                </span>{" "}

                                {certificate
                                  .revoked_by_name ??
                                  "Unknown Administrator"}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Revoked At:
                                </span>{" "}

                                {formatTimestamp(
                                  certificate
                                    .revoked_at
                                )}
                              </p>

                            </div>

                          </div>

                        )}

                      </div>


                      {/* PRINT LOG BUTTON */}

                      <button
                        type="button"
                        onClick={() =>
                          togglePrintLog(
                            certificate
                              .certificate_id
                          )
                        }
                        className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                      >
                        {logsOpen
                          ? "Hide Print Log"
                          : "View Print Log"}
                      </button>

                    </div>


                    {/* PRINT AUDIT */}

                    {logsOpen && (

                      <div className="mt-5 border-t border-neutral-800 pt-5">

                        <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                          Certificate Print Audit
                        </p>


                        <p className="mt-1 text-sm text-neutral-500">
                          Every original print and reprint of this certificate is retained.
                        </p>


                        {!logs ? (

                          <p className="mt-4 text-sm text-neutral-500">
                            Loading print history...
                          </p>

                        ) : logs.length ===
                          0 ? (

                          <p className="mt-4 text-sm text-neutral-500">
                            No print records found.
                          </p>

                        ) : (

                          <div className="mt-4 space-y-3">

                            {logs.map(
                              (
                                log,
                                index
                              ) => (

                                <div
                                  key={
                                    log.id
                                  }
                                  className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 sm:flex-row sm:items-center"
                                >

                                  <div>

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="font-semibold">

                                        {log.print_type ===
                                        "original"
                                          ? "Original Certificate"
                                          : "Certificate Reprint"}

                                      </p>


                                      {log.print_type ===
                                        "original" && (

                                        <span className="rounded-full border border-amber-800 bg-amber-950/30 px-2 py-1 text-[10px] font-bold text-amber-300">
                                          ORIGINAL
                                        </span>

                                      )}


                                      {index ===
                                        0 && (

                                        <span className="rounded-full border border-sky-800 bg-sky-950/30 px-2 py-1 text-[10px] font-bold text-sky-300">
                                          LATEST PRINT
                                        </span>

                                      )}

                                    </div>


                                    <p className="mt-2 text-sm text-neutral-400">

                                      Printed by{" "}

                                      <span className="font-medium text-neutral-300">
                                        {log.printed_by_name ??
                                          "Unknown Administrator"}
                                      </span>

                                    </p>

                                  </div>


                                  <p className="text-sm font-medium text-neutral-300">
                                    {formatTimestamp(
                                      log.printed_at
                                    )}
                                  </p>

                                </div>

                              )
                            )}

                          </div>

                        )}

                      </div>

                    )}

                  </article>
                );
              }
            )

          )}

        </section>

      </div>

    </main>
  );
}
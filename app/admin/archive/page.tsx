"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  formatDate,
  formatDateTime,
} from "@/lib/format-date";


type DocumentArchiveRow = {
  archive_id: string;

  document_group: string;
  document_type: string;

  document_reference: string;

  membership_id: string | null;
  user_id: string | null;

  member_id: string | null;
  aikikai_registration_number: string | null;
  member_name: string | null;

  class_id: string | null;
  class_name: string | null;

  dojo_id: string | null;
  dojo_name: string | null;

  document_subject: string | null;
  effective_date: string | null;

  generated_by: string | null;
  generated_by_name: string | null;
  generated_at: string;

  document_status: string;

  print_count: number | null;
  last_printed_at: string | null;

  revoked_at: string | null;
  revoked_by: string | null;
  revoked_by_name: string | null;
  revoke_reason: string | null;

  metadata: Record<string, unknown> | null;
};


type Profile = {
  id: string;
  full_name: string;
  is_super_admin: boolean;
};


type MessageType =
  | "error"
  | "";


export default function DocumentArchivePage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
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
    documents,
    setDocuments,
  ] =
    useState<
      DocumentArchiveRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
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
    dojoFilter,
    setDojoFilter,
  ] =
    useState("all");


  const [
    groupFilter,
    setGroupFilter,
  ] =
    useState("all");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState("all");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");


  const [
    dateFrom,
    setDateFrom,
  ] =
    useState("");


  const [
    dateTo,
    setDateTo,
  ] =
    useState("");


  const [
    selectedDocument,
    setSelectedDocument,
  ] =
    useState<
      DocumentArchiveRow | null
    >(null);

  const loadArchive = useCallback(async (
    showRefreshing =
      true
  ) => {
    if (
      showRefreshing
    ) {
      setRefreshing(
        true
      );
    }


    setMessage("");
    setMessageType("");


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "search_document_archive",
        {
          search_text:
            null,

          requested_document_group:
            "all",

          requested_document_type:
            "all",

          requested_class_id:
            null,

          requested_dojo_id:
            null,

          requested_status:
            "all",

          requested_date_from:
            null,

          requested_date_to:
            null,
        }
      );


    if (
      error
    ) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setRefreshing(
        false
      );

      return;
    }


    setDocuments(
      (
        data ??
        []
      ) as
        DocumentArchiveRow[]
    );


    setRefreshing(
      false
    );
  }, [supabase]);


  useEffect(() => {
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
            id,
            full_name,
            is_super_admin
          `)
          .eq(
            "id",
            user.id
          )
          .single();


      if (
        profileError ||
        !profileData
      ) {
        router.replace(
          "/"
        );

        return;
      }


      setProfile(
        profileData as
          Profile
      );


      await loadArchive(
        false
      );


      setLoading(
        false
      );
    }


    loadPage();
  }, [
    loadArchive,
    router,
    supabase,
  ]);


  const classes =
    Array.from(
      new Map(
        documents
          .filter(
            (
              item
            ) =>
              item.class_id &&
              item.class_name
          )
          .map(
            (
              item
            ) => [
              item.class_id as string,
              item.class_name as string,
            ]
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        a[1].localeCompare(
          b[1]
        )
    );


  const dojos =
    Array.from(
      new Map(
        documents
          .filter(
            (
              item
            ) =>
              item.dojo_id &&
              item.dojo_name
          )
          .map(
            (
              item
            ) => [
              item.dojo_id as string,
              item.dojo_name as string,
            ]
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        a[1].localeCompare(
          b[1]
        )
    );


  const groups =
    Array.from(
      new Set(
        documents.map(
          (
            item
          ) =>
            item.document_group
        )
      )
    ).sort();


  const types =
    Array.from(
      new Set(
        documents.map(
          (
            item
          ) =>
            item.document_type
        )
      )
    ).sort();


  const statuses =
    Array.from(
      new Set(
        documents.map(
          (
            item
          ) =>
            item.document_status
        )
      )
    ).sort();


  const filteredDocuments =
    documents.filter(
      (
        item
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const metadataText =
          item.metadata
            ? JSON.stringify(
                item.metadata
              ).toLowerCase()
            : "";


        const searchMatch =
          !query ||

          item.document_reference
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.member_name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.member_id ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.aikikai_registration_number ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.class_name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.dojo_name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            item.document_subject ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          item.document_type
            .replaceAll(
              "_",
              " "
            )
            .toLowerCase()
            .includes(
              query
            ) ||

          item.document_group
            .replaceAll(
              "_",
              " "
            )
            .toLowerCase()
            .includes(
              query
            ) ||

          metadataText.includes(
            query
          );


        const classMatch =
          classFilter ===
            "all" ||
          item.class_id ===
            classFilter;


        const dojoMatch =
          dojoFilter ===
            "all" ||
          item.dojo_id ===
            dojoFilter;


        const groupMatch =
          groupFilter ===
            "all" ||
          item.document_group ===
            groupFilter;


        const typeMatch =
          typeFilter ===
            "all" ||
          item.document_type ===
            typeFilter;


        const statusMatch =
          statusFilter ===
            "all" ||
          item.document_status ===
            statusFilter;


        const effectiveDate =
          item.effective_date ??
          item.generated_at.slice(
            0,
            10
          );


        const fromMatch =
          !dateFrom ||
          effectiveDate >=
            dateFrom;


        const toMatch =
          !dateTo ||
          effectiveDate <=
            dateTo;


        return (
          searchMatch &&
          classMatch &&
          dojoMatch &&
          groupMatch &&
          typeMatch &&
          statusMatch &&
          fromMatch &&
          toMatch
        );
      }
    );


  function labelFromValue(
    value: string
  ) {
    return value
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        (
          char
        ) =>
          char.toUpperCase()
      );
  }


  function statusClass(
    value: string
  ) {
    if (
      value ===
      "valid" ||
      value ===
      "approved" ||
      value ===
      "completed"
    ) {
      return "border-green-800 bg-green-950/30 text-green-300";
    }


    if (
      value ===
      "revoked" ||
      value ===
      "rejected" ||
      value ===
      "cancelled"
    ) {
      return "border-red-800 bg-red-950/30 text-red-300";
    }


    return "border-sky-800 bg-sky-950/30 text-sky-300";
  }


  function groupClass(
    value: string
  ) {
    if (
      value ===
      "certificate"
    ) {
      return "border-purple-800 bg-purple-950/30 text-purple-300";
    }


    if (
      value ===
      "finance"
    ) {
      return "border-green-800 bg-green-950/30 text-green-300";
    }


    if (
      value ===
      "member_record"
    ) {
      return "border-amber-800 bg-amber-950/30 text-amber-300";
    }


    return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }


  function formatIdentity(
    item:
      DocumentArchiveRow
  ) {
    if (
      item.aikikai_registration_number
    ) {
      return `${item.member_id ?? "Not assigned"} / ${item.aikikai_registration_number}`;
    }


    return item.member_id ??
      "Not assigned";
  }


  function clearFilters() {
    setSearch("");
    setClassFilter(
      "all"
    );
    setDojoFilter(
      "all"
    );
    setGroupFilter(
      "all"
    );
    setTypeFilter(
      "all"
    );
    setStatusFilter(
      "all"
    );
    setDateFrom("");
    setDateTo("");
  }


  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading archive...
        </p>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-7xl">


        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <Image
              src="/js-logo.jpeg"
              alt="Jingwuguan Seibukan"
              width={65}
              height={65}
              className="rounded-xl"
              priority
            />


            <div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
                Administration
              </p>


              <h1 className="text-3xl font-bold">
                Archive
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Search and view all archived documents across certificates, records and future document types.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                loadArchive()
              }
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>


            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin"
                )
              }
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              ← Admin
            </button>

          </div>

        </header>


        <section className="mt-6 rounded-xl border border-amber-900 bg-amber-950/10 p-4">

          <p className="text-sm text-amber-200">
            Archive records are view-only and remain permanently available for audit history.
          </p>


          <p className="mt-2 text-xs text-neutral-500">
            {profile?.is_super_admin
              ? "Super Admin can view archived documents across all categories."
              : "Admins only see archived documents for categories/classes covered by their Admin assignments."}
          </p>

        </section>


        {message && (

          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType ===
              "error"
                ? "border-red-900 bg-red-950/30 text-red-300"
                : "border-neutral-800 bg-neutral-900 text-neutral-300"
            }`}
          >
            {message}
          </div>

        )}


        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <ArchiveSummary
            label="All Documents"
            value={
              documents.length
            }
          />


          <ArchiveSummary
            label="Certificates"
            value={
              documents.filter(
                (
                  item
                ) =>
                  item.document_group ===
                  "certificate"
              ).length
            }
            tone="purple"
          />


          <ArchiveSummary
            label="Valid"
            value={
              documents.filter(
                (
                  item
                ) =>
                  item.document_status ===
                  "valid"
              ).length
            }
            tone="green"
          />


          <ArchiveSummary
            label="Revoked"
            value={
              documents.filter(
                (
                  item
                ) =>
                  item.document_status ===
                  "revoked"
              ).length
            }
            tone="red"
          />

        </section>


        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

          <div>

            <label className="mb-2 block text-sm font-semibold">
              Search All Archived Documents
            </label>


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
              placeholder="Document number, Member, Member ID, Aikikai, class, dojo, rank, title..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-4 text-base text-white"
            />

          </div>


          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <ArchiveSelect
              value={
                groupFilter
              }
              onChange={
                setGroupFilter
              }
              label="Document Group"
              allLabel="All Groups"
              options={
                groups
              }
            />


            <ArchiveSelect
              value={
                typeFilter
              }
              onChange={
                setTypeFilter
              }
              label="Document Type"
              allLabel="All Types"
              options={
                types.filter(
                  (
                    type
                  ) =>
                    groupFilter ===
                      "all" ||
                    documents.some(
                      (
                        item
                      ) =>
                        item.document_group ===
                          groupFilter &&
                        item.document_type ===
                          type
                    )
                )
              }
            />


            <ArchiveSelect
              value={
                classFilter
              }
              onChange={(value) => {
                setClassFilter(
                  value
                );

                setDojoFilter(
                  "all"
                );
              }}
              label="Class / Category"
              allLabel="All Classes"
              options={
                classes.map(
                  (
                    [
                      id,
                      name,
                    ]
                  ) => ({
                    value:
                      id,
                    label:
                      name,
                  })
                )
              }
            />


            <ArchiveSelect
              value={
                dojoFilter
              }
              onChange={
                setDojoFilter
              }
              label="Dojo"
              allLabel="All Dojos"
              options={
                dojos
                  .filter(
                    (
                      [
                        id,
                      ]
                    ) =>
                      classFilter ===
                        "all" ||
                      documents.some(
                        (
                          item
                        ) =>
                          item.dojo_id ===
                            id &&
                          item.class_id ===
                            classFilter
                      )
                  )
                  .map(
                    (
                      [
                        id,
                        name,
                      ]
                    ) => ({
                      value:
                        id,
                      label:
                        name,
                    })
                  )
              }
            />


            <ArchiveSelect
              value={
                statusFilter
              }
              onChange={
                setStatusFilter
              }
              label="Status"
              allLabel="All Status"
              options={
                statuses
              }
            />


            <div>

              <label className="mb-2 block text-sm font-medium">
                Date From
              </label>

              <input
                type="date"
                value={
                  dateFrom
                }
                onChange={(e) =>
                  setDateFrom(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium">
                Date To
              </label>

              <input
                type="date"
                value={
                  dateTo
                }
                onChange={(e) =>
                  setDateTo(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
              />

            </div>


            <div className="flex items-end">

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="w-full rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Clear Filters
              </button>

            </div>

          </div>


          <div className="mt-5 border-t border-neutral-800 pt-5">

            <p className="text-sm text-neutral-500">
              Showing{" "}
              {filteredDocuments.length}{" "}
              of{" "}
              {documents.length}{" "}
              archived documents
            </p>

          </div>

        </section>


        <section className="mt-6 space-y-4">

          {filteredDocuments.length ===
          0 ? (

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

              <p className="text-neutral-400">
                No archived documents match your search or filters.
              </p>

            </div>

          ) : (

            filteredDocuments.map(
              (
                document
              ) => (

                <article
                  key={
                    `${document.document_type}:${document.archive_id}`
                  }
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${groupClass(
                            document.document_group
                          )}`}
                        >
                          {labelFromValue(
                            document.document_group
                          )}
                        </span>


                        <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-semibold text-neutral-300">
                          {labelFromValue(
                            document.document_type
                          )}
                        </span>


                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusClass(
                            document.document_status
                          )}`}
                        >
                          {document.document_status}
                        </span>

                      </div>


                      <p className="mt-4 font-mono text-sm text-neutral-400">
                        {document.document_reference}
                      </p>


                      <h2 className="mt-2 text-2xl font-bold">
                        {document.member_name ??
                          document.document_subject ??
                          labelFromValue(
                            document.document_type
                          )}
                      </h2>


                      {document.member_name && (

                        <p className="mt-1 text-sm text-neutral-500">
                          {formatIdentity(
                            document
                          )}
                        </p>

                      )}


                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">

                        {document.class_name && (

                          <p>
                            <span className="text-neutral-500">
                              Class:
                            </span>{" "}
                            {document.class_name}
                          </p>

                        )}


                        {document.dojo_name && (

                          <p>
                            <span className="text-neutral-500">
                              Dojo:
                            </span>{" "}
                            {document.dojo_name}
                          </p>

                        )}


                        {document.document_subject && (

                          <p>
                            <span className="text-neutral-500">
                              Subject:
                            </span>{" "}

                            <span className="font-semibold">
                              {document.document_subject}
                            </span>
                          </p>

                        )}


                        <p>
                          <span className="text-neutral-500">
                            Date:
                          </span>{" "}
                          {document.effective_date
                            ? formatDate(
                                document.effective_date
                              )
                            : formatDate(
                                document.generated_at
                              )}
                        </p>

                      </div>

                    </div>


                    <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">

                      <div className="text-sm lg:text-right">

                        <p className="text-neutral-500">
                          Generated
                        </p>

                        <p className="mt-1 font-medium">
                          {formatDateTime(
                            document.generated_at
                          )}
                        </p>


                        {document.print_count !==
                          null && (

                          <>
                            <p className="mt-3 text-neutral-500">
                              Prints
                            </p>

                            <p className="mt-1 font-medium">
                              {document.print_count}
                            </p>
                          </>

                        )}

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDocument(
                            document
                          )
                        }
                        className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-950/30"
                      >
                        View Record
                      </button>

                    </div>

                  </div>


                  {document.document_status ===
                    "revoked" && (

                    <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4">

                      <p className="font-semibold text-red-300">
                        REVOKED DOCUMENT
                      </p>


                      <p className="mt-2 text-sm text-red-200">
                        This document remains permanently archived because it was previously issued.
                      </p>


                      {document.revoke_reason && (

                        <p className="mt-2 text-sm text-red-300">
                          Reason:{" "}
                          {document.revoke_reason}
                        </p>

                      )}

                    </div>

                  )}

                </article>

              )
            )

          )}

        </section>


        {selectedDocument && (

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-record-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setSelectedDocument(
                  null
                );
              }
            }}
          >

            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                    Archived Document
                  </p>


                  <h2 id="archive-record-title" className="mt-1 text-2xl font-bold">
                    {selectedDocument.document_reference}
                  </h2>


                  <p className="mt-1 text-sm text-neutral-500">
                    View only
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedDocument(
                      null
                    )
                  }
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                  Close
                </button>

              </div>


              <div className="mt-6 grid gap-4 sm:grid-cols-2">

                <Detail
                  label="Document Group"
                  value={
                    labelFromValue(
                      selectedDocument.document_group
                    )
                  }
                />


                <Detail
                  label="Document Type"
                  value={
                    labelFromValue(
                      selectedDocument.document_type
                    )
                  }
                />


                <Detail
                  label="Status"
                  value={
                    selectedDocument.document_status.toUpperCase()
                  }
                />


                <Detail
                  label="Subject"
                  value={
                    selectedDocument.document_subject ??
                    "-"
                  }
                />


                {selectedDocument.member_name && (

                  <Detail
                    label="Member"
                    value={
                      selectedDocument.member_name
                    }
                  />

                )}


                {selectedDocument.membership_id && (

                  <Detail
                    label="Member ID / Aikikai"
                    value={
                      formatIdentity(
                        selectedDocument
                      )
                    }
                  />

                )}


                <Detail
                  label="Class"
                  value={
                    selectedDocument.class_name ??
                    "-"
                  }
                />


                <Detail
                  label="Dojo"
                  value={
                    selectedDocument.dojo_name ??
                    "-"
                  }
                />


                <Detail
                  label="Effective Date"
                  value={
                    selectedDocument.effective_date
                      ? formatDate(
                          selectedDocument.effective_date
                        )
                      : "-"
                  }
                />


                <Detail
                  label="Generated By"
                  value={
                    selectedDocument.generated_by_name ??
                    "-"
                  }
                />


                <Detail
                  label="Generated"
                  value={
                    formatDateTime(
                      selectedDocument.generated_at
                    )
                  }
                />


                {selectedDocument.print_count !==
                  null && (

                  <Detail
                    label="Print Count"
                    value={
                      String(
                        selectedDocument.print_count
                      )
                    }
                  />

                )}


                {selectedDocument.last_printed_at && (

                  <Detail
                    label="Last Printed"
                    value={
                      formatDateTime(
                        selectedDocument.last_printed_at
                      )
                    }
                  />

                )}

              </div>


              {selectedDocument.document_status ===
                "revoked" && (

                <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-5">

                  <p className="text-sm font-semibold uppercase tracking-wider text-red-300">
                    Revocation Information
                  </p>


                  <div className="mt-4 grid gap-4 sm:grid-cols-2">

                    <Detail
                      label="Revoked"
                      value={
                        selectedDocument.revoked_at
                          ? formatDateTime(
                              selectedDocument.revoked_at
                            )
                          : "-"
                      }
                    />


                    <Detail
                      label="Revoked By"
                      value={
                        selectedDocument.revoked_by_name ??
                        "-"
                      }
                    />

                  </div>


                  <div className="mt-4">

                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      Reason
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm text-red-200">
                      {selectedDocument.revoke_reason ??
                        "No reason recorded."}
                    </p>

                  </div>

                </div>

              )}


              {selectedDocument.metadata && (

                <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Additional Information
                  </p>


                  <div className="mt-3 space-y-2">

                    {Object.entries(
                      selectedDocument.metadata
                    ).map(
                      (
                        [
                          key,
                          value,
                        ]
                      ) => {

                        if (
                          value ===
                            null ||
                          value ===
                            undefined ||
                          value ===
                            ""
                        ) {
                          return null;
                        }


                        return (
                          <div
                            key={
                              key
                            }
                            className="grid gap-1 text-sm sm:grid-cols-[200px_1fr]"
                          >

                            <span className="text-neutral-500">
                              {labelFromValue(
                                key
                              )}
                            </span>


                            <span className="break-words text-neutral-300">
                              {typeof value ===
                                "object"
                                ? JSON.stringify(
                                    value
                                  )
                                : String(
                                    value
                                  )}
                            </span>

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>

              )}


              <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                <p className="text-xs text-neutral-500">
                  The Archive is read-only. Editing, revoking, approving, regenerating or deleting documents must be performed through the original administrative workflow.
                </p>

              </div>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}


function ArchiveSummary({
  label,
  value,
  tone =
    "neutral",
}: {
  label: string;
  value: number;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple";
}) {
  const style =
    tone ===
    "green"
      ? "border-green-900 bg-green-950/20 text-green-300"
      : tone ===
        "red"
      ? "border-red-900 bg-red-950/20 text-red-300"
      : tone ===
        "purple"
      ? "border-purple-900 bg-purple-950/20 text-purple-300"
      : "border-neutral-800 bg-neutral-900 text-white";


  return (
    <div
      className={`rounded-xl border p-4 ${style}`}
    >

      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
        {label}
      </p>


      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

    </div>
  );
}


function ArchiveSelect({
  value,
  onChange,
  label,
  allLabel,
  options,
}: {
  value: string;

  onChange:
    (
      value:
        string
    ) => void;

  label: string;
  allLabel: string;

  options:
    | string[]
    | Array<{
        value: string;
        label: string;
      }>;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>


      <select
        value={
          value
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
      >

        <option value="all">
          {allLabel}
        </option>


        {options.map(
          (
            option
          ) => {
            if (
              typeof option ===
              "string"
            ) {
              return (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {option
                    .replaceAll(
                      "_",
                      " "
                    )
                    .replace(
                      /\b\w/g,
                      (
                        char
                      ) =>
                        char.toUpperCase()
                    )}
                </option>
              );
            }


            return (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            );
          }
        )}

      </select>

    </div>
  );
}


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>


      <p className="mt-2 font-medium text-neutral-200">
        {value}
      </p>

    </div>
  );
}

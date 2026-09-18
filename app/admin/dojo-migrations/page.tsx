"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";


type MigrationType =
  | "bulk_admin"
  | "member_request"
  | "manual_admin";


type MigrationRow = {
  migration_id: string;

  membership_id: string;

  member_id: string | null;
  member_name: string;

  class_name: string;

  from_dojo_name: string;
  to_dojo_name: string;

  effective_date: string;

  reason: string | null;

  migration_type:
    MigrationType;

  migrated_by: string;
  migrated_by_name: string | null;

  migrated_at: string;
};


export default function DojoMigrationHistoryPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    migrations,
    setMigrations,
  ] =
    useState<
      MigrationRow[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


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
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      | "all"
      | MigrationType
    >("all");


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

  const loadMigrations = useCallback(async () => {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_migration_history"
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

      return;
    }


    setMigrations(
      (
        data ??
        []
      ) as MigrationRow[]
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
            is_super_admin
          `)
          .eq(
            "id",
            user.id
          )
          .single();


      if (
        profileError ||
        !profileData ||
        profileData
          .is_super_admin !==
          true
      ) {
        router.replace(
          "/admin"
        );

        return;
      }


      await loadMigrations();


      setLoading(
        false
      );
    }


    loadPage();
  }, [
    loadMigrations,
    router,
    supabase,
  ]);


  const classes =
    Array.from(
      new Set(
        migrations.map(
          (
            item
          ) =>
            item.class_name
        )
      )
    ).sort();


  const filteredMigrations =
    migrations.filter(
      (
        migration
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const searchMatch =
          !query ||

          migration
            .member_name
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            migration
              .member_id ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          migration
            .from_dojo_name
            .toLowerCase()
            .includes(
              query
            ) ||

          migration
            .to_dojo_name
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            migration
              .migrated_by_name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            migration
              .reason ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            );


        const classMatch =
          classFilter ===
            "all" ||
          migration
            .class_name ===
            classFilter;


        const typeMatch =
          typeFilter ===
            "all" ||
          migration
            .migration_type ===
            typeFilter;


        return (
          searchMatch &&
          classMatch &&
          typeMatch
        );
      }
    );


  function formatDate(
    value: string
  ) {
    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      "en-AU",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }


  function formatTimestamp(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
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


  function migrationTypeLabel(
    type:
      MigrationType
  ) {
    if (
      type ===
      "member_request"
    ) {
      return "Member Request";
    }


    if (
      type ===
      "manual_admin"
    ) {
      return "Manual Admin";
    }


    return "Bulk Admin";
  }


  function migrationTypeClass(
    type:
      MigrationType
  ) {
    if (
      type ===
      "member_request"
    ) {
      return "border-sky-800 bg-sky-950/30 text-sky-300";
    }


    if (
      type ===
      "manual_admin"
    ) {
      return "border-amber-800 bg-amber-950/30 text-amber-300";
    }


    return "border-purple-800 bg-purple-950/30 text-purple-300";
  }


  function exportMigrationsExcel() {
    if (filteredMigrations.length === 0) {
      setMessage("There are no migration records to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: "Dojo-Migration-History",
      sheetName: "Migration History",
      title: "Dojo Migration History",
      columns: [
        {
          header: "Member ID",
          key: "member_id",
          value: (row) => row.member_id ?? "",
        },
        {
          header: "Member Name",
          key: "member_name",
        },
        {
          header: "Class",
          key: "class_name",
        },
        {
          header: "From Dojo",
          key: "from_dojo_name",
        },
        {
          header: "To Dojo",
          key: "to_dojo_name",
        },
        {
          header: "Effective Date",
          key: "effective_date",
          value: (row) => formatDate(row.effective_date),
        },
        {
          header: "Migration Type",
          key: "migration_type",
          value: (row) => migrationTypeLabel(row.migration_type),
        },
        {
          header: "Reason",
          key: "reason",
          value: (row) => row.reason ?? "",
        },
        {
          header: "Migrated By",
          key: "migrated_by_name",
          value: (row) =>
            row.migrated_by_name ?? "Unknown Administrator",
        },
        {
          header: "Recorded At",
          key: "migrated_at",
          value: (row) => formatTimestamp(row.migrated_at),
        },
      ],
      data: filteredMigrations,
    });
  }


  const bulkCount =
    migrations.filter(
      (
        item
      ) =>
        item.migration_type ===
        "bulk_admin"
    ).length;


  const requestCount =
    migrations.filter(
      (
        item
      ) =>
        item.migration_type ===
        "member_request"
    ).length;


  const manualCount =
    migrations.filter(
      (
        item
      ) =>
        item.migration_type ===
        "manual_admin"
    ).length;


  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading migration history...
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
              priority
            />


            <div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-400">
                Super Administration
              </p>


              <h1 className="text-3xl font-bold">
                Dojo Migration History
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Permanent audit history for member moves between dojos.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dojos"
                )
              }
              className="rounded-lg border border-purple-800 bg-purple-950/20 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-950/40"
            >
              Dojo Management
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


        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">

            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Total
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                migrations.length
              }
            </p>

          </div>


          <div className="rounded-2xl border border-purple-900 bg-purple-950/20 p-5">

            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Bulk Admin
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-200">
              {
                bulkCount
              }
            </p>

          </div>


          <div className="rounded-2xl border border-sky-900 bg-sky-950/20 p-5">

            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Member Request
            </p>

            <p className="mt-2 text-3xl font-bold text-sky-200">
              {
                requestCount
              }
            </p>

          </div>


          <div className="rounded-2xl border border-amber-900 bg-amber-950/20 p-5">

            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Manual Admin
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-200">
              {
                manualCount
              }
            </p>

          </div>

        </section>


        {/* FILTERS */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

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
              placeholder="Member / Dojo / Admin / Reason"
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
                    {
                      className
                    }
                  </option>

                )
              )}

            </select>


            <select
              value={
                typeFilter
              }
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as
                    | "all"
                    | MigrationType
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Migration Types
              </option>

              <option value="bulk_admin">
                Bulk Admin
              </option>

              <option value="member_request">
                Member Request
              </option>

              <option value="manual_admin">
                Manual Admin
              </option>

            </select>

          </div>


          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-neutral-500">

              Showing{" "}

              <span className="text-neutral-300">
                {
                  filteredMigrations.length
                }
              </span>{" "}

              of{" "}

              <span className="text-neutral-300">
                {
                  migrations.length
                }
              </span>{" "}

              migration records

            </p>

            <button
              type="button"
              disabled={filteredMigrations.length === 0}
              onClick={exportMigrationsExcel}
              className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
            >
              Export Excel
            </button>

          </div>

        </section>


        {/* MIGRATIONS */}

        <section className="mt-6 space-y-4">

          {filteredMigrations.length ===
          0 ? (

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

              <p className="text-neutral-400">
                No dojo migration records found.
              </p>

            </div>

          ) : (

            filteredMigrations.map(
              (
                migration
              ) => (

                <article
                  key={
                    migration
                      .migration_id
                  }
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                >

                  <div className="flex flex-col justify-between gap-5 lg:flex-row">

                    <div className="min-w-0 flex-1">

                      {/* MEMBER HEADER */}

                      <div className="flex flex-wrap items-center gap-3">

                        <h2 className="text-xl font-bold">
                          {
                            migration
                              .member_name
                          }
                        </h2>


                        <span className="rounded-full border border-neutral-700 bg-neutral-950/50 px-3 py-1 text-xs font-semibold text-neutral-300">
                          {
                            migration
                              .class_name
                          }
                        </span>


                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${migrationTypeClass(
                            migration
                              .migration_type
                          )}`}
                        >
                          {migrationTypeLabel(
                            migration
                              .migration_type
                          )}
                        </span>

                      </div>


                      <p className="mt-2 text-sm text-neutral-400">

                        Member ID:{" "}

                        {migration
                          .member_id ??
                          "Not assigned"}

                      </p>


                      {/* MOVEMENT */}

                      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">

                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            From
                          </p>

                          <p className="mt-2 text-lg font-semibold">
                            {
                              migration
                                .from_dojo_name
                            }
                          </p>

                        </div>


                        <div className="text-center text-2xl text-purple-400">
                          →
                        </div>


                        <div className="rounded-xl border border-purple-900 bg-purple-950/20 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                            To
                          </p>

                          <p className="mt-2 text-lg font-semibold">
                            {
                              migration
                                .to_dojo_name
                            }
                          </p>

                        </div>

                      </div>


                      {/* DETAILS */}

                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">

                        <p>
                          <span className="text-neutral-500">
                            Effective Date:
                          </span>{" "}

                          {formatDate(
                            migration
                              .effective_date
                          )}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Migration Type:
                          </span>{" "}

                          {migrationTypeLabel(
                            migration
                              .migration_type
                          )}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Migrated By:
                          </span>{" "}

                          {migration
                            .migrated_by_name ??
                            "Unknown Administrator"}
                        </p>


                        <p>
                          <span className="text-neutral-500">
                            Recorded:
                          </span>{" "}

                          {formatTimestamp(
                            migration
                              .migrated_at
                          )}
                        </p>

                      </div>


                      {/* REASON */}

                      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Reason
                        </p>


                        <p className="mt-2 text-sm leading-6 text-neutral-300">
                          {migration.reason ??
                            "No reason recorded"}
                        </p>

                      </div>

                    </div>


                    {/* AUDIT LABEL */}

                    <div className="self-start rounded-xl border border-purple-900 bg-purple-950/10 px-4 py-3">

                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                        Permanent Record
                      </p>


                      <p className="mt-2 max-w-[220px] text-xs leading-5 text-neutral-400">
                        This move remains in the audit history even if the member later changes dojo again.
                      </p>

                    </div>

                  </div>

                </article>

              )
            )

          )}

        </section>


        {/* FOOTER */}

        <section className="mt-10 border-t border-neutral-800 pt-6">

          <p className="text-xs leading-5 text-neutral-600">
            Dojo migration history is restricted to Super Administrators and is intended to provide a permanent organisational audit trail.
          </p>

        </section>

      </div>

    </main>
  );
}

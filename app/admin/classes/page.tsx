"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";

type ClassRecord = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
};

type Profile = {
  is_super_admin: boolean;
};

export default function ClassManagementPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const router = useRouter();

  const [classes, setClasses] =
    useState<ClassRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    processingClassId,
    setProcessingClassId,
  ] = useState<string | null>(null);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    newClassName,
    setNewClassName,
  ] = useState("");

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<
    Record<string, File | null>
  >({});

  const [
    previews,
    setPreviews,
  ] = useState<
    Record<string, string | null>
  >({});

  const [
    editingClassId,
    setEditingClassId,
  ] = useState<string | null>(null);

  const [
    editNames,
    setEditNames,
  ] = useState<
    Record<string, string>
  >({});

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      /*
       * SUPER ADMIN CHECK
       */

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from("profiles")
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
        !profileData
      ) {
        router.replace(
          "/admin"
        );

        return;
      }

      const profile =
        profileData as Profile;

      if (
        profile.is_super_admin !==
        true
      ) {
        router.replace(
          "/admin"
        );

        return;
      }

      await loadClasses();

      setLoading(false);
    }

    loadPage();
  }, [
    router,
    supabase,
  ]);

  async function loadClasses() {
    const {
      data,
      error,
    } =
      await supabase
        .from("classes")
        .select(`
          id,
          name,
          logo_url,
          is_active
        `)
        .order("name");

    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      return;
    }

    setClasses(
      (data ??
        []) as ClassRecord[]
    );
  }

  async function createClass() {
    const cleanedName =
      newClassName.trim();

    if (!cleanedName) {
      setMessage(
        "Enter a class name."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setCreating(true);

    setMessage("");
    setMessageType("");

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "create_class",
          {
            new_class_name:
              cleanedName,
          }
        );

      if (error) {
        throw error;
      }

      setNewClassName("");

      await loadClasses();

      setMessage(
        `${cleanedName} was created successfully.`
      );

      setMessageType(
        "success"
      );
    } catch (
      error: unknown
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create class."
      );

      setMessageType(
        "error"
      );
    } finally {
      setCreating(false);
    }
  }

  function startRename(
    classRecord: ClassRecord
  ) {
    setEditingClassId(
      classRecord.id
    );

    setEditNames(
      (current) => ({
        ...current,

        [classRecord.id]:
          classRecord.name,
      })
    );
  }

  function cancelRename() {
    setEditingClassId(null);
  }

  async function saveRename(
    classRecord: ClassRecord
  ) {
    const newName =
      (
        editNames[
          classRecord.id
        ] ?? ""
      ).trim();

    if (!newName) {
      setMessage(
        "Class name cannot be empty."
      );

      setMessageType(
        "error"
      );

      return;
    }

    if (
      newName ===
      classRecord.name
    ) {
      setEditingClassId(null);

      return;
    }

    setProcessingClassId(
      classRecord.id
    );

    setMessage("");
    setMessageType("");

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "rename_class",
          {
            target_class_id:
              classRecord.id,

            new_class_name:
              newName,
          }
        );

      if (error) {
        throw error;
      }

      setEditingClassId(null);

      await loadClasses();

      setMessage(
        `${classRecord.name} was renamed to ${newName}.`
      );

      setMessageType(
        "success"
      );
    } catch (
      error: unknown
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to rename class."
      );

      setMessageType(
        "error"
      );
    } finally {
      setProcessingClassId(
        null
      );
    }
  }

  async function toggleClassStatus(
    classRecord: ClassRecord
  ) {
    const newStatus =
      !classRecord.is_active;

    if (!newStatus) {
      const confirmed =
        window.confirm(
          `Deactivate ${classRecord.name}?\n\nExisting members, promotion records and certificates will remain preserved.`
        );

      if (!confirmed) {
        return;
      }
    }

    setProcessingClassId(
      classRecord.id
    );

    setMessage("");
    setMessageType("");

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "set_class_active",
          {
            target_class_id:
              classRecord.id,

            new_is_active:
              newStatus,
          }
        );

      if (error) {
        throw error;
      }

      await loadClasses();

      setMessage(
        newStatus
          ? `${classRecord.name} is now active.`
          : `${classRecord.name} has been deactivated. Existing records remain preserved.`
      );

      setMessageType(
        "success"
      );
    } catch (
      error: unknown
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to change class status."
      );

      setMessageType(
        "error"
      );
    } finally {
      setProcessingClassId(
        null
      );
    }
  }

  function handleFileChange(
    classId: string,
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setMessage(
        "Please select a JPG, PNG or WebP image."
      );

      setMessageType(
        "error"
      );

      return;
    }

    const maxSize =
      5 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      setMessage(
        "Class logo must be smaller than 5 MB."
      );

      setMessageType(
        "error"
      );

      return;
    }

    const oldPreview =
      previews[
        classId
      ];

    if (oldPreview) {
      URL.revokeObjectURL(
        oldPreview
      );
    }

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setSelectedFiles(
      (current) => ({
        ...current,

        [classId]:
          file,
      })
    );

    setPreviews(
      (current) => ({
        ...current,

        [classId]:
          previewUrl,
      })
    );

    setMessage("");
    setMessageType("");
  }

  function cancelSelection(
    classId: string
  ) {
    const preview =
      previews[
        classId
      ];

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setSelectedFiles(
      (current) => ({
        ...current,

        [classId]:
          null,
      })
    );

    setPreviews(
      (current) => ({
        ...current,

        [classId]:
          null,
      })
    );
  }

  async function uploadLogo(
    classRecord: ClassRecord
  ) {
    const file =
      selectedFiles[
        classRecord.id
      ];

    if (!file) {
      setMessage(
        "Please choose a logo first."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setProcessingClassId(
      classRecord.id
    );

    setMessage("");
    setMessageType("");

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "png";

      const filePath =
        `${classRecord.id}/logo.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase
          .storage
          .from(
            "class-logos"
          )
          .upload(
            filePath,
            file,
            {
              upsert:
                true,

              contentType:
                file.type,

              cacheControl:
                "3600",
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase
          .storage
          .from(
            "class-logos"
          )
          .getPublicUrl(
            filePath
          );

      const logoUrl =
        `${publicUrlData.publicUrl}?v=${Date.now()}`;

      const {
        error:
          updateError,
      } =
        await supabase.rpc(
          "set_class_logo",
          {
            target_class_id:
              classRecord.id,

            new_logo_url:
              logoUrl,
          }
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      cancelSelection(
        classRecord.id
      );

      await loadClasses();

      setMessage(
        `${classRecord.name} logo updated successfully.`
      );

      setMessageType(
        "success"
      );
    } catch (
      error: unknown
    ) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to upload class logo."
      );

      setMessageType(
        "error"
      );
    } finally {
      setProcessingClassId(
        null
      );
    }
  }

  function exportClassesExcel() {
    if (classes.length === 0) {
      setMessage("There are no classes to export.");
      setMessageType("error");
      return;
    }

    exportToExcel({
      filename: "Jingwuguan-Seibukan-Classes",
      sheetName: "Classes",
      title: "Jingwuguan Seibukan Classes",
      columns: [
        { header: "Class Name", key: "name" },
        {
          header: "Status",
          key: "is_active",
          value: (row) => row.is_active ? "Active" : "Inactive",
        },
        {
          header: "Logo URL",
          key: "logo_url",
          value: (row) => row.logo_url ?? "",
        },
      ],
      data: classes,
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Checking Super Admin access...
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-6xl">

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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Super Administration
              </p>

              <h1 className="text-3xl font-bold">
                Class Management
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Create classes, manage logos and control class availability.
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


        {/* CREATE CLASS */}

        <section className="mt-8 rounded-2xl border border-sky-900 bg-sky-950/10 p-6">

          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-400">
            New Class
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Add a Class
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Add another discipline. The fixed rank and tier progression will be used automatically.
          </p>

          <div className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">

            <input
              type="text"
              value={
                newClassName
              }
              onChange={(e) =>
                setNewClassName(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                    "Enter" &&
                  !creating
                ) {
                  createClass();
                }
              }}
              placeholder="Example: Judo"
              maxLength={100}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-sky-600"
            />

            <button
              type="button"
              disabled={
                creating
              }
              onClick={
                createClass
              }
              className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create Class"}
            </button>

          </div>

        </section>


        {/* COUNTS */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-xl font-bold">
              Classes
            </h2>

            <p className="mt-1 text-sm text-neutral-500">

            {classes.filter(
              (
                item
              ) =>
                item.is_active
            ).length}{" "}

            active ·{" "}

            {
              classes.length
            }{" "}

            total

            </p>
          </div>

          <button
            type="button"
            disabled={classes.length === 0}
            onClick={exportClassesExcel}
            className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Excel
          </button>

        </div>


        {/* CLASSES */}

        <section className="mt-4 grid gap-5 md:grid-cols-2">

          {classes.map(
            (
              classRecord
            ) => {

              const preview =
                previews[
                  classRecord.id
                ];

              const selectedFile =
                selectedFiles[
                  classRecord.id
                ];

              const displayedLogo =
                preview ||
                classRecord.logo_url;

              const processing =
                processingClassId ===
                classRecord.id;

              const editing =
                editingClassId ===
                classRecord.id;

              return (
                <article
                  key={
                    classRecord.id
                  }
                  className={`rounded-2xl border p-6 ${
                    classRecord.is_active
                      ? "border-neutral-800 bg-neutral-900"
                      : "border-neutral-800 bg-neutral-900/50 opacity-75"
                  }`}
                >

                  <div className="flex items-start gap-5">

                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950">

                      {displayedLogo ? (

                        <img
                          src={
                            displayedLogo
                          }
                          alt={`${classRecord.name} logo`}
                          className="h-full w-full object-contain p-2"
                        />

                      ) : (

                        <div className="px-3 text-center text-xs text-neutral-600">
                          No Logo
                        </div>

                      )}

                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Class
                        </p>

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                            classRecord.is_active
                              ? "border-green-800 bg-green-950/30 text-green-300"
                              : "border-red-900 bg-red-950/30 text-red-300"
                          }`}
                        >
                          {classRecord.is_active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                      </div>


                      {!editing ? (

                        <h2 className="mt-2 break-words text-2xl font-bold">
                          {
                            classRecord.name
                          }
                        </h2>

                      ) : (

                        <div className="mt-3">

                          <input
                            type="text"
                            value={
                              editNames[
                                classRecord.id
                              ] ??
                              classRecord.name
                            }
                            onChange={(e) =>
                              setEditNames(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [classRecord.id]:
                                    e.target.value,
                                })
                              )
                            }
                            maxLength={
                              100
                            }
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                          />

                          <div className="mt-3 flex gap-2">

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                saveRename(
                                  classRecord
                                )
                              }
                              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold hover:bg-sky-500 disabled:opacity-50"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={
                                cancelRename
                              }
                              className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      )}

                      <p className="mt-2 text-sm text-neutral-400">
                        Used for member records, class identity and official certificates.
                      </p>

                    </div>

                  </div>


                  {/* CLASS ACTIONS */}

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-neutral-800 pt-5">

                    {!editing && (

                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          startRename(
                            classRecord
                          )
                        }
                        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                      >
                        Rename
                      </button>

                    )}

                    <button
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        toggleClassStatus(
                          classRecord
                        )
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                        classRecord.is_active
                          ? "border-red-900 text-red-400 hover:bg-red-950/30"
                          : "border-green-800 text-green-300 hover:bg-green-950/30"
                      }`}
                    >
                      {classRecord.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>

                  </div>


                  {/* LOGO */}

                  <div className="mt-5 border-t border-neutral-800 pt-5">

                    <p className="text-sm font-semibold">
                      Class Logo
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Used on certificates and official class records.
                    </p>

                    <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-950/30">

                      {classRecord.logo_url
                        ? "Choose New Logo"
                        : "Choose Logo"}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(
                          event
                        ) =>
                          handleFileChange(
                            classRecord.id,
                            event
                          )
                        }
                        className="hidden"
                      />

                    </label>

                    <p className="mt-3 text-xs text-neutral-500">
                      JPG, PNG or WebP · Maximum 5 MB
                    </p>

                    {selectedFile && (

                      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">

                        <p className="text-xs uppercase tracking-wider text-neutral-500">
                          Selected file
                        </p>

                        <p className="mt-1 break-all text-sm font-medium">
                          {
                            selectedFile.name
                          }
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              uploadLogo(
                                classRecord
                              )
                            }
                            className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                          >
                            {processing
                              ? "Uploading..."
                              : "Save Logo"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              cancelSelection(
                                classRecord.id
                              )
                            }
                            className="rounded-lg border border-neutral-700 px-5 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>

                        </div>

                      </div>

                    )}

                  </div>

                </article>
              );
            }
          )}

        </section>


        {classes.length ===
          0 && (

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

            <p className="text-neutral-400">
              No classes have been created yet.
            </p>

          </div>

        )}

      </div>

    </main>
  );
}
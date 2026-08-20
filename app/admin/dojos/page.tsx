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


type Profile = {
  id: string;
  full_name: string;
  is_super_admin: boolean;
};


type ClassRecord = {
  id: string;
  name: string;
};


type DojoRecord = {
  id: string;
  class_id: string;
  name: string;
  active: boolean;

  classes:
    | {
        name: string;
      }
    | null;
};


type AdminAssignment = {
  dojo_id: string;
  class_id: string;
  active: boolean;
};


type TransferMember = {
  membership_id: string;
  user_id: string;

  registration_number:
    | string
    | null;

  full_name: string;

  email: string | null;

  membership_status:
    | "active"
    | "break_1"
    | "break_2"
    | "inactive";

  class_id: string;
  class_name: string;

  dojo_id:
    | string
    | null;

  dojo_name:
    | string
    | null;
};


type MessageType =
  | "success"
  | "error"
  | "";


export default function DojoManagementPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  /*
   * =====================================================
   * ACCESS
   * =====================================================
   */

  const [
    profile,
    setProfile,
  ] =
    useState<
      Profile | null
    >(null);


  const [
    assignments,
    setAssignments,
  ] =
    useState<
      AdminAssignment[]
    >([]);


  const isSuperAdmin =
    profile
      ?.is_super_admin ===
    true;


  /*
   * =====================================================
   * DATA
   * =====================================================
   */

  const [
    classes,
    setClasses,
  ] =
    useState<
      ClassRecord[]
    >([]);


  const [
    dojos,
    setDojos,
  ] =
    useState<
      DojoRecord[]
    >([]);


  /*
   * =====================================================
   * GENERAL UI
   * =====================================================
   */

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
    useState<MessageType>(
      ""
    );


  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(null);


  /*
   * =====================================================
   * CREATE DOJO
   * =====================================================
   */

  const [
    newDojoName,
    setNewDojoName,
  ] =
    useState("");


  const [
    newDojoClassId,
    setNewDojoClassId,
  ] =
    useState("");


  const [
    creating,
    setCreating,
  ] =
    useState(false);


  /*
   * =====================================================
   * RENAME
   * =====================================================
   */

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    editNames,
    setEditNames,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  /*
   * =====================================================
   * DOJO FILTERS
   * =====================================================
   */

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
    useState("all");


  /*
   * =====================================================
   * TRANSFER / BULK MIGRATION
   * =====================================================
   */

  const [
    transferClassId,
    setTransferClassId,
  ] =
    useState("");


  const [
    transferFromDojoId,
    setTransferFromDojoId,
  ] =
    useState("");


  const [
    transferToDojoId,
    setTransferToDojoId,
  ] =
    useState("");


  const [
    transferDate,
    setTransferDate,
  ] =
    useState("");


  const [
    transferReason,
    setTransferReason,
  ] =
    useState("");


  const [
    transferMembers,
    setTransferMembers,
  ] =
    useState<
      TransferMember[]
    >([]);


  const [
    selectedMembershipIds,
    setSelectedMembershipIds,
  ] =
    useState<string[]>([]);


  const [
    loadingMembers,
    setLoadingMembers,
  ] =
    useState(false);


  const [
    submittingTransfer,
    setSubmittingTransfer,
  ] =
    useState(false);


  /*
   * =====================================================
   * MESSAGES
   * =====================================================
   */

  function success(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "success"
    );
  }


  function fail(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "error"
    );
  }


  function clearMessage() {
    setMessage("");
    setMessageType("");
  }


  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

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


      const currentProfile =
        profileData as Profile;


      /*
       * Load the user's explicit dojo
       * Admin assignments.
       */

      const {
        data:
          assignmentData,

        error:
          assignmentError,
      } =
        await supabase
          .from(
            "dojo_admin_assignments"
          )
          .select(`
            dojo_id,
            class_id,
            active
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "active",
            true
          );


      if (
        assignmentError &&
        currentProfile.is_super_admin !==
          true
      ) {
        console.error(
          assignmentError
        );
      }


      const loadedAssignments =
        (
          assignmentData ??
          []
        ) as AdminAssignment[];


      /*
       * Must be Super Admin or have
       * at least one active dojo assignment.
       */

      if (
        currentProfile.is_super_admin !==
          true &&
        loadedAssignments.length ===
          0
      ) {
        router.replace(
          "/admin"
        );

        return;
      }


      setProfile(
        currentProfile
      );


      setAssignments(
        loadedAssignments
      );


      await Promise.all([
        loadClasses(),
        loadDojos(),
      ]);


      /*
       * Default transfer date = today.
       */

      const now =
        new Date();


      const yyyy =
        now
          .getFullYear()
          .toString();


      const mm =
        String(
          now.getMonth() +
            1
        ).padStart(
          2,
          "0"
        );


      const dd =
        String(
          now.getDate()
        ).padStart(
          2,
          "0"
        );


      setTransferDate(
        `${yyyy}-${mm}-${dd}`
      );


      setLoading(
        false
      );
    }


    loadPage();
  }, [
    router,
    supabase,
  ]);


  /*
   * =====================================================
   * LOAD CLASSES
   * =====================================================
   */

  async function loadClasses() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "classes"
        )
        .select(`
          id,
          name
        `)
        .order(
          "name"
        );


    if (
      error
    ) {
      fail(
        error.message
      );

      return;
    }


    setClasses(
      (
        data ??
        []
      ) as ClassRecord[]
    );
  }


  /*
   * =====================================================
   * LOAD DOJOS
   * =====================================================
   */

  async function loadDojos() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "dojos"
        )
        .select(`
          id,
          class_id,
          name,
          active,

          classes (
            name
          )
        `)
        .order(
          "name"
        );


    if (
      error
    ) {
      fail(
        error.message
      );

      return;
    }


    setDojos(
      (
        data ??
        []
      ) as unknown as DojoRecord[]
    );
  }


  /*
   * =====================================================
   * ACCESS HELPERS
   * =====================================================
   */

  function canManageDojo(
    dojoId: string
  ) {
    if (
      isSuperAdmin
    ) {
      return true;
    }


    return assignments.some(
      (
        assignment
      ) =>
        assignment.dojo_id ===
          dojoId &&
        assignment.active
    );
  }


  /*
   * =====================================================
   * CREATE DOJO
   * SUPER ADMIN ONLY
   * =====================================================
   */

  async function createDojo() {
    if (
      !isSuperAdmin
    ) {
      fail(
        "Only Super Admin can create dojos."
      );

      return;
    }


    const cleanedName =
      newDojoName.trim();


    if (
      !newDojoClassId
    ) {
      fail(
        "Select a class."
      );

      return;
    }


    if (
      !cleanedName
    ) {
      fail(
        "Enter a dojo name."
      );

      return;
    }


    setCreating(
      true
    );

    clearMessage();


    try {
      const {
        error,
      } =
        await supabase
          .from(
            "dojos"
          )
          .insert({
            class_id:
              newDojoClassId,

            name:
              cleanedName,

            active:
              true,
          });


      if (
        error
      ) {
        throw error;
      }


      setNewDojoName(
        ""
      );


      await loadDojos();


      success(
        `${cleanedName} created successfully.`
      );
    } catch (
      error: unknown
    ) {
      fail(
        error instanceof Error
          ? error.message
          : "Failed to create dojo."
      );
    } finally {
      setCreating(
        false
      );
    }
  }


  /*
   * =====================================================
   * RENAME DOJO
   * SUPER ADMIN ONLY
   * =====================================================
   */

  function startRename(
    dojo:
      DojoRecord
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    setEditingId(
      dojo.id
    );


    setEditNames(
      (
        current
      ) => ({
        ...current,

        [dojo.id]:
          dojo.name,
      })
    );
  }


  function cancelRename() {
    setEditingId(
      null
    );
  }


  async function saveRename(
    dojo:
      DojoRecord
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const cleanedName =
      (
        editNames[
          dojo.id
        ] ??
        ""
      ).trim();


    if (
      !cleanedName
    ) {
      fail(
        "Dojo name cannot be empty."
      );

      return;
    }


    if (
      cleanedName ===
      dojo.name
    ) {
      setEditingId(
        null
      );

      return;
    }


    setProcessingId(
      dojo.id
    );

    clearMessage();


    try {
      const {
        error,
      } =
        await supabase
          .from(
            "dojos"
          )
          .update({
            name:
              cleanedName,
          })
          .eq(
            "id",
            dojo.id
          );


      if (
        error
      ) {
        throw error;
      }


      await loadDojos();


      setEditingId(
        null
      );


      success(
        `${dojo.name} renamed to ${cleanedName}.`
      );
    } catch (
      error: unknown
    ) {
      fail(
        error instanceof Error
          ? error.message
          : "Failed to rename dojo."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * ACTIVATE / DEACTIVATE
   * SUPER ADMIN ONLY
   * =====================================================
   */

  async function toggleStatus(
    dojo:
      DojoRecord
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const newStatus =
      !dojo.active;


    if (
      !newStatus
    ) {
      const confirmed =
        window.confirm(
          `Deactivate ${dojo.name}?\n\nExisting memberships and historical records will remain connected to the dojo.`
        );


      if (
        !confirmed
      ) {
        return;
      }
    }


    setProcessingId(
      dojo.id
    );

    clearMessage();


    try {
      const {
        error,
      } =
        await supabase
          .from(
            "dojos"
          )
          .update({
            active:
              newStatus,
          })
          .eq(
            "id",
            dojo.id
          );


      if (
        error
      ) {
        throw error;
      }


      await loadDojos();


      success(
        newStatus
          ? `${dojo.name} is active.`
          : `${dojo.name} has been deactivated.`
      );
    } catch (
      error: unknown
    ) {
      fail(
        error instanceof Error
          ? error.message
          : "Failed to change dojo status."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * TRANSFER SELECTION
   * =====================================================
   */

  function resetTransferMembers() {
    setTransferMembers(
      []
    );

    setSelectedMembershipIds(
      []
    );
  }


  function handleTransferClassChange(
    classId:
      string
  ) {
    setTransferClassId(
      classId
    );

    setTransferFromDojoId(
      ""
    );

    setTransferToDojoId(
      ""
    );

    resetTransferMembers();
  }


  async function handleFromDojoChange(
    dojoId:
      string
  ) {
    setTransferFromDojoId(
      dojoId
    );

    setTransferToDojoId(
      ""
    );

    resetTransferMembers();


    if (
      !dojoId
    ) {
      return;
    }


    await loadTransferMembers(
      dojoId
    );
  }


  /*
   * =====================================================
   * LOAD MEMBERS
   * =====================================================
   */

  async function loadTransferMembers(
    dojoId:
      string
  ) {
    setLoadingMembers(
      true
    );

    clearMessage();


    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "admin_visible_members"
          )
          .select("*")
          .eq(
            "dojo_id",
            dojoId
          )
          .order(
            "full_name"
          );


      if (
        error
      ) {
        throw error;
      }


      setTransferMembers(
        (
          data ??
          []
        ).map(
          (
            item: any
          ) => ({
            membership_id:
              item.membership_id,

            user_id:
              item.user_id,

            registration_number:
              item.registration_number ??
              null,

            full_name:
              item.full_name ??
              "Unknown Member",

            email:
              item.email ??
              null,

            membership_status:
              item.membership_status,

            class_id:
              item.class_id,

            class_name:
              item.class_name,

            dojo_id:
              item.dojo_id,

            dojo_name:
              item.dojo_name ??
              null,
          })
        )
      );
    } catch (
      error: unknown
    ) {
      fail(
        error instanceof Error
          ? error.message
          : "Failed to load members."
      );
    } finally {
      setLoadingMembers(
        false
      );
    }
  }


  /*
   * =====================================================
   * MEMBER SELECTION
   * =====================================================
   */

  function toggleMember(
    membershipId:
      string
  ) {
    setSelectedMembershipIds(
      (
        current
      ) =>
        current.includes(
          membershipId
        )
          ? current.filter(
              (
                id
              ) =>
                id !==
                membershipId
            )
          : [
              ...current,
              membershipId,
            ]
    );
  }


  function toggleAllMembers() {
    if (
      selectedMembershipIds.length ===
      transferMembers.length
    ) {
      setSelectedMembershipIds(
        []
      );

      return;
    }


    setSelectedMembershipIds(
      transferMembers.map(
        (
          member
        ) =>
          member.membership_id
      )
    );
  }


  /*
   * =====================================================
   * CREATE TRANSFER REQUEST
   *
   * IMPORTANT:
   * This no longer moves members immediately.
   *
   * It creates a request that must be approved
   * by Receiving Admin / Super Admin.
   * =====================================================
   */

  async function submitBulkTransfer() {
    if (
      !transferClassId
    ) {
      fail(
        "Select a class."
      );

      return;
    }


    if (
      !transferFromDojoId
    ) {
      fail(
        "Select the source dojo."
      );

      return;
    }


    if (
      !canManageDojo(
        transferFromDojoId
      )
    ) {
      fail(
        "You do not administer the source dojo."
      );

      return;
    }


    if (
      !transferToDojoId
    ) {
      fail(
        "Select the receiving dojo."
      );

      return;
    }


    if (
      transferFromDojoId ===
      transferToDojoId
    ) {
      fail(
        "Source and receiving dojo cannot be the same."
      );

      return;
    }


    if (
      !transferDate
    ) {
      fail(
        "Select an effective date."
      );

      return;
    }


    if (
      selectedMembershipIds.length ===
      0
    ) {
      fail(
        "Select at least one member."
      );

      return;
    }


    const source =
      dojos.find(
        (
          dojo
        ) =>
          dojo.id ===
          transferFromDojoId
      );


    const destination =
      dojos.find(
        (
          dojo
        ) =>
          dojo.id ===
          transferToDojoId
      );


    const confirmed =
      window.confirm(
        `Submit transfer request?\n\n${selectedMembershipIds.length} member${
          selectedMembershipIds.length ===
          1
            ? ""
            : "s"
        }\n\n${source?.name ?? "Source"} → ${
          destination?.name ??
          "Receiving dojo"
        }\n\nEffective date: ${transferDate}\n\nThe receiving dojo Administrator or Super Admin must approve this transfer.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setSubmittingTransfer(
      true
    );

    clearMessage();


    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "request_admin_dojo_transfer_batch",
          {
            target_membership_ids:
              selectedMembershipIds,

            destination_dojo_id:
              transferToDojoId,

            transfer_effective_date:
              transferDate,

            transfer_reason:
              transferReason.trim() ||
              null,
          }
        );


      if (
        error
      ) {
        throw error;
      }


      const memberCount =
        selectedMembershipIds.length;


      setSelectedMembershipIds(
        []
      );


      setTransferReason(
        ""
      );


      success(
        `${memberCount} member${
          memberCount ===
          1
            ? ""
            : "s"
        } submitted for transfer to ${
          destination?.name ??
          "the receiving dojo"
        }. Approval is now pending.${
          data
            ? ` Batch: ${data}`
            : ""
        }`
      );


      /*
       * Keep members visible because they
       * have not actually moved yet.
       */

      await loadTransferMembers(
        transferFromDojoId
      );
    } catch (
      error: unknown
    ) {
      fail(
        error instanceof Error
          ? error.message
          : "Failed to submit transfer request."
      );
    } finally {
      setSubmittingTransfer(
        false
      );
    }
  }


  /*
   * =====================================================
   * FILTERS / ACCESSIBLE DOJOS
   * =====================================================
   */

  const accessibleDojos =
    isSuperAdmin
      ? dojos
      : dojos.filter(
          (
            dojo
          ) =>
            canManageDojo(
              dojo.id
            )
        );


  const accessibleClassIds =
    Array.from(
      new Set(
        accessibleDojos.map(
          (
            dojo
          ) =>
            dojo.class_id
        )
      )
    );


  const transferClasses =
    classes.filter(
      (
        classRecord
      ) =>
        isSuperAdmin ||
        accessibleClassIds.includes(
          classRecord.id
        )
    );


  const transferSourceDojos =
    dojos.filter(
      (
        dojo
      ) =>
        dojo.class_id ===
          transferClassId &&
        canManageDojo(
          dojo.id
        )
    );


  /*
   * Destination can be another dojo in
   * the same class even if the source Admin
   * does not administer it.
   */

  const transferDestinationDojos =
    dojos.filter(
      (
        dojo
      ) =>
        dojo.class_id ===
          transferClassId &&
        dojo.active &&
        dojo.id !==
          transferFromDojoId
    );


  const filteredDojos =
    dojos.filter(
      (
        dojo
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const searchMatch =
          !query ||
          dojo.name
            .toLowerCase()
            .includes(
              query
            ) ||
          (
            dojo.classes
              ?.name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            );


        const classMatch =
          classFilter ===
            "all" ||
          dojo.class_id ===
            classFilter;


        const statusMatch =
          statusFilter ===
            "all" ||
          (
            statusFilter ===
              "active" &&
            dojo.active
          ) ||
          (
            statusFilter ===
              "inactive" &&
            !dojo.active
          );


        /*
         * Regular Admin only sees their own
         * managed dojos in Dojo Management.
         */

        const accessMatch =
          isSuperAdmin ||
          canManageDojo(
            dojo.id
          );


        return (
          searchMatch &&
          classMatch &&
          statusMatch &&
          accessMatch
        );
      }
    );


  function exportDojosExcel() {
    if (filteredDojos.length === 0) {
      fail("There are no dojos to export.");
      return;
    }

    exportToExcel({
      filename: isSuperAdmin
        ? "Organisation-Dojos"
        : "Managed-Dojos",
      sheetName: "Dojos",
      title: isSuperAdmin
        ? "Organisation Dojos"
        : "Your Managed Dojos",
      columns: [
        {
          header: "Dojo Name",
          key: "name",
        },
        {
          header: "Class",
          key: "class_name",
          value: (row) => row.classes?.name ?? "",
        },
        {
          header: "Status",
          key: "active",
          value: (row) => row.active ? "Active" : "Inactive",
        },
      ],
      data: filteredDojos,
    });
  }


  const allMembersSelected =
    transferMembers.length >
      0 &&
    selectedMembershipIds.length ===
      transferMembers.length;


  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading Dojo Management...
        </p>

      </main>
    );
  }


  /*
   * =====================================================
   * UI
   * =====================================================
   */

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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Administration
              </p>


              <h1 className="text-3xl font-bold">
                Dojo Management
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Manage dojos and submit individual or bulk member transfers.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/transfers"
                )
              }
              className="rounded-lg border border-purple-800 bg-purple-950/20 px-4 py-2 text-sm font-medium text-purple-300 transition hover:bg-purple-950/40"
            >
              Transfer Centre
            </button>


            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin"
                )
              }
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
            >
              ← Admin
            </button>

          </div>

        </header>


        {/* ACCESS */}

        <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">

          {isSuperAdmin ? (

            <div>

              <span className="rounded-full border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-300">
                SUPER ADMIN
              </span>


              <p className="mt-3 text-sm text-neutral-400">
                You can manage all dojos and submit transfers from any source dojo.
              </p>

            </div>

          ) : (

            <div>

              <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-300">
                DOJO ADMIN
              </span>


              <p className="mt-3 text-sm text-neutral-400">
                You can transfer members from the dojos assigned to you. The receiving dojo must approve the transfer.
              </p>

            </div>

          )}

        </section>


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


        {/* CREATE DOJO - SUPER ADMIN */}

        {isSuperAdmin && (

          <section className="mt-8 rounded-2xl border border-sky-900 bg-sky-950/10 p-6">

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-400">
              Organisation
            </p>


            <h2 className="mt-1 text-2xl font-bold">
              Create Dojo
            </h2>


            <div className="mt-5 grid gap-3 lg:grid-cols-[240px_1fr_auto]">

              <select
                value={
                  newDojoClassId
                }
                onChange={(e) =>
                  setNewDojoClassId(
                    e.target.value
                  )
                }
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              >

                <option value="">
                  Select Class
                </option>


                {classes.map(
                  (
                    classRecord
                  ) => (

                    <option
                      key={
                        classRecord.id
                      }
                      value={
                        classRecord.id
                      }
                    >
                      {
                        classRecord.name
                      }
                    </option>

                  )
                )}

              </select>


              <input
                value={
                  newDojoName
                }
                onChange={(e) =>
                  setNewDojoName(
                    e.target.value
                  )
                }
                placeholder="Dojo name"
                maxLength={
                  100
                }
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              />


              <button
                type="button"
                disabled={
                  creating
                }
                onClick={
                  createDojo
                }
                className="rounded-lg bg-sky-600 px-6 py-3 font-semibold hover:bg-sky-500 disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create"}
              </button>

            </div>

          </section>

        )}


        {/* =================================================
            TRANSFER CENTRE
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-purple-900 bg-purple-950/10 p-6">

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">
                Transfers
              </p>


              <h2 className="mt-1 text-2xl font-bold">
                Transfer Members
              </h2>


              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Select one member for an individual transfer or multiple members for a bulk transfer. This submits an approval request instead of moving the members immediately.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/transfers"
                )
              }
              className="self-start rounded-lg border border-purple-800 px-4 py-2 text-sm text-purple-300 hover:bg-purple-950/30"
            >
              Review Transfers →
            </button>

          </div>


          {/* ROUTE */}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">

            <div>

              <label className="mb-2 block text-sm font-medium">
                Category / Class
              </label>


              <select
                value={
                  transferClassId
                }
                onChange={(e) =>
                  handleTransferClassChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
              >

                <option value="">
                  Select Class
                </option>


                {transferClasses.map(
                  (
                    classRecord
                  ) => (

                    <option
                      key={
                        classRecord.id
                      }
                      value={
                        classRecord.id
                      }
                    >
                      {
                        classRecord.name
                      }
                    </option>

                  )
                )}

              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium">
                Source Dojo
              </label>


              <select
                value={
                  transferFromDojoId
                }
                disabled={
                  !transferClassId
                }
                onChange={(e) =>
                  handleFromDojoChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3 disabled:opacity-50"
              >

                <option value="">
                  Select Source Dojo
                </option>


                {transferSourceDojos.map(
                  (
                    dojo
                  ) => (

                    <option
                      key={
                        dojo.id
                      }
                      value={
                        dojo.id
                      }
                    >
                      {dojo.name}
                    </option>

                  )
                )}

              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium">
                Receiving Dojo
              </label>


              <select
                value={
                  transferToDojoId
                }
                disabled={
                  !transferFromDojoId
                }
                onChange={(e) =>
                  setTransferToDojoId(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3 disabled:opacity-50"
              >

                <option value="">
                  Select Receiving Dojo
                </option>


                {transferDestinationDojos.map(
                  (
                    dojo
                  ) => (

                    <option
                      key={
                        dojo.id
                      }
                      value={
                        dojo.id
                      }
                    >
                      {
                        dojo.name
                      }
                    </option>

                  )
                )}

              </select>

            </div>

          </div>


          {/* DATE + REASON */}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium">
                Effective Date
              </label>


              <input
                type="date"
                value={
                  transferDate
                }
                onChange={(e) =>
                  setTransferDate(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium">
                Reason
              </label>


              <input
                value={
                  transferReason
                }
                onChange={(e) =>
                  setTransferReason(
                    e.target.value
                  )
                }
                placeholder="Optional transfer reason"
                maxLength={
                  500
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
              />

            </div>

          </div>


          {/* MEMBERS */}

          {transferFromDojoId && (

            <div className="mt-6 border-t border-neutral-800 pt-5">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  <h3 className="font-semibold">
                    Select Members
                  </h3>


                  <p className="mt-1 text-sm text-neutral-500">
                    {
                      selectedMembershipIds.length
                    }{" "}
                    selected
                  </p>

                </div>


                {transferMembers.length >
                  0 && (

                  <button
                    type="button"
                    onClick={
                      toggleAllMembers
                    }
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
                  >
                    {allMembersSelected
                      ? "Clear Selection"
                      : "Select All"}
                  </button>

                )}

              </div>


              {loadingMembers ? (

                <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 text-neutral-500">
                  Loading members...
                </div>

              ) : transferMembers.length ===
                0 ? (

                <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 text-neutral-500">
                  No members found in this dojo.
                </div>

              ) : (

                <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto">

                  {transferMembers.map(
                    (
                      member
                    ) => {

                      const selected =
                        selectedMembershipIds.includes(
                          member.membership_id
                        );


                      return (
                        <label
                          key={
                            member.membership_id
                          }
                          className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                            selected
                              ? "border-purple-700 bg-purple-950/30"
                              : "border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800"
                          }`}
                        >

                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleMember(
                                member.membership_id
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />


                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-semibold">
                                {
                                  member.full_name
                                }
                              </p>


                              <span className="rounded-full border border-neutral-700 px-2 py-1 text-[10px] uppercase text-neutral-400">
                                {
                                  member.membership_status
                                }
                              </span>

                            </div>


                            <p className="mt-1 text-sm text-neutral-400">
                              Member ID:{" "}
                              {member.registration_number ??
                                "Not assigned"}
                            </p>


                            {member.email && (

                              <p className="mt-1 text-xs text-neutral-600">
                                {
                                  member.email
                                }
                              </p>

                            )}

                          </div>

                        </label>
                      );
                    }
                  )}

                </div>

              )}


              <div className="mt-5 flex flex-col justify-between gap-4 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center">

                <div>

                  <p className="font-semibold">
                    {
                      selectedMembershipIds.length
                    }{" "}
                    member{
                      selectedMembershipIds.length ===
                      1
                        ? ""
                        : "s"
                    }
                  </p>


                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedMembershipIds.length ===
                    1
                      ? "This will be submitted as a transfer batch containing one member."
                      : "The selected members will be submitted together as one transfer batch."}
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    submittingTransfer ||
                    !transferToDojoId ||
                    !transferDate ||
                    selectedMembershipIds.length ===
                      0
                  }
                  onClick={
                    submitBulkTransfer
                  }
                  className="rounded-lg bg-purple-600 px-6 py-3 font-semibold hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingTransfer
                    ? "Submitting..."
                    : `Submit Transfer (${selectedMembershipIds.length})`}
                </button>

              </div>

            </div>

          )}

        </section>


        {/* =================================================
            DOJO LIST
        ================================================= */}

        <section className="mt-8">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Dojos
              </p>


              <h2 className="mt-1 text-2xl font-bold">
                {isSuperAdmin
                  ? "Organisation Dojos"
                  : "Your Managed Dojos"}
              </h2>

            </div>


            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-sm text-neutral-500">
                {filteredDojos.length} dojo
                {filteredDojos.length ===
                1
                  ? ""
                  : "s"}
              </p>

              <button
                type="button"
                disabled={filteredDojos.length === 0}
                onClick={exportDojosExcel}
                className="rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export Excel
              </button>
            </div>

          </div>


          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">

            <div className="grid gap-3 md:grid-cols-3">

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
                placeholder="Search dojo or class"
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
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
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
              >

                <option value="all">
                  All Classes
                </option>


                {classes.map(
                  (
                    classRecord
                  ) => (

                    <option
                      key={
                        classRecord.id
                      }
                      value={
                        classRecord.id
                      }
                    >
                      {
                        classRecord.name
                      }
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
                    e.target.value
                  )
                }
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
              >

                <option value="all">
                  All Status
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

              </select>

            </div>

          </div>

        </section>


        {/* DOJO CARDS */}

        <section className="mt-5 grid gap-4 md:grid-cols-2">

          {filteredDojos.map(
            (
              dojo
            ) => {

              const editing =
                editingId ===
                dojo.id;


              const processing =
                processingId ===
                dojo.id;


              return (
                <article
                  key={
                    dojo.id
                  }
                  className={`rounded-2xl border p-6 ${
                    dojo.active
                      ? "border-neutral-800 bg-neutral-900"
                      : "border-neutral-800 bg-neutral-900/50 opacity-75"
                  }`}
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                        {dojo.classes
                          ?.name ??
                          "Class"}
                      </p>


                      {!editing ? (

                        <h3 className="mt-1 truncate text-xl font-bold">
                          {
                            dojo.name
                          }
                        </h3>

                      ) : (

                        <input
                          value={
                            editNames[
                              dojo.id
                            ] ??
                            ""
                          }
                          onChange={(e) =>
                            setEditNames(
                              (
                                current
                              ) => ({
                                ...current,

                                [dojo.id]:
                                  e.target.value,
                              })
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
                        />

                      )}

                    </div>


                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        dojo.active
                          ? "border-green-800 bg-green-950/30 text-green-300"
                          : "border-red-900 bg-red-950/30 text-red-400"
                      }`}
                    >
                      {dojo.active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>

                  </div>


                  {isSuperAdmin && (

                    <div className="mt-5 flex flex-wrap gap-2">

                      {!editing ? (

                        <button
                          type="button"
                          onClick={() =>
                            startRename(
                              dojo
                            )
                          }
                          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
                        >
                          Rename
                        </button>

                      ) : (

                        <>
                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              saveRename(
                                dojo
                              )
                            }
                            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50"
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
                            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </>

                      )}


                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          toggleStatus(
                            dojo
                          )
                        }
                        className={`rounded-lg border px-4 py-2 text-sm ${
                          dojo.active
                            ? "border-red-900 text-red-400 hover:bg-red-950/30"
                            : "border-green-800 text-green-300 hover:bg-green-950/30"
                        }`}
                      >
                        {processing
                          ? "Processing..."
                          : dojo.active
                          ? "Deactivate"
                          : "Reactivate"}
                      </button>

                    </div>

                  )}


                  {!isSuperAdmin && (

                    <div className="mt-5 rounded-lg border border-purple-900 bg-purple-950/20 p-3 text-sm text-purple-300">
                      You administer this dojo.
                    </div>

                  )}

                </article>
              );
            }
          )}

        </section>


        {filteredDojos.length ===
          0 && (

          <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

            <p className="text-neutral-400">
              No dojos match the current filters.
            </p>

          </div>

        )}


        {/* FOOTER */}

        <section className="mt-10 border-t border-neutral-800 pt-6">

          <p className="text-xs leading-5 text-neutral-600">
            Transfer requests do not change a member&apos;s dojo until approved and, for future-dated requests, until the effective date is reached.
          </p>

        </section>

      </div>

    </main>
  );
}
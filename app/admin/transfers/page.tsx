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
import {
  exportToExcel,
} from "@/lib/exportExcel";

type ExecutionState =
  | "pending"
  | "scheduled"
  | "due"
  | "failed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "unknown";


type MemberTransferRequest = {
  id: string;

  user_id: string;
  class_id: string;

  from_dojo_id: string;
  to_dojo_id: string;

  reason: string | null;

  status:
    | "pending"
    | "approved"
    | "rejected";

  created_at: string;

  profiles: {
    full_name: string;
    registration_number: string | null;
  } | null;

  from_dojo: {
    name: string;
  } | null;

  to_dojo: {
    name: string;
  } | null;
};


type AdminTransferRow = {
  request_id: string;

  batch_id: string | null;

  membership_id: string;

  member_id: string | null;
  member_name: string;

  class_id: string;
  class_name: string;

  from_dojo_id: string;
  from_dojo_name: string;

  to_dojo_id: string;
  to_dojo_name: string;

  request_type:
    | "manual_admin"
    | "bulk_admin";

  effective_date: string;

  reason: string | null;

  status: string;

  requested_by: string;

  requested_by_name:
    | string
    | null;

  requested_at: string;

  reviewed_by:
    | string
    | null;

  reviewed_by_name:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  cancelled_by:
    | string
    | null;

  cancelled_by_name:
    | string
    | null;

  cancelled_at:
    | string
    | null;

  applied_by:
    | string
    | null;

  applied_by_name:
    | string
    | null;

  applied_at:
    | string
    | null;

  apply_error:
    | string
    | null;

  apply_failed_at:
    | string
    | null;

  rejection_reason:
    | string
    | null;

  execution_state:
    ExecutionState;

  is_incoming: boolean;
  is_outgoing: boolean;
};


type AdminView =
  | "incoming"
  | "outgoing"
  | "scheduled"
  | "due"
  | "failed"
  | "completed"
  | "rejected"
  | "cancelled";


type MessageType =
  | "success"
  | "error"
  | "";


export default function DojoTransferPage() {
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
    isSuperAdmin,
    setIsSuperAdmin,
  ] =
    useState(false);


  /*
   * =====================================================
   * DATA
   * =====================================================
   */

  const [
    memberTransfers,
    setMemberTransfers,
  ] =
    useState<
      MemberTransferRequest[]
    >([]);


  const [
    adminTransfers,
    setAdminTransfers,
  ] =
    useState<
      AdminTransferRow[]
    >([]);


  /*
   * =====================================================
   * UI STATE
   * =====================================================
   */

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    processingBatchId,
    setProcessingBatchId,
  ] =
    useState<
      string | null
    >(null);


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    messageType,
    setMessageType,
  ] =
    useState<MessageType>("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    activeSection,
    setActiveSection,
  ] =
    useState<
      | "member"
      | "admin"
    >("admin");


  const [
    adminView,
    setAdminView,
  ] =
    useState<AdminView>(
      "incoming"
    );


  /*
   * =====================================================
   * MESSAGE HELPERS
   * =====================================================
   */

  const showSuccess = useCallback((
    text: string
  ) => {
    setMessage(
      text
    );

    setMessageType(
      "success"
    );
  }, []);


  const showError = useCallback((
    text: string
  ) => {
    setMessage(
      text
    );

    setMessageType(
      "error"
    );
  }, []);


  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageType("");
  }, []);


  const loadMemberTransfers = useCallback(async () => {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "dojo_transfer_requests"
        )
        .select(`
          id,
          user_id,
          class_id,
          from_dojo_id,
          to_dojo_id,
          reason,
          status,
          created_at,

          profiles:profiles!dojo_transfer_requests_user_id_fkey (
            full_name,
            registration_number
          ),

          from_dojo:dojos!dojo_transfer_requests_from_dojo_id_fkey (
            name
          ),

          to_dojo:dojos!dojo_transfer_requests_to_dojo_id_fkey (
            name
          )
        `)
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    setMemberTransfers(
      (
        data ??
        []
      ) as unknown as MemberTransferRequest[]
    );
  }, [showError, supabase]);


  const loadAdminTransfers = useCallback(async () => {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_admin_dojo_transfer_requests"
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    setAdminTransfers(
      (
        data ??
        []
      ) as AdminTransferRow[]
    );
  }, [showError, supabase]);


  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadMemberTransfers(),
      loadAdminTransfers(),
    ]);
  }, [
    loadAdminTransfers,
    loadMemberTransfers,
  ]);


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
          .select(
            "is_super_admin"
          )
          .eq(
            "id",
            user.id
          )
          .single();


      if (
        profileError
      ) {
        console.error(
          profileError
        );
      }


      setIsSuperAdmin(
        profileData
          ?.is_super_admin ===
          true
      );


      await reloadAll();


      setLoading(
        false
      );
    }


    loadPage();
  }, [
    reloadAll,
    router,
    supabase,
  ]);


  /*
   * =====================================================
   * LOAD MEMBER TRANSFERS
   * =====================================================
   */

  /*
   * =====================================================
   * MEMBER REQUEST REVIEW
   * =====================================================
   */

  async function reviewMemberTransfer(
    transfer:
      MemberTransferRequest,

    decision:
      | "approved"
      | "rejected"
  ) {
    let rejectionNote:
      string | null =
      null;


    if (
      decision ===
      "approved"
    ) {
      const confirmed =
        window.confirm(
          `Approve transfer for ${
            transfer.profiles?.full_name ??
            "this member"
          }?\n\n${
            transfer.from_dojo?.name ??
            "-"
          } → ${
            transfer.to_dojo?.name ??
            "-"
          }`
        );


      if (
        !confirmed
      ) {
        return;
      }
    } else {
      const reason =
        window.prompt(
          "Reason for rejecting this transfer:"
        );


      if (
        reason ===
        null
      ) {
        return;
      }


      if (
        !reason.trim()
      ) {
        showError(
          "A rejection reason is required."
        );

        return;
      }


      rejectionNote =
        reason.trim();
    }


    setProcessingId(
      transfer.id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_dojo_transfer",
        {
          request_id:
            transfer.id,

          decision,

          rejection_note:
            rejectionNote,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await reloadAll();


    showSuccess(
      decision ===
        "approved"
        ? "Member transfer approved."
        : "Member transfer rejected."
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * ADMIN INDIVIDUAL REVIEW
   * =====================================================
   */

  async function reviewAdminTransfer(
    transfer:
      AdminTransferRow,

    decision:
      | "approved"
      | "rejected"
  ) {
    let rejectionNote:
      string | null =
      null;


    if (
      decision ===
      "approved"
    ) {
      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );


      const effective =
        new Date(
          `${transfer.effective_date}T00:00:00`
        );


      const scheduled =
        effective >
        today;


      const confirmed =
        window.confirm(
          scheduled
            ? `Approve transfer for ${transfer.member_name}?\n\n${transfer.from_dojo_name} → ${transfer.to_dojo_name}\n\nEffective: ${formatDate(
                transfer.effective_date
              )}\n\nThe member will remain in the current dojo until the effective date.`
            : `Approve transfer for ${transfer.member_name}?\n\n${transfer.from_dojo_name} → ${transfer.to_dojo_name}\n\nEffective: ${formatDate(
                transfer.effective_date
              )}`
        );


      if (
        !confirmed
      ) {
        return;
      }
    } else {
      const reason =
        window.prompt(
          "Reason for rejecting this transfer:"
        );


      if (
        reason ===
        null
      ) {
        return;
      }


      if (
        !reason.trim()
      ) {
        showError(
          "A rejection reason is required."
        );

        return;
      }


      rejectionNote =
        reason.trim();
    }


    setProcessingId(
      transfer.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_admin_dojo_transfer",
        {
          target_request_id:
            transfer.request_id,

          decision,

          rejection_note:
            rejectionNote,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await reloadAll();


    showSuccess(
      decision ===
        "approved"
        ? "Transfer approved."
        : "Transfer rejected."
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * BULK REVIEW
   * =====================================================
   */

  async function reviewBatch(
    batchId: string,

    rows:
      AdminTransferRow[],

    decision:
      | "approved"
      | "rejected"
  ) {
    const first =
      rows[0];


    if (
      !first
    ) {
      return;
    }


    let rejectionNote:
      string | null =
      null;


    if (
      decision ===
      "approved"
    ) {
      const confirmed =
        window.confirm(
          `Approve this bulk transfer?\n\n${first.from_dojo_name} → ${first.to_dojo_name}\n\nMembers: ${rows.length}\nEffective: ${formatDate(
            first.effective_date
          )}`
        );


      if (
        !confirmed
      ) {
        return;
      }
    } else {
      const reason =
        window.prompt(
          "Reason for rejecting this entire batch:"
        );


      if (
        reason ===
        null
      ) {
        return;
      }


      if (
        !reason.trim()
      ) {
        showError(
          "A rejection reason is required."
        );

        return;
      }


      rejectionNote =
        reason.trim();
    }


    setProcessingBatchId(
      batchId
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "review_admin_dojo_transfer_batch",
        {
          target_batch_id:
            batchId,

          decision,

          rejection_note:
            rejectionNote,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingBatchId(
        null
      );

      return;
    }


    await reloadAll();


    const count =
      typeof data ===
      "number"
        ? data
        : rows.length;


    showSuccess(
      decision ===
        "approved"
        ? `${count} transfer${
            count === 1
              ? ""
              : "s"
          } approved.`
        : `${count} transfer${
            count === 1
              ? ""
              : "s"
          } rejected.`
    );


    setProcessingBatchId(
      null
    );
  }


  /*
   * =====================================================
   * CANCEL PENDING INDIVIDUAL
   * =====================================================
   */

  async function cancelAdminTransfer(
    transfer:
      AdminTransferRow
  ) {
    const confirmed =
      window.confirm(
        `Cancel the transfer request for ${transfer.member_name}?\n\n${transfer.from_dojo_name} → ${transfer.to_dojo_name}`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      transfer.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "cancel_admin_dojo_transfer",
        {
          target_request_id:
            transfer.request_id,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await reloadAll();


    showSuccess(
      "Transfer request cancelled."
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * CANCEL PENDING BATCH
   * =====================================================
   */

  async function cancelBatch(
    batchId: string,

    rows:
      AdminTransferRow[]
  ) {
    const confirmed =
      window.confirm(
        `Cancel this entire bulk transfer?\n\n${rows.length} member${
          rows.length === 1
            ? ""
            : "s"
        } are included.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingBatchId(
      batchId
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "cancel_admin_dojo_transfer_batch",
        {
          target_batch_id:
            batchId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingBatchId(
        null
      );

      return;
    }


    await reloadAll();


    const count =
      typeof data ===
      "number"
        ? data
        : rows.length;


    showSuccess(
      `${count} transfer${
        count === 1
          ? ""
          : "s"
      } cancelled.`
    );


    setProcessingBatchId(
      null
    );
  }


  /*
   * =====================================================
   * RETRY FAILED INDIVIDUAL
   * SUPER ADMIN
   * =====================================================
   */

  async function retryFailedTransfer(
    row:
      AdminTransferRow
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Retry failed transfer for ${row.member_name}?\n\n${row.from_dojo_name} → ${row.to_dojo_name}\n\nCurrent error:\n${
          row.apply_error ??
          "Unknown error"
        }`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      row.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "retry_failed_admin_dojo_transfer",
        {
          target_request_id:
            row.request_id,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await reloadAll();


    showSuccess(
      "Failed transfer was retried."
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * CANCEL FAILED INDIVIDUAL
   * SUPER ADMIN
   * =====================================================
   */

  async function cancelFailedTransfer(
    row:
      AdminTransferRow
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const reason =
      window.prompt(
        "Reason for cancelling this failed transfer:"
      );


    if (
      reason ===
      null
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Cancel the failed transfer for ${row.member_name}?\n\nThis transfer will not be applied.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      row.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "cancel_failed_admin_dojo_transfer",
        {
          target_request_id:
            row.request_id,

          cancellation_reason:
            reason.trim() ||
            null,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await reloadAll();


    showSuccess(
      "Failed transfer cancelled."
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * RETRY FAILED BULK
   * SUPER ADMIN
   * =====================================================
   */

  async function retryFailedBatch(
    batchId: string,

    failedRows:
      AdminTransferRow[]
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    if (
      failedRows.length ===
      0
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Retry ${failedRows.length} failed transfer${
          failedRows.length === 1
            ? ""
            : "s"
        } in this batch?\n\nAlready completed transfers will not be changed.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingBatchId(
      batchId
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "retry_failed_admin_dojo_transfer_batch",
        {
          target_batch_id:
            batchId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingBatchId(
        null
      );

      return;
    }


    await reloadAll();


    const count =
      typeof data ===
      "number"
        ? data
        : failedRows.length;


    showSuccess(
      `${count} failed transfer${
        count === 1
          ? ""
          : "s"
      } retried.`
    );


    setProcessingBatchId(
      null
    );
  }


  /*
   * =====================================================
   * CANCEL FAILED BULK
   * SUPER ADMIN
   * =====================================================
   */

  async function cancelFailedBatch(
    batchId: string,

    failedRows:
      AdminTransferRow[]
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    if (
      failedRows.length ===
      0
    ) {
      return;
    }


    const reason =
      window.prompt(
        `Reason for cancelling ${failedRows.length} failed transfer${
          failedRows.length === 1
            ? ""
            : "s"
        }:`
      );


    if (
      reason ===
      null
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Cancel ${failedRows.length} failed transfer${
          failedRows.length === 1
            ? ""
            : "s"
        } in this batch?\n\nCompleted transfers will remain completed.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingBatchId(
      batchId
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "cancel_failed_admin_dojo_transfer_batch",
        {
          target_batch_id:
            batchId,

          cancellation_reason:
            reason.trim() ||
            null,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessingBatchId(
        null
      );

      return;
    }


    await reloadAll();


    const count =
      typeof data ===
      "number"
        ? data
        : failedRows.length;


    showSuccess(
      `${count} failed transfer${
        count === 1
          ? ""
          : "s"
      } cancelled.`
    );


    setProcessingBatchId(
      null
    );
  }


  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();


  const filteredMemberRows =
    memberTransfers.filter(
      (
        row
      ) => {
        if (
          !normalizedSearch
        ) {
          return true;
        }


        return [
          row.profiles
            ?.full_name,

          row.profiles
            ?.registration_number,

          row.from_dojo
            ?.name,

          row.to_dojo
            ?.name,
        ]
          .filter(
            Boolean
          )
          .some(
            (
              value
            ) =>
              String(
                value
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
          );
      }
    );


  const filteredAdminRows =
    adminTransfers.filter(
      (
        row
      ) => {
        let viewMatch =
          false;


        if (
          adminView ===
          "incoming"
        ) {
          viewMatch =
            row.is_incoming &&
            row.execution_state ===
              "pending";
        } else if (
          adminView ===
          "outgoing"
        ) {
          viewMatch =
            row.is_outgoing;
        } else {
          viewMatch =
            row.execution_state ===
            adminView;
        }


        if (
          !viewMatch
        ) {
          return false;
        }


        if (
          !normalizedSearch
        ) {
          return true;
        }


        return [
          row.member_name,
          row.member_id,
          row.class_name,
          row.from_dojo_name,
          row.to_dojo_name,
          row.requested_by_name,
          row.reviewed_by_name,
          row.cancelled_by_name,
          row.applied_by_name,
          row.reason,
          row.apply_error,
          row.rejection_reason,
        ]
          .filter(
            Boolean
          )
          .some(
            (
              value
            ) =>
              String(
                value
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
          );
      }
    );
  /*
   * =====================================================
   * EXCEL EXPORT
   * =====================================================
   */

  function exportMemberTransfersExcel() {
    if (
      filteredMemberRows.length ===
      0
    ) {
      showError(
        "There are no member transfer requests to export."
      );

      return;
    }


    exportToExcel({
      filename:
        "Member-Dojo-Transfer-Requests",

      sheetName:
        "Member Transfers",

      title:
        "Member Dojo Transfer Requests",

      columns: [
        {
          header:
            "Member ID",

          key:
            "member_id",

          value:
            (row) =>
              row.profiles
                ?.registration_number ??
              "",
        },

        {
          header:
            "Member Name",

          key:
            "member_name",

          value:
            (row) =>
              row.profiles
                ?.full_name ??
              "",
        },

        {
          header:
            "From Dojo",

          key:
            "from_dojo",

          value:
            (row) =>
              row.from_dojo
                ?.name ??
              "",
        },

        {
          header:
            "To Dojo",

          key:
            "to_dojo",

          value:
            (row) =>
              row.to_dojo
                ?.name ??
              "",
        },

        {
          header:
            "Reason",

          key:
            "reason",
        },

        {
          header:
            "Status",

          key:
            "status",
        },

        {
          header:
            "Requested At",

          key:
            "created_at",

          value:
            (row) =>
              formatTimestamp(
                row.created_at
              ),
        },
      ],

      data:
        filteredMemberRows,
    });
  }


  function exportAdminTransfersExcel() {
    if (
      filteredAdminRows.length ===
      0
    ) {
      showError(
        "There are no admin transfers to export."
      );

      return;
    }


    const viewLabel =
      adminView
        .charAt(0)
        .toUpperCase() +
      adminView.slice(1);


    exportToExcel({
      filename:
        `Dojo-Transfers-${viewLabel}`,

      sheetName:
        `${viewLabel} Transfers`,

      title:
        `${viewLabel} Dojo Transfers`,

      columns: [
        {
          header:
            "Member ID",

          key:
            "member_id",
        },

        {
          header:
            "Member Name",

          key:
            "member_name",
        },

        {
          header:
            "Class",

          key:
            "class_name",
        },

        {
          header:
            "From Dojo",

          key:
            "from_dojo_name",
        },

        {
          header:
            "To Dojo",

          key:
            "to_dojo_name",
        },

        {
          header:
            "Transfer Type",

          key:
            "request_type",

          value:
            (row) =>
              row.request_type ===
              "bulk_admin"
                ? "Bulk Admin"
                : "Individual Admin",
        },

        {
          header:
            "Batch ID",

          key:
            "batch_id",
        },

        {
          header:
            "Status",

          key:
            "execution_state",

          value:
            (row) =>
              row.execution_state
                .replace(
                  /_/g,
                  " "
                )
                .toUpperCase(),
        },

        {
          header:
            "Effective Date",

          key:
            "effective_date",

          value:
            (row) =>
              formatDate(
                row.effective_date
              ),
        },

        {
          header:
            "Reason",

          key:
            "reason",
        },

        {
          header:
            "Requested By",

          key:
            "requested_by_name",
        },

        {
          header:
            "Requested At",

          key:
            "requested_at",

          value:
            (row) =>
              formatTimestamp(
                row.requested_at
              ),
        },

        {
          header:
            "Reviewed By",

          key:
            "reviewed_by_name",
        },

        {
          header:
            "Reviewed At",

          key:
            "reviewed_at",

          value:
            (row) =>
              row.reviewed_at
                ? formatTimestamp(
                    row.reviewed_at
                  )
                : "",
        },

        {
          header:
            "Applied By",

          key:
            "applied_by_name",
        },

        {
          header:
            "Applied At",

          key:
            "applied_at",

          value:
            (row) =>
              row.applied_at
                ? formatTimestamp(
                    row.applied_at
                  )
                : "",
        },

        {
          header:
            "Cancelled By",

          key:
            "cancelled_by_name",
        },

        {
          header:
            "Cancelled At",

          key:
            "cancelled_at",

          value:
            (row) =>
              row.cancelled_at
                ? formatTimestamp(
                    row.cancelled_at
                  )
                : "",
        },

        {
          header:
            "Rejection Reason",

          key:
            "rejection_reason",
        },

        {
          header:
            "Apply Error",

          key:
            "apply_error",
        },

        {
          header:
            "Failed At",

          key:
            "apply_failed_at",

          value:
            (row) =>
              row.apply_failed_at
                ? formatTimestamp(
                    row.apply_failed_at
                  )
                : "",
        },
      ],

      data:
        filteredAdminRows,
    });
  }

  /*
   * =====================================================
   * INDIVIDUAL ADMIN ROWS
   * =====================================================
   */

  const individualAdminRows =
    filteredAdminRows.filter(
      (
        row
      ) =>
        row.request_type ===
        "manual_admin"
    );


  /*
   * =====================================================
   * BULK GROUPS
   * =====================================================
   */

  const bulkGroups =
    (() => {
        const map =
          new Map<
            string,
            AdminTransferRow[]
          >();


        filteredAdminRows
          .filter(
            (
              row
            ) =>
              row.request_type ===
                "bulk_admin" &&
              row.batch_id
          )
          .forEach(
            (
              row
            ) => {
              const id =
                row.batch_id as string;


              const current =
                map.get(
                  id
                ) ??
                [];


              current.push(
                row
              );


              map.set(
                id,
                current
              );
            }
          );


        return map;
      })();


  /*
   * =====================================================
   * COUNTS
   * =====================================================
   */

  const countByState =
    (
      state:
        ExecutionState
    ) =>
      adminTransfers.filter(
        (
          row
        ) =>
          row.execution_state ===
          state
      ).length;


  const incomingCount =
    adminTransfers.filter(
      (
        row
      ) =>
        row.is_incoming &&
        row.execution_state ===
          "pending"
    ).length;


  const outgoingCount =
    adminTransfers.filter(
      (
        row
      ) =>
        row.is_outgoing
    ).length;


  /*
   * =====================================================
   * FORMATTERS
   * =====================================================
   */

  function formatDate(
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return "-";
    }


    const parsed =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
        ? `${value}T00:00:00`
        : value;


    return new Date(
      parsed
    ).toLocaleDateString(
      "en-AU",
      {
        day:
          "numeric",
        month:
          "short",
        year:
          "numeric",
      }
    );
  }


  function formatTimestamp(
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return "-";
    }


    return new Date(
      value
    ).toLocaleString(
      "en-AU",
      {
        day:
          "numeric",
        month:
          "short",
        year:
          "numeric",
        hour:
          "2-digit",
        minute:
          "2-digit",
      }
    );
  }


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
          Loading transfers...
        </p>

      </main>
    );
  }


  /*
   * =====================================================
   * PAGE
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
                Dojo Transfers
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Review, schedule, monitor and recover member transfers between dojos.
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
              className="rounded-lg border border-sky-800 px-4 py-2 text-sm text-sky-300 transition hover:bg-sky-950/30"
            >
              Dojo Management
            </button>


            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dojo-migrations"
                )
              }
              className="rounded-lg border border-purple-800 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-950/30"
            >
              Migration History
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


        {/* SECTION SELECTOR */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">

          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "member"
              )
            }
            className={`rounded-2xl border p-5 text-left transition ${
              activeSection ===
              "member"
                ? "border-sky-700 bg-sky-950/30"
                : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
            }`}
          >

            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Member Requests
            </p>


            <p className="mt-2 text-3xl font-bold">
              {
                memberTransfers.length
              }
            </p>


            <p className="mt-1 text-sm text-neutral-500">
              Pending member-requested transfers
            </p>

          </button>


          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "admin"
              )
            }
            className={`rounded-2xl border p-5 text-left transition ${
              activeSection ===
              "admin"
                ? "border-purple-700 bg-purple-950/30"
                : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
            }`}
          >

            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Admin Transfers
            </p>


            <p className="mt-2 text-3xl font-bold">
              {
                adminTransfers.length
              }
            </p>


            <p className="mt-1 text-sm text-neutral-500">
              Pending, scheduled, failed and completed transfers
            </p>

          </button>

        </section>


        {/* SEARCH */}

                {/* SEARCH + EXPORT */}

        <section className="mt-5 flex flex-col gap-3 sm:flex-row">

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
            placeholder="Search member, Member ID, dojo, class or administrator"
            className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-sky-600"
          />


          <button
            type="button"
            disabled={
              activeSection ===
              "member"
                ? filteredMemberRows.length ===
                  0
                : filteredAdminRows.length ===
                  0
            }
            onClick={
              activeSection ===
              "member"
                ? exportMemberTransfersExcel
                : exportAdminTransfersExcel
            }
            className="rounded-xl border border-green-800 bg-green-950/10 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Excel
          </button>

        </section>


        {/* =================================================
            MEMBER TRANSFERS
        ================================================= */}

        {activeSection ===
          "member" && (

          <section className="mt-6 space-y-4">

            {filteredMemberRows.length ===
            0 ? (

              <EmptyState
                title="No Pending Member Transfers"
                text="Incoming member-requested transfers will appear here."
              />

            ) : (

              filteredMemberRows.map(
                (
                  transfer
                ) => {

                  const processing =
                    processingId ===
                    transfer.id;


                  return (
                    <article
                      key={
                        transfer.id
                      }
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                    >

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <h2 className="text-xl font-bold">
                            {transfer
                              .profiles
                              ?.full_name ??
                              "Unknown Member"}
                          </h2>


                          <p className="mt-1 text-sm text-neutral-400">
                            Member ID:{" "}
                            {transfer
                              .profiles
                              ?.registration_number ??
                              "Not assigned"}
                          </p>

                        </div>


                        <span className="rounded-full border border-sky-800 bg-sky-950/30 px-3 py-1 text-xs font-semibold text-sky-300">
                          MEMBER REQUEST
                        </span>

                      </div>


                      <TransferRoute
                        from={
                          transfer
                            .from_dojo
                            ?.name ??
                          "-"
                        }
                        to={
                          transfer
                            .to_dojo
                            ?.name ??
                          "-"
                        }
                      />


                      {transfer.reason && (

                        <ReasonBox
                          reason={
                            transfer.reason
                          }
                        />

                      )}


                      <p className="mt-4 text-sm text-neutral-500">
                        Requested{" "}
                        {formatTimestamp(
                          transfer.created_at
                        )}
                      </p>


                      <div className="mt-5 flex flex-wrap gap-3">

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            reviewMemberTransfer(
                              transfer,
                              "approved"
                            )
                          }
                          className="rounded-lg bg-green-600 px-5 py-2 font-semibold transition hover:bg-green-500 disabled:opacity-50"
                        >
                          {processing
                            ? "Processing..."
                            : "Approve"}
                        </button>


                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            reviewMemberTransfer(
                              transfer,
                              "rejected"
                            )
                          }
                          className="rounded-lg bg-red-600 px-5 py-2 font-semibold transition hover:bg-red-500 disabled:opacity-50"
                        >
                          Reject
                        </button>

                      </div>

                    </article>
                  );
                }
              )

            )}

          </section>

        )}


        {/* =================================================
            ADMIN TRANSFERS
        ================================================= */}

        {activeSection ===
          "admin" && (

          <>

            {/* FILTERS */}

            <section className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">

              <ViewButton
                label="Incoming"
                count={
                  incomingCount
                }
                active={
                  adminView ===
                  "incoming"
                }
                onClick={() =>
                  setAdminView(
                    "incoming"
                  )
                }
              />


              <ViewButton
                label="Outgoing"
                count={
                  outgoingCount
                }
                active={
                  adminView ===
                  "outgoing"
                }
                onClick={() =>
                  setAdminView(
                    "outgoing"
                  )
                }
              />


              <ViewButton
                label="Scheduled"
                count={
                  countByState(
                    "scheduled"
                  )
                }
                active={
                  adminView ===
                  "scheduled"
                }
                onClick={() =>
                  setAdminView(
                    "scheduled"
                  )
                }
              />


              <ViewButton
                label="Due"
                count={
                  countByState(
                    "due"
                  )
                }
                active={
                  adminView ===
                  "due"
                }
                onClick={() =>
                  setAdminView(
                    "due"
                  )
                }
              />


              <ViewButton
                label="Failed"
                count={
                  countByState(
                    "failed"
                  )
                }
                active={
                  adminView ===
                  "failed"
                }
                onClick={() =>
                  setAdminView(
                    "failed"
                  )
                }
              />


              <ViewButton
                label="Completed"
                count={
                  countByState(
                    "completed"
                  )
                }
                active={
                  adminView ===
                  "completed"
                }
                onClick={() =>
                  setAdminView(
                    "completed"
                  )
                }
              />


              <ViewButton
                label="Rejected"
                count={
                  countByState(
                    "rejected"
                  )
                }
                active={
                  adminView ===
                  "rejected"
                }
                onClick={() =>
                  setAdminView(
                    "rejected"
                  )
                }
              />


              <ViewButton
                label="Cancelled"
                count={
                  countByState(
                    "cancelled"
                  )
                }
                active={
                  adminView ===
                  "cancelled"
                }
                onClick={() =>
                  setAdminView(
                    "cancelled"
                  )
                }
              />

            </section>


            {/* RESULTS */}

            <section className="mt-5 space-y-5">


              {/* INDIVIDUAL */}

              {individualAdminRows.map(
                (
                  row
                ) => {

                  const processing =
                    processingId ===
                    row.request_id;


                  return (
                    <TransferCard
                      key={
                        row.request_id
                      }
                      row={
                        row
                      }
                      processing={
                        processing
                      }
                      isSuperAdmin={
                        isSuperAdmin
                      }
                      onApprove={() =>
                        reviewAdminTransfer(
                          row,
                          "approved"
                        )
                      }
                      onReject={() =>
                        reviewAdminTransfer(
                          row,
                          "rejected"
                        )
                      }
                      onCancel={() =>
                        cancelAdminTransfer(
                          row
                        )
                      }
                      onRetry={() =>
                        retryFailedTransfer(
                          row
                        )
                      }
                      onCancelFailed={() =>
                        cancelFailedTransfer(
                          row
                        )
                      }
                      formatDate={
                        formatDate
                      }
                      formatTimestamp={
                        formatTimestamp
                      }
                    />
                  );
                }
              )}


              {/* BULK */}

              {Array.from(
                bulkGroups.entries()
              ).map(
                (
                  [
                    batchId,
                    rows,
                  ]
                ) => {

                  const first =
                    rows[0];


                  if (
                    !first
                  ) {
                    return null;
                  }


                  const processing =
                    processingBatchId ===
                    batchId;


                  const failedRows =
                    rows.filter(
                      (
                        row
                      ) =>
                        row.execution_state ===
                        "failed"
                    );


                  const completedRows =
                    rows.filter(
                      (
                        row
                      ) =>
                        row.execution_state ===
                        "completed"
                    );


                  const scheduledRows =
                    rows.filter(
                      (
                        row
                      ) =>
                        row.execution_state ===
                        "scheduled"
                    );


                  const dueRows =
                    rows.filter(
                      (
                        row
                      ) =>
                        row.execution_state ===
                        "due"
                    );


                  const pendingRows =
                    rows.filter(
                      (
                        row
                      ) =>
                        row.execution_state ===
                        "pending"
                    );


                  const currentBatchState =
                    batchExecutionState(
                      rows
                    );


                  return (
                    <article
                      key={
                        batchId
                      }
                      className="rounded-2xl border border-purple-900 bg-purple-950/10 p-6"
                    >

                      {/* HEADER */}

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h2 className="text-xl font-bold">
                              Bulk Transfer
                            </h2>


                            <span className="rounded-full border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-semibold text-purple-300">
                              {
                                rows.length
                              }{" "}
                              MEMBER{
                                rows.length ===
                                1
                                  ? ""
                                  : "S"
                              }
                            </span>

                          </div>


                          <p className="mt-2 text-sm text-neutral-400">
                            {
                              first.class_name
                            }
                          </p>

                        </div>


                        <ExecutionBadge
                          state={
                            currentBatchState
                          }
                        />

                      </div>


                      {/* ROUTE */}

                      <TransferRoute
                        from={
                          first.from_dojo_name
                        }
                        to={
                          first.to_dojo_name
                        }
                      />


                      {/* DETAILS */}

                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">

                        <Detail
                          label="Requested By"
                          value={
                            first.requested_by_name ??
                            "-"
                          }
                        />


                        <Detail
                          label="Requested"
                          value={
                            formatTimestamp(
                              first.requested_at
                            )
                          }
                        />


                        <Detail
                          label="Effective"
                          value={
                            formatDate(
                              first.effective_date
                            )
                          }
                        />


                        {first.reviewed_by_name && (

                          <Detail
                            label="Reviewed By"
                            value={
                              first.reviewed_by_name
                            }
                          />

                        )}


                        {first.reviewed_at && (

                          <Detail
                            label="Reviewed"
                            value={
                              formatTimestamp(
                                first.reviewed_at
                              )
                            }
                          />

                        )}


                        {first.cancelled_by_name && (

                          <Detail
                            label="Cancelled By"
                            value={
                              first.cancelled_by_name
                            }
                          />

                        )}


                        {first.cancelled_at && (

                          <Detail
                            label="Cancelled"
                            value={
                              formatTimestamp(
                                first.cancelled_at
                              )
                            }
                          />

                        )}

                      </div>


                      {/* REASON */}

                      {first.reason && (

                        <ReasonBox
                          reason={
                            first.reason
                          }
                        />

                      )}


                      {/* REJECTION */}

                      {first.rejection_reason && (

                        <ErrorBox
                          title="Rejection Reason"
                          text={
                            first.rejection_reason
                          }
                        />

                      )}


                      {/* SUMMARY */}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <SummaryBox
                          label="Pending"
                          value={
                            pendingRows.length
                          }
                        />


                        <SummaryBox
                          label="Scheduled"
                          value={
                            scheduledRows.length
                          }
                        />


                        <SummaryBox
                          label="Completed"
                          value={
                            completedRows.length
                          }
                        />


                        <SummaryBox
                          label="Failed"
                          value={
                            failedRows.length
                          }
                        />

                      </div>


                      {/* STATES */}

                      {scheduledRows.length >
                        0 && (

                        <InfoBox
                          text={`${scheduledRows.length} member${
                            scheduledRows.length ===
                            1
                              ? ""
                              : "s"
                          } approved and scheduled for ${formatDate(
                            first.effective_date
                          )}.`}
                        />

                      )}


                      {dueRows.length >
                        0 && (

                        <WarningBox
                          text={`${dueRows.length} member${
                            dueRows.length ===
                            1
                              ? ""
                              : "s"
                          } reached the effective date and are waiting for the scheduled executor.`}
                        />

                      )}


                      {failedRows.length >
                        0 && (

                        <ErrorBox
                          title="Action Required"
                          text={`${failedRows.length} member${
                            failedRows.length ===
                            1
                              ? ""
                              : "s"
                          } could not be transferred automatically.`}
                        />

                      )}


                      {completedRows.length >
                        0 && (

                        <SuccessBox
                          text={`${completedRows.length} member${
                            completedRows.length ===
                            1
                              ? ""
                              : "s"
                          } completed successfully.`}
                        />

                      )}


                      {/* BULK FAILED RECOVERY */}

                      {isSuperAdmin &&
                        failedRows.length >
                          0 && (

                        <div className="mt-4 rounded-xl border border-orange-900 bg-orange-950/10 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                            Super Admin Recovery
                          </p>


                          <p className="mt-2 text-sm text-neutral-400">
                            Retry or cancel only the failed members in this batch. Completed members are not affected.
                          </p>


                          <div className="mt-4 flex flex-wrap gap-3">

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                retryFailedBatch(
                                  batchId,
                                  failedRows
                                )
                              }
                              className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
                            >
                              {processing
                                ? "Processing..."
                                : `Retry ${failedRows.length} Failed`}
                            </button>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                cancelFailedBatch(
                                  batchId,
                                  failedRows
                                )
                              }
                              className="rounded-lg border border-red-800 px-5 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                            >
                              {`Cancel ${failedRows.length} Failed`}
                            </button>

                          </div>

                        </div>

                      )}


                      {/* MEMBERS */}

                      <div className="mt-5 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">

                        <div className="border-b border-neutral-800 px-4 py-3">

                          <p className="text-sm font-semibold">
                            Members in Batch
                          </p>

                        </div>


                        <div className="max-h-96 divide-y divide-neutral-800 overflow-y-auto">

                          {rows.map(
                            (
                              row
                            ) => {

                              const rowProcessing =
                                processingId ===
                                row.request_id;


                              return (
                                <div
                                  key={
                                    row.request_id
                                  }
                                  className="px-4 py-4"
                                >

                                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                                    <div>

                                      <p className="font-medium">
                                        {
                                          row.member_name
                                        }
                                      </p>


                                      <p className="mt-1 text-xs text-neutral-500">
                                        {row.member_id ??
                                          "No Member ID"}
                                      </p>

                                    </div>


                                    <ExecutionBadge
                                      state={
                                        row.execution_state
                                      }
                                      compact
                                    />

                                  </div>


                                  {/* FAILURE DETAIL */}

                                  {row.apply_error && (

                                    <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/20 p-3">

                                      <p className="text-xs text-red-300">
                                        {
                                          row.apply_error
                                        }
                                      </p>


                                      {row.apply_failed_at && (

                                        <p className="mt-1 text-[11px] text-red-400/60">
                                          Last attempt:{" "}
                                          {formatTimestamp(
                                            row.apply_failed_at
                                          )}
                                        </p>

                                      )}


                                      {isSuperAdmin &&
                                        row.execution_state ===
                                          "failed" && (

                                        <div className="mt-3 flex flex-wrap gap-2">

                                          <button
                                            type="button"
                                            disabled={
                                              rowProcessing ||
                                              processing
                                            }
                                            onClick={() =>
                                              retryFailedTransfer(
                                                row
                                              )
                                            }
                                            className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
                                          >
                                            {rowProcessing
                                              ? "Processing..."
                                              : "Retry This Member"}
                                          </button>


                                          <button
                                            type="button"
                                            disabled={
                                              rowProcessing ||
                                              processing
                                            }
                                            onClick={() =>
                                              cancelFailedTransfer(
                                                row
                                              )
                                            }
                                            className="rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                                          >
                                            Cancel This Transfer
                                          </button>

                                        </div>

                                      )}

                                    </div>

                                  )}

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>


                      {/* PENDING BATCH ACTIONS */}

                      {rows.every(
                        (
                          row
                        ) =>
                          row.execution_state ===
                          "pending"
                      ) && (

                        <div className="mt-5 flex flex-wrap gap-3">

                          {first.is_incoming && (

                            <>
                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  reviewBatch(
                                    batchId,
                                    rows,
                                    "approved"
                                  )
                                }
                                className="rounded-lg bg-green-600 px-5 py-2 font-semibold transition hover:bg-green-500 disabled:opacity-50"
                              >
                                {processing
                                  ? "Processing..."
                                  : `Approve Entire Batch (${rows.length})`}
                              </button>


                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  reviewBatch(
                                    batchId,
                                    rows,
                                    "rejected"
                                  )
                                }
                                className="rounded-lg bg-red-600 px-5 py-2 font-semibold transition hover:bg-red-500 disabled:opacity-50"
                              >
                                Reject Entire Batch
                              </button>
                            </>

                          )}


                          {first.is_outgoing && (

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                cancelBatch(
                                  batchId,
                                  rows
                                )
                              }
                              className="rounded-lg border border-neutral-600 px-5 py-2 font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
                            >
                              Cancel Entire Batch
                            </button>

                          )}

                        </div>

                      )}

                    </article>
                  );
                }
              )}


              {/* EMPTY */}

              {individualAdminRows.length ===
                0 &&
                bulkGroups.size ===
                  0 && (

                <EmptyState
                  title="No Transfer Requests"
                  text="No transfers match the selected view."
                />

              )}

            </section>

          </>

        )}

      </div>

    </main>
  );
}


/*
 * =========================================================
 * BATCH EXECUTION STATE
 * =========================================================
 */

function batchExecutionState(
  rows:
    AdminTransferRow[]
): ExecutionState {
  if (
    rows.some(
      (
        row
      ) =>
        row.execution_state ===
        "failed"
    )
  ) {
    return "failed";
  }


  if (
    rows.some(
      (
        row
      ) =>
        row.execution_state ===
        "due"
    )
  ) {
    return "due";
  }


  if (
    rows.some(
      (
        row
      ) =>
        row.execution_state ===
        "scheduled"
    )
  ) {
    return "scheduled";
  }


  if (
    rows.every(
      (
        row
      ) =>
        row.execution_state ===
        "completed"
    )
  ) {
    return "completed";
  }


  if (
    rows.every(
      (
        row
      ) =>
        row.execution_state ===
        "rejected"
    )
  ) {
    return "rejected";
  }


  if (
    rows.every(
      (
        row
      ) =>
        row.execution_state ===
        "cancelled"
    )
  ) {
    return "cancelled";
  }


  if (
    rows.every(
      (
        row
      ) =>
        row.execution_state ===
        "pending"
    )
  ) {
    return "pending";
  }


  return "unknown";
}


/*
 * =========================================================
 * INDIVIDUAL TRANSFER CARD
 * =========================================================
 */

function TransferCard({
  row,
  processing,
  isSuperAdmin,
  onApprove,
  onReject,
  onCancel,
  onRetry,
  onCancelFailed,
  formatDate,
  formatTimestamp,
}: {
  row:
    AdminTransferRow;

  processing:
    boolean;

  isSuperAdmin:
    boolean;

  onApprove:
    () => void;

  onReject:
    () => void;

  onCancel:
    () => void;

  onRetry:
    () => void;

  onCancelFailed:
    () => void;

  formatDate:
    (
      value:
        string | null
    ) => string;

  formatTimestamp:
    (
      value:
        string | null
    ) => string;
}) {
  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">


      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="text-xl font-bold">
              {
                row.member_name
              }
            </h2>


            <span className="rounded-full border border-amber-800 bg-amber-950/30 px-2 py-1 text-[10px] font-semibold text-amber-300">
              ADMIN INDIVIDUAL
            </span>

          </div>


          <p className="mt-1 text-sm text-neutral-400">
            Member ID:{" "}
            {row.member_id ??
              "Not assigned"}
          </p>


          <p className="mt-1 text-xs text-neutral-500">
            {
              row.class_name
            }
          </p>

        </div>


        <ExecutionBadge
          state={
            row.execution_state
          }
        />

      </div>


      {/* ROUTE */}

      <TransferRoute
        from={
          row.from_dojo_name
        }
        to={
          row.to_dojo_name
        }
      />


      {/* DETAILS */}

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">

        <Detail
          label="Requested By"
          value={
            row.requested_by_name ??
            "-"
          }
        />


        <Detail
          label="Requested"
          value={
            formatTimestamp(
              row.requested_at
            )
          }
        />


        <Detail
          label="Effective"
          value={
            formatDate(
              row.effective_date
            )
          }
        />


        {row.reviewed_by_name && (

          <Detail
            label="Reviewed By"
            value={
              row.reviewed_by_name
            }
          />

        )}


        {row.reviewed_at && (

          <Detail
            label="Reviewed"
            value={
              formatTimestamp(
                row.reviewed_at
              )
            }
          />

        )}


        {row.applied_at && (

          <Detail
            label="Applied"
            value={
              formatTimestamp(
                row.applied_at
              )
            }
          />

        )}


        {row.applied_by_name && (

          <Detail
            label="Applied By"
            value={
              row.applied_by_name
            }
          />

        )}


        {row.cancelled_by_name && (

          <Detail
            label="Cancelled By"
            value={
              row.cancelled_by_name
            }
          />

        )}


        {row.cancelled_at && (

          <Detail
            label="Cancelled"
            value={
              formatTimestamp(
                row.cancelled_at
              )
            }
          />

        )}

      </div>


      {/* REASON */}

      {row.reason && (

        <ReasonBox
          reason={
            row.reason
          }
        />

      )}


      {/* REJECTION */}

      {row.rejection_reason &&
        row.execution_state ===
          "rejected" && (

        <ErrorBox
          title="Rejection Reason"
          text={
            row.rejection_reason
          }
        />

      )}


      {/* SCHEDULED */}

      {row.execution_state ===
        "scheduled" && (

        <InfoBox
          text={`Approved. ${row.member_name} remains in ${row.from_dojo_name} until ${formatDate(
            row.effective_date
          )}.`}
        />

      )}


      {/* DUE */}

      {row.execution_state ===
        "due" && (

        <WarningBox
          text="The effective date has arrived, but this transfer has not been applied yet. The scheduled executor still needs to run."
        />

      )}


      {/* FAILED */}

      {row.execution_state ===
        "failed" && (

        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/20 p-4">

          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Transfer Could Not Be Applied
          </p>


          <p className="mt-2 text-sm text-red-200">
            {row.apply_error ??
              "Unknown scheduled transfer error."}
          </p>


          {row.apply_failed_at && (

            <p className="mt-2 text-xs text-red-400/70">
              Last attempt:{" "}
              {formatTimestamp(
                row.apply_failed_at
              )}
            </p>

          )}


          {isSuperAdmin && (

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  onRetry
                }
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {processing
                  ? "Processing..."
                  : "Retry Transfer"}
              </button>


              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  onCancelFailed
                }
                className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
              >
                Cancel Failed Transfer
              </button>

            </div>

          )}

        </div>

      )}


      {/* COMPLETED */}

      {row.execution_state ===
        "completed" && (

        <SuccessBox
          text={`Transfer completed. ${row.member_name} now belongs to ${row.to_dojo_name}.`}
        />

      )}


      {/* CANCELLED */}

      {row.execution_state ===
        "cancelled" && (

        <NeutralBox
          text="This transfer request was cancelled and will not be applied."
        />

      )}


      {/* PENDING ACTIONS */}

      {row.execution_state ===
        "pending" && (

        <div className="mt-5 flex flex-wrap gap-3">

          {row.is_incoming && (

            <>
              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  onApprove
                }
                className="rounded-lg bg-green-600 px-5 py-2 font-semibold transition hover:bg-green-500 disabled:opacity-50"
              >
                {processing
                  ? "Processing..."
                  : "Approve"}
              </button>


              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  onReject
                }
                className="rounded-lg bg-red-600 px-5 py-2 font-semibold transition hover:bg-red-500 disabled:opacity-50"
              >
                Reject
              </button>
            </>

          )}


          {row.is_outgoing && (

            <button
              type="button"
              disabled={
                processing
              }
              onClick={
                onCancel
              }
              className="rounded-lg border border-neutral-600 px-5 py-2 font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancel Request
            </button>

          )}

        </div>

      )}

    </article>
  );
}


/*
 * =========================================================
 * VIEW BUTTON
 * =========================================================
 */

function ViewButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-sm transition ${
        active
          ? "border-purple-700 bg-purple-950/30 text-purple-300"
          : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
      }`}
    >

      <span>
        {label}
      </span>


      <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs">
        {count}
      </span>

    </button>
  );
}


/*
 * =========================================================
 * EXECUTION BADGE
 * =========================================================
 */

function ExecutionBadge({
  state,
  compact = false,
}: {
  state:
    ExecutionState;

  compact?:
    boolean;
}) {
  const styles =
    state ===
    "completed"
      ? "border-green-800 bg-green-950/30 text-green-300"

      : state ===
        "scheduled"
      ? "border-sky-800 bg-sky-950/30 text-sky-300"

      : state ===
        "due"
      ? "border-orange-800 bg-orange-950/30 text-orange-300"

      : state ===
        "failed"
      ? "border-red-700 bg-red-950/40 text-red-300"

      : state ===
        "rejected"
      ? "border-red-900 bg-red-950/20 text-red-400"

      : state ===
        "cancelled"
      ? "border-neutral-700 bg-neutral-900 text-neutral-400"

      : state ===
        "pending"
      ? "border-yellow-800 bg-yellow-950/30 text-yellow-300"

      : "border-neutral-700 bg-neutral-900 text-neutral-400";


  const label =
    state ===
    "completed"
      ? "COMPLETED"

      : state ===
        "scheduled"
      ? "APPROVED · SCHEDULED"

      : state ===
        "due"
      ? "APPROVED · DUE"

      : state ===
        "failed"
      ? "ACTION REQUIRED"

      : state ===
        "rejected"
      ? "REJECTED"

      : state ===
        "cancelled"
      ? "CANCELLED"

      : state ===
        "pending"
      ? "PENDING APPROVAL"

      : "UNKNOWN";


  return (
    <span
      className={`rounded-full border font-semibold ${styles} ${
        compact
          ? "px-2 py-1 text-[10px]"
          : "px-3 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}


/*
 * =========================================================
 * ROUTE
 * =========================================================
 */

function TransferRoute({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          From
        </p>


        <p className="mt-2 font-semibold">
          {from}
        </p>

      </div>


      <div className="text-center text-xl text-sky-400">
        →
      </div>


      <div className="rounded-xl border border-sky-900 bg-sky-950/20 p-4">

        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
          Receiving Dojo
        </p>


        <p className="mt-2 font-semibold">
          {to}
        </p>

      </div>

    </div>
  );
}


/*
 * =========================================================
 * DETAIL
 * =========================================================
 */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>

      <span className="text-neutral-500">
        {label}:
      </span>{" "}

      {value}

    </p>
  );
}


/*
 * =========================================================
 * SUMMARY BOX
 * =========================================================
 */

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>


      <p className="mt-1 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * REASON
 * =========================================================
 */

function ReasonBox({
  reason,
}: {
  reason: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">

      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Reason
      </p>


      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
        {reason}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * INFO
 * =========================================================
 */

function InfoBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/20 p-4">

      <p className="text-sm text-sky-200">
        {text}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * WARNING
 * =========================================================
 */

function WarningBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-orange-900 bg-orange-950/20 p-4">

      <p className="text-sm text-orange-200">
        {text}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * ERROR
 * =========================================================
 */

function ErrorBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-red-900 bg-red-950/20 p-4">

      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
        {title}
      </p>


      <p className="mt-2 whitespace-pre-wrap text-sm text-red-200">
        {text}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * SUCCESS
 * =========================================================
 */

function SuccessBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-green-900 bg-green-950/20 p-4">

      <p className="text-sm text-green-200">
        {text}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * NEUTRAL
 * =========================================================
 */

function NeutralBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-950/50 p-4">

      <p className="text-sm text-neutral-400">
        {text}
      </p>

    </div>
  );
}


/*
 * =========================================================
 * EMPTY
 * =========================================================
 */

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

      <h2 className="text-xl font-semibold">
        {title}
      </h2>


      <p className="mt-2 text-neutral-400">
        {text}
      </p>

    </div>
  );
}

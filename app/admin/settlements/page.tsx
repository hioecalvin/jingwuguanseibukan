"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  formatDate,
  formatDateTime,
} from "@/lib/format-date";

import {
  exportToExcel,
} from "@/lib/exportExcel";

type Profile = {
  id: string;
  full_name: string;
  is_super_admin: boolean;
};


type AdminAssignment = {
  dojo_id: string;
  class_id: string;
  active: boolean;
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


type SettlementConfig = {
  dojo_id: string;
  dojo_name: string;

  class_id: string;
  class_name: string;

  requires_share: boolean;

  share_percent: number;
};


type MySettlementConfig = {
  requires_share: boolean;
  share_percent: number;
};


type EligiblePayment = {
  payment_id: string;

  membership_id: string;

  member_name: string;

  member_id:
    | string
    | null;

  payment_date: string;

  payment_amount: number;

  currency: string;

  payment_method:
    | string
    | null;

  payment_reference:
    | string
    | null;

  suggested_share: number;
};


type AdminSettlement = {
  settlement_id: string;

  dojo_id: string;
  dojo_name: string;

  class_id: string;
  class_name: string;

  settlement_month: string;

  share_percent: number;

  gross_amount: number;

  share_amount: number;

  currency: string;

  status:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "cancelled";

  notes:
    | string
    | null;

  created_by_name:
    | string
    | null;

  created_at: string;

  submitted_by_name:
    | string
    | null;

  submitted_at:
    | string
    | null;

  reviewed_by_name:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  rejection_reason:
    | string
    | null;

  approved_at:
    | string
    | null;

  item_count: number;
};


type SuperSettlement = {
  settlement_id: string;

  dojo_id: string;
  dojo_name: string;

  class_id: string;
  class_name: string;

  settlement_month: string;

  share_percent: number;

  gross_amount: number;

  share_amount: number;

  currency: string;

  status:
    | "submitted"
    | "approved"
    | "rejected";

  notes:
    | string
    | null;

  submitted_by_name:
    | string
    | null;

  submitted_at:
    | string
    | null;

  reviewed_by_name:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  rejection_reason:
    | string
    | null;

  approved_at:
    | string
    | null;

  item_count: number;
};


type SettlementItem = {
  item_id: string;

  payment_id: string;

  membership_id: string;

  member_name: string;

  member_id:
    | string
    | null;

  payment_date: string;

  payment_amount: number;

  payment_method:
    | string
    | null;

  payment_reference:
    | string
    | null;

  share_percent: number;

  share_amount: number;

  currency: string;
};


type MessageType =
  | "success"
  | "error"
  | "";


type Tab =
  | "admin"
  | "super"
  | "config";


export default function SettlementsPage() {
  const supabase =
    useMemo(
      () => createClient(),
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
    assignments,
    setAssignments,
  ] =
    useState<
      AdminAssignment[]
    >([]);


  const [
    dojos,
    setDojos,
  ] =
    useState<
      DojoRecord[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>(
      "admin"
    );


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
    processing,
    setProcessing,
  ] =
    useState<
      string | null
    >(null);


  const [
    selectedDojoId,
    setSelectedDojoId,
  ] =
    useState("");


  const [
    settlementMonth,
    setSettlementMonth,
  ] =
    useState("");


  const [
    myConfig,
    setMyConfig,
  ] =
    useState<
      MySettlementConfig | null
    >(null);


  const [
    eligiblePayments,
    setEligiblePayments,
  ] =
    useState<
      EligiblePayment[]
    >([]);


  const [
    selectedPaymentIds,
    setSelectedPaymentIds,
  ] =
    useState<string[]>([]);


  const [
    settlementNotes,
    setSettlementNotes,
  ] =
    useState("");


  const [
    adminSettlements,
    setAdminSettlements,
  ] =
    useState<
      AdminSettlement[]
    >([]);


  const [
    superSettlements,
    setSuperSettlements,
  ] =
    useState<
      SuperSettlement[]
    >([]);


  const [
    settlementItems,
    setSettlementItems,
  ] =
    useState<
      Record<
        string,
        SettlementItem[]
      >
    >({});


  const [
    expandedSettlementId,
    setExpandedSettlementId,
  ] =
    useState<
      string | null
    >(null);


  const [
    configs,
    setConfigs,
  ] =
    useState<
      SettlementConfig[]
    >([]);


  const [
    configEnabledDraft,
    setConfigEnabledDraft,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  const [
    configPercentDraft,
    setConfigPercentDraft,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const isSuperAdmin =
    profile
      ?.is_super_admin ===
    true;


  function showSuccess(
    text: string
  ) {
    setMessage(
      text
    );

    setMessageType(
      "success"
    );
  }


  function showError(
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


  function currentMonthString() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}`;
  }


  function formatCurrency(
    amount: number,
    currency = "IDR"
  ) {
    try {
      return new Intl.NumberFormat(
        "id-ID",
        {
          style:
            "currency",

          currency,

          maximumFractionDigits:
            currency ===
            "IDR"
              ? 0
              : 2,
        }
      ).format(
        Number(
          amount
        )
      );
    } catch {
      return `${currency} ${Number(
        amount
      ).toLocaleString()}`;
    }
  }


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


      const loadedProfile =
        profileData as Profile;


      setProfile(
        loadedProfile
      );


      const {
        data:
          assignmentData,
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


      const loadedAssignments =
        (
          assignmentData ??
          []
        ) as AdminAssignment[];


      setAssignments(
        loadedAssignments
      );


      const assignedIds =
        loadedAssignments.map(
          (
            item
          ) =>
            item.dojo_id
        );


      if (
        assignedIds.length >
          0
      ) {
        const {
          data:
            dojoData,

          error:
            dojoError,
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
            .in(
              "id",
              assignedIds
            )
            .order(
              "name"
            );


        if (
          dojoError
        ) {
          showError(
            dojoError.message
          );
        } else {
          const loadedDojos =
            (
              dojoData ??
              []
            ) as unknown as DojoRecord[];


          setDojos(
            loadedDojos
          );


          if (
            loadedDojos.length >
              0
          ) {
            setSelectedDojoId(
              loadedDojos[0].id
            );
          }
        }
      }


      setSettlementMonth(
        currentMonthString()
      );


      if (
        loadedProfile.is_super_admin
      ) {
        await Promise.all([
          loadSuperSettlements(),
          loadConfigs(),
        ]);
      }


      if (
        loadedAssignments.length >
          0
      ) {
        await loadAdminSettlements();
      }


      if (
        loadedProfile.is_super_admin &&
        loadedAssignments.length ===
          0
      ) {
        setActiveTab(
          "super"
        );
      }


      setLoading(
        false
      );
    }


    loadPage();
  }, [
    router,
    supabase,
  ]);


  useEffect(() => {
    if (
      !selectedDojoId ||
      !settlementMonth
    ) {
      return;
    }


    async function loadDojoSettlementData() {
      await Promise.all([
        loadMyConfig(),
        loadEligiblePayments(),
        loadAdminSettlements(),
      ]);
    }


    loadDojoSettlementData();
  }, [
    selectedDojoId,
    settlementMonth,
  ]);


  async function loadMyConfig() {
    if (
      !selectedDojoId
    ) {
      return;
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_my_dojo_settlement_config",
        {
          target_dojo_id:
            selectedDojoId,
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


    const row =
      Array.isArray(
        data
      )
        ? data[0]
        : null;


    if (
      row
    ) {
      setMyConfig({
        requires_share:
          Boolean(
            row.requires_share
          ),

        share_percent:
          Number(
            row.share_percent
          ),
      });
    } else {
      setMyConfig(
        null
      );
    }
  }


  async function loadEligiblePayments() {
    if (
      !selectedDojoId ||
      !settlementMonth
    ) {
      return;
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_settlement_eligible_payments",
        {
          target_dojo_id:
            selectedDojoId,

          target_month:
            `${settlementMonth}-01`,
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


    setEligiblePayments(
      (
        data ??
        []
      ) as EligiblePayment[]
    );


    setSelectedPaymentIds(
      []
    );
  }


  async function loadAdminSettlements() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_admin_settlements",
        {
          target_dojo_id:
            selectedDojoId ||
            null,
        }
      );


    if (
      error
    ) {
      if (
        assignments.length >
        0
      ) {
        showError(
          error.message
        );
      }

      return;
    }


    setAdminSettlements(
      (
        data ??
        []
      ) as AdminSettlement[]
    );
  }


  async function loadSuperSettlements() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_super_admin_settlements"
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    setSuperSettlements(
      (
        data ??
        []
      ) as SuperSettlement[]
    );
  }


  async function loadConfigs() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_settlement_configs"
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    const loaded =
      (
        data ??
        []
      ) as SettlementConfig[];


    setConfigs(
      loaded
    );


    setConfigEnabledDraft(
      Object.fromEntries(
        loaded.map(
          (
            item
          ) => [
            item.dojo_id,
            item.requires_share,
          ]
        )
      )
    );


    setConfigPercentDraft(
      Object.fromEntries(
        loaded.map(
          (
            item
          ) => [
            item.dojo_id,
            String(
              item.share_percent
            ),
          ]
        )
      )
    );
  }


  function togglePayment(
    paymentId: string
  ) {
    setSelectedPaymentIds(
      (
        current
      ) =>
        current.includes(
          paymentId
        )
          ? current.filter(
              (
                id
              ) =>
                id !==
                paymentId
            )
          : [
              ...current,
              paymentId,
            ]
    );
  }


  function toggleAllPayments() {
    if (
      selectedPaymentIds.length ===
      eligiblePayments.length
    ) {
      setSelectedPaymentIds(
        []
      );

      return;
    }


    setSelectedPaymentIds(
      eligiblePayments.map(
        (
          item
        ) =>
          item.payment_id
      )
    );
  }


  const selectedPayments =
    eligiblePayments.filter(
      (
        item
      ) =>
        selectedPaymentIds.includes(
          item.payment_id
        )
    );


  const selectedGross =
    selectedPayments.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.payment_amount
        ),
      0
    );


  const selectedShare =
    selectedPayments.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.suggested_share
        ),
      0
    );


  const selectedAdminRetained =
    selectedGross -
    selectedShare;


  async function createSettlement() {
    if (
      !selectedDojoId ||
      !settlementMonth
    ) {
      return;
    }


    if (
      selectedPaymentIds.length ===
      0
    ) {
      showError(
        "Select at least one payment."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Create settlement draft?\n\nPayments: ${selectedPaymentIds.length}\nTotal collected: ${formatCurrency(
          selectedGross
        )}\nSuper Admin share: ${formatCurrency(
          selectedShare
        )}\nAdmin retained: ${formatCurrency(
          selectedAdminRetained
        )}`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      "create"
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "create_dojo_settlement",
        {
          target_dojo_id:
            selectedDojoId,

          target_month:
            `${settlementMonth}-01`,

          payment_ids:
            selectedPaymentIds,

          settlement_notes:
            settlementNotes.trim() ||
            null,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    setSettlementNotes(
      ""
    );


    setSelectedPaymentIds(
      []
    );


    await Promise.all([
      loadEligiblePayments(),
      loadAdminSettlements(),
    ]);


    showSuccess(
      `Settlement draft created${
        data
          ? ` (${data})`
          : ""
      }.`
    );


    setProcessing(
      null
    );
  }


  async function submitSettlement(
    settlementId:
      string
  ) {
    const confirmed =
      window.confirm(
        "Send this share to Super Admin for review?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      `submit:${settlementId}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "submit_dojo_settlement",
        {
          target_settlement_id:
            settlementId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    await Promise.all([
      loadAdminSettlements(),

      isSuperAdmin
        ? loadSuperSettlements()
        : Promise.resolve(),
    ]);


    showSuccess(
      "Share sent to Super Admin for review."
    );


    setProcessing(
      null
    );
  }


  async function cancelSettlement(
    settlementId:
      string
  ) {
    const confirmed =
      window.confirm(
        "Cancel this settlement?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      `cancel:${settlementId}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "cancel_dojo_settlement",
        {
          target_settlement_id:
            settlementId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    await Promise.all([
      loadAdminSettlements(),
      loadEligiblePayments(),
    ]);


    showSuccess(
      "Settlement cancelled."
    );


    setProcessing(
      null
    );
  }


  async function reviewSettlement(
    settlement:
      SuperSettlement,

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
          `Approve settlement from ${settlement.dojo_name}?\n\nShare amount: ${formatCurrency(
            Number(
              settlement.share_amount
            ),
            settlement.currency
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
          "Reason for rejection:"
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


    setProcessing(
      `review:${settlement.settlement_id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_dojo_settlement",
        {
          target_settlement_id:
            settlement.settlement_id,

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

      setProcessing(
        null
      );

      return;
    }


    await Promise.all([
      loadSuperSettlements(),

      assignments.length >
        0
        ? loadAdminSettlements()
        : Promise.resolve(),
    ]);


    showSuccess(
      decision ===
        "approved"
        ? "Settlement approved."
        : "Settlement rejected."
    );


    setProcessing(
      null
    );
  }


  async function toggleSettlementDetail(
    settlementId:
      string
  ) {
    if (
      expandedSettlementId ===
      settlementId
    ) {
      setExpandedSettlementId(
        null
      );

      return;
    }


    setExpandedSettlementId(
      settlementId
    );


    if (
      settlementItems[
        settlementId
      ]
    ) {
      return;
    }


    setProcessing(
      `detail:${settlementId}`
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_settlement_items",
        {
          target_settlement_id:
            settlementId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    setSettlementItems(
      (
        current
      ) => ({
        ...current,

        [settlementId]:
          (
            data ??
            []
          ) as SettlementItem[],
      })
    );


    setProcessing(
      null
    );
  }


  async function saveConfig(
    config:
      SettlementConfig
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const enabled =
      configEnabledDraft[
        config.dojo_id
      ];


    const percentage =
      enabled
        ? Number(
            configPercentDraft[
              config.dojo_id
            ]
          )
        : 0;


    if (
      enabled &&
      (
        Number.isNaN(
          percentage
        ) ||
        percentage <=
          0 ||
        percentage >
          100
      )
    ) {
      showError(
        "Share percentage must be greater than 0 and no more than 100."
      );

      return;
    }


    setProcessing(
      `config:${config.dojo_id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "update_dojo_settlement_config",
        {
          target_dojo_id:
            config.dojo_id,

          requires_share:
            enabled,

          share_percent:
            enabled
              ? percentage
              : 0,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      setProcessing(
        null
      );

      return;
    }


    await loadConfigs();


    if (
      config.dojo_id ===
        selectedDojoId &&
      assignments.some(
        (
          item
        ) =>
          item.dojo_id ===
          selectedDojoId
      )
    ) {
      await Promise.all([
        loadMyConfig(),
        loadEligiblePayments(),
      ]);
    }


    showSuccess(
      enabled
        ? `${config.dojo_name} settlement requirement updated to ${percentage}%.`
        : `${config.dojo_name} no longer requires Super Admin settlement.`
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * EXCEL EXPORT
   * =====================================================
   */

  function exportAdminSettlementsExcel() {
    if (adminSettlements.length === 0) {
      showError("There are no settlements to export.");
      return;
    }

    const dojoName =
      dojos.find((dojo) => dojo.id === selectedDojoId)?.name ?? "Dojo";

    exportToExcel({
      filename: `${dojoName}-Settlement-History`,
      sheetName: "Settlements",
      title: `${dojoName} Settlement History`,
      columns: [
        { header: "Settlement ID", key: "settlement_id" },
        { header: "Dojo", key: "dojo_name" },
        { header: "Class", key: "class_name" },
        { header: "Settlement Month", key: "settlement_month" },
        { header: "Share %", key: "share_percent" },
        { header: "Total Collected", key: "gross_amount" },
        { header: "Super Admin Share", key: "share_amount" },
        { header: "Admin Retained", key: "admin_retained", value: (row) => Number(row.gross_amount) - Number(row.share_amount) },
        { header: "Currency", key: "currency" },
        { header: "Status", key: "status", value: (row) => row.status.toUpperCase() },
        { header: "Included Payments", key: "item_count" },
        { header: "Notes", key: "notes" },
        { header: "Created By", key: "created_by_name" },
        { header: "Created At", key: "created_at", value: (row) => formatDateTime(row.created_at) },
        { header: "Submitted By", key: "submitted_by_name" },
        { header: "Submitted At", key: "submitted_at", value: (row) => row.submitted_at ? formatDateTime(row.submitted_at) : "" },
        { header: "Reviewed By", key: "reviewed_by_name" },
        { header: "Reviewed At", key: "reviewed_at", value: (row) => row.reviewed_at ? formatDateTime(row.reviewed_at) : "" },
        { header: "Approved At", key: "approved_at", value: (row) => row.approved_at ? formatDateTime(row.approved_at) : "" },
        { header: "Rejection Reason", key: "rejection_reason" },
      ],
      data: adminSettlements,
    });
  }

  function exportSuperSettlementsExcel() {
    if (superSettlements.length === 0) {
      showError("There are no settlements to export.");
      return;
    }

    exportToExcel({
      filename: "Super-Admin-Settlement-Review",
      sheetName: "Settlement Review",
      title: "Super Admin Settlement Review",
      columns: [
        { header: "Settlement ID", key: "settlement_id" },
        { header: "Dojo", key: "dojo_name" },
        { header: "Class", key: "class_name" },
        { header: "Settlement Month", key: "settlement_month" },
        { header: "Share %", key: "share_percent" },
        { header: "Total Collected", key: "gross_amount" },
        { header: "Super Admin Share", key: "share_amount" },
        { header: "Admin Retained", key: "admin_retained", value: (row) => Number(row.gross_amount) - Number(row.share_amount) },
        { header: "Currency", key: "currency" },
        { header: "Status", key: "status", value: (row) => row.status.toUpperCase() },
        { header: "Included Payments", key: "item_count" },
        { header: "Notes", key: "notes" },
        { header: "Submitted By", key: "submitted_by_name" },
        { header: "Submitted At", key: "submitted_at", value: (row) => row.submitted_at ? formatDateTime(row.submitted_at) : "" },
        { header: "Reviewed By", key: "reviewed_by_name" },
        { header: "Reviewed At", key: "reviewed_at", value: (row) => row.reviewed_at ? formatDateTime(row.reviewed_at) : "" },
        { header: "Approved At", key: "approved_at", value: (row) => row.approved_at ? formatDateTime(row.approved_at) : "" },
        { header: "Rejection Reason", key: "rejection_reason" },
      ],
      data: superSettlements,
    });
  }

  function exportSettlementRulesExcel() {
    if (configs.length === 0) {
      showError("There are no settlement rules to export.");
      return;
    }

    exportToExcel({
      filename: "Dojo-Settlement-Rules",
      sheetName: "Settlement Rules",
      title: "Dojo Settlement Rules",
      columns: [
        { header: "Dojo", key: "dojo_name" },
        { header: "Class", key: "class_name" },
        { header: "Settlement Required", key: "requires_share", value: (row) => row.requires_share ? "Yes" : "No" },
        { header: "Share %", key: "share_percent" },
      ],
      data: configs,
    });
  }


  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading settlements...
        </p>

      </main>
    );
  }


  const hasAdminAccess =
    assignments.length >
    0;


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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-400">
                Settlement Centre
              </p>


              <h1 className="text-3xl font-bold">
                Dojo Settlements
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Submit configured dojo shares and review submitted settlements.
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


        <section className="mt-6 grid gap-2 sm:grid-cols-3">

          {hasAdminAccess && (

            <TabButton
              label="Dojo Admin"
              active={
                activeTab ===
                "admin"
              }
              onClick={() =>
                setActiveTab(
                  "admin"
                )
              }
            />

          )}


          {isSuperAdmin && (

            <TabButton
              label="Super Admin Review"
              active={
                activeTab ===
                "super"
              }
              onClick={() =>
                setActiveTab(
                  "super"
                )
              }
            />

          )}


          {isSuperAdmin && (

            <TabButton
              label="Settlement Rules"
              active={
                activeTab ===
                "config"
              }
              onClick={() =>
                setActiveTab(
                  "config"
                )
              }
            />

          )}

        </section>


        {activeTab ===
          "admin" &&
          hasAdminAccess && (

          <section className="mt-6 space-y-6">

            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="grid gap-4 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Dojo
                  </label>


                  <select
                    value={
                      selectedDojoId
                    }
                    onChange={(e) =>
                      setSelectedDojoId(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
                  >

                    {dojos.map(
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
                          {" · "}
                          {dojo.classes
                            ?.name ??
                            "Class"}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div>

                  <label className="mb-2 block text-sm font-medium">
                    Settlement Month
                  </label>


                  <input
                    type="month"
                    value={
                      settlementMonth
                    }
                    onChange={(e) =>
                      setSettlementMonth(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
                  />

                </div>

              </div>

            </article>


            {myConfig &&
              !myConfig.requires_share && (

              <article className="rounded-2xl border border-green-900 bg-green-950/10 p-6">

                <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                  No Settlement Required
                </p>


                <h2 className="mt-2 text-2xl font-bold">
                  This dojo is exempt
                </h2>


                <p className="mt-2 text-sm text-neutral-400">
                  No Super Admin share is required for this dojo.
                </p>

              </article>

            )}


            {myConfig
              ?.requires_share && (

              <>

                <article className="rounded-2xl border border-orange-900 bg-orange-950/10 p-6">

                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                        Share Required
                      </p>


                      <h2 className="mt-1 text-2xl font-bold">
                        {
                          myConfig.share_percent
                        }
                        % Settlement
                      </h2>


                      <p className="mt-2 text-sm text-neutral-400">
                        Select the member payments included in this settlement.
                      </p>

                    </div>


                    <button
                      type="button"
                      onClick={
                        toggleAllPayments
                      }
                      disabled={
                        eligiblePayments.length ===
                        0
                      }
                      className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {selectedPaymentIds.length ===
                      eligiblePayments.length &&
                      eligiblePayments.length >
                        0
                        ? "Clear All"
                        : "Select All"}
                    </button>

                  </div>


                  <div className="mt-5 space-y-2">

                    {eligiblePayments.map(
                      (
                        payment
                      ) => {

                        const selected =
                          selectedPaymentIds.includes(
                            payment.payment_id
                          );


                        return (
                          <label
                            key={
                              payment.payment_id
                            }
                            className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                              selected
                                ? "border-orange-700 bg-orange-950/20"
                                : "border-neutral-800 bg-neutral-950/40"
                            }`}
                          >

                            <input
                              type="checkbox"
                              checked={
                                selected
                              }
                              onChange={() =>
                                togglePayment(
                                  payment.payment_id
                                )
                              }
                              className="mt-1"
                            />


                            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_160px_160px] sm:items-center">

                              <div>

                                <p className="font-semibold">
                                  {
                                    payment.member_name
                                  }
                                </p>


                                <p className="mt-1 text-xs text-neutral-500">
                                  Member ID:{" "}
                                  {payment.member_id ??
                                    "Not assigned"}
                                </p>


                                <p className="mt-1 text-xs text-neutral-600">
                                  {formatDate(
                                    payment.payment_date
                                  )}
                                  {" · "}
                                  {payment.payment_method ??
                                    "Payment"}
                                </p>

                              </div>


                              <Money
                                label="Payment"
                                value={
                                  formatCurrency(
                                    Number(
                                      payment.payment_amount
                                    ),
                                    payment.currency
                                  )
                                }
                              />


                              <Money
                                label={`${myConfig.share_percent}% Share`}
                                value={
                                  formatCurrency(
                                    Number(
                                      payment.suggested_share
                                    ),
                                    payment.currency
                                  )
                                }
                              />

                            </div>

                          </label>
                        );
                      }
                    )}


                    {eligiblePayments.length ===
                      0 && (

                      <div className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-500">
                        No eligible payments are available for this month.
                      </div>

                    )}

                  </div>


                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    <Summary
                      label="Payments"
                      value={
                        String(
                          selectedPaymentIds.length
                        )
                      }
                    />


                    <Summary
                      label="Total Collected"
                      value={
                        formatCurrency(
                          selectedGross
                        )
                      }
                    />


                    <Summary
                      label={`Super Admin Share (${myConfig.share_percent}%)`}
                      value={
                        formatCurrency(
                          selectedShare
                        )
                      }
                    />


                    <Summary
                      label={`Admin Retained (${100 - myConfig.share_percent}%)`}
                      value={
                        formatCurrency(
                          selectedAdminRetained
                        )
                      }
                    />

                  </div>


                  <div className="mt-5">

                    <label className="mb-2 block text-sm">
                      Notes
                    </label>


                    <textarea
                      value={
                        settlementNotes
                      }
                      onChange={(e) =>
                        setSettlementNotes(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Optional settlement notes"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                    />

                  </div>


                  <button
                    type="button"
                    disabled={
                      processing ===
                        "create" ||
                      selectedPaymentIds.length ===
                        0
                    }
                    onClick={
                      createSettlement
                    }
                    className="mt-5 rounded-lg bg-orange-600 px-6 py-3 font-semibold hover:bg-orange-500 disabled:opacity-50"
                  >
                    {processing ===
                    "create"
                      ? "Creating..."
                      : "Create Settlement Draft"}
                  </button>

                </article>

              </>

            )}


            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">
                  Settlement History
                </h2>

                <button
                  type="button"
                  disabled={adminSettlements.length === 0}
                  onClick={exportAdminSettlementsExcel}
                  className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Excel
                </button>
              </div>


              <div className="mt-5 space-y-4">

                {adminSettlements.map(
                  (
                    settlement
                  ) => {

                    const expanded =
                      expandedSettlementId ===
                      settlement.settlement_id;


                    const items =
                      settlementItems[
                        settlement.settlement_id
                      ] ??
                      [];


                    return (
                      <SettlementCard
                        key={
                          settlement.settlement_id
                        }
                        dojoName={
                          settlement.dojo_name
                        }
                        month={
                          settlement.settlement_month
                        }
                        gross={
                          settlement.gross_amount
                        }
                        share={
                          settlement.share_amount
                        }
                        percent={
                          settlement.share_percent
                        }
                        currency={
                          settlement.currency
                        }
                        status={
                          settlement.status
                        }
                        itemCount={
                          Number(
                            settlement.item_count
                          )
                        }
                        rejectionReason={
                          settlement.rejection_reason
                        }
                        submittedAt={
                          settlement.submitted_at
                        }
                        reviewedAt={
                          settlement.reviewed_at
                        }
                        expanded={
                          expanded
                        }
                        items={
                          items
                        }
                        detailLoading={
                          processing ===
                          `detail:${settlement.settlement_id}`
                        }
                        onToggle={() =>
                          toggleSettlementDetail(
                            settlement.settlement_id
                          )
                        }
                        actions={
                          settlement.status ===
                            "draft" ||
                          settlement.status ===
                            "rejected"
                            ? (
                                <div className="flex flex-wrap gap-2">

                                  <button
                                    type="button"
                                    disabled={
                                      processing ===
                                      `submit:${settlement.settlement_id}`
                                    }
                                    onClick={() =>
                                      submitSettlement(
                                        settlement.settlement_id
                                      )
                                    }
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
                                  >
                                    {settlement.status ===
                                    "rejected"
                                      ? "Send the Share Again"
                                      : "Send the Share"}
                                  </button>


                                  <button
                                    type="button"
                                    disabled={
                                      processing ===
                                      `cancel:${settlement.settlement_id}`
                                    }
                                    onClick={() =>
                                      cancelSettlement(
                                        settlement.settlement_id
                                      )
                                    }
                                    className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>

                                </div>
                              )
                            : null
                        }
                      />
                    );
                  }
                )}


                {adminSettlements.length ===
                  0 && (

                  <p className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-500">
                    No settlements found.
                  </p>

                )}

              </div>

            </article>

          </section>

        )}


        {activeTab ===
          "super" &&
          isSuperAdmin && (

          <section className="mt-6">

            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Super Admin
              </p>


              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">
                  Settlement Review
                </h2>

                <button
                  type="button"
                  disabled={superSettlements.length === 0}
                  onClick={exportSuperSettlementsExcel}
                  className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Excel
                </button>
              </div>


              <p className="mt-2 text-sm text-neutral-400">
                You only see financial details explicitly submitted in settlements. Private dojo financial reports remain inaccessible unless you are separately assigned as that dojo&apos;s Admin.
              </p>


              <div className="mt-5 space-y-4">

                {superSettlements.map(
                  (
                    settlement
                  ) => {

                    const expanded =
                      expandedSettlementId ===
                      settlement.settlement_id;


                    const items =
                      settlementItems[
                        settlement.settlement_id
                      ] ??
                      [];


                    return (
                      <SettlementCard
                        key={
                          settlement.settlement_id
                        }
                        dojoName={
                          settlement.dojo_name
                        }
                        month={
                          settlement.settlement_month
                        }
                        gross={
                          settlement.gross_amount
                        }
                        share={
                          settlement.share_amount
                        }
                        percent={
                          settlement.share_percent
                        }
                        currency={
                          settlement.currency
                        }
                        status={
                          settlement.status
                        }
                        itemCount={
                          Number(
                            settlement.item_count
                          )
                        }
                        rejectionReason={
                          settlement.rejection_reason
                        }
                        submittedAt={
                          settlement.submitted_at
                        }
                        reviewedAt={
                          settlement.reviewed_at
                        }
                        expanded={
                          expanded
                        }
                        items={
                          items
                        }
                        detailLoading={
                          processing ===
                          `detail:${settlement.settlement_id}`
                        }
                        onToggle={() =>
                          toggleSettlementDetail(
                            settlement.settlement_id
                          )
                        }
                        actions={
                          settlement.status ===
                          "submitted"
                            ? (
                                <div className="flex flex-wrap gap-2">

                                  <button
                                    type="button"
                                    disabled={
                                      processing ===
                                      `review:${settlement.settlement_id}`
                                    }
                                    onClick={() =>
                                      reviewSettlement(
                                        settlement,
                                        "approved"
                                      )
                                    }
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
                                  >
                                    Approve
                                  </button>


                                  <button
                                    type="button"
                                    disabled={
                                      processing ===
                                      `review:${settlement.settlement_id}`
                                    }
                                    onClick={() =>
                                      reviewSettlement(
                                        settlement,
                                        "rejected"
                                      )
                                    }
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>

                                </div>
                              )
                            : null
                        }
                      />
                    );
                  }
                )}


                {superSettlements.length ===
                  0 && (

                  <p className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-500">
                    No submitted settlements yet.
                  </p>

                )}

              </div>

            </article>

          </section>

        )}


        {activeTab ===
          "config" &&
          isSuperAdmin && (

          <section className="mt-6">

            <article className="rounded-2xl border border-purple-900 bg-purple-950/10 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Organisation Configuration
              </p>


              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">
                  Settlement Rules
                </h2>

                <button
                  type="button"
                  disabled={configs.length === 0}
                  onClick={exportSettlementRulesExcel}
                  className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export Excel
                </button>
              </div>


              <p className="mt-2 text-sm text-neutral-400">
                Decide which dojos must submit a share and set the percentage. This does not grant access to their private financial reports.
              </p>


              <div className="mt-5 space-y-3">

                {configs.map(
                  (
                    config
                  ) => {

                    const enabled =
                      configEnabledDraft[
                        config.dojo_id
                      ] ??
                      false;


                    const key =
                      `config:${config.dojo_id}`;


                    return (
                      <div
                        key={
                          config.dojo_id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4"
                      >

                        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">

                          <div>

                            <p className="font-semibold">
                              {
                                config.dojo_name
                              }
                            </p>


                            <p className="mt-1 text-sm text-neutral-500">
                              {
                                config.class_name
                              }
                            </p>

                          </div>


                          <div>

                            <label className="mb-2 block text-xs text-neutral-500">
                              Settlement Required
                            </label>


                            <select
                              value={
                                enabled
                                  ? "yes"
                                  : "no"
                              }
                              onChange={(e) =>
                                setConfigEnabledDraft(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [config.dojo_id]:
                                      e.target.value ===
                                      "yes",
                                  })
                                )
                              }
                              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
                            >

                              <option value="yes">
                                Yes
                              </option>

                              <option value="no">
                                No
                              </option>

                            </select>

                          </div>


                          <div>

                            <label className="mb-2 block text-xs text-neutral-500">
                              Share %
                            </label>


                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              disabled={
                                !enabled
                              }
                              value={
                                configPercentDraft[
                                  config.dojo_id
                                ] ??
                                ""
                              }
                              onChange={(e) =>
                                setConfigPercentDraft(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [config.dojo_id]:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 disabled:opacity-40"
                            />

                          </div>


                          <button
                            type="button"
                            disabled={
                              processing ===
                              key
                            }
                            onClick={() =>
                              saveConfig(
                                config
                              )
                            }
                            className="rounded-lg bg-purple-600 px-5 py-2 font-semibold hover:bg-purple-500 disabled:opacity-50"
                          >
                            {processing ===
                            key
                              ? "Saving..."
                              : "Save"}
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </article>

          </section>

        )}

      </div>

    </main>
  );
}


function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border px-4 py-3 font-medium transition ${
        active
          ? "border-orange-700 bg-orange-950/30 text-orange-300"
          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {label}
    </button>
  );
}


function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>


      <p className="mt-2 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}


function Money({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>


      <p className="mt-1 font-semibold">
        {value}
      </p>

    </div>
  );
}


function SettlementCard({
  dojoName,
  month,
  gross,
  share,
  percent,
  currency,
  status,
  itemCount,
  rejectionReason,
  submittedAt,
  reviewedAt,
  expanded,
  items,
  detailLoading,
  onToggle,
  actions,
}: {
  dojoName: string;

  month: string;

  gross: number;

  share: number;

  percent: number;

  currency: string;

  status: string;

  itemCount: number;

  rejectionReason:
    | string
    | null;

  submittedAt:
    | string
    | null;

  reviewedAt:
    | string
    | null;

  expanded: boolean;

  items:
    SettlementItem[];

  detailLoading:
    boolean;

  onToggle:
    () => void;

  actions:
    React.ReactNode;
}) {
  function formatCurrency(
    value:
      number
  ) {
    try {
      return new Intl.NumberFormat(
        "id-ID",
        {
          style:
            "currency",
          currency,
          maximumFractionDigits:
            currency ===
            "IDR"
              ? 0
              : 2,
        }
      ).format(
        Number(
          value
        )
      );
    } catch {
      return `${currency} ${Number(
        value
      ).toLocaleString()}`;
    }
  }


  const adminRetained =
    Number(gross) -
    Number(share);

  const adminPercent =
    Math.max(
      0,
      100 - Number(percent)
    );


  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-5">

      <div className="flex flex-col justify-between gap-4 lg:flex-row">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <p className="text-lg font-bold">
              {dojoName}
            </p>


            <SettlementStatus
              status={
                status
              }
            />

          </div>


          <p className="mt-1 text-sm text-neutral-500">
            Settlement month:{" "}
            {formatDate(
              month
            )}
          </p>


          <p className="mt-1 text-xs text-neutral-600">
            {itemCount} included payment
            {itemCount ===
            1
              ? ""
              : "s"}
          </p>

        </div>


        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Money
            label="Total Collected"
            value={
              formatCurrency(
                gross
              )
            }
          />


          <Money
            label={`Super Admin Share (${percent}%)`}
            value={
              formatCurrency(
                share
              )
            }
          />


          <Money
            label={`Admin Retained (${adminPercent}%)`}
            value={
              formatCurrency(
                adminRetained
              )
            }
          />


          <div>
            {actions}
          </div>

        </div>

      </div>


      {submittedAt && (

        <p className="mt-3 text-xs text-neutral-500">
          Submitted:{" "}
          {formatDateTime(
            submittedAt
          )}
        </p>

      )}


      {reviewedAt && (

        <p className="mt-1 text-xs text-neutral-500">
          Reviewed:{" "}
          {formatDateTime(
            reviewedAt
          )}
        </p>

      )}


      {rejectionReason && (

        <div className="mt-4 rounded-lg border border-red-900 bg-red-950/20 p-3">

          <p className="text-xs font-semibold uppercase text-red-400">
            Rejection Reason
          </p>


          <p className="mt-1 text-sm text-red-200">
            {rejectionReason}
          </p>

        </div>

      )}


      <button
        type="button"
        onClick={
          onToggle
        }
        className="mt-4 rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
      >
        {expanded
          ? "Hide Details"
          : "View Details"}
      </button>


      {expanded && (

        <div className="mt-4 rounded-xl border border-neutral-800">

          {detailLoading ? (

            <p className="p-5 text-neutral-500">
              Loading payment details...
            </p>

          ) : items.length ===
            0 ? (

            <p className="p-5 text-neutral-500">
              No payment items found.
            </p>

          ) : (

            <div className="divide-y divide-neutral-800">

              {items.map(
                (
                  item
                ) => (

                  <div
                    key={
                      item.item_id
                    }
                    className="grid gap-3 p-4 sm:grid-cols-[1fr_160px_160px]"
                  >

                    <div>

                      <p className="font-semibold">
                        {
                          item.member_name
                        }
                      </p>


                      <p className="mt-1 text-xs text-neutral-500">
                        Member ID:{" "}
                        {item.member_id ??
                          "Not assigned"}
                      </p>


                      <p className="mt-1 text-xs text-neutral-600">
                        {formatDate(
                          item.payment_date
                        )}
                        {" · "}
                        {item.payment_method ??
                          "Payment"}
                      </p>


                      {item.payment_reference && (

                        <p className="mt-1 text-xs text-neutral-600">
                          Ref:{" "}
                          {
                            item.payment_reference
                          }
                        </p>

                      )}

                    </div>


                    <Money
                      label="Payment"
                      value={
                        formatCurrency(
                          Number(
                            item.payment_amount
                          )
                        )
                      }
                    />


                    <Money
                      label={`${item.share_percent}% Super Admin Share`}
                      value={
                        formatCurrency(
                          Number(
                            item.share_amount
                          )
                        )
                      }
                    />

                  </div>

                )
              )}

            </div>

          )}

        </div>

      )}

    </div>
  );
}


function SettlementStatus({
  status,
}: {
  status: string;
}) {
  const style =
    status ===
    "approved"
      ? "border-green-800 bg-green-950/30 text-green-300"
      : status ===
        "submitted"
      ? "border-sky-800 bg-sky-950/30 text-sky-300"
      : status ===
        "rejected"
      ? "border-red-800 bg-red-950/30 text-red-300"
      : status ===
        "draft"
      ? "border-yellow-800 bg-yellow-950/30 text-yellow-300"
      : "border-neutral-700 bg-neutral-900 text-neutral-400";


  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${style}`}
    >
      {status}
    </span>
  );
}
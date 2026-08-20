"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  exportToExcel,
} from "@/lib/exportExcel";

import {
  formatDate,
  formatDateTime,
} from "@/lib/format-date";


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


type MemberRecord = {
  membership_id: string;
  user_id: string;

  registration_number:
    | string
    | null;

  full_name: string;

  email:
    | string
    | null;

  class_id: string;
  class_name: string;

  dojo_id:
    | string
    | null;

  dojo_name:
    | string
    | null;

  membership_status: string;
};


type DojoSetting = {
  id: string;
  dojo_id: string;
  class_id: string;

  default_fee: number;
  currency: string;

  effective_from: string;

  active: boolean;

  updated_at: string;
};


type MemberOverride = {
  id: string;

  membership_id: string;

  special_fee: number;
  currency: string;

  effective_from: string;

  effective_until:
    | string
    | null;

  reason:
    | string
    | null;

  active: boolean;

  updated_at: string;
};


type SubscriptionCharge = {
  id: string;

  membership_id: string;

  dojo_id: string;
  class_id: string;

  billing_month: string;

  amount: number;
  currency: string;

  rate_source:
    | "dojo_default"
    | "member_special";

  status:
    | "unpaid"
    | "paid"
    | "waived"
    | "cancelled";

  generated_at: string;
};


type PaymentRecord = {
  id: string;

  charge_id: string;

  membership_id: string;

  dojo_id: string;

  amount: number;
  currency: string;

  payment_method:
    | string
    | null;

  payment_reference:
    | string
    | null;

  payment_date: string;

  recorded_at: string;

  notes:
    | string
    | null;
};


type FinancialReportRow = {
  membership_id: string;

  member_name: string;

  member_id:
    | string
    | null;

  billing_month: string;

  charge_amount: number;

  paid_amount: number;

  outstanding_amount: number;

  currency: string;

  payment_status: string;

  rate_source: string;
};


type ReceivingAccount = {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  instructions: string | null;
};


type PaymentConfirmationRow = {
  confirmation_id: string;
  charge_id: string;
  membership_id: string;

  member_id:
    | string
    | null;

  member_name: string;

  billing_month: string;

  charge_amount: number;
  transferred_amount: number;

  currency: string;

  payment_method: string;

  transfer_date: string;

  member_note:
    | string
    | null;

  status:
    | "pending"
    | "approved"
    | "rejected";

  created_at: string;

  reviewed_at:
    | string
    | null;

  reviewed_by_name:
    | string
    | null;

  rejection_reason:
    | string
    | null;
};


type MonthlyPaymentSummary = {
  billing_month: string;

  total_members: number;

  paid_members: number;

  pending_confirmation_members: number;

  partially_paid_members: number;

  unpaid_members: number;

  special_rate_members: number;

  total_charged: number;

  total_collected: number;

  total_outstanding: number;
};


type Tab =
  | "rates"
  | "payments"
  | "confirmations"
  | "report";


type MessageType =
  | "success"
  | "error"
  | "";


type PaymentStatusFilter =
  | "all"
  | "paid"
  | "pending"
  | "partial"
  | "unpaid"
  | "special";


export default function SubscriptionPage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );


  const router =
    useRouter();


  const searchParams =
    useSearchParams();


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
    members,
    setMembers,
  ] =
    useState<
      MemberRecord[]
    >([]);


  const [
    dojoSettings,
    setDojoSettings,
  ] =
    useState<
      DojoSetting[]
    >([]);


  const [
    overrides,
    setOverrides,
  ] =
    useState<
      MemberOverride[]
    >([]);


  const [
    charges,
    setCharges,
  ] =
    useState<
      SubscriptionCharge[]
    >([]);


  const [
    payments,
    setPayments,
  ] =
    useState<
      PaymentRecord[]
    >([]);


  const [
    reportRows,
    setReportRows,
  ] =
    useState<
      FinancialReportRow[]
    >([]);


  const [
    receivingAccount,
    setReceivingAccount,
  ] =
    useState<
      ReceivingAccount | null
    >(null);


  const [
    bankName,
    setBankName,
  ] =
    useState("");


  const [
    accountHolderName,
    setAccountHolderName,
  ] =
    useState("");


  const [
    accountNumber,
    setAccountNumber,
  ] =
    useState("");


  const [
    accountInstructions,
    setAccountInstructions,
  ] =
    useState("");


  const [
    confirmations,
    setConfirmations,
  ] =
    useState<
      PaymentConfirmationRow[]
    >([]);


  const [
    confirmationFilter,
    setConfirmationFilter,
  ] =
    useState<
      "pending"
      | "approved"
      | "rejected"
      | "all"
    >(
      "pending"
    );


  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] =
    useState<
      PaymentStatusFilter
    >(
      "all"
    );


  const [
    monthlySummary,
    setMonthlySummary,
  ] =
    useState<
      MonthlyPaymentSummary | null
    >(null);


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
      "rates"
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
    search,
    setSearch,
  ] =
    useState("");


  const [
    billingMonth,
    setBillingMonth,
  ] =
    useState("");


  const [
    dojoFeeDraft,
    setDojoFeeDraft,
  ] =
    useState("");


  const [
    dojoFeeDate,
    setDojoFeeDate,
  ] =
    useState("");


  const [
    editingMembershipId,
    setEditingMembershipId,
  ] =
    useState<
      string | null
    >(null);


  const [
    specialFee,
    setSpecialFee,
  ] =
    useState("");


  const [
    specialFrom,
    setSpecialFrom,
  ] =
    useState("");


  const [
    specialUntil,
    setSpecialUntil,
  ] =
    useState("");


  const [
    specialReason,
    setSpecialReason,
  ] =
    useState("");


  const [
    payingChargeId,
    setPayingChargeId,
  ] =
    useState<
      string | null
    >(null);


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState(
      "Cash"
    );


  const [
    paymentReference,
    setPaymentReference,
  ] =
    useState("");


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState("");


  const [
    paymentNotes,
    setPaymentNotes,
  ] =
    useState("");


  /*
   * =====================================================
   * MESSAGES
   * =====================================================
   */

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


  /*
   * =====================================================
   * DATE HELPERS
   * =====================================================
   */

  function todayString() {
    const now =
      new Date();

    const yyyy =
      now.getFullYear();

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

    return `${yyyy}-${mm}-${dd}`;
  }


  function monthString() {
    const now =
      new Date();

    const yyyy =
      now.getFullYear();

    const mm =
      String(
        now.getMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    return `${yyyy}-${mm}`;
  }


  function formatMonth(
    month:
      string | null
  ) {
    if (
      !month
    ) {
      return "-";
    }

    const normalized =
      /^\d{4}-\d{2}$/.test(
        month
      )
        ? `${month}-01`
        : month;

    const date =
      new Date(
        `${normalized}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return month;
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        month:
          "long",
        year:
          "numeric",
      }
    );
  }


  /*
   * =====================================================
   * CURRENCY
   * =====================================================
   */

  function formatCurrency(
    value:
      number | null,

    currency =
      "IDR"
  ) {
    if (
      value ===
      null
    ) {
      return "-";
    }


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


  /*
   * =====================================================
   * LOOKUPS
   * =====================================================
   */

  function getMember(
    membershipId:
      string
  ) {
    return members.find(
      (
        member
      ) =>
        member.membership_id ===
        membershipId
    );
  }


  function getOverride(
    membershipId:
      string
  ) {
    return overrides.find(
      (
        override
      ) =>
        override.membership_id ===
          membershipId &&
        override.active
    );
  }


  function totalPaidForCharge(
    chargeId:
      string
  ) {
    return payments
      .filter(
        (
          payment
        ) =>
          payment.charge_id ===
          chargeId
      )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount
          ),
        0
      );
  }


  /*
   * =====================================================
   * INITIAL TAB
   * =====================================================
   */

  useEffect(() => {
    const requestedTab =
      searchParams.get(
        "tab"
      );


    if (
      requestedTab ===
        "rates" ||
      requestedTab ===
        "payments" ||
      requestedTab ===
        "confirmations" ||
      requestedTab ===
        "report"
    ) {
      setActiveTab(
        requestedTab
      );
    }
  }, [
    searchParams,
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
        assignmentError
      ) {
        showError(
          assignmentError.message
        );

        setLoading(
          false
        );

        return;
      }


      const loadedAssignments =
        (
          assignmentData ??
          []
        ) as
          AdminAssignment[];


      setAssignments(
        loadedAssignments
      );


      if (
        loadedAssignments.length ===
        0
      ) {
        router.replace(
          "/admin"
        );

        return;
      }


      const ids =
        loadedAssignments.map(
          (
            assignment
          ) =>
            assignment.dojo_id
        );


      await Promise.all([
        loadDojos(
          ids
        ),
        loadMembers(
          ids
        ),
      ]);


      setBillingMonth(
        monthString()
      );


      setDojoFeeDate(
        todayString()
      );


      setPaymentDate(
        todayString()
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
   * DOJOS / MEMBERS
   * =====================================================
   */

  async function loadDojos(
    dojoIds:
      string[]
  ) {
    if (
      dojoIds.length ===
      0
    ) {
      setDojos(
        []
      );

      return;
    }


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
        .in(
          "id",
          dojoIds
        )
        .order(
          "name"
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
      ) as unknown as
        DojoRecord[];


    setDojos(
      loaded
    );


    if (
      loaded.length >
        0
    ) {
      setSelectedDojoId(
        (
          current
        ) =>
          current ||
          loaded[0].id
      );
    }
  }


  async function loadMembers(
    dojoIds:
      string[]
  ) {
    if (
      dojoIds.length ===
      0
    ) {
      setMembers(
        []
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "admin_visible_members"
        )
        .select(`
          membership_id,
          user_id,
          registration_number,
          full_name,
          email,
          class_id,
          class_name,
          dojo_id,
          dojo_name,
          membership_status
        `)
        .in(
          "dojo_id",
          dojoIds
        )
        .order(
          "full_name"
        );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    setMembers(
      (
        data ??
        []
      ) as
        MemberRecord[]
    );
  }


  /*
   * =====================================================
   * SELECTED DOJO DATA
   * =====================================================
   */

  useEffect(() => {
    if (
      !selectedDojoId ||
      !billingMonth
    ) {
      return;
    }


    async function loadSelectedDojo() {
      clearMessage();


      await Promise.all([
        loadDojoSettings(),
        loadOverrides(),
        loadCharges(),
        loadPayments(),
        loadReceivingAccount(),
        loadConfirmations(),
        loadMonthlySummary(),
      ]);
    }


    loadSelectedDojo();
  }, [
    selectedDojoId,
    billingMonth,
  ]);


  async function loadDojoSettings() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "dojo_subscription_settings"
        )
        .select("*")
        .eq(
          "dojo_id",
          selectedDojoId
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
      ) as
        DojoSetting[];


    setDojoSettings(
      loaded
    );


    const current =
      loaded.find(
        (
          row
        ) =>
          row.active
      ) ??
      loaded[0];


    if (
      current
    ) {
      setDojoFeeDraft(
        String(
          current.default_fee
        )
      );


      setDojoFeeDate(
        current.effective_from
      );
    } else {
      setDojoFeeDraft(
        ""
      );


      setDojoFeeDate(
        todayString()
      );
    }
  }


  async function loadOverrides() {
    const membershipIds =
      members
        .filter(
          (
            member
          ) =>
            member.dojo_id ===
            selectedDojoId
        )
        .map(
          (
            member
          ) =>
            member.membership_id
        );


    if (
      membershipIds.length ===
      0
    ) {
      setOverrides(
        []
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "membership_subscription_overrides"
        )
        .select("*")
        .in(
          "membership_id",
          membershipIds
        );


    if (
      error
    ) {
      showError(
        error.message
      );

      return;
    }


    setOverrides(
      (
        data ??
        []
      ) as
        MemberOverride[]
    );
  }


  async function loadCharges() {
    if (
      !billingMonth
    ) {
      setCharges(
        []
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "membership_subscription_charges"
        )
        .select("*")
        .eq(
          "dojo_id",
          selectedDojoId
        )
        .eq(
          "billing_month",
          `${billingMonth}-01`
        )
        .order(
          "generated_at",
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


    setCharges(
      (
        data ??
        []
      ) as
        SubscriptionCharge[]
    );
  }


  async function loadPayments() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "membership_payments"
        )
        .select("*")
        .eq(
          "dojo_id",
          selectedDojoId
        )
        .order(
          "payment_date",
          {
            ascending:
              false,
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


    setPayments(
      (
        data ??
        []
      ) as
        PaymentRecord[]
    );
  }


  async function loadReceivingAccount() {
    if (
      !selectedDojoId
    ) {
      setReceivingAccount(
        null
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_receiving_account",
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


    const account =
      (
        (
          data ??
          []
        ) as
          ReceivingAccount[]
      )[0] ??
      null;


    setReceivingAccount(
      account
    );


    setBankName(
      account?.bank_name ??
        ""
    );


    setAccountHolderName(
      account
        ?.account_holder_name ??
        ""
    );


    setAccountNumber(
      account?.account_number ??
        ""
    );


    setAccountInstructions(
      account?.instructions ??
        ""
    );
  }


  async function loadConfirmations(
    status:
      | "pending"
      | "approved"
      | "rejected"
      | "all" =
      confirmationFilter
  ) {
    if (
      !selectedDojoId
    ) {
      setConfirmations(
        []
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_payment_confirmations",
        {
          target_dojo_id:
            selectedDojoId,

          requested_status:
            status ===
            "all"
              ? null
              : status,
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


    setConfirmations(
      (
        data ??
        []
      ) as
        PaymentConfirmationRow[]
    );
  }


  async function loadMonthlySummary() {
    if (
      !selectedDojoId ||
      !billingMonth
    ) {
      setMonthlySummary(
        null
      );

      return;
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_monthly_payment_summary",
        {
          target_dojo_id:
            selectedDojoId,

          target_month:
            `${billingMonth}-01`,
        }
      );


    if (
      error
    ) {
      console.error(
        "Monthly payment summary:",
        error
      );

      setMonthlySummary(
        null
      );

      return;
    }


    const row =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    if (
      !row
    ) {
      setMonthlySummary(
        null
      );

      return;
    }


    setMonthlySummary({
      billing_month:
        row.billing_month,

      total_members:
        Number(
          row.total_members ??
            0
        ),

      paid_members:
        Number(
          row.paid_members ??
            0
        ),

      pending_confirmation_members:
        Number(
          row.pending_confirmation_members ??
            0
        ),

      partially_paid_members:
        Number(
          row.partially_paid_members ??
            0
        ),

      unpaid_members:
        Number(
          row.unpaid_members ??
            0
        ),

      special_rate_members:
        Number(
          row.special_rate_members ??
            0
        ),

      total_charged:
        Number(
          row.total_charged ??
            0
        ),

      total_collected:
        Number(
          row.total_collected ??
            0
        ),

      total_outstanding:
        Number(
          row.total_outstanding ??
            0
        ),
    });
  }


  /*
   * =====================================================
   * RECEIVING ACCOUNT
   * =====================================================
   */

  async function saveReceivingAccount() {
    if (
      !selectedDojoId
    ) {
      return;
    }


    if (
      !bankName.trim() ||
      !accountHolderName.trim() ||
      !accountNumber.trim()
    ) {
      showError(
        "Bank / channel, account holder and account number are required."
      );

      return;
    }


    setProcessing(
      "receiving-account"
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "set_dojo_receiving_account",
        {
          target_dojo_id:
            selectedDojoId,

          new_bank_name:
            bankName.trim(),

          new_account_holder_name:
            accountHolderName.trim(),

          new_account_number:
            accountNumber.trim(),

          new_instructions:
            accountInstructions.trim() ||
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


    await loadReceivingAccount();


    showSuccess(
      "Receiving account updated."
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * PAYMENT CONFIRMATION REVIEW
   * =====================================================
   */

  async function reviewConfirmation(
    confirmation:
      PaymentConfirmationRow,

    decision:
      | "approved"
      | "rejected"
  ) {
    let reason:
      string | null =
      null;


    if (
      decision ===
      "rejected"
    ) {
      const entered =
        window.prompt(
          `Reason for declining ${confirmation.member_name}'s payment confirmation:`
        );


      if (
        entered ===
        null
      ) {
        return;
      }


      if (
        !entered.trim()
      ) {
        showError(
          "A reason is required when declining a payment confirmation."
        );

        return;
      }


      reason =
        entered.trim();
    }


    const confirmed =
      window.confirm(
        decision ===
        "approved"
          ? `Approve ${confirmation.member_name}'s ${formatCurrency(
              Number(
                confirmation.transferred_amount
              ),
              confirmation.currency
            )} payment?`
          : `Decline ${confirmation.member_name}'s payment confirmation?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      `confirmation:${confirmation.confirmation_id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_membership_payment_confirmation",
        {
          target_confirmation_id:
            confirmation.confirmation_id,

          decision,

          rejection_note:
            reason,
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
      loadConfirmations(
        confirmationFilter
      ),
      loadCharges(),
      loadPayments(),
      loadMonthlySummary(),
    ]);


    if (
      activeTab ===
      "report"
    ) {
      await loadReport();
    }


    showSuccess(
      decision ===
        "approved"
        ? "Payment confirmed successfully."
        : "Payment confirmation declined. The member can submit again."
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * DOJO RATE
   * =====================================================
   */

  async function saveDojoRate() {
    if (
      !selectedDojoId
    ) {
      return;
    }


    const fee =
      Number(
        dojoFeeDraft
      );


    if (
      Number.isNaN(
        fee
      ) ||
      fee <
        0
    ) {
      showError(
        "Enter a valid monthly subscription fee."
      );

      return;
    }


    if (
      !dojoFeeDate
    ) {
      showError(
        "Select an effective date."
      );

      return;
    }


    setProcessing(
      "dojo-rate"
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "set_dojo_subscription_rate",
        {
          target_dojo_id:
            selectedDojoId,

          new_fee:
            fee,

          rate_effective_from:
            dojoFeeDate,

          new_currency:
            "IDR",
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


    await loadDojoSettings();


    showSuccess(
      "Dojo subscription rate updated."
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * SPECIAL RATE
   * =====================================================
   */

  function startSpecialRate(
    member:
      MemberRecord
  ) {
    const current =
      getOverride(
        member.membership_id
      );


    setEditingMembershipId(
      member.membership_id
    );


    setSpecialFee(
      current
        ? String(
            current.special_fee
          )
        : ""
    );


    setSpecialFrom(
      current
        ?.effective_from ??
        todayString()
    );


    setSpecialUntil(
      current
        ?.effective_until ??
        ""
    );


    setSpecialReason(
      current
        ?.reason ??
        ""
    );
  }


  function closeSpecialRate() {
    setEditingMembershipId(
      null
    );

    setSpecialFee("");
    setSpecialUntil("");
    setSpecialReason("");
  }


  async function saveSpecialRate(
    member:
      MemberRecord
  ) {
    const fee =
      Number(
        specialFee
      );


    if (
      Number.isNaN(
        fee
      ) ||
      fee <
        0
    ) {
      showError(
        "Enter a valid special fee."
      );

      return;
    }


    if (
      !specialFrom
    ) {
      showError(
        "Select an effective start date."
      );

      return;
    }


    if (
      specialUntil &&
      specialUntil <
        specialFrom
    ) {
      showError(
        "The end date cannot be before the start date."
      );

      return;
    }


    setProcessing(
      `special:${member.membership_id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "set_member_subscription_rate",
        {
          target_membership_id:
            member.membership_id,

          new_fee:
            fee,

          rate_effective_from:
            specialFrom,

          rate_effective_until:
            specialUntil ||
            null,

          rate_reason:
            specialReason.trim() ||
            null,

          new_currency:
            "IDR",
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
      loadOverrides(),
      loadMonthlySummary(),
    ]);


    closeSpecialRate();


    showSuccess(
      `${member.full_name}'s special rate was updated.`
    );


    setProcessing(
      null
    );
  }


  async function removeSpecialRate(
    member:
      MemberRecord
  ) {
    const confirmed =
      window.confirm(
        `Remove the special rate for ${member.full_name}?\n\nThe member will return to the dojo default rate.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      `special:${member.membership_id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "remove_member_subscription_rate",
        {
          target_membership_id:
            member.membership_id,
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
      loadOverrides(),
      loadMonthlySummary(),
    ]);


    showSuccess(
      `${member.full_name}'s special rate was removed.`
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * MONTHLY BILLING / REMINDERS
   * =====================================================
   */

  async function generateChargesAndNotify() {
    if (
      !selectedDojoId ||
      !billingMonth
    ) {
      return;
    }


    const dojo =
      dojos.find(
        (
          item
        ) =>
          item.id ===
          selectedDojoId
      );


    const confirmed =
      window.confirm(
        `Generate ${formatMonth(
          billingMonth
        )} subscription charges for ${
          dojo?.name ??
          "this dojo"
        } and notify members?\n\nExisting charges and monthly notifications will not be duplicated.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      "generate"
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "generate_and_notify_monthly_subscriptions",
        {
          target_dojo_id:
            selectedDojoId,

          target_month:
            `${billingMonth}-01`,
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
      loadCharges(),
      loadPayments(),
      loadMonthlySummary(),
    ]);


    const result =
      (
        data ??
        {}
      ) as {
        generated?:
          number;

        notified?:
          number;
      };


    const generated =
      Number(
        result.generated ??
        0
      );


    const notified =
      Number(
        result.notified ??
        0
      );


    showSuccess(
      `${generated} new monthly charge${
        generated ===
        1
          ? ""
          : "s"
      } generated and ${notified} member notification${
        notified ===
        1
          ? ""
          : "s"
      } sent.`
    );


    setProcessing(
      null
    );
  }


  async function sendUnpaidReminders() {
    if (
      !selectedDojoId ||
      !billingMonth
    ) {
      return;
    }


    if (
      charges.length ===
      0
    ) {
      showError(
        "Generate the monthly charges before sending unpaid reminders."
      );

      return;
    }


    const dojo =
      dojos.find(
        (
          item
        ) =>
          item.id ===
          selectedDojoId
      );


    const confirmed =
      window.confirm(
        `Send unpaid subscription reminders for ${formatMonth(
          billingMonth
        )} to members of ${
          dojo?.name ??
          "this dojo"
        }?\n\nMembers who have fully paid will not receive a reminder.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessing(
      "reminders"
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "notify_unpaid_subscription_reminders",
        {
          target_dojo_id:
            selectedDojoId,

          target_month:
            `${billingMonth}-01`,
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


    const reminderCount =
      Number(
        data ??
        0
      );


    showSuccess(
      `${reminderCount} unpaid reminder${
        reminderCount ===
        1
          ? ""
          : "s"
      } sent.`
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * MANUAL PAYMENT
   * =====================================================
   */

  function startPayment(
    charge:
      SubscriptionCharge
  ) {
    const paid =
      totalPaidForCharge(
        charge.id
      );


    const remaining =
      Math.max(
        Number(
          charge.amount
        ) -
          paid,
        0
      );


    setPayingChargeId(
      charge.id
    );


    setPaymentAmount(
      String(
        remaining
      )
    );


    setPaymentMethod(
      "Cash"
    );


    setPaymentReference(
      ""
    );


    setPaymentDate(
      todayString()
    );


    setPaymentNotes(
      ""
    );
  }


  function closePayment() {
    setPayingChargeId(
      null
    );

    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNotes("");
  }


  async function recordPayment(
    charge:
      SubscriptionCharge
  ) {
    const amount =
      Number(
        paymentAmount
      );


    if (
      Number.isNaN(
        amount
      ) ||
      amount <=
        0
    ) {
      showError(
        "Enter a valid payment amount."
      );

      return;
    }


    if (
      !paymentDate
    ) {
      showError(
        "Select the payment date."
      );

      return;
    }


    setProcessing(
      `payment:${charge.id}`
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "record_membership_payment",
        {
          target_charge_id:
            charge.id,

          payment_amount:
            amount,

          payment_method_value:
            paymentMethod.trim() ||
            null,

          payment_reference_value:
            paymentReference.trim() ||
            null,

          payment_date_value:
            paymentDate,

          payment_notes:
            paymentNotes.trim() ||
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


    await Promise.all([
      loadCharges(),
      loadPayments(),
      loadMonthlySummary(),
    ]);


    closePayment();


    showSuccess(
      "Payment recorded successfully."
    );


    setProcessing(
      null
    );
  }


  /*
   * =====================================================
   * FINANCIAL REPORT
   * =====================================================
   */

  async function loadReport() {
    if (
      !selectedDojoId ||
      !billingMonth
    ) {
      setReportRows(
        []
      );

      return;
    }


    setProcessing(
      "report"
    );

    clearMessage();


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_dojo_financial_report",
        {
          target_dojo_id:
            selectedDojoId,

          report_month:
            `${billingMonth}-01`,
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


    setReportRows(
      (
        data ??
        []
      ) as
        FinancialReportRow[]
    );


    setProcessing(
      null
    );
  }


  function exportFinancialReport() {
    if (
      reportRows.length ===
      0
    ) {
      showError(
        "There is no financial report data to export."
      );

      return;
    }


    const dojoName =
      selectedDojo?.name ??
      "Dojo";


    exportToExcel({
      filename:
        `${dojoName}-${billingMonth}-Financial-Report`,

      sheetName:
        "Financial Report",

      title:
        `${dojoName} Financial Report - ${formatMonth(
          billingMonth
        )}`,

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
            "Billing Month",
          key:
            "billing_month",

          value:
            (
              row
            ) =>
              formatDate(
                row.billing_month
              ),
        },

        {
          header:
            "Charge",
          key:
            "charge_amount",
        },

        {
          header:
            "Paid",
          key:
            "paid_amount",
        },

        {
          header:
            "Outstanding",
          key:
            "outstanding_amount",
        },

        {
          header:
            "Currency",
          key:
            "currency",
        },

        {
          header:
            "Status",
          key:
            "payment_status",
        },

        {
          header:
            "Rate Type",

          key:
            "rate_source",

          value:
            (
              row
            ) =>
              row.rate_source ===
              "member_special"
                ? "Special Rate"
                : "Regular Rate",
        },
      ],

      data:
        reportRows,
    });
  }


  /*
   * =====================================================
   * TAB LOADERS
   * =====================================================
   */

  useEffect(() => {
    if (
      activeTab ===
        "confirmations" &&
      selectedDojoId
    ) {
      loadConfirmations(
        confirmationFilter
      );
    }
  }, [
    activeTab,
    selectedDojoId,
    confirmationFilter,
  ]);


  useEffect(() => {
    if (
      activeTab ===
        "report" &&
      selectedDojoId &&
      billingMonth
    ) {
      loadReport();
    }
  }, [
    activeTab,
    selectedDojoId,
    billingMonth,
  ]);


  /*
   * =====================================================
   * PAYMENT STATUS FILTER HELPERS
   * =====================================================
   */

  function hasPendingConfirmation(
    chargeId:
      string
  ) {
    return confirmations.some(
      (
        confirmation
      ) =>
        confirmation.charge_id ===
          chargeId &&
        confirmation.status ===
          "pending"
    );
  }


  /*
   * =====================================================
   * DERIVED DATA
   * =====================================================
   */

  const selectedDojo =
    dojos.find(
      (
        dojo
      ) =>
        dojo.id ===
        selectedDojoId
    );


  const selectedSetting =
    dojoSettings.find(
      (
        setting
      ) =>
        setting.dojo_id ===
          selectedDojoId &&
        setting.active
    );


  const dojoMembers =
    members.filter(
      (
        member
      ) =>
        member.dojo_id ===
        selectedDojoId
    );


  const filteredMembers =
    dojoMembers.filter(
      (
        member
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();


        if (
          !query
        ) {
          return true;
        }


        return [
          member.full_name,
          member.registration_number,
          member.email,
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
                  query
                )
          );
      }
    );


  const filteredCharges =
    charges.filter(
      (
        charge
      ) => {
        if (
          paymentStatusFilter ===
          "all"
        ) {
          return true;
        }


        const paid =
          totalPaidForCharge(
            charge.id
          );


        const outstanding =
          Math.max(
            Number(
              charge.amount
            ) -
              paid,
            0
          );


        const pending =
          hasPendingConfirmation(
            charge.id
          );


        if (
          paymentStatusFilter ===
          "paid"
        ) {
          return outstanding <=
            0;
        }


        if (
          paymentStatusFilter ===
          "pending"
        ) {
          return (
            outstanding >
              0 &&
            pending
          );
        }


        if (
          paymentStatusFilter ===
          "partial"
        ) {
          return (
            paid >
              0 &&
            outstanding >
              0 &&
            !pending
          );
        }


        if (
          paymentStatusFilter ===
          "unpaid"
        ) {
          return (
            paid <=
              0 &&
            outstanding >
              0 &&
            !pending
          );
        }


        if (
          paymentStatusFilter ===
          "special"
        ) {
          return (
            charge.rate_source ===
            "member_special"
          );
        }


        return true;
      }
    );


  const reportChargeTotal =
    reportRows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.charge_amount
        ),
      0
    );


  const reportPaidTotal =
    reportRows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.paid_amount
        ),
      0
    );


  const reportOutstandingTotal =
    reportRows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.outstanding_amount
        ),
      0
    );


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
          Loading dojo finances...
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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
                Private Dojo Finance
              </p>


              <h1 className="text-3xl font-bold">
                Subscription & Payments
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Manage subscriptions, member payments and financial reports for your assigned dojos.
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


        {/* ACCESS NOTICE */}

        <section className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/10 p-4">

          <p className="text-sm text-emerald-200">
            Financial access is based on your Dojo Admin assignment. Super Admin status alone does not grant access to this page.
          </p>


          {profile
            ?.is_super_admin && (

            <p className="mt-2 text-xs text-neutral-500">
              This account is also a Super Admin, but you are viewing this finance area through your Dojo Admin assignment.
            </p>

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


        {/* DOJO / MONTH */}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">

          <div className="grid gap-4 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium">
                Dojo
              </label>


              <select
                value={
                  selectedDojoId
                }
                onChange={(e) => {
                  setSelectedDojoId(
                    e.target.value
                  );

                  setEditingMembershipId(
                    null
                  );

                  setPayingChargeId(
                    null
                  );
                }}
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
                Billing Month
              </label>


              <input
                type="month"
                value={
                  billingMonth
                }
                onChange={(e) =>
                  setBillingMonth(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3"
              />

            </div>

          </div>

        </section>


        {/* MONTHLY DASHBOARD */}

        {monthlySummary && (

          <section className="mt-6">

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                    Monthly Overview
                  </p>


                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedDojo
                      ?.name ??
                      "Dojo"}
                  </h2>


                  <p className="mt-1 text-sm text-neutral-500">
                    {formatMonth(
                      billingMonth
                    )}
                  </p>

                </div>


                <p className="text-xs text-neutral-600">
                  Paid status reflects approved/recorded payments only.
                </p>

              </div>


              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                <DashboardStat
                  label="Members"
                  value={
                    String(
                      monthlySummary.total_members
                    )
                  }
                  active={
                    paymentStatusFilter ===
                    "all"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "all"
                    )
                  }
                />


                <DashboardStat
                  label="Paid"
                  value={
                    String(
                      monthlySummary.paid_members
                    )
                  }
                  tone="green"
                  active={
                    paymentStatusFilter ===
                    "paid"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "paid"
                    )
                  }
                />


                <DashboardStat
                  label="Pending"
                  value={
                    String(
                      monthlySummary.pending_confirmation_members
                    )
                  }
                  tone="sky"
                  active={
                    paymentStatusFilter ===
                    "pending"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "pending"
                    )
                  }
                />


                <DashboardStat
                  label="Partially Paid"
                  value={
                    String(
                      monthlySummary.partially_paid_members
                    )
                  }
                  tone="amber"
                  active={
                    paymentStatusFilter ===
                    "partial"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "partial"
                    )
                  }
                />


                <DashboardStat
                  label="Unpaid"
                  value={
                    String(
                      monthlySummary.unpaid_members
                    )
                  }
                  tone="red"
                  active={
                    paymentStatusFilter ===
                    "unpaid"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "unpaid"
                    )
                  }
                />


                <DashboardStat
                  label="Special Rate"
                  value={
                    String(
                      monthlySummary.special_rate_members
                    )
                  }
                  tone="purple"
                  active={
                    paymentStatusFilter ===
                    "special"
                  }
                  onClick={() =>
                    setPaymentStatusFilter(
                      "special"
                    )
                  }
                />

              </div>


              <div className="mt-4 grid gap-3 md:grid-cols-3">

                <DashboardMoney
                  label="Total Charged"
                  value={
                    formatCurrency(
                      monthlySummary.total_charged
                    )
                  }
                />


                <DashboardMoney
                  label="Total Collected"
                  value={
                    formatCurrency(
                      monthlySummary.total_collected
                    )
                  }
                  tone="green"
                />


                <DashboardMoney
                  label="Outstanding"
                  value={
                    formatCurrency(
                      monthlySummary.total_outstanding
                    )
                  }
                  tone="red"
                />

              </div>

            </div>

          </section>

        )}


        {/* TABS */}

        <section className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

          <TabButton
            label="Rates"
            active={
              activeTab ===
              "rates"
            }
            onClick={() =>
              setActiveTab(
                "rates"
              )
            }
          />


          <TabButton
            label="Payments"
            active={
              activeTab ===
              "payments"
            }
            onClick={() =>
              setActiveTab(
                "payments"
              )
            }
          />


          <TabButton
            label="Payment Confirmations"
            active={
              activeTab ===
              "confirmations"
            }
            onClick={() =>
              setActiveTab(
                "confirmations"
              )
            }
          />


          <TabButton
            label="Financial Report"
            active={
              activeTab ===
              "report"
            }
            onClick={() =>
              setActiveTab(
                "report"
              )
            }
          />

        </section>


        {/* =================================================
            RATES TAB
        ================================================= */}

        {activeTab ===
          "rates" && (

          <section className="mt-6 space-y-6">

            <article className="rounded-2xl border border-purple-900 bg-purple-950/10 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Regular Rate
              </p>


              <h2 className="mt-1 text-2xl font-bold">
                {selectedDojo
                  ?.name ??
                  "Dojo"}{" "}
                Subscription Fee
              </h2>


              <p className="mt-2 text-sm text-neutral-400">
                This is the regular monthly rate used by members without an individual special rate.
              </p>


              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">

                <Field
                  label="Monthly Fee"
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      dojoFeeDraft
                    }
                    onChange={(e) =>
                      setDojoFeeDraft(
                        e.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>


                <Field
                  label="Effective From"
                >
                  <input
                    type="date"
                    value={
                      dojoFeeDate
                    }
                    onChange={(e) =>
                      setDojoFeeDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>


                <button
                  type="button"
                  disabled={
                    processing ===
                    "dojo-rate"
                  }
                  onClick={
                    saveDojoRate
                  }
                  className="rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500 disabled:opacity-50"
                >
                  {processing ===
                  "dojo-rate"
                    ? "Saving..."
                    : "Save Regular Rate"}
                </button>

              </div>


              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">

                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Current Regular Rate
                </p>


                <p className="mt-2 text-xl font-bold">
                  {selectedSetting
                    ? formatCurrency(
                        Number(
                          selectedSetting.default_fee
                        ),
                        selectedSetting.currency
                      )
                    : "Not configured"}
                </p>


                {selectedSetting && (

                  <p className="mt-1 text-xs text-neutral-500">
                    Effective from{" "}
                    {formatDate(
                      selectedSetting.effective_from
                    )}
                  </p>

                )}

              </div>

            </article>


            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Individual Rates
                  </p>


                  <h2 className="mt-1 text-2xl font-bold">
                    Member Special Rates
                  </h2>


                  <p className="mt-2 text-sm text-neutral-400">
                    Members without a special rate automatically use the regular dojo rate.
                  </p>

                </div>


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
                  placeholder="Search member"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 sm:max-w-xs"
                />

              </div>


              <div className="mt-5 space-y-3">

                {filteredMembers.map(
                  (
                    member
                  ) => {

                    const override =
                      getOverride(
                        member.membership_id
                      );


                    const editing =
                      editingMembershipId ===
                      member.membership_id;


                    const key =
                      `special:${member.membership_id}`;


                    return (
                      <div
                        key={
                          member.membership_id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                          <div>

                            <p className="font-semibold">
                              {member.full_name}
                            </p>


                            <p className="mt-1 text-xs text-neutral-500">
                              Member ID:{" "}
                              {member.registration_number ??
                                "Not assigned"}
                            </p>


                            {override ? (

                              <div className="mt-3">

                                <p className="font-semibold text-amber-300">
                                  {formatCurrency(
                                    Number(
                                      override.special_fee
                                    ),
                                    override.currency
                                  )}{" "}
                                  / month
                                </p>


                                <p className="mt-1 text-xs text-neutral-500">
                                  Effective{" "}
                                  {formatDate(
                                    override.effective_from
                                  )}
                                  {override.effective_until
                                    ? ` to ${formatDate(
                                        override.effective_until
                                      )}`
                                    : ""}
                                </p>


                                {override.reason && (

                                  <p className="mt-1 text-xs text-neutral-500">
                                    Reason:{" "}
                                    {override.reason}
                                  </p>

                                )}

                              </div>

                            ) : (

                              <p className="mt-3 text-sm text-neutral-500">
                                Uses regular dojo rate
                              </p>

                            )}

                          </div>


                          {!editing && (

                            <div className="flex flex-wrap gap-2">

                              <button
                                type="button"
                                disabled={
                                  processing ===
                                  key
                                }
                                onClick={() =>
                                  startSpecialRate(
                                    member
                                  )
                                }
                                className="rounded-lg border border-amber-800 px-4 py-2 text-sm text-amber-300 hover:bg-amber-950/30 disabled:opacity-50"
                              >
                                {override
                                  ? "Edit Special Rate"
                                  : "Set Special Rate"}
                              </button>


                              {override && (

                                <button
                                  type="button"
                                  disabled={
                                    processing ===
                                    key
                                  }
                                  onClick={() =>
                                    removeSpecialRate(
                                      member
                                    )
                                  }
                                  className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                                >
                                  Remove
                                </button>

                              )}

                            </div>

                          )}

                        </div>


                        {editing && (

                          <div className="mt-5 grid gap-4 border-t border-neutral-800 pt-5 lg:grid-cols-2">

                            <Field
                              label="Special Monthly Fee"
                            >
                              <input
                                type="number"
                                min="0"
                                value={
                                  specialFee
                                }
                                onChange={(e) =>
                                  setSpecialFee(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Effective From"
                            >
                              <input
                                type="date"
                                value={
                                  specialFrom
                                }
                                onChange={(e) =>
                                  setSpecialFrom(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Effective Until"
                            >
                              <input
                                type="date"
                                value={
                                  specialUntil
                                }
                                onChange={(e) =>
                                  setSpecialUntil(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Reason"
                            >
                              <input
                                value={
                                  specialReason
                                }
                                onChange={(e) =>
                                  setSpecialReason(
                                    e.target.value
                                  )
                                }
                                placeholder="Optional"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <div className="flex flex-wrap gap-2 lg:col-span-2">

                              <button
                                type="button"
                                disabled={
                                  processing ===
                                  key
                                }
                                onClick={() =>
                                  saveSpecialRate(
                                    member
                                  )
                                }
                                className="rounded-lg bg-amber-600 px-5 py-2 font-semibold hover:bg-amber-500 disabled:opacity-50"
                              >
                                {processing ===
                                key
                                  ? "Saving..."
                                  : "Save Special Rate"}
                              </button>


                              <button
                                type="button"
                                disabled={
                                  processing ===
                                  key
                                }
                                onClick={
                                  closeSpecialRate
                                }
                                className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 hover:bg-neutral-800"
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        )}

                      </div>
                    );
                  }
                )}


                {filteredMembers.length ===
                  0 && (

                  <p className="rounded-xl border border-neutral-800 p-6 text-center text-neutral-500">
                    No members found.
                  </p>

                )}

              </div>

            </article>

          </section>

        )}


        {/* =================================================
            PAYMENTS TAB
        ================================================= */}

        {activeTab ===
          "payments" && (

          <section className="mt-6 space-y-5">

            <article className="rounded-2xl border border-sky-900 bg-sky-950/10 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Receiving Account
              </p>


              <h2 className="mt-1 text-2xl font-bold">
                Member Transfer Destination
              </h2>


              <p className="mt-2 text-sm text-neutral-400">
                Members will see this account when they press “I Have Paid”.
              </p>


              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <Field
                  label="Bank / Payment Channel"
                >
                  <input
                    value={
                      bankName
                    }
                    onChange={(e) =>
                      setBankName(
                        e.target.value
                      )
                    }
                    placeholder="Example: BCA"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>


                <Field
                  label="Account Holder"
                >
                  <input
                    value={
                      accountHolderName
                    }
                    onChange={(e) =>
                      setAccountHolderName(
                        e.target.value
                      )
                    }
                    placeholder="Account holder name"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>


                <Field
                  label="Account Number"
                >
                  <input
                    value={
                      accountNumber
                    }
                    onChange={(e) =>
                      setAccountNumber(
                        e.target.value
                      )
                    }
                    placeholder="Account number"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>


                <Field
                  label="Instructions"
                >
                  <input
                    value={
                      accountInstructions
                    }
                    onChange={(e) =>
                      setAccountInstructions(
                        e.target.value
                      )
                    }
                    placeholder="Optional payment instructions"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                  />
                </Field>

              </div>


              <div className="mt-5 flex flex-wrap items-center gap-3">

                <button
                  type="button"
                  disabled={
                    processing ===
                    "receiving-account"
                  }
                  onClick={
                    saveReceivingAccount
                  }
                  className="rounded-lg bg-sky-600 px-5 py-3 font-semibold hover:bg-sky-500 disabled:opacity-50"
                >
                  {processing ===
                  "receiving-account"
                    ? "Saving..."
                    : receivingAccount
                    ? "Update Receiving Account"
                    : "Save Receiving Account"}
                </button>


                {receivingAccount && (

                  <span className="text-sm text-green-300">
                    Active receiving account configured
                  </span>

                )}

              </div>

            </article>


            <article className="rounded-2xl border border-green-900 bg-green-950/10 p-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                Monthly Billing
              </p>


              <h2 className="mt-1 text-2xl font-bold">
                {formatMonth(
                  billingMonth
                )} Charges
              </h2>


              <p className="mt-2 text-sm text-neutral-400">
                Generate the monthly charge snapshot and notify members. The automatic monthly process can coexist with these manual controls.
              </p>


              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={
                    processing ===
                      "generate" ||
                    processing ===
                      "reminders"
                  }
                  onClick={
                    generateChargesAndNotify
                  }
                  className="rounded-lg bg-green-600 px-6 py-3 font-semibold hover:bg-green-500 disabled:opacity-50"
                >
                  {processing ===
                  "generate"
                    ? "Generating & Notifying..."
                    : "Generate Charges & Notify Members"}
                </button>


                <button
                  type="button"
                  disabled={
                    processing ===
                      "generate" ||
                    processing ===
                      "reminders" ||
                    charges.length ===
                      0
                  }
                  onClick={
                    sendUnpaidReminders
                  }
                  className="rounded-lg border border-amber-800 px-6 py-3 font-semibold text-amber-300 hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing ===
                  "reminders"
                    ? "Sending Reminders..."
                    : "Send Unpaid Reminder"}
                </button>

              </div>

            </article>


            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <h2 className="text-2xl font-bold">
                Member Payments
              </h2>


              <p className="mt-2 text-sm text-neutral-400">
                Record full or partial payments against each monthly charge.
              </p>


              <div className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-semibold">
                    Payment Status Filter
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Click a Monthly Overview card above to filter this list.
                  </p>

                </div>


                <div className="flex flex-wrap items-center gap-2">

                  <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-semibold uppercase text-neutral-300">
                    {paymentStatusFilter === "all"
                      ? "ALL"
                      : paymentStatusFilter === "partial"
                      ? "PARTIALLY PAID"
                      : paymentStatusFilter === "special"
                      ? "SPECIAL RATE"
                      : paymentStatusFilter.toUpperCase()}
                  </span>


                  {paymentStatusFilter !==
                    "all" && (

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentStatusFilter(
                          "all"
                        )
                      }
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                      Clear Filter
                    </button>

                  )}

                </div>

              </div>


              <div className="mt-5 space-y-3">

                {filteredCharges.map(
                  (
                    charge
                  ) => {

                    const member =
                      getMember(
                        charge.membership_id
                      );


                    const paid =
                      totalPaidForCharge(
                        charge.id
                      );


                    const outstanding =
                      Math.max(
                        Number(
                          charge.amount
                        ) -
                          paid,
                        0
                      );


                    const paying =
                      payingChargeId ===
                      charge.id;


                    const key =
                      `payment:${charge.id}`;


                    return (
                      <div
                        key={
                          charge.id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
                      >

                        <div className="grid gap-4 lg:grid-cols-[1fr_170px_170px_auto] lg:items-center">

                          <div>

                            <p className="font-semibold">
                              {member?.full_name ??
                                "Member"}
                            </p>


                            <p className="mt-1 text-xs text-neutral-500">
                              Member ID:{" "}
                              {member?.registration_number ??
                                "Not assigned"}
                            </p>


                            <div className="mt-2 flex flex-wrap gap-2">

                              <StatusBadge
                                status={
                                  outstanding <=
                                  0
                                    ? "paid"
                                    : paid >
                                      0
                                    ? "partial"
                                    : "unpaid"
                                }
                              />


                              {charge.rate_source ===
                                "member_special" && (

                                <span className="rounded-full border border-purple-800 bg-purple-950/30 px-2 py-1 text-[10px] font-semibold text-purple-300">
                                  SPECIAL RATE
                                </span>

                              )}

                            </div>

                          </div>


                          <MoneyBlock
                            label="Charge"
                            value={
                              formatCurrency(
                                Number(
                                  charge.amount
                                ),
                                charge.currency
                              )
                            }
                          />


                          <MoneyBlock
                            label="Outstanding"
                            value={
                              formatCurrency(
                                outstanding,
                                charge.currency
                              )
                            }
                          />


                          <button
                            type="button"
                            disabled={
                              outstanding <=
                              0
                            }
                            onClick={() =>
                              startPayment(
                                charge
                              )
                            }
                            className="rounded-lg border border-green-800 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Record Payment
                          </button>

                        </div>


                        {paying && (

                          <div className="mt-5 grid gap-4 border-t border-neutral-800 pt-5 md:grid-cols-2">

                            <Field
                              label="Amount"
                            >
                              <input
                                type="number"
                                min="0"
                                value={
                                  paymentAmount
                                }
                                onChange={(e) =>
                                  setPaymentAmount(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Payment Method"
                            >
                              <input
                                value={
                                  paymentMethod
                                }
                                onChange={(e) =>
                                  setPaymentMethod(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Payment Reference"
                            >
                              <input
                                value={
                                  paymentReference
                                }
                                onChange={(e) =>
                                  setPaymentReference(
                                    e.target.value
                                  )
                                }
                                placeholder="Optional"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <Field
                              label="Payment Date"
                            >
                              <input
                                type="date"
                                value={
                                  paymentDate
                                }
                                onChange={(e) =>
                                  setPaymentDate(
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />
                            </Field>


                            <div className="md:col-span-2">

                              <Field
                                label="Notes"
                              >
                                <textarea
                                  rows={3}
                                  value={
                                    paymentNotes
                                  }
                                  onChange={(e) =>
                                    setPaymentNotes(
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                                />
                              </Field>

                            </div>


                            <div className="flex flex-wrap gap-2 md:col-span-2">

                              <button
                                type="button"
                                disabled={
                                  processing ===
                                  key
                                }
                                onClick={() =>
                                  recordPayment(
                                    charge
                                  )
                                }
                                className="rounded-lg bg-green-600 px-5 py-2 font-semibold hover:bg-green-500 disabled:opacity-50"
                              >
                                {processing ===
                                key
                                  ? "Saving..."
                                  : "Save Payment"}
                              </button>


                              <button
                                type="button"
                                disabled={
                                  processing ===
                                  key
                                }
                                onClick={
                                  closePayment
                                }
                                className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 hover:bg-neutral-800"
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        )}

                      </div>
                    );
                  }
                )}


                {filteredCharges.length ===
                  0 && (

                  <div className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-500">
                    {charges.length ===
                    0
                      ? `No subscription charges exist for ${formatMonth(
                          billingMonth
                        )}.`
                      : "No members match the selected payment status filter."}
                  </div>

                )}

              </div>

            </article>

          </section>

        )}


        {/* =================================================
            PAYMENT CONFIRMATIONS
        ================================================= */}

        {activeTab ===
          "confirmations" && (

          <section className="mt-6">

            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Member Submissions
                  </p>


                  <h2 className="mt-1 text-2xl font-bold">
                    Payment Confirmations
                  </h2>


                  <p className="mt-2 text-sm text-neutral-400">
                    Approving creates the official payment record. Declined confirmations can be submitted again by the Member.
                  </p>

                </div>


                <select
                  value={
                    confirmationFilter
                  }
                  onChange={(e) =>
                    setConfirmationFilter(
                      e.target.value as
                        | "pending"
                        | "approved"
                        | "rejected"
                        | "all"
                    )
                  }
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2"
                >

                  <option value="pending">
                    Pending
                  </option>

                  <option value="approved">
                    Approved
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>

                  <option value="all">
                    All
                  </option>

                </select>

              </div>


              <div className="mt-5 space-y-3">

                {confirmations.map(
                  (
                    confirmation
                  ) => {

                    const reviewing =
                      processing ===
                      `confirmation:${confirmation.confirmation_id}`;


                    return (
                      <div
                        key={
                          confirmation.confirmation_id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-semibold">
                                {confirmation.member_name}
                              </p>


                              <ConfirmationBadge
                                status={
                                  confirmation.status
                                }
                              />

                            </div>


                            <p className="mt-1 text-xs text-neutral-500">
                              Member ID:{" "}
                              {confirmation.member_id ??
                                "Not assigned"}
                            </p>


                            <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">

                              <p>
                                <span className="text-neutral-500">
                                  Billing:
                                </span>{" "}
                                {formatDate(
                                  confirmation.billing_month
                                )}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Charge:
                                </span>{" "}
                                {formatCurrency(
                                  Number(
                                    confirmation.charge_amount
                                  ),
                                  confirmation.currency
                                )}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Transferred:
                                </span>{" "}
                                {formatCurrency(
                                  Number(
                                    confirmation.transferred_amount
                                  ),
                                  confirmation.currency
                                )}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Method:
                                </span>{" "}
                                {confirmation.payment_method}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Transfer Date:
                                </span>{" "}
                                {formatDate(
                                  confirmation.transfer_date
                                )}
                              </p>


                              <p>
                                <span className="text-neutral-500">
                                  Submitted:
                                </span>{" "}
                                {formatDateTime(
                                  confirmation.created_at
                                )}
                              </p>

                            </div>


                            {confirmation.member_note && (

                              <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300">
                                Note:{" "}
                                {confirmation.member_note}
                              </p>

                            )}


                            {confirmation.rejection_reason && (

                              <p className="mt-3 rounded-lg border border-red-900 bg-red-950/20 p-3 text-sm text-red-200">
                                Decline reason:{" "}
                                {confirmation.rejection_reason}
                              </p>

                            )}

                          </div>


                          {confirmation.status ===
                            "pending" && (

                            <div className="flex shrink-0 flex-wrap gap-2">

                              <button
                                type="button"
                                disabled={
                                  reviewing
                                }
                                onClick={() =>
                                  reviewConfirmation(
                                    confirmation,
                                    "approved"
                                  )
                                }
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
                              >
                                {reviewing
                                  ? "Processing..."
                                  : "Approve"}
                              </button>


                              <button
                                type="button"
                                disabled={
                                  reviewing
                                }
                                onClick={() =>
                                  reviewConfirmation(
                                    confirmation,
                                    "rejected"
                                  )
                                }
                                className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                              >
                                Decline
                              </button>

                            </div>

                          )}

                        </div>

                      </div>
                    );
                  }
                )}


                {confirmations.length ===
                  0 && (

                  <div className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-500">
                    No payment confirmations found for this filter.
                  </div>

                )}

              </div>

            </article>

          </section>

        )}


        {/* =================================================
            FINANCIAL REPORT
        ================================================= */}

        {activeTab ===
          "report" && (

          <section className="mt-6 space-y-5">

            <div className="grid gap-4 sm:grid-cols-3">

              <FinanceSummary
                label="Total Charged"
                value={
                  formatCurrency(
                    reportChargeTotal
                  )
                }
              />


              <FinanceSummary
                label="Total Received"
                value={
                  formatCurrency(
                    reportPaidTotal
                  )
                }
                tone="green"
              />


              <FinanceSummary
                label="Outstanding"
                value={
                  formatCurrency(
                    reportOutstandingTotal
                  )
                }
                tone="red"
              />

            </div>


            <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Private Financial Report
                  </p>


                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedDojo
                      ?.name ??
                      "Dojo"}
                  </h2>


                  <p className="mt-1 text-sm text-neutral-500">
                    Billing month:{" "}
                    {formatMonth(
                      billingMonth
                    )}
                  </p>

                </div>


                <div className="flex flex-wrap gap-2">

                  <button
                    type="button"
                    disabled={
                      reportRows.length ===
                      0
                    }
                    onClick={
                      exportFinancialReport
                    }
                    className="rounded-lg border border-green-800 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:opacity-40"
                  >
                    Export Excel
                  </button>


                  <button
                    type="button"
                    disabled={
                      processing ===
                      "report"
                    }
                    onClick={
                      loadReport
                    }
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {processing ===
                    "report"
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>

                </div>

              </div>


              <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-800">

                <table className="min-w-full text-left text-sm">

                  <thead className="bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500">

                    <tr>
                      <th className="px-4 py-3">
                        Member
                      </th>

                      <th className="px-4 py-3">
                        Rate
                      </th>

                      <th className="px-4 py-3">
                        Charged
                      </th>

                      <th className="px-4 py-3">
                        Paid
                      </th>

                      <th className="px-4 py-3">
                        Outstanding
                      </th>

                      <th className="px-4 py-3">
                        Status
                      </th>
                    </tr>

                  </thead>


                  <tbody className="divide-y divide-neutral-800">

                    {reportRows.map(
                      (
                        row
                      ) => (

                        <tr
                          key={
                            row.membership_id
                          }
                          className="bg-neutral-900/60"
                        >

                          <td className="px-4 py-4">

                            <p className="font-semibold">
                              {row.member_name}
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              {row.member_id ??
                                "No Member ID"}
                            </p>

                          </td>


                          <td className="px-4 py-4">

                            {row.rate_source ===
                            "member_special" ? (

                              <span className="rounded-full border border-purple-800 bg-purple-950/30 px-2 py-1 text-xs text-purple-300">
                                Special
                              </span>

                            ) : (

                              <span className="text-neutral-400">
                                Regular
                              </span>

                            )}

                          </td>


                          <td className="px-4 py-4 font-medium">
                            {formatCurrency(
                              Number(
                                row.charge_amount
                              ),
                              row.currency
                            )}
                          </td>


                          <td className="px-4 py-4 text-green-300">
                            {formatCurrency(
                              Number(
                                row.paid_amount
                              ),
                              row.currency
                            )}
                          </td>


                          <td className="px-4 py-4 text-red-300">
                            {formatCurrency(
                              Number(
                                row.outstanding_amount
                              ),
                              row.currency
                            )}
                          </td>


                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                Number(
                                  row.outstanding_amount
                                ) <=
                                0
                                  ? "paid"
                                  : Number(
                                      row.paid_amount
                                    ) >
                                    0
                                  ? "partial"
                                  : "unpaid"
                              }
                            />
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>


                {reportRows.length ===
                  0 && (

                  <div className="p-8 text-center text-neutral-500">
                    No financial report data for this month.
                  </div>

                )}

              </div>

            </article>

          </section>

        )}

      </div>

    </main>
  );
}


/*
 * =====================================================
 * COMPONENTS
 * =====================================================
 */


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
          ? "border-emerald-700 bg-emerald-950/30 text-emerald-300"
          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {label}
    </button>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      {children}

    </label>
  );
}


function DashboardStat({
  label,
  value,
  tone =
    "neutral",
  active =
    false,
  onClick,
}: {
  label: string;
  value: string;

  tone?:
    | "neutral"
    | "green"
    | "sky"
    | "amber"
    | "red"
    | "purple";

  active?:
    boolean;

  onClick?:
    () => void;
}) {
  const style =
    tone ===
    "green"
      ? "border-green-900 bg-green-950/20 text-green-300"
      : tone ===
        "sky"
      ? "border-sky-900 bg-sky-950/20 text-sky-300"
      : tone ===
        "amber"
      ? "border-amber-900 bg-amber-950/20 text-amber-300"
      : tone ===
        "red"
      ? "border-red-900 bg-red-950/20 text-red-300"
      : tone ===
        "purple"
      ? "border-purple-900 bg-purple-950/20 text-purple-300"
      : "border-neutral-800 bg-neutral-950/50 text-white";


  const activeStyle =
    active
      ? "ring-2 ring-white/70 ring-offset-2 ring-offset-neutral-900"
      : "";


  if (
    onClick
  ) {
    return (
      <button
        type="button"
        onClick={
          onClick
        }
        aria-pressed={
          active
        }
        className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110 ${style} ${activeStyle}`}
      >

        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
          {label}
        </p>


        <p className="mt-2 text-3xl font-bold">
          {value}
        </p>

      </button>
    );
  }


  return (
    <div
      className={`rounded-xl border p-4 ${style} ${activeStyle}`}
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


function DashboardMoney({
  label,
  value,
  tone =
    "neutral",
}: {
  label: string;
  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red";
}) {
  const style =
    tone ===
    "green"
      ? "border-green-900 bg-green-950/20"
      : tone ===
        "red"
      ? "border-red-900 bg-red-950/20"
      : "border-neutral-800 bg-neutral-950/50";


  return (
    <div
      className={`rounded-xl border p-5 ${style}`}
    >

      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>


      <p className="mt-2 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}


function FinanceSummary({
  label,
  value,
  tone =
    "neutral",
}: {
  label: string;
  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red";
}) {
  return (
    <DashboardMoney
      label={
        label
      }
      value={
        value
      }
      tone={
        tone
      }
    />
  );
}


function MoneyBlock({
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


function StatusBadge({
  status,
}: {
  status:
    | "paid"
    | "partial"
    | "unpaid";
}) {
  const style =
    status ===
    "paid"
      ? "border-green-800 bg-green-950/30 text-green-300"
      : status ===
        "partial"
      ? "border-amber-800 bg-amber-950/30 text-amber-300"
      : "border-red-800 bg-red-950/30 text-red-300";


  const label =
    status ===
    "paid"
      ? "PAID"
      : status ===
        "partial"
      ? "PARTIAL"
      : "UNPAID";


  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${style}`}
    >
      {label}
    </span>
  );
}


function ConfirmationBadge({
  status,
}: {
  status:
    | "pending"
    | "approved"
    | "rejected";
}) {
  const style =
    status ===
    "approved"
      ? "border-green-800 bg-green-950/30 text-green-300"
      : status ===
        "pending"
      ? "border-sky-800 bg-sky-950/30 text-sky-300"
      : "border-red-800 bg-red-950/30 text-red-300";


  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${style}`}
    >
      {status}
    </span>
  );
}

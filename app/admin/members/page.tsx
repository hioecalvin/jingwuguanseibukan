"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  formatDateTime,
} from "@/lib/format-date";
import {
  exportToExcel,
} from "@/lib/exportExcel";
import MemberRecordPDF, {
  AuditInfo,
  OfficialRecord,
} from "@/components/MemberRecordPDF";

import GradeCertificatePDF, {
  CertificateAudit,
  CertificateRecord,
} from "@/components/GradeCertificatePDF";

import TitleCertificatePDF, {
  TitleCertificateAudit,
  TitleCertificateRecord,
} from "@/components/TitleCertificatePDF";

import DeceasedMemorialPanel, {
  MemorialDraft,
} from "./DeceasedMemorialPanel";


type Member = {
  membership_id: string;
  user_id: string;

  registration_number: string | null;

  aikikai_registration_number: string | null;

  full_name: string;

  email: string;
  phone: string;

  whatsapp_number: string | null;
  avatar_url: string | null;

  date_of_birth: string | null;

  date_of_passing: string | null;
  account_status: "active" | "disabled";

  class_id: string;
  class_name: string;

  dojo_id: string | null;
  dojo_name: string | null;

  membership_status:
    | "active"
    | "break_1"
    | "break_2"
    | "inactive";

  break_count: number;

  level:
    | "mudansha"
    | "yudansha";

  /*
   * Legacy database field.
   * Not used for Admin permissions anymore.
   */
  role:
    | "user"
    | "admin";

  rank_id: string | null;
  rank_name: string | null;

  sub_rank_id: string | null;
  sub_rank_name: string | null;

  joined_date: string | null;

  last_grading_date: string | null;

  /*
   * OPTIONAL TITLE APPOINTMENT
   *
   * Most Members will have:
   * title_level = null
   * title_name = null
   *
   * The title system comes from the class:
   * japanese → Fuku Kiyoshi / Kiyoshi / Daishi
   * chinese  → Fujiaoshi / Jiaoshi / Dashi
   * none     → no title system
   */
  title_system:
    | "japanese"
    | "chinese"
    | "none"
    | null;

  title_level: number | null;
  title_name: string | null;

  has_admin_access: boolean;

  /*
   * Super Admin controlled flag.
   * Active assessors can be selected for Mudansha grading.
   */
  is_grading_assessor: boolean;
};


type NextPromotion = {
  next_rank_id: string;
  next_rank_name: string;

  next_sub_rank_id: string;
  next_sub_rank_name: string;

  next_level:
    | "mudansha"
    | "yudansha";

  is_rank_promotion: boolean;
};


type GradingAssessor = {
  member_id: string;
  full_name: string;
};


type TitleHistoryItem = {
  history_id: string;
  membership_id: string;
  title_level: number;
  title_name: string | null;
  effective_date: string;
  granted_by: string | null;
  granted_by_name: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_by_name: string | null;
  revoke_reason: string | null;
};


type GradeHistoryItem = {
  id: string;

  effective_date: string;

  rank_id: string | null;
  rank_name: string | null;

  sub_rank_id: string | null;
  sub_rank_name: string | null;

  created_at: string;
  created_by: string | null;

  revoked_at: string | null;
  revoked_by: string | null;

  revoke_reason: string | null;

  assessor_type:
    | "member"
    | "external"
    | null;

  assessor_member_id: string | null;

  assessor_name_snapshot: string | null;
};


type AvailableDojoAdminAssignment = {
  class_id: string;
  class_name: string;

  dojo_id: string;
  dojo_name: string;

  member_dojo_id: string | null;

  is_member_dojo: boolean;

  is_admin: boolean;
};


type FeeAdjustmentMode =
  | "this_month_only"
  | "this_month_onward"
  | "next_month_onward";


type SubscriptionSummary = {
  membership_id: string;
  billing_month: string;
  current_rate: number;
  current_rate_currency: string;
  current_rate_source: string;
  charge_id: string | null;
  charge_amount: number | null;
  charge_currency: string | null;
  charge_status: string | null;
  total_paid: number;
  remaining_balance: number | null;
  has_pending_confirmation: boolean;
  special_rate_amount: number | null;
  special_rate_currency: string | null;
  special_rate_effective_from: string | null;
  special_rate_effective_until: string | null;
  can_adjust_current_month: boolean;
};


type MessageType =
  | "success"
  | "error"
  | "";


export default function MemberManagementPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const router =
    useRouter();


  const [
    isSuperAdmin,
    setIsSuperAdmin,
  ] =
    useState(false);


  const [
    members,
    setMembers,
  ] =
    useState<Member[]>([]);


  const [
    nextPromotions,
    setNextPromotions,
  ] =
    useState<
      Record<
        string,
        NextPromotion | null
      >
    >({});


  const [
    promotionDates,
    setPromotionDates,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    gradingAssessors,
    setGradingAssessors,
  ] =
    useState<
      GradingAssessor[]
    >([]);


  const [
    selectedAssessors,
    setSelectedAssessors,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    externalAssessorNames,
    setExternalAssessorNames,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    titleManageOpen,
    setTitleManageOpen,
  ] =
    useState<Record<string, boolean>>({});


  const [
    titleLevelDraft,
    setTitleLevelDraft,
  ] =
    useState<Record<string, string>>({});


  const [
    titleDateDraft,
    setTitleDateDraft,
  ] =
    useState<Record<string, string>>({});


  const [
    titleHistory,
    setTitleHistory,
  ] =
    useState<Record<string, TitleHistoryItem[]>>({});


  const [
    titleHistoryOpen,
    setTitleHistoryOpen,
  ] =
    useState<Record<string, boolean>>({});


  const [
    gradeHistory,
    setGradeHistory,
  ] =
    useState<
      Record<
        string,
        GradeHistoryItem[]
      >
    >({});


  const [
    openHistory,
    setOpenHistory,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    undoOpen,
    setUndoOpen,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    undoReasons,
    setUndoReasons,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    joinedDateEditing,
    setJoinedDateEditing,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    joinedDateDraft,
    setJoinedDateDraft,
  ] =
    useState<
      Record<string, string>
    >({});


  /*
   * ADMIN ACCESS
   *
   * One RPC only:
   * get_available_dojo_admin_assignments()
   *
   * option.is_admin is the current source of truth.
   */

  const [
    aikikaiEditing,
    setAikikaiEditing,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    aikikaiDraft,
    setAikikaiDraft,
  ] =
    useState<
      Record<string, string>
    >({});


  const [
    adminAccessOpen,
    setAdminAccessOpen,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    adminAccessOptions,
    setAdminAccessOptions,
  ] =
    useState<
      Record<
        string,
        AvailableDojoAdminAssignment[]
      >
    >({});


  const [
    loadingAdminAccess,
    setLoadingAdminAccess,
  ] =
    useState<
      Record<string, boolean>
    >({});


  const [
    adminAccessProcessing,
    setAdminAccessProcessing,
  ] =
    useState<string | null>(
      null
    );


  /*
   * SUBSCRIPTION FEE ADJUSTMENT
   */

  const [
    feeAdjustmentOpen,
    setFeeAdjustmentOpen,
  ] =
    useState<Record<string, boolean>>({});


  const [
    feeAmountDraft,
    setFeeAmountDraft,
  ] =
    useState<Record<string, string>>({});


  const [
    feeModeDraft,
    setFeeModeDraft,
  ] =
    useState<Record<string, FeeAdjustmentMode>>({});


  const [
    feeReasonDraft,
    setFeeReasonDraft,
  ] =
    useState<Record<string, string>>({});


  const [
    subscriptionSummaries,
    setSubscriptionSummaries,
  ] =
    useState<Record<string, SubscriptionSummary | null>>({});


  const [
    loadingSubscriptionSummary,
    setLoadingSubscriptionSummary,
  ] =
    useState<Record<string, boolean>>({});


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    processingId,
    setProcessingId,
  ] =
    useState<string | null>(
      null
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
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");


  const [
    levelFilter,
    setLevelFilter,
  ] =
    useState("all");


  const [
    adminAccessFilter,
    setAdminAccessFilter,
  ] =
    useState("all");


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
    memorialOpen,
    setMemorialOpen,
  ] = useState<Record<string, boolean>>({});


  const [
    memorialDrafts,
    setMemorialDrafts,
  ] = useState<Record<string, MemorialDraft>>({});


  const [
    memorialLoading,
    setMemorialLoading,
  ] = useState<Record<string, boolean>>({});


  const [
    memorialSaving,
    setMemorialSaving,
  ] = useState<Record<string, boolean>>({});


  const [
    memorialPublishing,
    setMemorialPublishing,
  ] = useState<Record<string, boolean>>({});


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


      await Promise.all([
        loadMembers(),
        loadActiveGradingAssessors(),
      ]);


      setLoading(
        false
      );
    }


    loadPage();
    // These loaders are function declarations in this legacy page. They only
    // close over the stable Supabase client and state setters, so adding them
    // would cause the initial-load effect to rerun on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    router,
    supabase,
  ]);


  /*
   * =====================================================
   * MEMBERS
   * =====================================================
   */

  async function loadMembers() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "admin_visible_members"
        )
        .select("*")
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


    const loaded =
      (
        data ??
        []
      ) as Member[];


    setMembers(
      loaded
    );


    await Promise.all(
      loaded.map(
        (
          member
        ) =>
          loadNextPromotion(
            member.membership_id
          )
      )
    );
  }


  /*
   * =====================================================
   * NEXT PROMOTION
   * =====================================================
   */

  async function loadNextPromotion(
    membershipId: string
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_next_membership_promotion",
        {
          target_membership_id:
            membershipId,
        }
      );


    if (
      error
    ) {
      const errorMessage =
        (
          error.message ??
          ""
        ).toLowerCase();


      if (
        errorMessage.includes(
          "highest configured rank"
        )
      ) {
        setNextPromotions(
          (
            current
          ) => ({
            ...current,
            [membershipId]:
              null,
          })
        );

        return;
      }


      console.error(
        error
      );


      setNextPromotions(
        (
          current
        ) => ({
          ...current,
          [membershipId]:
            null,
        })
      );

      return;
    }


    const result =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    setNextPromotions(
      (
        current
      ) => ({
        ...current,

        [membershipId]:
          result
            ? (
                result as
                  NextPromotion
              )
            : null,
      })
    );
  }


  /*
   * =====================================================
   * ACTIVE GRADING ASSESSORS
   * =====================================================
   */

  async function loadActiveGradingAssessors() {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_active_grading_assessors"
      );


    if (
      error
    ) {
      console.error(
        "Failed to load grading assessors:",
        error
      );

      return;
    }


    setGradingAssessors(
      (
        data ??
        []
      ) as GradingAssessor[]
    );
  }


  /*
   * =====================================================
   * GRADE HISTORY
   * =====================================================
   */

  async function loadGradeHistory(
    membershipId: string
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_membership_grade_history_with_assessor",
        {
          target_membership_id:
            membershipId,
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


    setGradeHistory(
      (
        current
      ) => ({
        ...current,

        [membershipId]:
          (
            data ??
            []
          ) as GradeHistoryItem[],
      })
    );
  }


  async function toggleHistory(
    membershipId: string
  ) {
    const opening =
      !openHistory[
        membershipId
      ];


    setOpenHistory(
      (
        current
      ) => ({
        ...current,

        [membershipId]:
          opening,
      })
    );


    if (
      opening &&
      !gradeHistory[
        membershipId
      ]
    ) {
      await loadGradeHistory(
        membershipId
      );
    }
  }


  /*
   * =====================================================
   * DATE JOINED
   * =====================================================
   */

  function startJoinedDateEdit(
    member: Member
  ) {
    setJoinedDateDraft(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          member.joined_date ??
          "",
      })
    );


    setJoinedDateEditing(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          true,
      })
    );
  }


  function cancelJoinedDateEdit(
    membershipId: string
  ) {
    setJoinedDateEditing(
      (
        current
      ) => ({
        ...current,

        [membershipId]:
          false,
      })
    );
  }


  async function saveJoinedDate(
    member: Member
  ) {
    const value =
      joinedDateDraft[
        member.membership_id
      ] ?? "";


    if (
      !value
    ) {
      showError(
        "Date Joined is required."
      );

      return;
    }


    setProcessingId(
      member.membership_id
    );

    clearMessage();


    try {
      const {
        error,
      } =
        await supabase.rpc(
          "set_membership_joined_date",
          {
            target_membership_id:
              member.membership_id,

            new_joined_date:
              value,
          }
        );


      if (
        error
      ) {
        throw error;
      }


      setMembers(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.membership_id ===
              member.membership_id
                ? {
                    ...item,
                    joined_date:
                      value,
                  }
                : item
          )
      );


      setJoinedDateEditing(
        (
          current
        ) => ({
          ...current,

          [member.membership_id]:
            false,
        })
      );


      showSuccess(
        `${member.full_name}'s Date Joined was updated.`
      );
    } catch (
      error: unknown
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to update Date Joined."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * AIKIKAI REGISTRATION NUMBER
   * SUPER ADMIN ONLY
   * =====================================================
   */

  function startAikikaiEdit(
    member: Member
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    setAikikaiDraft(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          member.aikikai_registration_number ??
          "",
      })
    );


    setAikikaiEditing(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          true,
      })
    );
  }


  function cancelAikikaiEdit(
    membershipId: string
  ) {
    setAikikaiEditing(
      (
        current
      ) => ({
        ...current,

        [membershipId]:
          false,
      })
    );
  }


  async function saveAikikaiRegistrationNumber(
    member: Member
  ) {
    if (!isSuperAdmin) {
      showError(
        "Only Super Admin can change the Aikikai Registration Number."
      );
      return;
    }

    const value = (
      aikikaiDraft[member.membership_id] ?? ""
    )
      .trim()
      .replace(/\s+/g, " ");

    setProcessingId(member.membership_id);
    clearMessage();

    try {
      const { error } = await supabase.rpc(
        "set_aikikai_registration_number",
        {
          target_user_id: member.user_id,
          new_aikikai_registration_number:
            value || null,
        }
      );

      if (error) {
        throw error;
      }

      setMembers((current) =>
        current.map((item) =>
          item.user_id === member.user_id
            ? {
                ...item,
                aikikai_registration_number:
                  value || null,
              }
            : item
        )
      );

      setAikikaiEditing((current) => ({
        ...current,
        [member.membership_id]: false,
      }));

      showSuccess(
        value
          ? `${member.full_name}'s Aikikai Registration Number was updated.`
          : `${member.full_name}'s Aikikai Registration Number was cleared.`
      );
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to update Aikikai Registration Number."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function loadMemberAdminAccess(
    member: Member
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    setLoadingAdminAccess(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          true,
      })
    );


    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_available_dojo_admin_assignments",
          {
            target_user_id:
              member.user_id,
          }
        );


      if (
        error
      ) {
        throw error;
      }


      setAdminAccessOptions(
        (
          current
        ) => ({
          ...current,

          [member.membership_id]:
            (
              data ??
              []
            ) as AvailableDojoAdminAssignment[],
        })
      );
    } catch (
      error: unknown
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to load Administrative Access."
      );
    } finally {
      setLoadingAdminAccess(
        (
          current
        ) => ({
          ...current,

          [member.membership_id]:
            false,
        })
      );
    }
  }


  async function toggleAdminAccess(
    member: Member
  ) {
    const opening =
      !adminAccessOpen[
        member.membership_id
      ];


    setAdminAccessOpen(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          opening,
      })
    );


    if (
      opening &&
      !adminAccessOptions[
        member.membership_id
      ]
    ) {
      await loadMemberAdminAccess(
        member
      );
    }
  }


  async function changeDojoAdminAccess(
    member: Member,
    dojo:
      AvailableDojoAdminAssignment
  ) {
    if (
      !isSuperAdmin
    ) {
      return;
    }


    const processingKey =
      `${member.membership_id}:${dojo.dojo_id}`;


    clearMessage();

    setAdminAccessProcessing(
      processingKey
    );


    try {
      if (
        dojo.is_admin
      ) {
        const confirmed =
          window.confirm(
            `Remove ${member.full_name}'s Admin access to ${dojo.dojo_name}?`
          );


        if (
          !confirmed
        ) {
          return;
        }


        const {
          error,
        } =
          await supabase.rpc(
            "revoke_dojo_admin",
            {
              target_user_id:
                member.user_id,

              target_dojo_id:
                dojo.dojo_id,
            }
          );


        if (
          error
        ) {
          throw error;
        }


        showSuccess(
          `${member.full_name} no longer administers ${dojo.dojo_name}.`
        );
      } else {
        const {
          error,
        } =
          await supabase.rpc(
            "assign_dojo_admin",
            {
              target_user_id:
                member.user_id,

              target_dojo_id:
                dojo.dojo_id,
            }
          );


        if (
          error
        ) {
          throw error;
        }


        showSuccess(
          `${member.full_name} can now administer ${dojo.dojo_name}.`
        );
      }


      /*
       * Refresh only the data affected.
       */

      await Promise.all([
        loadMemberAdminAccess(
          member
        ),
        loadMembers(),
      ]);
    } catch (
      error: unknown
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to update Administrative Access."
      );
    } finally {
      setAdminAccessProcessing(
        null
      );
    }
  }


  /*
   * =====================================================
   * SUBSCRIPTION FEE ADJUSTMENT
   * =====================================================
   */

  async function loadSubscriptionSummary(
    membershipId: string
  ) {
    setLoadingSubscriptionSummary((current) => ({
      ...current,
      [membershipId]: true,
    }));

    try {
      const { data, error } = await supabase.rpc(
        "get_admin_member_subscription_summary",
        {
          target_membership_id: membershipId,
        }
      );

      if (error) {
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;

      const summary: SubscriptionSummary | null = row
        ? {
            membership_id: String(row.membership_id),
            billing_month: String(row.billing_month),
            current_rate: Number(row.current_rate ?? 0),
            current_rate_currency: String(row.current_rate_currency ?? "IDR"),
            current_rate_source: String(row.current_rate_source ?? "dojo_default"),
            charge_id: row.charge_id ? String(row.charge_id) : null,
            charge_amount: row.charge_amount == null ? null : Number(row.charge_amount),
            charge_currency: row.charge_currency ? String(row.charge_currency) : null,
            charge_status: row.charge_status ? String(row.charge_status) : null,
            total_paid: Number(row.total_paid ?? 0),
            remaining_balance:
              row.remaining_balance == null ? null : Number(row.remaining_balance),
            has_pending_confirmation: row.has_pending_confirmation === true,
            special_rate_amount:
              row.special_rate_amount == null ? null : Number(row.special_rate_amount),
            special_rate_currency: row.special_rate_currency
              ? String(row.special_rate_currency)
              : null,
            special_rate_effective_from: row.special_rate_effective_from
              ? String(row.special_rate_effective_from)
              : null,
            special_rate_effective_until: row.special_rate_effective_until
              ? String(row.special_rate_effective_until)
              : null,
            can_adjust_current_month: row.can_adjust_current_month === true,
          }
        : null;

      setSubscriptionSummaries((current) => ({
        ...current,
        [membershipId]: summary,
      }));

      if (summary) {
        setFeeAmountDraft((current) => ({
          ...current,
          [membershipId]:
            current[membershipId] ?? String(summary.current_rate),
        }));
      }
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to load the Member subscription summary."
      );
    } finally {
      setLoadingSubscriptionSummary((current) => ({
        ...current,
        [membershipId]: false,
      }));
    }
  }


  async function toggleFeeAdjustment(
    member: Member
  ) {
    const opening =
      !(feeAdjustmentOpen[member.membership_id] ?? false);

    setFeeAdjustmentOpen((current) => ({
      ...current,
      [member.membership_id]: opening,
    }));

    if (!opening) {
      return;
    }

    setFeeModeDraft((current) => ({
      ...current,
      [member.membership_id]:
        current[member.membership_id] ?? "this_month_only",
    }));

    await loadSubscriptionSummary(member.membership_id);
  }


  async function applyFeeAdjustment(
    member: Member
  ) {
    const amountText =
      (feeAmountDraft[member.membership_id] ?? "").trim();

    const amount = Number(amountText);

    const mode =
      feeModeDraft[member.membership_id] ?? "this_month_only";

    const reason =
      (feeReasonDraft[member.membership_id] ?? "").trim();

    if (!amountText || !Number.isFinite(amount) || amount < 0) {
      showError("Enter a valid subscription fee of zero or greater.");
      return;
    }

    if (!reason) {
      showError("Enter a reason for the fee adjustment.");
      return;
    }

    const modeLabel =
      mode === "this_month_only"
        ? "this month only"
        : mode === "this_month_onward"
        ? "this month and future months"
        : "next month and future months";

    const confirmed = window.confirm(
      `Adjust ${member.full_name}'s subscription fee to ${amount} for ${modeLabel}?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(member.membership_id);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        "apply_membership_fee_adjustment",
        {
          target_membership_id: member.membership_id,
          new_amount: amount,
          adjustment_mode: mode,
          adjustment_reason: reason,
        }
      );

      if (error) {
        throw error;
      }

      const result =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {};

      const appliedMode = String(result.mode ?? mode);
      const effectiveFrom =
        typeof result.effective_from === "string"
          ? result.effective_from
          : null;

      await loadSubscriptionSummary(member.membership_id);

      setFeeReasonDraft((current) => ({
        ...current,
        [member.membership_id]: "",
      }));

      if (
        mode === "this_month_onward" &&
        appliedMode === "next_month_onward"
      ) {
        showSuccess(
          `${member.full_name}'s current month was left unchanged because payment activity already exists. The new fee will apply from ${
            effectiveFrom ? formatDate(effectiveFrom) : "next month"
          } onward.`
        );
      } else if (appliedMode === "this_month_only") {
        showSuccess(
          `${member.full_name}'s fee was adjusted for this month only. Future subscription rates are unchanged.`
        );
      } else if (appliedMode === "this_month_onward") {
        showSuccess(
          `${member.full_name}'s current month and future subscription rate were updated.`
        );
      } else {
        showSuccess(
          `${member.full_name}'s new subscription rate will apply from ${
            effectiveFrom ? formatDate(effectiveFrom) : "next month"
          } onward.`
        );
      }
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to adjust the subscription fee."
      );
    } finally {
      setProcessingId(null);
    }
  }


  /*
   * =====================================================
   * TITLE CERTIFICATE
   * =====================================================
   */

  async function printCurrentTitleCertificate(
    member: Member
  ) {
    if (!isSuperAdmin) {
      showError(
        "Only Super Admin can print title certificates."
      );

      return;
    }


    if (!member.title_level) {
      showError(
        "This Member does not currently hold a title."
      );

      return;
    }


    try {
      setProcessingId(
        member.membership_id
      );

      clearMessage();


      const {
        data:
          appointmentData,

        error:
          appointmentError,
      } =
        await supabase.rpc(
          "get_latest_valid_title_appointment",
          {
            target_membership_id:
              member.membership_id,
          }
        );


      if (
        appointmentError
      ) {
        throw appointmentError;
      }


      const appointment =
        Array.isArray(
          appointmentData
        )
          ? appointmentData[0]
          : appointmentData;


      if (
        !appointment
      ) {
        throw new Error(
          "No valid title appointment is available for certificate generation."
        );
      }


      if (
        Number(
          appointment.title_level
        ) !==
        Number(
          member.title_level
        )
      ) {
        throw new Error(
          "The latest title appointment does not match the Member's current title."
        );
      }


      const {
        data:
          certificateData,

        error:
          certificateError,
      } =
        await supabase.rpc(
          "get_or_create_title_certificate",
          {
            target_title_history_id:
              appointment.title_history_id,
          }
        );


      if (
        certificateError
      ) {
        throw certificateError;
      }


      const certificate =
        Array.isArray(
          certificateData
        )
          ? certificateData[0]
          : certificateData;


      if (
        !certificate
      ) {
        throw new Error(
          "Unable to prepare the title certificate."
        );
      }


      const {
        data:
          printTypeData,

        error:
          printError,
      } =
        await supabase.rpc(
          "log_title_certificate_print",
          {
            target_certificate_id:
              certificate.certificate_id,
          }
        );


      if (
        printError
      ) {
        throw printError;
      }


      const printType =
        String(
          printTypeData ??
          "original"
        ) ===
        "reprint"
          ? "reprint"
          : "original";


      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();


      let generatedByName =
        "Super Admin";


      if (
        user
      ) {
        const {
          data:
            profileData,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              "full_name"
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle();


        if (
          profileData
            ?.full_name
        ) {
          generatedByName =
            profileData.full_name;
        }
      }


      const record =
        appointment as
          TitleCertificateRecord;


      const audit:
        TitleCertificateAudit = {
          certificate_id:
            certificate.certificate_id,

          certificate_number:
            certificate.certificate_number,

          print_count:
            Number(
              certificate.print_count ??
              0
            ) + 1,

          generated_at:
            certificate.generated_at,

          print_type:
            printType,

          generated_by_name:
            generatedByName,

          generated_by_role:
            "Super Admin",
        };


      const organisationLogoUrl =
        `${window.location.origin}/js-logo.jpeg`;


      const categoryLogoUrl =
        record.class_logo_url
          ? record.class_logo_url
          : null;


      const blob =
        await pdf(
          <TitleCertificatePDF
            record={record}
            audit={audit}
            organisationLogoUrl={
              organisationLogoUrl
            }
            categoryLogoUrl={
              categoryLogoUrl
            }
          />
        ).toBlob();


      const safeName =
        member.full_name
          .trim()
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );


      const safeTitle =
        (
          appointment.title_name ??
          "Title"
        )
          .trim()
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );


      const filename =
        `${certificate.certificate_number}-${safeName}-${safeTitle}.pdf`;


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      const anchor =
        document.createElement(
          "a"
        );


      anchor.href =
        objectUrl;

      anchor.download =
        filename;


      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();


      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );


      showSuccess(
        `${appointment.title_name} certificate generated successfully. Certificate: ${certificate.certificate_number}`
      );
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );


      showError(
        error instanceof Error
          ? error.message
          : "Failed to generate title certificate."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * MEMBER TITLES
   * SUPER ADMIN ONLY
   * =====================================================
   */

  function titleNameForMember(
    member: Member,
    level: number | null
  ) {
    if (!level || member.title_system === "none") {
      return null;
    }

    if (member.title_system === "chinese") {
      if (level === 1) return "Fujiaoshi";
      if (level === 2) return "Jiaoshi";
      if (level === 3) return "Dashi";
      return null;
    }

    if (member.title_system === "japanese") {
      if (level === 1) return "Fuku Kiyoshi";
      if (level === 2) return "Kiyoshi";
      if (level === 3) return "Daishi";
      return null;
    }

    return null;
  }


  function openTitleManager(
    member: Member
  ) {
    if (!isSuperAdmin) {
      return;
    }

    setTitleManageOpen((current) => ({
      ...current,
      [member.membership_id]: true,
    }));

    setTitleLevelDraft((current) => ({
      ...current,
      [member.membership_id]:
        member.title_level
          ? String(member.title_level)
          : "",
    }));

    setTitleDateDraft((current) => ({
      ...current,
      [member.membership_id]:
        current[member.membership_id] ||
        new Date().toISOString().slice(0, 10),
    }));
  }


  function closeTitleManager(
    membershipId: string
  ) {
    setTitleManageOpen((current) => ({
      ...current,
      [membershipId]: false,
    }));
  }


  async function grantMemberTitle(
    member: Member
  ) {
    if (!isSuperAdmin) {
      showError("Only Super Admin can grant titles.");
      return;
    }

    const level = Number(
      titleLevelDraft[member.membership_id] ?? ""
    );

    const effectiveDate =
      titleDateDraft[member.membership_id] ?? "";

    if (![1, 2, 3].includes(level)) {
      showError("Select a title.");
      return;
    }

    if (!effectiveDate) {
      showError("Select the title effective date.");
      return;
    }

    setProcessingId(member.membership_id);
    clearMessage();

    const { error } = await supabase.rpc(
      "grant_membership_title",
      {
        target_membership_id: member.membership_id,
        new_title_level: level,
        title_effective_date: effectiveDate,
      }
    );

    if (error) {
      showError(error.message);
      setProcessingId(null);
      return;
    }

    await Promise.all([
      loadMembers(),
      loadTitleHistory(member.membership_id),
    ]);

    showSuccess(
      `${member.full_name} was granted ${
        titleNameForMember(member, level) ?? `Title Level ${level}`
      }.`
    );

    closeTitleManager(member.membership_id);
    setProcessingId(null);
  }


  async function loadTitleHistory(
    membershipId: string
  ) {
    const { data, error } = await supabase.rpc(
      "get_membership_title_history",
      {
        target_membership_id: membershipId,
      }
    );

    if (error) {
      showError(error.message);
      return;
    }

    setTitleHistory((current) => ({
      ...current,
      [membershipId]:
        (data ?? []) as TitleHistoryItem[],
    }));
  }


  async function toggleTitleHistory(
    membershipId: string
  ) {
    const currentlyOpen =
      titleHistoryOpen[membershipId] ?? false;

    setTitleHistoryOpen((current) => ({
      ...current,
      [membershipId]: !currentlyOpen,
    }));

    if (!currentlyOpen && !titleHistory[membershipId]) {
      await loadTitleHistory(membershipId);
    }
  }


  async function revokeTitleHistoryItem(
    member: Member,
    item: TitleHistoryItem
  ) {
    if (!isSuperAdmin) {
      return;
    }

    const reason = window.prompt(
      `Reason for revoking ${item.title_name ?? "this title"}?`
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      showError("A revoke reason is required.");
      return;
    }

    const confirmed = window.confirm(
      `Revoke ${item.title_name ?? "this title"} for ${member.full_name}?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(member.membership_id);
    clearMessage();

    const { error } = await supabase.rpc(
      "revoke_membership_title",
      {
        target_history_id: item.history_id,
        revoke_reason_value: reason.trim(),
      }
    );

    if (error) {
      showError(error.message);
      setProcessingId(null);
      return;
    }

    await Promise.all([
      loadMembers(),
      loadTitleHistory(member.membership_id),
    ]);

    showSuccess(
      `${item.title_name ?? "Title"} was revoked for ${member.full_name}.`
    );

    setProcessingId(null);
  }


  /*
   * =====================================================
   * GRADING ASSESSOR
   * SUPER ADMIN ONLY
   * =====================================================
   */

  async function toggleGradingAssessor(
    member: Member
  ) {
    if (!isSuperAdmin) {
      showError(
        "Only Super Admin can change grading assessor status."
      );
      return;
    }

    const newValue = !member.is_grading_assessor;

    setProcessingId(member.membership_id);
    clearMessage();

    try {
      const { error } = await supabase.rpc(
        "set_grading_assessor_status",
        {
          target_user_id: member.user_id,
          new_is_grading_assessor: newValue,
        }
      );

      if (error) {
        throw error;
      }

      /*
       * Update every visible membership row for this user
       * immediately. A Member can belong to more than one class.
       */
      setMembers((current) =>
        current.map((item) =>
          item.user_id === member.user_id
            ? {
                ...item,
                is_grading_assessor: newValue,
              }
            : item
        )
      );

      showSuccess(
        newValue
          ? `${member.full_name} is now an active Grading Assessor.`
          : `${member.full_name} is no longer a Grading Assessor.`
      );
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to change grading assessor status."
      );
    } finally {
      setProcessingId(null);
    }
  }


  /*
   * =====================================================
   * PROMOTE
   * =====================================================
   */

  async function promoteMember(
    member: Member
  ) {
    const date =
      promotionDates[
        member.membership_id
      ] ?? "";


    const next =
      nextPromotions[
        member.membership_id
      ];


    if (
      !next
    ) {
      showError(
        "No further promotion is configured."
      );

      return;
    }


    if (
      !date
    ) {
      showError(
        `Enter the promotion date for ${member.full_name}.`
      );

      return;
    }


    const isYudanshaGrading =
      next.next_level ===
      "yudansha";


    const selectedAssessorId =
      selectedAssessors[
        member.membership_id
      ] ?? "";


    const externalAssessorName =
      (
        externalAssessorNames[
          member.membership_id
        ] ??
        ""
      ).trim();


    if (
      isYudanshaGrading
    ) {
      if (
        !externalAssessorName
      ) {
        showError(
          `Enter the external assessor name for ${member.full_name}'s Yudansha grading.`
        );

        return;
      }
    } else {
      if (
        !selectedAssessorId
      ) {
        showError(
          `Select a grading assessor for ${member.full_name}.`
        );

        return;
      }
    }


    const assessorName =
      isYudanshaGrading
        ? externalAssessorName
        : gradingAssessors.find(
            (
              assessor
            ) =>
              assessor.member_id ===
              selectedAssessorId
          )?.full_name ??
          "Selected Assessor";


    const confirmed =
      window.confirm(
        `Promote ${member.full_name} to ${next.next_rank_name} · ${next.next_sub_rank_name} effective ${date}?\n\nAssessor: ${assessorName}`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      member.membership_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "promote_membership",
        {
          target_membership_id:
            member.membership_id,

          promotion_effective_date:
            date,

          assessor_member_id:
            isYudanshaGrading
              ? null
              : selectedAssessorId,

          external_assessor_name:
            isYudanshaGrading
              ? externalAssessorName
              : null,
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


    setPromotionDates(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          "",
      })
    );


    setSelectedAssessors(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          "",
      })
    );


    setExternalAssessorNames(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          "",
      })
    );


    await Promise.all([
      loadMembers(),
      loadActiveGradingAssessors(),
    ]);


    if (
      openHistory[
        member.membership_id
      ]
    ) {
      await loadGradeHistory(
        member.membership_id
      );
    }


    showSuccess(
      `${member.full_name} promoted to ${next.next_rank_name} · ${next.next_sub_rank_name}. Assessor: ${assessorName}.`
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * UNDO PROMOTION
   * =====================================================
   */

  async function undoPromotion(
    member: Member
  ) {
    const reason =
      (
        undoReasons[
          member.membership_id
        ] ??
        ""
      ).trim();


    if (
      !reason
    ) {
      showError(
        "Enter a reason for the correction."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Undo the latest valid promotion for ${member.full_name}? The record will remain permanently as REVOKED.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      member.membership_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "undo_last_membership_promotion",
        {
          target_membership_id:
            member.membership_id,

          undo_reason:
            reason,
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


    setUndoOpen(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          false,
      })
    );


    setUndoReasons(
      (
        current
      ) => ({
        ...current,

        [member.membership_id]:
          "",
      })
    );


    await loadMembers();

    await loadGradeHistory(
      member.membership_id
    );


    showSuccess(
      `${member.full_name}'s latest promotion was revoked and the previous valid grade restored.`
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * STATUS
   * =====================================================
   */

  async function setBreak(
    member: Member
  ) {
    setProcessingId(
      member.membership_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "record_membership_break",
        {
          membership_id:
            member.membership_id,
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


    await loadMembers();


    showSuccess(
      `${member.full_name}'s membership status is now Break 1.`
    );


    setProcessingId(
      null
    );
  }


  async function setActive(
    member: Member
  ) {
    setProcessingId(
      member.membership_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "return_membership_active",
        {
          membership_id:
            member.membership_id,
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


    await loadMembers();


    showSuccess(
      `${member.full_name}'s membership status is now Active.`
    );


    setProcessingId(
      null
    );
  }


  async function setInactive(
    member: Member
  ) {
    const confirmed =
      window.confirm(
        `Set ${member.full_name} inactive for ${member.class_name}?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      member.membership_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "set_membership_inactive",
        {
          membership_id:
            member.membership_id,
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


    await loadMembers();


    showSuccess(
      `${member.full_name}'s membership status is now Inactive.`
    );


    setProcessingId(
      null
    );
  }


  /*
   * =====================================================
   * OFFICIAL PDF
   * =====================================================
   */

  async function exportOfficialPDF(
    member: Member
  ) {
    try {
      setProcessingId(
        member.membership_id
      );

      clearMessage();


      const {
        data:
          recordData,
        error:
          recordError,
      } =
        await supabase.rpc(
          "get_official_member_record",
          {
            target_membership_id:
              member.membership_id,
          }
        );


      if (
        recordError
      ) {
        throw recordError;
      }


      const {
        data:
          auditData,
        error:
          auditError,
      } =
        await supabase.rpc(
          "create_member_report_audit",
          {
            target_membership_id:
              member.membership_id,
          }
        );


      if (
        auditError
      ) {
        throw auditError;
      }


      const auditRow =
        Array.isArray(
          auditData
        )
          ? auditData[0]
          : auditData;


      if (
        !recordData ||
        !auditRow
      ) {
        throw new Error(
          "Unable to prepare official member record."
        );
      }


      const record =
        recordData as OfficialRecord;


      const audit =
        auditRow as AuditInfo;


      const logoUrl =
        `${window.location.origin}/js-logo.jpeg`;


      const blob =
        await pdf(
          <MemberRecordPDF
            record={record}
            audit={audit}
            logoUrl={logoUrl}
          />
        ).toBlob();


      const safeName =
        member.full_name
          .trim()
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );


      const filename =
        `${audit.document_reference}-${safeName}.pdf`;


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      const anchor =
        document.createElement(
          "a"
        );


      anchor.href =
        objectUrl;

      anchor.download =
        filename;


      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();


      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );


      showSuccess(
        `Official Member Record generated successfully. Reference: ${audit.document_reference}`
      );
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );


      showError(
        error instanceof Error
          ? error.message
          : "Failed to generate official PDF."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * CERTIFICATE
   * =====================================================
   */

  async function printCurrentRankCertificate(
    member: Member
  ) {
    try {
      setProcessingId(
        member.membership_id
      );

      clearMessage();


      const {
        data:
          promotionData,
        error:
          promotionError,
      } =
        await supabase.rpc(
          "get_latest_valid_rank_promotion",
          {
            target_membership_id:
              member.membership_id,
          }
        );


      if (
        promotionError
      ) {
        throw promotionError;
      }


      const promotion =
        Array.isArray(
          promotionData
        )
          ? promotionData[0]
          : promotionData;


      if (
        !promotion
      ) {
        throw new Error(
          "No valid rank promotion is available for certificate generation."
        );
      }


      if (
        !member.rank_id ||
        promotion.rank_id !==
          member.rank_id
      ) {
        throw new Error(
          "The certificate promotion does not match the member's current rank."
        );
      }


      const {
        data:
          certificateData,
        error:
          certificateError,
      } =
        await supabase.rpc(
          "create_grade_certificate",
          {
            target_promotion_history_id:
              promotion.promotion_history_id,
          }
        );


      if (
        certificateError
      ) {
        throw certificateError;
      }


      const certificateAudit =
        Array.isArray(
          certificateData
        )
          ? certificateData[0]
          : certificateData;


      if (
        !certificateAudit
      ) {
        throw new Error(
          "Unable to create certificate record."
        );
      }


      const audit =
        certificateAudit as CertificateAudit;


      const organisationLogoUrl =
        `${window.location.origin}/js-logo.jpeg`;


      const categoryLogoUrl =
        promotion.class_logo_url
          ? promotion.class_logo_url.startsWith(
              "http"
            )
            ? promotion.class_logo_url
            : `${window.location.origin}${promotion.class_logo_url}`
          : null;


      const blob =
        await pdf(
          <GradeCertificatePDF
            record={
              promotion as CertificateRecord
            }
            audit={audit}
            organisationLogoUrl={
              organisationLogoUrl
            }
            categoryLogoUrl={
              categoryLogoUrl
            }
          />
        ).toBlob();


      const safeName =
        member.full_name
          .trim()
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );


      const safeRank =
        (
          promotion.rank_name ??
          "Grade"
        )
          .trim()
          .replace(
            /[^a-zA-Z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );


      const filename =
        `${audit.certificate_number}-${safeName}-${safeRank}.pdf`;


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      const anchor =
        document.createElement(
          "a"
        );


      anchor.href =
        objectUrl;

      anchor.download =
        filename;


      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();


      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );


      showSuccess(
        audit.print_type ===
          "reprint"
          ? `${promotion.rank_name} certificate reprinted successfully. Certificate: ${audit.certificate_number}`
          : `${promotion.rank_name} original certificate generated successfully. Certificate: ${audit.certificate_number}`
      );
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );


      showError(
        error instanceof Error
          ? error.message
          : "Failed to generate certificate."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }


  /*
   * =====================================================
   * DECEASED MEMBER & MEMORIALS (SUPER ADMIN ONLY)
   * =====================================================
   */

  function createMemorialDraft(
    member: Member,
    row?: Record<string, unknown> | null
  ): MemorialDraft {
    const recipientClassIds =
      Array.isArray(row?.recipient_class_ids)
        ? row.recipient_class_ids.filter(
            (value): value is string => typeof value === "string"
          )
        : [member.class_id];

    const dateOfPassing =
      typeof row?.date_of_passing === "string"
        ? row.date_of_passing
        : member.date_of_passing ?? "";

    return {
      isDeceased: Boolean(dateOfPassing),
      dateOfPassing,
      recipientClassIds,
      remembranceEnabled:
        row?.remembrance_enabled === true ||
        row?.remembrance_day_enabled === true,
      remembranceMessage:
        typeof row?.remembrance_message === "string"
          ? row.remembrance_message
          : "",
      heavenlyBirthdayEnabled:
        row?.heavenly_birthday_enabled === true,
      heavenlyBirthdayMessage:
        typeof row?.heavenly_birthday_message === "string"
          ? row.heavenly_birthday_message
          : "",
      initialMemorialTitle: `${member.full_name} — In Memoriam`,
      initialMemorialMessage: "",
    };
  }


  function updateMemorialDraft(
    userId: string,
    draft: MemorialDraft
  ) {
    setMemorialDrafts((current) => ({
      ...current,
      [userId]: draft,
    }));
  }


  async function toggleMemorialSettings(
    member: Member
  ) {
    if (!isSuperAdmin) {
      showError("Only Super Admin can manage deceased members and memorials.");
      return;
    }

    const opening = !memorialOpen[member.membership_id];

    setMemorialOpen((current) => ({
      ...current,
      [member.membership_id]: opening,
    }));

    if (!opening || memorialDrafts[member.user_id]) {
      return;
    }

    setMemorialLoading((current) => ({
      ...current,
      [member.membership_id]: true,
    }));
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        "get_member_memorial_settings",
        {
          target_user_id: member.user_id,
        }
      );

      if (error) {
        throw error;
      }

      const rawRow = Array.isArray(data) ? data[0] : data;
      const row =
        rawRow && typeof rawRow === "object"
          ? (rawRow as Record<string, unknown>)
          : null;

      updateMemorialDraft(
        member.user_id,
        createMemorialDraft(member, row)
      );
    } catch (error: unknown) {
      setMemorialOpen((current) => ({
        ...current,
        [member.membership_id]: false,
      }));
      showError(
        error instanceof Error
          ? error.message
          : "Failed to load memorial settings."
      );
    } finally {
      setMemorialLoading((current) => ({
        ...current,
        [member.membership_id]: false,
      }));
    }
  }


  function validateMemorialDraft(
    draft: MemorialDraft
  ): string | null {
    if (!draft.isDeceased) {
      return null;
    }

    if (!draft.dateOfPassing) {
      return "Date of Passing is required when Deceased is checked.";
    }

    if (draft.dateOfPassing > new Date().toISOString().slice(0, 10)) {
      return "Date of Passing cannot be in the future.";
    }

    if (draft.recipientClassIds.length === 0) {
      return "Select at least one recipient class.";
    }

    if (draft.remembranceEnabled && !draft.remembranceMessage.trim()) {
      return "Enter the Remembrance Day message or disable that reminder.";
    }

    if (draft.heavenlyBirthdayEnabled && !draft.heavenlyBirthdayMessage.trim()) {
      return "Enter the Heavenly Birthday message or disable that reminder.";
    }

    return null;
  }


  async function getMemorialAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Your session has expired. Sign in again before saving.");
    }

    return session.access_token;
  }


  async function postMemorialRequest(
    path: string,
    body: Record<string, unknown>
  ) {
    const accessToken = await getMemorialAccessToken();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const responseBody = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(
        responseBody.error ??
          responseBody.message ??
          "The memorial request failed."
      );
    }
  }


  async function persistMemorialSettings(
    member: Member,
    draft: MemorialDraft
  ) {
    const validationError = validateMemorialDraft(draft);

    if (validationError) {
      throw new Error(validationError);
    }

    await postMemorialRequest("/api/admin/members/deceased", {
      targetUserId: member.user_id,
      dateOfPassing: draft.isDeceased ? draft.dateOfPassing : null,
      recipientClassIds: draft.recipientClassIds,
      remembranceEnabled: draft.isDeceased && draft.remembranceEnabled,
      heavenlyBirthdayEnabled:
        draft.isDeceased && draft.heavenlyBirthdayEnabled,
      remembranceMessage: draft.remembranceMessage.trim(),
      heavenlyBirthdayMessage: draft.heavenlyBirthdayMessage.trim(),
    });

    // Reload the authoritative state because reversal restores the account
    // status that existed before the deceased designation; it is not always
    // safe to assume that the restored state is Active.
    await loadMembers();
  }


  async function saveMemorialSettings(
    member: Member
  ) {
    const draft =
      memorialDrafts[member.user_id] ?? createMemorialDraft(member);

    if (
      member.date_of_passing &&
      !draft.isDeceased &&
      !window.confirm(
        `Clear Deceased for ${member.full_name}? Their online access and ordinary birthday announcements may resume.`
      )
    ) {
      return;
    }

    setMemorialSaving((current) => ({
      ...current,
      [member.membership_id]: true,
    }));
    clearMessage();

    try {
      await persistMemorialSettings(member, draft);
      showSuccess(
        draft.isDeceased
          ? `${member.full_name}'s deceased record and memorial settings were saved.`
          : `${member.full_name}'s deceased designation was cleared.`
      );
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to save memorial settings."
      );
    } finally {
      setMemorialSaving((current) => ({
        ...current,
        [member.membership_id]: false,
      }));
    }
  }


  async function publishInitialMemorial(
    member: Member
  ) {
    const draft =
      memorialDrafts[member.user_id] ?? createMemorialDraft(member);
    const validationError = validateMemorialDraft(draft);

    if (validationError) {
      showError(validationError);
      return;
    }

    if (!draft.initialMemorialTitle.trim() || !draft.initialMemorialMessage.trim()) {
      showError("Enter both a title and message for the Initial Memorial.");
      return;
    }

    if (
      !window.confirm(
        `Publish the Initial Memorial for ${member.full_name} to the selected classes now?`
      )
    ) {
      return;
    }

    setMemorialPublishing((current) => ({
      ...current,
      [member.membership_id]: true,
    }));
    clearMessage();

    try {
      // Persist recipient and reminder settings first so publication uses the
      // exact class selection currently shown to the Super Admin.
      await persistMemorialSettings(member, draft);
      await postMemorialRequest("/api/admin/members/deceased/memorial", {
        targetUserId: member.user_id,
        title: draft.initialMemorialTitle.trim(),
        message: draft.initialMemorialMessage.trim(),
      });
      showSuccess(`${member.full_name}'s Initial Memorial was published.`);
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to publish the Initial Memorial."
      );
    } finally {
      setMemorialPublishing((current) => ({
        ...current,
        [member.membership_id]: false,
      }));
    }
  }


  /*
   * =====================================================
   * FILTERS
   * =====================================================
   */

  const classes =
    Array.from(
      new Map(
        members.map(
          (
            member
          ) => [
            member.class_id,
            member.class_name,
          ]
        )
      )
    );


  const dojos =
    Array.from(
      new Map(
        members
          .filter(
            (
              member
            ) =>
              member.dojo_id
          )
          .map(
            (
              member
            ) => [
              member.dojo_id as string,
              member.dojo_name ??
                "-",
            ]
          )
      )
    );


  const filteredMembers =
    members.filter(
      (
        member
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();


        const searchMatch =
          !query ||

          member.full_name
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.email ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.phone ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.whatsapp_number ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.registration_number ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.aikikai_registration_number ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||

          (
            member.title_name ??
            ""
          )
            .toLowerCase()
            .includes(
              query
            );


        const statusMatch =
          statusFilter === "all" ||
          (
            statusFilter === "deceased"
              ? Boolean(member.date_of_passing)
              : !member.date_of_passing &&
                member.membership_status === statusFilter
          );


        const levelMatch =
          levelFilter ===
            "all" ||
          member.level ===
            levelFilter;


        const adminAccessMatch =
          adminAccessFilter ===
            "all" ||

          (
            adminAccessFilter ===
              "yes" &&
            member.has_admin_access
          ) ||

          (
            adminAccessFilter ===
              "no" &&
            !member.has_admin_access
          );


        const classMatch =
          classFilter ===
            "all" ||
          member.class_id ===
            classFilter;


        const dojoMatch =
          dojoFilter ===
            "all" ||
          member.dojo_id ===
            dojoFilter;


        return (
          searchMatch &&
          statusMatch &&
          levelMatch &&
          adminAccessMatch &&
          classMatch &&
          dojoMatch
        );
      }
    );

  /*
   * =====================================================
   * EXCEL EXPORT
   * =====================================================
   */

  function exportMembersExcel() {
    if (
      filteredMembers.length ===
      0
    ) {
      showError(
        "There are no members to export."
      );

      return;
    }


    const className =
      classFilter ===
      "all"
        ? "All-Classes"
        : classes.find(
            (
              [
                id,
              ]
            ) =>
              id ===
              classFilter
          )?.[1] ??
          "Class";


    const dojoName =
      dojoFilter ===
      "all"
        ? "All-Dojos"
        : dojos.find(
            (
              [
                id,
              ]
            ) =>
              id ===
              dojoFilter
          )?.[1] ??
          "Dojo";


    exportToExcel({
      filename:
        `Members-${className}-${dojoName}`,

      sheetName:
        "Members",

      title:
        `Member List - ${className} - ${dojoName}`,

      columns: [
        {
          header:
            "Member ID",

          key:
            "registration_number",
        },

        {
          header:
            "Aikikai Registration Number",

          key:
            "aikikai_registration_number",
        },

        {
          header:
            "Title",

          key:
            "title_name",

          value:
            (
              row
            ) =>
              row.title_name ??
              "",
        },

        {
          header:
            "Title Level",

          key:
            "title_level",

          value:
            (
              row
            ) =>
              row.title_level ??
              "",
        },

        {
          header:
            "Title System",

          key:
            "title_system",

          value:
            (
              row
            ) =>
              row.title_system ===
              "japanese"
                ? "Japanese"
                : row.title_system ===
                  "chinese"
                ? "Chinese"
                : "",
        },

        {
          header:
            "Full Name",

          key:
            "full_name",
        },

        {
          header:
            "Email",

          key:
            "email",
        },

        {
          header:
            "Phone",

          key:
            "phone",
        },

        {
          header:
            "WhatsApp",

          key:
            "whatsapp_number",

          value:
            (
              member
            ) =>
              member.whatsapp_number
                ? formatWhatsApp(
                    member.whatsapp_number
                  )
                : "",
        },

        {
          header:
            "Date of Birth",

          key:
            "date_of_birth",
        },

        {
          header:
            "Class",

          key:
            "class_name",
        },

        {
          header:
            "Dojo",

          key:
            "dojo_name",
        },

        {
          header:
            "Membership Status",

          key:
            "membership_status",

          value:
            (
              member
            ) =>
              statusLabel(
                member.membership_status,
                member.date_of_passing
              ),
        },

        {
          header:
            "Date of Passing",

          key:
            "date_of_passing",
        },

        {
          header:
            "Break Count",

          key:
            "break_count",
        },

        {
          header:
            "Level",

          key:
            "level",

          value:
            (
              member
            ) =>
              levelLabel(
                member.level
              ),
        },

        {
          header:
            "Rank",

          key:
            "rank_name",
        },

        {
          header:
            "Sub Rank",

          key:
            "sub_rank_name",
        },

        {
          header:
            "Date Joined",

          key:
            "joined_date",
        },

        {
          header:
            "Last Grading",

          key:
            "last_grading_date",
        },

        {
          header:
            "Admin Access",

          key:
            "has_admin_access",

          value:
            (
              member
            ) =>
              member.has_admin_access
                ? "Yes"
                : "No",
        },

        {
          header:
            "Grading Assessor",

          key:
            "is_grading_assessor",

          value:
            (
              member
            ) =>
              member.is_grading_assessor
                ? "Yes"
                : "No",
        },
      ],

      data:
        filteredMembers,
    });
  }
  /*
   * =====================================================
   * DISPLAY HELPERS
   * =====================================================
   */

  function statusLabel(
    status:
      Member["membership_status"],
    dateOfPassing?: string | null
  ) {
    if (dateOfPassing) {
      return "Deceased";
    }

    if (status === "break_1") {
      return "Break 1";
    }

    if (status === "break_2") {
      return "Break 2";
    }

    if (status === "inactive") {
      return "Inactive";
    }

    return "Active";
  }


  function statusClass(
    status:
      Member["membership_status"],
    dateOfPassing?: string | null
  ) {
    if (dateOfPassing) {
      return "border-violet-700 bg-violet-950/40 text-violet-200";
    }

    if (
      status ===
      "active"
    ) {
      return "border-green-700 bg-green-950/40 text-green-300";
    }


    if (
      status ===
        "break_1" ||
      status ===
        "break_2"
    ) {
      return "border-yellow-700 bg-yellow-950/40 text-yellow-300";
    }


    return "border-red-700 bg-red-950/40 text-red-300";
  }


  function levelLabel(
    level:
      | "mudansha"
      | "yudansha"
  ) {
    return level ===
      "yudansha"
      ? "Yudansha (Dan)"
      : "Mudansha (Kyu)";
  }


  function levelClass(
    level:
      | "mudansha"
      | "yudansha"
  ) {
    return level ===
      "yudansha"
      ? "border-purple-800 bg-purple-950/30 text-purple-300"
      : "border-sky-800 bg-sky-950/30 text-sky-300";
  }


  function formatWhatsApp(
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return "-";
    }


    return value.startsWith(
      "62"
    )
      ? `+${value}`
      : value;
  }


  function openWhatsApp(
    number:
      string | null
  ) {
    if (
      !number
    ) {
      return;
    }


    window.open(
      `https://wa.me/${number}`,
      "_blank",
      "noopener,noreferrer"
    );
  }




  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">

        <p className="text-neutral-400">
          Loading members...
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

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Administration
              </p>


              <h1 className="text-3xl font-bold">
                Member Management
              </h1>


              <p className="mt-1 text-sm text-neutral-400">
                Membership, grading, administrative access, certificates and official records.
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

          <div className="grid gap-4 lg:grid-cols-6">

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
              placeholder="Name / Member ID / Email / Phone / WhatsApp"
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white lg:col-span-2"
            />


            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="break_1">
                Break 1
              </option>

              <option value="break_2">
                Break 2
              </option>

              <option value="inactive">
                Inactive
              </option>

              {isSuperAdmin && (
                <option value="deceased">
                  Deceased
                </option>
              )}

            </select>


            <select
              value={
                levelFilter
              }
              onChange={(e) =>
                setLevelFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Grades
              </option>

              <option value="mudansha">
                Mudansha (Kyu)
              </option>

              <option value="yudansha">
                Yudansha (Dan)
              </option>

            </select>


            <select
              value={
                adminAccessFilter
              }
              onChange={(e) =>
                setAdminAccessFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Admin Access
              </option>

              <option value="yes">
                Has Admin Access
              </option>

              <option value="no">
                No Admin Access
              </option>

            </select>


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
                  [
                    id,
                    name,
                  ]
                ) => (

                  <option
                    key={
                      id
                    }
                    value={
                      id
                    }
                  >
                    {name}
                  </option>

                )
              )}

            </select>

          </div>


          <div className="mt-4 max-w-sm">

            <select
              value={
                dojoFilter
              }
              onChange={(e) =>
                setDojoFilter(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >

              <option value="all">
                All Dojos
              </option>


              {dojos.map(
                (
                  [
                    id,
                    name,
                  ]
                ) => (

                  <option
                    key={
                      id
                    }
                    value={
                      id
                    }
                  >
                    {name}
                  </option>

                )
              )}

            </select>

          </div>


          <div className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">

  <p className="text-sm text-neutral-500">
    Showing{" "}
    {filteredMembers.length}{" "}
    of{" "}
    {members.length}{" "}
    memberships
  </p>


  <button
    type="button"
    disabled={
      filteredMembers.length ===
      0
    }
    onClick={
      exportMembersExcel
    }
    className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
  >
    Export Members to Excel
  </button>

</div>

        </section>


        {/* MEMBERS */}

        <section className="mt-6 space-y-5">

          {filteredMembers.length ===
          0 ? (

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

              <p className="text-neutral-400">
                No matching members found.
              </p>

            </div>

          ) : (

            filteredMembers.map(
              (
                member
              ) => {

                const next =
                  nextPromotions[
                    member.membership_id
                  ];


                const processing =
                  processingId ===
                  member.membership_id;


                const historyOpen =
                  openHistory[
                    member.membership_id
                  ] ??
                  false;


                const history =
                  gradeHistory[
                    member.membership_id
                  ];


                const showUndo =
                  undoOpen[
                    member.membership_id
                  ] ??
                  false;


                const editingJoinedDate =
                  joinedDateEditing[
                    member.membership_id
                  ] ??
                  false;


                const editingAikikai =
                  aikikaiEditing[
                    member.membership_id
                  ] ??
                  false;


                const titleOpen =
                  titleManageOpen[
                    member.membership_id
                  ] ??
                  false;


                const titleHistoryIsOpen =
                  titleHistoryOpen[
                    member.membership_id
                  ] ??
                  false;


                const memberTitleHistory =
                  titleHistory[
                    member.membership_id
                  ] ??
                  [];


                const accessOpen =
                  adminAccessOpen[
                    member.membership_id
                  ] ??
                  false;


                const loadingAccess =
                  loadingAdminAccess[
                    member.membership_id
                  ] ??
                  false;


                const adminOptions =
                  adminAccessOptions[
                    member.membership_id
                  ] ??
                  [];


                const feeOpen =
                  feeAdjustmentOpen[
                    member.membership_id
                  ] ??
                  false;


                const subscriptionSummary =
                  subscriptionSummaries[
                    member.membership_id
                  ];


                const loadingRate =
                  loadingSubscriptionSummary[
                    member.membership_id
                  ] ??
                  false;


                const memorialIsOpen =
                  memorialOpen[member.membership_id] ?? false;


                const memorialIsLoading =
                  memorialLoading[member.membership_id] ?? false;


                const memorialIsSaving =
                  memorialSaving[member.membership_id] ?? false;


                const memorialIsPublishing =
                  memorialPublishing[member.membership_id] ?? false;


                const memorialDraft =
                  memorialDrafts[member.user_id] ?? createMemorialDraft(member);


                const groupedAdminOptions =
                  Array.from(
                    new Map(
                      adminOptions.map(
                        (
                          option
                        ) => [
                          option.class_id,
                          option.class_name,
                        ]
                      )
                    )
                  );


                return (
                  <article
                    key={
                      member.membership_id
                    }
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                  >


                    {/* MEMBER HEADER */}

                    <div className="flex flex-col justify-between gap-5 lg:flex-row">

                      <div className="flex items-start gap-4">

                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-neutral-700 bg-neutral-800">

                          {member.avatar_url ? (

                            // Member avatars are user-managed storage URLs and
                            // must render even before their host is configured
                            // for image optimization.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                member.avatar_url
                              }
                              alt={
                                member.full_name
                              }
                              className="h-full w-full object-cover"
                            />

                          ) : (

                            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-500">

                              {member.full_name
                                .charAt(
                                  0
                                )
                                .toUpperCase()}

                            </div>

                          )}

                        </div>


                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h2 className="text-xl font-bold">
                              {
                                member.full_name
                              }
                            </h2>


                            {member.rank_id && (

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${levelClass(
                                  member.level
                                )}`}
                              >
                                {levelLabel(
                                  member.level
                                )}
                              </span>

                            )}


                            {member.has_admin_access && (

                              <span className="rounded-full border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-medium text-purple-300">
                                Admin Access
                              </span>

                            )}


                            {member.is_grading_assessor && (

                              <span className="rounded-full border border-green-800 bg-green-950/30 px-3 py-1 text-xs font-medium text-green-300">
                                Grading Assessor
                              </span>

                            )}


                            {member.date_of_passing && (

                              <span className="rounded-full border border-violet-700 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-200">
                                Deceased
                              </span>

                            )}

                          </div>


                          <p className="mt-1 text-sm text-neutral-400">
                            {member.level ===
                            "yudansha"
                              ? "Member ID / Aikikai Registration Number:"
                              : "Member ID:"}{" "}

                            <span className="font-medium text-neutral-300">
                              {member.registration_number ??
                                "Not assigned"}

                              {member.level ===
                                "yudansha" && (
                                <>
                                  {" / "}
                                  {member.aikikai_registration_number ??
                                    "Not assigned"}
                                </>
                              )}
                            </span>
                          </p>


                          <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">

                            <p>
                              <span className="text-neutral-500">
                                Email:
                              </span>{" "}
                              {
                                member.email
                              }
                            </p>


                            <p>
                              <span className="text-neutral-500">
                                Phone:
                              </span>{" "}
                              {
                                member.phone
                              }
                            </p>


                            <p>
                              <span className="text-neutral-500">
                                WhatsApp:
                              </span>{" "}

                              {member.whatsapp_number ? (

                                <>
                                  {formatWhatsApp(
                                    member.whatsapp_number
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openWhatsApp(
                                        member.whatsapp_number
                                      )
                                    }
                                    className="ml-2 font-medium text-green-400 hover:text-green-300"
                                  >
                                    Open →
                                  </button>
                                </>

                              ) : (
                                "-"
                              )}
                            </p>


                            <p>
                              <span className="text-neutral-500">
                                DOB:
                              </span>{" "}
                              {formatDate(
                                member.date_of_birth
                              )}
                            </p>


                            {member.date_of_passing && (
                              <p>
                                <span className="text-neutral-500">
                                  Date of Passing:
                                </span>{" "}
                                {formatDate(member.date_of_passing)}
                              </p>
                            )}


                            <p>
                              <span className="text-neutral-500">
                                Class:
                              </span>{" "}
                              {
                                member.class_name
                              }
                            </p>


                            <p>
                              <span className="text-neutral-500">
                                Member Of:
                              </span>{" "}
                              {member.dojo_name ??
                                "-"}
                            </p>

                          </div>

                        </div>

                      </div>


                      <span
                        className={`self-start rounded-full border px-3 py-1 text-sm font-medium ${statusClass(
                          member.membership_status,
                          member.date_of_passing
                        )}`}
                      >
                        {statusLabel(
                          member.membership_status,
                          member.date_of_passing
                        )}
                      </span>

                    </div>


                    {/* MEMBERSHIP TIMELINE */}

                    <div className="mt-6 grid gap-4 border-t border-neutral-800 pt-5 md:grid-cols-2">

                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5">

                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Date Joined
                        </p>


                        {!editingJoinedDate ? (

                          <>
                            <p className="mt-2 text-lg font-semibold">
                              {member.joined_date
                                ? formatDate(
                                    member.joined_date
                                  )
                                : "Not recorded"}
                            </p>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                startJoinedDateEdit(
                                  member
                                )
                              }
                              className="mt-3 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                            >
                              Edit Date Joined
                            </button>

                          </>

                        ) : (

                          <div className="mt-3">

                            <input
                              type="date"
                              value={
                                joinedDateDraft[
                                  member.membership_id
                                ] ??
                                ""
                              }
                              onChange={(e) =>
                                setJoinedDateDraft(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [member.membership_id]:
                                      e.target.value,
                                  })
                                )
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
                                  saveJoinedDate(
                                    member
                                  )
                                }
                                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold hover:bg-sky-500 disabled:opacity-50"
                              >
                                Save
                              </button>


                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  cancelJoinedDateEdit(
                                    member.membership_id
                                  )
                                }
                                className="rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        )}

                      </div>


                      <div className="rounded-xl border border-sky-900 bg-sky-950/10 p-5">

                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                          Last Grading
                        </p>


                        <p className="mt-2 text-lg font-semibold">
                          {member.last_grading_date
                            ? formatDate(
                                member.last_grading_date
                              )
                            : "Not graded yet"}
                        </p>


                        <p className="mt-2 text-xs text-neutral-500">
                          Latest valid promotion date.
                        </p>

                      </div>

                    </div>


                    {/* TITLE APPOINTMENT */}

                    {isSuperAdmin &&
                      member.title_system &&
                      member.title_system !== "none" && (

                      <div className="mt-6 rounded-xl border border-amber-900 bg-amber-950/10 p-5">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                              Title Appointment
                            </p>


                            <p className="mt-2 text-lg font-semibold">
                              {member.title_name ??
                                "No title appointed"}
                            </p>


                            <p className="mt-2 text-xs text-neutral-500">
                              Optional appointment for selected Members only.
                            </p>

                          </div>


                          <div className="flex flex-wrap gap-2">

                            <button
                              type="button"
                              disabled={processing}
                              onClick={() =>
                                titleOpen
                                  ? closeTitleManager(
                                      member.membership_id
                                    )
                                  : openTitleManager(
                                      member
                                    )
                              }
                              className="rounded-lg border border-amber-800 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-950/30 disabled:opacity-50"
                            >
                              {titleOpen
                                ? "Close"
                                : "Manage Title"}
                            </button>


                            {member.title_level && (

                              <button
                                type="button"
                                disabled={processing}
                                onClick={() =>
                                  toggleTitleHistory(
                                    member.membership_id
                                  )
                                }
                                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                              >
                                {titleHistoryIsOpen
                                  ? "Hide History"
                                  : "Title History"}
                              </button>

                            )}


                            {member.title_level && (

                              <button
                                type="button"
                                disabled={processing}
                                onClick={() =>
                                  printCurrentTitleCertificate(
                                    member
                                  )
                                }
                                className="rounded-lg border border-purple-800 bg-purple-950/20 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-950/40 disabled:opacity-50"
                              >
                                {processing
                                  ? "Preparing..."
                                  : `Print ${member.title_name ?? "Title"} Certificate`}
                              </button>

                            )}

                          </div>

                        </div>


                        {titleOpen && (

                          <div className="mt-5 grid gap-4 border-t border-neutral-800 pt-5 md:grid-cols-[1fr_220px_auto] md:items-end">

                            <div>

                              <label className="mb-2 block text-sm font-medium">
                                Title
                              </label>


                              <select
                                value={
                                  titleLevelDraft[
                                    member.membership_id
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  setTitleLevelDraft(
                                    (current) => ({
                                      ...current,
                                      [member.membership_id]:
                                        e.target.value,
                                    })
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              >

                                <option value="">
                                  Select title
                                </option>

                                <option value="1">
                                  {member.title_system === "chinese"
                                    ? "Fujiaoshi"
                                    : "Fuku Kiyoshi"}
                                </option>

                                <option value="2">
                                  {member.title_system === "chinese"
                                    ? "Jiaoshi"
                                    : "Kiyoshi"}
                                </option>

                                <option value="3">
                                  {member.title_system === "chinese"
                                    ? "Dashi"
                                    : "Daishi"}
                                </option>

                              </select>

                            </div>


                            <div>

                              <label className="mb-2 block text-sm font-medium">
                                Effective Date
                              </label>


                              <input
                                type="date"
                                value={
                                  titleDateDraft[
                                    member.membership_id
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  setTitleDateDraft(
                                    (current) => ({
                                      ...current,
                                      [member.membership_id]:
                                        e.target.value,
                                    })
                                  )
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-3"
                              />

                            </div>


                            <button
                              type="button"
                              disabled={processing}
                              onClick={() =>
                                grantMemberTitle(
                                  member
                                )
                              }
                              className="rounded-lg bg-amber-600 px-5 py-3 font-semibold hover:bg-amber-500 disabled:opacity-50"
                            >
                              Grant / Update Title
                            </button>

                          </div>

                        )}


                        {titleHistoryIsOpen && (

                          <div className="mt-5 border-t border-neutral-800 pt-5">

                            <p className="font-semibold">
                              Title History
                            </p>


                            <div className="mt-3 space-y-3">

                              {memberTitleHistory.map((item) => (

                                <div
                                  key={item.history_id}
                                  className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4"
                                >

                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                    <div>

                                      <div className="flex flex-wrap items-center gap-2">

                                        <p className="font-semibold">
                                          {item.title_name ??
                                            `Title Level ${item.title_level}`}
                                        </p>


                                        <span
                                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                                            item.revoked_at
                                              ? "border-red-900 bg-red-950/30 text-red-300"
                                              : "border-green-900 bg-green-950/30 text-green-300"
                                          }`}
                                        >
                                          {item.revoked_at
                                            ? "REVOKED"
                                            : "VALID"}
                                        </span>

                                      </div>


                                      <p className="mt-2 text-sm text-neutral-400">
                                        Effective:{" "}
                                        {formatDate(
                                          item.effective_date
                                        )}
                                      </p>


                                      <p className="mt-1 text-xs text-neutral-600">
                                        Granted by:{" "}
                                        {item.granted_by_name ??
                                          "Super Admin"}
                                      </p>


                                      {item.revoke_reason && (

                                        <p className="mt-2 text-xs text-red-300">
                                          Reason:{" "}
                                          {item.revoke_reason}
                                        </p>

                                      )}

                                    </div>


                                    {!item.revoked_at && (

                                      <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() =>
                                          revokeTitleHistoryItem(
                                            member,
                                            item
                                          )
                                        }
                                        className="self-start rounded-lg border border-red-900 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                                      >
                                        Revoke
                                      </button>

                                    )}

                                  </div>

                                </div>

                              ))}


                              {memberTitleHistory.length === 0 && (

                                <p className="text-sm text-neutral-500">
                                  No title history yet.
                                </p>

                              )}

                            </div>

                          </div>

                        )}

                      </div>

                    )}


                    {/* AIKIKAI REGISTRATION NUMBER */}

                    {isSuperAdmin &&
                      member.level ===
                        "yudansha" && (

                      <div className="mt-6 rounded-xl border border-purple-900 bg-purple-950/10 p-5">

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                              Aikikai Registration Number
                            </p>


                            {!editingAikikai ? (

                              <>
                                <p className="mt-2 text-lg font-semibold">
                                  {member.aikikai_registration_number ??
                                    "Not assigned"}
                                </p>


                                <p className="mt-2 text-xs text-neutral-500">
                                  Official Aikikai registration identifier for this Yudansha Member.
                                </p>
                              </>

                            ) : (

                              <div className="mt-3">

                                <input
                                  type="text"
                                  value={
                                    aikikaiDraft[
                                      member.membership_id
                                    ] ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setAikikaiDraft(
                                      (
                                        current
                                      ) => ({
                                        ...current,

                                        [member.membership_id]:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Enter Aikikai Registration Number"
                                  className="w-full max-w-md rounded-lg border border-purple-800 bg-neutral-800 px-3 py-2 text-white"
                                />


                                <p className="mt-2 text-xs text-neutral-500">
                                  Leave blank and save if the number should be removed.
                                </p>

                              </div>

                            )}

                          </div>


                          {!editingAikikai ? (

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                startAikikaiEdit(
                                  member
                                )
                              }
                              className="self-start rounded-lg border border-purple-800 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-950/30 disabled:opacity-50"
                            >
                              Edit
                            </button>

                          ) : (

                            <div className="flex gap-2">

                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  saveAikikaiRegistrationNumber(
                                    member
                                  )
                                }
                                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold hover:bg-purple-600 disabled:opacity-50"
                              >
                                Save
                              </button>


                              <button
                                type="button"
                                disabled={
                                  processing
                                }
                                onClick={() =>
                                  cancelAikikaiEdit(
                                    member.membership_id
                                  )
                                }
                                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    )}


                    {/* OFFICIAL RECORDS */}

                    <div className="mt-6 border-t border-neutral-800 pt-5">

                      <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                        Official Records
                      </p>


                      <div className="mt-4 flex flex-wrap gap-3">

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            exportOfficialPDF(
                              member
                            )
                          }
                          className="rounded-lg border border-amber-700 bg-amber-950/20 px-5 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
                        >
                          {processing
                            ? "Preparing..."
                            : "Export Official Member PDF"}
                        </button>


                        {member.rank_id && (

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              printCurrentRankCertificate(
                                member
                              )
                            }
                            className="rounded-lg border border-purple-700 bg-purple-950/20 px-5 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-950/40 disabled:opacity-50"
                          >
                            {processing
                              ? "Preparing..."
                              : `Print ${member.rank_name ?? "Grade"} Certificate`}
                          </button>

                        )}

                      </div>

                    </div>


                    {/* CURRENT / NEXT */}

                    <div className="mt-6 grid gap-4 border-t border-neutral-800 pt-5 md:grid-cols-2">

                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5">

                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Current Grade
                        </p>


                        <p className="mt-2 text-xl font-bold">
                          {member.rank_name ??
                            "Unranked"}
                        </p>


                        {member.sub_rank_name && (

                          <p className="mt-1 text-neutral-400">
                            {
                              member.sub_rank_name
                            }
                          </p>

                        )}

                      </div>


                      <div className="rounded-xl border border-sky-900 bg-sky-950/20 p-5">

                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                          Next Promotion
                        </p>


                        {next ? (

                          <>
                            <p className="mt-2 text-xl font-bold">
                              {
                                next.next_rank_name
                              }
                            </p>


                            <p className="mt-1 text-neutral-300">
                              {
                                next.next_sub_rank_name
                              }
                            </p>


                            {next.is_rank_promotion && (

                              <span className="mt-3 inline-flex rounded-full border border-amber-800 bg-amber-950/30 px-3 py-1 text-xs text-amber-300">
                                New Rank · Certificate Eligible
                              </span>

                            )}

                          </>

                        ) : (

                          <p className="mt-2 font-semibold text-neutral-400">
                            Highest configured rank reached
                          </p>

                        )}

                      </div>

                    </div>


                    {/* PROMOTION */}

                    {next && (

                      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-5">

                        <p className="font-semibold">
                          Promote Member
                        </p>


                        <p className="mt-1 text-sm text-neutral-500">
                          The next grade is calculated automatically. Every grading must have an assessor.
                        </p>


                        <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:items-end">

                          <div>

                            <label className="mb-2 block text-sm font-medium">
                              Promotion Effective Date
                            </label>


                            <input
                              type="date"
                              value={
                                promotionDates[
                                  member.membership_id
                                ] ??
                                ""
                              }
                              onChange={(e) =>
                                setPromotionDates(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [member.membership_id]:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                            />

                          </div>


                          {next.next_level ===
                          "yudansha" ? (

                            <div>

                              <label className="mb-2 block text-sm font-medium">
                                External Assessor
                              </label>


                              <input
                                type="text"
                                value={
                                  externalAssessorNames[
                                    member.membership_id
                                  ] ??
                                  ""
                                }
                                onChange={(e) =>
                                  setExternalAssessorNames(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [member.membership_id]:
                                        e.target.value,
                                    })
                                  )
                                }
                                placeholder="Enter assessor's full name"
                                className="w-full rounded-lg border border-purple-800 bg-neutral-800 px-3 py-2 text-white placeholder:text-neutral-600"
                              />


                              <p className="mt-2 text-xs text-purple-300/70">
                                Yudansha grading uses an external assessor name.
                              </p>

                            </div>

                          ) : (

                            <div>

                              <label className="mb-2 block text-sm font-medium">
                                Grading Assessor
                              </label>


                              <select
                                value={
                                  selectedAssessors[
                                    member.membership_id
                                  ] ??
                                  ""
                                }
                                onChange={(e) =>
                                  setSelectedAssessors(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [member.membership_id]:
                                        e.target.value,
                                    })
                                  )
                                }
                                className="w-full rounded-lg border border-green-800 bg-neutral-800 px-3 py-2 text-white"
                              >

                                <option value="">
                                  Select active assessor
                                </option>


                                {gradingAssessors.map(
                                  (
                                    assessor
                                  ) => (

                                    <option
                                      key={
                                        assessor.member_id
                                      }
                                      value={
                                        assessor.member_id
                                      }
                                    >
                                      {
                                        assessor.full_name
                                      }
                                    </option>

                                  )
                                )}

                              </select>


                              {gradingAssessors.length ===
                              0 && (

                                <p className="mt-2 text-xs text-amber-400">
                                  No active grading assessors are configured. Super Admin must enable at least one Member as a Grading Assessor.
                                </p>

                              )}

                            </div>

                          )}


                          <button
                            type="button"
                            disabled={
                              processing ||
                              (
                                next.next_level ===
                                  "mudansha" &&
                                gradingAssessors.length ===
                                  0
                              )
                            }
                            onClick={() =>
                              promoteMember(
                                member
                              )
                            }
                            className="rounded-lg bg-sky-500 px-5 py-2 font-semibold hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processing
                              ? "Processing..."
                              : `Promote to ${next.next_rank_name} · ${next.next_sub_rank_name}`}
                          </button>

                        </div>

                      </div>

                    )}


                    {/* UNDO */}

                    <div className="mt-5">

                      {!showUndo ? (

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            setUndoOpen(
                              (
                                current
                              ) => ({
                                ...current,

                                [member.membership_id]:
                                  true,
                              })
                            )
                          }
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Undo Last Promotion
                        </button>

                      ) : (

                        <div className="rounded-xl border border-red-900 bg-red-950/10 p-5">

                          <p className="font-semibold text-red-300">
                            Undo Last Promotion
                          </p>


                          <textarea
                            rows={3}
                            value={
                              undoReasons[
                                member.membership_id
                              ] ??
                              ""
                            }
                            onChange={(e) =>
                              setUndoReasons(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [member.membership_id]:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="Reason for correction..."
                            className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                          />


                          <div className="mt-4 flex gap-3">

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                undoPromotion(
                                  member
                                )
                              }
                              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                            >
                              Confirm Undo
                            </button>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                setUndoOpen(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [member.membership_id]:
                                      false,
                                  })
                                )
                              }
                              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      )}

                    </div>


                    {/* HISTORY */}

                    <div className="mt-6 border-t border-neutral-800 pt-5">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                            Official Promotion Record
                          </p>

                          <p className="mt-1 text-sm text-neutral-500">
                            Valid and revoked promotions are retained permanently.
                          </p>
                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            toggleHistory(
                              member.membership_id
                            )
                          }
                          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm"
                        >
                          {historyOpen
                            ? "Hide History"
                            : "View History"}
                        </button>

                      </div>


                      {historyOpen && (

                        <div className="mt-4 space-y-3">

                          {!history ? (

                            <p className="text-sm text-neutral-500">
                              Loading history...
                            </p>

                          ) : history.length ===
                            0 ? (

                            <p className="text-sm text-neutral-500">
                              No promotions recorded yet.
                            </p>

                          ) : (

                            history.map(
                              (
                                item
                              ) => (

                                <div
                                  key={
                                    item.id
                                  }
                                  className={`rounded-xl border p-4 ${
                                    item.revoked_at
                                      ? "border-red-900 bg-red-950/10"
                                      : "border-neutral-800 bg-neutral-950/50"
                                  }`}
                                >

                                  <div className="flex flex-wrap items-center gap-2">

                                    <p className="font-semibold">
                                      {item.rank_name ??
                                        "Unranked"}

                                      {item.sub_rank_name
                                        ? ` · ${item.sub_rank_name}`
                                        : ""}
                                    </p>


                                    <span
                                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                                        item.revoked_at
                                          ? "border-red-800 text-red-300"
                                          : "border-green-800 text-green-300"
                                      }`}
                                    >
                                      {item.revoked_at
                                        ? "REVOKED"
                                        : "VALID"}
                                    </span>

                                  </div>


                                  <p className="mt-2 text-sm text-neutral-400">
                                    Effective:{" "}
                                    {formatDate(
                                      item.effective_date
                                    )}
                                  </p>


                                  <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/70 p-3">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="text-sm">
                                        <span className="text-neutral-500">
                                          Assessor:
                                        </span>{" "}

                                        <span className="font-semibold text-neutral-200">
                                          {item.assessor_name_snapshot ??
                                            "Not recorded"}
                                        </span>
                                      </p>


                                      {item.assessor_type && (

                                        <span
                                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                                            item.assessor_type ===
                                            "external"
                                              ? "border-purple-800 bg-purple-950/30 text-purple-300"
                                              : "border-green-800 bg-green-950/30 text-green-300"
                                          }`}
                                        >
                                          {item.assessor_type ===
                                          "external"
                                            ? "EXTERNAL ASSESSOR"
                                            : "MEMBER ASSESSOR"}
                                        </span>

                                      )}

                                    </div>

                                  </div>


                                  <p className="mt-2 text-xs text-neutral-600">
                                    Recorded:{" "}
                                    {formatDateTime(
                                      item.created_at
                                    )}
                                  </p>


                                  {item.revoked_at && (

                                    <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/20 p-3">

                                      <p className="text-sm text-red-300">
                                        Reason:{" "}
                                        {item.revoke_reason ??
                                          "No reason recorded"}
                                      </p>


                                      <p className="mt-1 text-xs text-red-400/70">
                                        Revoked:{" "}
                                        {formatDateTime(
                                          item.revoked_at
                                        )}
                                      </p>

                                    </div>

                                  )}

                                </div>

                              )
                            )

                          )}

                        </div>

                      )}

                    </div>


                    {/* GRADING ASSESSOR */}

                    {isSuperAdmin && (

                      <div className="mt-6 border-t border-neutral-800 pt-5">

                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5">

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
                                  Grading Assessor
                                </p>


                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                    member.is_grading_assessor
                                      ? "border-green-800 bg-green-950/30 text-green-300"
                                      : "border-neutral-700 bg-neutral-900 text-neutral-500"
                                  }`}
                                >
                                  {member.is_grading_assessor
                                    ? "ACTIVE"
                                    : "NOT ASSESSOR"}
                                </span>

                              </div>


                              <p className="mt-2 text-sm text-neutral-500">
                                Active assessors can be selected for Mudansha grading. Super Admin can switch this on or off at any time.
                              </p>

                            </div>


                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                toggleGradingAssessor(
                                  member
                                )
                              }
                              aria-pressed={
                                member.is_grading_assessor
                              }
                              aria-label={
                                member.is_grading_assessor
                                  ? `Disable grading assessor for ${member.full_name}`
                                  : `Enable grading assessor for ${member.full_name}`
                              }
                              className={`relative h-8 w-16 shrink-0 rounded-full transition ${
                                member.is_grading_assessor
                                  ? "bg-green-600"
                                  : "bg-neutral-700"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >

                              <span
                                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                                  member.is_grading_assessor
                                    ? "left-9"
                                    : "left-1"
                                }`}
                              />

                            </button>

                          </div>

                        </div>

                      </div>

                    )}


                    {/* ADMIN ACCESS */}

                    {isSuperAdmin && (

                      <div className="mt-6 border-t border-neutral-800 pt-5">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <div>

                            <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                              Administrative Access
                            </p>


                            <p className="mt-1 text-sm text-neutral-500">
                              Separate from the member&apos;s actual dojo membership.
                            </p>

                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              toggleAdminAccess(
                                member
                              )
                            }
                            className="rounded-lg border border-purple-800 px-4 py-2 text-sm text-purple-300 hover:bg-purple-950/30"
                          >
                            {accessOpen
                              ? "Hide Access"
                              : "Manage Access"}
                          </button>

                        </div>


                        {accessOpen && (

                          <div className="mt-4">

                            {loadingAccess ? (

                              <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 text-sm text-neutral-500">
                                Loading administrative access...
                              </div>

                            ) : adminOptions.length ===
                              0 ? (

                              <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 text-sm text-neutral-500">
                                No eligible dojos.
                              </div>

                            ) : (

                              <div className="space-y-4">

                                {groupedAdminOptions.map(
                                  (
                                    [
                                      classId,
                                      className,
                                    ]
                                  ) => {

                                    const options =
                                      adminOptions.filter(
                                        (
                                          option
                                        ) =>
                                          option.class_id ===
                                          classId
                                      );


                                    return (
                                      <div
                                        key={
                                          classId
                                        }
                                        className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-5"
                                      >

                                        <p className="text-sm font-semibold uppercase tracking-wider text-purple-300">
                                          {
                                            className
                                          }
                                        </p>


                                        <div className="mt-4 space-y-2">

                                          {options.map(
                                            (
                                              option
                                            ) => {

                                              const processingAccess =
                                                adminAccessProcessing ===
                                                `${member.membership_id}:${option.dojo_id}`;


                                              return (
                                                <div
                                                  key={
                                                    option.dojo_id
                                                  }
                                                  className={`flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
                                                    option.is_admin
                                                      ? "border-purple-800 bg-purple-950/20"
                                                      : "border-neutral-800 bg-neutral-900"
                                                  }`}
                                                >

                                                  <div>

                                                    <div className="flex flex-wrap items-center gap-2">

                                                      <p className="font-medium">
                                                        {
                                                          option.dojo_name
                                                        }
                                                      </p>


                                                      {option.is_member_dojo && (

                                                        <span className="rounded-full border border-sky-800 bg-sky-950/30 px-2 py-1 text-[10px] font-semibold text-sky-300">
                                                          MEMBER DOJO
                                                        </span>

                                                      )}


                                                      {option.is_admin && (

                                                        <span className="rounded-full border border-purple-800 bg-purple-950/30 px-2 py-1 text-[10px] font-semibold text-purple-300">
                                                          ADMIN
                                                        </span>

                                                      )}

                                                    </div>


                                                    <p className="mt-1 text-xs text-neutral-500">
                                                      {option.is_admin
                                                        ? "Administrative access enabled"
                                                        : "No administrative access"}
                                                    </p>

                                                  </div>


                                                  <button
                                                    type="button"
                                                    disabled={
                                                      processingAccess
                                                    }
                                                    onClick={() =>
                                                      changeDojoAdminAccess(
                                                        member,
                                                        option
                                                      )
                                                    }
                                                    className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                                                      option.is_admin
                                                        ? "border-red-900 text-red-300 hover:bg-red-950/30"
                                                        : "border-green-800 text-green-300 hover:bg-green-950/30"
                                                    }`}
                                                  >
                                                    {processingAccess
                                                      ? "Processing..."
                                                      : option.is_admin
                                                      ? "Remove Admin Access"
                                                      : "Grant Admin Access"}
                                                  </button>

                                                </div>
                                              );
                                            }
                                          )}

                                        </div>

                                      </div>
                                    );
                                  }
                                )}

                              </div>

                            )}

                          </div>

                        )}

                      </div>

                    )}


                    {/* SUBSCRIPTION FEE */}

                    <div className="mt-6 border-t border-neutral-800 pt-5">
                      <div className="rounded-xl border border-emerald-900 bg-emerald-950/10 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                              Subscription & Payment
                            </p>
                            <p className="mt-2 text-xs text-neutral-500">
                              Current fee, monthly charge, official payments and Member-specific rate.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={processing || loadingRate}
                            onClick={() => toggleFeeAdjustment(member)}
                            className="self-start rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                          >
                            {loadingRate
                              ? "Loading..."
                              : feeOpen
                              ? "Close Adjustment"
                              : "Adjust Fee"}
                          </button>
                        </div>

                        {subscriptionSummary ? (
                          <>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                                <p className="text-xs uppercase tracking-wider text-neutral-500">Current Rate</p>
                                <p className="mt-2 text-lg font-bold">
                                  {subscriptionSummary.current_rate_currency} {subscriptionSummary.current_rate.toLocaleString()}
                                </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {subscriptionSummary.current_rate_source === "member_special"
                                    ? "Member special rate"
                                    : "Dojo default rate"}
                                </p>
                              </div>

                              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                                <p className="text-xs uppercase tracking-wider text-neutral-500">Current Month Charge</p>
                                <p className="mt-2 text-lg font-bold">
                                  {subscriptionSummary.charge_amount == null
                                    ? "No charge"
                                    : `${subscriptionSummary.charge_currency ?? subscriptionSummary.current_rate_currency} ${subscriptionSummary.charge_amount.toLocaleString()}`}
                                </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {formatDate(subscriptionSummary.billing_month)}
                                </p>
                              </div>

                              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                                <p className="text-xs uppercase tracking-wider text-neutral-500">Paid / Remaining</p>
                                <p className="mt-2 font-semibold text-green-300">
                                  Paid: {subscriptionSummary.charge_currency ?? subscriptionSummary.current_rate_currency} {subscriptionSummary.total_paid.toLocaleString()}
                                </p>
                                <p className="mt-1 text-sm text-amber-300">
                                  Remaining: {subscriptionSummary.charge_currency ?? subscriptionSummary.current_rate_currency} {(subscriptionSummary.remaining_balance ?? 0).toLocaleString()}
                                </p>
                              </div>

                              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                                <p className="text-xs uppercase tracking-wider text-neutral-500">Payment Status</p>
                                <p className="mt-2 font-bold uppercase">
                                  {subscriptionSummary.charge_status ?? "NO CHARGE"}
                                </p>
                                {subscriptionSummary.has_pending_confirmation && (
                                  <p className="mt-2 text-xs font-semibold text-amber-300">
                                    PAYMENT CONFIRMATION PENDING
                                  </p>
                                )}
                              </div>
                            </div>

                            {subscriptionSummary.special_rate_amount != null && (
                              <div className="mt-4 rounded-lg border border-sky-900 bg-sky-950/10 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                                  Member Special Rate
                                </p>
                                <p className="mt-2 font-semibold">
                                  {subscriptionSummary.special_rate_currency ?? "IDR"} {subscriptionSummary.special_rate_amount.toLocaleString()}
                                </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  Effective {subscriptionSummary.special_rate_effective_from
                                    ? formatDate(subscriptionSummary.special_rate_effective_from)
                                    : "-"}
                                  {subscriptionSummary.special_rate_effective_until
                                    ? ` → ${formatDate(subscriptionSummary.special_rate_effective_until)}`
                                    : " → ongoing"}
                                </p>
                              </div>
                            )}

                            {!subscriptionSummary.can_adjust_current_month && (
                              <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-200">
                                Current-month adjustment is locked because the charge has payment activity, a pending confirmation, or is already closed. Future fee changes can still start next month.
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="mt-4 text-sm text-neutral-500">
                            Open Adjust Fee to load the current subscription and payment summary.
                          </p>
                        )}

                        {feeOpen && (
                          <div className="mt-5 border-t border-neutral-800 pt-5">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium">New Fee Amount</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={feeAmountDraft[member.membership_id] ?? ""}
                                  onChange={(e) =>
                                    setFeeAmountDraft((current) => ({
                                      ...current,
                                      [member.membership_id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter new fee"
                                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium">Apply Adjustment</label>
                                <select
                                  value={feeModeDraft[member.membership_id] ?? "this_month_only"}
                                  onChange={(e) =>
                                    setFeeModeDraft((current) => ({
                                      ...current,
                                      [member.membership_id]: e.target.value as FeeAdjustmentMode,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white"
                                >
                                  <option
                                    value="this_month_only"
                                    disabled={subscriptionSummary?.can_adjust_current_month === false}
                                  >
                                    This month only
                                  </option>
                                  <option value="this_month_onward">This month onward</option>
                                  <option value="next_month_onward">Next month onward</option>
                                </select>
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 text-sm text-neutral-400">
                              {(feeModeDraft[member.membership_id] ?? "this_month_only") === "this_month_only" ? (
                                <p><span className="font-semibold text-white">This month only:</span> changes only the unpaid current-month charge. Future recurring rates stay unchanged.</p>
                              ) : (feeModeDraft[member.membership_id] ?? "this_month_only") === "this_month_onward" ? (
                                <p><span className="font-semibold text-white">This month onward:</span> changes this month and the recurring rate. If this month is locked, the backend automatically starts the new rate next month.</p>
                              ) : (
                                <p><span className="font-semibold text-white">Next month onward:</span> leaves this month untouched and changes the recurring rate beginning next month.</p>
                              )}
                            </div>

                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-medium">Adjustment Reason</label>
                              <textarea
                                rows={3}
                                value={feeReasonDraft[member.membership_id] ?? ""}
                                onChange={(e) =>
                                  setFeeReasonDraft((current) => ({
                                    ...current,
                                    [member.membership_id]: e.target.value,
                                  }))
                                }
                                placeholder="Example: Special member rate approved by Admin"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white placeholder:text-neutral-600"
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                disabled={processing || loadingRate}
                                onClick={() => applyFeeAdjustment(member)}
                                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processing ? "Applying..." : "Apply Fee Adjustment"}
                              </button>
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() =>
                                  setFeeAdjustmentOpen((current) => ({
                                    ...current,
                                    [member.membership_id]: false,
                                  }))
                                }
                                className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>


                    {isSuperAdmin && (
                      <DeceasedMemorialPanel
                        fullName={member.full_name}
                        classes={classes.map(([id, name]) => ({ id, name }))}
                        draft={memorialDraft}
                        open={memorialIsOpen}
                        loading={memorialIsLoading}
                        saving={memorialIsSaving}
                        publishing={memorialIsPublishing}
                        onToggleOpen={() => toggleMemorialSettings(member)}
                        onChange={(draft) =>
                          updateMemorialDraft(member.user_id, draft)
                        }
                        onSave={() => saveMemorialSettings(member)}
                        onPublishInitialMemorial={() =>
                          publishInitialMemorial(member)
                        }
                      />
                    )}


                    {/* STATUS */}

                    <div className="mt-6 border-t border-neutral-800 pt-5">

                      <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
                        Membership Status
                      </p>


                      <div className="mt-4 flex flex-wrap gap-3">

                        {member.date_of_passing ? (
                          <div className="w-full rounded-lg border border-violet-900 bg-violet-950/20 p-4 text-sm text-violet-100">
                            Deceased — membership history remains preserved as{" "}
                            <span className="font-semibold">
                              {statusLabel(member.membership_status)}
                            </span>
                            . Use Memorial Settings above to make any correction; Deceased is not
                            Inactive or Terminated.
                          </div>
                        ) : (
                          <>

                        {member.membership_status ===
                          "active" && (

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              setBreak(
                                member
                              )
                            }
                            className="rounded-lg border border-yellow-800 px-4 py-2 text-sm text-yellow-300 hover:bg-yellow-950/30 disabled:opacity-50"
                          >
                            Set Break 1
                          </button>

                        )}


                        {(
                          member.membership_status ===
                            "break_1" ||
                          member.membership_status ===
                            "break_2" ||
                          member.membership_status ===
                            "inactive"
                        ) && (

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              setActive(
                                member
                              )
                            }
                            className="rounded-lg border border-green-800 px-4 py-2 text-sm text-green-300 hover:bg-green-950/30 disabled:opacity-50"
                          >
                            Set Active
                          </button>

                        )}


                        {member.membership_status !==
                          "inactive" && (

                          <button
                            type="button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              setInactive(
                                member
                              )
                            }
                            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                          >
                            Set Inactive
                          </button>

                        )}

                          </>
                        )}

                      </div>

                    </div>

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

"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClassEnrollmentPanel from "@/components/class-enrollment-panel";

type Profile = {
  id: string;
  registration_number: string | null;
  aikikai_registration_number: string | null;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number: string | null;
  date_of_birth: string;
  avatar_url: string | null;
};

type Membership = {
  id: string;
  class_id: string;
  dojo_id: string | null;

  status:
    | "active"
    | "break_1"
    | "break_2"
    | "inactive";

  level: "mudansha" | "yudansha";

  role: "user" | "admin";

  rank_id: string | null;
  sub_rank_id: string | null;
  title_level: number | null;

  classes: {
    id: string;
    name: string;
    title_system:
      | "japanese"
      | "chinese"
      | "none"
      | null;
  } | null;

  dojos: {
    id: string;
    name: string;
  } | null;

  ranks: {
    id: string;
    name: string;
  } | null;

  sub_ranks: {
    id: string;
    name: string;
  } | null;
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

type Dojo = {
  id: string;
  name: string;
  class_id: string;
};

type BreakRequest = {
  request_id: string;
  membership_id: string;

  class_id: string;
  class_name: string;

  dojo_id: string | null;
  dojo_name: string | null;

  membership_status: string;
  request_status:
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled";

  reason: string | null;
  requested_at: string;

  effective_from: string | null;

  activation_type:
    | "immediate"
    | "next_month"
    | null;

  reviewed_at: string | null;
  rejection_reason: string | null;
  applied_at: string | null;
};

export default function ProfilePage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [memberships, setMemberships] =
    useState<Membership[]>([]);

  const [aikidoDojos, setAikidoDojos] =
    useState<Dojo[]>([]);

  /*
   * =====================================================
   * AVATAR
   * =====================================================
   */

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);

  /*
   * =====================================================
   * WHATSAPP
   * =====================================================
   */

  const [editingWhatsApp, setEditingWhatsApp] =
    useState(false);

  const [whatsappInput, setWhatsappInput] =
    useState("");

  /*
   * =====================================================
   * DOJO TRANSFER
   * =====================================================
   */

  const [showTransfer, setShowTransfer] =
    useState(false);

  const [transferDojoId, setTransferDojoId] =
    useState("");

  const [transferReason, setTransferReason] =
    useState("");

  /*
   * =====================================================
   * TITLE HISTORY
   * =====================================================
   */

  const [titleHistoryOpen, setTitleHistoryOpen] =
    useState<Record<string, boolean>>({});

  const [titleHistory, setTitleHistory] =
    useState<Record<string, TitleHistoryItem[]>>({});

  const [
    loadingTitleHistory,
    setLoadingTitleHistory,
  ] = useState<Record<string, boolean>>({});

  /*
   * =====================================================
   * BREAK REQUESTS
   * =====================================================
   */

  const [breakRequests, setBreakRequests] =
    useState<BreakRequest[]>([]);

  const [
    breakFormMembershipId,
    setBreakFormMembershipId,
  ] = useState<string | null>(null);

  const [breakReason, setBreakReason] =
    useState("");

  const [
    breakProcessingId,
    setBreakProcessingId,
  ] = useState<string | null>(null);

  /*
   * =====================================================
   * GENERAL
   * =====================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">("");

  /*
   * =====================================================
   * LOAD PROFILE
   * =====================================================
   */

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          registration_number,
          aikikai_registration_number,
          full_name,
          email,
          phone,
          whatsapp_number,
          date_of_birth,
          avatar_url
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        if (active) {
          setMessage(profileError.message);
          setMessageType("error");
          setLoading(false);
        }

        return;
      }

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("class_memberships")
        .select(`
          id,
          class_id,
          dojo_id,
          status,
          level,
          role,
          rank_id,
          sub_rank_id,
          title_level,

          classes (
            id,
            name,
            title_system
          ),

          dojos (
            id,
            name
          ),

          ranks (
            id,
            name
          ),

          sub_ranks (
            id,
            name
          )
        `)
        .eq("user_id", user.id);

      if (membershipError) {
        if (active) {
          setMessage(membershipError.message);
          setMessageType("error");
          setLoading(false);
        }

        return;
      }

      const loadedMemberships =
        (membershipData ?? []) as unknown as Membership[];

      if (active) {
        setProfile(profileData as Profile);

        setWhatsappInput(
          profileData.whatsapp_number ?? ""
        );

        setMemberships(loadedMemberships);
      }

      /*
       * BREAK REQUESTS
       */

      const {
        data: breakRequestData,
        error: breakRequestError,
      } = await supabase.rpc(
        "get_my_membership_break_requests"
      );

      if (
        !breakRequestError &&
        active
      ) {
        setBreakRequests(
          (breakRequestData ?? []) as BreakRequest[]
        );
      }

      /*
       * LOAD AIKIDO DOJOS
       */

      const aikidoMembership =
        loadedMemberships.find(
          (membership) =>
            membership.classes?.name === "Aikido"
        );

      if (aikidoMembership) {
        const {
          data: dojoData,
          error: dojoError,
        } = await supabase
          .from("dojos")
          .select(`
            id,
            name,
            class_id
          `)
          .eq(
            "class_id",
            aikidoMembership.class_id
          )
          .eq("active", true)
          .order("name");

        if (!dojoError && active) {
          setAikidoDojos(
            (dojoData ?? []) as Dojo[]
          );
        }
      }

      if (active) {
        setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  /*
   * =====================================================
   * AVATAR
   * =====================================================
   */

  function handleAvatarSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Please select an image file."
      );
      setMessageType("error");
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage(
        "Profile picture must be smaller than 5 MB."
      );
      setMessageType("error");
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    const preview =
      URL.createObjectURL(file);

    setAvatarFile(file);
    setAvatarPreview(preview);

    setMessage("");
    setMessageType("");
  }

  async function uploadAvatar() {
    if (!avatarFile || !profile) {
      return;
    }

    setUploadingAvatar(true);

    setMessage("");
    setMessageType("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "You are not logged in."
      );
      setMessageType("error");
      setUploadingAvatar(false);
      return;
    }

    const extension =
      avatarFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const filePath =
      `${user.id}/avatar.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("avatars")
      .upload(
        filePath,
        avatarFile,
        {
          upsert: true,
          contentType:
            avatarFile.type,
          cacheControl: "3600",
        }
      );

    if (uploadError) {
      setMessage(
        uploadError.message
      );
      setMessageType("error");
      setUploadingAvatar(false);
      return;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl =
      `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const {
      error: rpcError,
    } = await supabase.rpc(
      "update_my_avatar",
      {
        new_avatar_url:
          avatarUrl,
      }
    );

    if (rpcError) {
      setMessage(
        rpcError.message
      );
      setMessageType("error");
      setUploadingAvatar(false);
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            avatar_url:
              avatarUrl,
          }
        : current
    );

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setAvatarFile(null);
    setAvatarPreview(null);

    setMessage(
      "Profile picture updated successfully."
    );
    setMessageType("success");
    setUploadingAvatar(false);
  }

  function cancelAvatar() {
    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setAvatarFile(null);
    setAvatarPreview(null);
  }

  /*
   * =====================================================
   * WHATSAPP
   * =====================================================
   */

  function formatWhatsApp(
    value: string | null
  ) {
    if (!value) {
      return "Not added";
    }

    if (value.startsWith("62")) {
      return `+${value}`;
    }

    return value;
  }

  function openWhatsApp() {
    if (
      !profile?.whatsapp_number
    ) {
      return;
    }

    window.open(
      `https://wa.me/${profile.whatsapp_number}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function saveWhatsApp(
    event: FormEvent
  ) {
    event.preventDefault();

    setProcessing(true);

    setMessage("");
    setMessageType("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "update_my_whatsapp",
      {
        new_whatsapp_number:
          whatsappInput,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessing(false);
      return;
    }

    const normalized =
      typeof data === "string"
        ? data
        : null;

    setProfile((current) =>
      current
        ? {
            ...current,
            whatsapp_number:
              normalized,
          }
        : current
    );

    setWhatsappInput(
      normalized ?? ""
    );

    setEditingWhatsApp(false);

    setMessage(
      "WhatsApp number updated successfully."
    );
    setMessageType("success");
    setProcessing(false);
  }

  /*
   * =====================================================
   * DOJO TRANSFER
   * =====================================================
   */

  async function requestTransfer(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!transferDojoId) {
      setMessage(
        "Please select a destination dojo."
      );
      setMessageType("error");
      return;
    }

    setProcessing(true);

    setMessage("");
    setMessageType("");

    const {
      error,
    } = await supabase.rpc(
      "request_dojo_transfer",
      {
        target_dojo:
          transferDojoId,

        transfer_reason:
          transferReason.trim() ||
          null,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessing(false);
      return;
    }

    setMessage(
      "Dojo transfer request submitted successfully."
    );
    setMessageType("success");

    setTransferDojoId("");
    setTransferReason("");
    setShowTransfer(false);
    setProcessing(false);
  }

  /*
   * =====================================================
   * BREAK REQUESTS
   * =====================================================
   */

  async function loadBreakRequests() {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_my_membership_break_requests"
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    setBreakRequests(
      (data ?? []) as BreakRequest[]
    );
  }

  function currentBreakRequest(
    membershipId: string
  ) {
    return breakRequests.find(
      (request) =>
        request.membership_id ===
          membershipId &&
        (
          request.request_status ===
            "pending" ||
          (
            request.request_status ===
              "approved" &&
            !request.applied_at
          )
        )
    );
  }

  async function submitBreakRequest(
    membershipId: string
  ) {
    setBreakProcessingId(
      membershipId
    );

    setMessage("");
    setMessageType("");

    const {
      error,
    } = await supabase.rpc(
      "request_membership_break",
      {
        target_membership_id:
          membershipId,

        break_reason:
          breakReason.trim() ||
          null,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");

      setBreakProcessingId(null);
      return;
    }

    await loadBreakRequests();

    setBreakFormMembershipId(null);
    setBreakReason("");

    setMessage(
      "Break request submitted successfully."
    );
    setMessageType("success");

    setBreakProcessingId(null);
  }

  async function cancelBreakRequest(
    requestId: string,
    membershipId: string
  ) {
    const confirmed =
      window.confirm(
        "Cancel this Break request?"
      );

    if (!confirmed) {
      return;
    }

    setBreakProcessingId(
      membershipId
    );

    setMessage("");
    setMessageType("");

    const {
      error,
    } = await supabase.rpc(
      "cancel_my_membership_break_request",
      {
        target_request_id:
          requestId,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setBreakProcessingId(null);
      return;
    }

    await loadBreakRequests();

    setMessage(
      "Break request cancelled."
    );
    setMessageType("success");

    setBreakProcessingId(null);
  }

  /*
   * =====================================================
   * LABEL HELPERS
   * =====================================================
   */

  function statusLabel(
    status: Membership["status"]
  ) {
    if (status === "break_1") {
      return "Break (1)";
    }

    if (status === "break_2") {
      return "Break (2)";
    }

    if (status === "inactive") {
      return "Inactive";
    }

    return "Active";
  }

  function levelLabel(
    level: Membership["level"]
  ) {
    return level === "yudansha"
      ? "Yudansha (Dan)"
      : "Mudansha (Kyu)";
  }

  function levelClass(
    level: Membership["level"]
  ) {
    if (level === "yudansha") {
      return "border-purple-800 bg-purple-950/30 text-purple-300";
    }

    return "border-sky-800 bg-sky-950/30 text-sky-300";
  }

  function titleName(
    membership: Membership
  ) {
    const level =
      membership.title_level;

    const system =
      membership.classes
        ?.title_system;

    if (
      !level ||
      !system ||
      system === "none"
    ) {
      return null;
    }

    if (system === "chinese") {
      if (level === 1) {
        return "Fujiaoshi";
      }

      if (level === 2) {
        return "Jiaoshi";
      }

      if (level === 3) {
        return "Dashi";
      }

      return null;
    }

    if (system === "japanese") {
      if (level === 1) {
        return "Fuku Kiyoshi";
      }

      if (level === 2) {
        return "Kiyoshi";
      }

      if (level === 3) {
        return "Daishi";
      }
    }

    return null;
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "-";
    }

    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
        ? `${value}T00:00:00`
        : value;

    const date =
      new Date(normalized);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  /*
   * =====================================================
   * TITLE HISTORY
   * =====================================================
   */

  async function loadTitleHistory(
    membershipId: string
  ) {
    setLoadingTitleHistory(
      (current) => ({
        ...current,
        [membershipId]:
          true,
      })
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "get_membership_title_history",
      {
        target_membership_id:
          membershipId,
      }
    );

    if (error) {
      setMessage(error.message);
      setMessageType("error");

      setLoadingTitleHistory(
        (current) => ({
          ...current,
          [membershipId]:
            false,
        })
      );

      return;
    }

    setTitleHistory(
      (current) => ({
        ...current,

        [membershipId]:
          (data ?? []) as TitleHistoryItem[],
      })
    );

    setLoadingTitleHistory(
      (current) => ({
        ...current,

        [membershipId]:
          false,
      })
    );
  }

  async function toggleTitleHistory(
    membershipId: string
  ) {
    const opening =
      !(
        titleHistoryOpen[
          membershipId
        ] ?? false
      );

    setTitleHistoryOpen(
      (current) => ({
        ...current,

        [membershipId]:
          opening,
      })
    );

    if (
      opening &&
      !titleHistory[
        membershipId
      ]
    ) {
      await loadTitleHistory(
        membershipId
      );
    }
  }

  /*
   * =====================================================
   * AIKIDO TRANSFER OPTIONS
   * =====================================================
   */

  const aikidoMembership =
    memberships.find(
      (membership) =>
        membership.classes
          ?.name === "Aikido"
    );

  const transferOptions =
    aikidoDojos.filter(
      (dojo) =>
        dojo.id !==
        aikidoMembership?.dojo_id
    );

  /*
   * =====================================================
   * AVATAR DISPLAY
   * =====================================================
   */

  const displayedAvatar =
    avatarPreview ||
    profile?.avatar_url ||
    null;

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-sky-400" />

          <p className="mt-4 text-sm text-neutral-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl">
      <header className="border-b border-neutral-800 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Member
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          My Profile
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          View your personal details,
          memberships, grades, titles,
          contact information and dojo.
        </p>
      </header>

      {message && (
        <div
          className={[
            "mt-6 rounded-xl border p-4 text-sm",

            messageType ===
            "success"
              ? "border-green-900 bg-green-950/30 text-green-300"
              : "border-red-900 bg-red-950/30 text-red-300",
          ].join(" ")}
        >
          {message}
        </div>
      )}

      {/* PROFILE PICTURE */}

      <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Profile
        </p>

        <h2 className="mt-1 text-xl font-bold">
          Profile Picture
        </h2>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-neutral-800 bg-neutral-800">
            {displayedAvatar ? (
              // The upload preview may be a temporary blob URL, which
              // next/image cannot optimize.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayedAvatar}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-neutral-500">
                {profile?.full_name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "?"}
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="font-semibold">
              {profile?.full_name}
            </p>

            <p className="mt-1 text-sm text-neutral-400">
              Upload a JPG, PNG or WebP image.
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Maximum file size: 5 MB.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-950/40">
                Choose Image

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleAvatarSelect
                  }
                  className="hidden"
                />
              </label>

              {avatarFile && (
                <>
                  <button
                    type="button"
                    onClick={
                      uploadAvatar
                    }
                    disabled={
                      uploadingAvatar
                    }
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                  >
                    {uploadingAvatar
                      ? "Uploading..."
                      : "Save Picture"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelAvatar
                    }
                    disabled={
                      uploadingAvatar
                    }
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PERSONAL DETAILS */}

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Member
        </p>

        <h2 className="mt-1 text-xl font-bold">
          Personal Details
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <DetailItem
            label="Member ID"
            value={
              profile
                ?.registration_number ||
              "Not assigned yet"
            }
          />

          {memberships.some(
            (membership) =>
              membership.classes
                ?.name === "Aikido" &&
              membership.level ===
                "yudansha"
          ) && (
            <DetailItem
              label="Aikikai Registration Number"
              value={
                profile
                  ?.aikikai_registration_number ||
                "Not assigned yet"
              }
            />
          )}

          <DetailItem
            label="Full Name"
            value={
              profile?.full_name ||
              "-"
            }
          />

          <DetailItem
            label="Email"
            value={
              profile?.email || "-"
            }
          />

          <DetailItem
            label="Phone"
            value={
              profile?.phone || "-"
            }
          />

          <DetailItem
            label="Date of Birth"
            value={formatDate(
              profile?.date_of_birth ??
                null
            )}
          />
        </div>
      </section>

      {/* WHATSAPP */}

      <section className="mt-6 rounded-2xl border border-green-900 bg-green-950/10 p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-400">
              Contact
            </p>

            <h2 className="mt-1 text-xl font-bold">
              WhatsApp
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              Indonesian numbers are automatically
              converted to +62 format.
            </p>
          </div>

          {!editingWhatsApp && (
            <button
              type="button"
              onClick={() =>
                setEditingWhatsApp(
                  true
                )
              }
              className="self-start rounded-lg border border-green-800 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-950/40"
            >
              Edit
            </button>
          )}
        </div>

        {!editingWhatsApp ? (
          <div className="mt-6">
            <p className="text-sm text-neutral-500">
              WhatsApp Number
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatWhatsApp(
                profile?.whatsapp_number ??
                  null
              )}
            </p>

            {profile?.whatsapp_number && (
              <button
                type="button"
                onClick={
                  openWhatsApp
                }
                className="mt-4 rounded-lg bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500"
              >
                Open WhatsApp →
              </button>
            )}
          </div>
        ) : (
          <form
            onSubmit={saveWhatsApp}
            className="mt-6"
          >
            <label className="mb-2 block text-sm font-medium">
              WhatsApp Number
            </label>

            <input
              type="tel"
              value={
                whatsappInput
              }
              onChange={(event) =>
                setWhatsappInput(
                  event.target.value
                )
              }
              placeholder="0812 3456 789"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-green-600"
            />

            <p className="mt-2 text-xs text-neutral-500">
              You can enter 0812..., 812..., or +62 812....
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  processing
                }
                className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
              >
                {processing
                  ? "Saving..."
                  : "Save WhatsApp"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingWhatsApp(
                    false
                  );

                  setWhatsappInput(
                    profile
                      ?.whatsapp_number ??
                      ""
                  );
                }}
                className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 transition hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* CLASSES */}

      <section className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Training
        </p>

        <h2 className="mt-1 text-2xl font-bold">
          My Classes
        </h2>
<ClassEnrollmentPanel />
        {memberships.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-400">
              No memberships found.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {memberships.map(
              (membership) => {
                const title =
                  titleName(
                    membership
                  );

                const breakRequest =
                  currentBreakRequest(
                    membership.id
                  );

                const breakFormOpen =
                  breakFormMembershipId ===
                  membership.id;

                const breakProcessing =
                  breakProcessingId ===
                  membership.id;

                return (
                  <article
                    key={
                      membership.id
                    }
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 sm:flex-row">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                          {membership
                            .classes
                            ?.name ??
                            "Class"}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {membership
                            .ranks
                            ?.name ??
                            "Rank not assigned"}
                        </h3>

                        {membership.classes
                          ?.name ===
                          "Aikido" &&
                          membership.level ===
                            "yudansha" && (
                            <p className="mt-2 text-sm text-neutral-500">
                              Member ID / Aikikai Registration Number:{" "}
                              <span className="font-medium text-neutral-300">
                                {profile
                                  ?.registration_number ??
                                  "Not assigned"}{" "}
                                /{" "}
                                {profile
                                  ?.aikikai_registration_number ??
                                  "Not assigned"}
                              </span>
                            </p>
                          )}

                        {membership
                          .sub_ranks
                          ?.name && (
                          <p className="mt-1 text-neutral-400">
                            {
                              membership
                                .sub_ranks
                                .name
                            }
                          </p>
                        )}

                        {title && (
                          <div className="mt-3">
                            <span className="inline-flex rounded-full border border-amber-800 bg-amber-950/30 px-3 py-1 text-xs font-semibold text-amber-300">
                              {title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-start gap-2">
                        <span
                          className={`
                            rounded-full
                            border
                            px-3
                            py-1
                            text-xs
                            font-medium
                            ${levelClass(
                              membership.level
                            )}
                          `}
                        >
                          {levelLabel(
                            membership.level
                          )}
                        </span>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                          {statusLabel(
                            membership.status
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <MembershipSummary
                        label="Class"
                        value={
                          membership
                            .classes
                            ?.name ??
                          "-"
                        }
                      />

                      <MembershipSummary
                        label="Dojo"
                        value={
                          membership
                            .dojos
                            ?.name ??
                          "-"
                        }
                      />

                      <MembershipSummary
                        label="Rank"
                        value={
                          membership
                            .ranks
                            ?.name ??
                          "Not assigned"
                        }
                      />

                      <MembershipSummary
                        label="Tier"
                        value={
                          membership
                            .sub_ranks
                            ?.name ??
                          "Not assigned"
                        }
                      />
                    </div>

                    <div
                      className={`
                        mt-4
                        grid
                        gap-4
                        ${
                          title
                            ? "sm:grid-cols-3"
                            : "sm:grid-cols-2"
                        }
                      `}
                    >
                      <DetailCard
                        label="Grade Category"
                        value={
                          levelLabel(
                            membership.level
                          )
                        }
                      />

                      {title && (
                        <div className="rounded-xl border border-amber-900 bg-amber-950/10 p-4">
                          <p className="text-xs uppercase tracking-wider text-amber-500">
                            Appointed Title
                          </p>

                          <p className="mt-1 font-semibold text-amber-200">
                            {title}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            Official appointment
                          </p>
                        </div>
                      )}

                      <DetailCard
                        label="Role"
                        value={
                          membership.role ===
                          "admin"
                            ? "Member + Admin"
                            : "Member"
                        }
                      />
                    </div>

                    {/* BREAK MANAGEMENT */}

                    <div className="mt-5 border-t border-neutral-800 pt-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-semibold">
                              Membership Status
                            </p>

                            <p className="mt-1 text-sm text-neutral-400">
                              {membership.status ===
                              "active"
                                ? "Your membership is currently active."
                                : membership.status ===
                                  "break_1"
                                ? "You are currently on Break 1."
                                : membership.status ===
                                  "break_2"
                                ? "You are currently on Break 2."
                                : "This class membership is inactive."}
                            </p>
                          </div>

                          {membership.status ===
                            "active" &&
                            !breakRequest &&
                            !breakFormOpen && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBreakFormMembershipId(
                                    membership.id
                                  );
                                  setBreakReason(
                                    ""
                                  );
                                }}
                                className="self-start rounded-lg border border-amber-800 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-950/30"
                              >
                                Request Break
                              </button>
                            )}
                        </div>

                        {breakRequest
                          ?.request_status ===
                          "pending" && (
                          <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                  Break Request Pending
                                </p>

                                <p className="mt-2 text-sm text-neutral-300">
                                  Requested:{" "}
                                  {formatDate(
                                    breakRequest.requested_at
                                  )}
                                </p>

                                {breakRequest.reason && (
                                  <p className="mt-1 text-sm text-neutral-400">
                                    Reason:{" "}
                                    {
                                      breakRequest.reason
                                    }
                                  </p>
                                )}

                                <p className="mt-2 text-xs text-neutral-500">
                                  Waiting for Admin approval.
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  breakProcessing
                                }
                                onClick={() =>
                                  cancelBreakRequest(
                                    breakRequest.request_id,
                                    membership.id
                                  )
                                }
                                className="self-start rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                              >
                                {breakProcessing
                                  ? "Cancelling..."
                                  : "Cancel Request"}
                              </button>
                            </div>
                          </div>
                        )}

                        {breakRequest
                          ?.request_status ===
                          "approved" &&
                          breakRequest.activation_type ===
                            "next_month" &&
                          !breakRequest.applied_at && (
                            <div className="rounded-xl border border-sky-900 bg-sky-950/20 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                                Break Scheduled
                              </p>

                              <p className="mt-2 font-semibold text-neutral-100">
                                Break 1 starts{" "}
                                {formatDate(
                                  breakRequest.effective_from
                                )}
                              </p>

                              <p className="mt-1 text-sm text-neutral-400">
                                Your current month has already
                                been paid, so this membership
                                remains Active until the
                                scheduled date.
                              </p>
                            </div>
                          )}

                        {membership.status ===
                          "break_1" && (
                          <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                              Break 1
                            </p>

                            <p className="mt-2 text-sm text-neutral-300">
                              Subscription billing is paused
                              for this class while you are
                              on Break.
                            </p>
                          </div>
                        )}

                        {membership.status ===
                          "break_2" && (
                          <div className="rounded-xl border border-orange-900 bg-orange-950/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                              Break 2
                            </p>

                            <p className="mt-2 text-sm text-neutral-300">
                              This is the second Break period.
                              Subscription billing remains
                              paused.
                            </p>
                          </div>
                        )}

                        {breakFormOpen &&
                          membership.status ===
                            "active" &&
                          !breakRequest && (
                            <div className="rounded-xl border border-amber-900 bg-amber-950/10 p-4">
                              <p className="font-semibold text-amber-200">
                                Request Break —{" "}
                                {membership.classes
                                  ?.name ??
                                  "Class"}
                              </p>

                              <p className="mt-2 text-sm leading-6 text-neutral-400">
                                Your request will be reviewed
                                by an Admin. If the current
                                month is already paid, your
                                Break will begin next month.
                              </p>

                              <label className="mt-4 block text-sm font-medium">
                                Reason
                              </label>

                              <textarea
                                value={
                                  breakReason
                                }
                                onChange={(
                                  event
                                ) =>
                                  setBreakReason(
                                    event.target
                                      .value
                                  )
                                }
                                rows={3}
                                placeholder="Optional reason for requesting a Break"
                                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white outline-none focus:border-amber-600"
                              />

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  disabled={
                                    breakProcessing
                                  }
                                  onClick={() =>
                                    submitBreakRequest(
                                      membership.id
                                    )
                                  }
                                  className="rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                                >
                                  {breakProcessing
                                    ? "Submitting..."
                                    : "Submit Break Request"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    breakProcessing
                                  }
                                  onClick={() => {
                                    setBreakFormMembershipId(
                                      null
                                    );

                                    setBreakReason(
                                      ""
                                    );
                                  }}
                                  className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* TITLE HISTORY */}

                    {title && (
                      <div className="mt-5 border-t border-neutral-800 pt-5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleTitleHistory(
                              membership.id
                            )
                          }
                          className="rounded-lg border border-amber-800 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-950/30"
                        >
                          {titleHistoryOpen[
                            membership.id
                          ]
                            ? "Hide Title History"
                            : "View Title History"}
                        </button>

                        {titleHistoryOpen[
                          membership.id
                        ] && (
                          <div className="mt-4 space-y-3">
                            {loadingTitleHistory[
                              membership.id
                            ] ? (
                              <p className="text-sm text-neutral-500">
                                Loading title history...
                              </p>
                            ) : (
                              <>
                                {(titleHistory[
                                  membership.id
                                ] ?? []).map(
                                  (item) => (
                                    <div
                                      key={
                                        item.history_id
                                      }
                                      className={`
                                        rounded-xl
                                        border
                                        p-4
                                        ${
                                          item.revoked_at
                                            ? "border-red-900 bg-red-950/10"
                                            : "border-amber-900 bg-amber-950/10"
                                        }
                                      `}
                                    >
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-semibold">
                                            {item.title_name ??
                                              `Title Level ${item.title_level}`}
                                          </p>

                                          <p className="mt-1 text-sm text-neutral-400">
                                            Effective:{" "}
                                            {formatDate(
                                              item.effective_date
                                            )}
                                          </p>

                                          <p className="mt-1 text-xs text-neutral-500">
                                            Appointed by:{" "}
                                            {item.granted_by_name ??
                                              "Jingwuguan Seibukan"}
                                          </p>

                                          {item.revoke_reason && (
                                            <p className="mt-2 text-sm text-red-300">
                                              Reason:{" "}
                                              {
                                                item.revoke_reason
                                              }
                                            </p>
                                          )}
                                        </div>

                                        <span
                                          className={`
                                            self-start
                                            rounded-full
                                            border
                                            px-3
                                            py-1
                                            text-xs
                                            font-semibold
                                            ${
                                              item.revoked_at
                                                ? "border-red-900 bg-red-950/30 text-red-300"
                                                : "border-green-900 bg-green-950/30 text-green-300"
                                            }
                                          `}
                                        >
                                          {item.revoked_at
                                            ? "REVOKED"
                                            : "VALID"}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}

                                {(titleHistory[
                                  membership.id
                                ] ?? []).length ===
                                  0 && (
                                  <p className="text-sm text-neutral-500">
                                    No title history recorded.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AIKIDO DOJO TRANSFER */}

                    {membership.classes
                      ?.name ===
                      "Aikido" &&
                      [
                        "active",
                        "break_1",
                        "break_2",
                      ].includes(
                        membership.status
                      ) && (
                        <div className="mt-5 border-t border-neutral-800 pt-5">
                          <button
                            type="button"
                            onClick={() =>
                              setShowTransfer(
                                !showTransfer
                              )
                            }
                            className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-950/40"
                          >
                            Request Dojo Transfer
                          </button>
                        </div>
                      )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* TRANSFER */}

      {showTransfer &&
        aikidoMembership && (
          <section className="mt-6 rounded-2xl border border-sky-900 bg-sky-950/20 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              Aikido
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Request Dojo Transfer
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              Current dojo:{" "}
              <span className="text-white">
                {aikidoMembership
                  .dojos?.name ??
                  "-"}
              </span>
            </p>

            <form
              onSubmit={
                requestTransfer
              }
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Transfer To
                </label>

                <select
                  value={
                    transferDojoId
                  }
                  onChange={(event) =>
                    setTransferDojoId(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white outline-none focus:border-sky-600"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select Dojo
                  </option>

                  {transferOptions.map(
                    (dojo) => (
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
                  Reason
                </label>

                <textarea
                  value={
                    transferReason
                  }
                  onChange={(event) =>
                    setTransferReason(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Optional reason for transfer"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white outline-none focus:border-sky-600"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    processing
                  }
                  className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                >
                  {processing
                    ? "Submitting..."
                    : "Submit Transfer Request"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowTransfer(
                      false
                    )
                  }
                  className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 transition hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
    </main>
  );
}

/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-500">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-neutral-100">
        {value}
      </p>
    </div>
  );
}

function MembershipSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-800 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
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

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

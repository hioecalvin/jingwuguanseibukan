// app/admin/settlements/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel } from "@/lib/exportExcel";

type FinanceDojo = {
  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
  requires_share?: boolean;
  share_percent?: number | null;
};

type Settlement = {
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
  status: string;
  notes: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  submitted_by_name: string | null;
  submitted_at: string | null;

  transfer_amount: number | null;
  transfer_date: string | null;
  transfer_method: string | null;
  transfer_note: string | null;
  transfer_recorded_by_name: string | null;
  transfer_recorded_at: string | null;

  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  item_count: number;
};

type SettlementItem = {
  item_id: string;
  payment_id: string;
  membership_id: string;
  member_name: string;
  member_id: string;
  billing_month: string;
  payment_date: string;
  is_late_payment: boolean;
  payment_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  share_percent: number;
  share_amount: number;
  currency: string;
};

type EligiblePayment = {
  payment_id: string;
  membership_id: string;
  member_name: string;
  member_id: string;
  billing_month: string;
  payment_date: string;
  is_late_payment: boolean;
  payment_amount: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  suggested_share: number;
};

const money = (value: number | null | undefined, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const dateOnly = (value?: string | null) => {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
};

const dateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00`));

const thisMonth = () => new Date().toISOString().slice(0, 7);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusClass = (status: string) => {
  switch (status) {
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "submitted":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "rejected":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "cancelled":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
    default:
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
};

export default function AdminSettlementsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dojos, setDojos] = useState<FinanceDojo[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [dojoFilter, setDojoFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDojoId, setCreateDojoId] = useState("");
  const [createMonth, setCreateMonth] = useState(thisMonth());
  const [createNotes, setCreateNotes] = useState("");
  const [eligible, setEligible] = useState<EligiblePayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [details, setDetails] = useState<SettlementItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [transferId, setTransferId] = useState<string | null>(null);
  const [transferDate, setTransferDate] = useState("");
  const [transferMethod, setTransferMethod] = useState("Bank Transfer");
  const [transferNote, setTransferNote] = useState("");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  const loadPage = useCallback(async () => {
    clearAlerts();
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const superAdmin = Boolean(profile?.is_super_admin);
      setIsSuperAdmin(superAdmin);

      let financeDojos: FinanceDojo[] = [];

      if (superAdmin) {
        const { data, error: configError } = await supabase.rpc(
          "get_dojo_settlement_configs"
        );
        if (configError) throw configError;
        financeDojos = (data ?? []).map((row: FinanceDojo) => ({
          dojo_id: row.dojo_id,
          dojo_name: row.dojo_name,
          class_id: row.class_id,
          class_name: row.class_name,
          requires_share: row.requires_share,
          share_percent: row.share_percent,
        }));
      } else {
        const { data: candidates, error: candidateError } = await supabase
          .from("admin_visible_members")
          .select("dojo_id, dojo_name, class_id, class_name")
          .not("dojo_id", "is", null);

        if (candidateError) throw candidateError;

        const unique = new Map<string, FinanceDojo>();
        for (const row of candidates ?? []) {
          if (!row.dojo_id || unique.has(row.dojo_id)) continue;
          unique.set(row.dojo_id, {
            dojo_id: row.dojo_id,
            dojo_name: row.dojo_name ?? "Dojo",
            class_id: row.class_id,
            class_name: row.class_name ?? "Class",
          });
        }

        for (const dojo of unique.values()) {
          const { data, error: configError } = await supabase.rpc(
            "get_my_dojo_settlement_config",
            { target_dojo_id: dojo.dojo_id }
          );
          if (!configError) {
            const config = Array.isArray(data) ? data[0] : data;
            financeDojos.push({
              ...dojo,
              requires_share: Boolean(config?.requires_share),
              share_percent: config?.share_percent ?? null,
            });
          }
        }
      }

      setDojos(financeDojos);

      if (superAdmin) {
        const [reviewResult, adminResult] = await Promise.all([
          supabase.rpc("get_super_admin_settlements"),
          supabase.rpc("get_dojo_admin_settlements", {
            target_dojo_id: null,
          }),
        ]);

        if (reviewResult.error) throw reviewResult.error;

        const merged = new Map<string, Settlement>();
        for (const row of reviewResult.data ?? []) {
          merged.set(row.settlement_id, row as Settlement);
        }

        // Some installations grant Super Admin global finance access through
        // can_access_dojo_finance(). If so, this also adds draft/cancelled rows.
        if (!adminResult.error) {
          for (const row of adminResult.data ?? []) {
            merged.set(row.settlement_id, row as Settlement);
          }
        }

        setSettlements(Array.from(merged.values()));
      } else {
        const { data, error: settlementError } = await supabase.rpc(
          "get_dojo_admin_settlements",
          { target_dojo_id: null }
        );
        if (settlementError) throw settlementError;
        setSettlements((data ?? []) as Settlement[]);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to load settlements."));
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const filtered = useMemo(
    () =>
      settlements.filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (dojoFilter !== "all" && s.dojo_id !== dojoFilter) return false;
        if (
          monthFilter &&
          s.settlement_month.slice(0, 7) !== monthFilter.slice(0, 7)
        )
          return false;
        return true;
      }),
    [settlements, statusFilter, dojoFilter, monthFilter]
  );

  const selectedEligible = useMemo(
    () => eligible.filter((p) => selectedPayments.includes(p.payment_id)),
    [eligible, selectedPayments]
  );

  const selectedGross = selectedEligible.reduce(
    (sum, p) => sum + Number(p.payment_amount),
    0
  );
  const selectedShare = selectedEligible.reduce(
    (sum, p) => sum + Number(p.suggested_share),
    0
  );

  const pendingReviewCount = settlements.filter(
    (s) => s.status === "submitted"
  ).length;

  const loadEligible = async (dojoId: string, month: string) => {
    if (!dojoId || !month) {
      setEligible([]);
      setSelectedPayments([]);
      return;
    }

    setEligibleLoading(true);
    clearAlerts();

    const { data, error: rpcError } = await supabase.rpc(
      "get_settlement_eligible_payment_details",
      {
        target_dojo_id: dojoId,
        target_month: `${month}-01`,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setEligible([]);
    } else {
      setEligible((data ?? []) as EligiblePayment[]);
      setSelectedPayments([]);
    }

    setEligibleLoading(false);
  };

  const createSettlement = async () => {
    if (!createDojoId || !createMonth) {
      setError("Choose a dojo and settlement month.");
      return;
    }
    if (selectedPayments.length === 0) {
      setError("Select at least one Member payment.");
      return;
    }

    setBusy("create");
    clearAlerts();

    const { error: rpcError } = await supabase.rpc("create_dojo_settlement", {
      target_dojo_id: createDojoId,
      target_month: `${createMonth}-01`,
      payment_ids: selectedPayments,
      settlement_notes: createNotes.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Settlement draft created.");
      setCreateOpen(false);
      setCreateNotes("");
      setEligible([]);
      setSelectedPayments([]);
      await loadPage();
    }

    setBusy(null);
  };

  const openTransfer = (s: Settlement) => {
    clearAlerts();
    setTransferId(s.settlement_id);
    setTransferDate(s.transfer_date ?? new Date().toISOString().slice(0, 10));
    setTransferMethod(s.transfer_method ?? "Bank Transfer");
    setTransferNote(s.transfer_note ?? "");
  };

  const saveTransfer = async () => {
    if (!transferId) return;
    if (!transferDate) {
      setError("Transfer date is required.");
      return;
    }
    if (!transferMethod.trim()) {
      setError("Transfer method is required.");
      return;
    }

    setBusy(`transfer:${transferId}`);
    clearAlerts();

    const { error: rpcError } = await supabase.rpc(
      "set_dojo_settlement_transfer",
      {
        target_settlement_id: transferId,
        new_transfer_date: transferDate,
        new_transfer_method: transferMethod.trim(),
        new_transfer_note: transferNote.trim() || null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Transfer details saved.");
      setTransferId(null);
      await loadPage();
    }

    setBusy(null);
  };

  const submitSettlement = async (id: string) => {
    setBusy(`submit:${id}`);
    clearAlerts();

    const { error: rpcError } = await supabase.rpc("submit_dojo_settlement", {
      target_settlement_id: id,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Share sent to Super Admin for review.");
      await loadPage();
    }

    setBusy(null);
  };

  const cancelSettlement = async (id: string) => {
    if (!window.confirm("Cancel this settlement and release its payments?")) return;

    setBusy(`cancel:${id}`);
    clearAlerts();

    const { error: rpcError } = await supabase.rpc("cancel_dojo_settlement", {
      target_settlement_id: id,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Settlement cancelled.");
      await loadPage();
    }

    setBusy(null);
  };

  const reviewSettlement = async (
    id: string,
    decision: "approved" | "rejected"
  ) => {
    const note =
      decision === "rejected" ? rejectionReason.trim() : null;

    if (decision === "rejected" && !note) {
      setError("A rejection reason is required.");
      return;
    }

    setBusy(`review:${id}`);
    clearAlerts();

    const { error: rpcError } = await supabase.rpc("review_dojo_settlement", {
      target_settlement_id: id,
      decision,
      rejection_note: note,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage(
        decision === "approved"
          ? "Settlement approved."
          : "Settlement rejected. The Admin can correct it and resubmit."
      );
      setRejectId(null);
      setRejectionReason("");
      await loadPage();
    }

    setBusy(null);
  };

  const exportSettlementSummary = () => {
    clearAlerts();

    try {
      exportToExcel<Settlement>({
        filename: `dojo-settlements-${new Date().toISOString().slice(0, 10)}`,
        sheetName: "Settlements",
        title: "Jingwuguan Seibukan - Dojo Settlement Summary",
        data: filtered,
        columns: [
          { header: "Settlement Month", key: "settlement_month", value: (s) => monthLabel(s.settlement_month) },
          { header: "Class", key: "class_name" },
          { header: "Dojo", key: "dojo_name" },
          { header: "Status", key: "status" },
          { header: "Payment Count", key: "item_count", value: (s) => Number(s.item_count) },
          { header: "Gross Amount", key: "gross_amount", value: (s) => Number(s.gross_amount) },
          { header: "Share Percent", key: "share_percent", value: (s) => Number(s.share_percent) },
          { header: "Super Admin Share", key: "share_amount", value: (s) => Number(s.share_amount) },
          {
            header: "Dojo Retained",
            key: "dojo_retained",
            value: (s) => Number(s.gross_amount) - Number(s.share_amount),
          },
          { header: "Currency", key: "currency" },
          { header: "Transfer Amount", key: "transfer_amount", value: (s) => s.transfer_amount == null ? "" : Number(s.transfer_amount) },
          { header: "Transfer Date", key: "transfer_date", value: (s) => s.transfer_date ? dateOnly(s.transfer_date) : "" },
          { header: "Transfer Method", key: "transfer_method" },
          { header: "Transfer Note", key: "transfer_note" },
          { header: "Transfer Recorded By", key: "transfer_recorded_by_name" },
          { header: "Transfer Recorded At", key: "transfer_recorded_at", value: (s) => s.transfer_recorded_at ? dateTime(s.transfer_recorded_at) : "" },
          { header: "Settlement Notes", key: "notes" },
          { header: "Submitted By", key: "submitted_by_name" },
          { header: "Submitted At", key: "submitted_at", value: (s) => s.submitted_at ? dateTime(s.submitted_at) : "" },
          { header: "Reviewed By", key: "reviewed_by_name" },
          { header: "Reviewed At", key: "reviewed_at", value: (s) => s.reviewed_at ? dateTime(s.reviewed_at) : "" },
          { header: "Rejection Reason", key: "rejection_reason" },
          { header: "Approved At", key: "approved_at", value: (s) => s.approved_at ? dateTime(s.approved_at) : "" },
        ],
      });
      setMessage("Settlement summary exported to Excel.");
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, "Failed to export settlement summary.")
      );
    }
  };

  const exportSettlementDetails = async (s: Settlement) => {
    setBusy(`export:${s.settlement_id}`);
    clearAlerts();

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_dojo_settlement_item_details",
        { target_settlement_id: s.settlement_id }
      );

      if (rpcError) throw rpcError;

      const items = (data ?? []) as SettlementItem[];

      exportToExcel<SettlementItem>({
        filename: `settlement-${s.dojo_name}-${s.settlement_month.slice(0, 7)}`,
        sheetName: "Settlement Detail",
        title: `Jingwuguan Seibukan - ${s.dojo_name} - ${monthLabel(s.settlement_month)}`,
        data: items,
        columns: [
          { header: "Member ID", key: "member_id" },
          { header: "Member Name", key: "member_name" },
          { header: "Charge Billing Month", key: "billing_month", value: (i) => monthLabel(i.billing_month) },
          { header: "Payment Date", key: "payment_date", value: (i) => dateOnly(i.payment_date) },
          { header: "Late Payment", key: "is_late_payment", value: (i) => i.is_late_payment ? "Yes" : "No" },
          { header: "Payment Amount", key: "payment_amount", value: (i) => Number(i.payment_amount) },
          { header: "Currency", key: "currency" },
          { header: "Payment Method", key: "payment_method" },
          { header: "Member Payment Reference", key: "payment_reference" },
          { header: "Share Percent", key: "share_percent", value: (i) => Number(i.share_percent) },
          { header: "Super Admin Share", key: "share_amount", value: (i) => Number(i.share_amount) },
        ],
      });

      setMessage("Settlement detail exported to Excel.");
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, "Failed to export settlement detail.")
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleDetails = async (id: string) => {
    if (detailsId === id) {
      setDetailsId(null);
      setDetails([]);
      return;
    }

    setDetailsId(id);
    setDetailsLoading(true);
    clearAlerts();

    const { data, error: rpcError } = await supabase.rpc(
      "get_dojo_settlement_item_details",
      { target_settlement_id: id }
    );

    if (rpcError) {
      setError(rpcError.message);
      setDetails([]);
    } else {
      setDetails((data ?? []) as SettlementItem[]);
    }

    setDetailsLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">Loading settlements...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-3 text-sm text-zinc-400 hover:text-white"
            >
              ← Back to Admin
            </button>
            <h1 className="text-3xl font-bold">Dojo Settlements</h1>
            <p className="mt-1 text-zinc-400">
              Calculate, record and review the Super Admin share.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportSettlementSummary}
              disabled={filtered.length === 0}
              className="rounded-xl border border-zinc-700 px-4 py-2 hover:bg-zinc-900 disabled:opacity-40"
            >
              Export Excel
            </button>
            <button
              onClick={() => void loadPage()}
              className="rounded-xl border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              Refresh
            </button>
            <button
              onClick={() => setCreateOpen((v) => !v)}
              className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-zinc-200"
            >
              {createOpen ? "Close" : "New Settlement"}
            </button>
          </div>
        </div>

        {isSuperAdmin && pendingReviewCount > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            {pendingReviewCount} settlement
            {pendingReviewCount === 1 ? "" : "s"} waiting for Super Admin review.
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {createOpen && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold">Create Settlement Draft</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Select official Member payments that belong to the settlement month.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Dojo</span>
                <select
                  value={createDojoId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCreateDojoId(value);
                    void loadEligible(value, createMonth);
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                >
                  <option value="">Select dojo</option>
                  {dojos
                    .filter((d) => d.requires_share !== false)
                    .map((d) => (
                      <option key={d.dojo_id} value={d.dojo_id}>
                        {d.dojo_name} · {d.class_name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Settlement Month</span>
                <input
                  type="month"
                  value={createMonth}
                  onChange={(e) => {
                    setCreateMonth(e.target.value);
                    void loadEligible(createDojoId, e.target.value);
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Note</span>
                <input
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between bg-zinc-950/70 p-3">
                <span className="font-medium">Eligible Payments</span>
                {eligible.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedPayments(
                        selectedPayments.length === eligible.length
                          ? []
                          : eligible.map((p) => p.payment_id)
                      )
                    }
                    className="text-sm text-blue-300"
                  >
                    {selectedPayments.length === eligible.length
                      ? "Clear All"
                      : "Select All"}
                  </button>
                )}
              </div>

              {eligibleLoading ? (
                <div className="p-4 text-zinc-400">Loading payments...</div>
              ) : eligible.length === 0 ? (
                <div className="p-4 text-zinc-400">
                  Choose a dojo and month. Only eligible official payments will appear.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {eligible.map((p) => (
                    <label
                      key={p.payment_id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(p.payment_id)}
                        onChange={() =>
                          setSelectedPayments((old) =>
                            old.includes(p.payment_id)
                              ? old.filter((id) => id !== p.payment_id)
                              : [...old, p.payment_id]
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {p.member_name} · {p.member_id}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {monthLabel(p.billing_month)} subscription · Paid {dateOnly(p.payment_date)} ·{" "}
                          {p.payment_method || "Payment"}
                        </div>
                        {p.is_late_payment && (
                          <span className="mt-1 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
                            LATE PAYMENT
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div>{money(p.payment_amount, p.currency)}</div>
                        <div className="text-sm text-zinc-400">
                          Share {money(p.suggested_share, p.currency)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <div>
                  Selected gross:{" "}
                  <strong>{money(selectedGross, "IDR")}</strong>
                </div>
                <div>
                  Super Admin share:{" "}
                  <strong>{money(selectedShare, "IDR")}</strong>
                </div>
              </div>
              <button
                disabled={busy === "create" || selectedPayments.length === 0}
                onClick={() => void createSettlement()}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
              >
                {busy === "create" ? "Creating..." : "Create Draft"}
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dojoFilter}
            onChange={(e) => setDojoFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="all">All dojos</option>
            {dojos.map((d) => (
              <option key={d.dojo_id} value={d.dojo_id}>
                {d.dojo_name} · {d.class_name}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
        </section>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
              No settlements found.
            </div>
          ) : (
            filtered.map((s) => {
              const editable = s.status === "draft" || s.status === "rejected";
              const hasTransfer =
                Boolean(s.transfer_date) &&
                Boolean(s.transfer_method) &&
                s.transfer_amount != null;

              return (
                <section
                  key={s.settlement_id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
                >
                  <div className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold">
                            {monthLabel(s.settlement_month)} · {s.dojo_name}
                          </h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(
                              s.status
                            )}`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {s.class_name} · {s.item_count} payment
                          {Number(s.item_count) === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-5 text-right text-sm">
                        <div>
                          <div className="text-zinc-500">Gross</div>
                          <div className="font-semibold">
                            {money(s.gross_amount, s.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Share</div>
                          <div className="font-semibold">
                            {money(s.share_amount, s.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Dojo Retains</div>
                          <div className="font-semibold">
                            {money(
                              Number(s.gross_amount) - Number(s.share_amount),
                              s.currency
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold">Settlement</h3>
                          <span className="text-sm text-zinc-400">
                            {Number(s.share_percent)}% share
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Super Admin share</span>
                            <strong>{money(s.share_amount, s.currency)}</strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">Notes</span>
                            <span className="text-right">{s.notes || "—"}</span>
                          </div>
                          {s.submitted_at && (
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Submitted</span>
                              <span className="text-right">
                                {s.submitted_by_name || "—"} ·{" "}
                                {dateTime(s.submitted_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold">Transfer to Super Admin</h3>
                          {hasTransfer && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                              Recorded
                            </span>
                          )}
                        </div>

                        {hasTransfer ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Amount</span>
                              <strong>
                                {money(s.transfer_amount, s.currency)}
                              </strong>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Transfer date</span>
                              <span>{dateOnly(s.transfer_date)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Method</span>
                              <span>{s.transfer_method}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Note</span>
                              <span className="text-right">
                                {s.transfer_note || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Recorded by</span>
                              <span className="text-right">
                                {s.transfer_recorded_by_name || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Recorded</span>
                              <span>{dateTime(s.transfer_recorded_at)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-400">
                            No transfer has been recorded yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {s.status === "rejected" && (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                        <div className="font-semibold text-red-300">
                          Rejected by Super Admin
                        </div>
                        <div className="mt-1 text-sm text-red-200">
                          {s.rejection_reason || "No reason recorded."}
                        </div>
                        {s.reviewed_at && (
                          <div className="mt-2 text-xs text-red-300/70">
                            {s.reviewed_by_name || "Super Admin"} ·{" "}
                            {dateTime(s.reviewed_at)}
                          </div>
                        )}
                      </div>
                    )}

                    {s.status === "approved" && (
                      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                        Approved
                        {s.reviewed_by_name ? ` by ${s.reviewed_by_name}` : ""}
                        {s.approved_at ? ` · ${dateTime(s.approved_at)}` : ""}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => void toggleDetails(s.settlement_id)}
                        className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                      >
                        {detailsId === s.settlement_id
                          ? "Hide Payments"
                          : "View Payments"}
                      </button>

                      <button
                        disabled={busy === `export:${s.settlement_id}`}
                        onClick={() => void exportSettlementDetails(s)}
                        className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
                      >
                        {busy === `export:${s.settlement_id}`
                          ? "Exporting..."
                          : "Export Detail"}
                      </button>

                      {editable && (
                        <>
                          <button
                            onClick={() => openTransfer(s)}
                            className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
                          >
                            {hasTransfer
                              ? "Update Transfer"
                              : "Record Transfer"}
                          </button>

                          <button
                            disabled={
                              busy === `submit:${s.settlement_id}` || !hasTransfer
                            }
                            onClick={() =>
                              void submitSettlement(s.settlement_id)
                            }
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              hasTransfer
                                ? ""
                                : "Record the transfer before sending the share"
                            }
                          >
                            {busy === `submit:${s.settlement_id}`
                              ? "Sending..."
                              : s.status === "rejected"
                              ? "Resubmit Share"
                              : "Send the Share"}
                          </button>

                          <button
                            disabled={busy === `cancel:${s.settlement_id}`}
                            onClick={() =>
                              void cancelSettlement(s.settlement_id)
                            }
                            className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {isSuperAdmin && s.status === "submitted" && (
                        <>
                          <button
                            disabled={busy === `review:${s.settlement_id}`}
                            onClick={() =>
                              void reviewSettlement(
                                s.settlement_id,
                                "approved"
                              )
                            }
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setRejectId(s.settlement_id);
                              setRejectionReason("");
                            }}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>

                    {editable && !hasTransfer && (
                      <div className="mt-2 text-xs text-amber-300">
                        Record the transfer before Send the Share becomes available.
                      </div>
                    )}

                    {transferId === s.settlement_id && (
                      <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                        <h3 className="font-semibold">Transfer Details</h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Transfer amount is automatic and cannot be changed.
                        </p>

                        <div className="mt-4 rounded-xl bg-zinc-950 p-4">
                          <div className="text-xs uppercase tracking-wide text-zinc-500">
                            Amount to Super Admin
                          </div>
                          <div className="mt-1 text-2xl font-bold">
                            {money(s.share_amount, s.currency)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm text-zinc-300">
                              Transfer Date
                            </span>
                            <input
                              type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              value={transferDate}
                              onChange={(e) => setTransferDate(e.target.value)}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm text-zinc-300">
                              Transfer Method
                            </span>
                            <select
                              value={transferMethod}
                              onChange={(e) => setTransferMethod(e.target.value)}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cash">Cash</option>
                              <option value="Other">Other</option>
                            </select>
                          </label>
                        </div>

                        <label className="mt-4 block space-y-2">
                          <span className="text-sm text-zinc-300">Note</span>
                          <textarea
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            rows={3}
                            placeholder="Optional"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                          />
                        </label>

                        <div className="mt-4 flex gap-2">
                          <button
                            disabled={
                              busy === `transfer:${s.settlement_id}`
                            }
                            onClick={() => void saveTransfer()}
                            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
                          >
                            {busy === `transfer:${s.settlement_id}`
                              ? "Saving..."
                              : "Save Transfer"}
                          </button>
                          <button
                            onClick={() => setTransferId(null)}
                            className="rounded-xl border border-zinc-700 px-4 py-2"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {rejectId === s.settlement_id && (
                      <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                        <h3 className="font-semibold text-red-200">
                          Reject Settlement
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Explain what the Admin needs to correct before resubmitting.
                        </p>
                        <textarea
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                          placeholder="Rejection reason"
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            disabled={busy === `review:${s.settlement_id}`}
                            onClick={() =>
                              void reviewSettlement(
                                s.settlement_id,
                                "rejected"
                              )
                            }
                            className="rounded-xl bg-red-600 px-4 py-2 font-semibold disabled:opacity-50"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => {
                              setRejectId(null);
                              setRejectionReason("");
                            }}
                            className="rounded-xl border border-zinc-700 px-4 py-2"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {detailsId === s.settlement_id && (
                      <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
                        <div className="bg-zinc-950/70 p-3 font-semibold">
                          Included Member Payments
                        </div>

                        {detailsLoading ? (
                          <div className="p-4 text-zinc-400">Loading...</div>
                        ) : details.length === 0 ? (
                          <div className="p-4 text-zinc-400">
                            No payment items found.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm">
                              <thead className="bg-zinc-950 text-left text-zinc-400">
                                <tr>
                                  <th className="p-3">Member</th>
                                  <th className="p-3">Billing Month</th>
                                  <th className="p-3">Payment Date</th>
                                  <th className="p-3">Timing</th>
                                  <th className="p-3">Method</th>
                                  <th className="p-3 text-right">Payment</th>
                                  <th className="p-3 text-right">Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800">
                                {details.map((item) => (
                                  <tr key={item.item_id}>
                                    <td className="p-3">
                                      <div>{item.member_name}</div>
                                      <div className="text-xs text-zinc-500">
                                        {item.member_id}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {monthLabel(item.billing_month)}
                                    </td>
                                    <td className="p-3">
                                      {dateOnly(item.payment_date)}
                                    </td>
                                    <td className="p-3">
                                      {item.is_late_payment ? (
                                        <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-300">
                                          LATE PAYMENT
                                        </span>
                                      ) : (
                                        <span className="text-zinc-400">On time</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      {item.payment_method || "—"}
                                    </td>
                                    <td className="p-3 text-right">
                                      {money(
                                        item.payment_amount,
                                        item.currency
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      {money(item.share_amount, item.currency)}
                                      <div className="text-xs text-zinc-500">
                                        {Number(item.share_percent)}%
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { exportToExcel } from "@/lib/exportExcel";

type PaymentStatus = "pending" | "approved" | "rejected";

type DojoOption = {
  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
};

type PaymentConfirmation = {
  confirmation_id: string;
  charge_id: string;
  membership_id: string;
  member_id: string | null;
  member_name: string;
  billing_month: string;
  charge_amount: number;
  transferred_amount: number;
  currency: string;
  payment_method: string | null;
  transfer_date: string | null;
  member_note: string | null;
  status: PaymentStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  rejection_reason: string | null;

  dojo_id: string;
  dojo_name: string;
  class_id: string;
  class_name: string;
};

type MessageType = "success" | "error" | "";

function isLatePayment(
  billingMonth: string,
  paymentDate: string | null,
) {
  return Boolean(
    paymentDate &&
    paymentDate.slice(0, 7) >
      billingMonth.slice(0, 7),
  );
}

export default function AdminPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dojos, setDojos] = useState<DojoOption[]>([]);
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dojoFilter, setDojoFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");

  const showSuccess = useCallback((text: string) => {
    setMessage(text);
    setMessageType("success");
  }, []);

  const showError = useCallback((text: string) => {
    setMessage(text);
    setMessageType("error");
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageType("");
  }, []);

  const loadAccessibleDojos = useCallback(async (): Promise<DojoOption[]> => {
    /*
     * admin_visible_members already respects the Admin/Super Admin
     * visibility rules used by Member Management.
     *
     * We only use it to discover dojo/class pairs. The payment RPC
     * performs its own finance-access check, so this is not a security
     * boundary.
     */
    const { data, error } = await supabase
      .from("admin_visible_members")
      .select("dojo_id, dojo_name, class_id, class_name")
      .not("dojo_id", "is", null);

    if (error) {
      throw error;
    }

    const map = new Map<string, DojoOption>();

    for (const row of data ?? []) {
      if (!row.dojo_id) continue;

      if (!map.has(row.dojo_id)) {
        map.set(row.dojo_id, {
          dojo_id: row.dojo_id,
          dojo_name: row.dojo_name ?? "Unnamed Dojo",
          class_id: row.class_id,
          class_name: row.class_name,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      `${a.class_name} ${a.dojo_name}`.localeCompare(
        `${b.class_name} ${b.dojo_name}`
      )
    );
  }, [supabase]);

  const loadConfirmationsForDojos = useCallback(async (
    dojoList: DojoOption[]
  ): Promise<PaymentConfirmation[]> => {
    const results = await Promise.all(
      dojoList.map(async (dojo) => {
        const { data, error } = await supabase.rpc(
          "get_dojo_payment_confirmations",
          {
            target_dojo_id: dojo.dojo_id,
            /*
             * NULL means all statuses in the existing RPC.
             */
            requested_status: null,
          }
        );

        if (error) {
          /*
           * A dojo may be visible in the member view but not financially
           * accessible to this particular Admin. The RPC remains the
           * authority. Ignore only the finance-access failure for that dojo.
           */
          const lower = (error.message ?? "").toLowerCase();

          if (
            lower.includes("financial access") ||
            lower.includes("not authorised") ||
            lower.includes("not authorized")
          ) {
            return [];
          }

          throw error;
        }

        return (data ?? []).map((row: Omit<PaymentConfirmation, keyof DojoOption>) => ({
          ...row,
          dojo_id: dojo.dojo_id,
          dojo_name: dojo.dojo_name,
          class_id: dojo.class_id,
          class_name: dojo.class_name,
        })) as PaymentConfirmation[];
      })
    );

    return results
      .flat()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }, [supabase]);

  const loadPaymentPage = useCallback(async () => {
    clearMessage();
    setRefreshing(true);

    try {
      const dojoList = await loadAccessibleDojos();
      setDojos(dojoList);

      const rows = await loadConfirmationsForDojos(dojoList);
      setConfirmations(rows);
    } catch (error: unknown) {
      console.error(error);
      showError(
        error instanceof Error
          ? error.message
          : "Failed to load payment confirmations."
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    clearMessage,
    loadAccessibleDojos,
    loadConfirmationsForDojos,
    showError,
  ]);

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      await loadPaymentPage();
      setLoading(false);
    }

    void initialize();
  }, [loadPaymentPage, router, supabase]);

  async function approveConfirmation(item: PaymentConfirmation) {
    const confirmed = window.confirm(
      `Approve ${formatMoney(
        item.transferred_amount,
        item.currency
      )} from ${item.member_name} for ${formatBillingMonth(
        item.billing_month
      )}?`
    );

    if (!confirmed) return;

    setProcessingId(item.confirmation_id);
    clearMessage();

    try {
      const { error } = await supabase.rpc(
        "review_membership_payment_confirmation",
        {
          target_confirmation_id: item.confirmation_id,
          decision: "approved",
          rejection_note: null,
        }
      );

      if (error) throw error;

      showSuccess(
        `${item.member_name}'s payment was approved and recorded as an official payment.`
      );

      setRejectingId(null);
      await loadPaymentPage();
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to approve payment."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectConfirmation(item: PaymentConfirmation) {
    const reason = (rejectionReasons[item.confirmation_id] ?? "").trim();

    if (!reason) {
      showError("A rejection reason is required.");
      return;
    }

    const confirmed = window.confirm(
      `Reject ${item.member_name}'s payment confirmation?\n\nReason: ${reason}`
    );

    if (!confirmed) return;

    setProcessingId(item.confirmation_id);
    clearMessage();

    try {
      const { error } = await supabase.rpc(
        "review_membership_payment_confirmation",
        {
          target_confirmation_id: item.confirmation_id,
          decision: "rejected",
          rejection_note: reason,
        }
      );

      if (error) throw error;

      showSuccess(
        `${item.member_name}'s payment confirmation was rejected. The Member can submit another confirmation.`
      );

      setRejectionReasons((current) => ({
        ...current,
        [item.confirmation_id]: "",
      }));
      setRejectingId(null);

      await loadPaymentPage();
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to reject payment."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatMoney(value: number | null | undefined, currency = "IDR") {
    const amount = Number(value ?? 0);

    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: currency || "IDR",
        maximumFractionDigits: (currency || "IDR") === "IDR" ? 0 : 2,
      }).format(amount);
    } catch {
      return `${currency || "IDR"} ${amount.toLocaleString("id-ID")}`;
    }
  }

  function formatBillingMonth(value: string | null) {
    if (!value) return "-";

    const [year, month] = value.slice(0, 10).split("-").map(Number);

    if (!year || !month) {
      return formatDate(value);
    }

    return new Intl.DateTimeFormat("en-AU", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
  }

  function statusLabel(status: PaymentStatus) {
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    return "Pending";
  }

  function statusClass(status: PaymentStatus) {
    if (status === "approved") {
      return "border-green-800 bg-green-950/30 text-green-300";
    }

    if (status === "rejected") {
      return "border-red-900 bg-red-950/30 text-red-300";
    }

    return "border-amber-800 bg-amber-950/30 text-amber-300";
  }

  const classes = Array.from(
    new Map(dojos.map((dojo) => [dojo.class_id, dojo.class_name]))
  );

  const filteredDojos =
    classFilter === "all"
      ? dojos
      : dojos.filter((dojo) => dojo.class_id === classFilter);

  const filteredConfirmations = confirmations.filter((item) => {
    const query = search.trim().toLowerCase();

    const searchMatch =
      !query ||
      item.member_name.toLowerCase().includes(query) ||
      (item.member_id ?? "").toLowerCase().includes(query) ||
      item.dojo_name.toLowerCase().includes(query) ||
      item.class_name.toLowerCase().includes(query) ||
      (item.payment_method ?? "").toLowerCase().includes(query);

    const statusMatch =
      statusFilter === "all" || item.status === statusFilter;

    const classMatch =
      classFilter === "all" || item.class_id === classFilter;

    const dojoMatch =
      dojoFilter === "all" || item.dojo_id === dojoFilter;

    const monthMatch =
      !monthFilter ||
      item.billing_month.slice(0, 7) === monthFilter;

    return (
      searchMatch &&
      statusMatch &&
      classMatch &&
      dojoMatch &&
      monthMatch
    );
  });

  const pendingConfirmations = filteredConfirmations.filter(
    (item) => item.status === "pending"
  );

  const historyConfirmations = filteredConfirmations.filter(
    (item) => item.status !== "pending"
  );

  const pendingTotal = pendingConfirmations.reduce(
    (sum, item) => sum + Number(item.transferred_amount ?? 0),
    0
  );

  function exportPaymentsExcel() {
    if (filteredConfirmations.length === 0) {
      showError("There are no payment confirmations to export.");
      return;
    }

    exportToExcel({
      filename: "Payment-Confirmations",
      sheetName: "Payments",
      title: "Membership Payment Confirmations",
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
          header: "Dojo",
          key: "dojo_name",
        },
        {
          header: "Billing Month",
          key: "billing_month",
          value: (row) => formatBillingMonth(row.billing_month),
        },
        {
          header: "Charge Amount",
          key: "charge_amount",
        },
        {
          header: "Transferred Amount",
          key: "transferred_amount",
        },
        {
          header: "Currency",
          key: "currency",
        },
        {
          header: "Payment Method",
          key: "payment_method",
          value: (row) => row.payment_method ?? "",
        },
        {
          header: "Transfer Date",
          key: "transfer_date",
          value: (row) => (row.transfer_date ? formatDate(row.transfer_date) : ""),
        },
        {
          header: "Status",
          key: "status",
          value: (row) => statusLabel(row.status),
        },
        {
          header: "Member Note",
          key: "member_note",
          value: (row) => row.member_note ?? "",
        },
        {
          header: "Submitted At",
          key: "created_at",
          value: (row) => formatDateTime(row.created_at),
        },
        {
          header: "Reviewed At",
          key: "reviewed_at",
          value: (row) => (row.reviewed_at ? formatDateTime(row.reviewed_at) : ""),
        },
        {
          header: "Reviewed By",
          key: "reviewed_by_name",
          value: (row) => row.reviewed_by_name ?? "",
        },
        {
          header: "Rejection Reason",
          key: "rejection_reason",
          value: (row) => row.rejection_reason ?? "",
        },
      ],
      data: filteredConfirmations,
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="text-neutral-400">Loading payments...</p>
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
            />

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-green-400">
                Finance Administration
              </p>

              <h1 className="text-3xl font-bold">
                Payment Confirmations
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Review Member subscription transfers and maintain the official payment record.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/subscriptions?tab=payments")}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
            >
              Record Direct Payment
            </button>

            <button
              type="button"
              disabled={refreshing}
              onClick={loadPaymentPage}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              ← Admin
            </button>
          </div>
        </header>

        {message && (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType === "success"
                ? "border-green-900 bg-green-950/30 text-green-300"
                : "border-red-900 bg-red-950/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-900 bg-amber-950/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Pending
            </p>
            <p className="mt-2 text-3xl font-bold">
              {pendingConfirmations.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Pending Value
            </p>
            <p className="mt-2 text-xl font-bold">
              {formatMoney(pendingTotal, "IDR")}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Display total assumes IDR
            </p>
          </div>

          <div className="rounded-2xl border border-green-900 bg-green-950/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
              Approved
            </p>
            <p className="mt-2 text-3xl font-bold">
              {
                filteredConfirmations.filter(
                  (item) => item.status === "approved"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-red-900 bg-red-950/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Rejected
            </p>
            <p className="mt-2 text-3xl font-bold">
              {
                filteredConfirmations.filter(
                  (item) => item.status === "rejected"
                ).length
              }
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Member / ID / dojo / method"
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 xl:col-span-2"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setDojoFilter("all");
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
            >
              <option value="all">All Classes</option>

              {classes.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={dojoFilter}
              onChange={(event) => setDojoFilter(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
            >
              <option value="all">All Dojos</option>

              {filteredDojos.map((dojo) => (
                <option key={dojo.dojo_id} value={dojo.dojo_id}>
                  {dojo.dojo_name}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-500">
              Showing {filteredConfirmations.length} of {confirmations.length} confirmations
            </p>

            <button
              type="button"
              disabled={filteredConfirmations.length === 0}
              onClick={exportPaymentsExcel}
              className="self-start rounded-lg border border-green-800 bg-green-950/10 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
            >
              Export to Excel
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                Pending Confirmations
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Payments Requiring Review
              </h2>
            </div>

            <span className="rounded-full border border-amber-800 bg-amber-950/30 px-3 py-1 text-sm font-semibold text-amber-300">
              {pendingConfirmations.length} Pending
            </span>
          </div>

          {pendingConfirmations.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
              <p className="font-semibold text-green-300">
                No pending payment confirmations.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                New Member submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingConfirmations.map((item) => {
                const processing = processingId === item.confirmation_id;
                const rejecting = rejectingId === item.confirmation_id;

                return (
                  <article
                    key={item.confirmation_id}
                    className="rounded-2xl border border-amber-900/70 bg-neutral-900 p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">
                            {item.member_name}
                          </h3>

                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(item.status)}`}>
                            {statusLabel(item.status).toUpperCase()}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-neutral-500">
                          Member ID: {item.member_id ?? "Not assigned"}
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          {item.class_name} · {item.dojo_name}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Amount Submitted
                        </p>
                        <p className="mt-1 text-2xl font-bold text-green-300">
                          {formatMoney(item.transferred_amount, item.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="Billing Month" value={formatBillingMonth(item.billing_month)} />
                      <Info label="Monthly Charge" value={formatMoney(item.charge_amount, item.currency)} />
                      <Info label="Payment Method" value={item.payment_method || "-"} />
                      <Info label="Transfer Date" value={item.transfer_date ? formatDate(item.transfer_date) : "-"} />
                    </div>

                    {isLatePayment(item.billing_month, item.transfer_date) && (
                      <span className="mt-4 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-300">
                        LATE PAYMENT
                      </span>
                    )}

                    {item.member_note && (
                      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Member Note
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">
                          {item.member_note}
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-neutral-600">
                      Submitted {formatDateTime(item.created_at)}
                    </p>

                    {!rejecting ? (
                      <div className="mt-5 flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => approveConfirmation(item)}
                          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Approve Payment"}
                        </button>

                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => setRejectingId(item.confirmation_id)}
                          className="rounded-lg border border-red-900 px-5 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-red-900 bg-red-950/10 p-5">
                        <label className="text-sm font-semibold text-red-300">
                          Rejection Reason
                        </label>

                        <textarea
                          rows={3}
                          value={rejectionReasons[item.confirmation_id] ?? ""}
                          onChange={(event) =>
                            setRejectionReasons((current) => ({
                              ...current,
                              [item.confirmation_id]: event.target.value,
                            }))
                          }
                          placeholder="Explain why this payment confirmation is being rejected..."
                          className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
                        />

                        <p className="mt-2 text-xs text-neutral-500">
                          The rejected confirmation remains in history and the Member can submit another payment confirmation.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() => rejectConfirmation(item)}
                            className="rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                          >
                            {processing ? "Processing..." : "Confirm Rejection"}
                          </button>

                          <button
                            type="button"
                            disabled={processing}
                            onClick={() => setRejectingId(null)}
                            className="rounded-lg border border-neutral-700 px-5 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-neutral-800 pt-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">
              Review History
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Approved & Rejected Confirmations
            </h2>
          </div>

          {historyConfirmations.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-500">
              No reviewed confirmations match the current filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="min-w-full divide-y divide-neutral-800 bg-neutral-900 text-sm">
                <thead className="bg-neutral-950/60 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Class / Dojo</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Transferred</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reviewed</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800">
                  {historyConfirmations.map((item) => (
                    <tr key={item.confirmation_id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{item.member_name}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.member_id ?? "No Member ID"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p>{item.class_name}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.dojo_name}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p>{formatBillingMonth(item.billing_month)}</p>
                        {isLatePayment(item.billing_month, item.transfer_date) && (
                          <span className="mt-1 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
                            LATE PAYMENT
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {formatMoney(item.transferred_amount, item.currency)}
                      </td>

                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(item.status)}`}>
                          {statusLabel(item.status).toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p>
                          {item.reviewed_at
                            ? formatDateTime(item.reviewed_at)
                            : "-"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.reviewed_by_name ?? "-"}
                        </p>
                      </td>

                      <td className="max-w-xs px-4 py-4">
                        {item.status === "rejected" ? (
                          <p className="text-red-300">
                            {item.rejection_reason ?? "No reason recorded"}
                          </p>
                        ) : (
                          <p className="text-green-300">
                            Official payment recorded
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-2 font-semibold text-neutral-200">{value}</p>
    </div>
  );
}

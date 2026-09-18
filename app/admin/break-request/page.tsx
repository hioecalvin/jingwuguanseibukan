"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type BreakRequest = {
  request_id: string;
  membership_id: string;

  member_id: string | null;
  member_name: string;

  class_id: string;
  class_name: string;

  dojo_id: string | null;
  dojo_name: string | null;

  membership_status: string;

  request_status: string;
  reason: string | null;

  requested_at: string;

  effective_from: string | null;
  activation_type: string | null;

  reviewed_by: string | null;
  reviewed_at: string | null;

  rejection_reason: string | null;
  applied_at: string | null;

  billing_month: string;

  charge_id: string | null;
  charge_amount: number | null;
  charge_currency: string | null;
  charge_status: string | null;

  amount_paid: number;
  payment_state: string;
};

type ReviewResult = {
  success?: boolean;
  decision?: string;
  activation_type?: string;
  effective_from?: string;
  membership_id?: string;
  current_month_paid?: boolean;
};

export default function BreakRequestsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    requests,
    setRequests,
  ] = useState<BreakRequest[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("pending");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(null);

  const [
    rejectionRequest,
    setRejectionRequest,
  ] = useState<BreakRequest | null>(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

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

  /*
   * =====================================================
   * HELPERS
   * =====================================================
   */

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

  function formatDateTime(
    value: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatMoney(
    amount: number | null,
    currency: string | null
  ) {
    if (
      amount === null ||
      amount === undefined
    ) {
      return "-";
    }

    const currencyCode =
      currency || "IDR";

    try {
      return new Intl.NumberFormat(
        "id-ID",
        {
          style: "currency",
          currency:
            currencyCode,
          maximumFractionDigits:
            currencyCode === "IDR"
              ? 0
              : 2,
        }
      ).format(amount);
    } catch {
      return `${currencyCode} ${amount.toLocaleString()}`;
    }
  }

  function membershipStatusLabel(
    status: string
  ) {
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

  function requestStatusClass(
    status: string
  ) {
    if (status === "approved") {
      return "border-green-900 bg-green-950/30 text-green-300";
    }

    if (status === "rejected") {
      return "border-red-900 bg-red-950/30 text-red-300";
    }

    if (status === "cancelled") {
      return "border-neutral-700 bg-neutral-800 text-neutral-400";
    }

    return "border-amber-900 bg-amber-950/30 text-amber-300";
  }

  function paymentStateClass(
    state: string
  ) {
    if (state === "paid") {
      return "border-green-900 bg-green-950/30 text-green-300";
    }

    if (
      state ===
      "partially_paid"
    ) {
      return "border-orange-900 bg-orange-950/30 text-orange-300";
    }

    if (state === "waived") {
      return "border-sky-900 bg-sky-950/30 text-sky-300";
    }

    if (state === "cancelled") {
      return "border-neutral-700 bg-neutral-800 text-neutral-400";
    }

    if (state === "no_charge") {
      return "border-neutral-700 bg-neutral-800 text-neutral-400";
    }

    return "border-red-900 bg-red-950/30 text-red-300";
  }

  function paymentStateLabel(
    state: string
  ) {
    if (
      state ===
      "partially_paid"
    ) {
      return "Partially Paid";
    }

    if (
      state ===
      "no_charge"
    ) {
      return "No Charge";
    }

    return state
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  /*
   * =====================================================
   * LOAD REQUESTS
   * =====================================================
   */

  const loadRequests =
    useCallback(
      async () => {
        setLoading(true);

        setMessage("");
        setMessageType("");

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_manageable_membership_break_requests",
            {
              request_status_filter:
                statusFilter ===
                "all"
                  ? null
                  : statusFilter,
            }
          );

        if (error) {
          setMessage(
            error.message
          );

          setMessageType(
            "error"
          );

          setRequests([]);
          setLoading(false);

          return;
        }

        setRequests(
          (data ??
            []) as BreakRequest[]
        );

        setLoading(false);
      },
      [
        statusFilter,
        supabase,
      ]
    );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /*
   * =====================================================
   * APPROVE
   * =====================================================
   */

  async function approveRequest(
    request: BreakRequest
  ) {
    let confirmationMessage =
      `Approve Break request for ${request.member_name} — ${request.class_name}?`;

    if (
      request.payment_state ===
        "paid" ||
      request.payment_state ===
        "partially_paid"
    ) {
      confirmationMessage +=
        "\n\nA payment already exists for this month. Break 1 will start next month.";
    } else {
      confirmationMessage +=
        "\n\nThere is no official payment for this month. Break 1 will start immediately and the current unpaid charge will be waived.";
    }

    const confirmed =
      window.confirm(
        confirmationMessage
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      request.request_id
    );

    setMessage("");
    setMessageType("");

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "review_membership_break_request",
        {
          target_request_id:
            request.request_id,

          decision:
            "approved",

          rejection_note:
            null,
        }
      );

    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setProcessingId(
        null
      );

      return;
    }

    const result =
      (data ??
        {}) as ReviewResult;

    if (
      result.activation_type ===
      "next_month"
    ) {
      setMessage(
        `Break request approved. Break 1 will start on ${formatDate(
          result.effective_from ??
            null
        )}.`
      );
    } else {
      setMessage(
        "Break request approved. Break 1 is now active."
      );
    }

    setMessageType(
      "success"
    );

    setProcessingId(
      null
    );

    await loadRequests();
  }

  /*
   * =====================================================
   * REJECT
   * =====================================================
   */

  function openReject(
    request: BreakRequest
  ) {
    setRejectionRequest(
      request
    );

    setRejectionReason(
      ""
    );

    setMessage("");
    setMessageType("");
  }

  function closeReject() {
    if (processingId) {
      return;
    }

    setRejectionRequest(
      null
    );

    setRejectionReason(
      ""
    );
  }

  async function rejectRequest(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !rejectionRequest
    ) {
      return;
    }

    if (
      !rejectionReason.trim()
    ) {
      setMessage(
        "A rejection reason is required."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setProcessingId(
      rejectionRequest
        .request_id
    );

    setMessage("");
    setMessageType("");

    const {
      error,
    } =
      await supabase.rpc(
        "review_membership_break_request",
        {
          target_request_id:
            rejectionRequest
              .request_id,

          decision:
            "rejected",

          rejection_note:
            rejectionReason.trim(),
        }
      );

    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setProcessingId(
        null
      );

      return;
    }

    setMessage(
      `Break request for ${rejectionRequest.member_name} was rejected.`
    );

    setMessageType(
      "success"
    );

    setProcessingId(
      null
    );

    setRejectionRequest(
      null
    );

    setRejectionReason(
      ""
    );

    await loadRequests();
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <main className="mx-auto w-full max-w-7xl">
      <header className="border-b border-neutral-800 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Break Requests
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Review Member Break requests by class. Paid months remain active until the next month, while unpaid months can enter Break 1 immediately.
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

      {/* FILTER */}

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Request Status
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="min-w-56 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white outline-none focus:border-amber-600"
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

              <option value="cancelled">
                Cancelled
              </option>

              <option value="all">
                All Requests
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={
              loadRequests
            }
            disabled={loading}
            className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50 md:self-auto"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </section>

      {/* CONTENT */}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-amber-400" />

            <p className="mt-4 text-sm text-neutral-400">
              Loading Break requests...
            </p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <h2 className="text-xl font-semibold">
            No Break Requests
          </h2>

          <p className="mt-2 text-sm text-neutral-400">
            There are no requests matching the selected status.
          </p>
        </section>
      ) : (
        <section className="mt-6 space-y-5">
          {requests.map(
            (request) => {
              const isPending =
                request.request_status ===
                "pending";

              const isProcessing =
                processingId ===
                request.request_id;

              return (
                <article
                  key={
                    request.request_id
                  }
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-400">
                          {request.class_name}
                        </p>

                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            requestStatusClass(
                              request.request_status
                            ),
                          ].join(
                            " "
                          )}
                        >
                          {request.request_status
                            .replaceAll(
                              "_",
                              " "
                            )
                            .replace(
                              /\b\w/g,
                              (
                                character
                              ) =>
                                character.toUpperCase()
                            )}
                        </span>
                      </div>

                      <h2 className="mt-2 text-2xl font-bold">
                        {request.member_name}
                      </h2>

                      <p className="mt-1 text-sm text-neutral-400">
                        Member ID:{" "}
                        <span className="text-neutral-200">
                          {request.member_id ??
                            "-"}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-neutral-400">
                        Dojo:{" "}
                        <span className="text-neutral-200">
                          {request.dojo_name ??
                            "-"}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                        {membershipStatusLabel(
                          request.membership_status
                        )}
                      </span>

                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          paymentStateClass(
                            request.payment_state
                          ),
                        ].join(
                          " "
                        )}
                      >
                        {paymentStateLabel(
                          request.payment_state
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard
                      label="Requested"
                      value={formatDateTime(
                        request.requested_at
                      )}
                    />

                    <InfoCard
                      label="Billing Month"
                      value={formatDate(
                        request.billing_month
                      )}
                    />

                    <InfoCard
                      label="Current Charge"
                      value={formatMoney(
                        request.charge_amount,
                        request.charge_currency
                      )}
                    />

                    <InfoCard
                      label="Amount Paid"
                      value={formatMoney(
                        request.amount_paid,
                        request.charge_currency
                      )}
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      Member Reason
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                      {request.reason ||
                        "No reason provided."}
                    </p>
                  </div>

                  {request.request_status ===
                    "approved" && (
                    <div className="mt-4 rounded-xl border border-green-900 bg-green-950/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                        Approval Result
                      </p>

                      <p className="mt-2 text-sm text-neutral-300">
                        Activation:{" "}
                        <span className="font-semibold text-white">
                          {request.activation_type ===
                          "next_month"
                            ? "Next Month"
                            : "Immediate"}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-neutral-300">
                        Effective From:{" "}
                        <span className="font-semibold text-white">
                          {formatDate(
                            request.effective_from
                          )}
                        </span>
                      </p>

                      {request.applied_at && (
                        <p className="mt-1 text-sm text-neutral-400">
                          Applied:{" "}
                          {formatDateTime(
                            request.applied_at
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {request.request_status ===
                    "rejected" && (
                    <div className="mt-4 rounded-xl border border-red-900 bg-red-950/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                        Rejection
                      </p>

                      <p className="mt-2 text-sm text-red-200">
                        {request.rejection_reason ||
                          "No rejection reason recorded."}
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <>
                      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          What happens if approved?
                        </p>

                        {request.payment_state ===
                          "paid" ||
                        request.payment_state ===
                          "partially_paid" ? (
                          <p className="mt-2 text-sm leading-6 text-sky-300">
                            An official payment already exists for this month. The Member remains Active for the rest of this month and Break 1 begins next month.
                          </p>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-amber-300">
                            No official payment exists for this month. The current unpaid charge will be waived and Break 1 begins immediately.
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            approveRequest(
                              request
                            )
                          }
                          className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            openReject(
                              request
                            )
                          }
                          className="rounded-lg border border-red-900 px-5 py-2 font-medium text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            }
          )}
        </section>
      )}

      {/* REJECTION MODAL */}

      {rejectionRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Reject Break Request
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {rejectionRequest.member_name}
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              {rejectionRequest.class_name}
              {rejectionRequest.dojo_name
                ? ` · ${rejectionRequest.dojo_name}`
                : ""}
            </p>

            <form
              onSubmit={
                rejectRequest
              }
              className="mt-6"
            >
              <label className="mb-2 block text-sm font-medium">
                Rejection Reason
              </label>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target
                      .value
                  )
                }
                rows={5}
                required
                placeholder="Explain why this Break request is being rejected"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-500 focus:border-red-600"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    processingId ===
                    rejectionRequest
                      .request_id
                  }
                  className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {processingId ===
                  rejectionRequest.request_id
                    ? "Rejecting..."
                    : "Reject Request"}
                </button>

                <button
                  type="button"
                  disabled={
                    processingId ===
                    rejectionRequest
                      .request_id
                  }
                  onClick={
                    closeReject
                  }
                  className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoCard({
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

      <p className="mt-1 font-semibold text-neutral-100">
        {value}
      </p>
    </div>
  );
}
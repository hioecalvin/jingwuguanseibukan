"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type AvailableEnrollment = {
  class_id: string;
  class_name: string;
  dojo_id: string | null;
  dojo_name: string | null;
};

type EnrollmentRequest = {
  request_id: string;

  class_id: string;
  class_name: string;

  dojo_id: string | null;
  dojo_name: string | null;

  request_status:
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled";

  member_note: string | null;

  requested_at: string;
  reviewed_at: string | null;

  rejection_reason: string | null;

  membership_id: string | null;
};

type ClassOption = {
  id: string;
  name: string;
};

type Props = {
  onEnrollmentChanged?: () => void;
};

export default function ClassEnrollmentPanel({
  onEnrollmentChanged,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    available,
    setAvailable,
  ] = useState<AvailableEnrollment[]>([]);

  const [
    requests,
    setRequests,
  ] = useState<EnrollmentRequest[]>([]);

  const [
    selectedClassId,
    setSelectedClassId,
  ] = useState("");

  const [
    selectedDojoId,
    setSelectedDojoId,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    cancellingId,
    setCancellingId,
  ] = useState<string | null>(
    null
  );

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
   * LOAD
   * =====================================================
   */

  const loadEnrollmentData = useCallback(async () => {
    setLoading(true);

    const [
      availableResult,
      requestResult,
    ] = await Promise.all([
      supabase.rpc(
        "get_my_available_class_enrollments"
      ),

      supabase.rpc(
        "get_my_class_enrollment_requests"
      ),
    ]);

    if (availableResult.error) {
      setMessage(
        availableResult.error.message
      );

      setMessageType("error");
      setLoading(false);

      return;
    }

    if (requestResult.error) {
      setMessage(
        requestResult.error.message
      );

      setMessageType("error");
      setLoading(false);

      return;
    }

    setAvailable(
      (availableResult.data ??
        []) as AvailableEnrollment[]
    );

    setRequests(
      (requestResult.data ??
        []) as EnrollmentRequest[]
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadEnrollmentData();
  }, [loadEnrollmentData]);

  /*
   * =====================================================
   * OPTIONS
   * =====================================================
   */

  const classOptions =
    useMemo(() => {
      const map =
        new Map<
          string,
          ClassOption
        >();

      for (
        const item of available
      ) {
        if (
          !map.has(
            item.class_id
          )
        ) {
          map.set(
            item.class_id,
            {
              id:
                item.class_id,

              name:
                item.class_name,
            }
          );
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );
    }, [available]);

  const dojoOptions =
    useMemo(
      () =>
        available.filter(
          (item) =>
            item.class_id ===
            selectedClassId &&
            item.dojo_id
        ),
      [
        available,
        selectedClassId,
      ]
    );

  /*
   * =====================================================
   * SUBMIT
   * =====================================================
   */

  async function submitEnrollment(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!selectedClassId) {
      setMessage(
        "Please select a class."
      );

      setMessageType("error");

      return;
    }

    /*
     * If the class has dojo options,
     * require one to be selected.
     */

    if (
      dojoOptions.length > 0 &&
      !selectedDojoId
    ) {
      setMessage(
        "Please select a dojo."
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
      "request_class_enrollment",
      {
        target_class_id:
          selectedClassId,

        target_dojo_id:
          selectedDojoId ||
          null,

        request_note:
          note.trim() ||
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

      setProcessing(
        false
      );

      return;
    }

    setSelectedClassId(
      ""
    );

    setSelectedDojoId(
      ""
    );

    setNote(
      ""
    );

    setShowForm(
      false
    );

    await loadEnrollmentData();

    setMessage(
      "Enrollment request submitted successfully."
    );

    setMessageType(
      "success"
    );

    setProcessing(
      false
    );

    onEnrollmentChanged?.();
  }

  /*
   * =====================================================
   * CANCEL
   * =====================================================
   */

  async function cancelRequest(
    requestId: string
  ) {
    const confirmed =
      window.confirm(
        "Cancel this enrollment request?"
      );

    if (!confirmed) {
      return;
    }

    setCancellingId(
      requestId
    );

    setMessage("");
    setMessageType("");

    const {
      error,
    } = await supabase.rpc(
      "cancel_class_enrollment_request",
      {
        target_request_id:
          requestId,
      }
    );

    if (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );

      setCancellingId(
        null
      );

      return;
    }

    await loadEnrollmentData();

    setMessage(
      "Enrollment request cancelled."
    );

    setMessageType(
      "success"
    );

    setCancellingId(
      null
    );

    onEnrollmentChanged?.();
  }

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

    const date =
      new Date(value);

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

  function requestStatusClass(
    status:
      EnrollmentRequest["request_status"]
  ) {
    if (
      status ===
      "approved"
    ) {
      return "border-green-800 bg-green-950/30 text-green-300";
    }

    if (
      status ===
      "rejected"
    ) {
      return "border-red-800 bg-red-950/30 text-red-300";
    }

    if (
      status ===
      "cancelled"
    ) {
      return "border-neutral-700 bg-neutral-800 text-neutral-400";
    }

    return "border-amber-800 bg-amber-950/30 text-amber-300";
  }

  function requestStatusLabel(
    status:
      EnrollmentRequest["request_status"]
  ) {
    if (
      status ===
      "approved"
    ) {
      return "Approved";
    }

    if (
      status ===
      "rejected"
    ) {
      return "Rejected";
    }

    if (
      status ===
      "cancelled"
    ) {
      return "Cancelled";
    }

    return "Pending";
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <section className="mt-8 rounded-2xl border border-sky-900 bg-sky-950/10 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Enrollment
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Enroll in Another Class
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Request access to another
            Jingwuguan Seibukan class.
            Each class membership is
            managed independently.
          </p>
        </div>

        {!showForm &&
          classOptions.length >
            0 && (
            <button
              type="button"
              onClick={() => {
                setShowForm(
                  true
                );

                setMessage(
                  ""
                );

                setMessageType(
                  ""
                );
              }}
              className="self-start rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Enroll in Another Class
            </button>
          )}
      </div>

      {message && (
        <div
          className={[
            "mt-5 rounded-xl border p-4 text-sm",

            messageType ===
            "success"
              ? "border-green-900 bg-green-950/30 text-green-300"
              : "border-red-900 bg-red-950/30 text-red-300",
          ].join(" ")}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/70 p-5">
          <p className="text-sm text-neutral-400">
            Loading enrollment
            options...
          </p>
        </div>
      ) : (
        <>
          {classOptions.length ===
            0 && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="font-medium text-neutral-200">
                No additional
                classes available.
              </p>

              <p className="mt-1 text-sm text-neutral-400">
                You are already
                enrolled in every
                available class.
              </p>
            </div>
          )}

          {showForm &&
            classOptions.length >
              0 && (
              <form
                onSubmit={
                  submitEnrollment
                }
                className="mt-6 rounded-xl border border-sky-900 bg-neutral-900/80 p-5"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="class-enrollment-class"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Class
                    </label>

                    <select
                      id="class-enrollment-class"
                      value={
                        selectedClassId
                      }
                      onChange={(
                        event
                      ) => {
                        setSelectedClassId(
                          event
                            .target
                            .value
                        );

                        setSelectedDojoId(
                          ""
                        );
                      }}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-sky-500"
                    >
                      <option value="">
                        Select class
                      </option>

                      {classOptions.map(
                        (
                          classOption
                        ) => (
                          <option
                            key={
                              classOption.id
                            }
                            value={
                              classOption.id
                            }
                          >
                            {
                              classOption.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="class-enrollment-dojo"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Dojo
                    </label>

                    <select
                      id="class-enrollment-dojo"
                      value={
                        selectedDojoId
                      }
                      disabled={
                        !selectedClassId ||
                        dojoOptions.length ===
                          0
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedDojoId(
                          event
                            .target
                            .value
                        )
                      }
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {!selectedClassId
                          ? "Select a class first"
                          : dojoOptions.length ===
                            0
                          ? "No dojo required"
                          : "Select dojo"}
                      </option>

                      {dojoOptions.map(
                        (
                          dojo
                        ) => (
                          <option
                            key={
                              dojo.dojo_id ??
                              `${dojo.class_id}-none`
                            }
                            value={
                              dojo.dojo_id ??
                              ""
                            }
                          >
                            {dojo.dojo_name ??
                              "Dojo"}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="class-enrollment-note"
                    className="mb-2 block text-sm font-medium text-neutral-300"
                  >
                    Note
                    <span className="ml-2 font-normal text-neutral-400">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="class-enrollment-note"
                    value={
                      note
                    }
                    onChange={(
                      event
                    ) =>
                      setNote(
                        event
                          .target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Add a note for the Admin..."
                    className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-sky-500"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={
                      processing
                    }
                    className="rounded-lg bg-sky-700 px-5 py-2 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
                  >
                    {processing
                      ? "Submitting..."
                      : "Request Enrollment"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      processing
                    }
                    onClick={() => {
                      setShowForm(
                        false
                      );

                      setSelectedClassId(
                        ""
                      );

                      setSelectedDojoId(
                        ""
                      );

                      setNote(
                        ""
                      );
                    }}
                    className="rounded-lg border border-neutral-700 px-5 py-2 text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          {requests.length >
            0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold">
                Enrollment Requests
              </h3>

              <p className="mt-1 text-sm text-neutral-400">
                Your enrollment
                application history.
              </p>

              <div className="mt-4 space-y-3">
                {requests.map(
                  (request) => (
                    <article
                      key={
                        request.request_id
                      }
                      className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-semibold text-neutral-100">
                            {
                              request.class_name
                            }
                          </p>

                          <p className="mt-1 text-sm text-neutral-400">
                            {request.dojo_name ??
                              "No dojo selected"}
                          </p>

                          <p className="mt-2 text-xs text-neutral-400">
                            Requested:{" "}
                            {formatDate(
                              request.requested_at
                            )}
                          </p>
                        </div>

                        <span
                          className={[
                            "self-start rounded-full border px-3 py-1 text-xs font-semibold",

                            requestStatusClass(
                              request.request_status
                            ),
                          ].join(
                            " "
                          )}
                        >
                          {requestStatusLabel(
                            request.request_status
                          )}
                        </span>
                      </div>

                      {request.member_note && (
                        <div className="mt-4 rounded-lg bg-neutral-950/70 p-3">
                          <p className="text-xs uppercase tracking-wider text-neutral-400">
                            Your Note
                          </p>

                          <p className="mt-1 text-sm text-neutral-300">
                            {
                              request.member_note
                            }
                          </p>
                        </div>
                      )}

                      {request.request_status ===
                        "rejected" &&
                        request.rejection_reason && (
                          <div className="mt-4 rounded-lg border border-red-900 bg-red-950/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                              Rejection Reason
                            </p>

                            <p className="mt-1 text-sm text-red-200">
                              {
                                request.rejection_reason
                              }
                            </p>
                          </div>
                        )}

                      {request.request_status ===
                        "approved" && (
                        <p className="mt-4 text-sm text-green-400">
                          Enrollment approved.
                          This class is now
                          part of your
                          memberships.
                        </p>
                      )}

                      {request.request_status ===
                        "pending" && (
                        <div className="mt-4">
                          <button
                            type="button"
                            disabled={
                              cancellingId ===
                              request.request_id
                            }
                            onClick={() =>
                              cancelRequest(
                                request.request_id
                              )
                            }
                            className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                          >
                            {cancellingId ===
                            request.request_id
                              ? "Cancelling..."
                              : "Cancel Request"}
                          </button>
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

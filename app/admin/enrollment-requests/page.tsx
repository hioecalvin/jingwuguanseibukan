"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";


type EnrollmentRequest = {
  request_id: string;

  user_id: string;

  member_name: string | null;
  member_id: string | null;

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

  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;

  rejection_reason: string | null;

  membership_id: string | null;
};


type FilterStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";


type MessageType =
  | "success"
  | "error"
  | "";


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function EnrollmentRequestsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );


  const [
    requests,
    setRequests,
  ] =
    useState<
      EnrollmentRequest[]
    >([]);


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
    rejectingId,
    setRejectingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState("");


  const [
    filter,
    setFilter,
  ] =
    useState<FilterStatus>(
      "pending"
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


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


  /*
   * ============================================================
   * MESSAGE HELPERS
   * ============================================================
   */

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }


  function showSuccess(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "success"
    );
  }


  function showError(
    text: string
  ) {
    setMessage(text);
    setMessageType(
      "error"
    );
  }


  /*
   * ============================================================
   * LOAD
   * ============================================================
   */

  const loadRequests =
    useCallback(
      async () => {
        setLoading(true);


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_admin_class_enrollment_requests"
          );


        if (error) {
          showError(
            error.message
          );

          setLoading(false);

          return;
        }


        setRequests(
          (
            data ??
            []
          ) as EnrollmentRequest[]
        );


        setLoading(false);
      },

      [
        supabase,
      ]
    );


  useEffect(() => {
    void loadRequests();
  }, [
    loadRequests,
  ]);


  /*
   * ============================================================
   * FILTER
   * ============================================================
   */

  const filteredRequests =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();


        return requests.filter(
          (
            request
          ) => {
            if (
              filter !==
                "all" &&
              request.request_status !==
                filter
            ) {
              return false;
            }


            if (
              !normalizedSearch
            ) {
              return true;
            }


            const haystack = [
              request.member_name,
              request.member_id,
              request.class_name,
              request.dojo_name,
              request.reviewed_by_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


            return haystack.includes(
              normalizedSearch
            );
          }
        );
      },

      [
        requests,
        filter,
        search,
      ]
    );


  /*
   * ============================================================
   * COUNTS
   * ============================================================
   */

  const pendingCount =
    requests.filter(
      (
        request
      ) =>
        request.request_status ===
        "pending"
    ).length;


  /*
   * ============================================================
   * APPROVE
   * ============================================================
   */

  async function approveRequest(
    request:
      EnrollmentRequest
  ) {
    const confirmed =
      window.confirm(
        `Approve ${
          request.member_name ??
          "this Member"
        } for ${
          request.class_name
        }?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      request.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_class_enrollment_request",
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
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    await loadRequests();


    showSuccess(
      `${
        request.member_name ??
        "Member"
      } has been enrolled in ${
        request.class_name
      }.`
    );


    setProcessingId(
      null
    );
  }


  /*
   * ============================================================
   * REJECT
   * ============================================================
   */

  async function rejectRequest(
    request:
      EnrollmentRequest
  ) {
    const reason =
      rejectionReason.trim();


    if (
      !reason
    ) {
      showError(
        "A rejection reason is required."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Reject ${
          request.member_name ??
          "this Member"
        }'s enrollment request?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      request.request_id
    );

    clearMessage();


    const {
      error,
    } =
      await supabase.rpc(
        "review_class_enrollment_request",
        {
          target_request_id:
            request.request_id,

          decision:
            "rejected",

          rejection_note:
            reason,
        }
      );


    if (error) {
      showError(
        error.message
      );

      setProcessingId(
        null
      );

      return;
    }


    setRejectingId(
      null
    );

    setRejectionReason(
      ""
    );


    await loadRequests();


    showSuccess(
      "Enrollment request rejected."
    );


    setProcessingId(
      null
    );
  }


  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function formatDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "-";
    }


    const date =
      new Date(
        value
      );


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
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    );
  }


  function statusLabel(
    status:
      EnrollmentRequest["request_status"]
  ) {
    switch (
      status
    ) {
      case "approved":
        return "Approved";

      case "rejected":
        return "Rejected";

      case "cancelled":
        return "Cancelled";

      default:
        return "Pending";
    }
  }


  function statusClass(
    status:
      EnrollmentRequest["request_status"]
  ) {
    switch (
      status
    ) {
      case "approved":
        return "border-green-800 bg-green-950/30 text-green-300";

      case "rejected":
        return "border-red-800 bg-red-950/30 text-red-300";

      case "cancelled":
        return "border-neutral-700 bg-neutral-800 text-neutral-400";

      default:
        return "border-amber-800 bg-amber-950/30 text-amber-300";
    }
  }


  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-7xl
      "
    >

      {/*
       * HEADER
       */}

      <div
        className="
          mb-8
        "
      >
        <p
          className="
            text-sm
            font-semibold
            uppercase
            tracking-[0.2em]
            text-sky-400
          "
        >
          Membership Management
        </p>


        <div
          className="
            mt-2
            flex
            flex-col
            justify-between
            gap-4
            sm:flex-row
            sm:items-end
          "
        >
          <div>
            <h1
              className="
                text-3xl
                font-bold
                text-white
              "
            >
              Enrollment Requests
            </h1>


            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-neutral-400
              "
            >
              Review requests from
              existing Members who
              want to enroll in
              another class.
            </p>
          </div>


          {pendingCount >
            0 && (
            <div
              className="
                self-start
                rounded-full
                border
                border-amber-800
                bg-amber-950/30
                px-4
                py-2
                text-sm
                font-semibold
                text-amber-300
                sm:self-auto
              "
            >
              {pendingCount} Pending
            </div>
          )}
        </div>
      </div>


      {/*
       * MESSAGE
       */}

      {message && (
        <div
          className={[
            `
              mb-6
              rounded-xl
              border
              p-4
              text-sm
            `,

            messageType ===
            "success"
              ? `
                  border-green-900
                  bg-green-950/30
                  text-green-300
                `
              : `
                  border-red-900
                  bg-red-950/30
                  text-red-300
                `,
          ].join(
            " "
          )}
        >
          {message}
        </div>
      )}


      {/*
       * FILTERS
       */}

      <section
        className="
          mb-6
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900/70
          p-4
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            {(
              [
                "pending",
                "approved",
                "rejected",
                "cancelled",
                "all",
              ] as FilterStatus[]
            ).map(
              (
                status
              ) => (
                <button
                  key={
                    status
                  }

                  type="button"

                  onClick={() =>
                    setFilter(
                      status
                    )
                  }

                  className={[
                    `
                      rounded-lg
                      border
                      px-4
                      py-2
                      text-sm
                      font-medium
                      transition
                    `,

                    filter ===
                    status
                      ? `
                          border-sky-600
                          bg-sky-600
                          text-white
                        `
                      : `
                          border-neutral-700
                          bg-neutral-900
                          text-neutral-300
                          hover:bg-neutral-800
                        `,
                  ].join(
                    " "
                  )}
                >
                  {status ===
                  "all"
                    ? "All"
                    : status
                        .charAt(
                          0
                        )
                        .toUpperCase() +
                      status.slice(
                        1
                      )}
                </button>
              )
            )}
          </div>


          <input
            type="search"

            value={
              search
            }

            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }

            placeholder="Search Member, ID, class, dojo or reviewer..."

            className="
              w-full
              rounded-lg
              border
              border-neutral-700
              bg-neutral-950
              px-4
              py-2.5
              text-sm
              text-white
              outline-none
              placeholder:text-neutral-600
              focus:border-sky-500
              lg:max-w-sm
            "
          />
        </div>
      </section>


      {/*
       * REQUESTS
       */}

      {loading ? (
        <section
          className="
            rounded-2xl
            border
            border-neutral-800
            bg-neutral-900/70
            p-8
          "
        >
          <p
            className="
              text-sm
              text-neutral-400
            "
          >
            Loading enrollment
            requests...
          </p>
        </section>

      ) : filteredRequests.length ===
        0 ? (

        <section
          className="
            rounded-2xl
            border
            border-neutral-800
            bg-neutral-900/70
            p-8
          "
        >
          <h2
            className="
              font-semibold
              text-neutral-200
            "
          >
            No enrollment requests
          </h2>


          <p
            className="
              mt-2
              text-sm
              text-neutral-500
            "
          >
            There are no requests
            matching the current
            filter.
          </p>
        </section>

      ) : (

        <div
          className="
            space-y-4
          "
        >
          {filteredRequests.map(
            (
              request
            ) => {
              const processing =
                processingId ===
                request.request_id;


              const rejecting =
                rejectingId ===
                request.request_id;


              return (
                <article
                  key={
                    request.request_id
                  }

                  className="
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900/70
                    p-5
                    sm:p-6
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      justify-between
                      gap-5
                      lg:flex-row
                    "
                  >
                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >

                      {/*
                       * MEMBER + STATUS
                       */}

                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-3
                        "
                      >
                        <h2
                          className="
                            text-xl
                            font-bold
                            text-white
                          "
                        >
                          {request.member_name ??
                            "Member"}
                        </h2>


                        <span
                          className={[
                            `
                              rounded-full
                              border
                              px-3
                              py-1
                              text-xs
                              font-semibold
                            `,

                            statusClass(
                              request.request_status
                            ),
                          ].join(
                            " "
                          )}
                        >
                          {statusLabel(
                            request.request_status
                          )}
                        </span>
                      </div>


                      <p
                        className="
                          mt-1
                          text-sm
                          text-neutral-500
                        "
                      >
                        Member ID:{" "}
                        {request.member_id ??
                          "-"}
                      </p>


                      {/*
                       * REQUEST INFORMATION
                       */}

                      <div
                        className="
                          mt-5
                          grid
                          gap-4
                          sm:grid-cols-2
                          xl:grid-cols-4
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Class
                          </p>

                          <p
                            className="
                              mt-1
                              font-medium
                              text-neutral-200
                            "
                          >
                            {
                              request.class_name
                            }
                          </p>
                        </div>


                        <div>
                          <p
                            className="
                              text-xs
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Dojo
                          </p>

                          <p
                            className="
                              mt-1
                              font-medium
                              text-neutral-200
                            "
                          >
                            {request.dojo_name ??
                              "-"}
                          </p>
                        </div>


                        <div>
                          <p
                            className="
                              text-xs
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Requested
                          </p>

                          <p
                            className="
                              mt-1
                              font-medium
                              text-neutral-200
                            "
                          >
                            {formatDate(
                              request.requested_at
                            )}
                          </p>
                        </div>


                        <div>
                          <p
                            className="
                              text-xs
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Membership
                          </p>

                          <p
                            className="
                              mt-1
                              font-medium
                              text-neutral-200
                            "
                          >
                            {request.membership_id
                              ? "Created"
                              : "-"}
                          </p>
                        </div>
                      </div>


                      {/*
                       * MEMBER NOTE
                       */}

                      {request.member_note && (
                        <div
                          className="
                            mt-5
                            rounded-xl
                            bg-neutral-950/70
                            p-4
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Member Note
                          </p>


                          <p
                            className="
                              mt-2
                              whitespace-pre-wrap
                              text-sm
                              leading-6
                              text-neutral-300
                            "
                          >
                            {
                              request.member_note
                            }
                          </p>
                        </div>
                      )}


                      {/*
                       * REVIEW AUDIT
                       */}

                      {request.reviewed_at && (
                        <div
                          className="
                            mt-5
                            rounded-xl
                            border
                            border-neutral-800
                            bg-neutral-950/50
                            p-4
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wider
                              text-neutral-500
                            "
                          >
                            Review
                          </p>


                          <div
                            className="
                              mt-3
                              grid
                              gap-4
                              sm:grid-cols-2
                            "
                          >
                            <div>
                              <p
                                className="
                                  text-xs
                                  text-neutral-500
                                "
                              >
                                Reviewed by
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-sm
                                  font-medium
                                  text-neutral-200
                                "
                              >
                                {request.reviewed_by_name ??
                                  "Unknown"}
                              </p>
                            </div>


                            <div>
                              <p
                                className="
                                  text-xs
                                  text-neutral-500
                                "
                              >
                                Reviewed
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-sm
                                  font-medium
                                  text-neutral-200
                                "
                              >
                                {formatDate(
                                  request.reviewed_at
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}


                      {/*
                       * REJECTION REASON
                       */}

                      {request.request_status ===
                        "rejected" &&
                        request.rejection_reason && (
                          <div
                            className="
                              mt-5
                              rounded-xl
                              border
                              border-red-900
                              bg-red-950/20
                              p-4
                            "
                          >
                            <p
                              className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-wider
                                text-red-400
                              "
                            >
                              Rejection Reason
                            </p>


                            <p
                              className="
                                mt-2
                                whitespace-pre-wrap
                                text-sm
                                leading-6
                                text-red-200
                              "
                            >
                              {
                                request.rejection_reason
                              }
                            </p>
                          </div>
                        )}
                    </div>


                    {/*
                     * ACTIONS
                     */}

                    {request.request_status ===
                      "pending" && (
                      <div
                        className="
                          w-full
                          shrink-0
                          lg:w-72
                        "
                      >
                        {!rejecting ? (
                          <div
                            className="
                              flex
                              flex-col
                              gap-3
                            "
                          >
                            <button
                              type="button"

                              disabled={
                                processing
                              }

                              onClick={() =>
                                approveRequest(
                                  request
                                )
                              }

                              className="
                                rounded-lg
                                bg-green-600
                                px-5
                                py-2.5
                                font-semibold
                                text-white
                                transition
                                hover:bg-green-500
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
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

                              onClick={() => {
                                setRejectingId(
                                  request.request_id
                                );

                                setRejectionReason(
                                  ""
                                );

                                clearMessage();
                              }}

                              className="
                                rounded-lg
                                border
                                border-red-900
                                px-5
                                py-2.5
                                font-semibold
                                text-red-300
                                transition
                                hover:bg-red-950/30
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              Reject
                            </button>
                          </div>

                        ) : (

                          <div
                            className="
                              rounded-xl
                              border
                              border-red-900
                              bg-red-950/10
                              p-4
                            "
                          >
                            <label
                              className="
                                block
                                text-sm
                                font-semibold
                                text-red-300
                              "
                            >
                              Rejection Reason
                            </label>


                            <textarea
                              value={
                                rejectionReason
                              }

                              onChange={(
                                event
                              ) =>
                                setRejectionReason(
                                  event.target
                                    .value
                                )
                              }

                              rows={
                                4
                              }

                              placeholder="Explain why this request is being rejected..."

                              className="
                                mt-3
                                w-full
                                resize-none
                                rounded-lg
                                border
                                border-neutral-700
                                bg-neutral-950
                                px-3
                                py-2
                                text-sm
                                text-white
                                outline-none
                                placeholder:text-neutral-600
                                focus:border-red-700
                              "
                            />


                            <div
                              className="
                                mt-3
                                flex
                                gap-2
                              "
                            >
                              <button
                                type="button"

                                disabled={
                                  processing
                                }

                                onClick={() =>
                                  rejectRequest(
                                    request
                                  )
                                }

                                className="
                                  flex-1
                                  rounded-lg
                                  bg-red-700
                                  px-3
                                  py-2
                                  text-sm
                                  font-semibold
                                  text-white
                                  transition
                                  hover:bg-red-600
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                {processing
                                  ? "Processing..."
                                  : "Confirm Reject"}
                              </button>


                              <button
                                type="button"

                                disabled={
                                  processing
                                }

                                onClick={() => {
                                  setRejectingId(
                                    null
                                  );

                                  setRejectionReason(
                                    ""
                                  );
                                }}

                                className="
                                  rounded-lg
                                  border
                                  border-neutral-700
                                  px-3
                                  py-2
                                  text-sm
                                  text-neutral-300
                                  transition
                                  hover:bg-neutral-800
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
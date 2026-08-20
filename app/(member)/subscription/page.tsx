"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";


type SubscriptionRow = {
  charge_id: string;
  membership_id: string;

  class_name: string;
  dojo_name: string | null;

  billing_month: string;

  charge_amount: number;
  paid_amount: number;
  outstanding_amount: number;

  currency: string;

  payment_status: string;
  rate_source: string;
};


type PaymentConfirmation = {
  confirmation_id: string;
  charge_id: string;

  billing_month: string;

  amount: number;
  currency: string;

  payment_method: string;
  transfer_date: string;

  member_note: string | null;

  status:
    | "pending"
    | "approved"
    | "rejected";

  created_at: string;
  reviewed_at: string | null;

  rejection_reason: string | null;
};


type ReceivingAccount = {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  instructions: string | null;
};


type MembershipLookup = {
  id: string;

  classes: {
    name: string;
  } | null;

  dojos: {
    name: string;
  } | null;
};


type ChargeRecord = {
  id: string;
  membership_id: string;

  billing_month: string;

  amount: number;
  currency: string;

  rate_source: string;
  status: string;
};


type PaymentRecord = {
  charge_id: string;
  amount: number;
};


type MessageType =
  | "success"
  | "error"
  | "";


export default function MemberSubscriptionsPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );


  const [
    subscriptions,
    setSubscriptions,
  ] =
    useState<
      SubscriptionRow[]
    >([]);


  const [
    confirmations,
    setConfirmations,
  ] =
    useState<
      PaymentConfirmation[]
    >([]);


  const [
    receivingAccounts,
    setReceivingAccounts,
  ] =
    useState<
      Record<
        string,
        ReceivingAccount | null
      >
    >({});


  const [
    loading,
    setLoading,
  ] =
    useState(true);


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
    expandedChargeId,
    setExpandedChargeId,
  ] =
    useState<
      string | null
    >(null);


  const [
    transferAmount,
    setTransferAmount,
  ] =
    useState("");


  const [
    transferDate,
    setTransferDate,
  ] =
    useState("");


  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState(
      "Bank Transfer"
    );


  const [
    memberNote,
    setMemberNote,
  ] =
    useState("");


  const [
    processingChargeId,
    setProcessingChargeId,
  ] =
    useState<
      string | null
    >(null);


  /*
   * =====================================================
   * MESSAGE HELPERS
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
   * FORMATTERS
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


  function formatCurrency(
    value: number,
    currency: string
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


  function formatMonth(
    value: string
  ) {
    const normalized =
      value.length >= 7
        ? value.slice(
            0,
            7
          )
        : value;


    const date =
      new Date(
        `${normalized}-01T00:00:00`
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }


    return date.toLocaleDateString(
      "en-AU",
      {
        month:
          "long",

        year:
          "numeric",
      }
    );
  }


  function formatDate(
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return "-";
    }


    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
        ? `${value}T00:00:00`
        : value;


    const date =
      new Date(
        normalized
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


  /*
   * =====================================================
   * CONFIRMATION LOOKUP
   * =====================================================
   */

  function latestConfirmation(
    chargeId: string
  ) {
    return confirmations.find(
      (
        confirmation
      ) =>
        confirmation.charge_id ===
        chargeId
    );
  }


  /*
   * =====================================================
   * LOAD SUBSCRIPTIONS
   * =====================================================
   *
   * We deliberately do NOT use the old
   * get_my_subscription_history RPC.
   *
   * The current backend already has RLS on:
   *
   * class_memberships
   * membership_subscription_charges
   * membership_payments
   *
   * so the logged-in Member can only receive
   * authorised records.
   * =====================================================
   */

  const loadSubscriptions =
    useCallback(
      async () => {

        /*
         * Get the current Member.
         */

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
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }


        /*
         * Get this Member's memberships and
         * class/dojo names.
         */

        const {
          data:
            membershipData,

          error:
            membershipError,
        } =
          await supabase
            .from(
              "class_memberships"
            )
            .select(`
              id,

              classes (
                name
              ),

              dojos (
                name
              )
            `)
            .eq(
              "user_id",
              user.id
            );


        if (
          membershipError
        ) {
          throw new Error(
            membershipError.message
          );
        }


        const memberships =
          (
            membershipData ??
            []
          ) as unknown as MembershipLookup[];


        if (
          memberships.length ===
          0
        ) {
          setSubscriptions(
            []
          );

          return;
        }


        const membershipIds =
          memberships.map(
            (
              membership
            ) =>
              membership.id
          );


        /*
         * Get all subscription charges belonging
         * to those memberships.
         */

        const {
          data:
            chargeData,

          error:
            chargeError,
        } =
          await supabase
            .from(
              "membership_subscription_charges"
            )
            .select(`
              id,
              membership_id,
              billing_month,
              amount,
              currency,
              rate_source,
              status
            `)
            .in(
              "membership_id",
              membershipIds
            )
            .order(
              "billing_month",
              {
                ascending:
                  false,
              }
            );


        if (
          chargeError
        ) {
          throw new Error(
            chargeError.message
          );
        }


        const charges =
          (
            chargeData ??
            []
          ) as ChargeRecord[];


        if (
          charges.length ===
          0
        ) {
          setSubscriptions(
            []
          );

          return;
        }


        /*
         * Get confirmed payments for those charges.
         */

        const chargeIds =
          charges.map(
            (
              charge
            ) =>
              charge.id
          );


        const {
          data:
            paymentData,

          error:
            paymentError,
        } =
          await supabase
            .from(
              "membership_payments"
            )
            .select(`
              charge_id,
              amount
            `)
            .in(
              "charge_id",
              chargeIds
            );


        if (
          paymentError
        ) {
          throw new Error(
            paymentError.message
          );
        }


        const payments =
          (
            paymentData ??
            []
          ) as PaymentRecord[];


        /*
         * Map membership information.
         */

        const membershipMap =
          new Map<
            string,
            MembershipLookup
          >();


        for (
          const membership
          of memberships
        ) {
          membershipMap.set(
            membership.id,
            membership
          );
        }


        /*
         * Sum confirmed payments by charge.
         */

        const paidMap =
          new Map<
            string,
            number
          >();


        for (
          const payment
          of payments
        ) {
          const current =
            paidMap.get(
              payment.charge_id
            ) ??
            0;


          paidMap.set(
            payment.charge_id,
            current +
              Number(
                payment.amount ??
                  0
              )
          );
        }


        /*
         * Build the exact shape the UI uses.
         */

        const rows:
          SubscriptionRow[] =
          charges.map(
            (
              charge
            ) => {

              const membership =
                membershipMap.get(
                  charge.membership_id
                );


              const chargeAmount =
                Number(
                  charge.amount ??
                    0
                );


              const paidAmount =
                Number(
                  paidMap.get(
                    charge.id
                  ) ??
                    0
                );


              const outstandingAmount =
                Math.max(
                  0,
                  chargeAmount -
                    paidAmount
                );


              let paymentStatus =
                "unpaid";


              if (
                outstandingAmount <=
                0
              ) {
                paymentStatus =
                  "paid";

              } else if (
                paidAmount >
                0
              ) {
                paymentStatus =
                  "partial";
              }


              return {
                charge_id:
                  charge.id,

                membership_id:
                  charge.membership_id,

                class_name:
                  membership
                    ?.classes
                    ?.name ??
                  "Class",

                dojo_name:
                  membership
                    ?.dojos
                    ?.name ??
                  null,

                billing_month:
                  charge.billing_month,

                charge_amount:
                  chargeAmount,

                paid_amount:
                  paidAmount,

                outstanding_amount:
                  outstandingAmount,

                currency:
                  charge.currency,

                payment_status:
                  paymentStatus,

                rate_source:
                  charge.rate_source,
              };
            }
          );


        setSubscriptions(
          rows
        );
      },

      [
        supabase,
      ]
    );


  /*
   * =====================================================
   * PAYMENT CONFIRMATIONS
   * =====================================================
   */

  const loadConfirmations =
    useCallback(
      async () => {

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_my_payment_confirmations"
          );


        if (
          error
        ) {
          throw new Error(
            error.message
          );
        }


        setConfirmations(
          (
            data ??
            []
          ) as PaymentConfirmation[]
        );
      },

      [
        supabase,
      ]
    );


  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    let active =
      true;


    async function loadPage() {
      try {
        clearMessage();


        await Promise.all([
          loadSubscriptions(),
          loadConfirmations(),
        ]);

      } catch (
        error:
          unknown
      ) {

        console.error(
          "Subscription page load error:",
          error
        );


        if (
          active
        ) {
          showError(
            error instanceof
              Error
              ? error.message
              : "Failed to load subscription information."
          );
        }

      } finally {

        if (
          active
        ) {
          setLoading(
            false
          );
        }
      }
    }


    loadPage();


    return () => {
      active =
        false;
    };

  }, [
    loadConfirmations,
    loadSubscriptions,
  ]);


  /*
   * =====================================================
   * RECEIVING ACCOUNT
   * =====================================================
   */

  async function loadReceivingAccount(
    chargeId: string
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          receivingAccounts,
          chargeId
        )
    ) {
      return receivingAccounts[
        chargeId
      ];
    }


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_my_charge_receiving_account",
        {
          target_charge_id:
            chargeId,
        }
      );


    if (
      error
    ) {
      showError(
        error.message
      );

      return null;
    }


    const rows =
      (
        data ??
        []
      ) as ReceivingAccount[];


    const account =
      rows[0] ??
      null;


    setReceivingAccounts(
      (
        current
      ) => ({
        ...current,

        [chargeId]:
          account,
      })
    );


    return account;
  }


  /*
   * =====================================================
   * PAYMENT FORM
   * =====================================================
   */

  async function openPaymentForm(
    subscription:
      SubscriptionRow
  ) {
    clearMessage();


    const confirmation =
      latestConfirmation(
        subscription.charge_id
      );


    if (
      confirmation?.status ===
      "pending"
    ) {
      showError(
        "This payment is already awaiting Admin confirmation."
      );

      return;
    }


    const account =
      await loadReceivingAccount(
        subscription.charge_id
      );


    if (
      !account
    ) {
      showError(
        "Your dojo has not configured a receiving account yet. Please contact your Dojo Admin."
      );

      return;
    }


    setExpandedChargeId(
      subscription.charge_id
    );


    setTransferAmount(
      String(
        subscription.outstanding_amount
      )
    );


    setTransferDate(
      todayString()
    );


    setPaymentMethod(
      "Bank Transfer"
    );


    setMemberNote(
      ""
    );
  }


  function closePaymentForm() {
    setExpandedChargeId(
      null
    );

    setTransferAmount(
      ""
    );

    setTransferDate(
      ""
    );

    setMemberNote(
      ""
    );
  }


  /*
   * =====================================================
   * SUBMIT PAYMENT CONFIRMATION
   * =====================================================
   */

  async function submitPaidConfirmation(
    subscription:
      SubscriptionRow
  ) {
    const amount =
      Number(
        transferAmount
      );


    if (
      Number.isNaN(
        amount
      ) ||
      amount <=
        0
    ) {
      showError(
        "Enter the amount you transferred."
      );

      return;
    }


    if (
      amount >
      subscription.outstanding_amount
    ) {
      showError(
        "The transferred amount cannot be greater than the outstanding subscription amount."
      );

      return;
    }


    if (
      !transferDate
    ) {
      showError(
        "Select the transfer date."
      );

      return;
    }


    if (
      !paymentMethod.trim()
    ) {
      showError(
        "Enter the payment method."
      );

      return;
    }


    setProcessingChargeId(
      subscription.charge_id
    );


    clearMessage();


    try {

      const {
        error,
      } =
        await supabase.rpc(
          "submit_membership_payment_confirmation",
          {
            target_charge_id:
              subscription.charge_id,

            transferred_amount:
              amount,

            payment_method_value:
              paymentMethod.trim(),

            transfer_date_value:
              transferDate,

            member_note_value:
              memberNote.trim() ||
              null,
          }
        );


      if (
        error
      ) {
        throw new Error(
          error.message
        );
      }


      await Promise.all([
        loadSubscriptions(),
        loadConfirmations(),
      ]);


      closePaymentForm();


      showSuccess(
        "Your payment confirmation was sent to the Dojo Admin for approval."
      );

    } catch (
      error:
        unknown
    ) {

      showError(
        error instanceof
          Error
          ? error.message
          : "Unable to submit payment confirmation."
      );

    } finally {

      setProcessingChargeId(
        null
      );
    }
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
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-neutral-700
              border-t-emerald-400
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-neutral-400
            "
          >
            Loading subscriptions...
          </p>
        </div>
      </div>
    );
  }


  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-6xl
      "
    >

      {/*
       * HEADER
       */}

      <header
        className="
          border-b
          border-neutral-800
          pb-7
        "
      >
        <p
          className="
            text-sm
            font-semibold
            uppercase
            tracking-[0.2em]
            text-emerald-400
          "
        >
          Membership
        </p>


        <h1
          className="
            mt-2
            text-3xl
            font-bold
            tracking-tight
            sm:text-4xl
          "
        >
          My Subscription
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
          View your monthly charges,
          transfer instructions and
          payment confirmation status.
        </p>
      </header>


      {/*
       * MESSAGE
       */}

      {message && (
        <div
          className={[
            `
              mt-6
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
       * EMPTY
       */}

      {subscriptions.length ===
        0 && (
        <section
          className="
            mt-8
            rounded-2xl
            border
            border-neutral-800
            bg-neutral-900
            p-10
            text-center
          "
        >
          <h2
            className="
              text-xl
              font-semibold
            "
          >
            No subscription
            charges yet
          </h2>


          <p
            className="
              mt-2
              text-sm
              text-neutral-400
            "
          >
            Your monthly subscription
            charges will appear here
            when they are generated.
          </p>
        </section>
      )}


      {/*
       * SUBSCRIPTIONS
       */}

      {subscriptions.length >
        0 && (
        <section
          className="
            mt-8
            space-y-5
          "
        >
          {subscriptions.map(
            (
              subscription
            ) => {

              const confirmation =
                latestConfirmation(
                  subscription.charge_id
                );


              const account =
                receivingAccounts[
                  subscription.charge_id
                ];


              const formOpen =
                expandedChargeId ===
                subscription.charge_id;


              const processing =
                processingChargeId ===
                subscription.charge_id;


              const isPaid =
                subscription.outstanding_amount <=
                0;


              const pending =
                confirmation?.status ===
                "pending";


              const rejected =
                confirmation?.status ===
                "rejected";


              return (
                <article
                  key={
                    subscription.charge_id
                  }
                  className="
                    rounded-2xl
                    border
                    border-neutral-800
                    bg-neutral-900
                    p-6
                  "
                >

                  <div
                    className="
                      flex
                      flex-col
                      justify-between
                      gap-5
                      sm:flex-row
                      sm:items-start
                    "
                  >
                    <div>
                      <p
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wider
                          text-emerald-400
                        "
                      >
                        {
                          subscription.class_name
                        }

                        {subscription.dojo_name
                          ? ` · ${subscription.dojo_name}`
                          : ""}
                      </p>


                      <h2
                        className="
                          mt-2
                          text-2xl
                          font-bold
                        "
                      >
                        {formatMonth(
                          subscription.billing_month
                        )}
                      </h2>
                    </div>


                    <PaymentStatusBadge
                      paid={
                        isPaid
                      }

                      pending={
                        pending
                      }

                      rejected={
                        rejected &&
                        !isPaid
                      }

                      partial={
                        !isPaid &&
                        subscription.paid_amount >
                          0
                      }
                    />
                  </div>


                  <div
                    className="
                      mt-5
                      grid
                      gap-4
                      sm:grid-cols-3
                    "
                  >
                    <MoneySummary
                      label="Charged"

                      value={
                        formatCurrency(
                          subscription.charge_amount,
                          subscription.currency
                        )
                      }
                    />


                    <MoneySummary
                      label="Confirmed Paid"

                      value={
                        formatCurrency(
                          subscription.paid_amount,
                          subscription.currency
                        )
                      }
                    />


                    <MoneySummary
                      label="Outstanding"

                      value={
                        formatCurrency(
                          subscription.outstanding_amount,
                          subscription.currency
                        )
                      }
                    />
                  </div>


                  <div
                    className="
                      mt-4
                    "
                  >
                    <span
                      className="
                        rounded-full
                        border
                        border-neutral-700
                        px-3
                        py-1
                        text-xs
                        text-neutral-400
                      "
                    >
                      {subscription.rate_source ===
                      "member_special"
                        ? "Special Rate"
                        : "Regular Rate"}
                    </span>
                  </div>


                  {pending && (
                    <div
                      className="
                        mt-5
                        rounded-xl
                        border
                        border-amber-800
                        bg-amber-950/20
                        p-4
                      "
                    >
                      <p
                        className="
                          font-semibold
                          text-amber-300
                        "
                      >
                        Awaiting Admin
                        Confirmation
                      </p>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-neutral-400
                        "
                      >
                        You submitted a
                        payment confirmation
                        for{" "}
                        {formatDate(
                          confirmation
                            ?.transfer_date ??
                            null
                        )}
                        . Your Dojo Admin
                        must approve it before
                        it becomes a confirmed
                        payment.
                      </p>
                    </div>
                  )}


                  {rejected &&
                    !isPaid && (
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
                          font-semibold
                          text-red-300
                        "
                      >
                        Previous Confirmation
                        Declined
                      </p>


                      <p
                        className="
                          mt-2
                          text-sm
                          text-red-200
                        "
                      >
                        {confirmation
                          ?.rejection_reason ??
                          "The Dojo Admin declined the previous payment confirmation."}
                      </p>


                      <p
                        className="
                          mt-2
                          text-sm
                          text-neutral-400
                        "
                      >
                        You can submit another
                        confirmation after
                        checking your transfer
                        details.
                      </p>
                    </div>
                  )}


                  {!isPaid &&
                    !pending &&
                    !formOpen && (
                    <button
                      type="button"

                      onClick={() =>
                        openPaymentForm(
                          subscription
                        )
                      }

                      className="
                        mt-5
                        rounded-lg
                        bg-emerald-600
                        px-5
                        py-3
                        font-semibold
                        text-white
                        transition
                        hover:bg-emerald-500
                      "
                    >
                      I Have Paid
                    </button>
                  )}


                  {formOpen && (
                    <div
                      className="
                        mt-5
                        rounded-2xl
                        border
                        border-emerald-900
                        bg-emerald-950/10
                        p-5
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wider
                          text-emerald-400
                        "
                      >
                        Transfer Instructions
                      </p>


                      {account ? (
                        <div
                          className="
                            mt-4
                            rounded-xl
                            border
                            border-neutral-800
                            bg-neutral-950/50
                            p-4
                          "
                        >
                          <div
                            className="
                              grid
                              gap-3
                              text-sm
                              sm:grid-cols-2
                            "
                          >
                            <p>
                              <span
                                className="
                                  text-neutral-500
                                "
                              >
                                Bank / Channel:
                              </span>{" "}

                              <span
                                className="
                                  font-semibold
                                "
                              >
                                {
                                  account.bank_name
                                }
                              </span>
                            </p>


                            <p>
                              <span
                                className="
                                  text-neutral-500
                                "
                              >
                                Account Holder:
                              </span>{" "}

                              <span
                                className="
                                  font-semibold
                                "
                              >
                                {
                                  account.account_holder_name
                                }
                              </span>
                            </p>


                            <p
                              className="
                                sm:col-span-2
                              "
                            >
                              <span
                                className="
                                  text-neutral-500
                                "
                              >
                                Account Number:
                              </span>{" "}

                              <span
                                className="
                                  font-mono
                                  text-lg
                                  font-bold
                                  text-emerald-300
                                "
                              >
                                {
                                  account.account_number
                                }
                              </span>
                            </p>
                          </div>


                          {account.instructions && (
                            <p
                              className="
                                mt-4
                                border-t
                                border-neutral-800
                                pt-4
                                text-sm
                                leading-6
                                text-neutral-400
                              "
                            >
                              {
                                account.instructions
                              }
                            </p>
                          )}
                        </div>
                      ) : (
                        <p
                          className="
                            mt-4
                            text-sm
                            text-red-300
                          "
                        >
                          Receiving account
                          unavailable.
                        </p>
                      )}


                      <div
                        className="
                          mt-5
                          grid
                          gap-4
                          sm:grid-cols-2
                        "
                      >
                        <Field
                          label="Amount Transferred"
                        >
                          <input
                            type="number"

                            min="1"

                            max={
                              subscription.outstanding_amount
                            }

                            value={
                              transferAmount
                            }

                            onChange={(
                              event
                            ) =>
                              setTransferAmount(
                                event.target.value
                              )
                            }

                            className="
                              w-full
                              rounded-lg
                              border
                              border-neutral-700
                              bg-neutral-900
                              px-3
                              py-3
                              outline-none
                              focus:border-emerald-600
                            "
                          />
                        </Field>


                        <Field
                          label="Transfer Date"
                        >
                          <input
                            type="date"

                            value={
                              transferDate
                            }

                            onChange={(
                              event
                            ) =>
                              setTransferDate(
                                event.target.value
                              )
                            }

                            className="
                              w-full
                              rounded-lg
                              border
                              border-neutral-700
                              bg-neutral-900
                              px-3
                              py-3
                              outline-none
                              focus:border-emerald-600
                            "
                          />
                        </Field>


                        <Field
                          label="Payment Method"
                        >
                          <select
                            value={
                              paymentMethod
                            }

                            onChange={(
                              event
                            ) =>
                              setPaymentMethod(
                                event.target.value
                              )
                            }

                            className="
                              w-full
                              rounded-lg
                              border
                              border-neutral-700
                              bg-neutral-900
                              px-3
                              py-3
                              outline-none
                              focus:border-emerald-600
                            "
                          >
                            <option
                              value="Bank Transfer"
                            >
                              Bank Transfer
                            </option>

                            <option
                              value="Cash"
                            >
                              Cash
                            </option>

                            <option
                              value="QRIS"
                            >
                              QRIS
                            </option>

                            <option
                              value="Other"
                            >
                              Other
                            </option>
                          </select>
                        </Field>


                        <Field
                          label="Note"
                        >
                          <input
                            value={
                              memberNote
                            }

                            onChange={(
                              event
                            ) =>
                              setMemberNote(
                                event.target.value
                              )
                            }

                            placeholder="Optional"

                            className="
                              w-full
                              rounded-lg
                              border
                              border-neutral-700
                              bg-neutral-900
                              px-3
                              py-3
                              outline-none
                              focus:border-emerald-600
                            "
                          />
                        </Field>
                      </div>


                      <p
                        className="
                          mt-4
                          text-xs
                          leading-5
                          text-neutral-500
                        "
                      >
                        Submitting this form
                        does not automatically
                        mark the subscription
                        as paid. Your Dojo Admin
                        must verify and approve
                        the payment.
                      </p>


                      <div
                        className="
                          mt-5
                          flex
                          flex-wrap
                          gap-3
                        "
                      >
                        <button
                          type="button"

                          disabled={
                            processing ||
                            !account
                          }

                          onClick={() =>
                            submitPaidConfirmation(
                              subscription
                            )
                          }

                          className="
                            rounded-lg
                            bg-emerald-600
                            px-5
                            py-3
                            font-semibold
                            text-white
                            transition
                            hover:bg-emerald-500
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          {processing
                            ? "Submitting..."
                            : "Submit Payment Confirmation"}
                        </button>


                        <button
                          type="button"

                          disabled={
                            processing
                          }

                          onClick={
                            closePaymentForm
                          }

                          className="
                            rounded-lg
                            border
                            border-neutral-700
                            px-5
                            py-3
                            text-neutral-300
                            transition
                            hover:bg-neutral-800
                            disabled:opacity-50
                          "
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </section>
      )}


      {/*
       * PAYMENT CONFIRMATION HISTORY
       */}

      {confirmations.length >
        0 && (
        <section
          className="
            mt-10
          "
        >
          <h2
            className="
              text-2xl
              font-bold
            "
          >
            Payment Confirmation
            History
          </h2>


          <p
            className="
              mt-2
              text-sm
              text-neutral-500
            "
          >
            This history shows the
            payment confirmations you
            submitted to your Dojo Admin.
          </p>


          <div
            className="
              mt-4
              space-y-3
            "
          >
            {confirmations.map(
              (
                confirmation
              ) => (
                <div
                  key={
                    confirmation.confirmation_id
                  }

                  className="
                    rounded-xl
                    border
                    border-neutral-800
                    bg-neutral-900
                    p-5
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      justify-between
                      gap-3
                      sm:flex-row
                      sm:items-center
                    "
                  >
                    <div>
                      <p
                        className="
                          font-semibold
                        "
                      >
                        {formatMonth(
                          confirmation.billing_month
                        )}
                      </p>


                      <p
                        className="
                          mt-1
                          text-sm
                          text-neutral-400
                        "
                      >
                        {formatCurrency(
                          Number(
                            confirmation.amount
                          ),
                          confirmation.currency
                        )}

                        {" · "}

                        {
                          confirmation.payment_method
                        }

                        {" · "}

                        {formatDate(
                          confirmation.transfer_date
                        )}
                      </p>
                    </div>


                    <ConfirmationBadge
                      status={
                        confirmation.status
                      }
                    />
                  </div>


                  {confirmation.status ===
                    "rejected" &&
                    confirmation.rejection_reason && (
                    <p
                      className="
                        mt-3
                        rounded-lg
                        border
                        border-red-900
                        bg-red-950/20
                        p-3
                        text-sm
                        text-red-200
                      "
                    >
                      {
                        confirmation.rejection_reason
                      }
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}


/*
 * ============================================================
 * UI COMPONENTS
 * ============================================================
 */

function Field({
  label,
  children,
}: {
  label: string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        className="
          mb-2
          block
          text-sm
          font-medium
          text-neutral-300
        "
      >
        {label}
      </label>

      {children}
    </div>
  );
}


function MoneySummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-neutral-800
        bg-neutral-950/40
        p-4
      "
    >
      <p
        className="
          text-xs
          uppercase
          tracking-wider
          text-neutral-500
        "
      >
        {label}
      </p>


      <p
        className="
          mt-2
          text-xl
          font-bold
        "
      >
        {value}
      </p>
    </div>
  );
}


function PaymentStatusBadge({
  paid,
  pending,
  rejected,
  partial,
}: {
  paid: boolean;
  pending: boolean;
  rejected: boolean;
  partial: boolean;
}) {
  if (
    paid
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-green-800
          bg-green-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-green-300
        "
      >
        PAID
      </span>
    );
  }


  if (
    pending
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-amber-800
          bg-amber-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-amber-300
        "
      >
        AWAITING CONFIRMATION
      </span>
    );
  }


  if (
    rejected
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-red-900
          bg-red-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-red-300
        "
      >
        DECLINED
      </span>
    );
  }


  if (
    partial
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-orange-800
          bg-orange-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-orange-300
        "
      >
        PARTIAL
      </span>
    );
  }


  return (
    <span
      className="
        rounded-full
        border
        border-red-900
        bg-red-950/30
        px-3
        py-1
        text-xs
        font-bold
        text-red-300
      "
    >
      UNPAID
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
  if (
    status ===
    "approved"
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-green-800
          bg-green-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-green-300
        "
      >
        APPROVED
      </span>
    );
  }


  if (
    status ===
    "rejected"
  ) {
    return (
      <span
        className="
          rounded-full
          border
          border-red-900
          bg-red-950/30
          px-3
          py-1
          text-xs
          font-bold
          text-red-300
        "
      >
        DECLINED
      </span>
    );
  }


  return (
    <span
      className="
        rounded-full
        border
        border-amber-800
        bg-amber-950/30
        px-3
        py-1
        text-xs
        font-bold
        text-amber-300
      "
    >
      PENDING
    </span>
  );
}
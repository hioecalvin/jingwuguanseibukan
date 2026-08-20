"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";


function urlBase64ToUint8Array(
  base64String: string
) {
  const padding =
    "=".repeat(
      (
        4 -
        (
          base64String.length %
          4
        )
      ) %
        4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const rawData =
    window.atob(
      base64
    );

  return Uint8Array.from(
    [...rawData].map(
      (
        character
      ) =>
        character.charCodeAt(
          0
        )
    )
  );
}


export default function PushNotificationButton() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );


  const [
    supported,
    setSupported,
  ] =
    useState(false);


  const [
    enabled,
    setEnabled,
  ] =
    useState(false);


  const [
    processing,
    setProcessing,
  ] =
    useState(false);


  const [
    message,
    setMessage,
  ] =
    useState("");


  /*
   * =====================================================
   * CHECK BROWSER SUPPORT + EXISTING SUBSCRIPTION
   * =====================================================
   */

  useEffect(() => {
    const isSupported =
      typeof window !==
        "undefined" &&
      "serviceWorker" in
        navigator &&
      "PushManager" in
        window &&
      "Notification" in
        window;


    setSupported(
      isSupported
    );


    if (
      !isSupported
    ) {
      return;
    }


    async function checkExisting() {
      try {
        const registration =
          await navigator
            .serviceWorker
            .register(
              "/sw.js"
            );


        await navigator
          .serviceWorker
          .ready;


        const subscription =
          await registration
            .pushManager
            .getSubscription();


        setEnabled(
          Boolean(
            subscription
          )
        );
      } catch (
        error
      ) {
        console.error(
          "Push registration check failed:",
          error
        );


        setMessage(
          "Unable to check push notification status."
        );
      }
    }


    checkExisting();
  }, []);


  /*
   * =====================================================
   * ENABLE PUSH NOTIFICATIONS
   * =====================================================
   */

  async function enablePush() {
    if (
      !supported ||
      processing
    ) {
      return;
    }


    const publicKey =
      process.env
        .NEXT_PUBLIC_VAPID_PUBLIC_KEY;


    if (
      !publicKey
    ) {
      setMessage(
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured."
      );

      return;
    }


    setProcessing(
      true
    );

    setMessage("");


    try {
      /*
       * Confirm logged-in user
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
          "You must be logged in to enable push notifications."
        );
      }


      /*
       * Request browser permission
       */

      const permission =
        await Notification
          .requestPermission();


      if (
        permission !==
        "granted"
      ) {
        throw new Error(
          "Notification permission was not granted."
        );
      }


      /*
       * Register service worker
       */

      const registration =
        await navigator
          .serviceWorker
          .register(
            "/sw.js"
          );


      await navigator
        .serviceWorker
        .ready;


      /*
       * Check existing subscription
       */

      let subscription =
        await registration
          .pushManager
          .getSubscription();


      /*
       * Create subscription if none exists
       */

      if (
        !subscription
      ) {
        subscription =
          await registration
            .pushManager
            .subscribe({
              userVisibleOnly:
                true,

              applicationServerKey:
                urlBase64ToUint8Array(
                  publicKey
                ),
            });
      }


      /*
       * Convert browser subscription to JSON
       */

      const json =
        subscription
          .toJSON();


      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        throw new Error(
          "The browser returned an incomplete push subscription."
        );
      }


      /*
       * Save subscription to Supabase
       */

      const {
        error,
      } =
        await supabase.rpc(
          "save_my_push_subscription",
          {
            subscription_endpoint:
              json.endpoint,

            subscription_p256dh:
              json.keys.p256dh,

            subscription_auth:
              json.keys.auth,

            subscription_user_agent:
              navigator.userAgent,
          }
        );


      if (
        error
      ) {
        throw error;
      }


      setEnabled(
        true
      );


      setMessage(
        "Push notifications enabled on this device."
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Enable push failed:",
        error
      );


      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to enable push notifications."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }


  /*
   * =====================================================
   * RESET PUSH SUBSCRIPTION
   *
   * Use this after changing VAPID keys.
   * =====================================================
   */

  async function resetPush() {
    if (
      !supported ||
      processing
    ) {
      return;
    }


    const publicKey =
      process.env
        .NEXT_PUBLIC_VAPID_PUBLIC_KEY;


    if (
      !publicKey
    ) {
      setMessage(
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured."
      );

      return;
    }


    setProcessing(
      true
    );

    setMessage("");


    try {
      /*
       * Confirm logged-in user
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
          "You must be logged in to reset push notifications."
        );
      }


      /*
       * Register / retrieve service worker
       */

      const registration =
        await navigator
          .serviceWorker
          .register(
            "/sw.js"
          );


      await navigator
        .serviceWorker
        .ready;


      /*
       * Find old browser subscription
       */

      const oldSubscription =
        await registration
          .pushManager
          .getSubscription();


      /*
       * Tell Supabase to disable old endpoint
       */

      if (
        oldSubscription
      ) {
        try {
          await supabase.rpc(
            "disable_my_push_subscription",
            {
              subscription_endpoint:
                oldSubscription.endpoint,
            }
          );
        } catch (
          disableError
        ) {
          console.warn(
            "Could not disable old push subscription in database:",
            disableError
          );
        }


        /*
         * Remove old browser subscription
         */

        await oldSubscription
          .unsubscribe();
      }


      setEnabled(
        false
      );


      /*
       * Browser notification permission
       */

      let permission =
        Notification
          .permission;


      if (
        permission ===
        "default"
      ) {
        permission =
          await Notification
            .requestPermission();
      }


      if (
        permission !==
        "granted"
      ) {
        throw new Error(
          "Notification permission is not granted."
        );
      }


      /*
       * Create NEW subscription
       * using NEW VAPID public key
       */

      const newSubscription =
        await registration
          .pushManager
          .subscribe({
            userVisibleOnly:
              true,

            applicationServerKey:
              urlBase64ToUint8Array(
                publicKey
              ),
          });


      const json =
        newSubscription
          .toJSON();


      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        throw new Error(
          "The browser returned an incomplete push subscription."
        );
      }


      /*
       * Save NEW subscription
       * to Supabase
       */

      const {
        error:
          saveError,
      } =
        await supabase.rpc(
          "save_my_push_subscription",
          {
            subscription_endpoint:
              json.endpoint,

            subscription_p256dh:
              json.keys.p256dh,

            subscription_auth:
              json.keys.auth,

            subscription_user_agent:
              navigator.userAgent,
          }
        );


      if (
        saveError
      ) {
        throw saveError;
      }


      setEnabled(
        true
      );


      setMessage(
        "Push notifications were reset successfully with the new VAPID key."
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Reset push failed:",
        error
      );


      setEnabled(
        false
      );


      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to reset push notifications."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }


  /*
   * =====================================================
   * UNSUPPORTED BROWSER
   * =====================================================
   */

  if (
    !supported
  ) {
    return (
      <p className="text-sm text-neutral-500">
        Push notifications are not supported by this browser.
      </p>
    );
  }


  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div>

      <div className="flex flex-wrap gap-3">

        {!enabled && (

          <button
            type="button"
            disabled={
              processing
            }
            onClick={
              enablePush
            }
            className="rounded-lg border border-sky-800 bg-sky-950/20 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-950/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? "Enabling..."
              : "Enable Push Notifications"}
          </button>

        )}


        {enabled && (

          <>

            <div className="rounded-lg border border-green-800 bg-green-950/20 px-4 py-2 text-sm font-semibold text-green-300">
              Push Notifications Enabled
            </div>


            <button
              type="button"
              disabled={
                processing
              }
              onClick={
                resetPush
              }
              className="rounded-lg border border-amber-800 bg-amber-950/20 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? "Resetting..."
                : "Reset Push Notifications"}
            </button>

          </>

        )}

      </div>


      {message && (

        <p className="mt-2 text-xs text-neutral-400">
          {message}
        </p>

      )}

    </div>
  );
}
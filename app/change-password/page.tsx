"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";


export default function ChangePasswordPage() {
  const router =
    useRouter();


  const supabase =
    useMemo(() => createClient(), []);


  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  const [
    success,
    setSuccess,
  ] =
    useState(false);


  /*
   * =====================================================
   * VERIFY SESSION
   * =====================================================
   */

  useEffect(
    () => {
      let mounted =
        true;


      async function checkSession() {
        const {
          data: {
            user,
          },
        } =
          await supabase
            .auth
            .getUser();


        if (
          !mounted
        ) {
          return;
        }


        if (
          !user
        ) {
          router.replace(
            "/login"
          );

          return;
        }


        /*
         * Check whether this Member actually
         * needs a forced password change.
         */

        const {
          data:
            profile,

          error:
            profileError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              "must_change_password"
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle();


        if (
          !mounted
        ) {
          return;
        }


        if (
          profileError
        ) {
          console.error(
            "Unable to check password-change state:",
            profileError
          );


          setError(
            "Unable to verify your account."
          );

          setCheckingSession(
            false
          );

          return;
        }


        /*
         * Password already changed.
         */

        if (
          !profile
            ?.must_change_password
        ) {
          router.replace(
            "/"
          );

          return;
        }


        setCheckingSession(
          false
        );
      }


      void checkSession().catch(() => {
        if (mounted) {
          setError("Unable to verify your account. Please reload and try again.");
          setCheckingSession(false);
        }
      });


      return () => {
        mounted =
          false;
      };
    },
    [
      router,
      supabase,
    ]
  );


  /*
   * =====================================================
   * SUBMIT
   * =====================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    if (
      loading
    ) {
      return;
    }


    setError(
      null
    );


    /*
     * Client-side validation.
     *
     * The server repeats these checks.
     */

    if (
      newPassword.length <
      10
    ) {
      setError(
        "Password must contain at least 10 characters."
      );

      return;
    }


    if (
      !/[A-Z]/.test(
        newPassword
      )
    ) {
      setError(
        "Password must contain at least one uppercase letter."
      );

      return;
    }


    if (
      !/[a-z]/.test(
        newPassword
      )
    ) {
      setError(
        "Password must contain at least one lowercase letter."
      );

      return;
    }


    if (
      !/[0-9]/.test(
        newPassword
      )
    ) {
      setError(
        "Password must contain at least one number."
      );

      return;
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }


    setLoading(
      true
    );


    try {

      /*
       * Obtain the current authenticated session.
       */

      const {
        data: {
          session,
        },

        error:
          sessionError,
      } =
        await supabase
          .auth
          .getSession();


      if (
        sessionError ||
        !session
      ) {
        router.replace(
          "/login"
        );

        return;
      }


      /*
       * Server-controlled password change.
       */

      const response =
        await fetch(
          "/api/account/change-password",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                newPassword,
              }),
          }
        );


      const result:
        {
          success?: boolean;
          error?: string;
          message?: string;
        } =
          await response.json();


      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "Unable to change password."
        );
      }


      /*
       * =================================================
       * SUCCESS
       * =================================================
       */

      setSuccess(
        true
      );


      setNewPassword(
        ""
      );


      setConfirmPassword(
        ""
      );


      /*
       * Refresh Server Components so the
       * Member layout reads the updated
       * must_change_password value.
       */

      router.refresh();


      setTimeout(
        () => {
          router.replace(
            "/"
          );
        },
        1200
      );

    } catch (
      submitError: unknown
    ) {
      console.error(
        "Password change error:",
        submitError
      );


      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to change password."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  /*
   * =====================================================
   * SESSION CHECK
   * =====================================================
   */

  if (
    checkingSession
  ) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-neutral-950
          px-4
          text-white
        "
      >
        <p
          role="status"
          className="
            text-sm
            text-neutral-400
          "
        >
          Checking account...
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
    <main
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-neutral-950
        px-4
        py-10
        text-white
      "
    >
      <div
        className="
          w-full
          max-w-md
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900
          p-6
          shadow-xl
        "
      >
        <div
          className="
            mb-6
            text-center
          "
        >
          <h1
            className="
              text-2xl
              font-semibold
            "
          >
            Change Password
          </h1>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-neutral-400
            "
          >
            You are using a temporary
            password. Create a new
            password before continuing
            to Jingwuguan Seibukan.
          </p>
        </div>


        {success ? (
          <div
            role="status"
            className="
              rounded-xl
              border
              border-emerald-800
              bg-emerald-950/40
              p-4
              text-sm
              text-emerald-300
            "
          >
            Password changed successfully.
            Redirecting to the app...
          </div>
        ) : (
          <form
            aria-busy={loading}
            onSubmit={
              handleSubmit
            }
            className="
              space-y-5
            "
          >
            <div>
              <label
                htmlFor="new-password"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                "
              >
                New Password
              </label>

              <input
                id="new-password"
                required
                minLength={10}
                aria-describedby="change-password-help"
                type="password"
                autoComplete="new-password"
                value={
                  newPassword
                }
                onChange={
                  (
                    event
                  ) =>
                    setNewPassword(
                      event
                        .target
                        .value
                    )
                }
                disabled={
                  loading
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-neutral-700
                  bg-neutral-950
                  px-4
                  py-3
                  outline-none
                  transition
                  focus:border-neutral-500
                  disabled:opacity-60
                "
              />
            </div>


            <div>
              <label
                htmlFor="confirm-password"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                "
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                required
                minLength={10}
                type="password"
                autoComplete="new-password"
                value={
                  confirmPassword
                }
                onChange={
                  (
                    event
                  ) =>
                    setConfirmPassword(
                      event
                        .target
                        .value
                    )
                }
                disabled={
                  loading
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-neutral-700
                  bg-neutral-950
                  px-4
                  py-3
                  outline-none
                  transition
                  focus:border-neutral-500
                  disabled:opacity-60
                "
              />
            </div>


            <div
              id="change-password-help"
              className="
                rounded-xl
                bg-neutral-950
                p-4
                text-xs
                leading-6
                text-neutral-400
              "
            >
              <p>
                Your password must contain:
              </p>

              <ul
                className="
                  mt-1
                  list-disc
                  pl-5
                "
              >
                <li>
                  At least 10 characters
                </li>

                <li>
                  One uppercase letter
                </li>

                <li>
                  One lowercase letter
                </li>

                <li>
                  One number
                </li>
              </ul>
            </div>


            {error && (
              <div
                role="alert"
                className="
                  rounded-xl
                  border
                  border-red-900
                  bg-red-950/40
                  p-3
                  text-sm
                  text-red-300
                "
              >
                {error}
              </div>
            )}


            <button
              type="submit"
              disabled={
                loading
              }
              className="
                w-full
                rounded-xl
                bg-white
                px-4
                py-3
                font-semibold
                text-black
                transition
                hover:bg-neutral-200
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

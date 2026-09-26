import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  configuredRateLimit,
  consumeDurableRateLimit,
  durableRateLimitHeaders,
} from "@/lib/security/durable-rate-limit";


export const runtime =
  "nodejs";


const MIN_PASSWORD_LENGTH =
  10;


/*
 * =========================================================
 * PASSWORD VALIDATION
 * =========================================================
 */

function validatePassword(
  password: string
) {
  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
  }


  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return "Password must contain at least one uppercase letter.";
  }


  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return "Password must contain at least one lowercase letter.";
  }


  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return "Password must contain at least one number.";
  }


  return null;
}


/*
 * =========================================================
 * AUTHENTICATED CLIENT
 * =========================================================
 */

function createAuthenticatedClient(
  accessToken: string
) {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;


  const publicKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;


  if (
    !supabaseUrl ||
    !publicKey
  ) {
    throw new Error(
      "Supabase public environment configuration is missing."
    );
  }


  return createClient(
    supabaseUrl,
    publicKey,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },

      auth: {
        autoRefreshToken:
          false,

        persistSession:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );
}


/*
 * =========================================================
 * CHANGE PASSWORD
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  try {

    /*
     * =====================================================
     * AUTH TOKEN
     * =====================================================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );


    if (
      !authorization
        ?.startsWith(
          "Bearer "
        )
    ) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }


    const accessToken =
      authorization
        .slice(
          "Bearer ".length
        )
        .trim();


    if (
      !accessToken
    ) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body: {
      newPassword?: unknown;
    };


    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object.");
      }
      body = parsed as { newPassword?: unknown };
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }


    const newPassword =
      typeof body.newPassword ===
      "string"
        ? body.newPassword
        : "";


    const passwordError =
      validatePassword(
        newPassword
      );


    if (
      passwordError
    ) {
      return NextResponse.json(
        {
          error:
            passwordError,
        },
        {
          status: 400,
        }
      );
    }


    /*
     * =====================================================
     * VALIDATE CURRENT USER
     * =====================================================
     */

    const authenticatedClient =
      createAuthenticatedClient(
        accessToken
      );


    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await authenticatedClient
        .auth
        .getUser(
          accessToken
        );


    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    try {
      const rateLimit =
        await consumeDurableRateLimit({
          bucket:
            "change-password",
          subject:
            user.id,
          limit:
            configuredRateLimit(
              "CHANGE_PASSWORD_RATE_LIMIT",
              5,
              1_000,
            ),
          windowSeconds:
            configuredRateLimit(
              "CHANGE_PASSWORD_RATE_WINDOW_SECONDS",
              900,
              86_400,
            ),
        });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error:
              "Too many password-change requests. Please try again later.",
          },
          {
            status: 429,
            headers:
              durableRateLimitHeaders(
                rateLimit,
              ),
          },
        );
      }
    } catch (error) {
      console.error(
        "Password change rate-limit error:",
        error,
      );
      return NextResponse.json(
        {
          error:
            "Password changes are temporarily unavailable.",
        },
        {
          status: 503,
        },
      );
    }


    /*
     * =====================================================
     * CHECK PROFILE STATE
     * =====================================================
     */

    const admin =
      createAdminClient();


    const {
      data:
        profile,

      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          must_change_password,
          account_status
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();


    if (
      profileError
    ) {
      console.error(
        "Password change profile error:",
        profileError
      );


      return NextResponse.json(
        {
          error:
            "Unable to verify account.",
        },
        {
          status: 500,
        }
      );
    }


    if (
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Profile not found.",
        },
        {
          status: 404,
        }
      );
    }


    if (
      profile.account_status ===
      "disabled"
    ) {
      return NextResponse.json(
        {
          error:
            "This account is disabled.",
        },
        {
          status: 403,
        }
      );
    }


    /*
     * =====================================================
     * UPDATE SUPABASE AUTH PASSWORD
     * =====================================================
     *
     * We use the authenticated Member's session rather
     * than letting the browser perform the operation.
     */

    const {
      error:
        updatePasswordError,
    } =
      await authenticatedClient
        .auth
        .updateUser({
          password:
            newPassword,
        });


    if (
      updatePasswordError
    ) {
      console.error(
        "Supabase Auth password change error:",
        updatePasswordError
      );


      return NextResponse.json(
        {
          error:
            updatePasswordError.message ||
            "Unable to change password.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * =====================================================
     * MARK PASSWORD CHANGE COMPLETE
     * =====================================================
     */

    const {
      error:
        markChangedError,
    } =
      await admin.rpc(
        "mark_password_changed",
        {
          target_user_id:
            user.id,
        }
      );


    if (
      markChangedError
    ) {
      console.error(
        "Mark password changed error:",
        markChangedError
      );


      /*
       * The Auth password has already changed.
       *
       * Do not attempt to restore the previous password.
       * The Member can retry the operation and complete
       * their account state.
       */

      return NextResponse.json(
        {
          error:
            "Your password was changed, but your account state could not be finalised. Please submit the new password again.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Password changed successfully.",

      mustChangePassword:
        false,
    });

  } catch (
    error: unknown
  ) {
    console.error(
      "Change password route error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Unable to complete the password change. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}

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


type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};


const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];


function temporaryPasswordFromDob(
  dateOfBirth: string
) {
  /*
   * Expected database format:
   *
   * YYYY-MM-DD
   */

  const match =
    dateOfBirth.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (!match) {
    throw new Error(
      "Member date of birth is invalid"
    );
  }


  const year =
    match[1];

  const monthNumber =
    Number(
      match[2]
    );

  const day =
    match[3];


  if (
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error(
      "Member date of birth is invalid"
    );
  }


  const month =
    MONTHS[
      monthNumber - 1
    ];


  /*
   * Example:
   *
   * DOB:
   * 1996-11-05
   *
   * Temporary password:
   * 05Nov1996
   */

  return `${day}${month}${year}`;
}


function createAuthenticatedClient(
  accessToken: string
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;


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
      "Supabase public environment variables are missing"
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


export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {

    /*
     * ===================================================
     * REQUEST ID
     * ===================================================
     */

    const {
      requestId,
    } =
      await context.params;


    if (
      !requestId
    ) {
      return NextResponse.json(
        {
          error:
            "Password reset request ID is required.",
        },
        {
          status: 400,
        }
      );
    }


    /*
     * ===================================================
     * AUTHENTICATED ADMIN
     * ===================================================
     *
     * Browser will later send:
     *
     * Authorization: Bearer <access token>
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


    const authenticatedClient =
      createAuthenticatedClient(
        accessToken
      );


    /*
     * getUser() validates the JWT against
     * Supabase Auth.
     */

    const {
      data: {
        user:
          authenticatedUser,
      },

      error:
        authenticatedUserError,
    } =
      await authenticatedClient
        .auth
        .getUser(
          accessToken
        );


    if (
      authenticatedUserError ||
      !authenticatedUser
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


    /*
     * ===================================================
     * SERVER ADMIN CLIENT
     * ===================================================
     */

    const admin =
      createAdminClient();


    /*
     * ===================================================
     * CALLER PROFILE
     * ===================================================
     */

    const {
      data:
        callerProfile,

      error:
        callerProfileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          full_name,
          is_super_admin
        `)
        .eq(
          "id",
          authenticatedUser.id
        )
        .maybeSingle();


    if (
      callerProfileError
    ) {
      console.error(
        callerProfileError
      );


      return NextResponse.json(
        {
          error:
            "Unable to verify administrator.",
        },
        {
          status: 500,
        }
      );
    }


    if (
      !callerProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Administrator profile not found.",
        },
        {
          status: 403,
        }
      );
    }


    /*
     * ===================================================
     * RESET REQUEST
     * ===================================================
     */

    const {
      data:
        resetRequest,

      error:
        resetRequestError,
    } =
      await admin
        .from(
          "password_reset_requests"
        )
        .select(`
          id,
          user_id,
          status,
          reviewed_by,
          reviewed_at,
          password_reset_at
        `)
        .eq(
          "id",
          requestId
        )
        .maybeSingle();


    if (
      resetRequestError
    ) {
      console.error(
        resetRequestError
      );


      return NextResponse.json(
        {
          error:
            "Unable to load password reset request.",
        },
        {
          status: 500,
        }
      );
    }


    if (
      !resetRequest
    ) {
      return NextResponse.json(
        {
          error:
            "Password reset request not found.",
        },
        {
          status: 404,
        }
      );
    }


    /*
     * ===================================================
     * MUST ALREADY BE APPROVED
     * ===================================================
     */

    if (
      resetRequest.status !==
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Password reset request has not been approved.",
        },
        {
          status: 409,
        }
      );
    }


    /*
     * Already applied.
     *
     * Treat as successful/idempotent rather
     * than resetting the password repeatedly.
     */

    if (
      resetRequest.password_reset_at
    ) {
      return NextResponse.json(
        {
          success: true,

          alreadyApplied:
            true,

          message:
            "Temporary password has already been applied.",
        }
      );
    }


    /*
     * ===================================================
     * AUTHORIZATION
     * ===================================================
     *
     * Super Admin:
     * may apply any approved reset.
     *
     * Normal Admin:
     * must be the Admin who approved
     * this reset request.
     *
     * review_password_reset_request()
     * already checked their class scope
     * when approval occurred.
     */

    const authorised =
      callerProfile.is_super_admin ===
        true ||

      resetRequest.reviewed_by ===
        authenticatedUser.id;


    if (
      !authorised
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorised to apply this password reset.",
        },
        {
          status: 403,
        }
      );
    }


    /*
     * ===================================================
     * TARGET MEMBER
     * ===================================================
     */

    const {
      data:
        memberProfile,

      error:
        memberProfileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .select(`
          id,
          full_name,
          date_of_birth
        `)
        .eq(
          "id",
          resetRequest.user_id
        )
        .maybeSingle();


    if (
      memberProfileError
    ) {
      console.error(
        memberProfileError
      );


      return NextResponse.json(
        {
          error:
            "Unable to load Member profile.",
        },
        {
          status: 500,
        }
      );
    }


    if (
      !memberProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Member profile not found.",
        },
        {
          status: 404,
        }
      );
    }


    if (
      !memberProfile.date_of_birth
    ) {
      return NextResponse.json(
        {
          error:
            "Member does not have a date of birth recorded.",
        },
        {
          status: 409,
        }
      );
    }


    /*
     * ===================================================
     * TEMPORARY PASSWORD
     * ===================================================
     */

    const temporaryPassword =
      temporaryPasswordFromDob(
        memberProfile.date_of_birth
      );


    /*
     * ===================================================
     * RESET SUPABASE AUTH PASSWORD
     * ===================================================
     *
     * THIS MUST NEVER BE MOVED TO CLIENT CODE.
     */

    const {
      error:
        passwordError,
    } =
      await admin
        .auth
        .admin
        .updateUserById(
          resetRequest.user_id,
          {
            password:
              temporaryPassword,
          }
        );


    if (
      passwordError
    ) {
      console.error(
        passwordError
      );


      return NextResponse.json(
        {
          error:
            "Unable to reset Member password.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * ===================================================
     * MARK TEMPORARY PASSWORD ACTIVE
     * ===================================================
     *
     * This:
     *
     * password_reset_at = now()
     * must_change_password = true
     */

    const {
      error:
        markError,
    } =
      await admin.rpc(
        "mark_password_reset_applied",
        {
          target_request_id:
            requestId,
        }
      );


    if (
      markError
    ) {
      /*
       * Password has already been changed in
       * Supabase Auth at this point.
       *
       * Do not generate a different password.
       * Retrying this endpoint will apply the
       * same DDMmmYYYY password again and allow
       * the database state to recover.
       */

      console.error(
        markError
      );


      return NextResponse.json(
        {
          error:
            "Password was reset, but the recovery state could not be recorded. Retry this operation.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * ===================================================
     * SUCCESS
     * ===================================================
     *
     * We deliberately DO NOT send the actual
     * temporary password back to the browser.
     *
     * The known rule is:
     *
     * DDMmmYYYY
     */

    return NextResponse.json({
      success: true,

      alreadyApplied:
        false,

      memberId:
        memberProfile.id,

      memberName:
        memberProfile.full_name,

      temporaryPasswordFormat:
        "DDMmmYYYY",

      mustChangePassword:
        true,

      message:
        "Temporary password applied successfully. The Member must change it after logging in.",
    });

  } catch (
    error: unknown
  ) {
    console.error(
      "Password reset apply error:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected password reset error.",
      },
      {
        status: 500,
      }
    );
  }
}
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  randomInt,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  createAdminClient,
} from "@/lib/supabase/admin";


export const runtime =
  "nodejs";


type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};


/*
 * =========================================================
 * SECURE TEMPORARY PASSWORD
 * =========================================================
 *
 * - Random
 * - Not based on DOB
 * - Contains upper/lower/digit/symbol
 * - Avoids some ambiguous characters
 */

const UPPERCASE =
  "ABCDEFGHJKLMNPQRSTUVWXYZ";

const LOWERCASE =
  "abcdefghijkmnopqrstuvwxyz";

const DIGITS =
  "23456789";

const SYMBOLS =
  "!@#$%*-_";

const ALL_CHARACTERS =
  UPPERCASE +
  LOWERCASE +
  DIGITS +
  SYMBOLS;


function randomCharacter(
  source: string
) {
  return source[
    randomInt(
      0,
      source.length
    )
  ];
}


function shuffleCharacters(
  characters: string[]
) {
  for (
    let index =
      characters.length - 1;

    index > 0;

    index--
  ) {
    const randomIndex =
      randomInt(
        0,
        index + 1
      );


    [
      characters[index],
      characters[randomIndex],
    ] = [
      characters[randomIndex],
      characters[index],
    ];
  }


  return characters;
}


function createTemporaryPassword() {
  const characters = [
    randomCharacter(
      UPPERCASE
    ),

    randomCharacter(
      LOWERCASE
    ),

    randomCharacter(
      DIGITS
    ),

    randomCharacter(
      SYMBOLS
    ),
  ];


  while (
    characters.length < 16
  ) {
    characters.push(
      randomCharacter(
        ALL_CHARACTERS
      )
    );
  }


  return shuffleCharacters(
    characters
  ).join("");
}


/*
 * =========================================================
 * AUTHENTICATED SUPABASE CLIENT
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


/*
 * =========================================================
 * ROUTE
 * =========================================================
 */

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {

    /*
     * =====================================================
     * REQUEST ID
     * =====================================================
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
     * =====================================================
     * ADMIN AUTHENTICATION
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


    const authenticatedClient =
      createAuthenticatedClient(
        accessToken
      );


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
     * =====================================================
     * SERVICE-ROLE CLIENT
     * =====================================================
     */

    const admin =
      createAdminClient();


    /*
     * =====================================================
     * CALLER PROFILE
     * =====================================================
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
        "Caller profile error:",
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
     * =====================================================
     * CURRENT ADMIN SCOPE
     * =====================================================
     *
     * A historical reviewed_by value is not an enduring permission. An
     * Admin who has since been deactivated or moved out of scope must not be
     * able to apply a privileged Auth password change.
     */

    let callerAssignments: Array<{
      class_id: string | null;
      dojo_id: string | null;
    }> = [];


    if (
      callerProfile
        .is_super_admin !==
      true
    ) {
      const {
        data:
          assignmentRows,

        error:
          assignmentError,
      } =
        await admin
          .from(
            "dojo_admin_assignments"
          )
          .select(`
            class_id,
            dojo_id
          `)
          .eq(
            "user_id",
            authenticatedUser.id
          )
          .eq(
            "active",
            true
          );


      if (
        assignmentError
      ) {
        console.error(
          "Admin assignment verification error:",
          assignmentError
        );


        return NextResponse.json(
          {
            error:
              "Unable to verify administrator scope.",
          },
          {
            status: 500,
          }
        );
      }


      callerAssignments =
        assignmentRows ??
        [];


      if (
        callerAssignments.length ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "You are not authorised to apply password resets.",
          },
          {
            status: 403,
          }
        );
      }
    }


    /*
     * =====================================================
     * RESET REQUEST
     * =====================================================
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
        "Reset request error:",
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
     * =====================================================
     * TARGET-SCOPE AUTHORIZATION
     * =====================================================
     *
     * Super Admins may act globally. A scoped Admin must both be the Admin
     * who approved this request and still share an active class/dojo scope
     * with at least one of the target Member's memberships.
     */

    let authorised =
      callerProfile
        .is_super_admin ===
      true;


    if (
      !authorised &&
      resetRequest
        .reviewed_by ===
        authenticatedUser.id
    ) {
      const {
        data:
          targetMemberships,

        error:
          targetMembershipError,
      } =
        await admin
          .from(
            "class_memberships"
          )
          .select(`
            class_id,
            dojo_id
          `)
          .eq(
            "user_id",
            resetRequest.user_id
          );


      if (
        targetMembershipError
      ) {
        console.error(
          "Password reset target scope error:",
          targetMembershipError
        );


        return NextResponse.json(
          {
            error:
              "Unable to verify Member scope.",
          },
          {
            status: 500,
          }
        );
      }


      authorised =
        (
          targetMemberships ??
          []
        ).some(
          (
            membership
          ) =>
            callerAssignments.some(
              (
                assignment
              ) =>
                assignment.dojo_id
                  ? assignment.dojo_id ===
                    membership.dojo_id
                  : Boolean(
                      assignment.class_id &&
                      assignment.class_id ===
                        membership.class_id
                    )
            )
        );
    }


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
     * =====================================================
     * MUST BE APPROVED
     * =====================================================
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
     * =====================================================
     * TARGET MEMBER
     * =====================================================
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
          registration_number,
          full_name,
          email
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
        "Member profile error:",
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


    const memberEmail =
      memberProfile.email
        ?.trim()
        .toLowerCase();


    if (
      !memberEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Member does not have an email address.",
        },
        {
          status: 409,
        }
      );
    }


    /*
     * =====================================================
     * EMAIL IDEMPOTENCY KEY
     * =====================================================
     */

    const dedupeKey =
      `password-reset-approved:${requestId}`;


    /*
     * =====================================================
     * CHECK EXISTING RESET EMAIL
     * =====================================================
     *
     * This also handles recovery from a partial previous
     * request.
     */

    const {
      data:
        existingEmail,

      error:
        existingEmailError,
    } =
      await admin
        .from(
          "email_outbox"
        )
        .select(`
          id,
          status,
          sent_at
        `)
        .eq(
          "dedupe_key",
          dedupeKey
        )
        .maybeSingle();


    if (
      existingEmailError
    ) {
      console.error(
        "Existing reset email error:",
        existingEmailError
      );


      return NextResponse.json(
        {
          error:
            "Unable to verify reset email state.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * =====================================================
     * RECOVERY: EMAIL ALREADY EXISTS
     * =====================================================
     *
     * If the Auth password and email queue succeeded but
     * marking the reset as applied failed, do NOT create
     * another password.
     */

    if (
      existingEmail
    ) {

      if (
        !resetRequest
          .password_reset_at
      ) {
        const {
          error:
            recoverMarkError,
        } =
          await admin.rpc(
            "mark_password_reset_applied",
            {
              target_request_id:
                requestId,
            }
          );


        if (
          recoverMarkError
        ) {
          console.error(
            "Password reset recovery mark error:",
            recoverMarkError
          );


          return NextResponse.json(
            {
              error:
                "The temporary password was already prepared, but the reset state could not be finalised.",
            },
            {
              status: 500,
            }
          );
        }
      }


      return NextResponse.json({
        success: true,

        alreadyApplied:
          true,

        emailQueued:
          existingEmail.status !==
            "sent",

        emailSent:
          existingEmail.status ===
            "sent",

        memberId:
          memberProfile.id,

        memberName:
          memberProfile.full_name,

        mustChangePassword:
          true,

        message:
          existingEmail.status ===
            "sent"
            ? "Temporary password has already been sent to the Member."
            : "Temporary password has already been queued for email delivery.",
      });
    }


    /*
     * =====================================================
     * ALREADY APPLIED BUT EMAIL MISSING
     * =====================================================
     *
     * We cannot recover the old random password because it
     * was deliberately never returned to the browser.
     *
     * Generate a new temporary password and replace it.
     */

    const temporaryPassword =
      createTemporaryPassword();


    /*
     * =====================================================
     * UPDATE SUPABASE AUTH PASSWORD
     * =====================================================
     *
     * Service-role only.
     *
     * Never move this to browser/client code.
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
        "Password reset Auth error:",
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
     * =====================================================
     * QUEUE RESET EMAIL
     * =====================================================
     *
     * The password temporarily exists in email_outbox so
     * the worker can send it.
     *
     * mark_email_sent() removes temporary_password after
     * successful delivery.
     */

    const {
      data:
        queuedEmailId,

      error:
        queueError,
    } =
      await admin.rpc(
        "queue_email",
        {
          target_email:
            memberEmail,

          target_email_type:
            "password_reset_approved",

          target_subject:
            "Your temporary Jingwuguan Seibukan password",

          target_template_data: {
            member_name:
              memberProfile.full_name,

            member_id:
              memberProfile
                .registration_number,

            temporary_password:
              temporaryPassword,
          },

          target_user_id:
            memberProfile.id,

          target_reference_type:
            "password_reset_request",

          target_reference_id:
            requestId,

          target_dedupe_key:
            dedupeKey,
        }
      );


    /*
     * =====================================================
     * VERIFY QUEUE ON ERROR
     * =====================================================
     *
     * A network response could theoretically fail after
     * the database successfully created the email.
     *
     * Check by dedupe key before declaring failure.
     */

    let emailId =
      queuedEmailId;


    if (
      queueError
    ) {
      console.error(
        "Password reset email queue error:",
        queueError
      );


      const {
        data:
          recoveredEmail,

        error:
          recoveredEmailError,
      } =
        await admin
          .from(
            "email_outbox"
          )
          .select(
            "id"
          )
          .eq(
            "dedupe_key",
            dedupeKey
          )
          .maybeSingle();


      if (
        recoveredEmailError ||
        !recoveredEmail
      ) {
        return NextResponse.json(
          {
            error:
              "The Member password was reset, but the email could not be queued. Retry this operation.",
          },
          {
            status: 500,
          }
        );
      }


      emailId =
        recoveredEmail.id;
    }


    /*
     * =====================================================
     * MARK RESET APPLIED
     * =====================================================
     *
     * password_reset_at = now()
     * profiles.must_change_password = true
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
      console.error(
        "Mark reset applied error:",
        markError
      );


      /*
       * Important:
       *
       * The email is already safely queued with the same
       * password that is active in Supabase Auth.
       *
       * A retry will detect the existing dedupe key and
       * only repair the database state.
       */

      return NextResponse.json(
        {
          error:
            "The temporary password was created and queued, but the reset state could not be finalised. Retry this operation.",
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
     *
     * Never return the temporary password to the browser.
     */

    return NextResponse.json({
      success: true,

      alreadyApplied:
        false,

      emailQueued:
        true,

      emailId,

      memberId:
        memberProfile.id,

      memberName:
        memberProfile.full_name,

      mustChangePassword:
        true,

      message:
        "A secure temporary password has been created and queued for email delivery. The Member must change it after signing in.",
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

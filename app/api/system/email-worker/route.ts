import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  Resend,
} from "resend";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  renderEmail,
} from "@/lib/email/render-email";
import {
  configuredRateLimit,
  consumeDurableRateLimit,
  durableRateLimitHeaders,
} from "@/lib/security/durable-rate-limit";


export const runtime =
  "nodejs";


const MAX_EMAILS_PER_RUN =
  20;


type EmailQueueHealth = {
  status: "PASS" | "FAIL";
  checks: {
    stuckProcessingEmails: number;
    exhaustedFailures: number;
    oldPendingEmails: number;
    overdueReadyEmails: number;
    duplicateDedupeKeys: number;
  };
  checkedAt: string | null;
};


type MemorialProcessorHealth = {
  status: "PASS" | "FAIL";
  createdAnnouncements: number | null;
};


function nonnegativeInteger(
  value: unknown,
) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : 0;
}


function normaliseQueueHealth(
  value: unknown,
): EmailQueueHealth | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const rawChecks =
    raw.checks &&
    typeof raw.checks === "object" &&
    !Array.isArray(raw.checks)
      ? raw.checks as Record<string, unknown>
      : null;

  if (
    (raw.status !== "PASS" && raw.status !== "FAIL") ||
    !rawChecks
  ) {
    return null;
  }

  const oldPendingEmails =
    nonnegativeInteger(
      rawChecks.old_pending_emails,
    );

  return {
    status: raw.status,
    checks: {
      stuckProcessingEmails:
        nonnegativeInteger(
          rawChecks.stuck_processing_emails,
        ),
      exhaustedFailures:
        nonnegativeInteger(
          rawChecks.failed_emails_exhausted,
        ),
      oldPendingEmails,
      overdueReadyEmails:
        rawChecks.overdue_ready_emails === undefined
          ? oldPendingEmails
          : nonnegativeInteger(
              rawChecks.overdue_ready_emails,
            ),
      duplicateDedupeKeys:
        nonnegativeInteger(
          rawChecks.duplicate_dedupe_keys,
        ),
    },
    checkedAt:
      typeof raw.checked_at === "string"
        ? raw.checked_at
        : null,
  };
}


function authorised(
  request:
    NextRequest
) {
  const secret =
    process.env
      .EMAIL_WORKER_SECRET;


  if (
    !secret
  ) {
    return false;
  }


  return (
    request.headers.get(
      "x-worker-secret"
    ) === secret
  );
}


export async function POST(
  request: NextRequest
) {

  if (
    !authorised(
      request
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Not authorised.",
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
          "email-worker",
        subject:
          "authorised-scheduler",
        limit:
          configuredRateLimit(
            "EMAIL_WORKER_RATE_LIMIT",
            12,
            10_000,
          ),
        windowSeconds:
          configuredRateLimit(
            "EMAIL_WORKER_RATE_WINDOW_SECONDS",
            60,
            86_400,
          ),
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many worker requests.",
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
      "Email worker rate-limit error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Email worker is temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }


  const apiKey =
    process.env
      .RESEND_API_KEY;


  const fromAddress =
    process.env
      .EMAIL_FROM_ADDRESS;


  const fromName =
    process.env
      .EMAIL_FROM_NAME ??
    "Jingwuguan Seibukan";


  if (
    !apiKey ||
    !fromAddress
  ) {
    return NextResponse.json(
      {
        error:
          "Email environment configuration is missing.",
      },
      {
        status: 500,
      }
    );
  }


  const resend =
    new Resend(
      apiKey
    );


  const supabase =
    createAdminClient();


  let memorialProcessor: MemorialProcessorHealth = {
    status: "PASS",
    createdAnnouncements: 0,
  };


  const {
    data:
      memorialData,

    error:
      memorialError,
  } =
    await supabase.rpc(
      "process_memorial_anniversaries"
    );


  if (
    memorialError
  ) {
    console.error(
      "Memorial anniversary processor failed:",
      memorialError,
    );

    memorialProcessor = {
      status: "FAIL",
      createdAnnouncements: null,
    };
  } else {
    const rawMemorial =
      memorialData &&
      typeof memorialData === "object" &&
      !Array.isArray(memorialData)
        ? memorialData as Record<string, unknown>
        : null;

    memorialProcessor = {
      status: "PASS",
      createdAnnouncements:
        nonnegativeInteger(
          rawMemorial?.created_count,
        ),
    };
  }


  let sent =
    0;

  let failed =
    0;

  let processed =
    0;


  for (
    let index = 0;

    index <
      MAX_EMAILS_PER_RUN;

    index++
  ) {

    const {
      data:
        claimed,

      error:
        claimError,
    } =
      await supabase.rpc(
        "claim_next_email"
      );


    if (
      claimError
    ) {
      console.error(
        "Email claim error:",
        claimError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to claim queued email.",
          processed,
          sent,
          failed,
        },
        { status: 500 }
      );
    }


    const email =
      Array.isArray(
        claimed
      )
        ? claimed[0]
        : null;


    /*
     * Queue empty.
     */

    if (
      !email
    ) {
      break;
    }


    processed +=
      1;


    try {

      const html =
        renderEmail(
          email.email_type,
          email.template_data ??
            {}
        );


      const {
        data,
        error,
      } =
        await resend
          .emails
          .send(
            {
              from:
                `${fromName} <${fromAddress}>`,

              to: [
                email
                  .recipient_email,
              ],

              subject:
                email.subject,

              html,
            },

            /*
             * Provider-level duplicate protection.
             *
             * Resend supports idempotency keys.
             */

            {
              idempotencyKey:
                `email-outbox/${email.email_id}`,
            }
          );


      if (
        error
      ) {
        throw new Error(
          error.message
        );
      }


      const {
        error:
          markSentError,
      } =
        await supabase.rpc(
          "mark_email_sent",
          {
            target_email_id:
              email.email_id,

            provider_id:
              data?.id ??
              null,
          }
        );


      if (
        markSentError
      ) {
        throw new Error(
          markSentError.message
        );
      }


      sent +=
        1;

    } catch (
      error
    ) {

      failed +=
        1;


      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown email error";


      console.error(
        "Email delivery failed:",
        email.email_id,
        errorMessage
      );


      const {
        error:
          markFailedError,
      } =
        await supabase.rpc(
          "mark_email_failed",
          {
            target_email_id:
              email.email_id,

            error_message:
              errorMessage,
          }
        );


      if (
        markFailedError
      ) {
        console.error(
          "Could not mark email failed:",
          markFailedError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to persist email retry state.",
            processed,
            sent,
            failed,
          },
          { status: 500 }
        );
      }
    }
  }


  const {
    data:
      healthData,

    error:
      healthError,
  } =
    await supabase.rpc(
      "email_backend_health_check"
    );


  if (
    healthError
  ) {
    console.error(
      "Email queue health check failed:",
      healthError,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify email queue health.",
        processed,
        sent,
        failed,
      },
      { status: 500 },
    );
  }


  const queueHealth =
    normaliseQueueHealth(
      healthData,
    );


  if (
    !queueHealth
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Email queue health returned an invalid result.",
        processed,
        sent,
        failed,
      },
      { status: 500 },
    );
  }


  const queueHealthy =
    queueHealth.status ===
      "PASS";


  return NextResponse.json(
    {
      success:
        failed === 0 &&
        queueHealthy &&
        memorialProcessor.status === "PASS",
      processed,
      sent,
      failed,
      memorialProcessor,
      queueHealth,
    },
    {
      status:
        failed > 0
          ? 502
          : queueHealthy &&
              memorialProcessor.status === "PASS"
            ? 200
            : 503,
    }
  );
}

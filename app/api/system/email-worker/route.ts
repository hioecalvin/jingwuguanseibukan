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


export const runtime =
  "nodejs";


const MAX_EMAILS_PER_RUN =
  20;


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

      break;
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
      }
    }
  }


  return NextResponse.json({
    success: true,

    processed,
    sent,
    failed,
  });
}
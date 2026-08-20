import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  sendWebPush,
} from "@/lib/push/server";


type PushRequest = {
  userId: string;
  title: string;
  body: string;
  url?: string;
};


export async function POST(
  request: NextRequest
) {
  try {
    const secret =
      request.headers.get(
        "x-push-secret"
      );


    if (
      !process.env.PUSH_API_SECRET ||
      secret !==
        process.env.PUSH_API_SECRET
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }


    const body =
      (
        await request.json()
      ) as PushRequest;


    if (
      !body.userId ||
      !body.title ||
      !body.body
    ) {
      return NextResponse.json(
        {
          error:
            "userId, title and body are required.",
        },
        {
          status: 400,
        }
      );
    }


    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase server configuration is incomplete."
      );
    }


    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );


    const {
      data:
        subscriptions,

      error:
        subscriptionError,
    } =
      await supabase
        .from(
          "push_subscriptions"
        )
        .select(`
          id,
          endpoint,
          p256dh,
          auth
        `)
        .eq(
          "user_id",
          body.userId
        )
        .eq(
          "active",
          true
        );


    if (
      subscriptionError
    ) {
      throw subscriptionError;
    }


    if (
      !subscriptions ||
      subscriptions.length ===
        0
    ) {
      return NextResponse.json(
        {
          success:
            true,

          sent:
            0,

          message:
            "User has no active push subscriptions.",
        }
      );
    }


    let sent =
      0;

    let failed =
      0;


    for (
      const subscription
      of subscriptions
    ) {
      try {
        await sendWebPush(
          {
            endpoint:
              subscription.endpoint,

            p256dh:
              subscription.p256dh,

            auth:
              subscription.auth,
          },

          {
            title:
              body.title,

            body:
              body.body,

            url:
              body.url ??
              "/notifications",
          }
        );


        sent +=
          1;


        await supabase
          .from(
            "push_subscriptions"
          )
          .update({
            last_success_at:
              new Date()
                .toISOString(),

            last_failure_at:
              null,
          })
          .eq(
            "id",
            subscription.id
          );
      } catch (
        error: unknown
      ) {
        failed +=
          1;


        console.error(
          "Push delivery failed:",
          error
        );


        const statusCode =
          typeof error ===
            "object" &&
          error !==
            null &&
          "statusCode" in
            error
            ? Number(
                (
                  error as {
                    statusCode?: number;
                  }
                ).statusCode
              )
            : null;


        /*
         * 404 / 410 usually mean
         * the browser subscription
         * is no longer valid.
         */

        if (
          statusCode ===
            404 ||
          statusCode ===
            410
        ) {
          await supabase
            .from(
              "push_subscriptions"
            )
            .update({
              active:
                false,

              last_failure_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              subscription.id
            );
        } else {
          await supabase
            .from(
              "push_subscriptions"
            )
            .update({
              last_failure_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              subscription.id
            );
        }
      }
    }


    return NextResponse.json({
      success:
        true,

      sent,

      failed,

      total:
        subscriptions.length,
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "Push API error:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Push delivery failed.",
      },
      {
        status: 500,
      }
    );
  }
}
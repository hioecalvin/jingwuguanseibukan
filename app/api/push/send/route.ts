import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendWebPush,
} from "@/lib/push/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  configuredRateLimit,
  consumeDurableRateLimit,
  durableRateLimitHeaders,
} from "@/lib/security/durable-rate-limit";


type PushRequest = {
  userId?: unknown;
  title?: unknown;
  body?: unknown;
  url?: unknown;
};


function safeApplicationPath(
  value: string,
) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.length > 2048
  ) {
    return false;
  }

  try {
    const base =
      "https://application.invalid";
    const parsed =
      new URL(value, base);

    return parsed.origin === base;
  } catch {
    return false;
  }
}


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


    let body:
      PushRequest;


    try {
      const parsed: unknown =
        await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          "Expected an object."
        );
      }

      body =
        parsed as PushRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const rateLimit =
        await consumeDurableRateLimit({
          bucket:
            "push-worker",
          subject:
            "authorised-worker",
          limit:
            configuredRateLimit(
              "PUSH_WORKER_RATE_LIMIT",
              120,
              100_000,
            ),
          windowSeconds:
            configuredRateLimit(
              "PUSH_WORKER_RATE_WINDOW_SECONDS",
              60,
              86_400,
            ),
        });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error:
              "Too many push requests.",
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
        "Push worker rate-limit error:",
        error,
      );
      return NextResponse.json(
        {
          error:
            "Push delivery is temporarily unavailable.",
        },
        {
          status: 503,
        },
      );
    }


    const userId =
      typeof body.userId ===
        "string"
        ? body.userId.trim()
        : "";

    const title =
      typeof body.title ===
        "string"
        ? body.title.trim()
        : "";

    const messageBody =
      typeof body.body ===
        "string"
        ? body.body.trim()
        : "";

    const targetUrl =
      typeof body.url ===
        "string"
        ? body.url.trim()
        : "/notifications";


    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      ) ||
      !title ||
      title.length > 120 ||
      !messageBody ||
      messageBody.length > 500 ||
      !safeApplicationPath(
        targetUrl
      )
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


    const supabase =
      createAdminClient();


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
          userId
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

    let stateFailed =
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
              title,

            body:
              messageBody,

            url:
              targetUrl,
          }
        );


        sent +=
          1;


        const {
          error:
            stateError,
        } = await supabase
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

        if (
          stateError
        ) {
          stateFailed +=
            1;

          console.error(
            "Push subscription state persistence failed:",
            stateError
          );
        }
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
          const {
            error:
              stateError,
          } = await supabase
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

          if (
            stateError
          ) {
            stateFailed +=
              1;

            console.error(
              "Push subscription state persistence failed:",
              stateError
            );
          }
        } else {
          const {
            error:
              stateError,
          } = await supabase
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

          if (
            stateError
          ) {
            stateFailed +=
              1;

            console.error(
              "Push subscription state persistence failed:",
              stateError
            );
          }
        }
      }
    }


    return NextResponse.json({
      success:
        failed === 0 &&
        stateFailed === 0,

      sent,

      failed,

      stateFailed,

      total:
        subscriptions.length,
    }, {
      status:
        stateFailed > 0
          ? 500
          : failed > 0
            ? 502
            : 200,
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
          "Push delivery failed.",
      },
      {
        status: 500,
      }
    );
  }
}

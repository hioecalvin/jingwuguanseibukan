import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  configuredRateLimit,
  consumeDurableRateLimit,
  durableRateLimitHeaders,
} from "@/lib/security/durable-rate-limit";


type SubscriptionBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
  userAgent?: unknown;
};


function textValue(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maximumLength) {
    return null;
  }

  return normalized;
}


async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    supabase,
    user,
  };
}


async function subscriptionRateLimit(
  userId: string,
) {
  return consumeDurableRateLimit({
    bucket:
      "push-subscription",
    subject:
      userId,
    limit:
      configuredRateLimit(
        "PUSH_SUBSCRIPTION_RATE_LIMIT",
        30,
        10_000,
      ),
    windowSeconds:
      configuredRateLimit(
        "PUSH_SUBSCRIPTION_RATE_WINDOW_SECONDS",
        3_600,
        86_400,
      ),
  });
}


export async function POST(request: NextRequest) {
  const authenticated = await authenticatedClient();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const {
    supabase,
    user,
  } = authenticated;

  try {
    const rateLimit =
      await subscriptionRateLimit(
        user.id,
      );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many subscription requests.",
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
      "Push subscription rate-limit error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Push subscriptions are temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  let body: SubscriptionBody;

  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object.");
    }
    body = parsed as SubscriptionBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const endpoint = textValue(body.endpoint, 4096);
  const p256dh = textValue(body.keys?.p256dh, 512);
  const auth = textValue(body.keys?.auth, 512);
  const userAgent =
    textValue(body.userAgent, 1024) ??
    textValue(request.headers.get("user-agent"), 1024);

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "A complete push subscription is required." },
      { status: 400 }
    );
  }

  if (!endpoint.startsWith("https://")) {
    return NextResponse.json(
      { error: "The push endpoint must use HTTPS." },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc("save_my_push_subscription", {
    subscription_endpoint: endpoint,
    subscription_p256dh: p256dh,
    subscription_auth: auth,
    subscription_user_agent: userAgent,
  });

  if (error) {
    console.error("Save push subscription error:", error);

    return NextResponse.json(
      { error: "Unable to save this push subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}


export async function DELETE(request: NextRequest) {
  const authenticated = await authenticatedClient();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const {
    supabase,
    user,
  } = authenticated;

  try {
    const rateLimit =
      await subscriptionRateLimit(
        user.id,
      );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many subscription requests.",
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
      "Push subscription rate-limit error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Push subscriptions are temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  let body: {
    endpoint?: unknown;
  };

  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object.");
    }
    body = parsed as {
      endpoint?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const endpoint = textValue(body.endpoint, 4096);

  if (!endpoint) {
    return NextResponse.json(
      { error: "Push endpoint is required." },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc("disable_my_push_subscription", {
    subscription_endpoint: endpoint,
  });

  if (error) {
    console.error("Disable push subscription error:", error);

    return NextResponse.json(
      { error: "Unable to disable this push subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

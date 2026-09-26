import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  configuredRateLimit,
  consumeDurableRateLimit,
  durableRateLimitHeaders,
} from "@/lib/security/durable-rate-limit";
import {
  createAdminClient,
} from "@/lib/supabase/admin";


export const runtime =
  "nodejs";


function normalizeEmail(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}


function configuredSiteOrigin() {
  const raw =
    process.env
      .NEXT_PUBLIC_SITE_URL;

  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is missing.",
    );
  }

  const url = new URL(raw);
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" &&
      url.pathname !== "") ||
    (
      url.protocol !== "https:" &&
      !(
        loopback &&
        url.protocol === "http:"
      )
    )
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an exact secure origin.",
    );
  }

  return url.origin;
}


function createAuthenticatedClient(
  accessToken: string,
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
      "Supabase public environment configuration is missing.",
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
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}


export async function POST(
  request: NextRequest,
) {
  try {
    const siteOrigin =
      configuredSiteOrigin();
    const requestOrigin =
      request.headers.get(
        "origin",
      );

    if (
      !requestOrigin ||
      requestOrigin !== siteOrigin
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request origin.",
        },
        {
          status: 403,
        },
      );
    }

    const authorization =
      request.headers.get(
        "authorization",
      );

    if (
      !authorization
        ?.startsWith(
          "Bearer ",
        )
    ) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken =
      authorization
        .slice(
          "Bearer ".length,
        )
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        },
      );
    }

    let body: {
      newEmail?: unknown;
    };

    try {
      const parsed: unknown =
        await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          "Expected a JSON object.",
        );
      }

      body = parsed as {
        newEmail?: unknown;
      };
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        },
      );
    }

    const newEmail =
      normalizeEmail(
        body.newEmail,
      );

    if (!newEmail) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    const authenticatedClient =
      createAuthenticatedClient(
        accessToken,
      );
    const {
      data: {
        user,
      },
      error: userError,
    } = await authenticatedClient
      .auth
      .getUser(
        accessToken,
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
        },
      );
    }

    try {
      const rateLimit =
        await consumeDurableRateLimit({
          bucket:
            "change-email",
          subject:
            user.id,
          limit:
            configuredRateLimit(
              "CHANGE_EMAIL_RATE_LIMIT",
              3,
              100,
            ),
          windowSeconds:
            configuredRateLimit(
              "CHANGE_EMAIL_RATE_WINDOW_SECONDS",
              3600,
              86_400,
            ),
        });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error:
              "Too many email-change requests. Please try again later.",
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
        "Email change rate-limit error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Email changes are temporarily unavailable.",
        },
        {
          status: 503,
        },
      );
    }

    const admin =
      createAdminClient();
    const {
      data: profile,
      error: profileError,
    } = await admin
      .from(
        "profiles",
      )
      .select(`
        id,
        email,
        account_status,
        date_of_passing
      `)
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Email change profile lookup failed.",
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify account.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      profile.account_status !==
        "active" ||
      profile.date_of_passing
    ) {
      return NextResponse.json(
        {
          error:
            "This account is disabled.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      profile.email
        ?.trim()
        .toLowerCase() ===
      newEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a different email address.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await admin
      .from(
        "profiles",
      )
      .select(
        "id",
      )
      .eq(
        "email",
        newEmail,
      )
      .neq(
        "id",
        user.id,
      )
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Email change duplicate check failed.",
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the new email address.",
        },
        {
          status: 500,
        },
      );
    }

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "That email address is unavailable.",
        },
        {
          status: 409,
        },
      );
    }

    const {
      error: updateError,
    } = await authenticatedClient
      .auth
      .updateUser(
        {
          email:
            newEmail,
        },
        {
          emailRedirectTo:
            `${siteOrigin}/auth/confirm`,
        },
      );

    if (updateError) {
      console.error(
        "Supabase Auth email change failed.",
      );

      return NextResponse.json(
        {
          error:
            "Unable to request that email change. Check the address and try again.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Verification was sent. Your current email remains active until the new address is confirmed.",
    });
  } catch (error) {
    console.error(
      "Change email route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to request the email change. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}

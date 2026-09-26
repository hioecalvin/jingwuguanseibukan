import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authenticatedClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase public environment configuration is missing.");
  }

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const accessToken = authorization.slice("Bearer ".length).trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object.");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const targetUserId =
      typeof body.targetUserId === "string" ? body.targetUserId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!UUID_PATTERN.test(targetUserId)) {
      return NextResponse.json(
        { error: "A valid member is required." },
        { status: 400 },
      );
    }
    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "A memorial title between 1 and 200 characters is required." },
        { status: 400 },
      );
    }
    if (!message || message.length > 10_000) {
      return NextResponse.json(
        { error: "A memorial message between 1 and 10000 characters is required." },
        { status: 400 },
      );
    }

    const supabase = authenticatedClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_super_admin, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Initial memorial authorization error:", profileError);
      return NextResponse.json(
        { error: "Unable to verify administrator access." },
        { status: 500 },
      );
    }
    if (!profile || profile.account_status !== "active" || profile.is_super_admin !== true) {
      return NextResponse.json(
        { error: "Super Admin access required." },
        { status: 403 },
      );
    }

    const { data, error: publishError } = await supabase.rpc(
      "publish_initial_memorial",
      {
        target_user_id: targetUserId,
        target_title: title,
        target_message: message,
      },
    );

    if (publishError) {
      console.error("Initial memorial publication error:", publishError);
      return NextResponse.json(
        { error: "Unable to publish the Initial Memorial." },
        { status: 500 },
      );
    }

    const result =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};

    return NextResponse.json({
      success: true,
      created: result.created === true,
      announcementId:
        typeof result.announcement_id === "string"
          ? result.announcement_id
          : null,
    });
  } catch (error) {
    console.error("Initial memorial request failed:", error);
    return NextResponse.json(
      { error: "Unable to process the Initial Memorial request." },
      { status: 500 },
    );
  }
}

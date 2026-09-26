import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MESSAGE_LENGTH = 10_000;

type RequestBody = {
  targetUserId?: unknown;
  dateOfPassing?: unknown;
  recipientClassIds?: unknown;
  remembranceEnabled?: unknown;
  heavenlyBirthdayEnabled?: unknown;
  remembranceMessage?: unknown;
  heavenlyBirthdayMessage?: unknown;
};

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

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function invalid(error: string) {
  return NextResponse.json({ error }, { status: 400 });
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

    let body: RequestBody;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object.");
      }
      body = parsed as RequestBody;
    } catch {
      return invalid("Invalid request.");
    }

    const targetUserId =
      typeof body.targetUserId === "string" ? body.targetUserId : "";
    if (!UUID_PATTERN.test(targetUserId)) {
      return invalid("A valid member is required.");
    }

    const reversing = body.dateOfPassing === null;
    const dateOfPassing =
      typeof body.dateOfPassing === "string" ? body.dateOfPassing : null;
    if (!reversing && (!dateOfPassing || !validDate(dateOfPassing))) {
      return invalid("A valid Date of Passing is required.");
    }
    if (
      dateOfPassing &&
      dateOfPassing > new Date().toISOString().slice(0, 10)
    ) {
      return invalid("Date of Passing cannot be in the future.");
    }

    if (
      !Array.isArray(body.recipientClassIds) ||
      body.recipientClassIds.length > 100 ||
      body.recipientClassIds.some(
        (value) => typeof value !== "string" || !UUID_PATTERN.test(value),
      )
    ) {
      return invalid("Recipient classes are invalid.");
    }
    const recipientClassIds = [...new Set(body.recipientClassIds as string[])];
    if (!reversing && recipientClassIds.length === 0) {
      return invalid("Select at least one recipient class.");
    }

    if (
      typeof body.remembranceEnabled !== "boolean" ||
      typeof body.heavenlyBirthdayEnabled !== "boolean"
    ) {
      return invalid("Reminder settings are invalid.");
    }

    const remembranceMessage =
      typeof body.remembranceMessage === "string"
        ? body.remembranceMessage.trim()
        : "";
    const heavenlyBirthdayMessage =
      typeof body.heavenlyBirthdayMessage === "string"
        ? body.heavenlyBirthdayMessage.trim()
        : "";

    if (
      remembranceMessage.length > MAX_MESSAGE_LENGTH ||
      heavenlyBirthdayMessage.length > MAX_MESSAGE_LENGTH
    ) {
      return invalid("Memorial messages are too long.");
    }
    if (!reversing && body.remembranceEnabled && !remembranceMessage) {
      return invalid("A Remembrance Day message is required when enabled.");
    }
    if (!reversing && body.heavenlyBirthdayEnabled && !heavenlyBirthdayMessage) {
      return invalid("A Heavenly Birthday message is required when enabled.");
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
      console.error("Deceased-member authorization error:", profileError);
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

    const { data, error: updateError } = await supabase.rpc(
      "set_member_deceased",
      {
        target_user_id: targetUserId,
        target_date_of_passing: dateOfPassing,
        target_recipient_class_ids: recipientClassIds,
        target_remembrance_enabled: reversing ? false : body.remembranceEnabled,
        target_heavenly_birthday_enabled: reversing
          ? false
          : body.heavenlyBirthdayEnabled,
        target_remembrance_message: remembranceMessage || null,
        target_heavenly_birthday_message: heavenlyBirthdayMessage || null,
      },
    );

    if (updateError) {
      console.error("Deceased-member database update error:", updateError);
      return NextResponse.json(
        { error: "Unable to save deceased-member settings." },
        { status: 500 },
      );
    }

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(
      targetUserId,
      { ban_duration: reversing ? "none" : "876000h" },
    );

    if (authError) {
      console.error("Deceased-member Auth access update error:", authError);
      return NextResponse.json(
        {
          success: false,
          databaseUpdated: true,
          authAccessUpdated: false,
          retryRequired: true,
          error:
            "The member record was saved, but the Auth access update must be retried.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      accessDisabled: !reversing,
      message: reversing
        ? "The deceased designation was cleared and future sign-in was restored."
        : "The deceased record was saved and future sign-in was disabled.",
      memorialSettings: data,
    });
  } catch (error) {
    console.error("Deceased-member request failed:", error);
    return NextResponse.json(
      { error: "Unable to process the deceased-member request." },
      { status: 500 },
    );
  }
}

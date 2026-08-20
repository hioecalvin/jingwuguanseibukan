import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Push subscription endpoint is not configured yet.",
    },
    {
      status: 501,
    }
  );
}
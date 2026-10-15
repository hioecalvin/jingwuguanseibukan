import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "@/lib/supabase/authenticated";

export function configuredSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is missing.");
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.pathname !== "/" && url.pathname !== "") ||
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
  ) throw new Error("NEXT_PUBLIC_SITE_URL must be an exact secure origin.");
  return url.origin;
}

export async function authenticateMuxRequest(request: NextRequest, requireOrigin: boolean) {
  if (requireOrigin && request.headers.get("origin") !== configuredSiteOrigin()) {
    return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) {
    return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  const supabase = createAuthenticatedClient(accessToken);
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { response: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
  }
  const [{ data: profile, error: profileError }, { data: scopes, error: scopesError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("account_status,date_of_passing,must_change_password")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_my_repository_upload_scopes"),
  ]);
  if (profileError || scopesError) throw new Error("Unable to verify repository upload access.");
  if (
    !profile ||
    profile.account_status !== "active" ||
    profile.date_of_passing !== null ||
    profile.must_change_password === true
  ) {
    return { response: NextResponse.json({ error: "Active account required." }, { status: 403 }) };
  }
  return {
    user,
    supabase,
    scopeIds: new Set((scopes ?? []).map((item: Record<string, unknown>) => String(item.class_id))),
  };
}

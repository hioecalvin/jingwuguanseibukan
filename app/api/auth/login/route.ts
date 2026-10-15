import { isIP } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";

export const runtime = "nodejs";
const message = "Unable to sign in. Check your email or JS Member ID and password.";

function deny(status = 401) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(request: Request): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 8192)) throw new Error("body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new Error("body");
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let succeeded = false;
  let rejectSession: (() => Promise<unknown>) | undefined;
  try {
    const origin = configuredApplicationOrigin();
    if (request.headers.get("origin") !== origin ||
        request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return deny(403);
    // Vercel overwrites this header. Other hosts use a shared, fail-closed bucket.
    const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
    const client = forwarded && isIP(forwarded) ? forwarded : "shared";
    for (const options of [
      { bucket: "login-global", subject: "all", limit: 300, windowSeconds: 60 },
      { bucket: "login-client", subject: client, limit: 30, windowSeconds: 600 },
    ]) if (!(await consumeDurableRateLimit(options)).allowed) return deny(429);

    let body;
    try { body = await readBody(request); } catch { return deny(400); }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        !("identifier" in body) || !("password" in body) ||
        typeof body.identifier !== "string" || typeof body.password !== "string") return deny(400);
    const identifier = body.identifier.trim();
    const password = body.password;
    if (!identifier || identifier.length > 254 || /[\u0000-\u001f\u007f]/.test(identifier) || !password || password.length > 1024) return deny(400);
    const isEmail = identifier.includes("@");
    const normalized = isEmail ? identifier.toLowerCase() : identifier;
    if (!(await consumeDurableRateLimit({ bucket: "login-identifier", subject: normalized.toLowerCase(), limit: 10, windowSeconds: 600 })).allowed) return deny(429);

    const admin = createAdminClient();
    let email = normalized;
    let expectedId: string | undefined;
    if (!isEmail) {
      const lookup = await admin.from("profiles").select("id").eq("registration_number", normalized).limit(2);
      if (lookup.error || !Array.isArray(lookup.data) || lookup.data.length !== 1 || !lookup.data[0]?.id) return deny();
      expectedId = lookup.data[0].id;
      const identity = await admin.auth.admin.getUserById(expectedId!);
      if (identity.error || identity.data.user?.id !== expectedId || !identity.data.user?.email) return deny();
      email = identity.data.user.email;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return deny(503);
    const pending: { name: string; value: string; options: CookieOptions }[] = [];
    const auth = createServerClient(url, key, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false },
      cookies: { getAll: () => [], setAll: (values) => { pending.push(...values); } },
    });
    const signedIn = await auth.auth.signInWithPassword({ email, password });
    const user = signedIn.data.user;
    if (signedIn.data.session) rejectSession = () => auth.auth.signOut({ scope: "local" });
    if (signedIn.error || !signedIn.data.session || !user?.id || !user.email_confirmed_at || (expectedId && user.id !== expectedId)) return deny();
    const profile = await admin.from("profiles").select("id,account_status,date_of_passing").eq("id", user.id).maybeSingle();
    if (profile.error || profile.data?.id !== user.id || profile.data.account_status !== "active" || profile.data.date_of_passing) return deny();
    if (!pending.some((cookie) => cookie.value)) return deny();
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    // Keep old sessions isolated from authentication, then remove stale chunks
    // only after the replacement session has passed every check.
    const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    for (const item of (request.headers.get("cookie") ?? "").split(";")) {
      const name = item.split("=", 1)[0].trim();
      const suffix = name.startsWith(`${storageKey}.`) ? name.slice(storageKey.length + 1) : "";
      if (name === storageKey || /^\d+$/.test(suffix)) response.cookies.set(name, "", { maxAge: 0, path: "/", secure: origin.startsWith("https:"), sameSite: "lax" });
    }
    for (const { name, value, options } of pending) response.cookies.set(name, value, { ...options, secure: origin.startsWith("https:"), sameSite: "lax", path: "/" });
    rejectSession = undefined;
    succeeded = true;
    return response;
  } catch {
    return deny(503);
  } finally {
    // A denied newly issued session must never reach the browser.
    if (rejectSession) { try { await rejectSession(); } catch { /* no credentials or provider errors logged */ } }
    // Reduces simple missing-ID timing probes; network variance can still exceed
    // this floor, so durable limits remain necessary.
    if (!succeeded) await delay(Math.max(0, 1000 - (Date.now() - startedAt)));
  }
}

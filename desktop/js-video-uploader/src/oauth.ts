import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

type OAuthConfig = { clientId: string; expectedChannelId: string };
export type YouTubeAuthorization = { accessToken: string; channelId: string; channelTitle: string };

const base64url = (value: Buffer) => value.toString("base64url");
const oauthTimeoutMs = 5 * 60 * 1000;

export async function authorizeYouTube(
  config: OAuthConfig,
  openExternal: (url: string) => Promise<void>,
  signal: AbortSignal,
): Promise<YouTubeAuthorization> {
  if (!/^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(config.clientId)) throw new Error("Google OAuth is not configured.");
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(config.expectedChannelId)) throw new Error("The organization YouTube channel is not configured.");
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  let settle: ((value: URL) => void) | null = null;
  let reject: ((error: Error) => void) | null = null;
  const callback = new Promise<URL>((resolve, rejectPromise) => { settle = resolve; reject = rejectPromise; });
  const server = createServer((request, response) => {
    try {
      const incoming = new URL(request.url ?? "/", "http://127.0.0.1");
      if (incoming.pathname !== "/oauth2/callback") { response.writeHead(404).end(); return; }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end("<!doctype html><title>JS Video Uploader</title><main style='font-family:sans-serif;max-width:38rem;margin:4rem auto'><h1>Authorization received</h1><p>You may close this tab and return to JS Video Uploader.</p></main>");
      settle?.(incoming);
    } catch { response.writeHead(400).end(); }
  });
  await new Promise<void>((resolve, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent select_account",
  }).toString();
  const abort = () => reject?.(new Error("YouTube authorization was cancelled."));
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => reject?.(new Error("YouTube authorization timed out.")), oauthTimeoutMs);
  try {
    await openExternal(authorizationUrl.toString());
    const incoming = await callback;
    if (incoming.searchParams.get("state") !== state) throw new Error("YouTube authorization state did not match.");
    const oauthError = incoming.searchParams.get("error");
    if (oauthError) throw new Error(oauthError === "access_denied" ? "YouTube authorization was cancelled." : "YouTube authorization failed.");
    const code = incoming.searchParams.get("code");
    if (!code) throw new Error("YouTube did not return an authorization code.");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.clientId, code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      redirect: "error",
    });
    if (!tokenResponse.ok) throw new Error("Google could not complete YouTube authorization.");
    const token = await tokenResponse.json() as { access_token?: unknown };
    if (typeof token.access_token !== "string" || !token.access_token) throw new Error("Google did not return an access token.");
    const channelResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id%2Csnippet&mine=true", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      redirect: "error",
    });
    if (!channelResponse.ok) throw new Error("The selected Google account does not expose an accessible YouTube channel.");
    const channelBody = await channelResponse.json() as { items?: Array<{ id?: unknown; snippet?: { title?: unknown } }> };
    const channel = channelBody.items?.find(item => item.id === config.expectedChannelId);
    if (!channel) throw new Error("The selected Google account is not authorized for the configured organization YouTube channel.");
    return { accessToken: token.access_token, channelId: config.expectedChannelId, channelTitle: typeof channel.snippet?.title === "string" ? channel.snippet.title : "Organization channel" };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    server.close();
  }
}

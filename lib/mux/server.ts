import "server-only";

import { createPrivateKey, createSign } from "node:crypto";

const MUX_API_ORIGIN = "https://api.mux.com";
const MUX_ID_PATTERN = /^[A-Za-z0-9_-]{10,255}$/;
const MUX_API_FAILURE_PATTERN = /^Mux API request failed \(([1-5][0-9]{2})\)\.$/;
const MUX_DIRECT_UPLOAD_HOST_PATTERN = /^direct-uploads-[a-z0-9-]+\.mux\.com$/;
const MUX_DIRECT_UPLOAD_PATH_PATTERN = /^\/upload\/[A-Za-z0-9_-]{10,255}$/;

type MuxDirectUpload = {
  id: string;
  url?: string;
  status: "waiting" | "asset_created" | "errored" | "cancelled" | "timed_out";
  asset_id?: string;
  new_asset_settings?: { passthrough?: string };
};

type MuxAsset = {
  id: string;
  status: "preparing" | "ready" | "errored";
  passthrough?: string;
  playback_ids?: Array<{ id: string; policy: "public" | "signed" | "drm" }>;
};

export function muxFailureCategory(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  const apiFailure = MUX_API_FAILURE_PATTERN.exec(error.message);
  if (apiFailure) return `api_status_${apiFailure[1]}`;
  switch (error.message) {
    case "Mux API credentials are missing.": return "credentials_missing";
    case "Mux API returned an invalid response.": return "invalid_api_response";
    case "Mux did not return a valid direct upload.": return "invalid_direct_upload";
    case "Mux returned an untrusted direct-upload address.": return "untrusted_upload_address";
    default: return "unknown";
  }
}

export function isTrustedMuxDirectUploadUrl(url: URL) {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) return false;
  if (url.hostname === "storage.googleapis.com") {
    return url.pathname.startsWith("/video-storage-");
  }
  return (
    MUX_DIRECT_UPLOAD_HOST_PATTERN.test(url.hostname) &&
    MUX_DIRECT_UPLOAD_PATH_PATTERN.test(url.pathname)
  );
}

function credentials() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) throw new Error("Mux API credentials are missing.");
  return Buffer.from(`${tokenId}:${tokenSecret}`, "utf8").toString("base64");
}

async function muxRequest<T>(pathname: string, init: RequestInit = {}) {
  if (!pathname.startsWith("/video/v1/")) throw new Error("Invalid Mux API path.");
  const response = await fetch(`${MUX_API_ORIGIN}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Basic ${credentials()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Mux API request failed (${response.status}).`);
  }
  const result = await response.json() as { data?: T };
  if (!result.data) throw new Error("Mux API returned an invalid response.");
  return result.data;
}

export function validMuxId(value: unknown): value is string {
  return typeof value === "string" && MUX_ID_PATTERN.test(value);
}

export async function createMuxDirectUpload(options: { title: string; passthrough: string }) {
  const upload = await muxRequest<MuxDirectUpload>("/video/v1/uploads", {
    method: "POST",
    body: JSON.stringify({
      timeout: 3600,
      new_asset_settings: {
        playback_policies: ["signed"],
        video_quality: "basic",
        passthrough: options.passthrough,
        meta: { title: options.title },
      },
    }),
  });
  if (!validMuxId(upload.id) || typeof upload.url !== "string") {
    throw new Error("Mux did not return a valid direct upload.");
  }
  const uploadUrl = new URL(upload.url);
  if (!isTrustedMuxDirectUploadUrl(uploadUrl)) {
    throw new Error("Mux returned an untrusted direct-upload address.");
  }
  return { id: upload.id, url: uploadUrl.toString() };
}

export function getMuxDirectUpload(uploadId: string) {
  if (!validMuxId(uploadId)) throw new Error("Invalid Mux upload identifier.");
  return muxRequest<MuxDirectUpload>(`/video/v1/uploads/${encodeURIComponent(uploadId)}`);
}

export function getMuxAsset(assetId: string) {
  if (!validMuxId(assetId)) throw new Error("Invalid Mux asset identifier.");
  return muxRequest<MuxAsset>(`/video/v1/assets/${encodeURIComponent(assetId)}`);
}

function signingKey() {
  const keyId = process.env.MUX_SIGNING_KEY_ID?.trim();
  const encodedPrivateKey = process.env.MUX_SIGNING_PRIVATE_KEY?.trim();
  if (!keyId || !encodedPrivateKey) throw new Error("Mux playback signing is not configured.");
  if (!validMuxId(keyId)) throw new Error("Mux signing key ID is invalid.");
  const pem = Buffer.from(encodedPrivateKey, "base64").toString("utf8");
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== "rsa") throw new Error("Mux signing private key must be RSA.");
  return { keyId, privateKey };
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function signMuxPlaybackToken(playbackId: string, lifetimeSeconds = 14_400) {
  if (!validMuxId(playbackId)) throw new Error("Invalid Mux playback identifier.");
  if (!Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds < 60 || lifetimeSeconds > 14_400) {
    throw new Error("Invalid Mux playback token lifetime.");
  }
  const { keyId, privateKey } = signingKey();
  const expiresAt = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }));
  const payload = base64url(JSON.stringify({ sub: playbackId, aud: "v", exp: expiresAt, kid: keyId }));
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(privateKey);
  return { token: `${unsigned}.${signature.toString("base64url")}`, expiresAt };
}

import { open, stat } from "node:fs/promises";
import type { UploadRequest } from "./contracts";

type Progress = (percent: number, message: string) => void;
const chunkSize = 8 * 1024 * 1024;
const transient = new Set([429, 500, 502, 503, 504]);

async function retryFetch(input: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt) await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, Math.min(16_000, 1_000 * (2 ** attempt)));
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Upload cancelled.")); }, { once: true });
    });
    last = await fetch(input, { ...init, signal, redirect: "error" });
    if (!transient.has(last.status)) return last;
    await last.body?.cancel().catch(() => undefined);
  }
  return last as Response;
}

export async function uploadToYouTube(
  filePath: string,
  accessToken: string,
  request: UploadRequest,
  className: string,
  rankName: string,
  tierName: string,
  signal: AbortSignal,
  progress: Progress,
): Promise<string> {
  const file = await stat(filePath);
  if (!file.isFile() || file.size <= 0) throw new Error("Processed video is unavailable.");
  const section = request.section.trim();
  const description = [request.description.trim(), section ? `Section: ${section}` : "", `JS Repository: ${className} · ${rankName} · ${tierName}`].filter(Boolean).join("\n\n");
  const start = await retryFetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(file.size),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify({
      snippet: { title: request.title.trim(), description, categoryId: "27", tags: ["Jingwuguan Seibukan", className, rankName, tierName] },
      status: { privacyStatus: request.privacyStatus, embeddable: true, selfDeclaredMadeForKids: false },
    }),
  }, signal);
  if (!start.ok) throw new Error(`YouTube rejected the upload session (${start.status}).`);
  const location = start.headers.get("location");
  if (!location) throw new Error("YouTube did not return a resumable upload address.");
  const uploadUrl = new URL(location);
  if (
    uploadUrl.origin !== "https://www.googleapis.com"
    || uploadUrl.pathname !== "/upload/youtube/v3/videos"
    || !uploadUrl.searchParams.get("upload_id")
  ) throw new Error("YouTube returned an untrusted upload address.");
  const handle = await open(filePath, "r");
  let offset = 0;
  try {
    while (offset < file.size) {
      const length = Math.min(chunkSize, file.size - offset);
      const bytes = Buffer.allocUnsafe(length);
      const { bytesRead } = await handle.read(bytes, 0, length, offset);
      if (bytesRead !== length) throw new Error("Unable to read the processed video.");
      const end = offset + length - 1;
      const response = await retryFetch(uploadUrl.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "video/mp4",
          "Content-Length": String(length),
          "Content-Range": `bytes ${offset}-${end}/${file.size}`,
        },
        body: bytes,
      }, signal);
      if (response.status === 308) {
        const range = response.headers.get("range")?.match(/bytes=0-(\d+)/i);
        offset = range ? Number(range[1]) + 1 : end + 1;
      } else if (response.ok) {
        const body = await response.json() as { id?: unknown };
        if (typeof body.id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(body.id)) throw new Error("YouTube returned an invalid video identifier.");
        progress(100, "YouTube upload complete");
        return body.id;
      } else {
        throw new Error(`YouTube upload failed (${response.status}).`);
      }
      progress(Math.floor((offset / file.size) * 100), `Uploading to YouTube · ${Math.floor((offset / file.size) * 100)}%`);
    }
  } finally { await handle.close(); }
  throw new Error("YouTube upload ended without a video identifier.");
}

import { open, stat } from "node:fs/promises";

type Progress = (percent: number, message: string) => void;
const chunkSize = 8 * 1024 * 1024;
const transient = new Set([429, 500, 502, 503, 504]);

function trustedUploadUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "storage.googleapis.com" ||
    url.username || url.password ||
    !url.pathname.startsWith("/video-storage-")
  ) throw new Error("The Super App returned an untrusted Mux upload address.");
  return url;
}

async function retryFetch(input: string, init: RequestInit, signal: AbortSignal) {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt) await new Promise<void>((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new Error("Upload cancelled.")); };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, Math.min(16_000, 1_000 * (2 ** attempt)));
      signal.addEventListener("abort", onAbort, { once: true });
    });
    last = await fetch(input, { ...init, signal, redirect: "error" });
    if (!transient.has(last.status)) return last;
    await last.body?.cancel().catch(() => undefined);
  }
  return last as Response;
}

export async function uploadToMux(
  filePath: string,
  signedUploadUrl: string,
  signal: AbortSignal,
  progress: Progress,
) {
  const uploadUrl = trustedUploadUrl(signedUploadUrl);
  const file = await stat(filePath);
  if (!file.isFile() || file.size <= 0) throw new Error("Processed video is unavailable.");
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
        progress(100, "Mux upload complete");
        return;
      } else {
        throw new Error(`Mux upload failed (${response.status}).`);
      }
      const percent = Math.floor((offset / file.size) * 100);
      progress(percent, `Uploading directly to Mux · ${percent}%`);
    }
  } finally {
    await handle.close();
  }
  throw new Error("Mux upload ended without confirmation.");
}

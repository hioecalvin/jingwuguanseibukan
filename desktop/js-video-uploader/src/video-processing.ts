import { spawn } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";

type Progress = (percent: number, message: string) => void;
const allowedVideoExtensions = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"]);

export async function validateVideo(path: string) {
  if (typeof path !== "string" || !allowedVideoExtensions.has(extname(path).toLowerCase())) throw new Error("Choose a supported video file.");
  const file = await stat(path);
  if (!file.isFile() || file.size <= 0) throw new Error("The selected video is empty or unavailable.");
  if (file.size > 256 * 1024 * 1024 * 1024) throw new Error("The selected video exceeds the uploader's 256 GB safety limit.");
  return { path, name: basename(path), size: file.size };
}

function trustedLogoUrl(value: string, siteUrl: string, supabaseUrl: string): URL {
  const url = new URL(value, siteUrl);
  const allowed = new Set([new URL(siteUrl).origin, new URL(supabaseUrl).origin]);
  if (url.protocol !== "https:" || !allowed.has(url.origin) || url.username || url.password) throw new Error("The configured logo URL is not trusted.");
  return url;
}

async function downloadLogo(value: string, target: string, siteUrl: string, supabaseUrl: string, signal: AbortSignal) {
  const url = trustedLogoUrl(value, siteUrl, supabaseUrl);
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]), redirect: "error" });
  if (!response.ok) throw new Error("A required watermark logo could not be downloaded.");
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error("A watermark logo has an unsupported image format.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("A watermark logo is empty or too large.");
  await writeFile(target, bytes);
}

export async function processVideo(options: {
  inputPath: string;
  tempRoot: string;
  ffmpegPath: string;
  organisationLogoUrl: string;
  classLogoUrl: string;
  siteUrl: string;
  supabaseUrl: string;
  signal: AbortSignal;
  progress: Progress;
}): Promise<{ outputPath: string; cleanup: () => Promise<void> }> {
  await validateVideo(options.inputPath);
  const work = join(options.tempRoot, randomUUID());
  await mkdir(work, { recursive: true });
  const organisationLogo = join(work, "organisation-logo");
  const classLogo = join(work, "class-logo");
  const outputPath = join(work, "processed.mp4");
  const cleanup = () => rm(work, { recursive: true, force: true });
  try {
    await Promise.all([
      downloadLogo(options.organisationLogoUrl, organisationLogo, options.siteUrl, options.supabaseUrl, options.signal),
      downloadLogo(options.classLogoUrl, classLogo, options.siteUrl, options.supabaseUrl, options.signal),
    ]);
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-hide_banner", "-y", "-i", options.inputPath,
        "-loop", "1", "-i", organisationLogo,
        "-loop", "1", "-i", classLogo,
        "-filter_complex", "[1:v]scale=180:-1,format=rgba,colorchannelmixer=aa=0.72[org];[2:v]scale=180:-1,format=rgba,colorchannelmixer=aa=0.72[class];[0:v][org]overlay=24:24[base];[base][class]overlay=W-w-24:24[v]",
        "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-shortest", outputPath,
      ];
      const child = spawn(options.ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
      let duration = 0;
      let stderr = "";
      const abort = () => child.kill();
      options.signal.addEventListener("abort", abort, { once: true });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr = (stderr + chunk).slice(-20_000);
        const durationMatch = chunk.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (durationMatch) duration = Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
        const timeMatch = chunk.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)?.at(-1)?.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (duration && timeMatch) {
          const seconds = Number(timeMatch[1]) * 3600 + Number(timeMatch[2]) * 60 + Number(timeMatch[3]);
          const percent = Math.max(1, Math.min(99, Math.floor((seconds / duration) * 100)));
          options.progress(percent, `Applying organization and class watermarks · ${percent}%`);
        }
      });
      child.once("error", error => { options.signal.removeEventListener("abort", abort); reject(error); });
      child.once("close", code => {
        options.signal.removeEventListener("abort", abort);
        if (options.signal.aborted) reject(new Error("Upload cancelled."));
        else if (code === 0) resolve();
        else reject(new Error(`Local video processing failed. ${stderr.match(/Error[^\r\n]*/i)?.[0] ?? "Check the source video."}`));
      });
    });
    const processed = await stat(outputPath);
    if (!processed.isFile() || processed.size <= 0) throw new Error("Local video processing did not produce an output file.");
    return { outputPath, cleanup };
  } catch (error) { await cleanup(); throw error; }
}

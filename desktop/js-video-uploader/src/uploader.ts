import type { BrowserWindow } from "electron";
import { processVideo, validateVideo } from "./video-processing";
import { uploadToMux } from "./mux";
import type { UploadProgress, UploadRequest, UploadResult } from "./contracts";
import type { PublicConfig } from "./config";
import type { DesktopAuth } from "./auth";

export class UploaderService {
  private controller: AbortController | null = null;
  constructor(
    private auth: DesktopAuth,
    private config: PublicConfig | null,
    private window: () => BrowserWindow | null,
    private tempRoot: string,
    private ffmpegPath: string,
  ) {}
  private report(phase: UploadProgress["phase"], percent: number, message: string) {
    this.window()?.webContents.send("upload:progress", { phase, percent, message } satisfies UploadProgress);
  }
  cancel() { if (!this.controller) return false; this.controller.abort(); return true; }
  async run(request: UploadRequest): Promise<UploadResult> {
    if (this.controller) return { ok: false, message: "Another upload is already running." };
    if (!this.config) return { ok: false, message: "This installer is not configured for the JS Super App." };
    this.controller = new AbortController();
    const signal = this.controller.signal;
    let cleanup: (() => Promise<void>) | null = null;
    let muxAssetId: string | undefined;
    let muxPlaybackId: string | undefined;
    try {
      this.report("validating", 0, "Validating JS access and repository selections");
      const video = await validateVideo(request.videoPath);
      if (!request.title.trim() || request.title.trim().length > 100) throw new Error("Title must contain 1 to 100 characters.");
      const auth = await this.auth.refresh();
      const selectedClass = auth.user?.classes.find(item => item.id === request.classId);
      const selectedRank = selectedClass?.ranks.find(item => item.id === request.rankId);
      const selectedTier = selectedRank?.tiers.find(item => item.id === request.tierId);
      if (!selectedClass || !selectedRank || !selectedTier) throw new Error("Repository access changed. Sign in again and retry.");
      if (!selectedClass.logoUrl) throw new Error(`Upload a logo for ${selectedClass.name} in the JS Super App before processing this video.`);
      const classLogoOrigin = new URL(selectedClass.logoUrl, this.config.siteUrl).origin;
      if (![new URL(this.config.url).origin, new URL(this.config.siteUrl).origin].includes(classLogoOrigin)) throw new Error(`${selectedClass.name}'s logo still points to a retired project. Re-upload that class logo in the current JS Super App before using the uploader.`);
      this.report("processing", 1, `Processing ${video.name} locally`);
      const processed = await processVideo({
        inputPath: video.path,
        tempRoot: this.tempRoot,
        ffmpegPath: this.ffmpegPath,
        organisationLogoUrl: `${this.config.siteUrl}/logos/organization/logo-js.png`,
        classLogoUrl: selectedClass.logoUrl,
        siteUrl: this.config.siteUrl,
        supabaseUrl: this.config.url,
        signal,
        progress: (percent, message) => this.report("processing", percent, message),
      });
      cleanup = processed.cleanup;
      this.report("authorizing", 0, "Requesting a one-time signed Mux upload URL");
      const upload = await this.auth.createMuxUpload(request);
      this.report("uploading", 0, "Uploading directly to Mux");
      await uploadToMux(
        processed.outputPath,
        upload.uploadUrl,
        signal,
        (percent, message) => this.report("uploading", percent, message),
      );
      this.report("provider-processing", 100, "Mux is preparing secure adaptive playback");
      for (let attempt = 0; attempt < 240; attempt += 1) {
        if (attempt) await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            clearTimeout(timer);
            reject(new Error("Upload cancelled."));
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }, 5_000);
          signal.addEventListener("abort", onAbort, { once: true });
        });
        const status = await this.auth.getMuxUploadStatus(upload.uploadId);
        if (status.status === "failed") throw new Error("Mux could not process this video.");
        if (status.status === "ready") {
          muxAssetId = status.assetId;
          muxPlaybackId = status.playbackId;
          break;
        }
      }
      if (!muxAssetId || !muxPlaybackId) {
        throw new Error("Mux processing is taking longer than expected. Keep the upload ID and retry later.");
      }
      this.report("saving", 0, "Saving the uploaded video as a JS repository Draft");
      const finalized = await this.auth.finalizeMuxUpload(upload.uploadId, request);
      muxAssetId = finalized.assetId;
      muxPlaybackId = finalized.playbackId;
      this.report("complete", 100, "Upload complete and repository Draft saved");
      return { ok: true, message: "Video uploaded to Mux and saved as a JS repository Draft.", muxAssetId, muxPlaybackId, repositoryContentId: finalized.contentId };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Upload failed.", ...(muxAssetId ? { muxAssetId } : {}), ...(muxPlaybackId ? { muxPlaybackId } : {}) };
    } finally {
      if (cleanup) await cleanup().catch(() => undefined);
      this.controller = null;
    }
  }
}

import type { BrowserWindow } from "electron";
import { authorizeYouTube } from "./oauth";
import { processVideo, validateVideo } from "./video-processing";
import { uploadToYouTube } from "./youtube";
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
    private openExternal: (url: string) => Promise<void>,
  ) {}
  private report(phase: UploadProgress["phase"], percent: number, message: string) {
    this.window()?.webContents.send("upload:progress", { phase, percent, message } satisfies UploadProgress);
  }
  cancel() { if (!this.controller) return false; this.controller.abort(); return true; }
  async run(request: UploadRequest): Promise<UploadResult> {
    if (this.controller) return { ok: false, message: "Another upload is already running." };
    if (!this.config?.googleClientId || !this.config.youtubeChannelId) return { ok: false, message: "Google OAuth and the organization YouTube channel are not configured in this installer." };
    this.controller = new AbortController();
    const signal = this.controller.signal;
    let cleanup: (() => Promise<void>) | null = null;
    let youtubeVideoId: string | undefined;
    try {
      this.report("validating", 0, "Validating JS access and repository selections");
      const video = await validateVideo(request.videoPath);
      if (!request.title.trim() || request.title.trim().length > 100) throw new Error("Title must contain 1 to 100 characters.");
      if (!(["private", "unlisted", "public"] as const).includes(request.privacyStatus)) throw new Error("Choose a valid YouTube privacy setting.");
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
        organisationLogoUrl: `${this.config.siteUrl}/js-logo.jpeg`,
        classLogoUrl: selectedClass.logoUrl,
        siteUrl: this.config.siteUrl,
        supabaseUrl: this.config.url,
        signal,
        progress: (percent, message) => this.report("processing", percent, message),
      });
      cleanup = processed.cleanup;
      this.report("authorizing", 0, "Choose the organization Google account in your browser");
      const authorization = await authorizeYouTube({ clientId: this.config.googleClientId, expectedChannelId: this.config.youtubeChannelId }, this.openExternal, signal);
      this.report("uploading", 0, `Uploading to ${authorization.channelTitle}`);
      youtubeVideoId = await uploadToYouTube(processed.outputPath, authorization.accessToken, request, selectedClass.name, selectedRank.name, selectedTier.name, signal, (percent, message) => this.report("uploading", percent, message));
      this.report("saving", 0, "Saving the uploaded video as a JS repository Draft");
      const repositoryContentId = await this.auth.saveDraft(request, youtubeVideoId);
      this.report("complete", 100, "Upload complete and repository Draft saved");
      return { ok: true, message: "Video uploaded and saved as a JS repository Draft.", youtubeVideoId, repositoryContentId };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Upload failed.", ...(youtubeVideoId ? { youtubeVideoId } : {}) };
    } finally {
      if (cleanup) await cleanup().catch(() => undefined);
      this.controller = null;
    }
  }
}

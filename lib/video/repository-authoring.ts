type ExistingVideo = {
  video_provider: string | null;
  video_id: string | null;
};

// New videos are attached by the Mux upload pipeline. The content editor can
// preserve a managed Mux identifier, but cannot add or replace one from a URL.
export function repositoryAuthoringVideo(existing?: ExistingVideo) {
  if (!existing || (!existing.video_provider && !existing.video_id)) {
    return { provider: "", provider_video_id: "" };
  }
  if (existing.video_provider === "mux" && existing.video_id) {
    return { provider: "mux", provider_video_id: existing.video_id };
  }
  throw new Error("Legacy video records are read-only. Use JS Video Uploader for new Mux videos.");
}

export function isLegacyRepositoryVideo(existing: ExistingVideo) {
  return Boolean(existing.video_provider && existing.video_provider !== "mux");
}

export type PublicConfig = {
  url: string;
  key: string;
  environment: "Staging";
  siteUrl: string;
  googleClientId: string | null;
  youtubeChannelId: string | null;
};
export function publicConfig(value: unknown): PublicConfig | null {
  if (!value || typeof value !== "object") return null;
  const { url, key, environment, siteUrl, googleClientId, youtubeChannelId } = value as Record<string, unknown>;
  if (typeof url !== "string" || typeof key !== "string" || typeof environment !== "string" || typeof siteUrl !== "string") return null;
  // This preview is deliberately bound to the approved staging project.
  if (url !== "https://eomubndonbetszdbhsrj.supabase.co" || environment !== "Staging" || siteUrl !== "https://jingwuguanseibukan-staging.vercel.app") return null;
  if (!key.startsWith("sb_publishable_")) {
    try { if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !== "anon") return null; }
    catch { return null; }
  }
  const google = typeof googleClientId === "string" && googleClientId.trim() ? googleClientId.trim() : null;
  const channel = typeof youtubeChannelId === "string" && youtubeChannelId.trim() ? youtubeChannelId.trim() : null;
  if ((google === null) !== (channel === null)) return null;
  if (google && !/^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(google)) return null;
  if (channel && !/^UC[A-Za-z0-9_-]{22}$/.test(channel)) return null;
  return { url, key, environment: "Staging", siteUrl, googleClientId: google, youtubeChannelId: channel };
}

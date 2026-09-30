export type PublicConfig = {
  url: string;
  key: string;
  environment: "Staging";
  siteUrl: string;
};
export function publicConfig(value: unknown): PublicConfig | null {
  if (!value || typeof value !== "object") return null;
  const { url, key, environment, siteUrl } = value as Record<string, unknown>;
  if (typeof url !== "string" || typeof key !== "string" || typeof environment !== "string" || typeof siteUrl !== "string") return null;
  // This preview is deliberately bound to the approved staging project.
  if (url !== "https://eomubndonbetszdbhsrj.supabase.co" || environment !== "Staging" || siteUrl !== "https://jingwuguanseibukan-staging.vercel.app") return null;
  if (!key.startsWith("sb_publishable_")) {
    try { if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !== "anon") return null; }
    catch { return null; }
  }
  return { url, key, environment: "Staging", siteUrl };
}

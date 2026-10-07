import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthState, RepositoryClass, UploadRequest } from "./contracts";
import type { PublicConfig } from "./config";

const signedOut = (message = "Sign in with your JS account."): AuthState => ({ user: null, message });
export const makeClient = (config: PublicConfig) => createClient(config.url, config.key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000), redirect: "error" }) },
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const muxIdPattern = /^[A-Za-z0-9_-]{10,255}$/;

async function allowedUser(client: SupabaseClient): Promise<AuthState> {
  const identity = await client.auth.getUser();
  if (identity.error || !identity.data.user) throw new Error("Please sign in again.");
  const uid = identity.data.user.id;
  const [profile, active, superAdmin, scopes] = await Promise.all([
    client.from("profiles").select("full_name,account_status,date_of_passing,must_change_password").eq("id", uid).single(),
    client.rpc("is_active_app_user"),
    client.rpc("is_super_admin"),
    client.rpc("get_my_repository_upload_scopes"),
  ]);
  if (profile.error || active.error || superAdmin.error || scopes.error) throw new Error("Unable to verify account access. Try signing in again.");
  if (!profile.data || active.data !== true || profile.data.account_status !== "active" || profile.data.date_of_passing) throw new Error("This account is not active. Contact your JS administrator.");
  if (profile.data.must_change_password) throw new Error("Change your password in the JS Super App, then sign in here again.");
  const permittedIds = (scopes.data ?? []).map((item: Record<string, unknown>) => String(item.class_id));
  if (!permittedIds.length) throw new Error("An active Repository Uploader appointment is required. Contact your JS Super Admin.");
  const [classes, ranks] = await Promise.all([
    client.from("classes").select("id,name,logo_url").in("id", permittedIds).eq("is_active", true).order("name"),
    client.from("ranks").select("id,class_id,name,sort_order").in("class_id", permittedIds).order("sort_order"),
  ]);
  if (classes.error || ranks.error) throw new Error("Unable to load repository choices. Try signing in again.");
  const rankIds = (ranks.data ?? []).map(item => String(item.id));
  const tiers = rankIds.length
    ? await client.from("sub_ranks").select("id,rank_id,name,sort_order").in("rank_id", rankIds).order("sort_order")
    : { data: [], error: null };
  if (tiers.error) throw new Error("Unable to load repository choices. Try signing in again.");
  const catalog: RepositoryClass[] = (classes.data ?? []).map(item => ({
    id: String(item.id),
    name: String(item.name),
    logoUrl: typeof item.logo_url === "string" && item.logo_url ? item.logo_url : null,
    ranks: (ranks.data ?? []).filter(rank => String(rank.class_id) === String(item.id)).map(rank => ({
      id: String(rank.id),
      name: String(rank.name),
      sortOrder: Number(rank.sort_order),
      tiers: (tiers.data ?? []).filter(tier => String(tier.rank_id) === String(rank.id)).map(tier => ({
        id: String(tier.id), name: String(tier.name), sortOrder: Number(tier.sort_order),
      })),
    })),
  }));
  return {
    user: {
      name: profile.data.full_name || "JS Repository Uploader",
      role: superAdmin.data === true ? "Super Admin" : "Repository Uploader",
      classes: catalog,
    },
    message: "Repository upload access verified",
  };
}

export class DesktopAuth {
  private client: SupabaseClient | null = null;
  private generation = 0;
  private state = signedOut();
  private refreshing: Promise<AuthState> | null = null;
  constructor(private config: PublicConfig | null, private factory = makeClient) {}
  private async release(client: SupabaseClient | null) {
    if (!client) return;
    client.auth.stopAutoRefresh();
    try { await client.auth.signOut({ scope: "local" }); } catch { /* memory-only session is discarded regardless */ }
  }
  async signIn(email: unknown, password: unknown): Promise<AuthState> {
    if (!this.config) return signedOut("This installer is not configured for sign-in.");
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || email.length > 320 || !password || password.length > 4096) return signedOut("Enter your email and password.");
    const generation = ++this.generation;
    const previous = this.client;
    const client = this.factory(this.config);
    this.client = client;
    this.state = signedOut("Signing in…");
    void this.release(previous);
    try {
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw new Error("Sign-in failed. Check your email, password and connection.");
      const state = await allowedUser(client);
      if (generation !== this.generation) { await this.release(client); return this.state; }
      this.state = state;
      return state;
    } catch (error) {
      await this.release(client);
      if (generation === this.generation) {
        this.client = null;
        this.state = signedOut(error instanceof Error && /^(Sign-in failed|Please sign in|Unable to verify|Unable to load|This account|Change your password|An active Repository Uploader)/.test(error.message) ? error.message : "Unable to verify access. Check your connection and sign in again.");
      }
      return this.state;
    }
  }
  async refresh(): Promise<AuthState> {
    if (!this.client || !this.state.user) return this.state;
    if (this.refreshing) return this.refreshing;
    const client = this.client, generation = this.generation;
    this.refreshing = (async () => {
      try {
        const next = await allowedUser(client);
        if (generation === this.generation) this.state = next;
      } catch {
        if (generation === this.generation) {
          this.client = null;
          this.state = signedOut("Access could not be verified. Please sign in again.");
        }
        await this.release(client);
      }
      return this.state;
    })();
    try { return await this.refreshing; } finally { this.refreshing = null; }
  }
  async signOut(): Promise<AuthState> {
    ++this.generation;
    const client = this.client;
    this.client = null;
    this.state = signedOut();
    await this.release(client);
    return this.state;
  }

  private async accessToken() {
    if (!this.client || !this.state.user) throw new Error("Please sign in again.");
    const { data: { session }, error } = await this.client.auth.getSession();
    if (error || !session?.access_token) throw new Error("Please sign in again.");
    return session.access_token;
  }

  private async muxApi(path: string, init: RequestInit) {
    if (!this.config) throw new Error("This installer is not configured for Mux.");
    const accessToken = await this.accessToken();
    const response = await fetch(`${this.config.siteUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Origin: this.config.siteUrl,
        "Content-Type": "application/json",
        ...init.headers,
      },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The Super App could not authorize Mux.");
    return result;
  }

  async createMuxUpload(request: UploadRequest) {
    const result = await this.muxApi("/api/repository/mux/uploads", {
      method: "POST",
      body: JSON.stringify({
        classId: request.classId,
        rankId: request.rankId,
        tierId: request.tierId,
        title: request.title.trim(),
      }),
    });
    if (!muxIdPattern.test(String(result.uploadId)) || typeof result.uploadUrl !== "string") {
      throw new Error("The Super App returned an invalid Mux upload session.");
    }
    return { uploadId: String(result.uploadId), uploadUrl: result.uploadUrl };
  }

  async getMuxUploadStatus(uploadId: string) {
    if (!muxIdPattern.test(uploadId)) throw new Error("Mux upload identifier is invalid.");
    const result = await this.muxApi(`/api/repository/mux/uploads/${encodeURIComponent(uploadId)}`, { method: "GET" });
    if (result.status === "processing" || result.status === "failed") {
      return { status: result.status as "processing" | "failed" };
    }
    if (result.status === "ready" && muxIdPattern.test(String(result.assetId)) && muxIdPattern.test(String(result.playbackId))) {
      return { status: "ready" as const, assetId: String(result.assetId), playbackId: String(result.playbackId) };
    }
    throw new Error("The Super App returned an invalid Mux processing status.");
  }

  async finalizeMuxUpload(uploadId: string, request: UploadRequest) {
    if (!muxIdPattern.test(uploadId)) throw new Error("Mux upload identifier is invalid.");
    if (![request.classId, request.rankId, request.tierId].every(value => uuidPattern.test(value))) throw new Error("The repository selection is invalid.");
    const title = request.title.trim();
    if (!title || title.length > 100) throw new Error("Title must contain 1 to 100 characters.");
    const description = request.description.trim();
    const section = request.section.trim();
    const repositoryDescription = [section ? `Section: ${section}` : "", description].filter(Boolean).join("\n\n");
    if (repositoryDescription.length > 5000) throw new Error("Description and section must be 5,000 characters or fewer.");
    if (!Number.isSafeInteger(request.sortOrder) || request.sortOrder < 0 || request.sortOrder > 1_000_000) throw new Error("Sort order is invalid.");
    const result = await this.muxApi(`/api/repository/mux/uploads/${encodeURIComponent(uploadId)}`, {
      method: "POST",
      body: JSON.stringify({
        classId: request.classId,
        rankId: request.rankId,
        tierId: request.tierId,
        title,
        description,
        section,
        sortOrder: request.sortOrder,
      }),
    });
    if (
      result.status !== "complete" || typeof result.contentId !== "string" ||
      !muxIdPattern.test(String(result.assetId)) || !muxIdPattern.test(String(result.playbackId))
    ) throw new Error("Mux upload completed, but the JS repository Draft could not be saved. Keep the Mux Asset ID shown for recovery.");
    return {
      contentId: result.contentId,
      assetId: String(result.assetId),
      playbackId: String(result.playbackId),
    };
  }
}

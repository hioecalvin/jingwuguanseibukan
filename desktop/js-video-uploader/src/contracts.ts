export type RepositoryTier = { id: string; name: string; sortOrder: number };
export type RepositoryRank = { id: string; name: string; sortOrder: number; tiers: RepositoryTier[] };
export type RepositoryClass = { id: string; name: string; logoUrl: string | null; ranks: RepositoryRank[] };
export type UploaderUser = {
  name: string;
  role: "Repository Uploader" | "Super Admin";
  classes: RepositoryClass[];
};
export type ShellInfo = {
  name: string;
  version: string;
  platform: "win32";
  stage: "G";
  configured: boolean;
  youtubeConfigured: boolean;
  environment: string;
};
export type AuthState = { user: UploaderUser | null; message: string };
export type VideoSelection = { path: string; name: string; size: number } | null;
export type UploadRequest = {
  videoPath: string;
  classId: string;
  rankId: string;
  tierId: string;
  title: string;
  description: string;
  section: string;
  sortOrder: number;
  privacyStatus: "private" | "unlisted" | "public";
};
export type UploadProgress = {
  phase: "validating" | "processing" | "authorizing" | "uploading" | "saving" | "complete";
  percent: number;
  message: string;
};
export type UploadResult = {
  ok: boolean;
  message: string;
  youtubeVideoId?: string;
  repositoryContentId?: string;
};
export type DesktopBridge = {
  getShellInfo: () => Promise<ShellInfo>;
  signIn: (email: string, password: string) => Promise<AuthState>;
  refreshAccess: () => Promise<AuthState>;
  signOut: () => Promise<AuthState>;
  selectVideo: () => Promise<VideoSelection>;
  uploadVideo: (request: UploadRequest) => Promise<UploadResult>;
  cancelUpload: () => Promise<boolean>;
  onUploadProgress: (listener: (progress: UploadProgress) => void) => () => void;
};
declare global { interface Window { jsUploader: DesktopBridge } }

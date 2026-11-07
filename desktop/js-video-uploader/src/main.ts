import { app, BrowserWindow, ipcMain, session, dialog, type IpcMainInvokeEvent } from "electron";
import { readFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { DesktopAuth } from "./auth";
import { publicConfig } from "./config";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { trustedFrame, windowSecurity } from "./security";
import type { ShellInfo } from "./contracts";
import type { UploadRequest } from "./contracts";
import { UploaderService } from "./uploader";

app.setName("JS Video Uploader");
const hasLock = app.requestSingleInstanceLock();
let window: BrowserWindow | null = null;
if (!hasLock) app.quit();
else {
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.whenReady().then(async () => {
    if (process.platform !== "win32") {
      dialog.showErrorBox("Windows required", "JS Video Uploader is available for Windows only.");
      app.quit(); return;
    }
    app.setAppUserModelId("org.jingwuguanseibukan.video-uploader");
    const page = pathToFileURL(join(__dirname, "renderer", "index.html")).href;
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    // Only the main process talks to Supabase. The renderer cannot make network requests.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_details, callback) => callback({ cancel: true }));
    window = new BrowserWindow({
      width: 1080, height: 790, minWidth: 760, minHeight: 620,
      show: false, backgroundColor: "#10151b", title: "JS Video Uploader",
      autoHideMenuBar: true,
      webPreferences: { ...windowSecurity, preload: join(__dirname, "preload.cjs") },
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", event => event.preventDefault());
    window.webContents.on("will-attach-webview", event => event.preventDefault());
    const config = publicConfig(JSON.parse(readFileSync(join(__dirname, "public-config.json"), "utf8")));
    const auth = new DesktopAuth(config);
    const tempRoot = join(app.getPath("temp"), "JSVideoUploader");
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(tempRoot, { recursive: true });
    const ffmpegPath = app.isPackaged
      ? join(process.resourcesPath, "ffmpeg", "ffmpeg.exe")
      : join(__dirname, "..", "node_modules", "ffmpeg-static", "ffmpeg.exe");
    const uploader = new UploaderService(auth, config, () => window, tempRoot, ffmpegPath);
    const validate = (event: IpcMainInvokeEvent) => {
      if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !trustedFrame(event.senderFrame?.url, page)) {
        throw new Error("Untrusted application frame.");
      }
    };
    ipcMain.handle("shell:info", (event): ShellInfo => {
      validate(event);
      return { name: app.getName(), version: app.getVersion(), platform: "win32", stage: "G", configured: !!config, provider: "Mux", environment: config?.environment ?? "Unconfigured" };
    });
    ipcMain.handle("auth:sign-in", (event, email: unknown, password: unknown) => { validate(event); return auth.signIn(email, password); });
    ipcMain.handle("auth:refresh", event => { validate(event); return auth.refresh(); });
    ipcMain.handle("auth:sign-out", event => { validate(event); return auth.signOut(); });
    ipcMain.handle("video:select", async event => {
      validate(event);
      if (!window) return null;
      const result = await dialog.showOpenDialog(window, {
        title: "Select a video",
        properties: ["openFile"],
        filters: [{ name: "Video files", extensions: ["mp4", "mov", "m4v", "avi", "mkv", "webm"] }],
      });
      if (result.canceled || result.filePaths.length !== 1) return null;
      const { validateVideo } = await import("./video-processing");
      return validateVideo(result.filePaths[0]);
    });
    ipcMain.handle("upload:run", (event, request: UploadRequest) => { validate(event); return uploader.run(request); });
    ipcMain.handle("upload:cancel", event => { validate(event); return uploader.cancel(); });
    window.once("ready-to-show", () => window?.show());
    window.on("closed", () => { window = null; });
    await window.loadFile(join(__dirname, "renderer", "index.html"));
  }).catch(() => {
    dialog.showErrorBox("Unable to start", "JS Video Uploader could not start. Please reinstall the application.");
    app.exit(1);
  });
  app.on("window-all-closed", () => app.quit());
}

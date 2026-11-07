import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge, UploadProgress, UploadRequest } from "./contracts";
const bridge: DesktopBridge = Object.freeze({
  getShellInfo: () => ipcRenderer.invoke("shell:info"),
  signIn: (email: string, password: string) => ipcRenderer.invoke("auth:sign-in", email, password),
  refreshAccess: () => ipcRenderer.invoke("auth:refresh"),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  selectVideo: () => ipcRenderer.invoke("video:select"),
  uploadVideo: (request: UploadRequest) => ipcRenderer.invoke("upload:run", request),
  cancelUpload: () => ipcRenderer.invoke("upload:cancel"),
  onUploadProgress: (listener: (progress: UploadProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: UploadProgress) => listener(value);
    ipcRenderer.on("upload:progress", handler);
    return () => ipcRenderer.removeListener("upload:progress", handler);
  },
});
contextBridge.exposeInMainWorld("jsUploader", bridge);

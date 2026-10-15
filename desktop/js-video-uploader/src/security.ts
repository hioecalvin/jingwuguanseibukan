export function trustedFrame(frameUrl: string | undefined, expectedUrl: string): boolean {
  return typeof frameUrl === "string" && frameUrl === expectedUrl;
}
export const windowSecurity = Object.freeze({
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
});

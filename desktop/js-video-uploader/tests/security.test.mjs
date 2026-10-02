import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({ entryPoints: ["src/security.ts"], bundle: true, platform: "node", format: "esm", write: false });
const { trustedFrame, windowSecurity } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
test("IPC trusts only the exact local document", () => {
  const expected = "file:///app/dist/renderer/index.html";
  assert.equal(trustedFrame(expected, expected), true);
  for (const url of [undefined, "https://example.com", "file:///app/other.html", expected + "?injected=1", expected + "/child"]) assert.equal(trustedFrame(url, expected), false);
});
test("renderer is sandboxed without Node or webview access", () => {
  assert.equal(windowSecurity.sandbox, true);
  assert.equal(windowSecurity.contextIsolation, true);
  assert.equal(windowSecurity.nodeIntegration, false);
  assert.equal(windowSecurity.webSecurity, true);
  assert.equal(windowSecurity.webviewTag, false);
});

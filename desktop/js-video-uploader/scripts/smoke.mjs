import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
const executablePath = process.env.DESKTOP_TEST_EXE;
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: ["."] }), env, timeout: 30000 });
try {
  const page = await app.firstWindow();
  await page.getByRole("heading", { name: "JS Video Uploader", exact: true }).waitFor();
  await page.getByRole("status").filter({ hasText: /Sign in with|not configured/ }).waitFor();
  const info = await page.evaluate(() => window.jsUploader.getShellInfo());
  assert.equal(await page.getByRole("button", { name: /Sign in/ }).isDisabled(), !info.configured);
  const security = await page.evaluate(() => ({ node: typeof window.require, process: typeof window.process, bridge: Object.keys(window.jsUploader) }));
  assert.deepEqual(security, { node: "undefined", process: "undefined", bridge: ["getShellInfo", "signIn", "refreshAccess", "signOut", "selectVideo", "uploadVideo", "cancelUpload", "onUploadProgress"] });
  assert.equal(await page.evaluate(() => fetch("https://example.com").then(() => true, () => false)), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  if (process.argv[2]) {
    assert.equal(info.environment, "Staging");
    const credentials = parseEnv(await readFile(process.argv[2], "utf8"));
    assert.equal(credentials.NEXT_PUBLIC_SUPABASE_URL, "https://eomubndonbetszdbhsrj.supabase.co");
    for (const [role, email] of [["MEMBER", "0101@dummy.jingwuguan.test"], ["ADMIN", "0002@dummy.jingwuguan.test"], ["SUPER", "0001@dummy.jingwuguan.test"]]) {
      assert.equal(credentials[`SECURITY_TEST_${role}_EMAIL`], email);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(credentials[`SECURITY_TEST_${role}_PASSWORD`]);
      await page.getByRole("button", { name: "Sign in to JS Super App" }).click();
      if (role !== "SUPER") {
        await page.getByRole("status").filter({ hasText: "Repository Uploader appointment" }).waitFor({ timeout: 30000 });
        assert.equal(await page.getByLabel("Password", { exact: true }).inputValue(), "");
      } else {
        await page.getByLabel("Class").waitFor({ timeout: 30000 });
        assert.equal(await page.getByLabel("Class").locator("option").count(), 5);
        await page.getByRole("button", { name: "Sign out", exact: true }).click();
        await page.getByRole("status").filter({ hasText: "Sign in with your JS account" }).waitFor();
        assert.equal(await page.getByLabel("Class").count(), 0);
      }
    }
    console.log("PASS: desktop UI rejects unappointed accounts, loads Super Admin repository scopes, clears passwords and signs out.");
  }
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: resolve("test-results", executablePath ? "packaged-shell.png" : "desktop-shell.png") });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(760, 620));
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  console.log("PASS: login UI loads, preload works, Node hidden, renderer network blocked, layouts fit.");
} catch (error) {
  const page = await app.firstWindow();
  console.error("Desktop status:", await page.getByRole("status").textContent());
  throw error;
} finally { await app.close(); }

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  PROTECTED_STAGING_ENV_FILE,
  STAGING_BROWSER_CONFIRMATION,
  STAGING_SECURITY_ACCOUNTS,
  stagingBrowserEnvironment,
  validateStagingBrowserInvocation,
} from "./staging-browser-target.mjs";

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);

if (argv.length !== 1 || argv[0] !== STAGING_BROWSER_CONFIRMATION) {
  throw new Error(`Run only with the exact ${STAGING_BROWSER_CONFIRMATION} confirmation flag.`);
}
if (!existsSync(PROTECTED_STAGING_ENV_FILE)) {
  throw new Error("The protected staging environment file is missing.");
}

for (const name of ["NEXT_PUBLIC_SITE_URL", "STAGING_PROJECT_REF", "NEXT_PUBLIC_SUPABASE_URL",
  ...Object.keys(STAGING_SECURITY_ACCOUNTS).flatMap((role) => [
    `SECURITY_TEST_${role}_EMAIL`,
    `SECURITY_TEST_${role}_PASSWORD`,
  ])]) delete process.env[name];

try {
  loadEnvFile(PROTECTED_STAGING_ENV_FILE);
} catch {
  throw new Error("The protected staging environment file could not be loaded.");
}

validateStagingBrowserInvocation(argv, process.env);
const environment = stagingBrowserEnvironment(process.env);
const outputDirectory = mkdtempSync(join(tmpdir(), "jwg-staging-browser-"));
environment.STAGING_BROWSER_OUTPUT_DIR = outputDirectory;
const child = spawn(process.execPath, [
  require.resolve("@playwright/test/cli"),
  "test",
  "--config=playwright.staging.config.ts",
], {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
  windowsHide: true,
});

child.once("error", () => {
  rmSync(outputDirectory, { recursive: true, force: true });
  console.error("Unable to start the guarded staging browser suite.");
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  // Playwright error contexts can contain the current value of form controls.
  // Staging credentials must never remain in repository or temporary artifacts.
  rmSync(outputDirectory, { recursive: true, force: true });
  process.exitCode = signal ? 1 : (code ?? 1);
});

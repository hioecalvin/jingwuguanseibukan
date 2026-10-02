import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BROWSER_SMOKE_DIST_DIR, smokeEnvironment, runtimeFingerprint, assertSmokeBuild, MOCK_BACKEND_ORIGIN } from './browser-smoke-config.mjs';
import { readSmokeTls } from './browser-smoke-tls.mjs';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const forwarded = args.filter(arg => arg !== '--skip-build');
if (forwarded.some(arg => !/^--project=(chromium-desktop|chromium-tablet|chromium-mobile|firefox-desktop|webkit-desktop|webkit-tablet|webkit-mobile)$/.test(arg))) {
  throw new Error('Only --skip-build and the documented --project= names are accepted; target/config overrides are forbidden.');
}
const env = smokeEnvironment();
readSmokeTls(env); // Fail before build/browser/network work if TLS input is invalid.
async function run(file, argumentsList) {
  const child = spawn(process.execPath, [file, ...argumentsList], { env, stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
  });
  if (code !== 0) process.exit(code);
}
const selectedProjects = forwarded.filter(arg => arg.startsWith('--project='));
// An explicit engine run should fail once with a host-level diagnosis instead of
// producing one misleading application failure for every spec.
if (selectedProjects.length > 0) {
  await run(fileURLToPath(new URL('./browser-host-preflight.mjs', import.meta.url)), selectedProjects);
}
if (!skipBuild) {
  await run(require.resolve('next/dist/bin/next'), ['build']);
  fs.writeFileSync(`${BROWSER_SMOKE_DIST_DIR}/browser-smoke-build.json`, JSON.stringify({ backend: MOCK_BACKEND_ORIGIN, fingerprint: runtimeFingerprint() }));
} else assertSmokeBuild();
await run(require.resolve('@playwright/test/cli'), ['test', ...forwarded]);

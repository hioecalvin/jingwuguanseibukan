import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { smokeOrigins, smokeTlsFiles } from './browser-smoke-tls.mjs';

export const APP_ORIGIN = smokeOrigins().app;
export const NAV_ORIGIN = smokeOrigins().navigation;
export const MOCK_BACKEND_ORIGIN = 'http://127.0.0.1:54321';
export const MOCK_PUBLIC_KEY = 'sb_publishable_local_build_placeholder';
export const BROWSER_SMOKE_DIST_DIR = '.next-browser-smoke';

// No inherited application/test/provider credentials, browser profiles or target
// URLs. These are fictional credentials and the backend is always intercepted.
export function smokeEnvironment(inherited = process.env) {
  const tls = smokeTlsFiles(inherited);
  const safe = {};
  for (const [name, value] of Object.entries(inherited)) {
    if (/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LOCALAPPDATA|APPDATA|CI|PLAYWRIGHT_BROWSERS_PATH)$/i.test(name) && value !== undefined) safe[name] = value;
  }
  return {
    ...safe,
    ...(tls ? {
      BROWSER_SMOKE_HTTPS: '1',
      BROWSER_SMOKE_TLS_CERT_FILE: tls.cert,
      BROWSER_SMOKE_TLS_KEY_FILE: tls.key,
      BROWSER_SMOKE_TLS_CA_FILE: tls.ca,
      // Adds this explicitly supplied public CA for child Node processes only.
      // Browser trust must be configured separately with operator approval.
      NODE_EXTRA_CA_CERTS: tls.ca,
    } : {}),
    BROWSER_SMOKE_MODE: 'isolated-local',
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: MOCK_BACKEND_ORIGIN,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: MOCK_PUBLIC_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
    SUPABASE_SECRET_KEY: 'local-validation-only',
    SUPABASE_SERVICE_ROLE_KEY: 'local-validation-only',
    RESEND_API_KEY: 're_local_validation_only',
    EMAIL_FROM_ADDRESS: 'fixture@example.invalid', EMAIL_FROM_NAME: 'Local fixture',
    EMAIL_WORKER_SECRET: 'disabled-local-worker', PUSH_API_SECRET: 'disabled-local-push',
    VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: 'mailto:fixture@example.invalid',
  };
}

export function assertSmokeEnvironment(env = process.env) {
  const tls = smokeTlsFiles(env);
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ||
      env.NODE_EXTRA_CA_CERTS !== (tls?.ca)) {
    throw new Error('Refusing modified TLS verification or unapproved Node trust input.');
  }
  if (env.BROWSER_SMOKE_MODE !== 'isolated-local' ||
      env.NEXT_PUBLIC_SUPABASE_URL !== MOCK_BACKEND_ORIGIN ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== MOCK_PUBLIC_KEY ||
      env.SUPABASE_SECRET_KEY !== 'local-validation-only' ||
      env.SUPABASE_SERVICE_ROLE_KEY !== 'local-validation-only') {
    throw new Error('Refusing browser smoke tests without the isolated local configuration. Use npm run test:browser.');
  }
}

export function runtimeFingerprint(root = process.cwd()) {
  const digest = crypto.createHash('sha256');
  function visit(relative) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) return;
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Refusing linked runtime source in smoke build');
    if (fs.statSync(file).isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.posix.join(relative, name));
    } else digest.update(relative).update('\0').update(fs.readFileSync(file)).update('\0');
  }
  for (const relative of ['app', 'components', 'lib', 'public', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'package.json', 'package-lock.json']) visit(relative);
  return digest.digest('hex');
}

export function assertSmokeBuild(root = process.cwd()) {
  const marker = JSON.parse(fs.readFileSync(path.join(root, BROWSER_SMOKE_DIST_DIR, 'browser-smoke-build.json'), 'utf8'));
  if (marker.backend !== MOCK_BACKEND_ORIGIN || marker.fingerprint !== runtimeFingerprint(root)) {
    throw new Error('Smoke build is stale or not isolated; rerun npm run test:browser.');
  }
}

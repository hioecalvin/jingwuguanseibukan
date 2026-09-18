import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { APP_ORIGIN, BROWSER_SMOKE_DIST_DIR, NAV_ORIGIN, MOCK_BACKEND_ORIGIN, smokeEnvironment, assertSmokeEnvironment } from './browser-smoke-config.mjs';

function productionConfig(overrides = {}) {
  const probe = [
    "import('./next.config.ts')",
    ".then(async ({ default: config }) => {",
    "const headers = await config.headers();",
    "const csp = headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;",
    "process.stdout.write(JSON.stringify({ csp, distDir: config.distDir }));",
    "})",
  ].join('');
  const env = { ...process.env, NODE_ENV: 'production', ...overrides };
  if (!Object.hasOwn(overrides, 'BROWSER_SMOKE_MODE')) delete env.BROWSER_SMOKE_MODE;
  const result = spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '--eval', probe], {
    cwd: process.cwd(), env, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('browser smoke targets are fixed loopback origins', () => {
  for (const origin of [APP_ORIGIN, NAV_ORIGIN, MOCK_BACKEND_ORIGIN]) {
    const url = new URL(origin);
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.protocol, 'http:');
    assert.equal(url.username, '');
  }
});

test('browser smoke environment drops real credentials and target overrides', () => {
  const env = smokeEnvironment({ PATH: 'node-path', SystemRoot: 'system-root', CI: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://production.invalid', SUPABASE_SECRET_KEY: 'private-real-value', SECURITY_TEST_MEMBER_PASSWORD: 'private-password', RESEND_API_KEY: 'private-provider-value', NODE_OPTIONS: '--require untrusted', HTTPS_PROXY: 'private-proxy', BASE_URL: 'https://production.invalid' });
  assert.equal(env.PATH, 'node-path');
  assert.equal(env.SystemRoot, 'system-root');
  assert.equal(env.CI, 'true');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, MOCK_BACKEND_ORIGIN);
  assert.equal(env.SECURITY_TEST_MEMBER_PASSWORD, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.HTTPS_PROXY, undefined);
  assert.equal(env.BASE_URL, undefined);
  assert.doesNotMatch(JSON.stringify(env), /private-/);
  assert.doesNotThrow(() => assertSmokeEnvironment(env));
});

test('direct browser runs reject missing isolation or modified credentials/targets', () => {
  assert.throws(() => assertSmokeEnvironment({}), /Refusing/);
  for (const key of ['BROWSER_SMOKE_MODE', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    assert.throws(() => assertSmokeEnvironment({ ...smokeEnvironment({}), [key]: 'wrong' }), /Refusing/);
  }
});

test('production CSP upgrades insecure requests except in the fixed local browser harness', () => {
  const upgrade = /(?:^|; )upgrade-insecure-requests(?:;|$)/;
  const production = productionConfig();
  assert.match(production.csp, upgrade);
  assert.equal(production.distDir, undefined);
  assert.match(productionConfig({ BROWSER_SMOKE_MODE: 'isolated-local' }).csp, upgrade);
  assert.match(productionConfig({
    BROWSER_SMOKE_MODE: 'isolated-local',
    NEXT_PUBLIC_SUPABASE_URL: 'https://production.invalid',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_build_placeholder',
  }).csp, upgrade);
  const isolated = productionConfig({
    BROWSER_SMOKE_MODE: 'isolated-local',
    NEXT_PUBLIC_SUPABASE_URL: MOCK_BACKEND_ORIGIN,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_build_placeholder',
  });
  assert.doesNotMatch(isolated.csp, upgrade);
  assert.equal(isolated.distDir, BROWSER_SMOKE_DIST_DIR);
});

test('production CSP permits the embedded React-PDF WebAssembly engine without general eval', () => {
  const { csp } = productionConfig();
  const directives = new Map(csp.split('; ').map(directive => {
    const [name, ...values] = directive.split(' ');
    return [name, values];
  }));
  const scripts = directives.get('script-src') ?? [];
  const connections = directives.get('connect-src') ?? [];
  assert(scripts.includes("'wasm-unsafe-eval'"));
  assert(!scripts.includes("'unsafe-eval'"));
  assert(connections.includes('data:'));
});

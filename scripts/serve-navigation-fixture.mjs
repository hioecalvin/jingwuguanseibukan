import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { BROWSER_SMOKE_DIST_DIR, NAV_ORIGIN, assertSmokeEnvironment, assertSmokeBuild } from './browser-smoke-config.mjs';
import { readSmokeTls } from './browser-smoke-tls.mjs';

assertSmokeEnvironment();
assertSmokeBuild();
const tls = readSmokeTls();
const root = process.cwd();
const fixtureRoot = path.join(root, 'tests/browser/fixtures');
async function bundleFixture(entry, supabaseFixture) {
  return build({
    entryPoints: [path.join(fixtureRoot, entry)], bundle: true, write: false,
    jsx: 'automatic', platform: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: {
      'next/link': path.join(fixtureRoot, 'next-link.tsx'),
      'next/image': path.join(fixtureRoot, 'next-image.tsx'),
      'next/navigation': path.join(fixtureRoot, 'next-navigation.ts'),
      '@/lib/supabase/client': path.join(fixtureRoot, supabaseFixture),
    },
  });
}
const navigationBundle = await bundleFixture('navigation.tsx', 'supabase.ts');
const enrollmentBundle = await bundleFixture('enrollment.tsx', 'enrollment-supabase.ts');
const adminExportsBundle = await bundleFixture('admin-exports.tsx', 'admin-exports-supabase.ts');
const assets = new Map([
  ['/fixture.js', { type: 'text/javascript', data: navigationBundle.outputFiles[0].contents }],
  ['/enrollment-fixture.js', { type: 'text/javascript', data: enrollmentBundle.outputFiles[0].contents }],
  ['/admin-exports-fixture.js', { type: 'text/javascript', data: adminExportsBundle.outputFiles[0].contents }],
]);
function collectCss(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collectCss(file);
    else if (entry.name.endsWith('.css')) assets.set(`/fixture-style-${assets.size}.css`, { type: 'text/css', data: fs.readFileSync(file) });
  }
}
collectCss(path.join(root, BROWSER_SMOKE_DIST_DIR, 'static'));
const cssLinks = [...assets.keys()].filter(name => name.endsWith('.css')).map(name => `<link rel="stylesheet" href="${name}">`).join('');
function fixtureHtml(pathname) {
  const enrollment = pathname === '/enrollment';
  const adminExports = pathname.startsWith('/admin-');
  const title = enrollment ? 'Pending approval workflow fixture' : adminExports ? 'Admin export workflow fixture' : 'Navigation component fixture';
  const script = enrollment ? '/enrollment-fixture.js' : adminExports ? '/admin-exports-fixture.js' : '/fixture.js';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${cssLinks}</head><body class="bg-neutral-950 text-neutral-100"><div id="fixture-root"></div><script src="${script}"></script></body></html>`;
}
const handler = (req, res) => {
  const url = new URL(req.url, NAV_ORIGIN);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const asset = assets.get(url.pathname);
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'" };
  if (asset) { res.writeHead(200, { ...headers, 'Content-Type': asset.type }).end(asset.data); return; }
  if (url.pathname.startsWith('/_next/')) { res.writeHead(404, headers).end(); return; }
  res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }).end(fixtureHtml(url.pathname));
};
const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
server.listen(3101, '127.0.0.1', () => console.log(`Presentation-only navigation fixture on ${NAV_ORIGIN}`));

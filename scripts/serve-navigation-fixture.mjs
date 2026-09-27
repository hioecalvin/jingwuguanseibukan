import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { build, stop } from 'esbuild';
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
const adminSchedulesBundle = await bundleFixture('admin-schedules.tsx', 'admin-schedules-supabase.ts');
const adminAssessmentsBundle = await bundleFixture('admin-assessments.tsx', 'admin-assessments-supabase.ts');
const adminMemorialBundle = await bundleFixture('admin-memorial.tsx', 'supabase.ts');
const adminLastTrainingBundle = await bundleFixture('admin-last-training.tsx', 'admin-last-training-supabase.ts');
const adminDirectPaymentBundle = await bundleFixture('admin-direct-payment.tsx', 'admin-direct-payment-supabase.ts');
const adminPaymentReviewBundle = await bundleFixture('admin-payment-review.tsx', 'admin-payment-review-supabase.ts');
const adminSettlementsBundle = await bundleFixture('admin-settlements.tsx', 'admin-settlements-supabase.ts');
const profileContactBundle = await bundleFixture('profile-contact.tsx', 'profile-contact-supabase.ts');
const assets = new Map([
  ['/fixture.js', { type: 'text/javascript', data: navigationBundle.outputFiles[0].contents }],
  ['/enrollment-fixture.js', { type: 'text/javascript', data: enrollmentBundle.outputFiles[0].contents }],
  ['/admin-exports-fixture.js', { type: 'text/javascript', data: adminExportsBundle.outputFiles[0].contents }],
  ['/admin-schedules-fixture.js', { type: 'text/javascript', data: adminSchedulesBundle.outputFiles[0].contents }],
  ['/admin-assessments-fixture.js', { type: 'text/javascript', data: adminAssessmentsBundle.outputFiles[0].contents }],
  ['/admin-memorial-fixture.js', { type: 'text/javascript', data: adminMemorialBundle.outputFiles[0].contents }],
  ['/admin-last-training-fixture.js', { type: 'text/javascript', data: adminLastTrainingBundle.outputFiles[0].contents }],
  ['/admin-direct-payment-fixture.js', { type: 'text/javascript', data: adminDirectPaymentBundle.outputFiles[0].contents }],
  ['/admin-payment-review-fixture.js', { type: 'text/javascript', data: adminPaymentReviewBundle.outputFiles[0].contents }],
  ['/admin-settlements-fixture.js', { type: 'text/javascript', data: adminSettlementsBundle.outputFiles[0].contents }],
  ['/profile-contact-fixture.js', { type: 'text/javascript', data: profileContactBundle.outputFiles[0].contents }],
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
  const adminSchedules = pathname === '/admin-schedules';
  const adminAssessments = pathname === '/admin-assessments';
  const adminMemorial = pathname === '/admin-memorial';
  const adminLastTraining = pathname === '/admin-last-training';
  const adminDirectPayment = pathname === '/admin-direct-payment';
  const adminPaymentReview = pathname === '/admin-payment-review';
  const adminSettlements = pathname === '/admin-settlements';
  const profileContact = pathname === '/profile-contact';
  const adminExports = pathname.startsWith('/admin-') && !adminSchedules && !adminAssessments && !adminMemorial && !adminLastTraining && !adminDirectPayment && !adminPaymentReview && !adminSettlements;
  const title = enrollment ? 'Pending approval workflow fixture' : adminSchedules ? 'Schedule mutation workflow fixture' : adminAssessments ? 'Assessment mutation workflow fixture' : adminMemorial ? 'Memorial workflow fixture' : adminLastTraining ? 'Last training workflow fixture' : adminDirectPayment ? 'Direct payment workflow fixture' : adminPaymentReview ? 'Payment review workflow fixture' : adminSettlements ? 'Settlement workflow fixture' : profileContact ? 'Contact self-service fixture' : adminExports ? 'Admin export workflow fixture' : 'Navigation component fixture';
  const script = enrollment ? '/enrollment-fixture.js' : adminSchedules ? '/admin-schedules-fixture.js' : adminAssessments ? '/admin-assessments-fixture.js' : adminMemorial ? '/admin-memorial-fixture.js' : adminLastTraining ? '/admin-last-training-fixture.js' : adminDirectPayment ? '/admin-direct-payment-fixture.js' : adminPaymentReview ? '/admin-payment-review-fixture.js' : adminSettlements ? '/admin-settlements-fixture.js' : profileContact ? '/profile-contact-fixture.js' : adminExports ? '/admin-exports-fixture.js' : '/fixture.js';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${cssLinks}</head><body class="bg-neutral-950 text-neutral-100"><div id="fixture-root"></div><script src="${script}"></script></body></html>`;
}
const handler = (req, res) => {
  const url = new URL(req.url, NAV_ORIGIN);
  if (req.method === 'POST' && url.pathname === '/__browser-smoke-shutdown') {
    res.writeHead(204, { Connection: 'close' }).end(() => close());
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const asset = assets.get(url.pathname);
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'" };
  if (asset) { res.writeHead(200, { ...headers, 'Content-Type': asset.type }).end(asset.data); return; }
  if (url.pathname.startsWith('/_next/')) { res.writeHead(404, headers).end(); return; }
  res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }).end(fixtureHtml(url.pathname));
};
const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
server.listen(3101, '127.0.0.1', () => console.log(`Presentation-only navigation fixture on ${NAV_ORIGIN}`));
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  server.closeAllConnections?.();
  server.close(() => stop());
}
process.once('SIGTERM', close);
process.once('SIGINT', close);

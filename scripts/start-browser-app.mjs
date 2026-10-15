import { createRequire } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import { assertSmokeEnvironment, assertSmokeBuild } from './browser-smoke-config.mjs';
import { readSmokeTls } from './browser-smoke-tls.mjs';

assertSmokeEnvironment();
assertSmokeBuild();
const require = createRequire(import.meta.url);
const tls = readSmokeTls();
const certificateFixtures = new Map([
  ['11111111-1111-4111-8111-111111111111', {
    certificate_id: '11111111-1111-4111-8111-111111111111', certificate_number: 'JSG-ISSUED-001',
    certificate_status: 'issued', member_name: 'Akira Senior', promoted_rank: 'Shodan',
    promotion_date: '2026-09-27', assessor_name: 'External Shihan', class_name: 'Fixture Aikido', dojo_name: 'Fixture Dojo',
  }],
  ['22222222-2222-4222-8222-222222222222', {
    certificate_id: '22222222-2222-4222-8222-222222222222', certificate_number: 'JSG-PENDING-002',
    certificate_status: 'pending', member_name: 'Budi Middle', promoted_rank: '2nd Kyu',
    promotion_date: '2026-09-27', assessor_name: 'Sensei Fixture', class_name: 'Fixture Aikido', dojo_name: 'Fixture Dojo',
  }],
  ['33333333-3333-4333-8333-333333333333', {
    certificate_id: '33333333-3333-4333-8333-333333333333', certificate_number: 'JSG-VOID-003',
    certificate_status: 'voided', member_name: 'Citra Junior', promoted_rank: '4th Kyu',
    promotion_date: '2026-09-27', assessor_name: 'Sensei Fixture', class_name: 'Fixture Aikido', dojo_name: 'Fixture Dojo',
  }],
]);
const mockBackend = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/rest/v1/rpc/verify_prepared_assessment_certificate') {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"message":"Not found"}');
    return;
  }
  if (req.headers.apikey !== 'local-validation-only' || req.headers.authorization !== 'Bearer local-validation-only') {
    res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"message":"Unauthorized"}');
    return;
  }
  let body = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 4096) req.destroy();
  });
  req.on('end', () => {
    let certificateId = '';
    try { certificateId = JSON.parse(body).target_certificate_id ?? ''; } catch {}
    const record = certificateFixtures.get(certificateId);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(record ? [record] : []));
  });
});
await new Promise((resolve, reject) => {
  mockBackend.once('error', reject);
  mockBackend.listen(54321, '127.0.0.1', resolve);
});
// Test-only server: uses the production build and unchanged Next router/CSP.
// No proxy, external upstream, HTTP fallback or certificate bypass is used.
const next = require('next');
const app = next({ dev: false, hostname: '127.0.0.1', port: 3100 });
await app.prepare();
const handle = app.getRequestHandler();
const handler = (req, res) => {
  if (req.method === 'POST' && req.url === '/__browser-smoke-shutdown') {
    res.writeHead(204, { Connection: 'close' }).end(() => void close());
    return;
  }
  return handle(req, res);
};
const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
server.listen(3100, '127.0.0.1', () => {
  console.log(`Isolated ${tls ? 'HTTPS' : 'HTTP'} app on 127.0.0.1:3100`);
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server.closeAllConnections?.();
  mockBackend.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => mockBackend.close(resolve));
  await app.close();
}
process.once('SIGTERM', () => void close());
process.once('SIGINT', () => void close());

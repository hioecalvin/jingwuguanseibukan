import { createRequire } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import { assertSmokeEnvironment, assertSmokeBuild } from './browser-smoke-config.mjs';
import { readSmokeTls } from './browser-smoke-tls.mjs';

assertSmokeEnvironment();
assertSmokeBuild();
const require = createRequire(import.meta.url);
const tls = readSmokeTls();
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
  await new Promise(resolve => server.close(resolve));
  await app.close();
}
process.once('SIGTERM', () => void close());
process.once('SIGINT', () => void close());

import { createRequire } from 'node:module';
import https from 'node:https';
import { assertSmokeEnvironment, assertSmokeBuild } from './browser-smoke-config.mjs';
import { readSmokeTls } from './browser-smoke-tls.mjs';

assertSmokeEnvironment();
assertSmokeBuild();
const require = createRequire(import.meta.url);
const tls = readSmokeTls();
if (tls) {
  // Test-only server: uses the production build and unchanged Next router/CSP.
  // No proxy, external upstream, HTTP fallback or certificate bypass is used.
  const next = require('next');
  const app = next({ dev: false, hostname: '127.0.0.1', port: 3100 });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = https.createServer(tls, (req, res) => handle(req, res));
  server.listen(3100, '127.0.0.1', () => console.log('Isolated HTTPS app on 127.0.0.1:3100'));
  async function close() {
    server.closeAllConnections();
    server.close();
    await app.close();
    process.exit(0);
  }
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
} else {
  process.argv = [process.execPath, require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'];
  require('next/dist/bin/next');
}

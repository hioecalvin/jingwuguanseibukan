import http from 'node:http';

// Synthetic loopback-only browser fixture. No database, credentials, persistence,
// outbound requests, account creation, or successful Auth responses.
// Use only with an app built against http://127.0.0.1:54321 and placeholder keys.
// The first classes and dojos requests fail intentionally to exercise retries.
const allowedOrigin = 'http://127.0.0.1:3100';
const counts = { classes: 0, dojos: 0, authRejected: 0, originRejected: 0, protocolErrors: 0 };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:54321');
  if (req.headers.origin && req.headers.origin !== allowedOrigin) {
    counts.originRejected++;
    res.writeHead(403).end();
    return;
  }
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  };
  const reply = (status, body) => { res.writeHead(status, headers).end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers).end(); return; }
  if (url.pathname.startsWith('/auth/')) {
    counts.authRejected++;
    req.resume(); // Deliberately do not inspect or log credentials/body.
    reply(400, { error: 'invalid_grant', error_description: 'Local fixture rejects all authentication requests.' });
    return;
  }
  if (req.method !== 'GET') { reply(405, { message: 'Read-only fixture' }); return; }
  if (url.pathname === '/rest/v1/classes') {
    counts.classes++;
    reply(counts.classes === 1 ? 503 : 200, counts.classes === 1
      ? { message: 'Synthetic catalog outage' }
      : [{ id: 'fixture-a', name: 'Fixture Karate' }, { id: 'fixture-b', name: 'Fixture Training' }]);
    return;
  }
  if (url.pathname === '/rest/v1/dojos') {
    counts.dojos++;
    reply(counts.dojos === 1 ? 503 : 200, counts.dojos === 1
      ? { message: 'Synthetic dojo outage' }
      : url.searchParams.get('class_id') === 'eq.fixture-a'
        ? [{ id: 'fixture-dojo-a', name: 'Fixture Dojo', class_id: 'fixture-a' }] : []);
    return;
  }
  if (url.pathname === '/fixture-status') { reply(200, counts); return; }
  reply(404, { message: 'Fixture endpoint not found' });
});
server.listen(54321, '127.0.0.1', () => {
  console.log('Synthetic catalog fixture listening only on 127.0.0.1:54321; Auth always rejected.');
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.on('clientError', (_error, socket) => {
  counts.protocolErrors++;
  socket.destroy();
});
process.on('SIGINT', () => server.close());

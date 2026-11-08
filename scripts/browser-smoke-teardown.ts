import http from 'node:http';
import https from 'node:https';
import { APP_ORIGIN, NAV_ORIGIN, assertSmokeEnvironment } from './browser-smoke-config.mjs';

assertSmokeEnvironment();

function shutdown(origin: string) {
  const url = new URL('/__browser-smoke-shutdown', origin);
  const request = url.protocol === 'https:' ? https.request : http.request;

  return new Promise<void>((resolve, reject) => {
    const req = request(url, {
      method: 'POST',
      agent: false,
      headers: { Connection: 'close' },
      rejectUnauthorized: true,
    }, res => {
      res.resume();
      res.once('end', () => {
        if (res.statusCode === 204) resolve();
        else reject(new Error(`Smoke server at ${origin} refused shutdown with HTTP ${res.statusCode}`));
      });
    });
    req.setTimeout(5_000, () => req.destroy(new Error(`Timed out shutting down smoke server at ${origin}`)));
    req.once('error', reject);
    req.end();
  });
}

export default async function browserSmokeTeardown() {
  // Stop both test-only servers before Playwright's webServer cleanup. On
  // Windows, restricted runners may deny taskkill even for child processes.
  await shutdown(NAV_ORIGIN);
  await shutdown(APP_ORIGIN);
}

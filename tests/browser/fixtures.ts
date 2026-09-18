import { test as base, expect, type Route } from '@playwright/test';
import { APP_ORIGIN, NAV_ORIGIN, MOCK_BACKEND_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

type ClassRow = { id: string; name: string };
type DojoRow = ClassRow & { class_id: string };
export type Backend = {
  classes: ClassRow[];
  dojos: Record<string, DojoRow[]>;
  classFailures: number;
  dojoFailures: number;
  dojoWait: Map<string, Promise<void>>;
  calls: { path: string; method: string }[];
  authCalls: number;
  signupPayload?: { email: string; data: Record<string, string | null> };
  confirmSignup: boolean;
};

export const test = base.extend<{ backend: Backend }>({
  backend: [async ({ context, page }, use) => {
    const backend: Backend = {
      classes: [{ id: 'fixture-a', name: 'Fixture Karate' }, { id: 'fixture-b', name: 'Fixture Training' }],
      dojos: {
        'fixture-a': [{ id: 'dojo-a', name: 'Fixture Dojo A', class_id: 'fixture-a' }],
        'fixture-b': [{ id: 'dojo-b', name: 'Fixture Dojo B', class_id: 'fixture-b' }],
      },
      classFailures: 0, dojoFailures: 0, dojoWait: new Map(), calls: [], authCalls: 0, confirmSignup: false,
    };
    const unexpected: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await context.route('**/*', async (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      const mockHost = new URL(MOCK_BACKEND_ORIGIN);
      if (url.hostname === mockHost.hostname && url.port === mockHost.port && ['http:', 'https:'].includes(url.protocol)) {
        // Fulfill locally, never route.fetch()/continue() to this address.
        backend.calls.push({ path: url.pathname, method: request.method() });
        const headers = { 'Access-Control-Allow-Origin': APP_ORIGIN, 'Access-Control-Expose-Headers': 'Retry-After', 'Content-Type': 'application/json', 'Retry-After': '0' };
        const reply = (status: number, body: unknown) => route.fulfill({ status, headers, body: JSON.stringify(body) });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
        if (url.pathname === '/rest/v1/classes') {
          if (backend.classFailures-- > 0) return reply(503, { message: 'Synthetic catalog outage' });
          return reply(200, backend.classes);
        }
        if (url.pathname === '/rest/v1/dojos') {
          if (backend.dojoFailures-- > 0) return reply(503, { message: 'Synthetic dojo outage' });
          const classId = url.searchParams.get('class_id')?.replace(/^eq\./, '') ?? '';
          const rows = backend.dojos[classId] ?? [];
          await backend.dojoWait.get(classId);
          return reply(200, rows);
        }
        if (url.pathname.startsWith('/auth/')) {
          backend.authCalls++;
          if (url.pathname === '/auth/v1/signup' && backend.confirmSignup) {
            backend.signupPayload = request.postDataJSON();
            return reply(200, { user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-08-31T00:00:00Z', identities: [] }, session: null });
          }
          return reply(400, { code: 'invalid_credentials', msg: 'Invalid fixture credentials' });
        }
        unexpected.push(`unmocked backend ${request.method()} ${url.pathname}`);
        return route.abort('blockedbyclient');
      }
      if ([APP_ORIGIN, NAV_ORIGIN].includes(url.origin) && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', socket => { unexpected.push('Unexpected WebSocket'); socket.close(); });
    await use(backend);
    expect(unexpected, 'No unexpected or external browser requests').toEqual([]);
    expect(pageErrors, 'No unhandled browser exceptions').toEqual([]);
  }, { auto: true }],
});

export { expect };

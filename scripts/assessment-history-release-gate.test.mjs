import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { smokeEnvironment, assertSmokeEnvironment } from './browser-smoke-config.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, dependencies = {}, env = {}) {
  const loadedModule = { exports: {} };
  const code = transformSync(read(path), { loader: path.endsWith('.tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' }).code;
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports, process: { env },
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { timeout: 1000 });
  return loadedModule.exports;
}
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

test('history release flag is server-only, default-off and requires exact explicit true', () => {
  assert.match(read('lib/features/assessment-history.ts'), /import "server-only"/);
  for (const value of [undefined, '', 'false', '0', '1', 'TRUE', ' true ', 'true']) {
    const flag = load('lib/features/assessment-history.ts', { 'server-only': {} }, { ASSESSMENT_HISTORY_ENABLED: value });
    assert.equal(flag.assessmentHistoryEnabled(), value === 'true');
  }
});

test('direct history route stops rendering before the client while disabled', () => {
  const notFound = new Error('synthetic 404');
  for (const enabled of [false, true]) {
    let renders = 0;
    const page = load('app/(member)/assessment-history/page.tsx', {
      'next/navigation': { notFound: () => { throw notFound; } },
      '@/lib/features/assessment-history': { assessmentHistoryEnabled: () => enabled },
      './assessment-history-client': { __esModule: true, default: 'history-client' },
      'react/jsx-runtime': { jsx: (...args) => { renders++; return jsx.jsx(...args); } },
    });
    assert.equal(page.dynamic, 'force-dynamic');
    if (!enabled) assert.throws(() => page.default(), error => error === notFound);
    else assert.equal(page.default().type, 'history-client');
    assert.equal(renders, enabled ? 1 : 0);
  }
});

test('navigation hides pending history for every role unless explicitly enabled', () => {
  const nav = load('lib/navigation.ts').getNavigationForRole;
  for (const role of ['member', 'admin', 'super_admin']) {
    for (const value of [undefined, false, 'true', true]) {
      assert.equal(nav(role, { assessmentHistory: value }).some(item => item.href === '/assessment-history'), value === true);
      assert.equal(nav(role, { assessmentHistory: value }).some(item => item.href === '/admin/assessments'), role === 'super_admin');
    }
    assert.equal(nav(role).some(item => item.href === '/assessment-history'), false);
  }
});

test('server layouts pass only the gate boolean and retain account/role redirects', async () => {
  const redirect = href => { throw Error(`redirect:${href}`); };
  for (const path of ['app/(member)/layout.tsx', 'app/admin/layout.tsx']) {
    for (const enabled of [false, true]) {
      const user = { role: 'super_admin', mustChangePassword: false, hasApprovedMembership: true };
      const layout = load(path, {
        'next/navigation': { redirect },
        '@/components/app-shell': { __esModule: true, default: 'shell' },
        '@/lib/auth/get-current-app-user': { getCurrentAppUser: async () => user },
        '@/lib/features/assessment-history': { assessmentHistoryEnabled: () => enabled },
        'react/jsx-runtime': jsx,
      });
      const result = await layout.default({ children: 'fixture' });
      assert.equal(result.props.assessmentHistoryEnabled, enabled);
      user.mustChangePassword = true;
      await assert.rejects(layout.default({ children: 'fixture' }), /redirect:\/change-password/);
      user.mustChangePassword = false;
      user.role = 'member';
      user.hasApprovedMembership = false;
      await assert.rejects(layout.default({ children: 'fixture' }), path.includes('(member)') ? /redirect:\/pending-approval/ : /redirect:\/$/);
    }
  }
});

test('synthetic browser environment cannot inherit or enable the pending server route', () => {
  const env = smokeEnvironment({ ASSESSMENT_HISTORY_ENABLED: 'true' });
  assert.equal(env.ASSESSMENT_HISTORY_ENABLED, 'false');
  assert.doesNotThrow(() => assertSmokeEnvironment(env));
  assert.throws(() => assertSmokeEnvironment({ ...env, ASSESSMENT_HISTORY_ENABLED: 'true' }), /isolated local configuration/);
  assert.match(read('tests/browser/fixtures/assessment-history.tsx'), /assessment-history\/assessment-history-client/);
  assert.doesNotMatch(read('tests/browser/fixtures/assessment-history.tsx'), /assessment-history\/page/);
});

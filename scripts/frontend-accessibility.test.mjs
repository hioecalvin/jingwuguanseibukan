import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const aikikaiModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/aikikai.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: aikikaiModule.exports }, { timeout: 1000 });

// Execute the real TSX handlers/effects with a deterministic hook scheduler.
// These are component-logic unit tests, NOT browser, React scheduling, or RLS tests.
function componentHarness(relativePath, supabase, extras = {}) {
  const slots = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  let effects = [];
  const element = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => {
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        dirty = true;
      }];
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useId() { return react.useState(() => `fixture-${cursor}`)[0]; },
    useMemo(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        slots[index] = { deps, value: fn() };
      }
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        slots[index]?.cleanup?.();
        slots[index] = { deps };
        effects.push(() => { slots[index].cleanup = fn(); });
      }
    },
  };
  const redirects = [];
  const dependencies = {
    react,
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    'next/image': { default: 'img' },
    'next/link': { default: 'a' },
    'next/navigation': { useRouter: () => ({ replace: href => redirects.push(href), refresh() {} }), usePathname: () => '/profile' },
    '@/lib/application-origin': { configuredApplicationOrigin: () => 'https://configured.example.test' },
    '@/lib/supabase/client': { createClient: () => supabase },
    '@/lib/aikikai': aikikaiModule.exports,
    '@/components/compact-navigation': { default: 'CompactNavigation' },
    ...extras,
  };
  const signOutModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/use-sign-out.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module: signOutModule, exports: signOutModule.exports,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { timeout: 1000 });
  dependencies['@/components/use-sign-out'] = signOutModule.exports;
  const componentModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(relativePath, 'utf8'), {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module: componentModule, exports: componentModule.exports, Error,
    window: { location: { origin: 'http://127.0.0.1:3100', search: extras.__locationSearch ?? '' }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) },
    URLSearchParams,
    fetch: extras.__fetch ?? (() => { throw new Error('Unmocked fetch'); }),
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { timeout: 1000, filename: relativePath });
  function render(props = {}) {
    cursor = 0;
    dirty = false;
    tree = componentModule.exports.default(props);
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return tree;
  }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  const find = predicate => nodes(tree).find(predicate);
  return {
    render, nodes: () => nodes(tree), redirects,
    find,
    field: id => find(node => node.props.id === id),
    change(id, value) { this.field(id).props.onChange({ target: { value } }); render(); },
    submit() { return find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); },
    text: () => JSON.stringify(tree),
    async flush() {
      for (let i = 0; i < 12; i++) {
        await Promise.resolve();
        if (dirty) render();
      }
    },
  };
}

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function registrationFixture({ classes = [{ id: 'a', name: 'Aikido' }, { id: 'b', name: 'Karate' }], classError = false, signup } = {}) {
  const queries = [];
  const signups = [];
  let failClasses = classError;
  const supabase = {
    from(table) {
      const filters = {};
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        order() {
          if (table === 'classes') return Promise.resolve({ data: classes, error: failClasses ? new Error('private database detail') : null });
          const result = deferred();
          queries.push({ ...result, filters });
          return result.promise;
        },
      };
      return query;
    },
    auth: { async signUp(value) { signups.push(value); return signup ? signup(value) : { error: null }; } },
  };
  const ui = componentHarness('app/register/page.tsx', supabase);
  ui.render();
  return { ui, queries, signups, recoverClasses() { failClasses = false; } };
}

function fillRegistration(ui) {
  for (const [id, value] of Object.entries({
    name: ' Test   Member ', 'birth-date': '2000-01-01',
    email: ' FIXTURE@EXAMPLE.INVALID ', phone: ' 123   456 ',
    password: 'FixturePassword123', 'confirm-password': 'FixturePassword123',
  })) ui.change(`register-${id}`, value);
}

test('login recovers from unexpected failures without disclosing their details', async () => {
  const ui = componentHarness('app/login/page.tsx', {}, { __fetch: async () => { throw new Error('private host detail'); } });
  ui.render();
  await ui.submit();
  await ui.flush();
  assert.match(ui.text(), /Unable to log in/);
  assert.doesNotMatch(ui.text(), /private host detail/);
  assert.equal(ui.find(node => node.type === 'button').props.disabled, false);
  assert.deepEqual(ui.redirects, []);
});

test('login blocks a second submission while a request is pending', async () => {
  const result = deferred();
  let calls = 0;
  const ui = componentHarness('app/login/page.tsx', {}, { __fetch() { calls++; return result.promise; } });
  ui.render();
  const first = ui.submit();
  await ui.flush();
  await ui.submit();
  assert.equal(calls, 1);
  result.resolve({ ok: true, json: async () => ({ success: true }) });
  await first;
  assert.deepEqual(ui.redirects, ['/']);
});

test('login sends either identifier to the same-origin endpoint and hides server error details', async () => {
  for (const identifier of [' MEMBER@EXAMPLE.INVALID ', '0101']) {
    const calls = [];
    const ui = componentHarness('app/login/page.tsx', {}, { __fetch: async (...args) => {
      calls.push(args);
      return { ok: false, status: 401, json: async () => ({ error: 'private-account@example.invalid' }) };
    } });
    ui.render();
    ui.change('login-email', identifier);
    ui.change('login-password', ' password unchanged ');
    await ui.submit();
    await ui.flush();
    assert.equal(calls[0][0], '/api/auth/login');
    assert.equal(calls[0][1].credentials, 'same-origin');
    assert.deepEqual(JSON.parse(calls[0][1].body), { identifier: identifier.trim(), password: ' password unchanged ' });
    assert.match(ui.text(), /Check your email or JS Member ID and password/);
    assert.doesNotMatch(ui.text(), /private-account/);
    assert.deepEqual(ui.redirects, []);
  }
});

test('login requires explicit success and explains rate limiting', async () => {
  for (const status of [200, 429]) {
    const ui = componentHarness('app/login/page.tsx', {}, { __fetch: async () => ({
      ok: status === 200, status, json: async () => ({}),
    }) });
    ui.render();
    await ui.submit();
    await ui.flush();
    assert.deepEqual(ui.redirects, []);
    assert.equal(ui.find(node => node.type === 'button').props.disabled, false);
    if (status === 429) assert.match(ui.text(), /Too many login attempts/);
  }
});

test('login explains verified and disabled account redirects without reflecting input', async () => {
  const verified = componentHarness(
    'app/login/page.tsx',
    { auth: { signInWithPassword: async () => ({ error: null }) } },
    { __locationSearch: '?verified=true&message=private-detail' },
  );
  verified.render();
  await verified.flush();
  assert.match(verified.text(), /Email verified/);
  assert.doesNotMatch(verified.text(), /private-detail/);

  const disabled = componentHarness(
    'app/login/page.tsx',
    { auth: { signInWithPassword: async () => ({ error: null }) } },
    { __locationSearch: '?error=disabled' },
  );
  disabled.render();
  await disabled.flush();
  assert.match(disabled.text(), /account is disabled/i);
});

test('registration class errors are recoverable and do not expose database details', async () => {
  const fixture = registrationFixture({ classError: true });
  await fixture.ui.flush();
  assert.match(fixture.ui.text(), /Could not load classes/);
  assert.doesNotMatch(fixture.ui.text(), /private database detail/);
  assert.equal(fixture.ui.field('register-class').props.disabled, true);
  assert.equal(fixture.ui.find(node => node.props.type === 'submit').props.disabled, true);
  fixture.recoverClasses();
  fixture.ui.find(node => node.props.children === 'Retry classes').props.onClick();
  await fixture.ui.flush();
  assert.equal(fixture.ui.field('register-class').props.disabled, false);
});

test('empty class catalogs block registration with a useful explanation', async () => {
  const { ui, signups } = registrationFixture({ classes: [] });
  await ui.flush();
  fillRegistration(ui);
  await ui.submit();
  await ui.flush();
  assert.match(ui.text(), /No classes are available/);
  assert.equal(signups.length, 0);
});

test('registration cannot submit while its dojo lookup is pending', async () => {
  const { ui, queries, signups } = registrationFixture();
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  await ui.submit();
  await ui.flush();
  assert.equal(queries[0].filters.active, true);
  assert.equal(signups.length, 0);
  assert.equal(ui.find(node => node.props.type === 'submit').props.disabled, true);
  assert.match(ui.text(), /wait for its dojos to load/);
});

test('late responses from the previous class cannot replace the current dojo catalog', async () => {
  const { ui, queries } = registrationFixture();
  await ui.flush();
  ui.change('register-class', 'a');
  ui.change('register-class', 'b');
  queries[1].resolve({ data: [{ id: 'b1', name: 'Current dojo', class_id: 'b' }], error: null });
  await ui.flush();
  queries[0].resolve({ data: [{ id: 'a1', name: 'Stale dojo', class_id: 'a' }], error: null });
  await ui.flush();
  assert.match(ui.text(), /Current dojo/);
  assert.doesNotMatch(ui.text(), /Stale dojo/);
});

test('failed dojo lookups stay blocked until a successful explicit retry', async () => {
  const { ui, queries } = registrationFixture();
  await ui.flush();
  ui.change('register-class', 'a');
  queries[0].resolve({ data: null, error: new Error('private detail') });
  await ui.flush();
  assert.equal(ui.find(node => node.props.type === 'submit').props.disabled, true);
  ui.find(node => node.props.children === 'Retry dojos').props.onClick();
  await ui.flush();
  queries[1].resolve({ data: [], error: null });
  await ui.flush();
  assert.equal(ui.find(node => node.props.type === 'submit').props.disabled, false);
});

test('registration rejects a selected dojo outside the loaded class', async () => {
  const { ui, queries, signups } = registrationFixture();
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  queries[0].resolve({ data: [{ id: 'a1', name: 'Local dojo', class_id: 'a' }], error: null });
  await ui.flush();
  ui.change('register-dojo', 'b1');
  await ui.submit();
  await ui.flush();
  assert.equal(signups.length, 0);
  assert.match(ui.text(), /Please select a dojo/);
});

test('successful registration sends normalized metadata and selected catalog names', async () => {
  const { ui, queries, signups } = registrationFixture();
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  ui.change('register-aikikai-registration-number', ' AIKIKAI   123 ');
  queries[0].resolve({ data: [{ id: 'a1', name: 'Local dojo', class_id: 'a' }], error: null });
  await ui.flush();
  ui.change('register-dojo', 'a1');
  await ui.submit();
  await ui.flush();
  assert.equal(signups[0].email, 'fixture@example.invalid');
  assert.equal(signups[0].options.data.full_name, 'Test Member');
  assert.equal(signups[0].options.data.aikikai_registration_number, 'AIKIKAI 123');
  assert.equal(signups[0].options.data.requested_dojo_id, 'a1');
  assert.equal(signups[0].options.data.requested_class_name, 'Aikido');
  assert.equal(signups[0].options.data.registration_number, undefined);
  assert.equal(signups[0].options.data.username, undefined);
  assert.equal(signups[0].options.emailRedirectTo, 'https://configured.example.test/auth/confirm');
  assert.match(ui.text(), /Registration successful/);
});

test('registration accepts a blank optional Aikikai number without assigning a JS Member ID', async () => {
  const { ui, queries, signups } = registrationFixture();
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  assert.equal(ui.field('register-aikikai-registration-number').props.value, '');
  queries[0].resolve({ data: [], error: null });
  await ui.flush();
  await ui.submit();
  await ui.flush();
  assert.equal(signups.length, 1);
  assert.equal(signups[0].options.data.aikikai_registration_number, null);
  assert.equal(signups[0].options.data.registration_number, undefined);
});

test('application details and Excel show the Aikikai number only on Aikido rows', async () => {
  const karate = { request_id: 'k', class_name: 'Karate', aikikai_registration_number: 'hidden-number' };
  const aikido = { request_id: 'a', class_name: 'Aikido', aikikai_registration_number: 'visible-number' };
  for (const data of [[karate], [karate, aikido]]) {
    let exported;
    const client = { from: () => ({ select: () => ({ eq: async () => ({ data, error: null }) }) }) };
    const ui = componentHarness('app/admin/applications/page.tsx', client, {
      '@/components/compact-record': { default: 'compact-record' },
      '@/lib/exportExcel': { exportToExcel(options) { exported = options; } },
    });
    ui.render();
    await ui.flush();
    const labels = ui.nodes().filter(node => node.props.label === 'Aikikai Registration Number');
    assert.deepEqual(labels.map(node => node.props.value), data.includes(aikido) ? ['visible-number'] : []);
    ui.find(node => node.type === 'button' && node.props.children === 'Export Excel').props.onClick();
    const column = exported.columns.find(item => item.key === 'aikikai_registration_number');
    if (data.includes(aikido)) {
      assert.equal(column.value(karate), '');
      assert.equal(column.value(aikido), 'visible-number');
    } else {
      assert.equal(column, undefined);
    }
  }
});

test('a successfully loaded empty dojo catalog retains the existing approval workflow', async () => {
  const { ui, queries, signups } = registrationFixture();
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  queries[0].resolve({ data: [], error: null });
  await ui.flush();
  await ui.submit();
  assert.equal(signups[0].options.data.requested_dojo_id, null);
});

test('unexpected signup failure releases the busy state and hides internal details', async () => {
  const { ui, queries } = registrationFixture({ signup: () => { throw new Error('private signup detail'); } });
  await ui.flush();
  fillRegistration(ui);
  ui.change('register-class', 'a');
  queries[0].resolve({ data: [], error: null });
  await ui.flush();
  await ui.submit();
  await ui.flush();
  assert.match(ui.text(), /Unable to register/);
  assert.doesNotMatch(ui.text(), /private signup detail/);
  assert.equal(ui.find(node => node.props.type === 'submit').props.disabled, false);
});

test('mobile navigation uses a labelled native modal and identifies the current page', () => {
  const ui = componentHarness('components/mobile-nav.tsx', null, {
    '@/lib/navigation': { getNavigationForRole: () => [{ href: '/profile', label: 'Profile' }] },
  });
  ui.render({ role: 'member' });
  const dialog = ui.find(node => node.type === 'dialog');
  const menu = ui.find(node => node.props.children === 'Menu');
  assert.ok(dialog.props['aria-labelledby']);
  assert.equal(menu.props['aria-controls'], dialog.props.id);
  assert.equal(menu.props['aria-haspopup'], 'dialog');
  assert.equal(menu.props['aria-expanded'], false);
  assert.equal(ui.find(node => node.type === 'CompactNavigation').props.pathname, '/profile');
  // Source checks supplement the rendered contract; native focus/Escape still need browser verification.
  const source = fs.readFileSync('components/mobile-nav.tsx', 'utf8');
  assert.match(source, /\.showModal\(\)/);
  assert.match(source, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(source, /desktop\.addEventListener\("change", closeOnDesktop\)/);
});

test('shared shell offers a focusable skip target and global visible focus/reduced motion', () => {
  const shell = fs.readFileSync('components/app-shell.tsx', 'utf8');
  assert.match(shell, /href="#main-content"/);
  assert.match(shell, /<main\s+id="main-content"\s+tabIndex=\{-1\}/);
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.match(css, /:focus-visible\s*\{[^}]*outline: 3px solid/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('skip link explicitly participates in normal sequential keyboard navigation', () => {
  const shell = fs.readFileSync('components/app-shell.tsx', 'utf8');
  assert.match(shell, /<a\s+href="#main-content"\s+tabIndex=\{0\}/);
});

test('sign out revokes only the current browser session', () => {
  const signOut = fs.readFileSync('components/use-sign-out.ts', 'utf8');
  assert.match(signOut, /signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(signOut, /router\.replace\("\/login"\)/);
  assert.match(signOut, /router\.refresh\(\)/);
  for (const file of ['components/user-menu.tsx', 'components/mobile-nav.tsx']) {
    const menu = fs.readFileSync(file, 'utf8');
    assert.match(menu, /useSignOut\(\)/);
    assert.match(menu, /onClick=\{\s*handleLogout\s*\}/);
  }
});

test('mobile sign out prevents duplicate requests and redirects only on success', async () => {
  const result = deferred();
  let calls = 0;
  const ui = componentHarness('components/mobile-nav.tsx', {
    auth: { signOut: options => { assert.equal(options.scope, 'local'); calls++; return result.promise; } },
  }, { '@/lib/navigation': { getNavigationForRole: () => [] } });
  ui.render({ role: 'member' });
  const logout = ui.find(node => node.type === 'button' && node.props.children === 'Sign out').props.onClick;
  const pending = logout();
  await logout();
  assert.equal(calls, 1);
  assert.deepEqual(ui.redirects, []);
  result.resolve({ error: null });
  await pending;
  assert.deepEqual(ui.redirects, ['/login']);
});

test('admins have an explicit audited direct-payment path without a member request', () => {
  const paymentPage = fs.readFileSync('app/admin/payments/page.tsx', 'utf8');
  const subscriptionsPage = fs.readFileSync('app/admin/subscriptions/page.tsx', 'utf8');
  const memberSubscriptionsPage = fs.readFileSync('app/(member)/subscription/page.tsx', 'utf8');
  const paymentMigration = fs.readFileSync(
    'supabase/migrations/021_harden_payment_completion_and_notifications.sql',
    'utf8'
  );
  const fullPaymentMigration = fs.readFileSync(
    'supabase/migrations/054_full_payment_only.sql',
    'utf8'
  );

  assert.match(paymentPage, /Record Direct Payment/);
  assert.match(paymentPage, /\/admin\/subscriptions\?tab=payments/);
  assert.match(subscriptionsPage, /record_membership_payment/);
  assert.match(subscriptionsPage, /Mark Full Payment/);
  assert.match(subscriptionsPage, /Full Payment Amount/);
  assert.doesNotMatch(subscriptionsPage, /Record Partial|Partially Paid/);
  assert.doesNotMatch(subscriptionsPage, /paymentAmount|setPaymentAmount/);
  assert.match(memberSubscriptionsPage, /Full Payment Amount/);
  assert.doesNotMatch(memberSubscriptionsPage, /Amount Transferred|transferAmount|setTransferAmount/);
  assert.match(paymentMigration, /for update/i);
  assert.match(paymentMigration, /can_access_dojo_finance/i);
  assert.match(paymentMigration, /recorded_by[\s\S]*auth\.uid\(\)/i);
  assert.match(fullPaymentMigration, /Payment must equal the full outstanding subscription balance/i);
  assert.match(fullPaymentMigration, /Payment confirmation must equal the full outstanding subscription balance/i);
});

test('unfinished push-notification controls are not exposed in the v1 member UI', () => {
  const source = fs.readFileSync(
    'app/(member)/notifications/page.tsx',
    'utf8'
  );

  assert.doesNotMatch(source, /PushNotificationButton/);
  assert.doesNotMatch(source, />\s*Push Notifications\s*</);
});

test('repository video displays logo-only organization and class watermarks', () => {
  const page = fs.readFileSync(
    'app/(member)/repository/[classId]/[rankId]/[tierId]/page.tsx',
    'utf8'
  );
  const watermarks = fs.readFileSync(
    'components/video-logo-watermarks.tsx',
    'utf8'
  );

  assert.match(page, /\.from\(\s*"classes"\s*\)[\s\S]*logo_url/);
  assert.match(page, /classLogoUrl=\{[\s\S]*classBrand\?\.logo_url/);
  assert.match(page, /includeOrganizationLogo\s*\/>/);
  assert.match(page, /getYouTubeEmbedUrl/);
  assert.doesNotMatch(page, /cloudflare|vimeo|secureVideo/i);
  assert.match(
    watermarks,
    /src="\/logos\/organization\/logo-js\.png"/,
  );
  assert.match(watermarks, /data-video-logo-watermarks/);
  assert.match(watermarks, /pointer-events-none/);
  assert.doesNotMatch(watermarks, /member number|member_id|email|viewer/i);
});

test('the page error boundary retries without rendering exception details', () => {
  const ui = componentHarness('app/error.tsx');
  let retried = false;
  ui.render({ error: new Error('private stack detail'), retry: () => { retried = true; } });
  assert.doesNotMatch(ui.text(), /private stack detail/);
  ui.find(node => node.type === 'button').props.onClick();
  assert.equal(retried, true);
});

test('Events loads class choices using the live is_active column', async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) },
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        single: async () => ({ data: { is_super_admin: true }, error: null }),
        async order() {
          if (table === 'classes') {
            assert.deepEqual(filters, [['is_active', true]]);
            return { data: [{ id: 'aikido', name: 'Fixture Aikido' }], error: null };
          }
          assert.equal(table, 'events');
          return { data: [], error: null };
        },
      };
      return query;
    },
  };
  const router = { replace() {}, push() {} };
  const ui = componentHarness('app/admin/events/page.tsx', client, {
    'next/navigation': { useRouter: () => router },
    '@/components/compact-record': { default: 'article' },
    '@/lib/exportExcel': { exportToExcel() {} },
  });
  ui.render();
  await ui.flush();
  await new Promise(resolve => setImmediate(resolve));
  await ui.flush();
  assert.ok(ui.find(node => node.type === 'option' && node.props.value === 'aikido'), ui.text());
});

test('Announcements names the direct class relationship to avoid ambiguous embedding', async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) },
    from(table) {
      assert.equal(table, 'announcements');
      const query = {
        select(selection) { assert.match(selection, /classes:classes!announcements_class_id_fkey/); return query; },
        eq() { return query; },
        order: async () => ({ data: [], error: null }),
      };
      return query;
    },
  };
  const ui = componentHarness('app/admin/announcements/page.tsx', client, {
    '@/components/compact-record': { default: 'article' },
  });
  ui.render();
  await ui.flush();
  assert.doesNotMatch(ui.text(), /Loading announcements/);
});

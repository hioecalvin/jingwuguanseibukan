import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const compiled = ts.transpileModule(read('tests/browser/fixtures/request-gate.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { waitForFixtureRequest } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

function fixture(t) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const requests = {};
  Object.defineProperty(globalThis, 'window', { value: { __jwgFixtureRequests: requests }, configurable: true });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, 'window', prior);
    else delete globalThis.window;
  });
  return name => {
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    return requests[name] = { wait, release, started: false };
  };
}

test('pending request cannot finish until explicitly released', async t => {
  const gate = fixture(t)('sign-out');
  let finished = false;
  const pending = waitForFixtureRequest('sign-out').then(() => { finished = true; });
  assert.equal(gate.started, true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(finished, false);
  gate.release();
  await pending;
  assert.equal(finished, true);
  // The release remains safe for later requests in the same fixture page.
  await waitForFixtureRequest('sign-out');
});

test('release of one fixture does not finish another request', async t => {
  const make = fixture(t);
  const signOut = make('sign-out');
  const history = make('assessment-history');
  let historyFinished = false;
  const first = waitForFixtureRequest('sign-out');
  const second = waitForFixtureRequest('assessment-history', true).then(() => { historyFinished = true; });
  signOut.release();
  await first;
  assert.equal(historyFinished, false);
  history.release();
  await second;
  assert.equal(historyFinished, true);
});

test('required missing gate fails instead of silently skipping pending acceptance', async t => {
  fixture(t);
  await assert.rejects(waitForFixtureRequest('assessment-history', true), /Missing synthetic request gate/);
  await waitForFixtureRequest('sign-out');
});

test('pending-state fixtures use explicit gates, not elapsed-time delays', () => {
  for (const file of ['supabase.ts', 'assessment-history-supabase.ts']) {
    const source = read('tests/browser/fixtures/' + file);
    assert.match(source, /await waitForFixtureRequest/);
    assert.doesNotMatch(source, /setTimeout|fetch\(/);
  }
  for (const file of ['navigation.spec.ts', 'assessment-history.spec.ts']) {
    const source = read('tests/browser/' + file);
    assert.match(source, /await installRequestGate/);
    assert.match(source, /toBeDisabled\(\);[\s\S]*?await releaseRequestGate/);
  }
});

test('release waits for the effect to start the request before resolving it', () => {
  const source = read('tests/browser/request-gate.ts');
  const start = source.indexOf('await page.waitForFunction');
  const release = source.indexOf('await page.evaluate', start);
  assert.ok(start >= 0 && release > start);
  assert.match(source, /started === true/);
  assert.match(source, /timeout: 7000/);
  assert.doesNotMatch(source, /waitForTimeout/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { selectedEngines } from './browser-host-preflight.mjs';

test('browser preflight maps projects to unique engines in request order', () => {
  assert.deepEqual(selectedEngines([
    '--project=webkit-desktop',
    '--project=webkit-tablet',
    '--project=firefox-desktop',
    '--project=webkit-mobile',
  ]), ['webkit', 'firefox']);
});

test('browser preflight rejects missing, unknown and non-project arguments', () => {
  assert.throws(() => selectedEngines([]), /At least one documented/);
  assert.throws(() => selectedEngines(['--project=firefox-mobile']), /Unsupported/);
  assert.throws(() => selectedEngines(['--grep=login']), /Unsupported/);
});

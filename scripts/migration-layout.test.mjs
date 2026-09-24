import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const activeDirectory = new URL('../supabase/migrations/', import.meta.url);
const legacyDirectory = new URL('../migrations/', import.meta.url);

const legacyHashes = new Map([
  ['004_finance_module.sql', '1E665CB5BF0E0D300FA65178F0E228129CC75D6F3F1D7B92C31A5BCBA5DAC40C'],
  ['004_subscription_module.sql', '92DE1713B61887B5B0A6C1E5EC5F5DAAD9E245B0E3C1506E37EC642FE0E4478D'],
  ['005_settlement_module.sql', '992FF1B45364F3D75F7FF863212379B47B2C50D18DE6F4F058D5923B7E99635D'],
]);

test('only the ordered Supabase directory is active and versions 006-046 are contiguous', async () => {
  const files = (await readdir(activeDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const versions = files.map((name) => Number.parseInt(name.slice(0, 3), 10));

  assert.deepEqual(versions, Array.from({ length: 41 }, (_, index) => index + 6));
  assert.equal(new Set(versions).size, versions.length);
});

test('legacy finance and settlement drafts remain immutable and explicitly non-executable', async () => {
  const files = (await readdir(legacyDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assert.deepEqual(files, [...legacyHashes.keys()]);

  for (const [name, expectedHash] of legacyHashes) {
    const text = await readFile(new URL(name, legacyDirectory), 'utf8');
    const canonicalText = text.replace(/\r\n?/g, '\n');
    const actualHash = createHash('sha256').update(canonicalText, 'utf8').digest('hex').toUpperCase();
    assert.equal(actualHash, expectedHash, `${name} changed without baseline reconciliation`);
  }

  const readme = await readFile(new URL('README.md', legacyDirectory), 'utf8');
  assert.match(readme, /not an executable\s+migration source/i);
  assert.match(readme, /only active ordered migration chain is `supabase\/migrations`/i);
  assert.match(readme, /must never be passed to Supabase CLI/i);
});

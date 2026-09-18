import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const activeDirectory = new URL('../supabase/migrations/', import.meta.url);
const legacyDirectory = new URL('../migrations/', import.meta.url);

const legacyHashes = new Map([
  ['004_finance_module.sql', '8B5CB74B92388660A036378B40D6EA9A0A2A07093BBCD4558DE86166C4FB0F1E'],
  ['004_subscription_module.sql', 'A16B218DC1C1D2D4B3DDF5494DEAEBD6A197775B1856E1583B03628656EED609'],
  ['005_settlement_module.sql', 'C5E5979C24DDDB2DFED4B110DBA9775F913030B44F5C61C6D66E24D4BB56C3C0'],
]);

test('only the ordered Supabase directory is active and versions 006-039 are contiguous', async () => {
  const files = (await readdir(activeDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const versions = files.map((name) => Number.parseInt(name.slice(0, 3), 10));

  assert.deepEqual(versions, Array.from({ length: 34 }, (_, index) => index + 6));
  assert.equal(new Set(versions).size, versions.length);
});

test('legacy finance and settlement drafts remain immutable and explicitly non-executable', async () => {
  const files = (await readdir(legacyDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assert.deepEqual(files, [...legacyHashes.keys()]);

  for (const [name, expectedHash] of legacyHashes) {
    const bytes = await readFile(new URL(name, legacyDirectory));
    const actualHash = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    assert.equal(actualHash, expectedHash, `${name} changed without baseline reconciliation`);
  }

  const readme = await readFile(new URL('README.md', legacyDirectory), 'utf8');
  assert.match(readme, /not an executable\s+migration source/i);
  assert.match(readme, /only active ordered migration chain is `supabase\/migrations`/i);
  assert.match(readme, /must never be passed to Supabase CLI/i);
});

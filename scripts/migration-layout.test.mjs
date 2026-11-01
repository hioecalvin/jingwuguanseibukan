import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const activeDirectory = new URL('../supabase/migrations/', import.meta.url);
const legacyDirectory = new URL('../migrations/', import.meta.url);

test('exact-byte finance sources have explicit LF checkout rules', async () => {
  const attributes = await readFile(new URL('../.gitattributes', import.meta.url), 'utf8');
  for (const file of [
    'supabase/migrations/059_advance_subscription_payment_records.sql',
    'supabase/migrations/060_selected_month_fee_adjustment.sql',
    'supabase/pending/059_advance_subscription_payment_records.sql',
    'supabase/pending/060_selected_month_fee_adjustment.sql',
    'tests/sql/059_060_staging_fixture.sql',
    'tests/sql/059_060_staging_fixture_assertions.sql',
  ]) {
    assert.ok(attributes.split(/\r?\n/).includes(`/${file} text eol=lf`), file);
    assert.equal((await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).includes('\r'), false, file);
  }
});

test('active 059 and 060 retain the exact reviewed and applied source bytes', async () => {
  const pins = {
    '059_advance_subscription_payment_records.sql': 'e2e4defb705cf9216dac32946ca61c029477a9062bf92b7f0ba777d4d070f406',
    '060_selected_month_fee_adjustment.sql': '482ad4c3de6126123fac4250978f81c32c368ed50940287ba3a6b03b0a588b5d',
  };
  for (const [name, sha256] of Object.entries(pins)) {
    const active = await readFile(new URL(name, activeDirectory));
    const historical = await readFile(new URL(`../supabase/pending/${name}`, import.meta.url));
    assert.deepEqual(active, historical, name);
    assert.equal(createHash('sha256').update(active).digest('hex'), sha256, name);
  }
});

const legacyHashes = new Map([
  ['004_finance_module.sql', '1E665CB5BF0E0D300FA65178F0E228129CC75D6F3F1D7B92C31A5BCBA5DAC40C'],
  ['004_subscription_module.sql', '92DE1713B61887B5B0A6C1E5EC5F5DAAD9E245B0E3C1506E37EC642FE0E4478D'],
  ['005_settlement_module.sql', '992FF1B45364F3D75F7FF863212379B47B2C50D18DE6F4F058D5923B7E99635D'],
]);

test('only the ordered Supabase directory is active and versions 006-060 are contiguous', async () => {
  const files = (await readdir(activeDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const versions = files.map((name) => Number.parseInt(name.slice(0, 3), 10));

  assert.deepEqual(versions, Array.from({ length: 55 }, (_, index) => index + 6));
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

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RELEASE_MIGRATION_CONTRACT,
  fingerprintLedgerRows,
  fingerprintMigrationDirectory,
  verifyReleaseMigrationContract,
} from "./recovery-ledger-fingerprint.mjs";

test("the checked-in migration files match the immutable 006-054 recovery contract", async () => {
  const result = await verifyReleaseMigrationContract();
  assert.equal(result.matches, true);
  assert.deepEqual(result.actual, RELEASE_MIGRATION_CONTRACT);
});

test("the recovery manifest template matches the immutable migration contract", async () => {
  const template = JSON.parse(await readFile(
    new URL("../recovery/recovery-manifest.template.json", import.meta.url),
    "utf8",
  ));
  const { firstVersion, lastVersion, migrationCount, repositoryFilesSha256 } =
    template.migrationLedger;
  assert.deepEqual(
    { firstVersion, lastVersion, migrationCount, repositoryFilesSha256 },
    RELEASE_MIGRATION_CONTRACT,
  );
});

function ledgerRows() {
  return Array.from({ length: RELEASE_MIGRATION_CONTRACT.migrationCount }, (_, index) => ({
    version: String(index + 6).padStart(3, "0"),
    name: `migration_${index + 6}`,
    statements: [`select ${index + 6};\r\n`, `comment on schema public is 'row ${index + 6}';`],
  }));
}

test("source and restored ledger exports have a stable order-independent fingerprint", () => {
  const source = ledgerRows();
  const restored = [...source].reverse();
  assert.deepEqual(fingerprintLedgerRows(source), fingerprintLedgerRows(restored));
});

test("ledger fingerprints fail closed on gaps and malformed statement evidence", () => {
  assert.throws(() => fingerprintLedgerRows(ledgerRows().slice(1)), /006 through 054/);
  const malformed = ledgerRows();
  malformed[0].statements = [null];
  assert.throws(() => fingerprintLedgerRows(malformed), /version, name, and a string statements array/);
});

test("the recovery fingerprint covers every ordered SQL migration", async () => {
  const fingerprint = await fingerprintMigrationDirectory();
  assert.equal(fingerprint.firstVersion, "006");
  assert.equal(fingerprint.lastVersion, "054");
  assert.equal(fingerprint.migrationCount, 49);
  assert.match(fingerprint.repositoryFilesSha256, /^[a-f0-9]{64}$/);
});

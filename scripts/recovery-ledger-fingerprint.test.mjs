import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RELEASE_MIGRATION_CONTRACT,
  HISTORICAL_058_MIGRATION_CONTRACT,
  fingerprintHistorical058LedgerRows,
  verifyHistorical058MigrationContract,
  fingerprintLedgerRows,
  fingerprintMigrationDirectory,
  verifyReleaseMigrationContract,
} from "./recovery-ledger-fingerprint.mjs";

test("the checked-in migration files match the immutable 006-060 recovery contract", async () => {
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
  assert.equal(template.manifestVersion, 4);
  assert.equal(template.preMigrationBaseline.catalogFormatVersion, 1);
  assert.equal(template.restoreTarget.disposition.status, "PENDING");
  assert.equal(template.evidenceBundle.bytes, -1);
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

test("historical 058 evidence remains intact but cannot satisfy the current contract", async () => {
  const historical = await verifyHistorical058MigrationContract();
  assert.equal(historical.matches, true);
  assert.equal(historical.currentReleaseEvidence, false);
  assert.deepEqual(historical.actual, HISTORICAL_058_MIGRATION_CONTRACT);
  const rows = ledgerRows().slice(0, 53);
  assert.equal(fingerprintHistorical058LedgerRows(rows).lastVersion, "058");
  assert.throws(() => fingerprintLedgerRows(rows), /006 through 060/);
  assert.throws(() => fingerprintHistorical058LedgerRows(ledgerRows()), /006 through 058/);
  assert.throws(() => fingerprintHistorical058LedgerRows([...rows.slice(1), rows[1]]), /exactly once/);
});

test("all current release templates require 060 without asserting verification", async () => {
  const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  const bootstrap = await read("../release/production-bootstrap-manifest.template.json");
  for (const [key, value] of Object.entries(RELEASE_MIGRATION_CONTRACT)) {
    assert.equal(bootstrap.migrationLedger[key], value, key);
  }
  const cutover = await read("../release/production-cutover-evidence.template.json");
  assert.equal(cutover.database.migrationLedger, "006-060");
  assert.equal(cutover.database.exactLedgerPassed, false);
  const rollback = await read("../release/rollback-evidence.template.json");
  assert.equal(rollback.databaseRecovery.migrationLedger, "006-060");
  const window = await read("../release/release-window-manifest.template.json");
  assert.equal(window.gateEvidence.productionCutover.migrationLedger, "006-060");
});

test("source and restored ledger exports have a stable order-independent fingerprint", () => {
  const source = ledgerRows();
  const restored = [...source].reverse();
  assert.deepEqual(fingerprintLedgerRows(source), fingerprintLedgerRows(restored));
});

test("ledger fingerprints fail closed on gaps and malformed statement evidence", () => {
  assert.throws(() => fingerprintLedgerRows(ledgerRows().slice(1)), /006 through 060/);
  const malformed = ledgerRows();
  malformed[0].statements = [null];
  assert.throws(() => fingerprintLedgerRows(malformed), /version, name, and a string statements array/);
});

test("the recovery fingerprint covers every ordered SQL migration", async () => {
  const fingerprint = await fingerprintMigrationDirectory();
  assert.equal(fingerprint.firstVersion, "006");
  assert.equal(fingerprint.lastVersion, "060");
  assert.equal(fingerprint.migrationCount, 55);
  assert.match(fingerprint.repositoryFilesSha256, /^[a-f0-9]{64}$/);
});

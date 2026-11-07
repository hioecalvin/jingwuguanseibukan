import assert from "node:assert/strict";
import test from "node:test";

import {
  RECOVERY_CATALOG_FORMAT_VERSION,
  REQUIRED_CATALOG_FILES,
  fingerprintCatalogEntries,
} from "./recovery-catalog-fingerprint.mjs";

function catalogEntries() {
  return Object.fromEntries(REQUIRED_CATALOG_FILES.map((name, index) => [
    name,
    [{ definition: `line ${index}\r\nnext`, identity: `${name}-${index}` }],
  ]));
}

test("catalog fingerprints are stable across file, row, key and line-ending order", () => {
  const source = catalogEntries();
  source.columns.push({ identity: "second", definition: "value\r\n" });
  const restored = Object.fromEntries(
    [...REQUIRED_CATALOG_FILES].reverse().map((name) => [
      name,
      [...source[name]].reverse().map((row) => Object.fromEntries(
        Object.entries(row).reverse().map(([key, value]) => [
          key,
          typeof value === "string" ? value.replace(/\r\n/g, "\n") : value,
        ]),
      )),
    ]),
  );

  const sourceResult = fingerprintCatalogEntries(source);
  const restoredResult = fingerprintCatalogEntries(restored);
  assert.equal(sourceResult.catalogFormatVersion, RECOVERY_CATALOG_FORMAT_VERSION);
  assert.deepEqual(sourceResult, restoredResult);
});

test("catalog fingerprint rejects missing, extra, malformed and empty evidence", () => {
  const missing = catalogEntries();
  delete missing.routines;
  assert.throws(() => fingerprintCatalogEntries(missing), /exactly the required/);

  assert.throws(
    () => fingerprintCatalogEntries({ ...catalogEntries(), "profile-identity-duplicates": [] }),
    /exactly the required/,
  );

  const malformed = catalogEntries();
  malformed.columns = {};
  assert.throws(() => fingerprintCatalogEntries(malformed), /columns\.json must contain a JSON array/);

  const empty = Object.fromEntries(REQUIRED_CATALOG_FILES.map((name) => [name, []]));
  assert.throws(() => fingerprintCatalogEntries(empty), /cannot be empty/);
});

test("catalog fingerprint changes when a schema definition changes", () => {
  const source = catalogEntries();
  const changed = catalogEntries();
  changed.routines[0].definition += " changed";
  assert.notEqual(
    fingerprintCatalogEntries(source).catalogSha256,
    fingerprintCatalogEntries(changed).catalogSha256,
  );
});

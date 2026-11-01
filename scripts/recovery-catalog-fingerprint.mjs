import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const RECOVERY_CATALOG_FORMAT_VERSION = 1;

export const REQUIRED_CATALOG_FILES = Object.freeze([
  "schemas",
  "schema-privileges",
  "relations",
  "columns",
  "views",
  "indexes",
  "constraints",
  "triggers",
  "policies",
  "table-privileges",
  "column-privileges",
  "routines",
  "routine-privileges",
  "types",
  "sequences",
  "default-privileges",
  "extensions",
  "publications",
]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableValue(value) {
  if (typeof value === "string") return value.replace(/\r\n?/g, "\n");
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, current]) => [key, stableValue(current)]),
    );
  }
  return value;
}

function normalizeRows(name, rows) {
  if (!Array.isArray(rows)) {
    throw new Error(`${name}.json must contain a JSON array.`);
  }
  return rows
    .map(stableValue)
    .sort((left, right) => compareText(JSON.stringify(left), JSON.stringify(right)));
}

export function fingerprintCatalogEntries(entries) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    throw new Error("Catalog entries must be an object keyed by export name.");
  }
  const names = Object.keys(entries).sort();
  const expected = [...REQUIRED_CATALOG_FILES].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error("Catalog export must contain exactly the required schema-only JSON files.");
  }

  const normalized = Object.fromEntries(
    REQUIRED_CATALOG_FILES.map((name) => [name, normalizeRows(name, entries[name])]),
  );
  const fileRowCounts = Object.fromEntries(
    REQUIRED_CATALOG_FILES.map((name) => [name, normalized[name].length]),
  );
  const totalObjectCount = Object.values(fileRowCounts)
    .reduce((total, count) => total + count, 0);
  if (totalObjectCount === 0) {
    throw new Error("Catalog export cannot be empty.");
  }

  const payload = JSON.stringify({
    catalogFormatVersion: RECOVERY_CATALOG_FORMAT_VERSION,
    files: normalized,
  });
  return {
    catalogFormatVersion: RECOVERY_CATALOG_FORMAT_VERSION,
    catalogSha256: createHash("sha256").update(payload).digest("hex"),
    totalObjectCount,
    fileRowCounts,
  };
}

export async function fingerprintCatalogDirectory(directory) {
  const resolved = path.resolve(directory);
  const names = await readdir(resolved);
  const jsonNames = names.filter((name) => name.toLowerCase().endsWith(".json")).sort();
  const expectedNames = REQUIRED_CATALOG_FILES.map((name) => `${name}.json`).sort();
  if (JSON.stringify(jsonNames) !== JSON.stringify(expectedNames)) {
    throw new Error("Catalog directory must contain exactly the required schema-only JSON files.");
  }

  const entries = {};
  for (const name of REQUIRED_CATALOG_FILES) {
    try {
      entries[name] = JSON.parse(await readFile(path.join(resolved, `${name}.json`), "utf8"));
    } catch {
      throw new Error(`${name}.json could not be read as JSON.`);
    }
  }
  return fingerprintCatalogEntries(entries);
}

async function runCli(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || argv[0].startsWith("--")) {
    console.error("Usage: node scripts/recovery-catalog-fingerprint.mjs <protected-catalog-directory>");
    return 2;
  }
  try {
    console.log(JSON.stringify(await fingerprintCatalogDirectory(argv[0]), null, 2));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({ ready: false, error: error.message }, null, 2));
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}

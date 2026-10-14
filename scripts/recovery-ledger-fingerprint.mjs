import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_MIGRATION_CONTRACT = Object.freeze({
  firstVersion: "006",
  lastVersion: "060",
  migrationCount: 55,
  repositoryFilesSha256: "1fb8ea8facf8f4553d81d40f2ae808665290709a52367facd7a227be988ff8f2",
});
export const RELEASE_MIGRATION_RANGE = "006-060";

// Historical evidence ONLY. Never use this contract to satisfy current release,
// cutover, bootstrap or recovery readiness. Do not relabel old captures as 060.
export const HISTORICAL_058_MIGRATION_CONTRACT = Object.freeze({
  firstVersion: "006",
  lastVersion: "058",
  migrationCount: 53,
  repositoryFilesSha256: "a412432bedf7c95578e7ebfb83317987c1d4350d19121fe533007a1967b26ffd",
});

export async function fingerprintMigrationDirectory(
  directory = new URL("../supabase/migrations/", import.meta.url),
) {
  return fingerprintDirectory(directory, false);
}
async function fingerprintDirectory(directory, historical058) {
  const files = (await readdir(directory))
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .filter((name) => !historical058 || name.slice(0, 3) <= "058")
    .sort();
  const rows = [];

  for (const name of files) {
    const canonicalText = (await readFile(new URL(name, directory), "utf8"))
      .replace(/\r\n?/g, "\n");
    const fileHash = createHash("sha256").update(canonicalText, "utf8").digest("hex");
    rows.push(`${name}\t${fileHash}\n`);
  }

  return {
    firstVersion: files[0]?.slice(0, 3) ?? "",
    lastVersion: files.at(-1)?.slice(0, 3) ?? "",
    migrationCount: files.length,
    repositoryFilesSha256: createHash("sha256").update(rows.join(""), "utf8").digest("hex"),
  };
}

function canonicalStatement(statement) {
  return statement.replace(/\r\n?/g, "\n");
}

export function fingerprintLedgerRows(rows) {
  return fingerprintRows(rows, RELEASE_MIGRATION_CONTRACT);
}
// Requires the WHOLE historical 53-row capture; never truncates a supplied ledger.
export function fingerprintHistorical058LedgerRows(rows) {
  return fingerprintRows(rows, HISTORICAL_058_MIGRATION_CONTRACT);
}
function fingerprintRows(rows, contract) {
  if (!Array.isArray(rows)) {
    throw new Error("Ledger export must be a JSON array.");
  }
  const normalized = rows.map((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row) ||
        typeof row.version !== "string" || !/^\d{3}$/.test(row.version) ||
        typeof row.name !== "string" || !Array.isArray(row.statements) ||
        row.statements.some((statement) => typeof statement !== "string")) {
      throw new Error("Every ledger row must contain version, name, and a string statements array.");
    }
    const statementDigest = createHash("sha256")
      .update(JSON.stringify(row.statements.map(canonicalStatement)), "utf8")
      .digest("hex");
    return { version: row.version, name: row.name, statementDigest };
  }).sort((left, right) => left.version.localeCompare(right.version));

  const versions = normalized.map(({ version }) => version);
  const expectedVersions = Array.from(
    { length: contract.migrationCount },
    (_, index) => String(index + Number(contract.firstVersion)).padStart(3, "0"),
  );
  if (new Set(versions).size !== versions.length ||
      JSON.stringify(versions) !== JSON.stringify(expectedVersions)) {
    throw new Error(`Ledger export must contain each migration from ${contract.firstVersion} through ${contract.lastVersion} exactly once.`);
  }

  const ledgerSha256 = createHash("sha256")
    .update(normalized.map((row) => `${row.version}\t${row.name}\t${row.statementDigest}\n`).join(""), "utf8")
    .digest("hex");
  return {
    firstVersion: versions[0],
    lastVersion: versions.at(-1),
    migrationCount: versions.length,
    ledgerSha256,
  };
}

export async function fingerprintLedgerExport(path) {
  const rows = JSON.parse(await readFile(path, "utf8"));
  return fingerprintLedgerRows(rows);
}

export async function verifyReleaseMigrationContract() {
  const actual = await fingerprintMigrationDirectory();
  return {
    matches: Object.entries(RELEASE_MIGRATION_CONTRACT)
      .every(([key, value]) => actual[key] === value),
    actual,
    expected: RELEASE_MIGRATION_CONTRACT,
  };
}

export async function verifyHistorical058MigrationContract() {
  const actual = await fingerprintDirectory(new URL("../supabase/migrations/", import.meta.url), true);
  return {
    matches: Object.entries(HISTORICAL_058_MIGRATION_CONTRACT).every(([key, value]) => actual[key] === value),
    actual,
    expected: HISTORICAL_058_MIGRATION_CONTRACT,
    scope: "historical-006-058-only",
    currentReleaseEvidence: false,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      const result = await verifyReleaseMigrationContract();
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.matches ? 0 : 1;
    } else if (args.length === 2 && args[0] === "--ledger") {
      console.log(JSON.stringify(await fingerprintLedgerExport(args[1]), null, 2));
    } else {
      console.error("Usage: node scripts/recovery-ledger-fingerprint.mjs [--ledger <protected-ledger-export.json>]");
      process.exitCode = 2;
    }
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Ledger fingerprint could not be produced." }, null, 2));
    process.exitCode = 1;
  }
}

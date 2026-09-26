import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_MIGRATION_CONTRACT = Object.freeze({
  firstVersion: "006",
  lastVersion: "053",
  migrationCount: 48,
  repositoryFilesSha256: "196152720f54509947c7d325e8554285862e19d7f51d53642f23b29938049937",
});

export async function fingerprintMigrationDirectory(
  directory = new URL("../supabase/migrations/", import.meta.url),
) {
  const files = (await readdir(directory))
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
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
    { length: RELEASE_MIGRATION_CONTRACT.migrationCount },
    (_, index) => String(index + Number(RELEASE_MIGRATION_CONTRACT.firstVersion)).padStart(3, "0"),
  );
  if (new Set(versions).size !== versions.length ||
      JSON.stringify(versions) !== JSON.stringify(expectedVersions)) {
    throw new Error("Ledger export must contain each migration from 006 through 053 exactly once.");
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

import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateReleaseWindow } from "./release-window-readiness.mjs";
import { evaluateRollbackReadiness } from "./rollback-readiness.mjs";

export const EVIDENCE_KEYS = Object.freeze([
  "recovery",
  "rollback",
  "physicalSafari",
  "monitoring",
  "productionIdentity",
  "managedRestore",
  "productionTarget",
  "productionSecrets",
  "providerDelivery",
  "emailScheduler",
  "installerAcceptance",
]);

const MAX_JSON_BYTES = 1024 * 1024;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function exactKeys(value, expected) {
  const keys = Object.keys(object(value)).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index]);
}

function expectedDigest(releaseManifest, key) {
  if (key === "recovery" || key === "rollback") {
    return object(releaseManifest[key]).manifestSha256;
  }
  return object(object(releaseManifest.gateEvidence)[key]).manifestSha256;
}

function within(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function blocker(path, message) {
  return { path, message };
}

async function readProtectedJson(path, label, repositoryRoot) {
  if (
    typeof path !== "string" ||
    !isAbsolute(path) ||
    /^[/\\]{2}/.test(path) ||
    /[\0-\x1f]/.test(path) ||
    /replace|placeholder|todo|tbd/i.test(path)
  ) {
    return { error: blocker(label, "must identify an absolute non-placeholder protected JSON file") };
  }

  let sourcePath;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size <= 1 || info.size > MAX_JSON_BYTES) {
      return { error: blocker(label, "must be a bounded regular JSON file, not a link") };
    }
    sourcePath = await realpath(path);
  } catch {
    return { error: blocker(label, "protected evidence file is unavailable") };
  }

  if (within(repositoryRoot, sourcePath)) {
    return { error: blocker(label, "must remain outside the repository") };
  }

  try {
    const bytes = await readFile(sourcePath);
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: blocker(label, "must contain one JSON object") };
    }
    return {
      sourcePath,
      parsed,
      digest: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch {
    return { error: blocker(label, "must contain valid JSON") };
  }
}

export async function verifyEvidenceFiles(
  index,
  releaseManifest,
  {
    repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
    indexSourcePath,
  } = {},
) {
  const blockers = [];
  if (!exactKeys(index, ["manifestVersion", "releaseWindowManifest", "evidenceFiles"])) {
    blockers.push(blocker("$", "evidence index must use only the documented fields"));
  }
  if (index?.manifestVersion !== 1) {
    blockers.push(blocker("manifestVersion", "must equal 1"));
  }

  const loadedRelease = await readProtectedJson(
    index?.releaseWindowManifest,
    "releaseWindowManifest",
    resolve(repositoryRoot),
  );
  if (loadedRelease.error) {
    blockers.push(loadedRelease.error);
  } else if (JSON.stringify(loadedRelease.parsed) !== JSON.stringify(releaseManifest)) {
    blockers.push(blocker("releaseWindowManifest", "contents must match the release manifest being evaluated"));
  }

  const evidenceFiles = object(index?.evidenceFiles);
  if (!exactKeys(evidenceFiles, EVIDENCE_KEYS)) {
    blockers.push(blocker("evidenceFiles", "must contain exactly the eleven documented evidence entries"));
  }

  const resolvedFiles = [];
  let semanticallyVerifiedFiles = 0;
  for (const key of EVIDENCE_KEYS) {
    const expected = expectedDigest(object(releaseManifest), key);
    if (!/^[a-f0-9]{64}$/.test(expected ?? "") || /^(.)\1{63}$/.test(expected)) {
      blockers.push(blocker(`evidenceFiles.${key}`, "release manifest does not contain a valid evidence digest"));
      continue;
    }

    const loaded = await readProtectedJson(
      evidenceFiles[key],
      `evidenceFiles.${key}`,
      resolve(repositoryRoot),
    );
    if (loaded.error) {
      blockers.push(loaded.error);
      continue;
    }
    resolvedFiles.push(loaded.sourcePath.toLowerCase());
    if (loadedRelease.sourcePath && loaded.sourcePath.toLowerCase() === loadedRelease.sourcePath.toLowerCase()) {
      blockers.push(blocker(`evidenceFiles.${key}`, "must not reuse the release-window manifest as gate evidence"));
    }
    if (typeof indexSourcePath === "string" && loaded.sourcePath.toLowerCase() === indexSourcePath.toLowerCase()) {
      blockers.push(blocker(`evidenceFiles.${key}`, "must not reuse the evidence index as gate evidence"));
    }
    if (loaded.digest !== expected) {
      blockers.push(blocker(`evidenceFiles.${key}`, "file SHA-256 does not match the release manifest"));
    }
    if (key === "rollback") {
      const release = object(releaseManifest.release);
      const semanticResult = evaluateRollbackReadiness(loaded.parsed, {
        expectedCommit: release.commitSha,
        expectedDeploymentId: release.deploymentId,
        expectedPreviousCommit: release.previousCommitSha,
        expectedPreviousDeploymentId: release.previousDeploymentId,
      });
      if (!semanticResult.ready) {
        for (const item of semanticResult.blockers) {
          blockers.push(blocker(`evidenceFiles.rollback.${item.path}`, item.message));
        }
      } else if (
        semanticResult.summary.decisionDeadlineMinutes !==
        object(releaseManifest.rollback).decisionDeadlineMinutes
      ) {
        blockers.push(blocker(
          "evidenceFiles.rollback.timings.decisionDeadlineMinutes",
          "must match the rollback deadline in the release manifest",
        ));
      } else {
        semanticallyVerifiedFiles += 1;
      }
    }
  }

  if (resolvedFiles.length !== EVIDENCE_KEYS.length || new Set(resolvedFiles).size !== EVIDENCE_KEYS.length) {
    blockers.push(blocker("evidenceFiles", "all eleven evidence files must be present and distinct"));
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings: [
      "This offline check binds protected evidence files only; it does not authorize or execute a release.",
    ],
    summary: blockers.length === 0 ? {
      verifiedEvidenceFiles: EVIDENCE_KEYS.length,
      semanticallyVerifiedEvidenceFiles: semanticallyVerifiedFiles,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/release-evidence-packet-readiness.mjs --index=<protected-json> --expected-commit=<40-char-sha> --expected-production-project-ref=<20-char-ref>",
    "The protected index and all referenced evidence files must remain outside the repository.",
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }

  const indexPath = option(argv, "--index");
  const expectedCommit = option(argv, "--expected-commit");
  const expectedProductionProjectRef = option(argv, "--expected-production-project-ref");
  if (!indexPath || !expectedCommit || !expectedProductionProjectRef) {
    console.error(JSON.stringify({ ready: false, error: "Protected index and independent release identity are required." }, null, 2));
    return 2;
  }

  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const loadedIndex = await readProtectedJson(indexPath, "index", repositoryRoot);
  if (loadedIndex.error) {
    console.error(JSON.stringify({ ready: false, blockers: [loadedIndex.error] }, null, 2));
    return 2;
  }

  const releasePath = loadedIndex.parsed.releaseWindowManifest;
  const loadedRelease = await readProtectedJson(releasePath, "releaseWindowManifest", repositoryRoot);
  if (loadedRelease.error) {
    console.error(JSON.stringify({ ready: false, blockers: [loadedRelease.error] }, null, 2));
    return 2;
  }

  const releaseResult = evaluateReleaseWindow(loadedRelease.parsed, {
    expectedCommit,
    expectedProductionProjectRef,
  });
  const packetResult = await verifyEvidenceFiles(loadedIndex.parsed, loadedRelease.parsed, {
    repositoryRoot,
    indexSourcePath: loadedIndex.sourcePath,
  });
  const result = {
    ready: releaseResult.ready && packetResult.ready,
    blockers: [...releaseResult.blockers, ...packetResult.blockers],
    warnings: [...releaseResult.warnings, ...packetResult.warnings],
    summary: releaseResult.ready && packetResult.ready
      ? { ...releaseResult.summary, ...packetResult.summary }
      : null,
  };
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}

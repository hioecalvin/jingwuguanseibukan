import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CERTIFICATE_THUMBPRINT = /^[A-F0-9]{40,64}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const VERSION = /^\d+(?:\.\d+){1,3}$/;
const MAX_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_MALWARE_SCAN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function exactKeys(blockers, value, path, allowed) {
  for (const key of Object.keys(object(value))) {
    if (!allowed.includes(key)) add(blockers, path, "contains a field not permitted in sanitized installer evidence");
  }
}

function requireTrue(blockers, value, path) {
  if (value !== true) add(blockers, path, "must be true");
}

function requireFalse(blockers, value, path) {
  if (value !== false) add(blockers, path, "must be false");
}

function validDigest(value) {
  return typeof value === "string" && SHA256.test(value) && !/^(.)\1{63}$/.test(value);
}

function timestamp(value) {
  return typeof value === "string" && ISO_WITH_ZONE.test(value) && Number.isFinite(Date.parse(value));
}

function validateTimestamp(blockers, value, path, now, maximumAge = MAX_EVIDENCE_AGE_MS) {
  if (!timestamp(value)) {
    add(blockers, path, "must be an ISO-8601 timestamp with an explicit offset");
    return;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(now) || time > now + 5 * 60 * 1000) add(blockers, path, "must not be in the future");
  else if (now - time > maximumAge) add(blockers, path, `must be no more than ${maximumAge / 86_400_000} days old`);
}

function containsSensitiveString(value) {
  return typeof value === "string" && (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) ||
    /\bBearer\s+[A-Za-z0-9._~-]+/i.test(value) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value) ||
    /\b(?:sb_secret_|re_[A-Za-z0-9_]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/.test(value)
  );
}

function scanSensitiveValues(blockers, value, path = "$") {
  if (containsSensitiveString(value)) {
    add(blockers, path, "must not contain an email address, credential, token, or private key");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanSensitiveValues(blockers, entry, `${path}[${index}]`));
  } else if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) scanSensitiveValues(blockers, entry, `${path}.[field]`);
  }
}

export function evaluateInstallerReleaseReadiness(manifest, {
  expectedCommit,
  expectedSha256,
  expectedBytes,
  expectedSignerSubject,
  expectedSignerThumbprint,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [];
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ready: false, blockers: [{ path: "$", message: "manifest must be a JSON object" }], warnings, summary: null };
  }

  scanSensitiveValues(blockers, manifest);
  exactKeys(blockers, manifest, "$", ["manifestVersion", "release", "target", "artifact", "signature", "malwareScan", "secretScan", "interactiveAcceptance", "attestation"]);
  if (manifest.manifestVersion !== 1) add(blockers, "manifestVersion", "must equal 1");

  if (!SHA.test(expectedCommit ?? "")) add(blockers, "expectedCommit", "must be an independently supplied lowercase 40-character Git SHA");
  if (!validDigest(expectedSha256)) add(blockers, "expectedSha256", "must be an independently supplied non-placeholder lowercase SHA-256");
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0) add(blockers, "expectedBytes", "must be an independently supplied positive integer");
  if (typeof expectedSignerSubject !== "string" || expectedSignerSubject.trim().length < 3) add(blockers, "expectedSignerSubject", "must be independently supplied");
  if (!CERTIFICATE_THUMBPRINT.test(expectedSignerThumbprint ?? "") || /^(.)\1+$/.test(expectedSignerThumbprint ?? "")) add(blockers, "expectedSignerThumbprint", "must be an independently supplied non-placeholder uppercase certificate thumbprint");

  const release = object(manifest.release);
  exactKeys(blockers, release, "release", ["branch", "commitSha"]);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (!SHA.test(release.commitSha ?? "")) add(blockers, "release.commitSha", "must be a lowercase 40-character Git SHA");
  else if (SHA.test(expectedCommit ?? "") && release.commitSha !== expectedCommit) add(blockers, "release.commitSha", "must equal the independently supplied commit");

  const target = object(manifest.target);
  exactKeys(blockers, target, "target", ["environment", "origin", "supabaseProjectRef", "platform", "architecture", "productionContacted", "muxContacted"]);
  if (target.environment !== "staging") add(blockers, "target.environment", "must equal staging");
  if (target.origin !== STAGING_ORIGIN) add(blockers, "target.origin", `must equal ${STAGING_ORIGIN}`);
  if (target.supabaseProjectRef !== STAGING_PROJECT_REF) add(blockers, "target.supabaseProjectRef", `must equal ${STAGING_PROJECT_REF}`);
  if (target.platform !== "Windows") add(blockers, "target.platform", "must equal Windows");
  if (target.architecture !== "x64") add(blockers, "target.architecture", "must equal x64");
  requireFalse(blockers, target.productionContacted, "target.productionContacted");
  requireFalse(blockers, target.muxContacted, "target.muxContacted");

  const artifact = object(manifest.artifact);
  exactKeys(blockers, artifact, "artifact", ["fileName", "sha256", "bytes", "format"]);
  if (artifact.fileName !== "JS-Video-Uploader-Setup.exe") add(blockers, "artifact.fileName", "must equal JS-Video-Uploader-Setup.exe");
  if (artifact.format !== "NSIS-per-user") add(blockers, "artifact.format", "must equal NSIS-per-user");
  if (!validDigest(artifact.sha256) || artifact.sha256 !== expectedSha256) add(blockers, "artifact.sha256", "must match the independently supplied non-placeholder installer SHA-256");
  if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0 || artifact.bytes !== expectedBytes) add(blockers, "artifact.bytes", "must match the independently supplied installer size");

  const signature = object(manifest.signature);
  exactKeys(blockers, signature, "signature", ["artifactSha256", "authenticodeStatus", "certificatePurpose", "signerSubject", "signerThumbprint", "digestAlgorithm", "timestamped", "timestamp", "timestampAuthority", "timestampSignatureValid"]);
  if (signature.artifactSha256 !== expectedSha256 || signature.artifactSha256 !== artifact.sha256) add(blockers, "signature.artifactSha256", "must bind signing evidence to the exact installer");
  if (signature.authenticodeStatus !== "Valid") add(blockers, "signature.authenticodeStatus", "must equal Valid");
  if (signature.certificatePurpose !== "code-signing") add(blockers, "signature.certificatePurpose", "must equal code-signing");
  if (signature.signerSubject !== expectedSignerSubject) add(blockers, "signature.signerSubject", "must match the independently approved signer subject");
  if (signature.signerThumbprint !== expectedSignerThumbprint) add(blockers, "signature.signerThumbprint", "must match the independently approved signer certificate thumbprint");
  if (signature.digestAlgorithm !== "SHA256") add(blockers, "signature.digestAlgorithm", "must equal SHA256");
  requireTrue(blockers, signature.timestamped, "signature.timestamped");
  validateTimestamp(blockers, signature.timestamp, "signature.timestamp", now);
  if (typeof signature.timestampAuthority !== "string" || signature.timestampAuthority.trim().length < 3) add(blockers, "signature.timestampAuthority", "must identify the timestamp authority without secrets or personal data");
  requireTrue(blockers, signature.timestampSignatureValid, "signature.timestampSignatureValid");

  const malwareScan = object(manifest.malwareScan);
  exactKeys(blockers, malwareScan, "malwareScan", ["artifactSha256", "engine", "engineVersion", "definitionVersion", "scannedAt", "result", "detections"]);
  if (malwareScan.artifactSha256 !== expectedSha256) add(blockers, "malwareScan.artifactSha256", "must bind scan evidence to the exact installer");
  for (const key of ["engine", "engineVersion", "definitionVersion"]) {
    if (typeof malwareScan[key] !== "string" || malwareScan[key].trim().length < 2) add(blockers, `malwareScan.${key}`, "must be recorded");
  }
  validateTimestamp(blockers, malwareScan.scannedAt, "malwareScan.scannedAt", now, MAX_MALWARE_SCAN_AGE_MS);
  if (malwareScan.result !== "clean") add(blockers, "malwareScan.result", "must equal clean");
  if (malwareScan.detections !== 0) add(blockers, "malwareScan.detections", "must equal 0");

  const secretScan = object(manifest.secretScan);
  exactKeys(blockers, secretScan, "secretScan", ["artifactSha256", "asarInspected", "publicConfigOnly", "secretPatternsFound", "privateKeysFound", "providerCredentialsFound", "scannedAt"]);
  if (secretScan.artifactSha256 !== expectedSha256) add(blockers, "secretScan.artifactSha256", "must bind secret-scan evidence to the exact installer");
  requireTrue(blockers, secretScan.asarInspected, "secretScan.asarInspected");
  requireTrue(blockers, secretScan.publicConfigOnly, "secretScan.publicConfigOnly");
  for (const key of ["secretPatternsFound", "privateKeysFound", "providerCredentialsFound"]) {
    if (secretScan[key] !== 0) add(blockers, `secretScan.${key}`, "must equal 0");
  }
  validateTimestamp(blockers, secretScan.scannedAt, "secretScan.scannedAt", now);

  const acceptance = object(manifest.interactiveAcceptance);
  exactKeys(blockers, acceptance, "interactiveAcceptance", ["artifactSha256", "physicalMachine", "interactiveDesktop", "windowsVersion", "architecture", "testedAt", "cleanInstallBaseline", "installerCompleted", "applicationLaunched", "stagingSignInCompleted", "videoSelected", "localProcessingCompleted", "uploadBoundaryVerified", "uploadRequestSent", "repositoryDraftCreated", "muxAssetCreated", "applicationExited", "uninstallerCompleted", "installDirectoryRemoved", "testAccountDataRecorded", "evidenceBundleSha256"]);
  if (acceptance.artifactSha256 !== expectedSha256) add(blockers, "interactiveAcceptance.artifactSha256", "must bind acceptance evidence to the exact installer");
  requireTrue(blockers, acceptance.physicalMachine, "interactiveAcceptance.physicalMachine");
  requireTrue(blockers, acceptance.interactiveDesktop, "interactiveAcceptance.interactiveDesktop");
  if (!VERSION.test(acceptance.windowsVersion ?? "")) add(blockers, "interactiveAcceptance.windowsVersion", "must be a numeric Windows version");
  if (acceptance.architecture !== "x64") add(blockers, "interactiveAcceptance.architecture", "must equal x64");
  validateTimestamp(blockers, acceptance.testedAt, "interactiveAcceptance.testedAt", now);
  for (const key of ["cleanInstallBaseline", "installerCompleted", "applicationLaunched", "stagingSignInCompleted", "videoSelected", "localProcessingCompleted", "uploadBoundaryVerified", "applicationExited", "uninstallerCompleted", "installDirectoryRemoved"]) requireTrue(blockers, acceptance[key], `interactiveAcceptance.${key}`);
  for (const key of ["uploadRequestSent", "repositoryDraftCreated", "muxAssetCreated", "testAccountDataRecorded"]) requireFalse(blockers, acceptance[key], `interactiveAcceptance.${key}`);
  if (!validDigest(acceptance.evidenceBundleSha256) || acceptance.evidenceBundleSha256 === expectedSha256) add(blockers, "interactiveAcceptance.evidenceBundleSha256", "must be a distinct non-placeholder lowercase SHA-256 evidence-bundle digest");

  const attestation = object(manifest.attestation);
  exactKeys(blockers, attestation, "attestation", ["recordedByRole", "reviewedByRole", "reviewedAt", "artifactAndEvidenceReviewed", "allFindingsResolved"]);
  if (attestation.recordedByRole !== "release-tester") add(blockers, "attestation.recordedByRole", "must equal release-tester without naming a person");
  if (attestation.reviewedByRole !== "independent-reviewer") add(blockers, "attestation.reviewedByRole", "must equal independent-reviewer without naming a person");
  validateTimestamp(blockers, attestation.reviewedAt, "attestation.reviewedAt", now);
  if (timestamp(attestation.reviewedAt) && timestamp(acceptance.testedAt) && Date.parse(attestation.reviewedAt) < Date.parse(acceptance.testedAt)) add(blockers, "attestation.reviewedAt", "must not be earlier than interactive acceptance");
  requireTrue(blockers, attestation.artifactAndEvidenceReviewed, "attestation.artifactAndEvidenceReviewed");
  requireTrue(blockers, attestation.allFindingsResolved, "attestation.allFindingsResolved");

  warnings.push("This offline gate validates sanitized evidence only. It does not sign, scan, install, launch, upload, contact staging/providers, or authorize production.");
  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0 ? { commitSha: release.commitSha, artifactSha256: artifact.sha256, bytes: artifact.bytes, signerThumbprint: signature.signerThumbprint, target: target.origin } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log("Usage: node scripts/installer-release-readiness.mjs --manifest=<protected-json> --expected-commit=<40-char-sha> --expected-sha256=<64-char-sha> --expected-bytes=<integer> --expected-signer-subject=<subject> --expected-signer-thumbprint=<thumbprint>");
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  const expectedBytesText = option(argv, "--expected-bytes");
  if (!manifestPath) {
    console.error(JSON.stringify({ ready: false, error: "Manifest path and independently supplied release inputs are required." }, null, 2));
    return 2;
  }
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { console.error(JSON.stringify({ ready: false, error: "Installer evidence manifest could not be read." }, null, 2)); return 2; }
  const result = evaluateInstallerReleaseReadiness(manifest, {
    expectedCommit: option(argv, "--expected-commit"),
    expectedSha256: option(argv, "--expected-sha256"),
    expectedBytes: /^\d+$/.test(expectedBytesText ?? "") ? Number(expectedBytesText) : Number.NaN,
    expectedSignerSubject: option(argv, "--expected-signer-subject"),
    expectedSignerThumbprint: option(argv, "--expected-signer-thumbprint"),
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await runCli();

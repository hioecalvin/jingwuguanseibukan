import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evaluateInstallerReleaseReadiness } from "./installer-release-readiness.mjs";

const NOW = Date.parse("2026-10-01T12:00:00+10:00");
const COMMIT = "a".repeat(40);
const ARTIFACT_SHA = "ab".repeat(32);
const EVIDENCE_SHA = "cd".repeat(32);
const BYTES = 12345678;
const SIGNER = "CN=Jingwuguan Seibukan, O=Jingwuguan Seibukan";
const THUMBPRINT = "AB".repeat(20);

function validManifest() {
  return {
    manifestVersion: 1,
    release: { branch: "release/v1-readiness-20260918", commitSha: COMMIT },
    target: { environment: "staging", origin: "https://jingwuguanseibukan-staging.vercel.app", supabaseProjectRef: "eomubndonbetszdbhsrj", platform: "Windows", architecture: "x64", productionContacted: false, muxContacted: false },
    artifact: { fileName: "JS-Video-Uploader-Setup.exe", sha256: ARTIFACT_SHA, bytes: BYTES, format: "NSIS-per-user" },
    signature: { artifactSha256: ARTIFACT_SHA, authenticodeStatus: "Valid", certificatePurpose: "code-signing", signerSubject: SIGNER, signerThumbprint: THUMBPRINT, digestAlgorithm: "SHA256", timestamped: true, timestamp: "2026-09-30T09:00:00+10:00", timestampAuthority: "Trusted RFC 3161 Authority", timestampSignatureValid: true },
    malwareScan: { artifactSha256: ARTIFACT_SHA, engine: "Microsoft Defender Antivirus", engineVersion: "1.1.1.1", definitionVersion: "1.2.3.4", scannedAt: "2026-10-01T09:00:00+10:00", result: "clean", detections: 0 },
    secretScan: { artifactSha256: ARTIFACT_SHA, asarInspected: true, publicConfigOnly: true, secretPatternsFound: 0, privateKeysFound: 0, providerCredentialsFound: 0, scannedAt: "2026-10-01T09:05:00+10:00" },
    interactiveAcceptance: {
      artifactSha256: ARTIFACT_SHA, physicalMachine: true, interactiveDesktop: true, windowsVersion: "11.0.26100", architecture: "x64", testedAt: "2026-10-01T10:00:00+10:00",
      cleanInstallBaseline: true, installerCompleted: true, applicationLaunched: true, stagingSignInCompleted: true, videoSelected: true, localProcessingCompleted: true, uploadBoundaryVerified: true,
      uploadRequestSent: false, repositoryDraftCreated: false, muxAssetCreated: false, applicationExited: true, uninstallerCompleted: true, installDirectoryRemoved: true, testAccountDataRecorded: false, evidenceBundleSha256: EVIDENCE_SHA,
    },
    attestation: { recordedByRole: "release-tester", reviewedByRole: "independent-reviewer", reviewedAt: "2026-10-01T11:00:00+10:00", artifactAndEvidenceReviewed: true, allFindingsResolved: true },
  };
}

function options(overrides = {}) {
  return { expectedCommit: COMMIT, expectedSha256: ARTIFACT_SHA, expectedBytes: BYTES, expectedSignerSubject: SIGNER, expectedSignerThumbprint: THUMBPRINT, now: NOW, ...overrides };
}

test("reviewed exact-artifact staging installer evidence passes", () => {
  const result = evaluateInstallerReleaseReadiness(validManifest(), options());
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.deepEqual(result.summary, { commitSha: COMMIT, artifactSha256: ARTIFACT_SHA, bytes: BYTES, signerThumbprint: THUMBPRINT, target: "https://jingwuguanseibukan-staging.vercel.app" });
});

test("checked-in template fails closed", async () => {
  const template = JSON.parse(await readFile(new URL("../release/installer-release-evidence.template.json", import.meta.url), "utf8"));
  const result = evaluateInstallerReleaseReadiness(template, options());
  assert.equal(result.ready, false);
  for (const path of ["artifact.sha256", "artifact.bytes", "signature.authenticodeStatus", "malwareScan.result", "secretScan.asarInspected", "interactiveAcceptance.installerCompleted", "attestation.allFindingsResolved"]) assert.ok(result.blockers.some(blocker => blocker.path === path), `missing fail-closed blocker for ${path}`);
});

test("artifact identity must match independent hash, size, commit, and signer inputs", () => {
  const result = evaluateInstallerReleaseReadiness(validManifest(), options({ expectedCommit: "e".repeat(40), expectedSha256: "f".repeat(64), expectedBytes: BYTES + 1, expectedSignerSubject: "CN=Other", expectedSignerThumbprint: "A".repeat(40) }));
  assert.equal(result.ready, false);
  for (const path of ["release.commitSha", "artifact.sha256", "artifact.bytes", "signature.signerSubject", "signature.signerThumbprint"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("Authenticode and trusted timestamp evidence fail closed", () => {
  const manifest = validManifest();
  Object.assign(manifest.signature, { authenticodeStatus: "NotSigned", certificatePurpose: "server-auth", digestAlgorithm: "SHA1", timestamped: false, timestampSignatureValid: false });
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["signature.authenticodeStatus", "signature.certificatePurpose", "signature.digestAlgorithm", "signature.timestamped", "signature.timestampSignatureValid"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("malware and embedded-secret evidence must be current, clean, and bound to the installer", () => {
  const manifest = validManifest();
  Object.assign(manifest.malwareScan, { artifactSha256: "0".repeat(64), scannedAt: "2026-09-01T09:00:00+10:00", result: "unknown", detections: 1 });
  Object.assign(manifest.secretScan, { publicConfigOnly: false, secretPatternsFound: 1, providerCredentialsFound: 1 });
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["malwareScan.artifactSha256", "malwareScan.scannedAt", "malwareScan.result", "malwareScan.detections", "secretScan.publicConfigOnly", "secretScan.secretPatternsFound", "secretScan.providerCredentialsFound"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("interactive acceptance requires physical Windows x64, staging upload boundary, and uninstall", () => {
  const manifest = validManifest();
  Object.assign(manifest.interactiveAcceptance, { physicalMachine: false, architecture: "arm64", uploadBoundaryVerified: false, uploadRequestSent: true, repositoryDraftCreated: true, muxAssetCreated: true, uninstallerCompleted: false, installDirectoryRemoved: false });
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["interactiveAcceptance.physicalMachine", "interactiveAcceptance.architecture", "interactiveAcceptance.uploadBoundaryVerified", "interactiveAcceptance.uploadRequestSent", "interactiveAcceptance.repositoryDraftCreated", "interactiveAcceptance.muxAssetCreated", "interactiveAcceptance.uninstallerCompleted", "interactiveAcceptance.installDirectoryRemoved"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("production or Mux contact is rejected", () => {
  const manifest = validManifest();
  Object.assign(manifest.target, { environment: "production", origin: "https://jingwuguanseibukan.com", supabaseProjectRef: "pkmllhaavadhaozmwapz", productionContacted: true, muxContacted: true });
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["target.environment", "target.origin", "target.supabaseProjectRef", "target.productionContacted", "target.muxContacted"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("unknown fields and sensitive values are rejected", () => {
  const manifest = validManifest();
  manifest.interactiveAcceptance.accountEmail = "uploader@example.test";
  manifest["private-person@example.test"] = "private-person@example.test";
  manifest.attestation.notes = "Bearer secret-token";
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "interactiveAcceptance"));
  assert.ok(result.blockers.some(blocker => blocker.path.includes("[field]")));
  assert.doesNotMatch(JSON.stringify(result), /private-person|accountEmail|notes/);
});

test("review must follow physical acceptance", () => {
  const manifest = validManifest();
  manifest.attestation.reviewedAt = "2026-10-01T09:00:00+10:00";
  const result = evaluateInstallerReleaseReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "attestation.reviewedAt" && /earlier/.test(blocker.message)));
});

test("placeholder artifact, evidence and signer fingerprints never pass", () => {
  const manifest = validManifest();
  manifest.artifact.sha256 = "a".repeat(64);
  manifest.signature.artifactSha256 = "a".repeat(64);
  manifest.malwareScan.artifactSha256 = "a".repeat(64);
  manifest.secretScan.artifactSha256 = "a".repeat(64);
  manifest.interactiveAcceptance.artifactSha256 = "a".repeat(64);
  manifest.interactiveAcceptance.evidenceBundleSha256 = "b".repeat(64);
  manifest.signature.signerThumbprint = "C".repeat(40);
  const result = evaluateInstallerReleaseReadiness(manifest, options({
    expectedSha256: "a".repeat(64),
    expectedSignerThumbprint: "C".repeat(40),
  }));
  assert.equal(result.ready, false);
  for (const path of ["expectedSha256", "expectedSignerThumbprint", "artifact.sha256", "interactiveAcceptance.evidenceBundleSha256"]) {
    assert.ok(result.blockers.some(blocker => blocker.path === path), path);
  }
});

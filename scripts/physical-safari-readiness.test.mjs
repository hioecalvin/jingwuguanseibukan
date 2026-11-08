import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_BRANCH,
  STAGING_ORIGIN,
  STAGING_PROJECT_REF,
  evaluatePhysicalSafariReadiness,
} from "./physical-safari-readiness.mjs";

const RELEASE_SHA = "a".repeat(40);
const DEPLOYMENT_ID = "dpl_12345678";
const NOW = Date.parse("2026-10-15T10:00:00+11:00");
const MINIMUM_VERSIONS = {
  "macos-safari": { osVersion: "26.0", safariVersion: "26.0" },
  "ios-safari": { osVersion: "26.0", safariVersion: "26.0" },
  "ipados-safari": { osVersion: "26.0", safariVersion: "26.0" },
};

function options(overrides = {}) {
  return {
    expectedCommit: RELEASE_SHA,
    expectedDeployment: DEPLOYMENT_ID,
    minimumVersions: MINIMUM_VERSIONS,
    now: NOW,
    ...overrides,
  };
}

function device(id, platform, deviceClass, digestSeed) {
  return {
    id,
    platform,
    deviceClass,
    physicalDevice: true,
    simulator: false,
    browser: "Safari",
    playwrightWebKit: false,
    osVersion: "26.0.1",
    safariVersion: "26.0",
    testedAt: "2026-10-14T10:00:00+11:00",
    deployedCommitSha: RELEASE_SHA,
    deploymentId: DEPLOYMENT_ID,
    workflows: {
      publicNavigation: true,
      loginLogout: true,
      memberReadOnly: true,
      adminReadOnly: true,
      superAdminReadOnly: true,
      certificateVerification: true,
      responsiveLayout: true,
    },
    accessibility: {
      voiceOver: true,
      inputNavigation: true,
      textZoom: true,
      focusLabelsAndErrors: true,
      reducedMotionAndContrast: true,
    },
    evidence: {
      sessionRecordSha256: digestSeed.repeat(64),
      artifactBundleSha256: String(Number(digestSeed) + 3).repeat(64),
    },
  };
}

function validManifest() {
  return {
    manifestVersion: 1,
    release: {
      branch: RELEASE_BRANCH,
      commitSha: RELEASE_SHA,
    },
    target: {
      environment: "staging",
      origin: STAGING_ORIGIN,
      supabaseProjectRef: STAGING_PROJECT_REF,
      deploymentId: DEPLOYMENT_ID,
      readOnly: true,
      productionAuthorization: false,
    },
    dataHandling: {
      dedicatedNonPersonalAccounts: true,
      productionDataUsed: false,
      personalDataRecorded: false,
      secretsRecorded: false,
      mutationsPerformed: false,
    },
    devices: [
      device("macos-safari", "macOS", "Mac", "1"),
      device("ios-safari", "iOS", "iPhone", "2"),
      device("ipados-safari", "iPadOS", "iPad", "3"),
    ],
    attestation: {
      recordedByRole: "release-tester",
      reviewedByRole: "independent-reviewer",
      reviewedAt: "2026-10-14T12:00:00+11:00",
      allFindingsResolved: true,
    },
  };
}

test("accepts complete, current physical Safari evidence without exposing identities", () => {
  const result = evaluatePhysicalSafariReadiness(validManifest(), options());

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.summary.physicalSafariDevices, [
    "ios-safari",
    "ipados-safari",
    "macos-safari",
  ]);
  assert.doesNotMatch(JSON.stringify(result), /release-tester|independent-reviewer/);
});

test("rejects Playwright WebKit, simulation, and missing physical device coverage", () => {
  const manifest = validManifest();
  manifest.devices[0] = {
    ...manifest.devices[0],
    browser: "WebKit",
    physicalDevice: false,
    simulator: true,
    playwrightWebKit: true,
  };
  manifest.devices = manifest.devices.slice(0, 2);

  const result = evaluatePhysicalSafariReadiness(manifest, options());

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path.endsWith(".browser")));
  assert.ok(result.blockers.some(({ path }) => path === "devices"));
});

test("requires login, every read-only role, and manual accessibility evidence on every device", () => {
  const manifest = validManifest();
  manifest.devices[1].workflows.loginLogout = false;
  manifest.devices[1].workflows.superAdminReadOnly = false;
  manifest.devices[2].accessibility.voiceOver = false;

  const result = evaluatePhysicalSafariReadiness(manifest, options());

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path.endsWith("workflows.loginLogout")));
  assert.ok(result.blockers.some(({ path }) => path.endsWith("workflows.superAdminReadOnly")));
  assert.ok(result.blockers.some(({ path }) => path.endsWith("accessibility.voiceOver")));
});

test("is staging-only, read-only, and bound to the independent release commit", () => {
  const manifest = validManifest();
  manifest.release.commitSha = "b".repeat(40);
  manifest.target.environment = "production";
  manifest.target.origin = "https://jingwuguanseibukan.com";
  manifest.target.readOnly = false;
  manifest.target.productionAuthorization = true;
  manifest.dataHandling.mutationsPerformed = true;

  const result = evaluatePhysicalSafariReadiness(manifest, options());

  assert.equal(result.ready, false);
  for (const path of [
    "release.commitSha",
    "target.environment",
    "target.origin",
    "target.readOnly",
    "target.productionAuthorization",
    "dataHandling.mutationsPerformed",
  ]) {
    assert.ok(result.blockers.some(blocker => blocker.path === path), path);
  }
});

test("rejects stale evidence, duplicate digests, personal data, secrets, and extra fields", () => {
  const manifest = validManifest();
  manifest.devices[0].testedAt = "2026-08-01T10:00:00+10:00";
  manifest.devices[1].evidence.sessionRecordSha256 =
    manifest.devices[0].evidence.sessionRecordSha256;
  manifest.attestation.operatorEmail = "person@example.com";
  manifest.secret = "sb_secret_this_must_not_be_recorded";

  const result = evaluatePhysicalSafariReadiness(manifest, options());

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path.endsWith(".testedAt")));
  assert.ok(result.blockers.some(({ message }) => message.includes("unique")));
  assert.ok(result.blockers.some(({ message }) => message.includes("email address")));
  assert.ok(result.blockers.some(({ message }) => message.includes("not permitted")));
});

test("requires resolved independent review and unique valid evidence digests", () => {
  const manifest = validManifest();
  manifest.attestation.reviewedByRole = "release-tester";
  manifest.attestation.reviewedAt = "2026-10-14T09:00:00+11:00";
  manifest.attestation.allFindingsResolved = false;
  manifest.devices[2].evidence.artifactBundleSha256 = "not-a-digest";

  const result = evaluatePhysicalSafariReadiness(manifest, options());

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "attestation.reviewedByRole"));
  assert.ok(result.blockers.some(({ message }) => message.includes("earlier than any device test")));
  assert.ok(result.blockers.some(({ path }) => path === "attestation.allFindingsResolved"));
  assert.ok(result.blockers.some(({ path }) => path.endsWith("artifactBundleSha256")));
});

test("binds every session to the exact deployment and independently approved versions", () => {
  const manifest = validManifest();
  manifest.devices[0].deploymentId = "dpl_other123";
  manifest.devices[1].deployedCommitSha = "b".repeat(40);
  manifest.devices[2].osVersion = "25.9";
  manifest.devices[2].safariVersion = "25.9";
  const result = evaluatePhysicalSafariReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path.endsWith("deploymentId")));
  assert.ok(result.blockers.some(({ path }) => path.endsWith("deployedCommitSha")));
  assert.ok(result.blockers.some(({ message }) => message.includes("approved minimum")));
});

test("never echoes a sensitive unknown field name", () => {
  const manifest = validManifest();
  manifest["person@example.com"] = true;
  const result = evaluatePhysicalSafariReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.doesNotMatch(JSON.stringify(result), /person@example\.com/);
});

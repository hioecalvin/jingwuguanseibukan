import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^\d+(?:\.\d+){0,3}$/;
const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const DEVICE_REQUIREMENTS = Object.freeze({
  "macos-safari": { platform: "macOS", deviceClass: "Mac" },
  "ios-safari": { platform: "iOS", deviceClass: "iPhone" },
  "ipados-safari": { platform: "iPadOS", deviceClass: "iPad" },
});

const REQUIRED_WORKFLOWS = Object.freeze([
  "publicNavigation",
  "loginLogout",
  "memberReadOnly",
  "adminReadOnly",
  "superAdminReadOnly",
  "certificateVerification",
  "responsiveLayout",
]);

const REQUIRED_ACCESSIBILITY = Object.freeze([
  "voiceOver",
  "inputNavigation",
  "textZoom",
  "focusLabelsAndErrors",
  "reducedMotionAndContrast",
]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function exactKeys(blockers, value, path, allowed) {
  for (const key of Object.keys(object(value))) {
    if (!allowed.includes(key)) {
      add(blockers, path, "contains a field that is not permitted in the sanitized evidence manifest");
    }
  }
}

function compareVersions(left, right) {
  const a = String(left).split(".").map(Number);
  const b = String(right).split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function timestamp(value) {
  return typeof value === "string" &&
    ISO_WITH_ZONE.test(value) &&
    Number.isFinite(Date.parse(value));
}

function requireTrue(blockers, value, path) {
  if (value !== true) {
    add(blockers, path, "must be true");
  }
}

function requireFalse(blockers, value, path) {
  if (value !== false) {
    add(blockers, path, "must be false");
  }
}

function validateTimestamp(blockers, value, path, now) {
  if (!timestamp(value)) {
    add(blockers, path, "must be an ISO-8601 timestamp with an explicit offset");
    return;
  }

  const time = Date.parse(value);
  if (!Number.isFinite(now) || time > now + 5 * 60 * 1000) {
    add(blockers, path, "must not be in the future");
  } else if (now - time > MAX_EVIDENCE_AGE_MS) {
    add(blockers, path, "must be no more than 30 days old");
  }
}

function containsSensitiveString(value) {
  return typeof value === "string" && (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) ||
    /\bBearer\s+[A-Za-z0-9._~-]+/i.test(value) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value) ||
    /\b(?:sb_secret_|re_[A-Za-z0-9_]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/.test(value)
  );
}

function scanStrings(blockers, value, path = "$") {
  if (containsSensitiveString(value)) {
    add(blockers, path, "must not contain an email address, credential, token, or private key");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanStrings(blockers, entry, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      scanStrings(blockers, entry, `${path}.${key}`);
    }
  }
}

export function evaluatePhysicalSafariReadiness(
  manifest,
  { expectedCommit, expectedDeployment, minimumVersions = {}, now = Date.now() } = {},
) {
  const blockers = [];
  const warnings = [];

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      ready: false,
      blockers: [{ path: "$", message: "manifest must be a JSON object" }],
      warnings,
      summary: null,
    };
  }

  scanStrings(blockers, manifest);
  exactKeys(blockers, manifest, "$", [
    "manifestVersion",
    "release",
    "target",
    "dataHandling",
    "devices",
    "attestation",
  ]);

  if (manifest.manifestVersion !== 1) {
    add(blockers, "manifestVersion", "must equal 1");
  }
  if (!SHA.test(expectedCommit ?? "")) {
    add(blockers, "expectedCommit", "must be an independently supplied lowercase 40-character Git SHA");
  }
  if (typeof expectedDeployment !== "string" || !/^dpl_[A-Za-z0-9]{8,}$/.test(expectedDeployment)) {
    add(blockers, "expectedDeployment", "must be an independently supplied Vercel deployment id");
  }
  for (const id of Object.keys(DEVICE_REQUIREMENTS)) {
    const approved = object(minimumVersions[id]);
    if (!VERSION.test(approved.osVersion ?? "") || !VERSION.test(approved.safariVersion ?? "")) {
      add(blockers, `minimumVersions.${id}`, "must independently supply numeric minimum OS and Safari versions");
    }
  }

  const release = object(manifest.release);
  exactKeys(blockers, release, "release", ["branch", "commitSha"]);
  if (release.branch !== RELEASE_BRANCH) {
    add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  }
  if (!SHA.test(release.commitSha ?? "")) {
    add(blockers, "release.commitSha", "must be a lowercase 40-character Git SHA");
  } else if (SHA.test(expectedCommit ?? "") && release.commitSha !== expectedCommit) {
    add(blockers, "release.commitSha", "must equal the independently supplied expected commit");
  }

  const target = object(manifest.target);
  exactKeys(blockers, target, "target", [
    "environment",
    "origin",
    "supabaseProjectRef",
    "deploymentId",
    "readOnly",
    "productionAuthorization",
  ]);
  if (target.environment !== "staging") {
    add(blockers, "target.environment", "must equal staging");
  }
  if (target.origin !== STAGING_ORIGIN) {
    add(blockers, "target.origin", `must equal ${STAGING_ORIGIN}`);
  }
  if (target.supabaseProjectRef !== STAGING_PROJECT_REF) {
    add(blockers, "target.supabaseProjectRef", `must equal ${STAGING_PROJECT_REF}`);
  }
  if (target.deploymentId !== expectedDeployment) {
    add(blockers, "target.deploymentId", "must equal the independently supplied deployment id");
  }
  requireTrue(blockers, target.readOnly, "target.readOnly");
  requireFalse(blockers, target.productionAuthorization, "target.productionAuthorization");

  const dataHandling = object(manifest.dataHandling);
  exactKeys(blockers, dataHandling, "dataHandling", [
    "dedicatedNonPersonalAccounts",
    "productionDataUsed",
    "personalDataRecorded",
    "secretsRecorded",
    "mutationsPerformed",
  ]);
  requireTrue(
    blockers,
    dataHandling.dedicatedNonPersonalAccounts,
    "dataHandling.dedicatedNonPersonalAccounts",
  );
  for (const key of [
    "productionDataUsed",
    "personalDataRecorded",
    "secretsRecorded",
    "mutationsPerformed",
  ]) {
    requireFalse(blockers, dataHandling[key], `dataHandling.${key}`);
  }

  const devices = Array.isArray(manifest.devices) ? manifest.devices : [];
  if (!Array.isArray(manifest.devices)) {
    add(blockers, "devices", "must be an array");
  }
  if (devices.length !== Object.keys(DEVICE_REQUIREMENTS).length) {
    add(blockers, "devices", "must contain exactly one physical Mac, iPhone, and iPad Safari record");
  }

  const seenDeviceIds = new Set();
  const seenDigests = new Set();
  const testedAtValues = [];
  for (const [index, rawDevice] of devices.entries()) {
    const path = `devices[${index}]`;
    const device = object(rawDevice);
    exactKeys(blockers, device, path, [
      "id",
      "platform",
      "deviceClass",
      "physicalDevice",
      "simulator",
      "browser",
      "playwrightWebKit",
      "osVersion",
      "safariVersion",
      "testedAt",
      "deployedCommitSha",
      "deploymentId",
      "workflows",
      "accessibility",
      "evidence",
    ]);

    const requirement = DEVICE_REQUIREMENTS[device.id];
    if (!requirement || seenDeviceIds.has(device.id)) {
      add(blockers, `${path}.id`, "must be one unique required device id");
    } else {
      seenDeviceIds.add(device.id);
      if (device.platform !== requirement.platform) {
        add(blockers, `${path}.platform`, `must equal ${requirement.platform}`);
      }
      if (device.deviceClass !== requirement.deviceClass) {
        add(blockers, `${path}.deviceClass`, `must equal ${requirement.deviceClass}`);
      }
    }
    requireTrue(blockers, device.physicalDevice, `${path}.physicalDevice`);
    requireFalse(blockers, device.simulator, `${path}.simulator`);
    if (device.browser !== "Safari") {
      add(blockers, `${path}.browser`, "must equal Safari; Playwright WebKit is not physical Safari evidence");
    }
    requireFalse(blockers, device.playwrightWebKit, `${path}.playwrightWebKit`);
    if (!VERSION.test(device.osVersion ?? "")) {
      add(blockers, `${path}.osVersion`, "must be a numeric OS version");
    }
    if (!VERSION.test(device.safariVersion ?? "")) {
      add(blockers, `${path}.safariVersion`, "must be a numeric Safari version");
    }
    const approved = object(minimumVersions[device.id]);
    if (VERSION.test(device.osVersion ?? "") && VERSION.test(approved.osVersion ?? "") &&
        compareVersions(device.osVersion, approved.osVersion) < 0) {
      add(blockers, `${path}.osVersion`, "must meet the independently approved minimum version");
    }
    if (VERSION.test(device.safariVersion ?? "") && VERSION.test(approved.safariVersion ?? "") &&
        compareVersions(device.safariVersion, approved.safariVersion) < 0) {
      add(blockers, `${path}.safariVersion`, "must meet the independently approved minimum version");
    }
    if (device.deployedCommitSha !== expectedCommit || device.deployedCommitSha !== release.commitSha) {
      add(blockers, `${path}.deployedCommitSha`, "must bind the tested session to the exact release commit");
    }
    if (device.deploymentId !== expectedDeployment || device.deploymentId !== target.deploymentId) {
      add(blockers, `${path}.deploymentId`, "must bind the tested session to the exact staging deployment");
    }
    validateTimestamp(blockers, device.testedAt, `${path}.testedAt`, now);
    if (timestamp(device.testedAt)) {
      testedAtValues.push(Date.parse(device.testedAt));
    }

    const workflows = object(device.workflows);
    exactKeys(blockers, workflows, `${path}.workflows`, REQUIRED_WORKFLOWS);
    for (const key of REQUIRED_WORKFLOWS) {
      requireTrue(blockers, workflows[key], `${path}.workflows.${key}`);
    }

    const accessibility = object(device.accessibility);
    exactKeys(blockers, accessibility, `${path}.accessibility`, REQUIRED_ACCESSIBILITY);
    for (const key of REQUIRED_ACCESSIBILITY) {
      requireTrue(blockers, accessibility[key], `${path}.accessibility.${key}`);
    }

    const evidence = object(device.evidence);
    exactKeys(blockers, evidence, `${path}.evidence`, [
      "sessionRecordSha256",
      "artifactBundleSha256",
    ]);
    for (const key of ["sessionRecordSha256", "artifactBundleSha256"]) {
      const digest = evidence[key];
      if (!SHA256.test(digest ?? "")) {
        add(blockers, `${path}.evidence.${key}`, "must be a lowercase 64-character SHA-256 digest");
      } else if (seenDigests.has(digest)) {
        add(blockers, `${path}.evidence.${key}`, "must be unique across device evidence");
      } else {
        seenDigests.add(digest);
      }
    }
  }

  for (const deviceId of Object.keys(DEVICE_REQUIREMENTS)) {
    if (!seenDeviceIds.has(deviceId)) {
      add(blockers, "devices", `must include ${deviceId}`);
    }
  }

  const attestation = object(manifest.attestation);
  exactKeys(blockers, attestation, "attestation", [
    "recordedByRole",
    "reviewedByRole",
    "reviewedAt",
    "allFindingsResolved",
  ]);
  if (attestation.recordedByRole !== "release-tester") {
    add(blockers, "attestation.recordedByRole", "must equal release-tester without naming a person");
  }
  if (attestation.reviewedByRole !== "independent-reviewer") {
    add(blockers, "attestation.reviewedByRole", "must equal independent-reviewer without naming a person");
  }
  validateTimestamp(blockers, attestation.reviewedAt, "attestation.reviewedAt", now);
  if (
    timestamp(attestation.reviewedAt) &&
    testedAtValues.length > 0 &&
    Date.parse(attestation.reviewedAt) < Math.max(...testedAtValues)
  ) {
    add(blockers, "attestation.reviewedAt", "must not be earlier than any device test");
  }
  requireTrue(blockers, attestation.allFindingsResolved, "attestation.allFindingsResolved");

  warnings.push(
    "This offline gate validates sanitized physical-Safari evidence only; it does not contact staging or authorize production.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0
      ? {
          branch: release.branch,
          commitSha: release.commitSha,
          origin: target.origin,
          deploymentId: target.deploymentId,
          physicalSafariDevices: [...seenDeviceIds].sort(),
        }
      : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/physical-safari-readiness.mjs --manifest=<protected-json> --expected-commit=<40-char-sha> --expected-deployment=<dpl_id> --minimum-macos=<os,safari> --minimum-ios=<os,safari> --minimum-ipados=<os,safari>",
    "The check is offline and does not contact staging or authorize production.",
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }

  const manifestPath = option(argv, "--manifest");
  const expectedCommit = option(argv, "--expected-commit");
  const expectedDeployment = option(argv, "--expected-deployment");
  const parseMinimum = (name) => {
    const [osVersion, safariVersion] = (option(argv, name) ?? "").split(",");
    return { osVersion, safariVersion };
  };
  if (!manifestPath || !expectedCommit || !expectedDeployment) {
    console.error(JSON.stringify({
      ready: false,
      error: "Manifest path, expected commit and expected deployment are required.",
    }, null, 2));
    return 2;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({
      ready: false,
      error: "Physical-Safari evidence manifest could not be read.",
    }, null, 2));
    return 2;
  }

  const result = evaluatePhysicalSafariReadiness(manifest, {
    expectedCommit,
    expectedDeployment,
    minimumVersions: {
      "macos-safari": parseMinimum("--minimum-macos"),
      "ios-safari": parseMinimum("--minimum-ios"),
      "ipados-safari": parseMinimum("--minimum-ipados"),
    },
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}

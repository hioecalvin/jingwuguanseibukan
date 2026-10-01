import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateProviderDeliveryAttestation,
  evaluateProviderDeliveryReadiness,
} from "./provider-delivery-readiness.mjs";

const NOW = Date.parse("2026-10-01T10:30:00.000Z");
const PROJECT = "abcdefghijklmnopqrst";
const COMMIT = "ab".repeat(20);
const DEPLOYMENT = "dpl_ProviderDelivery123";
const STAGING_DEPLOYMENT = "dpl_StagingMuxEvidence123";
const hash = (label) => createHash("sha256").update(label).digest("hex");

function fixture() {
  const manifest = {
    schemaVersion: 1,
    environment: "production",
    applicationOrigin: "https://jingwuguanseibukan.com",
    projectRef: PROJECT,
    policy: "jingwuguan-provider-delivery-v1",
    fingerprintPolicy: "keyed-hmac-sha256-v1",
    release: { branch: "release/v1-readiness-20260918", commitSha: COMMIT, deploymentId: DEPLOYMENT },
    dedicatedInbox: {
      policy: "dedicated-non-role-inbox", capturedAt: "2026-10-01T09:00:00.000Z",
      mailboxFingerprintSha256: hash("mailbox-fingerprint"), deliverable: true,
      ownedByReleaseTeam: true, notRoleAccount: true, notSenderMailbox: true,
      notSecurityTestIdentity: true, notReservedDomain: true, evidenceSha256: hash("inbox-evidence"),
    },
    resend: {
      capturedAt: "2026-10-01T09:05:00.000Z", senderDomainVerified: true, dnsVerified: true,
      senderIdentityVerified: true, customSmtpVerified: true, leastPrivilegeCredentialVerified: true,
      deliveryLogsReviewed: true, evidenceSha256: hash("resend-evidence"),
    },
    authDelivery: {
      capturedAt: "2026-10-01T09:10:00.000Z", emailConfirmationDelivered: true,
      confirmationLinkOrigin: "https://jingwuguanseibukan.com/auth/confirm", passwordResetDelivered: true,
      passwordResetLinkOrigin: "https://jingwuguanseibukan.com", recipientMatchedDedicatedInboxFingerprint: true,
      recipientMailboxFingerprintSha256: hash("mailbox-fingerprint"),
      providerStatusDelivered: true, evidenceSha256: hash("auth-evidence"),
    },
    applicationDelivery: {
      capturedAt: "2026-10-01T09:15:00.000Z", memberAnnouncementDelivered: true,
      eventNotificationDelivered: true, emailWorkerDeliveryObserved: true,
      recipientMatchedDedicatedInboxFingerprint: true, providerStatusDelivered: true,
      recipientMailboxFingerprintSha256: hash("mailbox-fingerprint"),
      evidenceSha256: hash("application-evidence"),
    },
    emailWorker: {
      capturedAt: "2026-10-01T09:20:00.000Z", transientFailureObserved: true,
      retryBackoffObserved: true, eventualRetryDelivered: true, exhaustionObserved: true,
      exhaustedMessageNotRetried: true, failureTelemetryObserved: true, queueBaselineRestored: true,
      evidenceSha256: hash("worker-evidence"),
    },
    mux: {
      disposition: "staging-release-evidence", capturedAt: "2026-10-01T09:25:00.000Z",
      sourceEnvironment: "staging", sourceProjectRef: "eomubndonbetszdbhsrj", releaseCommitSha: COMMIT,
      sourceDeploymentId: STAGING_DEPLOYMENT, muxEnvironmentFingerprintSha256: hash("mux-environment"),
      directUploadCompleted: true, signedPlaybackPassed: true, unsignedPlaybackDenied: true,
      assetDeleted: true, repositoryDraftDeleted: true, zeroResidueVerified: true,
      evidenceSha256: hash("mux-evidence"),
    },
    safety: {
      noTestIdentityCreated: true, noRoleIdentityUsedAsInbox: true,
      noProductionMutation: true, noProductionMemberDataChanged: true,
      noProductionContentPublished: true, noProviderAssetResidue: true,
      protectedEvidenceContainsNoSecretsOrPii: true, diagnosticsSanitized: true,
    },
    independentReview: {
      reviewedAt: "2026-10-01T09:30:00.000Z", reviewerRole: "independent-release-reviewer",
      reviewerFingerprintSha256: hash("reviewer"), result: "approved", projectRef: PROJECT,
      commitSha: COMMIT, deploymentId: DEPLOYMENT,
      dedicatedInboxEvidenceSha256: hash("inbox-evidence"), resendEvidenceSha256: hash("resend-evidence"),
      authDeliveryEvidenceSha256: hash("auth-evidence"), applicationDeliveryEvidenceSha256: hash("application-evidence"),
      emailWorkerEvidenceSha256: hash("worker-evidence"), muxEvidenceSha256: hash("mux-evidence"),
      attestationSha256: hash("pending"),
    },
  };
  manifest.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(manifest);
  return manifest;
}

function evaluate(manifest, overrides = {}) {
  return evaluateProviderDeliveryReadiness(manifest, {
    expectedProjectRef: PROJECT, expectedCommit: COMMIT, expectedDeployment: DEPLOYMENT, now: NOW, ...overrides,
  });
}

test("accepts complete, current, release-bound provider evidence", () => {
  const result = evaluate(fixture());
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.deepEqual(result.target, {
    environment: "production", projectRef: PROJECT, commitSha: COMMIT,
    deploymentId: DEPLOYMENT, dedicatedInboxPolicy: "dedicated-non-role-inbox",
  });
});

test("checked-in template fails closed", () => {
  const template = JSON.parse(readFileSync(new URL("../release/provider-delivery-manifest.template.json", import.meta.url), "utf8"));
  assert.equal(evaluate(template).ready, false);
});

test("rejects mismatched production target, release, and deployment bindings", () => {
  const manifest = fixture();
  manifest.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.release.commitSha = "cd".repeat(20);
  manifest.release.deploymentId = "dpl_OtherDeployment99";
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.match(result.blockers.map(({ path }) => path).join("\n"), /projectRef[\s\S]*release.commitSha[\s\S]*release.deploymentId/);
});

test("rejects role, sender, security-test, or reserved inbox reuse", () => {
  const manifest = fixture();
  manifest.dedicatedInbox.notRoleAccount = false;
  manifest.dedicatedInbox.notSenderMailbox = false;
  manifest.dedicatedInbox.notSecurityTestIdentity = false;
  manifest.dedicatedInbox.notReservedDomain = false;
  const paths = evaluate(manifest).blockers.map(({ path }) => path);
  for (const field of ["notRoleAccount", "notSenderMailbox", "notSecurityTestIdentity", "notReservedDomain"]) {
    assert(paths.includes(`dedicatedInbox.${field}`));
  }
});

test("requires every Auth, application, retry, exhaustion, and Mux outcome", () => {
  const manifest = fixture();
  manifest.authDelivery.passwordResetDelivered = false;
  manifest.applicationDelivery.eventNotificationDelivered = false;
  manifest.emailWorker.eventualRetryDelivered = false;
  manifest.emailWorker.exhaustionObserved = false;
  manifest.mux.signedPlaybackPassed = false;
  manifest.mux.zeroResidueVerified = false;
  const paths = evaluate(manifest).blockers.map(({ path }) => path);
  for (const path of ["authDelivery.passwordResetDelivered", "applicationDelivery.eventNotificationDelivered", "emailWorker.eventualRetryDelivered", "emailWorker.exhaustionObserved", "mux.signedPlaybackPassed", "mux.zeroResidueVerified"]) assert(paths.includes(path));
});

test("prohibits test identities, production mutation, publication, and residue", () => {
  const manifest = fixture();
  manifest.safety.noTestIdentityCreated = false;
  manifest.safety.noProductionMutation = false;
  manifest.safety.noProductionContentPublished = false;
  manifest.safety.noProviderAssetResidue = false;
  const paths = evaluate(manifest).blockers.map(({ path }) => path);
  assert(paths.includes("safety.noTestIdentityCreated"));
  assert(paths.includes("safety.noProductionMutation"));
  assert(paths.includes("safety.noProductionContentPublished"));
  assert(paths.includes("safety.noProviderAssetResidue"));
});

test("requires six distinct protected evidence digests and exact independent bindings", () => {
  const manifest = fixture();
  manifest.emailWorker.evidenceSha256 = manifest.authDelivery.evidenceSha256;
  manifest.independentReview.emailWorkerEvidenceSha256 = manifest.authDelivery.evidenceSha256;
  manifest.independentReview.resendEvidenceSha256 = hash("wrong-resend");
  manifest.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert(result.blockers.some(({ path }) => path === "independentReview.resendEvidenceSha256"));
  assert(result.blockers.some(({ message }) => /six distinct/.test(message)));
});

test("requires fresh, ordered evidence within one acceptance window", () => {
  const stale = fixture();
  stale.resend.capturedAt = "2026-09-20T09:05:00.000Z";
  stale.independentReview.reviewedAt = "2026-10-01T08:00:00.000Z";
  stale.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(stale);
  const result = evaluate(stale);
  assert.equal(result.ready, false);
  assert(result.blockers.some(({ path, message }) => path === "resend.capturedAt" && /72 hours/.test(message)));
  assert(result.blockers.some(({ path, message }) => path === "independentReview.reviewedAt" && /at or after/.test(message)));
});

test("rejects stale or altered canonical review attestations", () => {
  const manifest = fixture();
  manifest.authDelivery.emailConfirmationDelivered = false;
  manifest.mux.capturedAt = "2026-10-01T09:26:00.000Z";
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert(result.blockers.some(({ path }) => path === "independentReview.attestationSha256"));
});

test("cryptographically binds delivery recipients and the exact Mux environment and deployment", () => {
  const manifest = fixture();
  manifest.authDelivery.recipientMailboxFingerprintSha256 = hash("other-inbox");
  manifest.applicationDelivery.recipientMailboxFingerprintSha256 = hash("other-inbox");
  manifest.mux.sourceDeploymentId = "preview.example.test";
  manifest.mux.muxEnvironmentFingerprintSha256 = "0".repeat(64);
  manifest.independentReview.reviewerFingerprintSha256 = manifest.dedicatedInbox.mailboxFingerprintSha256;
  manifest.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(manifest);
  const paths = evaluate(manifest).blockers.map(({ path }) => path);
  assert(paths.includes("authDelivery.recipientMailboxFingerprintSha256"));
  assert(paths.includes("applicationDelivery.recipientMailboxFingerprintSha256"));
  assert(paths.includes("mux.sourceDeploymentId"));
  assert(paths.includes("mux.muxEnvironmentFingerprintSha256"));
  assert(paths.includes("independentReview.reviewerFingerprintSha256"));
});

test("requires keyed fingerprints rather than reversible identity values or unsalted digests", () => {
  const manifest = fixture();
  manifest.fingerprintPolicy = "plain-sha256";
  manifest.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert(result.blockers.some(({ path }) => path === "fingerprintPolicy"));
});

test("rejects impossible calendar timestamps", () => {
  const manifest = fixture();
  manifest.resend.capturedAt = "2026-09-31T09:05:00.000Z";
  manifest.independentReview.attestationSha256 = calculateProviderDeliveryAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert(result.blockers.some(({ path, message }) => path === "resend.capturedAt" && /real calendar/.test(message)));
});

test("secret and PII diagnostics expose neither an unknown field name nor its value", () => {
  const manifest = fixture();
  manifest["private-person@example.test"] = "re_privateprovidercredential123456";
  const output = JSON.stringify(evaluate(manifest));
  assert.doesNotMatch(output, /private-person|example\.test|privateprovidercredential/);
  assert.match(output, /manifest\.\[field\]/);
});

test("malformed nested evidence fails closed without throwing", () => {
  for (const section of ["release", "dedicatedInbox", "resend", "authDelivery", "applicationDelivery", "emailWorker", "mux", "safety", "independentReview"]) {
    const manifest = fixture();
    manifest[section] = null;
    assert.doesNotThrow(() => evaluate(manifest));
    const result = evaluate(manifest);
    assert.equal(result.ready, false);
    assert(result.blockers.some(({ path }) => path === section));
  }
});

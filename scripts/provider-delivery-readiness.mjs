import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PROVIDER_DELIVERY_SCHEMA_VERSION = 1;
export const PROVIDER_DELIVERY_POLICY = "jingwuguan-provider-delivery-v1";
export const DEDICATED_INBOX_POLICY = "dedicated-non-role-inbox";
export const FINGERPRINT_POLICY = "keyed-hmac-sha256-v1";
export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const PRODUCTION_ORIGIN = "https://jingwuguanseibukan.com";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PROJECT_REF = /^[a-z0-9]{20}$/;
const DEPLOYMENT = /^dpl_[A-Za-z0-9]{8,}$/;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_CAPTURE_SPAN_MS = 2 * 60 * 60 * 1000;

const SCHEMA = Object.freeze({
  root: ["schemaVersion", "environment", "applicationOrigin", "projectRef", "policy", "fingerprintPolicy", "release", "dedicatedInbox", "resend", "authDelivery", "applicationDelivery", "emailWorker", "mux", "safety", "independentReview"],
  release: ["branch", "commitSha", "deploymentId"],
  dedicatedInbox: ["policy", "capturedAt", "mailboxFingerprintSha256", "deliverable", "ownedByReleaseTeam", "notRoleAccount", "notSenderMailbox", "notSecurityTestIdentity", "notReservedDomain", "evidenceSha256"],
  resend: ["capturedAt", "senderDomainVerified", "dnsVerified", "senderIdentityVerified", "customSmtpVerified", "leastPrivilegeCredentialVerified", "deliveryLogsReviewed", "evidenceSha256"],
  authDelivery: ["capturedAt", "emailConfirmationDelivered", "confirmationLinkOrigin", "passwordResetDelivered", "passwordResetLinkOrigin", "recipientMailboxFingerprintSha256", "recipientMatchedDedicatedInboxFingerprint", "providerStatusDelivered", "evidenceSha256"],
  applicationDelivery: ["capturedAt", "memberAnnouncementDelivered", "eventNotificationDelivered", "emailWorkerDeliveryObserved", "recipientMailboxFingerprintSha256", "recipientMatchedDedicatedInboxFingerprint", "providerStatusDelivered", "evidenceSha256"],
  emailWorker: ["capturedAt", "transientFailureObserved", "retryBackoffObserved", "eventualRetryDelivered", "exhaustionObserved", "exhaustedMessageNotRetried", "failureTelemetryObserved", "queueBaselineRestored", "evidenceSha256"],
  mux: ["disposition", "capturedAt", "sourceEnvironment", "sourceProjectRef", "sourceDeploymentId", "muxEnvironmentFingerprintSha256", "releaseCommitSha", "directUploadCompleted", "signedPlaybackPassed", "unsignedPlaybackDenied", "assetDeleted", "repositoryDraftDeleted", "zeroResidueVerified", "evidenceSha256"],
  safety: ["noTestIdentityCreated", "noRoleIdentityUsedAsInbox", "noProductionMutation", "noProductionMemberDataChanged", "noProductionContentPublished", "noProviderAssetResidue", "protectedEvidenceContainsNoSecretsOrPii", "diagnosticsSanitized"],
  independentReview: ["reviewedAt", "reviewerRole", "reviewerFingerprintSha256", "result", "projectRef", "commitSha", "deploymentId", "dedicatedInboxEvidenceSha256", "resendEvidenceSha256", "authDeliveryEvidenceSha256", "applicationDeliveryEvidenceSha256", "emailWorkerEvidenceSha256", "muxEvidenceSha256", "attestationSha256"],
});

const FORBIDDEN_KEYS = new Set([
  "password", "secret", "token", "apikey", "privatekey", "signingkey", "servicerolekey",
  "publishablekey", "authorization", "cookie", "session", "databaseurl", "connectionstring",
  "email", "emailaddress", "mailbox", "recipient", "sender", "memberid", "membername", "userid",
  "providerid", "message", "subject", "body", "assetid", "playbackid", "uploadid",
]);
const SENSITIVE_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.|(?:postgres(?:ql)?|https?):\/\/[^/\s:@]+:[^/\s@]+@|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bre_[A-Za-z0-9_-]{16,}\b)/i;

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(blockers, path, value, expected) {
  if (!record(value)) {
    add(blockers, path, "must be an object using the documented sanitized schema");
    return false;
  }
  const allowed = new Set(expected);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    add(blockers, path, "contains unsupported fields; field names and values are intentionally redacted");
  }
  for (const key of expected) if (!(key in value)) add(blockers, `${path}.${key}`, "is required");
  return true;
}

function scanSensitive(value, blockers, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanSensitive(child, blockers, `${path}[${index}]`));
    return;
  }
  if (record(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.[field]`;
      if (FORBIDDEN_KEYS.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase())) {
        add(blockers, childPath, "secret- or identity-bearing fields are forbidden from this sanitized manifest");
      }
      scanSensitive(child, blockers, childPath);
    }
    return;
  }
  if (typeof value === "string" && SENSITIVE_VALUE.test(value)) {
    add(blockers, path, "appears to contain a credential or identity value");
  }
}

function digest(blockers, path, value) {
  if (typeof value !== "string" || !SHA256.test(value) || /^(.)\1{63}$/.test(value)) {
    add(blockers, path, "must be a non-placeholder lowercase SHA-256 digest of protected evidence");
    return "";
  }
  return value;
}

function timestamp(blockers, path, value, now) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    add(blockers, path, "must be an ISO-8601 UTC timestamp");
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    add(blockers, path, "must be a valid timestamp");
    return null;
  }
  const normalized = value.includes(".") ? value : value.replace(/Z$/, ".000Z");
  if (new Date(parsed).toISOString() !== normalized) {
    add(blockers, path, "must be a real calendar timestamp");
    return null;
  }
  if (parsed > now + MAX_CLOCK_SKEW_MS) add(blockers, path, "must not be in the future");
  if (now - parsed > MAX_AGE_MS) add(blockers, path, "must be no more than 72 hours old");
  return parsed;
}

function requireTrue(blockers, path, source, fields) {
  for (const field of fields) if (source[field] !== true) add(blockers, `${path}.${field}`, "must be true");
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function attestationEnvelope(manifest) {
  const review = manifest.independentReview;
  return {
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
    applicationOrigin: manifest.applicationOrigin,
    projectRef: manifest.projectRef,
    policy: manifest.policy,
    fingerprintPolicy: manifest.fingerprintPolicy,
    release: manifest.release,
    dedicatedInbox: manifest.dedicatedInbox,
    resend: manifest.resend,
    authDelivery: manifest.authDelivery,
    applicationDelivery: manifest.applicationDelivery,
    emailWorker: manifest.emailWorker,
    mux: manifest.mux,
    safety: manifest.safety,
    independentReview: {
      reviewedAt: review.reviewedAt,
      reviewerRole: review.reviewerRole,
      reviewerFingerprintSha256: review.reviewerFingerprintSha256,
      result: review.result,
      projectRef: review.projectRef,
      commitSha: review.commitSha,
      deploymentId: review.deploymentId,
      dedicatedInboxEvidenceSha256: review.dedicatedInboxEvidenceSha256,
      resendEvidenceSha256: review.resendEvidenceSha256,
      authDeliveryEvidenceSha256: review.authDeliveryEvidenceSha256,
      applicationDeliveryEvidenceSha256: review.applicationDeliveryEvidenceSha256,
      emailWorkerEvidenceSha256: review.emailWorkerEvidenceSha256,
      muxEvidenceSha256: review.muxEvidenceSha256,
    },
  };
}

export function calculateProviderDeliveryAttestation(manifest) {
  return sha256(attestationEnvelope(manifest));
}

export function evaluateProviderDeliveryReadiness(manifest, {
  expectedProjectRef,
  expectedCommit,
  expectedDeployment,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [
    "This is an offline evidence validator; it does not contact Supabase, Resend, Mux, Vercel, an inbox, staging, or production.",
    "A passing manifest is valid only for the exact release and protected evidence reviewed within the stated freshness window.",
  ];

  if (!record(manifest)) return { ready: false, blockers: [{ path: "manifest", message: "must be a JSON object" }], warnings, target: null };
  scanSensitive(manifest, blockers);
  if (!exactKeys(blockers, "manifest", manifest, SCHEMA.root)) return { ready: false, blockers, warnings, target: null };

  if (!PROJECT_REF.test(expectedProjectRef ?? "") || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must be the exact future production project reference, not staging or the retired project");
  }
  if (!SHA.test(expectedCommit ?? "")) add(blockers, "expectedCommit", "must be the exact 40-character release commit");
  if (!DEPLOYMENT.test(expectedDeployment ?? "")) add(blockers, "expectedDeployment", "must be the exact production deployment id");
  if (manifest.schemaVersion !== PROVIDER_DELIVERY_SCHEMA_VERSION) add(blockers, "schemaVersion", `must equal ${PROVIDER_DELIVERY_SCHEMA_VERSION}`);
  if (manifest.environment !== "production") add(blockers, "environment", "must equal production");
  if (manifest.applicationOrigin !== PRODUCTION_ORIGIN) add(blockers, "applicationOrigin", `must equal ${PRODUCTION_ORIGIN}`);
  if (manifest.projectRef !== expectedProjectRef) add(blockers, "projectRef", "must equal the independently supplied production project reference");
  if (manifest.policy !== PROVIDER_DELIVERY_POLICY) add(blockers, "policy", `must equal ${PROVIDER_DELIVERY_POLICY}`);
  if (manifest.fingerprintPolicy !== FINGERPRINT_POLICY) add(blockers, "fingerprintPolicy", `must equal ${FINGERPRINT_POLICY}`);

  const release = manifest.release;
  if (exactKeys(blockers, "release", release, SCHEMA.release)) {
    if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
    if (release.commitSha !== expectedCommit) add(blockers, "release.commitSha", "must equal the independently supplied release commit");
    if (release.deploymentId !== expectedDeployment) add(blockers, "release.deploymentId", "must equal the independently supplied production deployment id");
  }

  const captureTimes = [];
  const evidenceDigests = [];
  const inbox = manifest.dedicatedInbox;
  const inboxValid = exactKeys(blockers, "dedicatedInbox", inbox, SCHEMA.dedicatedInbox);
  if (inboxValid) {
    if (inbox.policy !== DEDICATED_INBOX_POLICY) add(blockers, "dedicatedInbox.policy", `must equal ${DEDICATED_INBOX_POLICY}`);
    const captured = timestamp(blockers, "dedicatedInbox.capturedAt", inbox.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    digest(blockers, "dedicatedInbox.mailboxFingerprintSha256", inbox.mailboxFingerprintSha256);
    evidenceDigests.push(digest(blockers, "dedicatedInbox.evidenceSha256", inbox.evidenceSha256));
    requireTrue(blockers, "dedicatedInbox", inbox, ["deliverable", "ownedByReleaseTeam", "notRoleAccount", "notSenderMailbox", "notSecurityTestIdentity", "notReservedDomain"]);
  }

  const resend = manifest.resend;
  const resendValid = exactKeys(blockers, "resend", resend, SCHEMA.resend);
  if (resendValid) {
    const captured = timestamp(blockers, "resend.capturedAt", resend.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    requireTrue(blockers, "resend", resend, ["senderDomainVerified", "dnsVerified", "senderIdentityVerified", "customSmtpVerified", "leastPrivilegeCredentialVerified", "deliveryLogsReviewed"]);
    evidenceDigests.push(digest(blockers, "resend.evidenceSha256", resend.evidenceSha256));
  }

  const auth = manifest.authDelivery;
  const authValid = exactKeys(blockers, "authDelivery", auth, SCHEMA.authDelivery);
  if (authValid) {
    const captured = timestamp(blockers, "authDelivery.capturedAt", auth.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    requireTrue(blockers, "authDelivery", auth, ["emailConfirmationDelivered", "passwordResetDelivered", "recipientMatchedDedicatedInboxFingerprint", "providerStatusDelivered"]);
    if (auth.confirmationLinkOrigin !== `${PRODUCTION_ORIGIN}/auth/confirm`) add(blockers, "authDelivery.confirmationLinkOrigin", "must equal the exact production /auth/confirm route");
    if (auth.passwordResetLinkOrigin !== PRODUCTION_ORIGIN) add(blockers, "authDelivery.passwordResetLinkOrigin", "must be bound to the exact production origin without storing a tokenized URL");
    const recipient = digest(blockers, "authDelivery.recipientMailboxFingerprintSha256", auth.recipientMailboxFingerprintSha256);
    if (recipient && inbox?.mailboxFingerprintSha256 && recipient !== inbox.mailboxFingerprintSha256) add(blockers, "authDelivery.recipientMailboxFingerprintSha256", "must equal the dedicated inbox fingerprint");
    evidenceDigests.push(digest(blockers, "authDelivery.evidenceSha256", auth.evidenceSha256));
  }

  const application = manifest.applicationDelivery;
  const applicationValid = exactKeys(blockers, "applicationDelivery", application, SCHEMA.applicationDelivery);
  if (applicationValid) {
    const captured = timestamp(blockers, "applicationDelivery.capturedAt", application.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    requireTrue(blockers, "applicationDelivery", application, ["memberAnnouncementDelivered", "eventNotificationDelivered", "emailWorkerDeliveryObserved", "recipientMatchedDedicatedInboxFingerprint", "providerStatusDelivered"]);
    const recipient = digest(blockers, "applicationDelivery.recipientMailboxFingerprintSha256", application.recipientMailboxFingerprintSha256);
    if (recipient && inbox?.mailboxFingerprintSha256 && recipient !== inbox.mailboxFingerprintSha256) add(blockers, "applicationDelivery.recipientMailboxFingerprintSha256", "must equal the dedicated inbox fingerprint");
    evidenceDigests.push(digest(blockers, "applicationDelivery.evidenceSha256", application.evidenceSha256));
  }

  const worker = manifest.emailWorker;
  const workerValid = exactKeys(blockers, "emailWorker", worker, SCHEMA.emailWorker);
  if (workerValid) {
    const captured = timestamp(blockers, "emailWorker.capturedAt", worker.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    requireTrue(blockers, "emailWorker", worker, ["transientFailureObserved", "retryBackoffObserved", "eventualRetryDelivered", "exhaustionObserved", "exhaustedMessageNotRetried", "failureTelemetryObserved", "queueBaselineRestored"]);
    evidenceDigests.push(digest(blockers, "emailWorker.evidenceSha256", worker.evidenceSha256));
  }

  const mux = manifest.mux;
  const muxValid = exactKeys(blockers, "mux", mux, SCHEMA.mux);
  if (muxValid) {
    if (mux.disposition !== "staging-release-evidence") add(blockers, "mux.disposition", "must equal staging-release-evidence; production provider mutation is prohibited by this gate");
    const captured = timestamp(blockers, "mux.capturedAt", mux.capturedAt, now); if (captured !== null) captureTimes.push(captured);
    if (mux.sourceEnvironment !== "staging") add(blockers, "mux.sourceEnvironment", "must equal staging");
    if (mux.sourceProjectRef !== STAGING_PROJECT_REF) add(blockers, "mux.sourceProjectRef", `must equal ${STAGING_PROJECT_REF}`);
    if (!DEPLOYMENT.test(mux.sourceDeploymentId ?? "")) add(blockers, "mux.sourceDeploymentId", "must identify the exact staging deployment used for the acceptance run");
    digest(blockers, "mux.muxEnvironmentFingerprintSha256", mux.muxEnvironmentFingerprintSha256);
    if (mux.releaseCommitSha !== expectedCommit) add(blockers, "mux.releaseCommitSha", "must equal the independently supplied release commit");
    requireTrue(blockers, "mux", mux, ["directUploadCompleted", "signedPlaybackPassed", "unsignedPlaybackDenied", "assetDeleted", "repositoryDraftDeleted", "zeroResidueVerified"]);
    evidenceDigests.push(digest(blockers, "mux.evidenceSha256", mux.evidenceSha256));
  }

  const safety = manifest.safety;
  const safetyValid = exactKeys(blockers, "safety", safety, SCHEMA.safety);
  if (safetyValid) {
    requireTrue(blockers, "safety", safety, ["noTestIdentityCreated", "noRoleIdentityUsedAsInbox", "noProductionMutation", "noProductionMemberDataChanged", "noProductionContentPublished", "noProviderAssetResidue", "protectedEvidenceContainsNoSecretsOrPii", "diagnosticsSanitized"]);
  }

  const review = manifest.independentReview;
  let reviewedAt = null;
  if (exactKeys(blockers, "independentReview", review, SCHEMA.independentReview)) {
    reviewedAt = timestamp(blockers, "independentReview.reviewedAt", review.reviewedAt, now);
    if (review.reviewerRole !== "independent-release-reviewer") add(blockers, "independentReview.reviewerRole", "must equal independent-release-reviewer");
    const reviewer = digest(blockers, "independentReview.reviewerFingerprintSha256", review.reviewerFingerprintSha256);
    if (review.result !== "approved") add(blockers, "independentReview.result", "must equal approved");
    if (review.projectRef !== expectedProjectRef) add(blockers, "independentReview.projectRef", "must bind the exact production project");
    if (review.commitSha !== expectedCommit) add(blockers, "independentReview.commitSha", "must bind the exact release commit");
    if (review.deploymentId !== expectedDeployment) add(blockers, "independentReview.deploymentId", "must bind the exact production deployment");
    const bindings = [
      ["dedicatedInboxEvidenceSha256", inbox?.evidenceSha256], ["resendEvidenceSha256", resend?.evidenceSha256],
      ["authDeliveryEvidenceSha256", auth?.evidenceSha256], ["applicationDeliveryEvidenceSha256", application?.evidenceSha256],
      ["emailWorkerEvidenceSha256", worker?.evidenceSha256], ["muxEvidenceSha256", mux?.evidenceSha256],
    ];
    for (const [field, source] of bindings) {
      const bound = digest(blockers, `independentReview.${field}`, review[field]);
      if (bound && source && bound !== source) add(blockers, `independentReview.${field}`, "must bind the exact protected evidence digest");
    }
    const attestation = digest(blockers, "independentReview.attestationSha256", review.attestationSha256);
    if (attestation && inboxValid && resendValid && authValid && applicationValid && workerValid && muxValid && safetyValid &&
        calculateProviderDeliveryAttestation(manifest) !== attestation) {
      add(blockers, "independentReview.attestationSha256", "must match the canonical target-, release-, evidence-, and safety-bound attestation");
    }
    if (reviewer && evidenceDigests.includes(reviewer)) add(blockers, "independentReview.reviewerFingerprintSha256", "must be distinct from every protected evidence digest");
    if (reviewer && inbox?.mailboxFingerprintSha256 && reviewer === inbox.mailboxFingerprintSha256) add(blockers, "independentReview.reviewerFingerprintSha256", "must be distinct from the dedicated inbox fingerprint");
  }

  const validEvidence = evidenceDigests.filter(Boolean);
  if (validEvidence.length !== 6 || new Set(validEvidence).size !== 6) add(blockers, "independentReview", "must bind six distinct protected evidence artifacts");
  if (captureTimes.length === 6 && Math.max(...captureTimes) - Math.min(...captureTimes) > MAX_CAPTURE_SPAN_MS) {
    add(blockers, "independentReview.reviewedAt", "all provider captures must complete within one two-hour acceptance window");
  }
  if (reviewedAt !== null && captureTimes.some((captured) => reviewedAt < captured)) {
    add(blockers, "independentReview.reviewedAt", "must be at or after every evidence capture");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    target: blockers.length === 0 ? { environment: "production", projectRef: manifest.projectRef, commitSha: release.commitSha, deploymentId: release.deploymentId, dedicatedInboxPolicy: inbox.policy } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return "Usage: node scripts/provider-delivery-readiness.mjs --manifest=<protected-json> --expected-project-ref=<20-character-ref> --expected-commit=<40-character-sha> --expected-deployment=<deployment-id>";
}

export function runCli(argv = process.argv.slice(2), now = Date.now()) {
  if (argv.includes("--help")) { console.log(usage()); return 0; }
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) { console.error(JSON.stringify({ ready: false, error: "A protected manifest path is required." }, null, 2)); return 2; }
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); }
  catch { console.error(JSON.stringify({ ready: false, error: "The protected manifest could not be read as JSON." }, null, 2)); return 2; }
  const result = evaluateProviderDeliveryReadiness(manifest, {
    expectedProjectRef: option(argv, "--expected-project-ref"),
    expectedCommit: option(argv, "--expected-commit"),
    expectedDeployment: option(argv, "--expected-deployment"),
    now,
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = runCli();

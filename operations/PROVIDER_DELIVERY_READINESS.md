# Provider delivery and dedicated-inbox readiness

This fail-closed gate records the protected acceptance evidence required by the
final release window. The checker is deliberately offline: it does not contact
Supabase, Resend, Mux, Vercel, an inbox, staging, or production, and it performs
no mutation.

Copy `release/provider-delivery-manifest.template.json` to protected evidence
storage. Never complete it in the repository. Run the validator only after the
future Singapore production project and exact deployment exist:

```powershell
npm run provider:delivery:check -- `
  --manifest=C:\protected\evidence\provider-delivery.json `
  --expected-project-ref=<20-character-production-project-ref> `
  --expected-commit=<40-character-reviewed-release-sha> `
  --expected-deployment=<exact-production-deployment-id>
```

Generate every identity or environment fingerprint with HMAC-SHA-256 using one
random acceptance-window key held only in protected evidence storage. Never use
a plain SHA-256 mailbox hash: mailbox addresses are guessable, so an unkeyed hash
does not adequately de-identify them. Do not place the HMAC key in the manifest.

The checked-in template must fail. A pass is bound to the exact production
origin, project, release branch, commit and deployment and requires:

- one deliverable release-team inbox that is not a Member, Admin, Super Admin,
  Repository Uploader, sender mailbox, staging security-test identity, or a
  reserved/non-deliverable address;
- verified Resend sender domain, DNS, sender identity, custom SMTP,
  least-privilege credential scope, and reviewed delivery logs;
- delivered Auth confirmation and password-reset messages whose links are bound
  to the production origin and exact `/auth/confirm` route, with their recipient
  fingerprint equal to the dedicated-inbox fingerprint;
- delivered Member announcement and event-notification messages through the
  email worker;
- observed transient failure, retry delay, successful retry, exhaustion,
  no-retry-after-exhaustion, failure telemetry, and restored queue baseline;
- the release-matched staging Mux upload, signed-playback, unsigned-denial,
  deletion, and zero-residue evidence, bound to the exact staging deployment
  and a one-way fingerprint of the Mux environment. This gate intentionally
  prohibits a disposable production Mux upload;
- no test identity, no role-account inbox, no production mutation,
  no changed production member data, no published production content, and no
  provider asset residue; and
- six distinct protected evidence hashes plus a canonical independent-review
  attestation created after all captures.

## Safe evidence boundary

Keep mailbox addresses, sender addresses, message subjects and bodies, link
tokens, Auth identifiers, member data, Resend request/message IDs, Mux IDs,
credentials, HTTP headers, raw provider responses, and screenshots containing
those values only in access-controlled evidence storage. The manifest contains
only a one-way mailbox fingerprint, protected artifact digests, booleans,
timestamps, fixed routes, and target metadata. The validator rejects unknown
fields, common identity/secret fields, email-address values, credential shapes,
placeholder digests, impossible calendar timestamps, mismatched evidence
bindings, and stale/out-of-order runs; its diagnostics redact unknown field
names. The canonical attestation covers every accepted outcome, timestamp,
recipient fingerprint, provider-environment fingerprint, evidence digest, and
target binding so no accepted field can be changed after independent review.

All six captures must occur within one two-hour acceptance window, remain no more
than 72 hours old, and be reviewed after the last capture. A deployment, release,
project, inbox, evidence artifact, or safety change invalidates the canonical
attestation and requires a new independent review.

For this manifest, `noProductionMutation` means no production application, Auth,
database, member, or content mutation. The delivered messages retained in the
dedicated inbox and the corresponding Resend delivery logs are protected external
acceptance evidence and must be declared as exceptions; they are not application
zero residue. `noProviderAssetResidue` applies to disposable Mux assets and linked
Repository Drafts, not to those retained email records.

This gate does not replace `provider:check`, `auth-email:staging:preflight`,
`email-scheduler:check`, or `monitoring:check`. It aggregates delivery evidence
for the release window without claiming that offline validation proved a live
provider configuration.

# Production bootstrap/import readiness

The checked-in Supabase migration chain begins at `006`. It is deliberately not a
standalone initializer for a blank project. The live application schema contains a
pre-006 baseline, including `email_outbox`, `queue_email`, `claim_next_email`,
`mark_email_sent`, and `mark_email_failed`, that later migrations use or validate
without recreating. Running `supabase db push` against a new empty production project
would therefore be incomplete and is prohibited.

`scripts/production-bootstrap-readiness.mjs` is an offline, fail-closed preflight. It
does not connect to Supabase, import data, run SQL, deploy the application, or authorize
production. It requires:

- an independently supplied exact new production project reference in Singapore
  (`ap-southeast-1`), never the staging or retired project;
- a fresh read-only inventory proving the target contains no application objects,
  application migration rows, Auth accounts, or Storage objects;
- the protected staging baseline payload and positive pre-006 catalog fingerprint;
- the immutable repository migration contract, exactly 006–056 and its checked-in
  file fingerprint, plus the protected source-ledger fingerprint;
- a managed full-import package that binds the baseline payload, catalog and ledger,
  with a successful recovery-manifest digest;
- an execution plan that restores/imports the baseline before checking migrations,
  keeps outbound delivery disabled, and requires exact post-import catalog and ledger
  matches;
- zero network I/O by the offline gate, zero production mutation, no executed import
  or deployment, and no raw secrets or personal data in the manifest; and
- an independent reviewer whose canonical attestation binds four distinct protected
  evidence bundles.

Copy `release/production-bootstrap-manifest.template.json` to protected storage and
replace placeholders only with sanitized counts, timestamps, SHA-256 digests and role
fingerprints. Do not store dumps, SQL containing data, member details, emails, object
keys, passwords, tokens, URLs with credentials, or encryption keys in the manifest.

Run the offline gate with independently sourced target and release values:

```powershell
npm.cmd run production:bootstrap:check -- `
  --manifest=C:\protected\evidence\production-bootstrap.json `
  --expected-project-ref=<exact-new-production-project-ref> `
  --expected-commit=<exact-40-character-release-sha>
```

The checked-in template intentionally fails. A passing preflight means only that the
bootstrap package and plan are ready for a separately approved release window. Before
any production change, an operator must still obtain explicit approval for the exact
managed import operation. After import, stop on any catalog or ledger mismatch; never
try to repair a missing pre-006 baseline by blindly applying migrations 006–056.

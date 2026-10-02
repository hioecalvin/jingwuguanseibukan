# Rollback readiness

Production rollback requires evidence from two non-production rehearsals: switching the
application between the exact candidate and known-good immutable deployments, and
recovering the database into a replacement managed target. A down migration is not a
database recovery strategy for this release.

Copy `release/rollback-evidence.template.json` outside the repository and complete it
with sanitized evidence. The rehearsal must use staging and a disposable managed
database target, keep production and outbound providers untouched, restore the
candidate deployment after the application test, and delete or quarantine the
temporary database target.

After the reviewer has finalized every field except `attestation.reviewDigest`, generate
the digest with the same protected file and independently sourced identities:

```powershell
npm.cmd run rollback:check -- `
  --manifest=C:\protected\evidence\rollback-evidence.json `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-deployment-id=<exact-candidate-deployment-id> `
  --expected-previous-commit=<exact-40-character-known-good-sha> `
  --expected-previous-deployment-id=<exact-known-good-deployment-id> `
  --print-review-digest
```

The command prints only the 64-character digest after every other gate passes. Insert
that value as `attestation.reviewDigest`, save the protected file, then run the final
offline check:

```powershell
npm.cmd run rollback:check -- `
  --manifest=C:\protected\evidence\rollback-evidence.json `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-deployment-id=<exact-candidate-deployment-id> `
  --expected-previous-commit=<exact-40-character-known-good-sha> `
  --expected-previous-deployment-id=<exact-known-good-deployment-id>
```

The evidence must show authentication, authorization and host-probe success after the
known-good application deployment is activated, followed by restoration of the
candidate. Database recovery must use the exact protected backup, prove ledger
`006-056`, catalog, lint, grants/RLS and role-security results, remain within the
documented RTO, and leave zero disposable-target residue.

The final release evidence packet reruns this rollback semantic gate using the immutable identities in
the release-window manifest. The digest is an integrity checksum over the complete
accepted record, not a signature or proof of the reviewer's identity; reviewer
independence must still be established procedurally outside this sanitized manifest.
The application rehearsal timestamps must agree with the claimed rollback duration,
and the application evidence, database backup, and database evidence must have three
distinct SHA-256 digests. A passing record is necessary but does not execute or
authorize production rollback.

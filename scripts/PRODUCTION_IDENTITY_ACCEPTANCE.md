# Production identity inventory acceptance

Run this gate only after the Singapore production project exists and all intended
production identities have been provisioned. The gate is deliberately offline: it
reads one protected, sanitized JSON manifest, performs no network request, does not
delete or disable users, and never emits account identifiers.

```powershell
node .\scripts\production-identity-readiness.mjs `
  --manifest=C:\protected\evidence\production-identity-inventory.json `
  --expected-project-ref=<exact-20-character-production-ref>
```

The checked-in template is not release evidence and intentionally fails. Keep the
completed manifest and the protected raw source inventories outside the repository.

## Required independent evidence

Create the two snapshots no more than 15 minutes apart and no more than 24 hours
before this check:

1. An Auth-admin inventory must traverse every page of `auth.users`. Its protected
   raw snapshot is hashed locally; only the SHA-256, total count and zero-valued
   classifications enter the manifest.
2. A separate database-owner, read-only transaction must independently count Auth
   users, profiles, memberships, orphans and normalized-identity duplicates. Hash
   its protected raw result separately. Auth-account and profile totals must agree
   when missing-profile and orphan counters are zero.
3. A release-security reviewer who did not perform either capture reviews both raw
   protected inventories, copies their exact hashes into the review block and marks
   the result approved only when every forbidden classification is zero.

Each capture also records a reviewed query/tool version and a non-PII collector
fingerprint. The gate recalculates a canonical provenance SHA-256 containing the
project, policy, timestamp, source digest and aggregate results. The reviewer has a
third distinct non-PII fingerprint and binds both provenance digests in a canonical
review attestation. This prevents cross-project replay and same-actor evidence from
passing. The protected evidence process remains responsible for controlling the
underlying actor keys and raw inventories.

The `jingwuguan-production-identity-v1` classification policy covers:

- Auth metadata indicating a dummy, fixture, seed or security-test account;
- `dummy.jingwuguan.test`, reserved `.test`/`.invalid` domains and documented staging
  security-test identities;
- seed/test markers in Auth metadata, profiles or memberships;
- database rows belonging to any classified Auth identity;
- unreviewed accounts or profiles, missing profiles, orphan rows and duplicate
  normalized identities.

Do not put emails, names, member numbers, UUIDs, phone numbers, raw metadata, arrays
of identities, passwords, tokens or database URLs in the sanitized manifest. The
validator uses an exact field allow-list and rejects extra fields. It reports only
field paths and failure categories, never the supplied values.

A passing result establishes only that fresh aggregate evidence was complete,
independent, target-bound and reviewed. It does not prove the source inventories
were collected correctly and does not authorize production deployment or deletion.

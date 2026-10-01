# Recovery evidence gate

The project has captured a protected staging package containing the application
database, Auth and Storage metadata, database roles, and the retained Storage object's
bytes. A disposable loopback-only PostgreSQL 17.11 rehearsal restored the exact
006–055 migration ledger, critical row counts, roles/grants and RLS/security boundary.
Canonical catalog comparison matched 17 of 18 files and 4,145 of 4,146 objects; the
only absent object was Supabase's managed Vault extension, which standalone PostgreSQL
cannot provide. See `../release-evidence/local-recovery-rehearsal-20260930.md`.

That rehearsal is strong database and metadata evidence, but it is not complete
managed Supabase disaster recovery. Auth login/refresh, Storage API upload/download,
managed extensions and encryption-root custody, hosted configuration, schedules and
external provider resources still need a protected disposable Supabase-target drill.
The offline gate therefore remains intentionally blocked until those checks are proved;
do not mark managed components verified based only on the local PostgreSQL rehearsal.

`scripts/recovery-readiness.mjs` is an offline, read-only release gate. Manifest
version 4 binds the next drill to staging `eomubndonbetszdbhsrj`, migrations 006–056,
the checked-in migration-file fingerprint, matching source/restored ledger and
pre-migration schema-catalog fingerprints, the exact protected backup payload used as
restore input, a digest of the finalized sanitized rehearsal-evidence bundle, explicit
restore-target disposition, and measured RPO/RTO timestamps. An isolated PostgreSQL
restore remains useful scoped evidence but cannot pass this complete managed-platform
gate. It represents the not-yet-created
production project explicitly instead of using a fake project reference. It never
connects to Supabase or a provider. It validates a sanitized recovery manifest and
exits non-zero until every required recovery component and post-restore check is
explicitly verified.

## Safe workflow

1. Copy `recovery-manifest.template.json` to a protected evidence directory outside
   the repository. Do not put database dumps, object bytes, personal data, passwords,
   tokens, private keys or secret values in the manifest.
2. Record only timestamps, status, counts, hashes and references to access-controlled
   evidence. Keep encrypted backups and secret recovery material in the approved
   backup system.
   Before encrypting the protected export bundle, record its SHA-256 digest and byte
   count. After decrypting the isolated restore input, calculate them again and put
   only the matching values in `backupArtifact`. This proves that the drill restored
   the captured payload rather than a compatible-looking stale or wrong backup.
   After all checks finish, package or inventory the sanitized evidence, record its
   SHA-256 digest and byte count in `evidenceBundle`, and keep the bundle in protected
   storage. Component evidence references must resolve inside that reviewed evidence
   set and cannot be placeholders.
3. Restore into a disposable Supabase project. Disable email, push, webhooks,
   schedulers and other outbound delivery before any copied data becomes executable.
4. Prove database, Auth and Storage recovery; compare object-byte manifests; verify
   roles/RLS, migration history and configuration; then run database lint and the
   Member/Admin/Super Admin security smoke.
5. Quarantine or destroy the disposable target. Record its `deleted` or `quarantined`
   disposition, completion time and protected evidence reference. The disposition and
   evidence-bundle finalization times must fall after the rehearsal completes and no
   later than the manifest recording time.
6. Run the gate:

```powershell
npm.cmd run recovery:check -- C:\protected\evidence\recovery-manifest.json
```

Before and after the restore, export the ordered `version`, `name` and `statements`
columns for migrations 006–056 from `supabase_migrations.schema_migrations` into
protected JSON arrays. Generate sanitized fingerprints without printing the SQL:

```powershell
npm.cmd run recovery:fingerprint
npm.cmd run recovery:fingerprint -- --ledger C:\protected\evidence\source-ledger.json
npm.cmd run recovery:fingerprint -- --ledger C:\protected\evidence\restored-ledger.json
```

The first command verifies the immutable repository contract. Put only the two
resulting `ledgerSha256` values into the protected manifest; they must match. Do not
commit the ledger exports or manifest.

Export the source and restored schema catalogs into separate protected directories.
Each directory must contain only the 18 schema-only JSON exports named by
`scripts/recovery-catalog-fingerprint.mjs`; do not include row-data diagnostics such
as profile identity values. Generate deterministic fingerprints with:

```powershell
node scripts/recovery-catalog-fingerprint.mjs C:\protected\evidence\source-catalog
node scripts/recovery-catalog-fingerprint.mjs C:\protected\evidence\restored-catalog
```

Record only `catalogFormatVersion`, `catalogSha256` and `totalObjectCount` in the
manifest. The source and restored digest and count must match. This is the explicit
proof that the pre-006 baseline was restored; matching migration history alone is not
sufficient.

## Application-specific recovery inventory

The protected inventory for this application must include, without recording secret
values in Git:

- the live `email_outbox` table and the pre-migration queue primitives
  `queue_email`, `claim_next_email`, `mark_email_sent` and `mark_email_failed`;
  migrations 006–056 reference and validate these objects but do not create their
  baseline definitions, so the protected database backup and disposable restore must
  capture and exercise them explicitly;
- any historical objects in the private Supabase Storage bucket
  `repository-video-originals`, including an object key/size/checksum manifest and
  a verified byte-for-byte restore sample before deciding whether to retire them;
- Supabase Auth users/identities, redirect allowlists, password policy, email
  templates, signing-key recovery method and enabled/disabled provider settings;
- database roles, grants/default grants, extensions, migration history and any
  Vault/encryption-root-key recovery requirements;
- the email-worker and push scheduler definitions, disabled on the restore target
  until test-only recipients are confirmed;
- Resend sender/domain resources, Web Push VAPID key-pair custody and subscription
  reset procedure, and Mux token, signing-key and asset ownership/recovery controls;
- hosting environment-variable names and scope assignments for Supabase, Resend,
  email worker, and push/VAPID configuration. Record custody and rotation
  instructions, never the values themselves.

Migrations 024–025 remain historical staging schema. Reconcile any legacy video
source/asset rows and Storage objects before retiring them; migration 056 establishes
the active Mux upload and signed-playback lifecycle, whose asset and signing-key
recovery evidence must be captured separately from the database backup.

For a production-source backup, the operator must also acknowledge that fact. This
flag does not connect to production or authorize a backup, restore, mutation or
deployment:

```powershell
npm.cmd run recovery:check -- C:\protected\evidence\recovery-manifest.json --allow-production-source
```

A successful staging-source drill proves the recovery procedure only. It does not
prove that the latest production backup exists or meets the declared recovery-point
objective. Production backup access and any production release remain separate,
explicitly authorized operations.

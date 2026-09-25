# Recovery evidence gate

The project has proved a scoped restore of the staging `public` schema and migration
ledger. That is useful application-database evidence, but it is not complete Supabase
disaster recovery. Managed Auth, Storage metadata and object bytes, roles/grants,
Vault/encryption material, platform configuration, schedules and external provider
resources still need a protected disposable-target rehearsal.

`scripts/recovery-readiness.mjs` is an offline, read-only release gate. Manifest
version 2 binds the drill to staging `eomubndonbetszdbhsrj`, migrations 006–047,
the checked-in migration-file fingerprint, matching source/restored ledger
fingerprints and measured RPO/RTO timestamps. It represents the not-yet-created
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
3. Restore into a disposable Supabase project. Disable email, push, webhooks,
   schedulers and other outbound delivery before any copied data becomes executable.
4. Prove database, Auth and Storage recovery; compare object-byte manifests; verify
   roles/RLS, migration history and configuration; then run database lint and the
   Member/Admin/Super Admin security smoke.
5. Quarantine or destroy the disposable target and record retention/deletion.
6. Run the gate:

```powershell
npm.cmd run recovery:check -- C:\protected\evidence\recovery-manifest.json
```

Before and after the restore, export the ordered `version`, `name` and `statements`
columns for migrations 006–047 from `supabase_migrations.schema_migrations` into
protected JSON arrays. Generate sanitized fingerprints without printing the SQL:

```powershell
npm.cmd run recovery:fingerprint
npm.cmd run recovery:fingerprint -- --ledger C:\protected\evidence\source-ledger.json
npm.cmd run recovery:fingerprint -- --ledger C:\protected\evidence\restored-ledger.json
```

The first command verifies the immutable repository contract. Put only the two
resulting `ledgerSha256` values into the protected manifest; they must match. Do not
commit the ledger exports or manifest.

## Application-specific recovery inventory

The protected inventory for this application must include, without recording secret
values in Git:

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
  reset procedure, and organization YouTube channel ownership/recovery controls;
- hosting environment-variable names and scope assignments for Supabase, Resend,
  email worker, and push/VAPID configuration. Record custody and rotation
  instructions, never the values themselves.

Migrations 024–025 remain historical staging schema. Reconcile any legacy video
source/asset rows and Storage objects before retiring them; the active application
uses unlisted YouTube embeds and does not depend on those resources.

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

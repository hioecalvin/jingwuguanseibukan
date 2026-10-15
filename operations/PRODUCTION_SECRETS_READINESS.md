# Production secrets readiness

`scripts/production-secrets-readiness.mjs` is the offline, fail-closed evidence gate
for `gateEvidence.productionSecrets` in the final release-window manifest. It does
not create, rotate, upload, download, reveal, or test a provider credential. It
does not contact Vercel, Supabase, Resend, Mux, or the production application.

The gate reads the protected production environment only in memory, composes the
existing provider-configuration validator, and emits variable names, sanitized
counts, digests, and blockers only. Never redirect a protected environment file to
the terminal, commit it, copy its values into this manifest, or attach it to release
evidence.

## Evidence required

The checked-in template is intentionally incomplete. Copy
`release/production-secrets-manifest.template.json` into protected evidence storage
and complete it only after the future Singapore production project and exact Vercel
production deployment exist. A passing manifest requires:

- exact independently supplied production project, release commit, deployment ID,
  Supabase origin, and application origin bindings;
- `VERCEL_ENV=production`, with no Preview, staging, retired-project, dummy-account,
  local, or `.invalid` residue;
- role-correct Supabase browser and server credentials, a matching P-256 VAPID pair,
  valid Resend sender/key shape, and valid Mux token and RSA signing configuration;
- distinct high-variation email-worker, push, and durable-rate-limit secrets;
- an exact ten-entry server-only variable inventory with production-only access,
  named ownership, no staging-value reuse, and rotation no more than 90 days old;
- fresh validation and access-review evidence, documented incident rotation and
  least-privilege controls, and no raw secret values in evidence; and
- an independent reviewer whose canonical attestation binds the exact target,
  deployment, redacted configuration fingerprint, variable inventory, access
  evidence, and rotation evidence.

The configuration fingerprint is a one-way aggregate of required variable names
and value hashes. Treat it as protected operational metadata even though it is not
a usable credential. Generate and store it only as part of the controlled release
evidence process; do not publish it.

Generate that digest without printing any configured value:

```powershell
npm.cmd run production:secrets:check -- `
  --fingerprint-only `
  --env-file=C:\protected\jingwuguan-production.env
```

## Run the offline check

```powershell
npm.cmd run production:secrets:check -- `
  --manifest=C:\protected\evidence\production-secrets.json `
  --env-file=C:\protected\jingwuguan-production.env `
  --expected-project-ref=<exact-new-production-project-ref> `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --expected-origin=https://jingwuguanseibukan.com
```

The expected arguments must come from an independent release source, not by copying
the values out of the manifest under review. The environment file must contain only
the production values documented by `provider-config-readiness.mjs`; do not combine
staging and production files.

After a pass, hash the protected manifest file itself and place that file digest in
`gateEvidence.productionSecrets.manifestSha256`. Bind the same project reference,
commit, and deployment ID in the release-window manifest. A pass establishes
configuration consistency and evidence quality only. Live provider delivery,
scheduler execution, Mux upload/playback, and post-deployment probes remain separate
guarded release gates.

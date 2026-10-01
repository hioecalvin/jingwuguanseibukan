# Project scripts

## Production bootstrap/import readiness gate

The production bootstrap gate prevents treating migrations 006–056 as a standalone
initializer for an empty Supabase project. It validates a protected, sanitized plan
that binds the exact new Singapore production project, fresh empty-target inventory,
the protected pre-006 baseline/catalog, the exact migration contract, a managed import
package and independent review. It requires zero production mutations and makes no
network request. See `operations/PRODUCTION_BOOTSTRAP_READINESS.md`.

```powershell
npm.cmd run production:bootstrap:check -- `
  --manifest=C:\protected\evidence\production-bootstrap.json `
  --expected-project-ref=<exact-new-production-project-ref> `
  --expected-commit=<exact-40-character-release-sha>
```

The checked-in template intentionally fails. Passing this offline gate does not
authorize an import, migration, deployment or provider contact.

## Monitoring and production-identity evidence gates

The offline monitoring gate validates the sanitized operational record described in
`operations/MONITORING_READINESS.md`. The production identity gate validates only
fresh aggregate, independently reviewed account-inventory evidence described in
`scripts/PRODUCTION_IDENTITY_ACCEPTANCE.md`. Neither command contacts a service or
authorizes production.

```powershell
npm.cmd run monitoring:check -- `
  --manifest=C:\protected\evidence\monitoring-readiness.json `
  --expected-project-ref=<exact-20-character-project-ref> `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment=<exact-deployment-id>

npm.cmd run production:identity:check -- `
  --manifest=C:\protected\evidence\production-identity-inventory.json `
  --expected-project-ref=<exact-20-character-production-ref>
```

## Physical Safari acceptance gate

`physical-safari-readiness.mjs` validates a sanitized, protected evidence manifest
without opening a browser or contacting any host. It deliberately does not accept
Playwright WebKit, emulators or simulators as physical Safari evidence. A passing
record requires current Safari on one physical Mac, iPhone and iPad, all bound to the
independently supplied release commit and the exact staging host.

Each device must complete login/logout, public navigation, read-only Member, Admin and
Super Admin workflows, public certificate verification, responsive-layout review and
manual accessibility checks including VoiceOver. The manifest records only SHA-256
digests of the protected session evidence: do not put screenshots, names, member
numbers, email addresses, passwords, cookies, tokens or secret values in it.

```powershell
npm.cmd run safari:physical:check -- `
  --manifest=C:\protected\evidence\physical-safari-manifest.json `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment=<exact-staging-deployment-id> `
  --minimum-macos=<minimum-os,minimum-safari> `
  --minimum-ios=<minimum-os,minimum-safari> `
  --minimum-ipados=<minimum-os,minimum-safari>
```

The checked-in template intentionally fails until real device evidence is recorded
and independently reviewed. A passing result is a staging-only, read-only acceptance
record; it does not authorize production or replace the separate Playwright browser
matrix.

## Provider delivery and dedicated-inbox evidence gate

`provider-delivery-readiness.mjs` validates the protected delivery evidence that
the final release window already requires. It binds six distinct evidence artifacts
to the exact future production project, release commit, production deployment, and
dedicated non-role inbox policy. It covers Resend sender/domain readiness, Auth
confirmation and password-reset delivery, Member announcement and event delivery,
email-worker retry/backoff/exhaustion, and the release-matched staging Mux upload and
signed-playback acceptance. The command is offline and never prints a mailbox,
message, provider identifier, credential, or protected artifact.

```powershell
npm.cmd run provider:delivery:check -- `
  --manifest=C:\protected\evidence\provider-delivery.json `
  --expected-project-ref=<exact-20-character-production-ref> `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment=<exact-production-deployment-id>
```

The checked-in template intentionally fails. See
`operations/PROVIDER_DELIVERY_READINESS.md` for evidence and safety boundaries. A
pass does not contact a provider, mutate production, or authorize the release.

## Email scheduler readiness gate

`email-scheduler-readiness.mjs` validates a sanitized scheduler evidence manifest
without invoking the worker or exposing its secret. It requires the exact staging or
production POST endpoint, a 60-second cadence, one non-overlapping execution, bounded
worker/provider/scheduler timeouts, protected header injection, retained failures,
queue-health alerts, named owners and a fresh, ordered, independently reviewed
empty-queue/live-alert acceptance run that made zero provider requests. The evidence
is bound to the exact project, release commit, deployment and worker endpoint. The
checked-in template intentionally fails.

```powershell
npm.cmd run email-scheduler:check -- `
  --manifest=C:\protected\evidence\email-scheduler-manifest.json `
  --expected-project-ref=<exact-20-character-project-ref> `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment=<exact-deployment-id>
```

Do not put the worker secret in the manifest. A passing record proves only the
configured evidence; it does not invoke the worker or authorize production.

## Release-window readiness gate

`release-window-readiness.mjs` validates a protected release-window manifest without
contacting any service. It binds the approved release to an independently supplied
commit and known-good rollback revision, requires a fresh protected recovery point,
named owners, tested rollback, bounded Sydney release window, stop conditions, and
completion of every external production gate. The checked-in template is deliberately
incomplete and must fail. The Safari, monitoring, production-identity, managed-restore,
production-target, production-secret, production-cutover,
provider-delivery/dedicated-inbox, email-scheduler and signed installer-acceptance
manifests are all required with
passing results. Their SHA-256 digests must also be distinct from one another and from
the rollback and recovery-point manifests. Exact commit, deployment and
production-project metadata is cross-checked, so bare approval booleans cannot replace
any gate result.

Run `--phase=pre-cutover` inside the approved window and immediately before the first
cutover mutation or public traffic switch. It
validates all prerequisites except the necessarily post-cutover evidence. Run the
default final phase during the same approved window after that evidence is complete.
Both phases independently bind the immutable deployment ID.

```powershell
npm.cmd run release:window:check -- `
  --manifest=C:\protected\jingwuguan-release-window.json `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --phase=pre-cutover `
  --expected-production-project-ref=<exact-20-character-production-ref>
```

A passing result records readiness only; it does not authorize or execute a release.

## Production cutover evidence gate

`production-cutover-readiness.mjs` validates the sanitized, protected record created
after the specifically approved production database, domain and read-only acceptance
steps. It binds the exact immutable release deployment and independently supplied
Singapore production project to exact migration history 006–056, catalog/lint/
security results, default-ACL resolution or a narrow time-bounded exception,
read-only Member/Admin/Super Admin checks, the production domain and exact Auth
redirect, all 11 host probes, rollback reachability and zero application/domain
acceptance writes. Expected Supabase Auth session, refresh, audit and last-sign-in
writes are retained and reviewed separately. Evidence must be fresh, ordered,
independently reviewed and represented only by distinct SHA-256 digests.

```powershell
npm.cmd run production:cutover:check -- `
  --manifest=C:\protected\evidence\production-cutover.json `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --expected-production-project-ref=<exact-20-character-production-ref> `
  --expected-window-starts-at=<approved-window-start-with-offset> `
  --expected-window-ends-at=<approved-window-end-with-offset>
```

Follow `operations/PRODUCTION_CUTOVER_READINESS.md`. This command is offline and
cannot perform or authorize the production actions whose evidence it validates.

## Production target identity gate

`production-target-readiness.mjs` is an offline, fail-closed check for the future
Singapore production target. It binds the exact project reference to the public
Supabase origin and to either that project's direct database host or the Singapore
session pooler on port 5432. It requires `sslmode=require`, rejects staging, the
retired project and transaction-pooler connections, and never prints the password or
database URL.

```powershell
npm.cmd run production:target:check
```

Set `PRODUCTION_PROJECT_REF`, `PRODUCTION_REGION=ap-southeast-1`,
`NEXT_PUBLIC_SUPABASE_URL` and `PRODUCTION_DB_URL` in the protected operator
environment first. A passing offline result does not prove project ownership or
dashboard region; independently verify both before any connection command.

## Production provider and secret gate

Run the offline provider gate separately against the exact future production
deployment environment. In production mode it requires role-correct Supabase key
shapes, binds legacy anon/service-role JWTs to `PRODUCTION_PROJECT_REF`, rejects
ambiguous legacy aliases, and refuses staging, dummy-account, security-test, or
Preview-environment residue. It reports variable names and failure categories only;
it never prints credential values.

```powershell
node scripts/provider-config-readiness.mjs --environment=production `
  --expected-origin=https://jingwuguanseibukan.com `
  --expected-supabase-host="$($env:PRODUCTION_PROJECT_REF).supabase.co" `
  --env-file=C:\protected\jingwuguan-production.env
```

A passing result validates offline consistency only. It does not prove that a key is
active, least-privileged, provider-scoped, or different from a staging credential;
verify those properties in each provider dashboard under the approved release gate.

## Read-only staging database verifier

`run-staging-database-verifier.ps1` is pinned to staging project
`eomubndonbetszdbhsrj`. It reads the existing Supabase CLI credential from Windows
Credential Manager, submits only `verify-database-security.sql` through the Supabase
database-query endpoint with `read_only = true`, never prints the credential and
clears its in-process byte buffer.

```powershell
.\scripts\run-staging-database-verifier.ps1
```

The verifier treats unsafe `postgres` defaults as an application release failure.
Hosted `supabase_admin` defaults are accepted only while `postgres` cannot inherit
that managed role and it owns no actual object in the public API schema.

## Isolated browser gates

`npm.cmd run test:browser` builds and tests only against fixed loopback fixtures;
it strips inherited credentials and provider targets. Explicit project runs now
preflight the requested browser engine first, so an unavailable host browser is
reported once before any application test is counted as failed.

```powershell
npm.cmd run test:browser -- --project=firefox-desktop
npm.cmd run test:browser -- --project=webkit-desktop --project=webkit-tablet --project=webkit-mobile
```

The GitHub workflow runs Chromium, Firefox and WebKit as separate Linux gates and
also runs the three WebKit profiles on macOS. Playwright WebKit is not release
Safari, and its iPhone/iPad profiles are emulations rather than physical devices;
final release approval still requires current Safari on real macOS and iOS hardware.

The deployed regular-schedule mutation gate is intentionally separate from the
read-only matrix. It permits exactly one scoped-Admin create followed by one
captured-UUID update/deactivation. The parent process validates the exact fixture
and its one-or-two expected audit rows, then removes only those rows through the
database-owner connection and requires an empty reserved-marker inventory. The
browser never receives the database URL or server credential. Supply an audited
temporary `pg` runtime directory; do not add a test-only cleanup RPC to the product.

```powershell
$env:JINGWUGUAN_PG_MODULE_DIR = 'C:\protected\runtime\node_modules'
node .\scripts\staging-regular-schedule-smoke.mjs --confirm-staging-regular-schedule
```

This command mutates staging briefly and must not be run without explicit approval.
It is pinned to `eomubndonbetszdbhsrj`, the fixed staging host, Admin 0002 and a
Sydney Supabase pooler URL. Production and the retired project are rejected.

The deployed last-training mutation gate is also separate. It uses Admin 0002 and
the exact active Member 0101 membership visible inside that Admin's scope. The
browser performs one past-date correction followed by “trained today”; the parent
captures the complete membership row and complete training-audit history first,
removes only newly captured audit UUIDs, restores the original date, and requires
every business membership field plus the complete audit baseline to match afterward.
The existing membership trigger always advances `updated_at` on update, so that
timestamp is an explicit metadata exception rather than a zero-residue claim.

```powershell
$env:JINGWUGUAN_PG_MODULE_DIR = 'C:\protected\runtime\node_modules'
node .\scripts\staging-last-training-smoke.mjs --confirm-staging-last-training
```

This command also requires explicit live-staging approval. It rejects any other
identity, membership, project, database region, mutation order or target date.

## Recovery readiness gate

`recovery-readiness.mjs` validates a sanitized recovery manifest without contacting
Supabase or any external provider. It fails closed until database, managed Auth,
Storage metadata and object bytes, roles/grants, protected configuration, schedules,
provider resources and post-restore security checks are all verified. See
`recovery/README.md`; never store dumps, object bytes, personal data or secret values
in the repository manifest.

Run it with:

```powershell
npm.cmd run recovery:check -- C:\protected\evidence\recovery-manifest.json
```

The checked-in template is intentionally incomplete and must fail validation.
Manifest v4 also requires the exact 006–056 repository fingerprint, matching
source/restored migration-ledger fingerprints, matching pre-migration schema-catalog
fingerprints and object counts, an exact SHA-256 and byte-count match between the
protected backup payload and isolated restore input, and measured RPO/RTO timestamps. Generate the catalog
fingerprints from schema-only protected exports with
`node scripts/recovery-catalog-fingerprint.mjs <protected-catalog-directory>`.
Generate fingerprints without printing ledger SQL using:

```powershell
npm.cmd run recovery:fingerprint
npm.cmd run recovery:fingerprint -- --ledger C:\protected\evidence\source-ledger.json
```

## Production secrets readiness gate

`production-secrets-readiness.mjs` validates protected future-production
configuration in memory without contacting Vercel, Supabase, Resend, Mux, or the
application. It composes the provider configuration check, binds the result to the
exact Singapore project, release commit and Vercel production deployment, and
requires fresh ownership, rotation, access-review and independent-review evidence.
It reports only field names, sanitized counts, and blockers; secret values are never
printed or accepted in the sanitized manifest.

Use the checked-in fail-closed template and the full procedure in
`operations/PRODUCTION_SECRETS_READINESS.md`. Keep both the completed manifest and
the production environment file under protected storage.

```powershell
npm.cmd run production:secrets:check -- `
  --manifest=C:\protected\evidence\production-secrets.json `
  --env-file=C:\protected\jingwuguan-production.env `
  --expected-project-ref=<production-project-ref> `
  --expected-commit=<release-sha> `
  --expected-deployment-id=<production-deployment-id> `
  --expected-origin=https://jingwuguanseibukan.com
```

## Release evidence packet gate

`release-evidence-packet-readiness.mjs` closes the gap between recorded SHA-256
references and the actual protected evidence files. It first revalidates the complete
release-window manifest, then verifies that all twelve evidence files exist outside
the repository, are bounded regular JSON files, are distinct, and hash to the exact
digests in that release record. Network-share paths, links, malformed JSON, duplicate
files and digest drift fail closed.

The rollback and production-cutover evidence files receive full semantic validation;
the other child validators must also pass individually before packet assembly.

Copy `release/release-evidence-index.template.json` to protected storage and follow
`operations/RELEASE_EVIDENCE_PACKET.md` after every individual gate passes:

```powershell
npm.cmd run release:evidence:check -- `
  --index=C:\protected\jingwuguan-release-evidence-index.json `
  --expected-commit=<release-sha> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --expected-production-project-ref=<production-project-ref>
```

`rollback-readiness.mjs` validates the protected, sanitized application rollback and
replacement-target database recovery rehearsal. It binds the exact candidate and
known-good commits/deployments, rejects production/provider contact and destructive
down migrations, enforces the decision deadline/RTO, and requires a canonical
independent review digest:

Add `--print-review-digest` while the protected manifest still contains the digest
placeholder. The command prints only the digest after every other field passes. Save
it into `attestation.reviewDigest`, then rerun without the flag. Repository files,
links, network paths and oversized inputs are rejected.

```powershell
npm.cmd run rollback:check -- `
  --manifest=C:\protected\evidence\rollback-evidence.json `
  --expected-commit=<exact-release-sha> `
  --expected-deployment-id=<candidate-deployment-id> `
  --expected-previous-commit=<known-good-sha> `
  --expected-previous-deployment-id=<known-good-deployment-id>
```

The packet verifier performs no network, database, deployment, inbox or provider
action and does not authorize a production release.

## Dummy test accounts

This seed creates 56 temporary accounts for local/staging testing.

## Accounts

- `0001` — Test Super Admin
- `0002` — Test Aikido Admin
- `0003` — Test Karate Admin
- `0004` — Test Kungfu Kids Admin
- `0005` — Test Taiji Admin
- `0006` — Test Xingyi Admin
- `0101-0110` — 10 Aikido Members
- `0201-0210` — 10 Karate Members
- `0301-0310` — 10 Kungfu Kids Members
- `0401-0410` — 10 Taiji Members
- `0501-0510` — 10 Xingyi Members

The staging-only test password is defined by `TEST_PASSWORD` in
`DUMMY_ACCOUNT_PASSWORD` in the protected staging environment. It must be at
least 16 characters with uppercase, lowercase, a number and a symbol. Do not
reuse it for production or document it in release evidence.

Profiles also receive `username = Member ID`, so they are suitable for testing a Member-ID login flow.

## Setup

Your `.env.local` needs:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DUMMY_ACCOUNT_PASSWORD=use-a-protected-staging-only-value
```

Never prefix the service-role key with `NEXT_PUBLIC_`.

Create a `scripts` folder in the project root and put the two `.mjs` files there.

Run:

```powershell
node .\scripts\seed-dummy-users.mjs --environment=staging --expected-project-ref=YOUR_STAGING_REF
```

## Delete before production

The cleanup tool is audit-only unless `--delete` is supplied. It requires the
exact target project ref, refuses to disguise the recorded production project as
staging, and selects an account only when both the test email domain and the
`dummy_account: true` Auth metadata marker match.

First run an audit against the intended target:

```powershell
node .\scripts\delete-dummy-users.mjs --environment=staging --expected-project-ref=YOUR_STAGING_REF
```

Review the count, then repeat with `--delete` and the candidate-set token printed
by that exact audit. A changed candidate set invalidates the token. Production
also requires `--environment=production --allow-production` and separate explicit
operator approval. The script re-lists Auth users after deletion and fails unless
zero marked accounts remain.

Do not delete staging test accounts until all provider-backed and authenticated
acceptance tests are complete. Never assume profile/membership rows cascaded merely
because Auth deletion succeeded; include orphan checks in the final database gate.

## Notes

- Super Admin `0001` also receives an Aikido membership so Member-facing screens can be tested.
- Each class receives one Admin.
- Where a class has active dojos, the seed assigns a dojo automatically.
- Aikido requires at least one active dojo.
- The 10 Aikido Members are distributed across active Aikido dojos.
- All seed memberships start Active, Mudansha, and unranked.
- The seed is rerunnable: existing dummy Auth users are updated and membership/profile rows are reused where possible.

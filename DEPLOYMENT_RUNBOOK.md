# Staging promotion, production deployment, and rollback

Last updated: 18/09/2026. Release is BLOCKED. Sydney staging is healthy at exact
migration history 006–036. Corrective migration 032 passes its 15/15
rollback-contained YouTube acceptance, migration 033 passes its 12/12 email-health
acceptance, migration 034 passes its 27/27 repository/event acceptance, and the
post-migration role-security suite passes 12/12. Migrations 035 and 036 are applied
and accepted: Member lifecycle passes 35/35, registration/password reset passes
23/23, database lint is clean, and rollback-residue checks pass. The
application-owned schema restore has been rehearsed successfully. Production has not
received migrations 011–036. Complete
managed Auth, Storage-object, roles/configuration and provider recovery proof,
remaining workflow/browser coverage and production operational configuration are
still prerequisites. Migration 037 is prepared locally only, with SHA-256
`849866937AE085FAC16372852D1724E71570925ADF3868B106531E4D4AE1563A`.
It must first pass the separately approved rollback-contained staging rehearsal;
do not include it in an apply command yet.

## Prerequisites and target safety

- Separate Supabase staging project/branch, with outbound email/push disabled or
  isolated to test recipients before copied data is used.
- Complete restorable backup, PostgreSQL 17 client tools or Docker, and a tested
  restore. Catalog JSON is review evidence, not a database backup.
- Dedicated staging Member, scoped Admin, and Super Admin accounts, with in-scope
  and out-of-scope memberships across at least two dojos/classes.
- Staging secrets, VAPID keys, sender settings, and redirect allowlists.
- Reviewed patch and migration hashes. Root 004/005 must not be replayed.

## Production region decision

The production Supabase primary must be created in **Southeast Asia (Singapore),
`ap-southeast-1`**, because Indonesia/Jakarta is the intended primary user region.
Sydney project `eomubndonbetszdbhsrj` remains staging only and must not be promoted
or relabelled as production.

Supabase projects are region-bound. Do not attempt an in-place region change. Before
production release, create a separate Singapore project, record and independently
verify its exact project reference/region, then execute the reviewed migration and
recovery procedure. The cutover must include database/Auth migration, Storage object
bytes and policies, redirects, API URLs/keys, secrets, schedules, provider settings,
DNS/hosting configuration and fresh role/workflow/browser acceptance. No Singapore
project creation, migration, billable upgrade or production cutover is authorized by
this planning decision alone; each consequential action still requires its normal
release approval and recovery point.

The repository is linked to LIVE project `pkmllhaavadhaozmwapz`. Never use
`--linked` for staging. Every command below uses an explicit URL. Keep passwords
and connection URLs in the operator environment, not source, chat, or logs.
CLI 2.116.0 was checked for these options.

Require `STAGING_DB_URL` and `STAGING_PROJECT_REF`. Independently verify them
against the staging dashboard: direct host `db.<STAGING_PROJECT_REF>.supabase.co`,
or a Supabase pooler username ending in `.<STAGING_PROJECT_REF>`. The reference
must not be `pkmllhaavadhaozmwapz`. Require TLS and percent-encode credentials.
For a local clone, verify its loopback host and isolated port instead.

Run from the reviewed repository. Stop on every nonzero exit code. Do not use
`--include-all`, `--include-seed`, `--include-roles`, or history repair to bypass
a mismatch.

## Backup and reproducible baseline

Portable clients are available at
`C:\Users\hioec\.codex\.chatgpt-projects\g-p-6a82d9108974819182fef42ef83189ba\tools\postgresql-17.11\pgsql\bin`.
The psql, pg_dump, pg_dumpall and pg_restore version checks report 17.11. No
Windows service or PATH change was made. See the resume evidence TOOLING.md for
download provenance/hashes. Docker is still needed for CLI dump commands below;
native clients offer an alternative once a backup connection is configured.

Provide backup credentials in a protected local libpq service/password file
outside the repository, or in a scoped operator environment. Never echo the
connection string, dump Auth data into chat, or reset the live database password
just to unblock this task. A working Supabase CLI API login is not itself a
verified native pg_dump connection. Native exports must cover the full database,
roles and migration history; check every warning/exit status and prove restore.
See [PostgreSQL backup options](https://www.postgresql.org/docs/17/app-pgdump.html)
and [protected connection configuration](https://www.postgresql.org/docs/17/libpq-pgservice.html).

Before cloning, capture a fresh live backup using an authorized read-only backup
connection or platform snapshot. Restrict access: data and Auth dumps contain
personal information and credentials. Restore only into an isolated target.
Record the restore point, timestamp, schema/data counts, and SHA-256 hashes.

Example staging pre-migration exports (the CLI requires Docker):

```powershell
if (-not $env:STAGING_DB_URL -or -not $env:BACKUP_DIRECTORY) { throw 'Staging URL and backup directory are required' }
npx.cmd --yes supabase@2.116.0 db dump --db-url $env:STAGING_DB_URL --role-only -f "$env:BACKUP_DIRECTORY/staging-roles.sql"
npx.cmd --yes supabase@2.116.0 db dump --db-url $env:STAGING_DB_URL -f "$env:BACKUP_DIRECTORY/staging-schema.sql"
npx.cmd --yes supabase@2.116.0 db dump --db-url $env:STAGING_DB_URL --use-copy --data-only -f "$env:BACKUP_DIRECTORY/staging-data.sql"
pg_dump --dbname=$env:STAGING_DB_URL --schema=supabase_migrations --file="$env:BACKUP_DIRECTORY/staging-migration-history.sql"
pg_dump --dbname=$env:STAGING_DB_URL --schema-only --schema=public --schema=auth --schema=storage --file="$env:BACKUP_DIRECTORY/staging-review-schema.sql"
```

Default CLI dumps exclude managed schema definitions. The separate review dump
is required to inspect Auth/Storage policies and triggers; do not blindly replay
those definitions over an existing hosted project. Follow the
[Supabase backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
and verify a disposable-target restore. A successful dump alone is not recovery
proof. Storage database rows do not include uploaded object bytes: back those
up separately through Storage. Record Auth configuration, redirects, scheduled
jobs, extensions, secrets, and email/push configuration in the protected recovery
inventory, not the public repository.

Review Supabase's encryption-root-key requirements before a manual logical
restore when Vault/column encryption is used. Do not assume copying database
rows copies encryption keys. Follow the linked platform recovery procedure;
branching/platform restore and manual logical restore have different key-handling
requirements. Outbound jobs and real-recipient messaging must stay disabled on
the copied target until test-only destinations are verified.

Preserve an immutable, secret-scanned pre-011 application schema baseline outside
the active migration chain. Restore the exact 006–010 ledger separately. Retain
legacy root SQL until the clean restore proves complete coverage.

### Complete-recovery evidence gate

The scoped application-schema rehearsal does not prove complete Supabase recovery.
Use the sanitized manifest contract in `recovery/recovery-manifest.template.json`
for the disposable managed-platform drill, then run `npm.cmd run recovery:check --
<protected-manifest-path>`. The validator is offline and read-only. It must remain
blocked until managed Auth, Storage metadata and object bytes, database roles/grants,
Vault/encryption handling, Auth configuration, secrets inventory, schedules and
external provider resources have all been restored or recovered and verified.

Do not place dumps, object bytes, personal information, passwords, tokens, private
keys or secret values in the manifest or repository. Record only sanitized counts,
hashes, timestamps and protected evidence references. A staging-source pass proves
the procedure, not the freshness of a production backup. Production-source evidence
requires the validator's explicit `--allow-production-source` acknowledgement; that
flag does not authorize or perform production access.

## Staging preflight and apply

1. Review restored objects, ownership, grants, RLS, triggers, Auth/Storage behavior,
   and extensions. Resolve platform-owned unsafe default privileges.
2. Rerun both normalized duplicate queries at the top of migration 012. Require
   zero rows; never auto-merge/delete profiles. Plan for transactional index locks
   and identity canonicalization.
3. Confirm exact 006–010 history and inspect all six pending SQL files.

```powershell
npx.cmd --yes supabase@2.116.0 migration list --db-url $env:STAGING_DB_URL
npx.cmd --yes supabase@2.116.0 db push --db-url $env:STAGING_DB_URL --skip-vault --dry-run
```

Only 011, 012, 013, 014, 015, and 016 may be pending. A dry run lists migrations;
it does not execute or validate SQL. Review every file and hash before applying.
`--skip-vault` avoids unrelated configured Vault updates.

```powershell
npx.cmd --yes supabase@2.116.0 db push --db-url $env:STAGING_DB_URL --skip-vault
npx.cmd --yes supabase@2.116.0 migration list --db-url $env:STAGING_DB_URL
npx.cmd --yes supabase@2.116.0 db lint --db-url $env:STAGING_DB_URL --level warning
psql --dbname=$env:STAGING_DB_URL --set=ON_ERROR_STOP=1 --file=scripts/verify-database-security.sql
```

The read-only SQL assertions must pass. They intentionally fail if unsafe
`supabase_admin` global/public defaults remain: postgres cannot resolve those
through migration 014. Arrange an authorized owner-level fix, not privilege
escalation or a silently weakened check.

Owner-level change request: review the three captured supabase_admin-owned
public-schema defaults (tables, sequences, functions), plus built-in global
PUBLIC function EXECUTE. An authorized platform owner must remove unwanted
browser defaults globally and per schema while preserving required service
grants, then rerun the assertions. The postgres-owned storage defaults require
separate managed-Storage compatibility review. Do not attempt SET ROLE, change
role memberships, or append statements to 014 to bypass hosted permissions.

## Application and role gates

Set the app's `NEXT_PUBLIC_*` values to staging BEFORE building. Next.js embeds
these values in browser bundles: never promote a staging-configured binary to
production. Server secrets must also be staging-only. Set the six dedicated
account variables in README, then:

```powershell
$env:SECURITY_TEST_ENVIRONMENT='staging'
$env:SECURITY_TEST_EXPECTED_HOST=([uri]$env:NEXT_PUBLIC_SUPABASE_URL).Authority
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:security
```

Independently confirm that expected host against the staging dashboard rather
than trusting a copied .env.local. The runner rejects the known live host in
staging mode. Staging includes a privileged mutation-denial probe;
production-read-only mode excludes that probe entirely.

Complete every authenticated and functional item in TODO_PROGRESS.md. Record
before/after counts, audit entries, and side effects. For 016, test concurrent
generation/reminder calls, repeated retries, zero/partial/full payments,
cancelled/waived charges, wrong-dojo denial, and one reminder per charge/day.
Require correct scope, financial totals, and notification idempotency. Verify
keyboard/focus/error states and mobile/tablet/desktop layouts. Configure and test
worker scheduling, email, push, and durable rate limits.

Worker monitoring must alert on HTTP 500 (queue/retry persistence) and 502
(delivery or acknowledgement failure). Preserve existing outbox IDs on retry;
do not re-enqueue a second row to obtain another provider key. Test provider
acceptance followed by database acknowledgement failure, expired claims, retry
backoff, exhausted attempts and provider idempotency expiry in staging. The
new handler tests cover responses and calls, not external delivery guarantees.

Remaining rate-limit work needs approved thresholds and a durable enforcement
point. A process-local counter is insufficient across server instances, and
hosting-only API limits do not cover browser calls directly to Supabase Auth or
RPCs. Verify Auth limits, registration/reset abuse controls, authenticated
password/push routes, privileged mutation RPCs and worker scheduling separately.
Deployment project/access, sender verification, scheduler ownership, VAPID keys,
redirect allowlists and rollback operator access are not yet verified.

## Production promotion — explicit authorization required

After all staging gates pass and the user authorizes a release window:

1. Freeze schema changes; capture a fresh production restore point and verified
   backups. Confirm the reviewed patch/commit, target hashes, and recovery owner.
   Never use staging backups as the production restore point.
2. Set `PRODUCTION_DB_URL` to the dashboard-verified live TLS connection:

```powershell
npx.cmd --yes supabase@2.116.0 migration list --db-url $env:PRODUCTION_DB_URL
npx.cmd --yes supabase@2.116.0 db push --db-url $env:PRODUCTION_DB_URL --skip-vault --dry-run
```

3. Stop unless only reviewed 011–016 files are pending. Rerun duplicate preflight
   and check for schema drift. Only in the approved window:

```powershell
npx.cmd --yes supabase@2.116.0 db push --db-url $env:PRODUCTION_DB_URL --skip-vault
npx.cmd --yes supabase@2.116.0 migration list --db-url $env:PRODUCTION_DB_URL
npx.cmd --yes supabase@2.116.0 db lint --db-url $env:PRODUCTION_DB_URL --level warning
psql --dbname=$env:PRODUCTION_DB_URL --set=ON_ERROR_STOP=1 --file=scripts/verify-database-security.sql
$env:SECURITY_TEST_ENVIRONMENT='production-read-only'
$env:SECURITY_TEST_EXPECTED_HOST='pkmllhaavadhaozmwapz.supabase.co'
npm.cmd run test:security
```

4. Confirm the runner uses authorized dedicated live accounts and live public
   configuration. Never exercise mutation workflows in production.
5. Build the reviewed source with PRODUCTION environment values through the
   existing Vercel project and promote that immutable build. Deployment project
   identifiers and release/rollback access must be verified before the window;
   neither has been validated at this checkpoint.
6. Check read-only login/approval/role boundaries and monitor auth errors, API
   5xx, outbox age/retries, push failures, and database logs. Stop on an
   authorization failure; do not weaken grants to accommodate old UI.

## Rollback and recovery

- Application: redeploy the preceding known-good immutable Vercel build.
  Preserve database security fixes unless a reviewed replacement is ready.
- Database: restore the fresh snapshot/PITR point or verified backups into a
  replacement project. Check integrity, Auth/Storage, history, counts, and
  security before switching. Capture/reconcile writes since the restore point
  and obtain approval for any data-loss window; never overwrite live data blindly.
- Migration 012 canonicalizes identity data. Dropping indexes/triggers cannot
  reconstruct old values; only a verified data backup can.
- Migrations 014/015: restore exact pre-migration bodies/ACLs only through a
  reviewed forward repair; do not re-expose unsafe functions as a quick rollback.
- Migration 016: preserve charges, payments, notifications, and audit rows.
  Prefer a forward repair or disabling the affected action to deleting financial
  history. The pre-016 catalog records all three routines as absent.

After recovery, repeat migration history, database lint, security smoke, and
integrity/audit checks before reopening writes. A restore is not verified until
it has actually been rehearsed.

## Milestone 16 frontend validation and integration

The frontend continuation has a new baseline/evidence directory:
`release-evidence-20260831-frontend`. Before integration, create its fresh
environment-excluded snapshot and binary patch, check each target against the
baseline hash, and stop on overlap. Verify both copies after merging; rerun npm
ci, lint, tests, standalone typecheck and build in the integrated source. This
is not a Git commit or deployment. The final ledger-only update needs its own
backup, final manifest and reverse-patch CHECK. Do not actually reverse patches
against a changed source tree without reviewing its current hashes.

Frontend acceptance still requires an approved staging browser: check native
mobile-dialog Tab/Shift-Tab containment, Escape, focus return, desktop resize,
skip links, status announcements, catalog error/retry/success, fast class
switches and all role-specific mobile/tablet/desktop workflows. Component tests
are not substitutes. The in-app browser blocked the synthetic backend URL, so
no successful catalog/dojo browser coverage is claimed. Preserve that failed
attempt as evidence; do not disable CSP or bypass browser restrictions.

All validation builds continue to use loopback placeholders and must not be
promoted. This continuation applies no SQL and introduces no database rollback
step. Application rollback remains the previous known-good immutable release;
source recovery must use the new verified snapshot/patch without discarding
unrelated changes. Staging, complete protected backup/restore, platform grants,
external configuration and explicit production authorization remain mandatory.

## Milestone 18 browser CI and next release gates

New evidence is in `release-evidence-20260831-browser-ci`; previous evidence is
immutable. `npm run test:browser` owns a fresh isolated build and fixed loopback
servers, with all backend responses mocked. It must not use production secrets,
reuse a running server, modify CSP, ignore TLS errors or contact the old blocked
fixture. Install the pinned Playwright engines first (README instructions).
Inspect its JSON, screenshots and traces; no CI workflow has run remotely yet.

The local full suite currently reports 75 passed / 10 failed. Keep its nonzero
exit visible: WebKit public pages require a trusted HTTPS test endpoint and the
skip-link case requires keyboard/platform investigation. Do not skip the profile,
mark failures expected, remove HTTPS enforcement or call a subset a release pass.
Browser permissions and certificate trust must be authorized before changing
them. A trusted staging site also needs a separate, guarded authenticated suite;
the local runner intentionally rejects remote target overrides.

Before production approval, require all of the following evidence:

1. Separate verified staging project and protected complete backup with a proved
   restore, including Auth/Storage/assets/configuration recovery as applicable.
2. Correct pending history, fresh duplicate preflight, reviewed 011–016 dry-run,
   authorized platform-owner grant resolution, staged apply, lint, SQL security
   checks and dedicated Member/scoped Admin/Super Admin security suite.
3. Original registration/approval/password/membership/grading/assessor/title/
   certificate/transfer/subscription/payment/settlement/notification/export/audit
   workflows, including 016 concurrency, deduplication and wrong-dojo denial.
4. Trusted HTTPS cross-browser tests, actual keyboard/screen-reader checks and
   all authenticated mobile/tablet/desktop screens, not merely isolated shells.
5. Approved durable rate-limit thresholds and enforcement, scheduler ownership,
   delivery/retry monitoring, email sender, VAPID configuration, redirect allowlists,
   deployment project and tested application/database rollback access.
6. Fresh integrated-source local gates and a real environment-configured build,
   then separate explicit authorization for the production release window.

For this continuation, snapshot source and create a fresh binary patch before
integration; stop on any changed target hash. Verify the reverse-patch CHECK
without reversing files, preserve unrelated edits, and rerun source gates plus
the entire browser suite. Record the expected blocked security/browser exits
as failures, not waived passes. Runtime changes must precede the final gate.

No database rollback is introduced by these frontend/test changes. Source
recovery uses the guarded new snapshot/patch; application rollback uses the
prior immutable release. Database recovery still requires the tested fresh
backup/PITR process above. None of these placeholder builds may be deployed.

## Milestone 20 continuation

Latest evidence is `release-evidence-20260831-keyboard`. Native keyboard skip-link
activation now passes in the local WebKit fixture after an explicit tabindex=0
application fix. Full working browser results improve to 76 passes / 9 failures;
the remaining WebKit public-page failures still require trusted HTTPS. Existing
browser/CSP/TLS protections and all required profiles/assertions are retained.
The final source rerun adds visible-focus/viewport assertions and a screenshot.
Neither local engine results nor the prepared workflow certify real Safari,
assistive technology, authenticated workflows or remote CI execution.

Before this continuation's integration, create a fresh 143-file source snapshot,
patch and per-target hash checks. Preserve unrelated changes and retain the
previous evidence. Finalize the ledger separately after the integrated-source
gates. For later source recovery, compare the new final manifest before using
its patch; never reverse it over newer changes blindly.

No database rollback or deployment was performed or authorized. The next external
prerequisites remain a separate staging target, trusted HTTPS and protected backup/
restore access. Use the existing staged validation and production approval steps
above. Application rollback remains the previous immutable release; database
recovery still requires a proved fresh backup/PITR restoration. Do not promote
any loopback-configured build or run mutation tests against production.

## Milestone 21 — trusted HTTPS setup and release boundary

The isolated runner now has an opt-in HTTPS transport; see README's four
`BROWSER_SMOKE_*` configuration variables. Supply current 127.0.0.1-SAN certificate,
matching protected key and public CA files outside repositories/evidence. Obtain
approval before creating browser/OS trust entries. Record certificate thumbprints,
validity, exact trust stores/profiles, key ACLs and removal steps. Do not install a
broad CA or change system-wide settings without specific permission.

The runner adds only the explicitly provided public CA to child Node trust and
never changes browser trust itself. Confirm all three engines and Node readiness
trust the endpoint with normal certificate verification. Do not use ignore errors,
SPKI bypass switches or HTTP/CSP rewrites. Missing trust is a blocked gate, not an
acceptable expected failure. Real staging needs its own separately guarded suite;
the isolated runner still cannot target a remote application or database.

Offline parsing/context checks and eight new regression tests are preparatory
evidence only. Trusted HTTPS execution, remote CI and all staging/operational gates
remain outstanding. GitHub read access is verified, but the workflow is not on the
remote default branch. Before any publish/dispatch, authorize the exact reviewed
branch/change set; do not commit unrelated dirty work or overwrite remote changes.

Latest evidence: release-evidence-20260831-https-support. Source integration uses a
fresh 143-file snapshot and per-target hashes, then an independently guarded final
ledger update. Existing application/database rollback procedures above remain in
force; no SQL, trust installation, cloud provisioning or deployment occurred.
Actual integrated-source gate results and final hashes are in that CHECKPOINT.md.

## Milestone 22 — trust handoff and CI isolation

Latest evidence: release-evidence-20260831-https-validation. The actual HTTPS app,
14 login assets, navigation and negative TLS trust/hostname checks pass. This was a
Node-client transport run, not a complete browser pass. The CurrentUser Root Add
attempt stalled before any browser work and was interrupted; its certificate entry
was absent and temporary material removed. The old thumbprint/paths are retired.

For the next full-browser run, use an operator-completed trusted loopback setup or
run tools/run-trusted-browser.ps1 interactively while the authorized user can handle
the exact certificate prompt. Read the newly generated certificate plan first. Keep
validity <=24h, loopback SAN only, owner-only key ACLs and CurrentUser/profile trust.
Never automate/suppress security prompts, modify machine trust or disable TLS/CSP.
After interruption, verify the exact entry and clean only test-created artifacts;
do not assume finally executed. Require all 85 cases and all five profiles.

GitHub publication/CI is now authorized for reviewed changes on a separate validation
branch, but production isolation is unresolved. The current main commit has a Vercel
deployment status for team js1-ccd7/project jingwuguanseibukan. Before publication,
inspect repository hooks/installed apps and Vercel production/preview branch rules,
inherited environment configuration, schedulers and costs. Do not infer safety from
an absent GitHub workflow directory. Obtain authenticated settings access and hosting
target authorization; stop if a branch/PR could trigger a production action.

The spending field remains blank/unchanged: obtain approval of an actual itemized
quote before billable staging/hosting/CI work. Protected export authority does not
supply credentials or prove recoverability. Original staging, complete recovery,
security/functional/operational gates and separate specific production release
approval above remain mandatory. No production or database rollback was performed.

## Milestone 23 — existing staging and revised pending 016

Latest implementation/evidence: `release-evidence-20260831-subscription-hardening`.
Latest project/access selection: `release-evidence-20260831-sydney-resume`.
Use staging `eomubndonbetszdbhsrj` (Sydney/ap-southeast-2), never production
`pkmllhaavadhaozmwapz`. The earlier proposal to replace Sydney with a Singapore
*staging* project was cancelled; that historical choice does not override the later
decision to place the eventual production primary in Singapore. Do not treat the
Sydney pause/resume operation as an independently proved production restore.

Before copying production records, obtain Sydney data-location consent and the
operator's owner-protected database credential paths via the existing workspace
credential helper. Do not reset production credentials. Outbound isolation must
precede restoration of any executable job, webhook, secret or real-recipient data.

Preview Branch Tracking is saved OFF. This does not isolate shared secret scopes,
manual deployments or existing deployments. The current write-only secret's scope
selector was disabled; its edit was cancelled without revealing/changing its value.
Use a supported authorized scope-isolation mechanism, preserve Production values,
and do not enable team-wide policies or paid upgrades implicitly. No validation
branch publication or CI/deployment should occur until these boundaries are proved.

Pending 016 now uses canonical YYYY-MM-DD lock/reminder-key dates. Review its new
hash. The local regression run improved from 20 pass / 2 fail to 22 pass / 0 fail,
including two-session blocking and same-day retries across DateStyle settings.
These fixtures use stub dependencies and no live data; apply neither the fixture
schema nor its trust-authentication setup to Supabase. Repeat all real staging
acceptance, payment-writer concurrency and recovery gates. Inspect historical
reminder keys; if non-ISO keys exist, require a reviewed compatibility plan before
promotion. Timezone/day-boundary policy is unchanged and still needs validation.

Rollback remains the reviewed forward-repair/recovery procedure above. Preserve
charges, payments, notifications and audit history; do not reverse security fixes
or rewrite historical keys blindly. No production release is authorized here.

## Milestone 30 — staging 017–018 promotion sequence

Current staging `eomubndonbetszdbhsrj` contains exactly migrations 006–016. Do not
replay 006–016 or use the production-linked directory. Migrations 017 and 018 are
reviewed and rehearsed but unapplied. Production `pkmllhaavadhaozmwapz` remains
untouched and is not authorized for this sequence.

After obtaining explicit approval for 017–018 on staging only:

1. Reverify the exact project id, healthy state, disabled Auth email/phone providers,
   zero Edge Functions/secrets, and migration history 006–016.
2. Capture fresh schema, ACL and migration-ledger evidence. Rerun the identity
   duplicate preflight and stop on any unexpected drift.
3. Run an explicit-project dry run and require it to list only 017 and 018. Compare
   both file hashes with the reviewed checkpoint.
4. Apply only 017 and 018 to staging. Stop on any error; do not repair forward until
   the failed statement and transaction state are understood.
5. Require history 006–018, a clean database lint result, the strengthened
   `scripts/verify-database-security.sql` result, and the guarded 12-check Member,
   Admin and Super Admin suite. Preserve every failure as evidence.
6. Confirm temporary sessions are invalid, outbound providers remain disabled and
   no production endpoint was contacted.

The verifier must still stop release on unsafe platform-owned default ACLs. Do not
remove that check to obtain a pass. Resolve it through a supported owner/platform
mechanism or document and approve a narrowly reviewed exception before production
promotion. A staging migration pass alone does not authorize production.

If 017–018 fail before commit, retain the failed output and confirm history remains
006–016. If they commit but acceptance fails, keep staging isolated and use a
reviewed forward repair or restore the protected staging recovery package; never
apply a speculative down migration and never change production as a workaround.

## Milestone 31 — post-018 staging continuation

Migrations 017 and 018 have committed on staging. Do not rerun them. Before any later
database change, require exact 006–018 staging history and preserve the milestone-31
preflight, independent post-apply, lint and 12/12 role-suite reports.

The production promotion sequence is still blocked. First obtain a supported answer
for the `supabase_admin` platform-default ACLs and rerun the exact SQL verifier. Then
complete migration-016 concurrency/payment/deduplication/wrong-dojo acceptance, all
business workflows, trusted browser/accessibility and remote CI, provider/hosting
isolation, durable rate limiting, monitoring and a final production-configured build.

Only after every required gate passes may an exact production release be proposed.
That proposal must identify the immutable revision, production target, approved
migrations, fresh recovery point, release window, rollback owner and stop conditions.
It still requires separate explicit user approval. Never run staging mutation tests
or speculative repair SQL against production.

## Milestone 32 — subscription acceptance gate satisfied

Do not repeat the migration-016 concurrency fixture unless its functions, finance
dependencies, notification writer or related schema change. The hosted staging gate
passes 10/10 and its post-cleanup 12/12 role suite passes. Preserve the milestone-32
hashes and require zero synthetic-row cleanup counts and disabled outbound surfaces
in any future rerun.

Continue release preparation with the broader authenticated business matrix, trusted
browser/accessibility coverage, remote CI and operational controls. The platform-
owner default ACL finding still blocks an unqualified readiness decision. No result
in this milestone authorizes production migration or deployment.

## Milestone 33 — post-019 staging baseline

Migration 019 has committed on staging. Do not rerun migrations 011–019. Before any
later database change, require exact 006–019 staging history and preserve the guarded
apply, clean lint, 12/12 security and 11/11 membership-workflow reports. The affected
break and return-active transitions must continue to produce exactly one history row.

The integrated dependency baseline is Next.js/`eslint-config-next` 16.3.4 with Sharp
0.35.4 and `js-yaml` 4.3.2. Require `npm audit --audit-level=high` to exit 0 in the
final immutable release gate. The current 40-route build used loopback placeholders;
never promote it as a production artifact.

Production promotion remains blocked until the platform-owner default ACL is resolved
or explicitly accepted after narrow review; the remaining authenticated business and
trusted browser/accessibility/CI matrices pass; and hosting redirects, durable rate
limits, worker/provider delivery, monitoring, secrets and rollback access are proved.

The production proposal must still name the exact production project, immutable
revision, reviewed migrations, fresh protected recovery point, release window,
rollback owner and stop conditions. Migration 019 and all earlier staging approvals
do not authorize production. Never run the staging mutation fixtures in production.

## Milestone 35 — post-020 staging baseline

Migration 020 has committed on staging. Do not rerun migrations 011–020. Before any
later database change, require exact 006–020 staging history and preserve the guarded
integration/apply, clean lint, 20/20 transfer and post-test 12/12 security reports.
The strict verifier's unchanged `supabase_admin` future-object default-ACL failure
remains a release gate unless resolved through a supported owner action or accepted
as an explicit narrow production risk decision.

No transfer fixture may run in production. Production promotion still requires all
remaining functional/browser/accessibility/remote-CI and operational gates, verified
production configuration, a fresh protected recovery point, an immutable revision,
release window, rollback owner and separate explicit approval.

## Milestone 36 — pending migration 021

Do not treat the transaction rehearsal as application. Staging remains 006–020.
After explicit staging-only approval, guard integration of migration 021 and its
regression, require a dry run selecting only 021, apply it only to verified Sydney
staging, then rerun database lint, the unchanged strict verifier, the full payment
suite and post-test 12-check role security smoke. Stop on any new verifier failure or
payment mismatch. No production action is authorized.

## Milestone 37 — post-021 staging baseline

Migration 021 has committed on staging. Do not reapply migrations 011–021. Require
exact staging history 006–021 before the next database change and preserve the
source-integration backup/manifests, migration-apply evidence, clean lint report,
19/19 payment report and 12/12 post-test security report.

The strict verifier still stops only at the hosted `supabase_admin` future-object
default ACL. Production promotion remains prohibited until the remaining functional
matrix, authenticated browser/accessibility and remote-CI gates, production hosting
configuration, rate limiting, workers/providers, monitoring, recovery rehearsal,
immutable release revision, release window and rollback owner are complete and a
specific production release receives separate explicit approval.

## Milestone 38 — prepared settlement test boundary

The guarded settlement suite is rollback-contained and may target only verified
Sydney staging `eomubndonbetszdbhsrj` at exact history 006–021. It must never run
against production. Before execution require explicit staging mutation-test
approval, preserve disabled outbound surfaces, and stop on identity, TLS, history,
hash, temporary-role-expiry or residue mismatch. After a pass, rerun the 12-check
authenticated security smoke; investigate any failure without weakening coverage.

### Milestone 38 execution result

Attempts v1-v4 were confined to verified Sydney staging and each independently
verified rollback with zero fixture residue. Attempt v4 identified an ambiguous
browser RPC caused by the legacy five-argument `set_dojo_settlement_transfer`
overload having two defaulted trailing parameters alongside the application-used
four-argument overload. Do not promote or mark settlement acceptance passed.

Migration 022 is prepared in the working copy only. Before any further settlement
acceptance run, separately approve its guarded integration and staging-only apply,
require an exact 006–021 preflight and a dry run selecting only 022, then require
history 006–022, database lint, strict security verification, the complete
rollback-contained settlement suite, and a fresh authenticated security smoke.
Security smoke v12 already passed 12/12 after the failed suite. No production action
is authorized.

## Milestone 39 — reconciled migration order

The integration candidate uses the only valid forward order: existing 019 membership
history deduplication, 020 transfer atomicity and 021 payment hardening; prepared 022
settlement-overload removal; then 023 legacy-email routing and 024 repository video.
Never apply the older video-branch files under their former 019/020 names, because
those versions collide with already committed staging migrations.

Before staging, require exact history 006–021 and an explicit dry run listing only
022–024 in that order. Apply each reviewed migration only to verified Sydney staging,
stopping after any failure. Then require database lint, strict ACL verification,
settlement acceptance, email bridge checks, private-video upload/webhook/playback/
logo-replacement/retirement acceptance, and the 12-check role security smoke. None
of this sequence authorizes production.

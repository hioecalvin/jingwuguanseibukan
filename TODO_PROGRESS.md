# Jingwuguan Seibukan production progress

## Approved CI advisory exception — 5 October 2026

- [x] Explicit owner approval; exact development-only advisory exception.
- [x] Automatic expiry 2026-10-19 11:09:49 UTC; no blanket high/critical bypass.
- [x] Thirteen policy safety tests; live audit policy and strict production audit passed.
- [x] ESLint, type-check and all 561 automated tests passed locally.
- [ ] Fresh GitHub CI completion for this policy commit.
- [ ] Remove exception after compatible remediation; no automatic extension.

## 057–058 staging milestone — 5 October 2026 (supersedes pending gates below)

- [x] Apply approved directory and dojo-scoped tier/assessment migrations to staging only.
- [x] Exact 006–058 ledger; old directory unchanged; 13-table independent zero residue.
- [x] Persisted rollback-contained privacy, tier, assessment, undo and role acceptance.
- [x] Strict database verifier and all 12 protected-account security checks.
- [x] Staging database lint: no schema errors.
- [x] Type-check, 548 automated tests, lint, isolated production build, 232 browser tests.
- [x] Refresh release/recovery chain contracts without relabelling historical evidence.
- [x] Deploy 8143a20 to staging Preview; verify staging-only alias and backend.
- [x] All 11 host probes; 27 WebKit cases accepted (24 initial + 3 corrected-selector reruns).
- [ ] Resolve development-only braces advisory blocking GitHub CI; no audit bypass.
- [x] Check published fixes: latest Next ESLint still affected; newer fast-glob
  retains the vulnerable chain. Production-only audit remains clean. Temporary
  advisory-specific CI exception requires owner decision; no policy changed.
- [ ] Refresh restore evidence for the changed migration chain before production.

## Approved 057 staging gate — 5 October 2026

- [x] Read-only strict security verifier; exact 006–056 ledger, v2 absent.
- [x] Check real Admin 0002 scope: list access scoped, class-management helper
  permits three other dojos; promotion read/write definitions use class-only guard.
- [ ] Separate dojo-only promotion authorization correction and guarded tests;
  additional live migration approval required. No member mutation attempted.
- [ ] Apply approved 057 only after safety gates; UI deployment remains held.
  No migration or deployment executed in this preflight.

## Organisation-wide Member Directory — 5 October 2026, local only

- [x] Compact Photo / Name / enrolled Class–Dojo–Rank / Instagram rows.
- [x] One person per row, multiple enrolments together; preserve namesakes.
- [x] Class/Dojo filters and Class–Dojo, Dojo–Class, Name sorting.
- [x] Safe Instagram profile links and directory error/retry/empty states.
- [x] Type-check, 544 automated tests, lint, isolated production-mode build,
  228 local browser tests, diff-check and phone/desktop screenshot review.
- [x] Prepare additive privacy-limited v2 RPC in supabase/pending/057 only;
  leave the applied 006–056 chain and historic recovery evidence unchanged.
- [ ] Approve/promote/apply 057 to staging; execute rollback-contained privacy,
  role, catalog, exact-ledger, database-lint and independent zero-residue checks.
- [ ] Deploy UI only after database acceptance; guarded staging/browser review.
- [ ] Separately harden dojo-only Admin management (existing class-only scopes
  can be broader); this public directory adds no management permissions.

## Compact Member Lists — 5 October 2026, local only

- [x] Small photo / JS Member ID / name / rank / dojo / last training row,
  Promote button and current-status dropdown; responsive phone wrapping.
- [x] Click Member ID to open contact details, rank history, subscription history
  and official-record controls, preserving other management sections and drafts.
- [x] Add lazy, membership-scoped read-only subscription/payment history with
  pagination and retry; preserve existing mutation handlers and deceased guards.
- [x] Type-check, 539 automated tests, lint, production-mode build and 208 local
  browser tests passed. Desktop/mobile screenshots reviewed.
- [ ] Staging release approval, guarded live query/role checks and phone review.

## Promotion certificate layout — 5 October 2026, local only

- [x] Detail order: Member ID, Promotion Date, Certificate No.; remove extra
  printed detail rows and visible generator/timestamp footer.
- [x] Authorized Signatory: Jingwuguan Seibukan Head. Keep class heading, logos,
  QR and reprint notice; retain stored audit history and access boundaries.
- [x] Actual-template sample PDF rendered, text checked and visually reviewed.
- [x] Type-check, 539 tests, lint, production-mode build and 100 desktop/mobile
  WebKit cases passed. No live acceptance or deployment claimed.
- [ ] User design review and staging release approval.

## Member detail refinement — 5 October 2026, local only

- [x] Always-visible Date Joined / Rank Now / Last Training Session in one row.
- [x] Last Grading, Next Promotion, Promote Member and records hidden until their
  individual dropdown is opened, on mobile and desktop.
- [x] Other member controls grouped into compact two-column dropdowns; preserve
  permissions, server-derived recency and unsaved edits.
- [x] Type-check, 538 tests, lint, production-mode build and 200 local browser
  cases passed; mobile screenshot reviewed.
- [ ] Staging release approval, guarded live tests and fresh physical iPhone review.

## Latest milestone — compact all-role UI, local only, 5 October 2026

- [x] Shared smaller mobile/tablet spacing and typography for authenticated roles.
- [x] 46 expandable record/tool groups across 29 pages, concise summaries and
  compact navigation buttons; desktop and print remain expanded.
- [x] Keep draft inputs mounted, reveal invalid fields, preserve touch targets
  and keep bulk-assessment candidates expanded initially.
- [x] Add all-role dashboard/disclosure fixtures and update workflow tests to use
  the same dropdown controls a person taps.
- [x] Final type-check, 538 automated tests, lint, isolated production-mode build
  and 196 local browser cases passed; representative mobile screenshots reviewed.
- [ ] Commit/push/deploy the compact UI to staging after approval.
- [ ] Run guarded live staging acceptance against that exact release.
- [ ] Fresh physical iPhone compact-layout review; remaining device checks.

No migration, provider configuration, production contact or delivery. This local
UI work does not change the separate production-readiness blockers.

## Latest milestone — mobile Sign out restored on staging, 5 October 2026

- [x] Confirmed screenshot defect: desktop-only account menu left mobile without
  Sign out. Added a mobile footer button and shared safe local-session logout.
- [x] Release fix `fc5463a` pushed; exact Preview READY and staging alias verified.
- [x] Type-check, 538 tests, lint, production-mode isolated build, 84 local WebKit
  cases, 11 staging host probes and public staging-backend binding passed.
- [x] Final d9f253c Ready Preview/alias verified. Guarded live desktop/tablet/mobile
  role and sign-out acceptance: 27/27 passed, zero retries; 11 host probes passed.
  First run exposed desktop menu click obstruction; corrected before final pass.
- [x] User confirmed Menu > Sign out / signed-out /profile retest with "correct,
  next" on 5 October (reported iPhone 17 / iOS 26.6). Narrow user-reported result,
  not independently captured evidence or full physical Safari acceptance.
- [ ] Physical iPhone Admin/Super Admin read-only role and logout checks.
- [ ] Remaining physical Mac/iPad and wider production gates stay open.

No production contact, deliveries, scheduler activation or account changes.

Last updated: 04/10/2026

## Latest milestone — corrected staging scheduler deployed, still disabled

Cloudflare scheduler version `d1587e88-a448-4c82-8cac-b293797f0c23` deployed and
read-back verified on 4 October at 11:12 UTC. Fixed a workerd redirect-mode defect
found by real local runtime tests. 27/27 core/runtime/config checks pass; local
SQLite overlap and restart persistence verified using fake responses only.
ENABLED=false, no cron triggers/public URLs; both approved secrets retained.
Healthchecks last verified paused; no worker call, email, alert or production contact.
Supersedes older scaffold/not-deployed entries below. Workspace evidence is in
`staging-readiness/email-scheduler`; application release HEAD remains `7471c44`.

Still open: guarded live delivery/monitoring/scheduler evidence; recovery login
using backup-era credentials; physical Safari testing (deferred, not passed);
production target/secrets/bootstrap, final release/rollback review and authorized
cutover. No numerical completion claim is derived from the passing local tests.

## Latest preparation — scheduler implemented locally, still disabled

Cloudflare Workers Free + Healthchecks.io Free selected. Local scheduler scaffold
prepared under workspace `staging-readiness/email-scheduler`; 20 offline tests pass.
Persistent overlap/duplicate guard; uncertain/unhealthy responses stop future runs
pending reconciliation. No cron triggers, no enabled worker, no provider resources
or secret uploads, no emails/alerts or live acceptance. Wrangler/local platform
validation and separately approved provisioning/activation remain outstanding.
The existing operational readiness gates are unchanged; this is not live evidence.

## Latest audit — staging email database healthy; external operations unverified

Approved read-only staging audit complete. Version inventory 006–056; no database
scheduler (pg_cron/pg_net/http absent). Queue has one historical sent row and no
pending/due/overdue/stuck/exhausted messages; RLS and worker browser-role restrictions
verified. Local configuration shapes pass, but deployed/provider validity unknown.
25 focused local tests pass. External scheduler, live monitoring and delivery remain
unverified; identify the service/owner before separately approved configuration or
delivery tests. Evidence `staging-email-audit-1791106030328`; sanitized workspace
report `staging-readiness/STAGING_EMAIL_AUDIT_2026-10-04.md`. No workers, sends,
settings changes, disposable resume, production or provider contact occurred.

## Latest milestone — 537 local tests passed; Safari skipped for now

User requested skipping physical Safari for now. Marked deferred, not passed;
existing production gate remains enforced. Original-password recovery stays open.
Fresh `npm test` passed TypeScript and 537/537 local tests, zero failures/skips.
No live environment/provider contact, resume, password change, build/browser run,
commit, push or deployment. Remaining release work needs live operational/recovery
evidence and separately authorized production setup/cutover, not mock-test claims.

## Latest offline milestone — local release checks passed

At local HEAD `7471c44`, TypeScript, ESLint, 34 release-window/evidence-packet tests,
8 physical-Safari evidence-validator tests and whitespace checks passed. No full
build/application suite/browser/live CI rerun; no remote environment or credential
contact. Preserved all existing dirty files. Password recovery remains unresolved,
not waived or formally deferred; disposable was not resumed.
Prepared `staging-readiness/PHYSICAL_SAFARI_HANDOFF.md` in the working workspace.
Next hands-on gate needs staging access approval, exact deployment identification,
and physical Mac/iPhone/iPad access. Preparation/tests do not certify device runs.

## Latest result — corrected verifier reached password-validation blocker

Disposable-only corrected retry passed stability/full DB preflight and captured
103 tables, 21 catalog sections, 57 users/identities, zero sessions/refresh tokens.
The corrected identity SQL passed the prior role-column issue, then the supported-
bcrypt/password-match guard failed. Account-specific failure detail was not saved;
do not claim which account failed or that all three were checked. Backup-era vs
current saved credentials may differ, but that explanation remains unverified.
No live login tests ran, no passwords changed, Auth never enabled. Disabled Auth
and INACTIVE verified at 2026-10-04T02:06:19.107Z and pause independently reconfirmed.
Evidence: `auth-acceptance-1791079240657/result.json` in protected recovery storage.
Need backup-era credentials supplied securely or a decision to defer this gate.
Any disposable reset needs new approval and cannot prove original-password recovery.
No other project or delivery provider contacted; original evidence remains intact.

## Latest result — database preflight passed; Auth verifier corrected

Approved single retry on disposable `wtnonpldqvzipqmwgbru`: stability, pinned full
database verification, no-job checks and baseline capture passed (103 tables,
21 catalog sections, 57 users/identities, zero sessions/refresh tokens).
The account query failed before Auth enablement/login. A runner-only bug referenced
nonexistent profiles.role; corrected offline to use the existing Super Admin flag,
dojo assignments and admin memberships. Added schema validation before secret
loading and SQLSTATE-only diagnostics. Captured-schema validation and all 29 local
tests pass; corrected hosted query has NOT been run. Protected test values were
loaded in memory during the failed attempt, never logged or changed.
Target Auth disabled and INACTIVE confirmed at 2026-10-04T01:52:55.059Z; evidence
`auth-acceptance-1791078451683`. No account tests passed; no other project/provider
contacted. Next requires approval for one corrected disposable-only retry, followed
by Auth disablement and pause. Original backup and failed-attempt evidence retained.

## Latest result — credential ACL fixed; database connection interrupted

Exact staging env file is now owner-only, with unchanged contents independently
verified. Only disposable `wtnonpldqvzipqmwgbru` was resumed. Its isolation passed,
but SQL preflight was interrupted by an administrator-command connection termination
and SSL closure; underlying cause remains unverified, not a proven data mismatch.
No SECURITY_TEST values read by the runner, no Auth enablement or login tests.
Auth disabled and INACTIVE verified at 2026-10-04T01:40:01.658Z. Evidence:
`auth-acceptance-1791077907900/result.json` and
`staging-env-acl-restriction-1791077635775.json` in the protected recovery directory.
All source/failed-attempt evidence preserved; no passwords changed or other projects
contacted. Added locally tested three-probe stability gate; all 27 helper tests pass.
Hosted Auth acceptance remains OPEN. Future retry needs disposable-only resume,
stability/preflight checks, three-account tests, Auth disablement and pause again.

## Earlier result — Auth preflight blocked; disposable INACTIVE

The approved password/refresh/logout run stopped before its Node runner started:
the staging env file failed the owner-only ACL check (sandbox ownership and broad
Windows group access). No test passwords read, no Auth enablement or login attempt,
no password resets or data changes. Separate target-only quarantine confirmed Auth
disabled and disposable `wtnonpldqvzipqmwgbru` INACTIVE at 2026-10-04T00:47:33Z.
Protected evidence: `auth-acl-stop-quarantine-1791074853766.json` in the existing
recovery evidence directory. All 25 local helper tests pass; live Auth acceptance
remains OPEN. Database/Storage recovery success is not invalidated.
Next requires approval to fix only the exact staging env file's ownership/ACL
without changing values, resume only this disposable, test, disable Auth and pause
again. No other project or delivery provider contacted; do not bypass the guard.

## Latest preparation — hosted Auth recovery, 4 October 2026

Prepared the disposable-only password-login/refresh/local-logout test plan and
pure safety guards for restored test accounts 0101, 0002 and 0001. All 25 local
recovery helper tests passed, including four new Auth guard tests. No live runner
completed or live Auth acceptance executed; no remote project contact, credential
read or configuration change occurred during this preparation. Existing staging
magic-link runner remains unchanged and must not be used for this target.
Live tests require explicit approval for temporary disposable password-provider
enablement and protected test-credential reads. Keep signup/hooks/delivery off,
restore disabled Auth, report expected Auth-only deltas, and pause the disposable
afterward. No account reset or direct SQL cleanup. Plan is in workspace
`staging-readiness/AUTH_RECOVERY_ACCEPTANCE_PLAN.md`. Database/Storage recovery
success below remains valid; hosted Auth recovery is still OPEN.

## Latest milestone — hosted Storage recovery PASSED, 4 October 2026

Approved continuation succeeded on disposable `wtnonpldqvzipqmwgbru` only:
two buckets and all six logos (3,412,943 bytes) restored without overwrites.
Private and public download hashes match; anonymous private reads and insert
were denied; listings empty/denied; bucket privacy, metadata, ownership and RLS
checks passed. Video bucket remains empty/private with the approved disposable-
only 50 MiB limit instead of the source 2 GiB. Backup and source plan unchanged.
Independent database postflight and final platform isolation passed. Target is
active/healthy with Auth providers disabled and no delivery workers. Evidence:
`storage-restore-1791070301947`; original failure journal retained, separate
continuation journal created. All 21 local helper tests pass. No other project or
delivery provider contacted. Hosted Auth login/refresh/logout acceptance remains
OPEN and needs a separately scoped outbound-safe test plan. Historical failure
notes below do not describe the current successful Storage result.

## Earlier Storage preparation and stopped attempt — 4 October 2026

Live Storage attempt subsequently STOPPED and disposable target is confirmed
INACTIVE. Database/data/catalog/security preflight passed. Private class-logos
bucket creation was acknowledged; video bucket creation failed before any uploads.
Source video-bucket limit (2 GiB) exceeds verified target global limit (50 MiB).
Exact failed HTTP body was not retained; partial state needs read-only reconciliation
after an approved resume. No files uploaded/overwritten; no automatic retry.
Protected evidence: `storage-restore-1791069349580`. Local size-limit preflight and
protected HTTP diagnostics added; five Storage tests pass. A documented disposable-
only limit adjustment or deferral needs approval; full hosted Storage/Auth recovery
remains OPEN. Production, staging, retired database and providers were untouched.

All six backed-up files (3,412,943 bytes) passed authenticated extraction and
individual SHA-256 verification. Exact dump/manifest metadata mappings match.
The public class-logos bucket contains the six files; the private video-originals
bucket is empty. No source Storage policies or ownership values were present.
Four Storage helper tests pass. Protected plan: `storage-preparation-1791068719153`.
No upload, remote configuration change or database mutation occurred this step.
Next is scoped disposable-target Storage upload/download acceptance; hosted Auth
acceptance remains separate because providers are deliberately disabled.

## Latest milestone — managed recovery preflight, 3 October 2026

Corrected persistent database restore PASSED on disposable
`wtnonpldqvzipqmwgbru` only. Exactly one approved attempt committed successfully;
fresh-connection verification passed for 383 rows/70 tables, 15 application
catalog comparisons, exact 006–056 ledger, six sequence values, Auth triggers,
privileges and database-security assertions. All 18 managed catalog datasets,
Auth constraints/indexes and unrelated role settings remain preserved. Final
platform isolation passed (Auth providers/hooks disabled, zero Edge Functions
and secrets); target remains active and isolated. Evidence:
`persistent-restore-1791024441642`. Original encrypted backup and failed-attempt
evidence were preserved; a separate exclusive attempt-02 journal prevents replay.
All 14 local helper tests pass. No staging/retired/production database or delivery
provider was contacted. Storage bytes and hosted Auth/Storage API acceptance
remain OPEN. Earlier pending-import and failure notes below are historical.

Approved resume/read-only reconciliation PASSED. Only disposable
`wtnonpldqvzipqmwgbru` was resumed and is now ACTIVE_HEALTHY with isolation
verified before/after. All 18 catalog datasets and saved Auth/session/Storage,
ledger-schema, trigger and role-setting baselines match exactly; fingerprint
`566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
Auth constraints/indexes also match. Independent zero residue is now verified.
Protected evidence: `read-only-reconciliation-1791021907586`. The import was NOT
retried, its journal remains unchanged, and production/staging/retired databases
were not contacted. Earlier quarantine/failure notes below are historical;
persistent restore and hosted recovery acceptance remain open and require a new
import decision. Local empty-array inventory-count handling was corrected without
changing any remote isolation settings.

Latest outcome: persistent restore attempt STOPPED before commit acknowledgement
with a locally generated SQL syntax error. Independent verification failed too;
neither persistent success nor a fresh full zero-residue check is claimed.
Disposable `wtnonpldqvzipqmwgbru` was quarantined and independently confirmed
INACTIVE through management inventory. The String.replace dollar-token defect
is fixed locally; all 12 helper tests and runner syntax checking pass. The
protected attempt journal, diagnostics and source backup are preserved. No
automatic retry, staging/retired database contact, provider operation or
production change occurred. Next: approve resuming only the disposable project
for read-only baseline reconciliation before any new import decision. See the
latest PROJECT_CHECKPOINT.md section. Earlier rehearsal milestones below remain
historical; they do not establish persistent restore success.

Expanded rollback rehearsal PASSED: all 383 copied rows across exactly 70 tables
match semantically, including duplicate-row checks. The 15 catalog comparisons,
exact ledger, six sequence counters and database-security assertions pass; the
independent before/after baseline again proves zero residue. Eight local helper
tests pass. Evidence is in protected `rollback-rehearsal-1791018511840`. Nothing
is committed to the disposable database. Next is a separately guarded persistent
restore with post-commit reconciliation, then Storage bytes and hosted Auth/Storage
API acceptance. Staging, production and the retired database remain untouched.

Rollback-only managed restore now PASSES on disposable `wtnonpldqvzipqmwgbru`:
15 application catalog comparisons, exact 006–056 ledger, six sequence values,
57 Auth users/identities, custom Auth triggers, defaults and database-security
assertions. Independent before/after catalog/Auth/Storage/role baselines match
exactly, proving zero residue. No restore is committed. Sequence-owner grants and
the source JSON's bigint rounding limitation were explicitly reconciled against
captured evidence; see PROJECT_CHECKPOINT.md. Full data equality is now verified
by the expanded run above; persistent restore and managed Auth/Storage API
acceptance are still outstanding.

Follow-up verified exact Auth column/type/generated-flag compatibility (35 user
columns and nine identity columns), generated 1,240 protected schema-only review
entries and connected to the API-verified disposable endpoint in read-only mode
with client TLS/hostname verification. The pooler's upstream SSL observation is
recorded separately as false; no end-to-end TLS claim is made. Target remains empty.
Required extension functions and insertion/schema privileges are present. Six Auth
constraints and 19 indexes await comparison. Migration 047's authenticator account-
access setting requires explicit restoration outside the public schema. No import
or Auth/Storage recovery acceptance has run; source-origin avatar URLs also require
target-only test guards. Four classifier tests pass. See PROJECT_CHECKPOINT.md.

- [x] Verify disposable Singapore target is empty, PostgreSQL 17.11 and healthy.
- [x] Disable/read back signup and email/phone/anonymous Auth providers; verify
  no enabled other providers/hooks, Edge Functions/secrets or existing delivery jobs.
  No custom SMTP sink exists; invite/reset/admin-email operations remain prohibited.
- [x] Authenticate/decrypt the protected staging backup and inspect safe selected
  archive entries, custom dump TOC and schema-only SQL without importing data.
- [x] Classify all 1,866 TOC entries; four parser tests pass, including DEFAULT
  regression. Identify three application Auth triggers and exact ledger objects.
- [x] Capture target managed-column/trigger and extension compatibility metadata;
  Supabase Vault 0.3.1 is available. Parallel review produced a guarded checklist.
- [ ] Review selected SQL/dependencies, managed-column compatibility and exact
  owner/ACL mapping; generate a reviewed staged restore allowlist.
- [ ] Execute disposable-target import and Storage-byte recovery, then ledger,
  catalog, Auth/Storage API, database-lint, role/security and isolation acceptance.
- [ ] Quarantine the target after acceptance and remove only tracked scratch
  plaintext while retaining encrypted source evidence.

No restore, recovery acceptance, production deployment or cutover is claimed.
Protected inspection scratch is retained with restricted ACLs. Staging and the
paused old project were not changed. See PROJECT_CHECKPOINT.md for exact evidence.

## Current scope update — 2 October 2026

The user approved a web-first V1 launch. The Windows uploader is deferred and
withheld from production distribution; its signing and interactive acceptance gate
remains unchanged for a later separately approved release. Web-only release records
now explicitly select that scope and require eleven protected evidence files instead
of twelve. All web security, recovery, Mux/provider delivery, email, scheduling,
monitoring, physical Safari, identity and cutover requirements remain in force.

The scope-change base commit is `34e43c4`; previously verified staging application
commit is `ed15327` (11 host probes and 27 guarded WebKit cases, recorded in
PROJECT_CHECKPOINT.md). The older status and milestones below are historical, not a
fresh remote verification. The scope update is local and does not authorize a push,
deployment, live migration or production contact.

Scope-change verification passes TypeScript, 537/537 application/tooling tests,
34/34 focused release-window/packet tests, ESLint, whitespace validation and both
updated JSON templates. No web gate has been marked complete solely by this change.

Remote follow-up: scope commit `7471c44` is pushed. GitHub Actions run
`37002672716` completed successfully on its exact SHA with all five jobs passing
(common, Chromium/Linux, Firefox/Linux, WebKit/Linux, WebKit/macOS). No alias
assignment or production action occurred; Preview readiness was not verified.
This result does not close the physical Safari or operational release gates.

Approved recovery-source refresh completed on 2 October: the protected encrypted
package now captures the exact 006–056 ledger, database/Auth/Storage metadata,
roles, 4,151 catalog objects and six Storage objects. Authenticated decryption and
byte-for-byte archive verification passed; temporary plaintext was removed and the
September archives remain unchanged. See PROJECT_CHECKPOINT.md for hashes and the
protected folder. This supersedes the old 006–055 source-backup limitation, not the
still-open managed Supabase restore or hosted configuration/provider recovery gates.

Recovery capacity blocker cleared with explicit user approval: old `js-repository`
(`pkmllhaavadhaozmwapz`) is now paused (`INACTIVE`), not deleted. New disposable
Singapore target `js-recovery-rehearsal-20261002` (`wtnonpldqvzipqmwgbru`) is
`ACTIVE_HEALTHY`; staging remains healthy and the organization remains Free.
This is not production and has not received a restore. Verify outbound isolation
and the empty-target baseline before the managed recovery rehearsal. Older capacity
blockers below are historical; no production/domain cutover has been authorized.

## Release status

Branch `release/v1-readiness-20260918` is synchronized with its remote. The deployed
application tree is `8caa3e9`; branch head `789bef6` adds guarded release evidence.
GitHub Actions run `36773969039` passes all five jobs at exact head `789bef6`: common checks, Chromium/Linux,
Firefox/Linux, WebKit/Linux and WebKit/macOS.

Sydney staging `eomubndonbetszdbhsrj` is verified at exact migration history 006–056.
The read-only strict database-security verifier passes. Ready Preview
`dpl_AZK7CPjTCcbeQCytugpwyEtbgFBv` serves only
`jingwuguanseibukan-staging.vercel.app`; 11/11 route/method/security-header probes and
18/18 guarded WebKit desktop/tablet/mobile checks pass. All ten normalized static logo
assets are exact 1024 × 1024 PNG matches, and all five active class-logo objects are
verified on staging. Production was not contacted or modified.

The exact three dedicated staging security-test accounts were audited and received
password-only rotations. Public email login remains disabled; the guarded runner
therefore used non-delivered one-time sessions and passed all 12 Member/scoped
Admin/Super Admin authorization checks with session cleanup confirmed. The runner
now retries only Supabase's exact transient `JWT issued at future` response without
weakening any authorization assertion. No profiles, memberships or live member
records changed.

Migrations 035 and 036 are applied and verified on staging only. Migration 035
removes duplicate automated Break history writes; its post-apply Member-lifecycle
suite passes 35/35. Migration 036 restores the missing Auth signup/email-confirmation
triggers; its post-apply registration, reapplication, password-reset and notification
suite passes 23/23. Both suites rolled back their fixtures with zero residue.

Migration 037's 30-check rollback-only staging rehearsal and post-apply verification
pass. It repairs a
current-schema mismatch where several older authorization/notification routines
recognized only `active` and legacy `break`, not `break_1`/`break_2`. It also closes
the authenticated direct INSERT path on `dojo_transfer_requests`, while preserving
RLS-scoped SELECT and the validated `request_dojo_transfer` RPC, and aligns transfer
notifications with active `dojo_admin_assignments`. The same repair prevents the
admin Break RPC from restarting a retained
legacy `break` membership at `break_1`.

Migration 038 is applied and verified. It normalizes
legacy `break` and current `break_1`/`break_2` to `Break` in both report RPCs while
preserving their owner, SECURITY DEFINER attributes, fixed search path, volatility
and ACLs. Its post-migration package passes 21/21 semantic assertions with
independent zero-residue verification.

Migration 033 is applied and verified on staging only. It aligns email queue health
with the two-minute operational threshold while respecting future retry backoff,
keeps the health RPC service-role-only, and changed no email-outbox rows. Its pinned SHA-256 is
`EBECFED6BFBDA61B573512229313EA72DEC5DC30F73972654346C363387B725F`.

Migration 034 is applied and verified on staging only. It repairs repository access
for supported break states and repository managers, and restores the hardened
event/announcement in-app notification triggers missing from the restored schema.
Its pinned SHA-256 is
`42F74C01B81FFFF15B33278BA950F02DD97002A2B6224A20D7ECB8CFE7671145`.

Authenticated Chromium desktop route/navigation testing passed against the prior
deployment for the dedicated staging Member, scoped Admin and Super Admin accounts,
including UI sign-out. This closes the historical role-shell browser sub-gate, but
does not verify the current branch Preview through the still-unmoved fixed alias.

The earlier isolated local browser baseline passed 69/69 in Chromium and 69/69 in
WebKit across desktop, tablet and mobile profiles before the deferred Mux work. The
combined 138/138 run completed with a clean report and exit when allowed to manage its own
local browser/server child processes. The suite covers public authentication
and recovery states, responsive and accessible role navigation, and the rejected
enrolment reapply/pending/cancel lifecycle without provider or database access.
WebKit is the Safari-engine compatibility gate, but final validation on real macOS
Safari and iOS hardware remains an external release check. The pinned Playwright
Firefox executable still cannot start on this Windows host (`spawn UNKNOWN` before
application execution), so Firefox remains a host/CI gate rather than an observed
application failure.

Desktop Chromium and WebKit export acceptance passes 23/23 in each engine. The
certificate and report workbooks were downloaded, reopened and validated against
their exact expected rows; Archive correctly remains view-only. Non-production PDF
stress fixtures also pass full-resolution visual inspection for the one-page grade
certificate, one-page title certificate and three-page member record after correcting
certificate overflow, long-value wrapping and title detail-column spacing.
Real browser PDF acceptance additionally downloads all three PDF types in Chromium
and WebKit and verifies visible, non-overflowing controls at desktop, tablet and
mobile sizes. The React-PDF WebAssembly CSP requirement is now permitted narrowly
without enabling general production `unsafe-eval`.

The application is **not approved for production deployment yet**. The protected
staging database/Auth/Storage metadata package and object bytes were captured, and a
loopback-only PostgreSQL 17 restore proves the exact 006–055 ledger, critical counts,
roles/grants, RLS and all catalog objects except Supabase's managed Vault extension.
End-to-end managed Supabase Auth API, Storage API/object, managed-extension and hosted
configuration recovery proof remains blocked until a disposable project slot exists.

Remaining external gates are: create and independently verify the new Singapore
production project; prove the managed-platform restore/cutover; configure and monitor
the external email-worker scheduler; verify real Resend sender-domain and transactional
delivery; complete dedicated-inbox registration/password-reset acceptance; verify real
targeted push plus physical Safari/iOS behavior; remove deliberately weak test accounts
before production; provision production-only secrets/redirects/DNS; and approve a
specific release window, rollback owner and recovery point. The managed default-ACL
finding is resolved by the current strict verifier and current-object ownership proof.
Mux is active and guarded on staging: one disposable upload, signed playback and exact
Draft/asset cleanup passed with zero application/provider asset residue. Production
Mux credentials and activation remain a production release gate.
Production's project and migration ledger remain unverified because no production
project has been created or contacted.

The exact migration ledger is not a complete schema baseline: the live
`email_outbox` table and its core queue/claim/acknowledgement RPCs are referenced and
validated by later migrations but are not created by migrations 006–056. The protected
backup and disposable restore must capture and exercise those objects explicitly.

The approved production-region plan is a separate Supabase primary in Singapore
(`ap-southeast-1`) for the Jakarta/Indonesia user base. Sydney
`eomubndonbetszdbhsrj` remains staging only. The exact Singapore project reference is
not created or selected yet, and this planning decision does not authorize a live
migration or production cutover.

Source repository: C:\Projects\martial-repository

Latest prepared work: C:\Projects\martial-repository

Prior audit copy (historical): C:\Users\hioec\Documents\Codex\2026-08-30\files-pasted-by-the-user-you\work\martial-repository-audit

## Confirmed audit baseline

- [x] Inventory application routes, components, API routes, scripts, and SQL.
- [x] Compare checked-in SQL with the linked Supabase Data API.
- [x] Exercise live read boundaries as a dummy Member, scoped Admin, and Super Admin.
- [x] Preserve the pre-existing dirty source tree; no user changes were discarded.
- [x] Reconcile the source and prepared trees after resuming work.
- [x] Export and review the live public/storage catalog with read-only SQL.
- [x] Verify remote migrations 006–010 match local statements exactly.
- [x] Run normalized Member ID/email duplicate preflight (zero collisions at audit time).
- [x] Review all live SECURITY DEFINER search paths, ACLs, and caller markers.
- [x] Run the linked database linter and prepare exact-definition repairs.

Reconciliation result at the 31/08 checkpoint:

- Source differs from the prior audit copy only in generated `next-env.d.ts`;
  the latest working copy already preserves the source version.
- Captured a fresh SHA-256 source baseline before edits. Existing dirty and
  untracked source work is retained; integration must fail on hash conflicts.
- Excludes dependencies, generated build files, environment secrets, and CLI
  `.temp` metadata from the merge inventory.

Original baseline:

- Lint: 22 errors and 30 warnings.
- TypeScript failed because lib/exportExcel.ts contained a duplicated React
  page rather than the Excel helper.
- The original directory could not write .next/trace or package-lock.json.
- Checked SQL defines 9 tables and 35 functions; the live Data API exposes 50
  tables/views and 147 RPCs.
- An ordinary Member can read 56 foreign rows through admin_visible_members.
- An ordinary Member can read other Members' archive metadata through
  document_archive.
- Subscription RPCs used by the UI are not present in the live database.
- Event email sending referenced an Edge Function absent from the repository.

Historical verification from the prior audit (current results below):

- [x] Dependency installation completed in the isolated build workspace.
- [x] Dependency audit reported 0 known vulnerabilities.
- [x] TypeScript passes.
- [x] The configured test command passes.
- [x] Lint exits cleanly with 0 errors and 0 warnings.
- [x] A production build passed before the latest route/security refinements.
- [x] Repeat the production build after all final changes (40 routes generated successfully).
- [x] Verify public login/registration rendering, unauthenticated route guards,
  security headers, and responsive registration layout at 390, 768, and 1440px.
- [ ] Complete the remaining guarded authenticated provider/mutation workflows with
  disposable dedicated records after the current Preview is reachable through the
  fixed staging alias.

## Prepared P0 fixes

- [x] Restore the Excel export helper.
- [x] Repair the settlements Supabase client import and unsafe types.
- [x] Collect and normalize Member ID, email, name, phone, DOB, class, and dojo.
- [x] Support Supabase PKCE confirmation codes and token-hash confirmations.
- [x] Hold verified Members outside protected pages until a class is approved.
- [x] Add a pending-approval and reapplication surface.
- [x] Replace the missing event-email Edge Function call with the durable outbox.
- [x] Implement the push-subscription route and connect the client UI to it.
- [x] Revalidate password-reset application against the Admin's current scope.
- [x] Add CSP and standard browser security headers.
- [x] Align local email verification and password policy with production intent.
- [x] Correct broken and role-inappropriate navigation entries.
- [x] Add a repeatable Member/Admin/Super-Admin authorization smoke test.
- [x] Prepare migration 011 to harden owner-executed views and function grants.
- [x] Prepare migration 012 for normalized unique identity fields and permanent
  Member-ID protection.
- [x] Prepare migration 013 to make receiving-account and payment-confirmation
  tables RPC-only for browser roles.
- [x] Prepare migration 014 for SECURITY DEFINER caller/ACL/default hardening.
- [x] Prepare migration 015 for the live database-lint runtime errors.
- [x] Prepare migration 016 restoring missing subscription-notification RPCs.
- [x] Prepare migration 034 restoring repository break-state/manager visibility
  and the missing event/announcement notification triggers.
- [x] Prepare and rollback-rehearse migration 035 so automated Break processors
  rely on the status trigger for exactly one audit row.
- [x] Prepare and rollback-rehearse migration 036 restoring exactly one Auth signup
  profile trigger and one email-confirmation class-request trigger.
- [x] Make the security smoke runner aggregate and report every check.
- [x] Correct combined class+dojo scope evaluation and add automated SQL/security tests.

## Live release blockers

- [x] Obtain authorised read-only Supabase CLI/catalog access.
- [x] Create and verify separate Free Sydney staging; data-copy consent/access remain pending.
- [ ] Create and independently verify the eventual production Supabase primary in
  Singapore (`ap-southeast-1`), then migrate through the reviewed recovery/cutover plan.
- [x] Obtain portable PostgreSQL 17.11 client tools (no service/PATH changes).
- [ ] Complete protected managed-platform recovery proof.
  - [x] Capture the protected staging database/Auth/Storage metadata, object bytes and
    roles, then restore the database package into isolated PostgreSQL 17 with exact
    critical counts, role/RLS/security checks and migration history 006–055.
  - [ ] Prove the separate managed Auth, Storage metadata/object bytes, roles,
    secrets, schedules and provider-configuration recovery procedure.
- [x] Pull and review a complete schema baseline, including all tables, views,
  policies, grants, triggers, types, indexes, storage policies, and functions.
- [x] Reconcile root-level finance/settlement SQL with the ordered Supabase
  migration chain.
- [x] Deploy the reconciled migration chain, including 011–016, to staging in
  verified migration-history order and inspect every statement.
- [x] Run the security smoke test against staging and require a clean pass.
- [x] Confirm admin_visible_members is Member-isolated and Admin-scoped.
- [x] Confirm archive views are not directly readable by browser roles.
- [x] Confirm receiving-account and payment-confirmation tables are not directly
  readable or writable by browser roles.
- [x] Reconcile the two subscription RPCs absent from the current live API.
- [ ] Configure and monitor the Resend email-worker scheduler.
- [ ] Verify live email redirect allowlists and transactional templates.
- [x] Approve/apply migration 033 to staging only and run guarded email delay,
  retry-backoff, exhaustion, ACL, rollback and role-security acceptance.
- [x] Approve/apply migration 034 to staging only, then rerun repository/event
  authorization, notification-idempotency and role-security acceptance.
- [x] Approve/apply migrations 035 and 036 to staging only, then rerun Member
  lifecycle, registration, role-security and database-lint acceptance.
- [x] Explicitly approve and run the rollback-only migration 037 staging rehearsal,
  then review its transfer/class-request notification, zero-residue and role-security
  results before considering a separate apply approval.
- [ ] Remove the deliberately weak legacy dummy accounts before production.
- [x] Resolve the platform-owned `supabase_admin` default-privilege finding through
  current-object ownership proof and the strict managed-platform verifier boundary.
- [x] Require clean database lint through an explicitly verified staging connection
  (`supabase db lint --db-url $env:STAGING_DB_URL --level warning`), never the production link.

## Functional verification

- [x] Registration: verification, approval/rejection, reapplication, and email.
- [x] Members: permanent ID, multi-class membership, status, break state, and
  applicable Aikikai number.
- [x] Grading: deterministic progression, assessor capture, guarded confirmation,
  undo, and retained history for the existing individual workflow.
- [x] Apply and validate migration 041 on staging, including atomic bulk assessment,
  stale-target/concurrency/idempotency boundaries, pass-only promotion, unchanged
  failed candidates, one results announcement, and certificate-eligible bulk PDF.
- [x] Assessors: add, deactivate, reactivate, and external snapshots.
- [x] Titles: award, revoke, certificate, and retained audit history.
- [x] Certificates/archive/reports database workflow: scope, search, print/report
  audit logs, and revocation retention.
- [x] Visually verify grade/title/member-record PDFs with non-production stress
  fixtures and full-resolution page renders.
- [x] Verify certificate/report Excel downloads and Archive view behavior in
  desktop Chromium and WebKit.
- [x] Verify real browser PDF download/print behavior and mobile/tablet print layouts.
- [x] Dojo transfers: request, review, scheduled application, history, and audit.
- [x] Repository/events: class/rank/tier access and idempotent notification
  attempts.
- [x] Payments: Member confirmation, Admin review, and settlement separation.
- [x] Settlements: deterministic calculations, scoped drafts, final review, and
  immutable audit.
- [x] Exports: current filtered data only, clear filenames, and DD/MM/YYYY
  display values.
- [x] Correct membership-status normalization in `get_member_report_history` and
  `get_official_member_record`; migration 038 is applied and its post-migration
  report-status acceptance passes 21/21 with zero residue.

## Production hardening

- [x] Resolve material React hook dependency warnings and document intentional legacy loader dependencies.
- [x] Review remaining raw privileged table writes and move them behind
  authorised RPCs/routes where necessary.
- [x] Inventory all live SECURITY DEFINER paths, ACLs, and caller markers;
  perform targeted review and prepare hardening in 014.
- [x] Complete semantic authorization validation of every SECURITY DEFINER and
  its dependent workflows on staging. Current passing direct/reference evidence
  maps all 108/108 browser-executable routines; Milestone 105 records the final
  reader tranche, independent residue check and post-suite role-security result.
- [x] Add durable rate limiting to application account and worker endpoints.
- [x] Add isolated browser smoke automation and a prepared CI workflow.
- [x] Execute the approved remote CI workflow; GitHub Actions run `35395933998`
  passed checks plus Chromium, Firefox and WebKit jobs on Linux/macOS.
- [ ] Run authenticated browser acceptance for the new deceased/memorial and bulk
  assessment workflows, plus physical Safari/iOS validation.
- [x] Verify accessible error, empty, loading, keyboard, and focus states.
- [x] Verify mobile, tablet, and desktop layouts.
- [ ] Verify organization YouTube channel custody, Unlisted visibility, embedding,
  both logo overlays and real Safari playback with dedicated non-sensitive media.
- [x] Document migration rollback, staging promotion, monitoring, and incident
  response. Restore and rollback rehearsal remain required.
- [x] Apply migration 040 to staging and validate persisted memorial settings,
  recipient classes, initial/annual announcements, ACL/RLS, active-account request
  gating, rollback residue and direct database role boundaries.
- [ ] Exercise deceased Auth ban/unban and reversal through the protected server API
  with dedicated staging identities; do not use live member records.
- [ ] Configure and observe the memorial annual processor through the protected
  worker scheduler without mutating production.

## Milestone log

### Milestone 1 — audit

Completed the application, live API, authorization, dependency, and build audit.

### Milestone 2 — prepared P0 repair

Restored compilation/build, repaired key runtime paths, added approval gating,
prepared security migrations, added security headers, and documented deployment.
No live migration was applied.

### Milestone 3 — resumed reconciliation

Recompared source and prepared trees. No newer source work needs merging into
the prepared copy. TypeScript/tests pass; lint has 0 errors and 0 warnings.

### Milestone 4 — static quality gate

Completed the remaining lint review. Hook refresh dependencies were corrected or
explicitly documented where legacy loader declarations are intentionally driven
by state inputs, non-DOM/PDF image warnings were scoped appropriately, and the
final lint and non-incremental TypeScript checks both pass cleanly.

### Milestone 5 — final production build

The clean isolated workspace completed the Next.js 16.3.1 production build,
including TypeScript, page-data collection, and generation of all 40 routes.

### Milestone 6 — public browser and responsive checks

The production server rendered login and registration without console errors.
Registration contains all required identity/class/password fields, protected
Member and Admin routes redirect unauthenticated users to login, and the public
registration layout has no horizontal overflow at mobile, tablet, or desktop
widths. Authenticated browser testing remains blocked pending action-time
approval to transmit the dedicated test credentials through the browser.

### Milestone 7 — live authorization and database audit

The aggregate read-only role suite confirms four live failures: Member and
scoped-Admin cross-scope access through `admin_visible_members`, direct Member
access to `document_archive`, and direct Member access to
`dojo_receiving_accounts`. Migrations 011 and 013 are prepared for these issues;
migration 012 now has collision preflight checks. No migration was applied live.

### Milestone 8 — guarded source merge and final local verification

Created a secret-free binary patch, revalidated every source target against the
captured baseline, and merged 44 intended changed/new files into the source
repository with no hash conflicts. All 44 merged files were then verified
byte-for-byte. In the merged source itself, lint, the configured TypeScript test,
and the Next.js production build all pass; the build generated all 40 routes.
Pre-existing unrelated dirty/untracked source work remains present and was not
deleted or reset.

### Milestone 9 — complete read-only live catalog reconciliation

Used authorized read-only catalog queries to inventory the public/storage
schema, ACLs, RLS, policies, functions, triggers, constraints, indexes, and
migration ledger. Versions 006–010 match local files statement-for-statement;
root 004/005 are unrecorded legacy SQL and cannot be replayed. The identity
duplicate preflight returned zero rows. Only one Supabase project exists, so
staging migration work remains blocked.

### Milestone 10 — database ACL and runtime repair preparation

Reviewed all 149 live SECURITY DEFINER functions: search paths are fixed, but
browser/default grants are materially overbroad and internal processors are
exposed. Prepared migration 014 and expanded the role smoke suite. Database lint
identified nine runtime-error functions and two warning-only functions;
migration 015 was generated from the exact live definitions. Nine local
security/migration tests pass. No migration was applied.

### Milestone 11 — resumed local hardening (31/08/2026)

Corrected migration 014's GLOBAL PUBLIC EXECUTE default revoke and explicit
temporary-schema ordering. Updated 015 to retain the hardened path. Strengthened
SQL attribute tests, added security-runner environment/host guards, strict denial
classification, pagination, and test-session-only sign-out. The default live
read-only mode never invokes the privileged mutation probe.

Restored three missing 006 notification definitions in new migration 016 without
changing the verified 006–010 files. Added scoped concurrent-retry locking and
null-input validation; staging must prove idempotency and financial correctness.
Prepared read-only database assertions; these have NOT been executed.

Local dependency install passed (443 packages, zero reported vulnerabilities).
Lint, TypeScript, 23 Node regression tests, and the production build passed; the
build generated 40 pages using loopback backend placeholders. Initial sandbox
installation/font-fetch restrictions were resolved with approved retries.
`test:security` exited before network access because explicit staging target and
credentials are absent; this is a blocked gate, not a passing live security run.

### Milestone 12 — public-form accessibility and browser checks (31/08/2026)

The browser found eight unlabelled registration controls plus unassociated login
labels. Added unique IDs/labels, autocomplete hints, password guidance, and live
result regions. After rebuilding, all rendered login/registration controls have
accessible labels. Registration has no horizontal overflow at 390/768/1440px.
Unauthenticated Admin and Member pages redirect to login. No credentials or forms
were submitted. The conditional dojo selector is statically tested but not
rendered without a staging backend. Keyboard traversal was inconclusive through
the browser control surface and remains open, as do authenticated workflows.

### Current external blockers (31/08/2026)

The refreshed project list contains only live `js-repository`; its branch list is
empty. No staging credentials or backup database connection are configured.
Portable PostgreSQL 17.11 clients are now available in the workspace tools
directory; Docker remains unavailable. This removes the native-client tooling
blocker, not the protected backup/restore or staging blockers.
Staging provisioning, a complete verified backup/restore, platform-owner default
grant remediation, authenticated role/workflow tests, durable rate limits, worker
and messaging configuration, and verified deployment/rollback access remain.
No migration, production mutation, or deployment was performed.

### Milestone 13 — guarded integration and integrated-source gate (31/08/2026)

Saved a 103-file environment-excluded source snapshot and a 24-file binary patch,
then merged all 24 intended files with before/after SHA-256 checks. The patch's
reverse-apply CHECK passed (no reversal was performed). No unrelated source file
drift was found, and no source git staging/commit/reset was performed.

In C:\Projects\martial-repository itself: npm ci, lint, npm test (23 passing
regressions plus TypeScript), standalone typecheck, and production build all
exit 0. The build generated 40 pages with loopback backend placeholders. It is a
validation build, not a production-configured deployment artifact.

The guarded test:security command exits 1 BEFORE Auth/network requests because
SECURITY_TEST_MEMBER_EMAIL is missing. Staging/live role checks therefore remain
NOT RUN this continuation, rather than passed. Exact logs and exit codes are in
the workspace's release-evidence-20260831 directory. Migrations actually applied:
NONE. Production-readiness decision: BLOCKED pending the prerequisites above.

### Milestone 14 — resumed API hardening and PostgreSQL fixture (31/08/2026)

Rechecked all 24 milestone-13 final hashes in both source and working copy: all
match. Captured 119 source-file hashes for this continuation, excluding secrets,
dependencies, generated build output and CLI metadata. The previous merge and
evidence were not replayed or overwritten.

Added 12 dependency-isolated tests of the actual API handlers. Eight failed
before changes; all 12 pass after correcting email-worker false-success
responses, malformed/non-object JSON handling for password and push routes,
and raw unexpected password exception disclosure. Existing provider idempotency
keys, queue batch limits, authentication and own-user RPC scope are retained.
The first full gate caught a test-helper lint naming violation; it was corrected
without disabling the rule. Full-gate results are recorded separately below.

Downloaded portable PostgreSQL 17.11 from the official EDB binary link and
verified all four client version commands. No PATH/service/system installation
was performed. Executed the exact pending 014 file in a disposable loopback-only
synthetic PostgreSQL fixture. Assertions passed for definer grants, global and
schema defaults, caller binding, scoped access and temporary-table shadowing.
The fixture also reproduces the remaining platform-owner PUBLIC default. It
contains no real Supabase schema or Member data and is NOT a staging clone,
restorable live backup, complete 011–016 validation, or authenticated role suite.
The first Windows launch attempt was stopped and the helper corrected; the
successful retry stopped its server cleanly. Both attempt logs are retained.

Migrations applied to Supabase staging or production: NONE. Migration 014 was
executed only in the synthetic fixture. No production mutation or deployment.
Evidence: workspace release-evidence-20260831-resume; prior milestones remain
in release-evidence-20260831. Staging provisioning choice has been requested.

Working-copy final rerun: npm ci, lint, npm test (35 regression tests plus
TypeScript), standalone typecheck and the production build exit 0. The build
generated 40 pages using loopback placeholders; it is not deployable with real
production configuration. test:security exits 1 on missing
SECURITY_TEST_MEMBER_EMAIL before Auth/network access. Logs are retained in
release-evidence-20260831-resume/working-gates-retry. Integration and its fresh
source gate are tracked separately in that evidence directory's CHECKPOINT.md.

### Milestone 15 — resumed integration and final source gate (31/08/2026)

Backed up 119 environment-excluded source files and a fresh 10-file patch.
Integrated only the reviewed API/test/document changes with per-target SHA-256
guards. All ten source copies matched their prepared hashes; the reverse-apply
CHECK passed without reversing anything. Unrelated source hashes were preserved.

In C:\Projects\martial-repository: npm ci, lint, npm test (35 passing regression
tests plus TypeScript), standalone typecheck and build all exit 0. The build
generated 40 pages with loopback placeholders, not deployable production
configuration. test:security exits 1 before Auth/network access because dedicated
staging credentials are missing. npm reports zero known vulnerabilities; its
unrs-resolver postinstall-approval warning was not bypassed.

Exact results are in release-evidence-20260831-resume/source-gates. This final
ledger-only update is backed up separately; no runtime code changed after the
source gate. The final combined reviewed-file manifest and patch are retained
in the same evidence directory. Production readiness remains BLOCKED. Supabase
migrations/deployment performed this continuation: NONE. Only 014 ran in a
synthetic local SQL fixture, which was stopped and is not a staging restore.

### Milestone 16 — frontend reliability and accessibility continuation (31/08/2026)

All 29 milestone-15 source/work hashes matched before editing. Captured a fresh
121-file source baseline; prior integrations/evidence and unrelated work remain
intact. No database migration, production mutation or deployment was attempted.

The mobile menu now uses a labelled native modal dialog, explicit open state,
initial Close-button focus, native Escape/focus containment, and close-on-desktop
handling. Desktop/mobile links identify the current page. The shared shell has
a skip link and focusable content target; global visible focus and reduced-motion
styles were added. Login/register buttons use a darker blue, and page-level
loading, retryable error and not-found surfaces were added.

Registration now blocks submission until the selected class's dojo lookup has
successfully completed. Changing classes clears the previous dojo selection;
cancelled/late lookup responses cannot replace the current catalog. Failed
catalogs have explicit retry states; a successfully empty dojo catalog preserves
the existing administrator-approval workflow. Login/signup unexpected failures
release their busy states without displaying raw exception details. Password
change has accessible busy/status/error/help states and session-check recovery.

Fourteen new component-logic/accessibility regressions pass. They execute actual
TSX with a deterministic hook/dependency harness, not real React DOM scheduling,
Auth, browser events or RLS. An initial harness recursion error and two lint
violations were corrected; no checks were weakened. The working-copy full gate
passed npm ci, lint, all 49 regressions plus TypeScript, standalone typecheck and
the 40-page build. The fixture's non-sensitive protocol counters were added
after that gate; targeted regressions and lint were rerun successfully, and the
final integrated-source gate must include that change. test:security still exits
1 before Auth/network access on missing SECURITY_TEST_MEMBER_EMAIL.

The browser verified class-catalog error/retry/loading states and disabled
submission, eight rendered registration labels, login focus styling and no
horizontal overflow at its 1280x720 viewport, the not-found screen, and the
unauthenticated Admin redirect. The browser rejected the synthetic fixture URL
with ERR_BLOCKED_BY_CLIENT; its catalog/Auth counters remained zero. Consequently
successful catalog recovery and the conditional dojo control were NOT browser
verified. Keyboard traversal remained inconclusive; modal keyboard interaction,
fresh multi-viewport checks, screen-reader checks, authenticated workflows and
CI browser automation remain open. Prior milestone-12 viewport evidence is
historical, not a fresh pass for every changed screen.

Evidence: release-evidence-20260831-frontend. No Supabase discovery was repeated;
the last verified inventory still contained only the live project and no branch.
No staging/backup environment credentials are present. Staging provisioning and
a protected backup/restore connection have been requested; production readiness
remains BLOCKED.

### Milestone 17 — frontend integration and final source gate (31/08/2026)

Backed up 121 environment-excluded source files and a fresh 17-file patch.
Integrated the reviewed frontend/test/document files with per-target SHA-256
guards; unrelated source hashes were preserved. Reverse-patch CHECK passed
without reversing anything. No source Git staging, commit or reset occurred.

In C:\Projects\martial-repository, npm ci, lint, npm test (49 passing regression
tests plus TypeScript), standalone typecheck and production build all exit 0.
The build generated 40 pages using loopback backend placeholders, not deployable
production configuration. test:security exits 1 before Auth/network access on
missing SECURITY_TEST_MEMBER_EMAIL; it did NOT pass. npm reports zero known
vulnerabilities, and its unrs-resolver postinstall warning was not bypassed.
Exact results: release-evidence-20260831-frontend/source-gates.

This final ledger-only update has its own backup and hash guard; no runtime code
changed after the source gate. The combined final manifest covers 39 reviewed
files in both copies. Both created browser tabs and local app/catalog servers
were closed/stopped. No database migration, production mutation or deployment
was performed. Production readiness remains BLOCKED on the explicitly recorded
staging, backup/restore, authorization, functional/browser and configuration gates.

### Milestone 18 — repeatable browser smoke and observed UI fixes (31/08/2026)

Verified all 39 milestone-17 hashes in source and working copy, then captured
126 environment-excluded source hashes. No previous merge/evidence was replayed.
Refreshed the read-only Supabase project/branch inventory: only live project
pkmllhaavadhaozmwapz and no branches. No staging or backup credentials are present.
Provisioning, protected backup access and trusted HTTPS staging were requested.

Added a guarded Playwright runner, real React navigation-component fixture,
mocked public-page tests and an immutable-action GitHub workflow. The 17 cases
run in five profiles (85 instances); all API/Auth responses are synthetic. No
authenticated session is created, no backend request is forwarded, no in-app
browser restriction is bypassed, and no production protection is disabled.
Three environment/isolation tests bring the Node regression total to 52.

Initial browser failures exposed low-contrast navigation labels and modal focus
escaping to BODY. Fixed label contrast, explicit modal traversal/focus return,
account disclosure Escape/focus behavior and sign-out failure recovery. WebKit
revealed that disabling the focused sign-out control could hide its error;
the menu now closes only on an actual focus exit, with delayed-failure coverage.
Distinct login/register/password titles were added. Retry fixtures were corrected
to represent a sustained outage despite SDK retries; assertions were not removed.
ESLint now excludes generated third-party browser report bundles only.

Working browser evidence: 75 passed / 10 failed. Chromium's three viewports and
Firefox desktop pass all 68 instances. WebKit passes seven navigation instances;
its skip-link keyboard traversal remains unresolved and nine public-page cases
fail because the production CSP upgrades the HTTP-only local assets to HTTPS.
The default full suite remains nonzero; no skipped/expected-failure tests hide
these gaps. Platform-appropriate keyboard shortcuts are retained for the final
source rerun. Visual inspection covered mobile login, tablet registration with
dojo, desktop navigation and mobile Admin menu. These are not authenticated or
whole-app responsive/screen-reader acceptance results.

The final runtime build passed and generated 40 placeholder-configured pages.
Lint passed after ignoring generated reports; 52 Node tests passed. The fresh
integrated-source gate and browser rerun are recorded separately below. One
sandboxed fixture start failed with a filesystem access error; its identified
leftover test server was stopped, then the suite ran with approved filesystem
access. All attempt logs remain in release-evidence-20260831-browser-ci.

No SQL changed or ran this continuation. Supabase migrations 011–016, restored
backup validation, RLS/grants/runtime lint, migration-016 concurrency, real Auth
and the original business-workflow matrix remain blocked. Durable rate-limit
thresholds/enforcement, worker/email/push, monitoring, deployment/redirect and
rollback access still need approved configuration and staging proof. Readiness:
NOT production-ready. No production mutation, migration or deployment occurred.

### Milestone 19 — browser CI integration and final evidence (31/08/2026)

Backed up 126 environment-excluded source files and prepared a fresh 29-file
binary patch. Integrated those reviewed files with SHA-256 conflict guards;
the reverse-patch CHECK passed and unrelated source hashes were preserved.
No source Git staging, commit, reset or deployment occurred.

In C:\Projects\martial-repository: npm ci, lint, npm test (52 passing regressions
plus TypeScript), standalone typecheck and production build all exit 0. The
build generated 40 pages with loopback placeholders and is NOT deployable
production configuration. npm reports zero known vulnerabilities; esbuild and
unrs-resolver install-script warnings were not bypassed. Exact logs and exit
codes: release-evidence-20260831-browser-ci/source-gates.

The entire integrated-source browser suite was rebuilt and executed: 75 passed,
10 failed, zero skipped. All 68 Chromium/Firefox cases and seven WebKit
navigation cases pass. Nine WebKit public-page checks remain blocked by HTTPS
asset upgrades on the HTTP-only fixture; WebKit skip-link keyboard traversal
still fails. No check was removed/waived and the full browser command exits 1.
Evidence: source-browser.log and source-browser-results/browser-results.json.

test:security exits 1 before Auth/network access on missing
SECURITY_TEST_MEMBER_EMAIL. It did NOT pass. All 011–016 Supabase migrations
remain unapplied; no SQL was run this continuation. Staging, complete protected
backup/restore, platform grants, authenticated workflows, remaining browser/
assistive-technology work, rate limits and external release configuration remain
mandatory blockers. No production mutation, migration or deployment occurred.

This ledger-only finalization has a separate backup and hash guard. No runtime
code changed after final validation. The combined reviewed manifest contains
60 source/work files; final source backup/patch and precise next steps are in
the new CHECKPOINT.md. Readiness remains BLOCKED, not production-ready.

### Milestone 20 — WebKit skip-link correction (31/08/2026)

Verified all 60 milestone-19 source/work hashes before editing and captured a
fresh 143-file source baseline. Re-read the required checkpoint/instructions and
refreshed only read-only Supabase inventory: still one live project and no branch.
No staging/backup credentials or TLS configuration are present in the checked
execution environment. No database operation or external configuration change ran.

A network-blocked minimal keyboard diagnostic compared visible, transformed and
clipped links across Chromium, Firefox and WebKit. This WebKit engine skips plain
links with Tab even when they are visible, but includes links with tabindex=0.
Added tabIndex={0} to the actual AppShell skip link; no positive tab order, browser
preference change, focus-forcing test call or protection bypass was introduced.
The existing browser test now passes native Tab -> Enter -> main -> Tab -> content.
A new static regression failed before the fix and passes afterward. The total
is now 53 Node regressions plus TypeScript; working lint and npm test pass.

The full working browser suite reports 76 passed / 9 failed, zero skipped. All
eight WebKit navigation cases now pass. Nine WebKit public-page failures remain
blocked by CSP HTTPS upgrades against the HTTP-only test server. The final source
run additionally checks visible skip-link focus/in-viewport state and captures a
screenshot; its results and guarded integration are recorded below when complete.
The default full browser suite still fails and is not a release pass.

Evidence: release-evidence-20260831-keyboard. Historical reports are unchanged.
Migrations 011–016 remain unapplied to Supabase; all SQL is unchanged. Staging,
protected backup/restore, live-schema validation, dedicated role/workflow tests,
trusted HTTPS, real device/screen-reader acceptance, durable rate limits and
external operational configuration still require the recorded prerequisites.

Final integration: a fresh 143-file source snapshot and eight-file binary patch
preceded the guarded merge. Target SHA-256 checks and reverse-patch CHECK passed;
unrelated dirty/untracked source changes were preserved. No runtime code changed
after validation. This ledger-only finalization receives its own backup and hash
guard; the combined reviewed manifest verifies 60 files in source and working copy.

Integrated-source npm ci, lint, npm test (53 regressions plus TypeScript), standalone
typecheck and build all exit 0. The build generates 40 pages with loopback backend
placeholders and is NOT deployable production configuration. Source gate logs and
actual exit codes are in release-evidence-20260831-keyboard/source-gates.

The entire final integrated-source browser suite reports 76 passed / 9 failed,
zero skipped/flaky, exit 1. All 68 Chromium/Firefox and eight WebKit navigation
cases pass, including the stronger native-keyboard skip-link focus/viewport/outline
assertions in all five profiles. Chromium-mobile and WebKit-mobile focus screenshots
were visually inspected: the link and focus outline are visible and not clipped.
The nine WebKit public-page failures remain blocked by HTTPS asset upgrades on the
HTTP-only fixture; no failing check or protection was weakened. Evidence includes
source-browser.log and source-browser-results/browser-results.json.

test:security exits 1 before network access because SECURITY_TEST_MEMBER_EMAIL is
missing; it did NOT pass. No SQL or migration was applied in any environment during
this continuation. No production mutation or deployment occurred. Local test ports
3100, 3101 and 54321 have no listeners after cleanup. Staging, complete protected
backup/restore, real authorization/business acceptance, trusted HTTPS, remote CI and
operational release gates remain outstanding. Readiness: BLOCKED, not production-ready.

### Milestone 21 — guarded HTTPS test support (31/08/2026)

All 60 milestone-20 source/work hashes matched; a fresh 143-file source baseline
was captured. No newer checkpoint, source overlap or previous merge replay was
found. Read-only discovery still finds only live pkmllhaavadhaozmwapz in ap-south-1
and no branches. Environment-name checks, including the source .env.local, found
no staging/backup/security-account/TLS configuration. No secret values were printed.

GitHub authentication was accepted and read access to hioecalvin/jingwuguanseibukan
is verified. The remote default branch does not contain browser-smoke.yml (404).
The source has substantial retained dirty/untracked changes; no commit, push or
workflow dispatch occurred. Publishing a reviewed change set/CI run remains an
external action requiring authorization, not something implied by connector access.

Added opt-in HTTPS for the two fixed loopback-only isolated test servers. It uses
operator-provided certificate/key/CA files outside the repository and fails closed
on partial/invalid setup, expired certificates, wrong host or mismatched keys. It
never installs trust or falls back to HTTP. Browser/server readiness retains TLS
verification; Next production CSP, all five profiles, all assertions and the
backend mock/target isolation are unchanged. The production start command is untouched.

Eight new guard tests bring npm test to 61 regressions plus TypeScript; working
lint and npm test pass. A separate offline synthetic certificate check passes five
parser/context assertions; generated key/certificate files were immediately removed.
No trust store, browser preference or network request was involved in that check.
It is not an HTTPS handshake or browser pass. Trusted certificate setup still
requires operator authorization; the known nine WebKit HTTPS failures are not fixed
by merely adding this support. Final integrated-source evidence is recorded below.

Staging/backup/restore, SQL 011–016, real Auth/RLS/business acceptance, remote CI,
rate-limit policy/enforcement, messaging/scheduling and release configuration remain
unvalidated. No SQL was changed or run, and no production action occurred. Evidence:
release-evidence-20260831-https-support; previous evidence remains immutable.

Final integration: 12 reviewed files merged after the fresh 143-file snapshot and
binary patch. Per-target hashes and reverse-patch CHECK passed; unrelated source
changes were preserved. A separate ledger backup/hash guard records the actual
results below; no runtime/test implementation changed after the final source gate.
The combined final manifest verifies 62 reviewed files in source and working copy.

Integrated-source npm ci, lint, npm test (61 regressions plus TypeScript), standalone
typecheck and build all exit 0. Build output is 40 placeholder-configured pages,
not a deployable release. npm reports zero known vulnerabilities; existing install-
script approval warnings were not bypassed. test:security exits 1 before network
access on missing SECURITY_TEST_MEMBER_EMAIL and is BLOCKED, not passed.

The entire integrated-source browser run reports 76 passed / 9 failed / zero skipped
or flaky, exit 1. Its failed-case set exactly matches milestone 20: all nine are the
WebKit public-page HTTP/CSP/HTTPS failures. All Chromium/Firefox cases and all eight
WebKit navigation cases pass. HTTPS mode was not run with trusted material because
approval/configuration is absent; its missing-input preflight deliberately exits 1
before build/browser work. Offline parser checks are not an HTTPS browser pass.

Exact source gate logs/exit codes, full browser report/traces, environment status and
the concrete staging/HTTPS access proposal are retained in the new evidence folder.
Local test ports 3100, 3101 and 54321 have no listeners after cleanup. Temporary
synthetic key/certificate files were removed, and no trust entries were installed.
All six pending SQL files remain byte-identical. Migrations actually applied: NONE
in any environment. No production mutation, deployment, remote commit or CI dispatch
occurred. Readiness remains BLOCKED on the documented external prerequisites and
uncompleted staging/functional/security/operational gates.

### Milestone 22 — actual HTTPS transport and deployment-safety check (31/08/2026)

Verified all 62 milestone-21 hashes in both copies and captured a fresh 145-file
source baseline. No newer checkpoint or overlapping reviewed edit was found.
The new request authorizes narrow temporary certificate trust, protected read-only
exports, verified staging work and reviewed validation-branch CI. Its unchanged
budget placeholder authorizes no spending; production release approval is separate.

Generated a <=24h loopback-only non-CA server certificate in an owner-only temporary
directory and recorded its thumbprint/validity/trust/cleanup plan before installation.
CurrentUser Root Add stalled; no trust entry or targetable security dialog appeared.
Stopped the attempt before npm/browser execution, verified absence from CurrentUser
and LocalMachine Root, and removed its three PEM files/empty directory. No security
dialog, browser protection or machine trust was bypassed. Interactive setup remains.

Independent real HTTPS transport validation then passed five assertions with explicit
Node-client-only trust: actual Next login with unchanged CSP, all 14 referenced static
assets, actual navigation server, untrusted-client rejection and wrong-host rejection.
The build generated 40 placeholder pages; it is not deployable. Owned server trees
were stopped and certificate material removed. These are real network/TLS assertions,
not browser, Auth/RLS or business-workflow tests. The complete browser suite was NOT
rerun; its last result remains 76 passed / 9 failed, with all profiles/checks intact.

Supabase inventory still returns only live pkmllhaavadhaozmwapz and no branches.
GitHub read/push metadata works; main is 208c2cda8fffd2948df2616626a3b7d0adebcc02.
Its successful Vercel status identifies js1-ccd7/jingwuguanseibukan. Deployment/webhook
settings are unavailable through the connector, and the browser is signed out.
Publishing stopped because production automation could not be ruled out. No remote
commit, branch, CI dispatch, SQL, backup, staging provision or production action ran.

One missing-access checklist was sent, requesting staging/quote approval, protected
backup configuration/destination, hosting identity/settings sign-in and controlled
provider recipients. Certificate permission itself is already granted; actual
interactive trust setup is the remaining issue. Rate-limit policy, platform grants,
original functional matrix and every recovery/operational release gate remain open.
Evidence: release-evidence-20260831-https-validation. Integration/final source results
will be recorded below after guarded documentation integration.

Final integration backed up 145 environment-excluded files, integrated only the
five reviewed documentation updates and passed per-file SHA-256/reverse-patch CHECK.
No application/test/SQL file changed; new HTTPS validation helpers live in workspace
tools. Existing unrelated source edits were preserved; no source Git staging occurred.

In integrated source, npm ci, lint, npm test (61 regressions plus TypeScript), standalone
typecheck and build all exit 0. npm reports zero known vulnerabilities; existing
install-script warnings were not bypassed. Build output is 40 placeholder-configured
pages, not a release artifact. test:security is explicitly BLOCKED_NOT_RUN, exitCode
null: the known missing-staging prerequisite was not rerun. The gate wrapper remains
nonzero (1), so this is not a fully passing release gate.

All five real HTTPS transport assertions were also rerun on integrated source and
pass, exit 0; all 14 login assets are served over verified TLS. No browser tests ran
and no browser/OS trust changed in these transport runs. Source/work certificate
material was removed and owned servers stopped. Exact logs, certificate plans and
cleanup records are retained in release-evidence-20260831-https-validation.

Final combined manifest retains 62 reviewed files. Migrations applied: NONE in any
environment. Backup/restore, staging security/functional/operational work, trusted full
browser run and remote CI remain blocked. GitHub/Vercel sign-in pages are available
for the requested access handoff. Readiness remains BLOCKED, not production-ready.

### Milestone 23 — subscription runtime and date-key hardening (31/08/2026)

Verified all 62 reviewed source/work hashes and captured a new 145-file source
baseline. Existing source edits, previous evidence and migration history remain
intact. Sydney staging is the selected project; no Singapore staging replacement is planned.
Vercel Preview Branch Tracking was saved OFF in the prior access session, but
Production/Preview shared secret scopes remain unresolved. No push/CI is authorized
until isolation is proved. Database credential paths and Sydney data-copy consent
have been requested; no production records were copied.

Added executable workspace-only PostgreSQL 17.11 tests of the exact pending 016
file. The initial full runtime result was 20 passed / 2 failed: session DateStyle
changed the advisory-lock key and same-day reminder dedupe key. Corrected those
four date conversions to explicit YYYY-MM-DD formatting, retaining existing ISO
keys and leaving verified migration 006 unchanged. A new lexical regression also
failed before the fix and passed afterward. Working npm test now passes 62
regressions plus TypeScript; final integration/gate results are recorded below.

The corrected exact migration passes all 22 synthetic runtime checks, including
actual two-session advisory-lock waits, retries, payment sums, waived/cancelled/
fully-paid exclusions, caller/dojo denial, notification metadata and transactional
rollback after a deliberately failing notifier. Two helper functions and Auth/
finance scope are stubs: this is not restored Supabase, real RLS, actual charge
generation/delivery, or complete acceptance. Only the disposable loopback fixture
received SQL. Its server stopped cleanly; test data is fictional and retained.

Evidence: `release-evidence-20260831-subscription-runtime` contains all attempts;
`release-evidence-20260831-subscription-hardening` contains guarded integration and
final gates. Full HTTPS browser execution still requires operator-attended trust;
the previous 76/9 browser result is not waived. No Supabase migration or production
deployment occurred. Complete backup/restore, live-key-format review, staged
011–016, real security/functional and operational gates remain mandatory.

Final integration backed up 145 source files and applied seven reviewed changes;
before/after SHA-256 guards and the reverse-patch CHECK passed, with unrelated
source hashes preserved. In C:\Projects\martial-repository, npm ci, lint, npm test
(62 passing Node regressions plus TypeScript), standalone typecheck and build all
exit 0. The build generates 40 placeholder-configured pages, NOT a deployable
release. npm reports zero known vulnerabilities; existing esbuild/unrs-resolver
install-script warnings were retained and not bypassed.

The integrated-source migration also passes all 22 synthetic SQL runtime checks
in a fresh cluster. Its serverStopped=true lifecycle record and independent empty
55441 listener check confirm shutdown. No Supabase migration was applied.
test:security is BLOCKED_NOT_RUN with no command exit code; the aggregate gate
exits 1 intentionally. Full browser tests were not rerun against unchanged missing
trust; retained complete results remain 76 passed / 9 failed, not a pass. Remote CI,
real Auth/RLS/finance acceptance and complete backup/restore remain unrun. A separate
guarded ledger backup/final manifest records these results; no SQL/runtime/test
implementation changed after validation. Readiness: BLOCKED, not production-ready.

### Milestone 30 — restored staging migrations and explicit ACL repair (04/09/2026)

Milestone 28 proved the protected logical recovery path by restoring the exact
production-derived public/Auth/Storage package into isolated Sydney staging
`eomubndonbetszdbhsrj`; outbound Auth providers, Edge Functions and Edge secrets
remained disabled. Milestone 29 then passed the duplicate/dependency/history dry
run and applied reviewed migrations 011–016 to staging only. The ledger now records
exactly 006–016. No production database or deployment was changed.

Database lint found one real 42883 error in `create_member_invitation`; prepared
migration 017 qualifies `extensions.digest` and `extensions.gen_random_bytes`.
The first authenticated staging security run used three non-delivered one-time
sessions for the restored dummy Member/Admin/Super Admin accounts. It ran all 12
checks but failed nine. The post-016 catalog proves the restored `--no-acl` baseline
left browser roles with `TRUNCATE`/`REFERENCES`/`TRIGGER`/`MAINTAIN` while omitting
the SELECT and EXECUTE grants required for RLS and browser RPCs. This is a release
finding, not a waived test failure.

Prepared migration 018 removes all browser relation/sequence/function privileges,
then grants only policy-backed table operations and the 100 browser RPC names
statically referenced by the application plus required RLS/view helpers. Server-only
worker/password routines remain service-role-only. A scoped grading-history policy
supports the security-invoker admin view. Migrations 017–018 passed an exact staging
dry run and an outer-transaction rehearsal with assertions; the transaction rolled
back and history remains 006–016. Neither migration is applied.

The integrated source now passes npm ci, lint, 67 Node regressions plus TypeScript,
standalone typecheck and a 40-route build. The build still uses placeholder local
configuration and is not deployable. Applying 017–018 to staging requires explicit
approval; then rerun lint, the strengthened SQL verifier and `test:security`. The
unchanged `supabase_admin` platform-default grant gate, complete functional/browser
matrix, remote CI, hosting/provider isolation and operational monitoring remain
blockers. Readiness: BLOCKED, not production-ready. Latest checkpoint:
`release-evidence-20260904-staging-security`.

### Milestone 31 — staging migrations 017–018 applied and role suite green (05/09/2026)

User-approved migrations 017 and 018 were applied to Sydney staging
`eomubndonbetszdbhsrj` only. The guarded preflight selected exactly those files and
reverified TLS, outbound isolation, duplicate checks, source/work hashes and exact
006–016 history. The migration process exited 0; an obsolete wrapper post-check then
failed, so a separate read-only verifier was used as the authoritative result. It
proves exact staging history 006–018 and all intended current-object ACL outcomes.

Post-apply database lint passes with exit 0 and no public-schema errors. The unchanged
authenticated staging security suite passes all 12 Member, scoped Admin and Super
Admin checks, including row/dojo isolation, private tables, helper caller identity and
privileged-RPC denial. Temporary sessions were cleaned up and providers remained
disabled. Production was neither contacted nor changed.

The exact SQL verifier still exits 3 at its retained platform-default-ACL gate:
hosted `supabase_admin` owns global/public defaults that expose future objects to
browser roles and project `postgres` cannot alter them. Current application objects
are explicitly allowlisted and tested; the future-object default remains a release
blocker requiring a supported Supabase owner/platform resolution or an explicit
narrow risk decision. The check was not weakened.

Next: complete real staging migration-016 concurrency/payment/deduplication tests,
the authenticated functional matrix, browser/accessibility/remote CI, provider and
hosting isolation, durable rate limiting, monitoring and final production-configured
gates. Do not reapply 017–018. No production release is authorized. Evidence:
`release-evidence-20260905-staging-acl`. Readiness remains BLOCKED.

### Milestone 32 — hosted subscription concurrency acceptance passed (09/09/2026)

The guarded migration-016 acceptance now passes 10/10 on Sydney staging with exact
history 006–018. Real concurrent sessions proved transaction advisory-lock waiting
and deduplication across normalized month inputs and different DateStyle settings.
Six synthetic IDR 100 charges were generated once; monthly notifications and unpaid
reminders were retry-safe. Summed partial payments produced the expected 60 balance,
while fully paid, overpaid, waived and cancelled cases were excluded. Member and
wrong-dojo callers were denied without mutation.

Only dedicated dummy profiles and uniquely generated temporary class/dojo records
were used. Cleanup counts are zero, outbound Auth/Edge isolation remained enabled,
and production was not contacted. The unchanged authenticated Member/scoped Admin/
Super Admin security suite passed 12/12 again after cleanup.

This closes the migration-016 concurrency/payment/deduplication acceptance item. It
does not close the platform-owner default ACL, broader business workflows, trusted
browser/accessibility, remote CI or operational release gates. Evidence:
`release-evidence-20260909-staging-subscriptions`. Readiness remains BLOCKED.

### Milestone 33 — migration 019, membership workflows and dependency security (09/09/2026)

User-approved migration 019 was applied only to Sydney staging
`eomubndonbetszdbhsrj`. Its exact ledger is now 006–019. Guarded post-apply checks
prove the enabled status trigger is the sole future history writer, both affected
RPCs retain fixed search paths and intended ACLs, and no exact historical duplicate
groups exist. Database lint passes with no public-schema errors.

The authenticated Member/scoped Admin/Super Admin suite passes 12/12. The hosted
enrollment and membership-break suite passes 11/11, including cross-member and
wrong-dojo denial, approval/rejection/cancellation/reapplication, duplicate blocking,
scoped return-active, exactly one break history row and exactly one return-active
history row. Synthetic rows and sessions were removed and outbound isolation stayed
active. Production requests, connections and mutations were zero.

The strict SQL verifier still stops only at the unchanged hosted `supabase_admin`
future-object default-ACL gate. Current application ACLs are explicit and the check
was not weakened. Resolve it through a supported platform-owner action or an explicit
narrow release-risk decision before production.

The prior lock then reported three new advisories. Next.js and
`eslint-config-next` were upgraded from 16.3.1 to 16.3.4; the refreshed lock resolves
Sharp 0.35.4 and `js-yaml` 4.3.2. Guarded integration changed only `package.json` and
`package-lock.json`. The final integrated source passes `npm ci`, a zero-vulnerability
audit, lint, 67/67 Node regressions plus TypeScript, standalone typecheck and a
40-route build. The build uses loopback placeholders and is not deployable.

Remaining: authenticated grading/assessor, certificates/titles, transfers, payment
confirmations, settlements, registration/password, notifications/exports/audit;
trusted authenticated browser/accessibility and remote CI; production hosting,
redirects, durable rate limiting, workers/providers, monitoring, secret and rollback
validation. No production release is authorized. Evidence:
`release-evidence-20260909-staging-membership-workflows`. Readiness remains BLOCKED.

### Milestone 34–35 — grading/title and transfer acceptance (09/09/2026)

The rollback-contained grading/title suite passed 12/12 on staging. Migration 020
was then integrated with its static regression and applied only to Sydney staging,
advancing its exact ledger to 006–020. Database lint passes; the full transfer suite
passes 20/20 with atomic missing/duplicate batch rejection, one destination
notification, authorization boundaries, scheduling/idempotency, cancellation,
failure/retry history and zero rollback residue. The post-test authenticated security
suite passes 12/12 with outbound isolation and session cleanup. Production contact
and mutation counts are zero.

The strict SQL verifier remains nonzero only for the existing platform-owned
`supabase_admin` future-object default ACL. Remaining production blockers include
the other OPEN functional workflows, trusted authenticated browser/accessibility and
remote CI, production configuration, durable rate limiting, providers/workers,
monitoring and the final recovery/release rehearsal. Do not reapply 011–020 and do
not deploy production. Evidence: `release-evidence-20260909-staging-grading-titles`
and `release-evidence-20260909-staging-transfers`. Readiness remains BLOCKED.

### Milestone 36 — payment repair prepared and rehearsed (10/09/2026)

Hosted rollback-contained payment acceptance confirmed that the official-payment RPC
accepted a payment after the charge was already fully paid and that confirmation
reviews produced no Member result notification. All attempts rolled back cleanly and
production was not contacted.

Prepared migration 021 repairs closed-charge/overpayment enforcement, consistent
partial/paid status updates and approval/rejection notifications. Its transaction-
only staging rehearsal passed 19/19 with exact totals, payment links, notifications,
fee locks and zero residue. Working-copy lint and 69/69 regressions plus TypeScript
pass. Migration 021 and its regression are not integrated or applied; staging remains
006–020. Explicit staging-only integration/application approval is the next gate.

### Milestone 37 — payment hardening committed and accepted (10/09/2026)

Migration 021 and its static regression were hash-guarded into the integrated source
with a recoverable backup and before/after manifests. Integrated-source lint passed;
69/69 Node regressions plus TypeScript passed. Migration 021 was then applied only
to verified Sydney staging, advancing its exact ledger to 006–021.

Post-apply database lint found no schema errors. The committed-schema payment suite
passed 19/19 with exact payment totals, closed-charge/overpayment denial, three
Member result notifications, four Admin pending notifications, fee adjustment/lock
coverage, scope isolation and zero rollback residue. The fresh authenticated role
security smoke passed 12/12. The strict verifier remains nonzero only for the known
hosted `supabase_admin` future-object default ACL. Production contact and mutations
were zero. PAY-01 and PAY-02 are complete; remaining OPEN workflows and operational,
browser/accessibility, CI, configuration and release gates still block production.

### Milestone 38 — settlement acceptance executed; overload repair prepared (10/09/2026)

Mapped the settlement configuration, eligibility, draft, transfer, submission,
rejection/resubmission, approval/archive, cancellation/release and scoped-read RPCs.
A 30-check rollback-contained staging suite and exact-target runner were prepared.
The offline guard passed 22/22 checks covering TLS, 006–021 history, source/work
hashes, atomic missing/duplicate/cross-dojo payment rejection, lifecycle state,
financial snapshots, notifications, archive idempotency, released-payment reuse,
scope isolation, secret suppression and zero residue. Approved staging attempts
v1-v4 all rolled back with zero residue. After correcting two fixture-only issues,
v4 exposed a real ambiguity between the four-argument browser transfer RPC and a
legacy five-argument overload whose trailing arguments have defaults. SET-01 is
BLOCKED. Migration 022 removes only the obsolete overload and reasserts the
four-argument ACL; its regression test passes locally, but neither file is
integrated and migration 022 is not applied. Authenticated security smoke v12
passed 12/12; production contacts and mutations remained zero.

### Milestone 39 — settlement/video branches reconciled without migration collision (13/09/2026)

Built a fresh integration candidate from the current dirty source without modifying
or discarding it. Preserved committed source migrations 019–021 and the other task's
prepared settlement-overload repair as migration 022. The separate email/video
branch had reused migration numbers 019–020, so those unapplied changes were safely
renumbered to 023–024 with their fixtures and static checks updated accordingly.

Integrated the private resumable upload, signed Cloudflare playback, verified
webhook, immutable watermark replacement/activation, bounded failed-derivative retry
and provider-aware retirement code. Preserved Next.js 16.3.4 and the current source
dependency/security updates while adding only `tus-js-client`; the reconciled lock
audits with zero known vulnerabilities. The v1 member push control remains hidden,
while its deferred backend implementation is preserved.

The combined candidate passes TypeScript plus 93/93 Node regressions and lint with no
warnings. Migrations 022–024 remain unapplied; staging is still recorded at 006–021
and production is untouched. Exact runtime fixtures, production build, final
manifest and guarded source integration remain the next gates. Readiness remains
BLOCKED.

### Milestone 40 — reconciled candidate merged and verified in source (13/09/2026)

The hash-guarded 40-file reconciliation was merged into
`C:\Projects\martial-repository` after all 14 replaced source files matched the
protected before-copy and all 26 destinations for new files were confirmed absent.
Post-copy SHA-256 verification found zero mismatches; unrelated dirty source work and
`.env.local` were preserved. The filtered before/after backup and binary-capable patch
are retained in `release-evidence-20260913-reconciled-integration`.

The actual merged source completed `npm ci` with zero known vulnerabilities, lint
with no warnings, TypeScript plus 93/93 Node regressions, and the Next.js 16.3.4
optimized production build with all 46 page-generation entries. Disposable
PostgreSQL fixtures for migrations 023 and 024 passed and were removed. Migrations
022–024 remain unapplied, staging remains recorded at 006–021, and production was
not contacted or changed. Production readiness remains BLOCKED on reviewed staging
application/acceptance and the previously documented operational and browser gates.

### Milestone 41 — migrations 022–024 local release gate completed (13/09/2026)

Refreshed the Supabase account inventory read-only and confirmed that the exact
Sydney staging project `eomubndonbetszdbhsrj` is still `ACTIVE_HEALTHY` in
`ap-southeast-2`. No database connection or mutation was made during that check;
the last verified staging migration history therefore remains 006–021.

Pinned SHA-256 hashes for migrations 022–024 and completed the missing disposable
PostgreSQL 17 runtime rehearsal for migration 022. The fixture reproduced both the
four-argument application RPC and the ambiguous legacy five-argument overload with
two defaults. Migration 022 preserved the four-argument function, removed only the
legacy overload, fixed ownership and `public, pg_temp` search path, denied PUBLIC
and `anon`, and retained execute for `authenticated` and `service_role`. The fixture
reported `MIGRATION_022_RUNTIME_PASS`; PostgreSQL was loopback-only and stopped
cleanly. Combined with the already-passed 023 email-outbox and 024 video-pipeline
fixtures, all three pending migrations now have local runtime evidence.

Migrations 022–024 remain unapplied. Applying them to staging and running the
post-apply settlement, email-worker and Cloudflare video acceptance gates requires
explicit staging-only approval and configured staging provider resources. Production
was not connected to or changed. Evidence:
`release-evidence-20260913-migrations-022-024-local`. Readiness remains BLOCKED.

### Milestone 42 — migrations 022–024 applied and accepted on staging (13/09/2026)

With explicit staging-only approval, applied the hash-pinned migrations 022, 023
and 024 to Sydney staging `eomubndonbetszdbhsrj`. Three initial attempts stopped
during read-only preflight because of harness catalog-probe defects; their migration
commands never started. Corrected attempt v4 passed and advanced the exact staging
ledger from 006–021 to 006–024. Post-apply assertions confirmed TLS and staging
identity, removal of only the ambiguous five-argument settlement-transfer overload,
the preserved/hardened four-argument RPC, the legacy-email routing trigger, the
private originals bucket, four forced-RLS video tables, browser denial, service-role
access, and safe function search paths.

The corrected rollback-contained settlement suite passes 30/30 with approval,
rejection/resubmission, cancellation/release, financial snapshots, archive and
notification coverage. A wrong-dojo Admin sees zero settlement rows and cannot read
settlement items. Rollback and zero fixture residue were verified.

The post-024 email/video suite passes 14/14. A legacy notification is atomically
routed to exactly one `email_outbox` row while the obsolete row is suppressed. The
video state machine accepted ordered processing/ready events, rejected duplicate and
out-of-order application, retained three event-history rows, and activated a new
watermark derivative while retiring the old one. All test rows rolled back and zero
fixture residue was verified.

The authenticated Member/scoped Admin/Super Admin security suite passes 12/12 with
session cleanup and outbound providers disabled. Two immediate-token runs each had
one transient `JWT issued at future` response on different roles; a guarded run with
a bounded five-second JWT aging delay passed every unchanged authorization check.

The acceptance fixture also exposed a separate production blocker in the existing
content RPC: `create_repository_content` converts an empty video provider to NULL,
while `content.video_provider` is NOT NULL. Creating repository content without a
legacy embedded video therefore fails and conflicts with the private-video upload
flow. Prepare and validate a new migration/application repair before production.

Production requests, connections and mutations were zero. Evidence:
`release-evidence-20260913-staging-migrations-022-024`. Readiness remains BLOCKED.

### Milestone 43 — content-without-legacy-embed repair prepared (13/09/2026)

Prepared migration 025 to resolve the content RPC/schema mismatch exposed by the
post-024 acceptance suite. The migration permits `video_provider` and `video_id` to
be NULL only as a pair, removes the misleading default provider, and replaces the
old provider-only check with a validated constraint that accepts either no legacy
embed or a complete YouTube/Vimeo provider and non-blank identifier pair. It does
not modify existing content rows and fails closed if existing data violates the new
pairing invariant.

The first disposable PostgreSQL 17 fixture caught a three-valued-logic gap that
allowed an identifier-only row. The constraint was corrected with explicit non-null
requirements. Fixture v2 passes with `MIGRATION_025_RUNTIME_PASS`, including rejection
of provider-only, identifier-only, unsupported-provider and blank-identifier rows.
The source migration and reviewed candidate hashes match at
`D362561ACDD556512DF80FF7AB120A170FD8A0F5C942EEDABF5244563EACBCF1`.

Added a static SQL regression. The canonical source passes TypeScript plus 94/94
Node regressions and lint with no warnings. Migration 025 remains unapplied;
the guarded read-only staging preflight passes against exact history 006–024. It
confirms zero existing content rows/invalid pairs, the expected current NOT NULL and
default state, the validated legacy provider constraint, and matching create/update
RPC normalization. Staging remains exactly 006–024 and production was not contacted
or changed.
Evidence: `release-evidence-20260913-content-embed-repair`. Readiness remains
BLOCKED pending staging application/acceptance of migration 025 and the
remaining provider, browser and operational release gates.

### Milestone 44 — migration 025 applied and accepted on staging (14/09/2026)

With explicit staging-only approval, applied the hash-pinned migration 025 to
Sydney staging `eomubndonbetszdbhsrj`. Attempts v1 and v2 stopped at the project
inventory step because the workspace sandbox denied npm-cache writes; neither
attempt reached database preflight or started the migration command. The unchanged
v3 gate ran with the required filesystem access, verified exact history 006–024,
and advanced staging to exact history 006–025.

Post-apply catalog assertions confirm zero invalid legacy-video pairs, nullable
`content.video_provider` and `content.video_id`, no provider default, removal of the
old provider-only constraint, and the validated replacement constraint requiring
either NULL/NULL or a complete YouTube/Vimeo plus non-blank ID pair. The create and
update RPC normalization behavior remains present.

The first behavioral acceptance attempt exposed a fixture-only RLS issue: it tried
to inspect a newly created draft directly as `authenticated`, where draft content
is intentionally hidden. The transaction was rolled back on connection closure.
The corrected suite preserved that boundary by executing RPCs as `authenticated`
and inspecting invariants as `postgres`. It passes 10/10 for create-without-embed,
complete and cleared embed updates, four invalid-pair rejections, exact history,
explicit rollback and independent zero-residue verification.

The post-migration Member/scoped Admin/Super Admin authorization smoke suite passes
12/12. Outbound Auth providers remained disabled, staging had zero Edge Functions
and secrets, and all three one-time sessions were cleaned up. Production requests,
connections and mutations were zero. Evidence:
`release-evidence-20260913-content-embed-repair` and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v2.json`.
Readiness remains BLOCKED on the remaining provider, browser and operational release
gates; migration 025 is no longer a blocker.

### Milestone 45 — canonical build and staging database lint refreshed (14/09/2026)

Refreshed the canonical application gate after migration 025: lint passes with no
warnings, TypeScript and all 94 Node regression tests pass, and the optimized Next.js
16.3.4 production build succeeds across 46 routes.

Ran a guarded read-only database lint through an explicit credential-free staging
URL and temporary staging-only login after first asserting exact history 006–025.
Warning-level lint of the `public` schema returned an empty result set and “No schema
errors found”. The CLI's `--project-ref`-only form was rejected locally before any
database connection because that option requires `--linked`; it was not used because
the linked project is production. Production requests, connections and mutations
were zero. Evidence:
`release-evidence-20260913-content-embed-repair/staging-db-lint-post-025-v1.json`.

Readiness remains BLOCKED on protected backup/restore proof, provider and scheduler
configuration, complete authenticated browser/remote-CI coverage, and the remaining
operational release gates.

### Milestone 46 — isolated browser matrix refreshed (14/09/2026)

Ran the complete fixed-loopback Playwright matrix after a successful browser-test
production rebuild. Chromium desktop, tablet and mobile pass all 51/51 checks.
WebKit mobile passes all 8/8 shared-navigation, focus, reduced-motion and automated
accessibility checks. The known nine WebKit public-page cases still fail because the
production CSP upgrades same-loopback HTTP assets to HTTPS while the isolated fixture
is HTTP-only; registration data therefore cannot load and guarded assertions time out.
All 17 Firefox cases stop before page activity with `browserType.launch: spawn UNKNOWN`
in this Windows execution environment.

Overall result: 59 passed, 26 failed, 85 total. This is an environment/trust and
browser-launch gate, not a clean browser-suite pass. The runner used only fixed
loopback application/mock origins and did not contact staging or production.
Evidence: `release-evidence-20260913-content-embed-repair/BROWSER_GATE_20260914.md`
and canonical `test-results/browser-results.json`. Readiness remains BLOCKED.

### Milestone 47 — durable API rate limits prepared (14/09/2026)

Prepared migration 026 with an atomic fixed-window rate-limit table and
service-role-only SECURITY DEFINER consumption RPC. The table forces RLS and denies
browser table/function access. Server-side subjects are HMAC-SHA256 hashed with the
required `DURABLE_RATE_LIMIT_SECRET`, so raw user IDs and worker identities are not
persisted. Missing configuration or database failures fail closed.

Integrated configurable limits into authenticated password changes, push
subscription writes, email-worker scheduling, push delivery, and verified
Cloudflare Stream webhooks. Denied requests return HTTP 429 with `Retry-After` and
remaining-count headers; unavailable enforcement returns HTTP 503. Conservative
defaults are documented in
`release-evidence-20260914-durable-rate-limits/CHECKPOINT.md` and can be overridden
only by validated positive-integer environment values.

The final migration 026 candidate passes disposable loopback-only PostgreSQL 17
runtime rehearsal v2,
including fixed-window counting, independent subjects, denial/retry timing, window
reset, invalid-input rejection, forced RLS, function attributes and ACLs. The server
stopped cleanly. Canonical lint, TypeScript, 97/97 Node regressions and the 46-route
production build pass.

Migration 026 remains unapplied. Staging remains at exact history 006–025 and
production was not contacted or changed. Durable application-route rate limiting
remains a release blocker until 026 is separately approved/applied/accepted on
staging and the direct Supabase Auth CAPTCHA/platform-limit policy is configured.

### Milestone 48 — migration 026 applied and accepted on staging (14/09/2026)

With explicit staging-only approval, applied the final hash-pinned migration 026
candidate to Sydney staging `eomubndonbetszdbhsrj`. Attempts v1–v3 stopped before
the migration command because of two PowerShell harness automatic-variable naming
collisions; v1/v2 did not reach the remote database and v3 completed only a read-only
preflight connection. Corrected gate v4 verified exact history 006–025 and advanced
staging to exact history 006–026.

Post-apply assertions confirm the durable rate-limit table exists with forced RLS,
no direct table access for `anon`, `authenticated`, or `service_role`, and a
service-role-only SECURITY DEFINER consumer owned by `postgres` with fixed
`public, pg_temp` search path. Browser roles cannot execute the function.

Rollback-contained acceptance passes 12/12 for fixed-window counting, remaining
counts, denial and retry timing, subject isolation, bucket isolation, expired-window
reset and invalid-input rejection. Independent zero-residue verification passes.
Warning-level database lint against exact history 006–026 reports no schema errors.

The first post-026 authorization run passed 11/12 but hit the known transient
Supabase clock skew (`JWT issued at future`) for the Member token. All sessions were
cleaned up. A bounded ten-second token-aging retry passed all 12/12 unchanged checks
for Member, scoped Admin and Super Admin, with outbound providers still disabled and
all temporary sessions cleaned up.

Production requests, connections and mutations were zero. Evidence:
`release-evidence-20260914-durable-rate-limits`,
`release-evidence-20260913-content-embed-repair/staging-db-lint-post-026-v1.json`, and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v4.json`.
Application-route durable rate limiting is no longer a database blocker. Remaining
release work includes direct Supabase Auth limits/CAPTCHA, provider and scheduler
configuration, authenticated browser/remote-CI coverage, backup/restore proof and
the final production release gate.

### Milestone 49 — two-logo repository video branding implemented (14/09/2026)

Implemented the approved logo-only video branding design with no viewer identity
watermark. The existing Cloudflare pipeline continues to require an immutable,
burned-in Jingwuguan Seibukan organization watermark. The member repository player
now loads the current administrator-managed `classes.logo_url` and displays it as a
second, non-interactive HTTPS-only class-logo overlay. Legacy YouTube/Vimeo embeds
also receive the organization-logo overlay so the visible player retains both marks
when a class logo is configured. No viewer name, member number, email address or
moving identity watermark is rendered.

The class logo remains dynamic, so an administrator logo update is reflected without
re-uploading videos. Its security boundary is documented accurately: a cross-origin
iframe overlay is branding and is not guaranteed inside the embedded player's own
fullscreen mode or against local page modification. The burned-in organization logo
remains the durable mark; making both logos irreversible would require a composed
per-class Cloudflare watermark and video reprocessing after logo changes.

Added a regression for the class lookup, two-logo contract, non-interactive overlay
and absence of personal identifiers. Lint and TypeScript pass, all 98/98 Node
regressions pass, and the optimized Next.js 16.3.4 production build succeeds across
46 routes. No migration was required and staging and production were not contacted
or changed. Readiness remains blocked on the external provider/scheduler and Auth
CAPTCHA configuration, authenticated browser/remote-CI coverage, protected
backup/restore proof and final production approval.

### Milestone 50 — protected scoped staging restore proven (15/09/2026)

Completed a protected, staging-only logical backup and isolated loopback restore of
the application-owned `public` schema/data and the `supabase_migrations` ledger.
The guarded runner verified the exact healthy Sydney staging identity
`eomubndonbetszdbhsrj`, used TLS verification with the pinned CA, explicitly excluded
the production project, and ran `pg_dump` only after confirming exact migration
history 006–026.

The final PostgreSQL 17 rehearsal restored pre-data, data and post-data with
`--exit-on-error` and per-section transactions. Because managed Auth data was
intentionally excluded, the disposable target received ID-only `auth.users` stubs
derived from restored profile IDs before foreign-key creation; no Auth email,
password hash, token or metadata was copied. Restored facts exactly match staging:
51 public tables, 4 views, 170 routines, 68 policies, 26 triggers, exact history
006–026, and matching counts for profiles, classes, memberships, content, finance,
email, video and rate-limit tables.

The successful dump was 777,267 bytes with SHA-256
`fe1ddbacf4cac93ff2d609bec7e9035806a288157e9c404d721567902c231b40`.
The raw dump, disposable database and temporary login material were removed after
verification; only sanitized counts, hashes and attempt diagnostics remain in
`release-evidence-20260915-staging-restore`. Production requests, connections and
mutations were zero.

This closes the application-schema logical restore sub-gate, not complete Supabase
disaster recovery. Managed Auth and Storage schema/data, Storage object bytes,
database roles, Vault/encryption keys, Edge/provider secrets, redirects, schedules
and Cloudflare/Resend resources were outside this rehearsal and remain an explicit
production blocker until tested with an appropriate disposable Supabase target and
protected configuration/object backups.

### Milestone 51 — authenticated staging role shell passes (15/09/2026)

Changed browser logout to revoke only the current session with Supabase's local
sign-out scope. This prevents one device from invalidating the same user's other
sessions and preserves explicit failure feedback. Added a regression that fixes the
current-session-only contract; TypeScript and all 99/99 Node tests pass. Corrected
the staging dummy-account instructions so they no longer advertise the obsolete
weak password that predates the current seed script.

The guarded staging-only Chromium desktop run then passed the complete role-shell
matrix: Member 7 route/denial checks, scoped Admin 4 route checks and Super Admin 5
route checks. Each dedicated account authenticated through a one-time confirmation,
displayed only its expected navigation, reached its authorised routes and signed out
through the UI. The harness also completed a staging-configured production build.

Attempt v4 stopped at the staging identity lookup before authentication because the
restricted CLI could not reach the network. Attempt v5 reached the browser but found
timing-dependent pre-hydration interactions. The final v6 waits for network idle
before interaction and passed without weakening any authorization assertion.

Outbound email and push providers were disabled and not invoked. Only staging Auth
session creation and logout occurred; raw secrets were not retained. Production
requests, connections and mutations were zero. Sanitized evidence is in
`release-evidence-20260915-authenticated-browser/staging-authenticated-browser-v6.json`.
Complete registration/approval, financial, grading, transfer, notification and
responsive multi-browser workflows remain open and production readiness remains
blocked.

### Milestone 52 — direct Admin payment action exposed (15/09/2026)

Confirmed that the requested direct-payment capability already has a hardened,
staging-accepted database path in migration 021. The scoped
`record_membership_payment` RPC locks the selected charge, checks the caller's dojo
finance access, records the acting Admin, accepts full or partial payment, rejects
closed charges and overpayment, and updates the charge status atomically without a
Member confirmation request.

Closed the UI discoverability gap. The main Payment Confirmations page now provides
a prominent `Record Direct Payment` action into the existing Payments tab. That tab
now explicitly offers `Mark Paid / Record Partial`, explains that no Member request
is required and that the Admin identity is retained, and labels the final audited
action `Confirm Direct Payment`.

Added a regression covering the cross-page entry point, direct-payment RPC,
transaction lock, finance-scope check, acting-Admin audit field and overpayment
denial. Targeted lint and 19/19 focused UI tests pass; TypeScript and the complete
100/100 Node suite pass. The optimized Next.js 16.3.4 production build succeeds
across 46 routes. No migration was required, and staging and production were not
contacted or changed during this UI milestone.

### Milestone 53 — atomic initial-registration approval prepared (15/09/2026)

Deferred the Chinese-system membership labels by product decision. No membership
labels, enum values or existing records were changed; Japanese Mudansha/Yudansha
remain in place until the two Chinese labels are confirmed.

Removed the initial-registration approval partial-failure window. The Admin page no
longer approves a request, queries for the resulting membership and then assigns its
level through a second transaction. It now calls the migration-027 candidate's
single `review_class_request_with_level` RPC, which locks the pending request,
rechecks Super Admin or exact class/dojo Admin scope, records the reviewer, creates
or reactivates the membership with its selected level, and queues the result
notification in one transaction. Any downstream failure rolls back the request and
membership together. The legacy RPC remains unchanged for compatibility.

The PostgreSQL 17 loopback rehearsal passes 12/12 for approved Yudansha assignment,
rejection and normalized reason, existing-membership upsert, wrong-scope denial,
anonymous denial, result notifications, fixed search path, explicit ACLs and forced
notification-failure rollback. The disposable database stopped and was deleted.
Lint, TypeScript and all 101/101 Node regressions pass, and the optimized Next.js
16.3.4 production build succeeds across 46 routes.

Migration 027 is prepared and locally verified only. Staging remains at exact
history 006–026; neither staging nor production was contacted or changed. Applying
027 to staging and running guarded registration acceptance requires a separate
explicit staging-migration approval.

### Milestone 54 — migration 027 staging acceptance complete (15/09/2026)

Applied migration 027 to the explicitly approved Sydney staging project
`eomubndonbetszdbhsrj` only. The guarded apply verified the exact healthy project,
TLS, the reviewed migration SHA-256, pre-apply history 006–026 and post-apply
history 006–027. The new function is owned by `postgres`, is `SECURITY DEFINER`
with a fixed search path, grants execution to authenticated and service roles only,
and retains the legacy review RPC for compatibility. No application data was
mutated by the migration runner.

The transaction-guarded acceptance passes 10/10 and rolls back all test data. It
proves scoped Admin approval with selected Yudansha assignment, rejection,
wrong-scope Admin denial, Member denial, Super Admin approval, and three durable
registration-result emails in `email_outbox`. Independent post-transaction checks
confirm zero fixture residue. Failed attempts v1–v5 were harness corrections only;
each ran in a rolled-back transaction and did not leave staging data behind.

The post-migration authorization smoke passes 12/12 for Member, scoped Admin and
Super Admin, including row privacy, helper isolation and privileged-RPC denial.
Two prior attempts each passed 11/12 but encountered the staging Auth/PostgREST
clock-skew message `JWT issued at future`; all disposable sessions were cleaned up.
The final guarded run allowed fresh JWTs 30 seconds to age and passed 12/12.
Read-only warning-level database lint against exact history 006–027 reports no
schema errors or warnings.

Sanitized evidence is stored in
`release-evidence-20260915-registration-approval`,
`release-evidence-20260913-staging-migrations-022-024`, and
`release-evidence-20260913-content-embed-repair`. Raw credentials were not retained.
Production requests, connections and mutations were zero; production remains
untouched and is not approved for deployment.

### Milestone 55 — repository content mutation boundary hardened (15/09/2026)

Audited every application-side Supabase insert, update, upsert and delete. Server
video, email, push and rate-limit writes remain behind authenticated, scoped routes
or service-only RPCs. The remaining direct browser writes are limited to dojos,
events, ranks and sub-ranks and are paired with their existing Super Admin or exact
class-Admin RLS policies.

Fixed the secondary repository content-management page, which still bypassed the
reviewed content RPCs and attempted a legacy direct delete that current table grants
already reject. Status changes now call `update_repository_content`; legacy
YouTube/Vimeo deletion now calls `delete_repository_content`; managed Cloudflare
retirement continues through its guarded server route.

Prepared migration 028 to revoke direct `INSERT`, `UPDATE` and `DELETE` on
`public.content` from browser roles while retaining RLS-filtered reads and the three
reviewed content-management RPCs. A disposable PostgreSQL 17 loopback rehearsal
passed its privilege assertions and was stopped and removed. The initial sandboxed
attempt could not start the server and changed no database; the corrected local-only
run passed with `MIGRATION_028_RUNTIME_PASS`.

Focused regression coverage passes 3/3. Full lint has zero warnings, TypeScript
passes, all 104/104 Node regressions pass, and the optimized Next.js 16.3.4 build
generates all 46 routes. Migration 028 is prepared and locally verified only;
staging remains exactly 006–027 and production was not contacted. Applying 028 to
staging and running its guarded ACL/security acceptance requires separate explicit
approval.

### Milestone 56 — email-confirmation UX completed locally (15/09/2026)

Audited the public registration, confirmation, login and pending-approval path.
Fixed two lifecycle gaps: successful OTP/PKCE confirmation now produces a clear,
non-reflected success message on login, while disabled-account redirects produce a
specific safe error. Invalid, expired, reused or missing confirmation links now
reach a real `/auth/error` recovery page instead of the previous missing-route 404.
The confirmation handler removes token hashes, OTP types and PKCE codes from every
redirect and does not expose provider failure details.

Added three executable route tests covering email OTP success, PKCE success, token
removal, invalid-link handling and missing-link handling. Added component coverage
for verified and disabled login feedback without reflecting arbitrary query text.
The focused confirmation/accessibility suite passes 23/23. Full lint has zero
warnings, TypeScript passes, all 108/108 Node regressions pass, and the optimized
Next.js 16.3.4 build generates all 47 routes including `/auth/error`.

No database or provider was contacted. This closes the local confirmation-routing
and recovery defect, not the complete live registration gate: actual transactional
email delivery, redirect allowlists/templates and an end-to-end provider-backed
confirmation remain outstanding. Migration 028 also remains locally prepared only;
staging stays exactly 006–027 and production remains untouched.

### Milestone 57 — confirmation recovery browser coverage added (16/09/2026)

Added isolated Playwright coverage for safe verified/disabled login feedback and
the invalid-confirmation recovery page. The recovery test verifies page metadata,
keyboard order, visible links, responsive width and automated WCAG A/AA checks.
The query-feedback test verifies that arbitrary query text is not reflected.

Chromium desktop, tablet and mobile pass all 57 selected browser tests with a clean
exit code, including six executions of the two new confirmation cases. The earlier
restricted runs reported every assertion successful but hung during Windows process
cleanup. Review of the installed Playwright 1.62.1 implementation confirmed that it
uses `taskkill /T /F` for web-server teardown on Windows; allowing the test command
to terminate only its own local process trees produced a normal exit. No application
or security bypass was needed. Sanitized JSON evidence is retained in
`release-evidence-20260916-confirmation-browser/chromium-responsive-v1.json`.

The Firefox project cannot start its pinned executable because Windows reports an
invalid side-by-side configuration. Reinstalling the same Playwright Firefox runtime
completed but did not resolve the host dependency error; all 19 Firefox cases stop
before application execution. WebKit passes all 8 isolated navigation-component
tests but its 11 public application tests reproduce the known HTTP CSP upgrade: it
requests the app's assets at `https://127.0.0.1:3100` while the isolated server is
HTTP-only. Those requests are correctly blocked rather than proxied or trusted
insecurely. Firefox host repair, trusted HTTPS WebKit/Safari execution and remote CI
remain open; they are environment gates, not claimed application passes.

After retaining only the confirmed test additions, full lint passes with zero
warnings, TypeScript passes and all 108/108 Node regressions pass. The last optimized
build remains successful at 47 routes. The browser run used fixed loopback fixtures,
synthetic credentials and no external providers. Staging and production were not
contacted. Migration 028 remains locally prepared and unapplied.

### Milestone 58 — migration 028 staging preflight refreshed (16/09/2026)

Revalidated the reviewed migration 028 artifact before any remote database action.
Its SHA-256 remains
`9438A803D1149515E153097A797DE3707232476962F341FA2CDDCD6B4ADAA6DE`,
matching the previously rehearsed file. The migration revokes direct `INSERT`,
`UPDATE` and `DELETE` privileges on `public.content` from browser roles while
preserving authenticated `SELECT`, service-role writes and the three reviewed
repository-content RPCs.

The focused repository-boundary, authorization-scope and target-safety suite passes
13/13. It verifies that application content mutations use reviewed RPC/server
boundaries, remaining browser writes match the explicit RLS-backed allowlist,
scoped Admin matching remains exact, and the security runner rejects ambiguous
credentials and prevents a known production project from being declared staging.

This was a local-only preflight. Neither staging nor production was contacted or
changed. Migration 028 remains unapplied and requires explicit approval naming the
staging project `eomubndonbetszdbhsrj` before guarded apply and post-migration
acceptance/security testing.

### Milestone 59 — migration 028 staging acceptance complete (16/09/2026)

Applied migration 028 to the explicitly approved Sydney staging project
`eomubndonbetszdbhsrj` only. The successful guarded v5 run verified the exact
healthy staging identity, TLS, reviewed migration SHA-256, pre-apply history
006–027 and post-apply history 006–028. Independent remote migration listing also
confirms exact local/remote agreement through 028.

Post-apply database assertions confirm RLS remains enabled on `public.content`.
Authenticated users retain policy-filtered `SELECT` and execution of the reviewed
create, update and delete repository-content RPCs, but no longer have direct
`INSERT`, `UPDATE` or `DELETE`. Anonymous browser writes remain denied and
service-role writes remain available. The migration changed privileges only and
mutated zero application rows. Warning-level database lint reports no schema
errors or warnings.

The live staging authorization smoke passes 12/12 for Member, scoped Admin and
Super Admin, covering role identity, row isolation, archive and delivery privacy,
payment and finance privacy, helper isolation and privileged-RPC denial. All three
disposable one-time sessions were logged out successfully. Staging email/phone
providers remained disabled before and after testing, no outbound email or phone
delivery was requested, and the staging Edge Function/secret inventory remained
empty.

Apply attempts v1–v4 stopped before the migration command because the restricted
Windows process could not use the CLI identity/telemetry store; their evidence
records `migrationCommandStarted: false`. The corrected v5 run used the existing
approved Windows credential context and passed. Sanitized evidence is stored in
`release-evidence-20260916-content-acl/staging-migration-028-apply-v5.json` and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v8.json`.
No raw credentials or raw migration output were retained. Production requests,
connections and mutations were zero; production remains untouched.

### Milestone 60 — complete browser-write boundary regression guard (16/09/2026)

Repeated the whole-application Supabase mutation audit after staging migration 028.
Repository content now uses the reviewed RPCs in browser code, while Cloudflare
video lifecycle writes remain inside authenticated, class-scoped server routes.
The only remaining direct browser table mutations are the previously reviewed
`dojos`, `events`, `ranks` and `sub_ranks` operations, protected by their exact
Super Admin or class-Admin RLS policies. No additional browser mutation boundary
was found, so the raw privileged-write production-hardening item is complete.

Strengthened the regression test from a four-file spot check to a recursive scan of
every client-side TypeScript/TSX file under `app` and `components`. It now fails if
any new direct browser table mutation appears outside the exact file/table allowlist.
The focused boundary suite passes 3/3, the full Node suite passes 108/108, lint has
zero warnings, and TypeScript passes. No remote provider or database was contacted
and no production or staging data changed during this local milestone.

### Milestone 61 — privileged-function semantic ordering guard (16/09/2026)

Started the complete semantic authorization review without contacting a remote
database. The retained staging catalog contains definitions for all 108 routines in
the browser RPC allowlist; its data-mutating routines each contain a caller or
scope-authorization marker. This inventory result is supporting evidence only and
does not replace live behavior tests.

Added a body-aware SQL regression that resolves the latest checked-in definition of
each browser-executable `SECURITY DEFINER` routine and inspects actual function
bodies rather than attribute markers. All 19 browser-exposed privileged mutators
represented in the migration sources authorize through `auth.uid()` or a reviewed
role/scope helper before their first `INSERT`, `UPDATE`, `DELETE` or `TRUNCATE`.
The test will fail if authorization is removed or moved after the first write.

The complete SQL security suite passes 19/19, the full Node suite passes 109/109,
lint has zero warnings, and TypeScript passes. No remote provider or database was
contacted and no data changed. The broader production-hardening item remains open:
each privileged business workflow still needs role-specific live staging behavior
tests, including successful in-scope execution and denied cross-scope execution,
before complete semantic authorization can be claimed.

### Milestone 62 — grading serialization repair prepared and rehearsed (16/09/2026)

Parallel workflow, function and test audits identified two genuine grading defects
in `promote_membership`: it calculated progression without locking the membership,
so concurrent calls could record the same stale next grade, and it accepted dates
earlier than the latest valid promotion, allowing the current membership rank to
disagree with certificate/history and undo ordering.

Prepared migration 029 to authorize the caller before locking, reload and re-check
scope under `FOR UPDATE`, calculate progression only after the lock, and reject a
promotion date earlier than the latest non-revoked grading record. Existing assessor
rules, normalized name snapshots, membership updates, history retention, ownership
and authenticated/service-role grants are preserved. Anonymous and PUBLIC execution
remain denied. Migration 029 is local-only and has not been applied to staging or
production.

Added a body-aware source regression and disposable PostgreSQL 17 fixtures. The
loopback rehearsal passes 8/8: runtime lock observation before progression,
successive state calculation, backdate rejection without mutation, scoped Admin
success and cross-class denial, Member and missing-identity denial, Super Admin
success, assessor snapshot behavior and ACLs. The synthetic server stopped cleanly.
The initial restricted v1 attempt stopped during local `initdb`; elevated local v2
passed and neither attempt made a remote connection. Full Node regressions pass
110/110, the SQL security suite passes 20/20, lint has zero warnings, and TypeScript
passes. Evidence is in `release-evidence-20260916-grading-029`.

The parallel finance-configuration audit also found the next development tranche:
bounded member-rate changes can lose a later interval tail, current-rate removal is
still effective through today despite immediate-removal UI wording, the Admin UI can
select an expired/superseded active override, and a future dojo rate can leave a
legacy pre-history interval unresolved. Those findings are not fixed or claimed as
tested in this milestone.

### Milestone 63 — migration 029 staging grading acceptance complete (16/09/2026)

Applied migration 029 to the explicitly approved Sydney staging project
`eomubndonbetszdbhsrj` only. The guarded apply verified the exact healthy staging
identity, reviewed migration SHA-256
`3EF9106FC364C4CC60602D0875C518175031CF363BBB477C6AD0293D14A65EE6`, pre-apply
history 006–028, a dry run containing only migration 029, and exact post-apply history
006–029. Warning-level database lint reports no schema errors or warnings.

The rollback-contained grading acceptance passes 12/12. It proves the reviewed
function boundary, scoped Admin and Super Admin success, cross-scope Admin and Member
denial, backdate rejection with zero mutation, retained internal/external assessor
facts, and zero mutation from denied calls. An independent connection confirmed exact
history 006–029 and zero fixture residue across classes, dojos, ranks, memberships and
grading history.

The post-migration authorization smoke passes 12/12 for Member, scoped Admin and Super
Admin. All disposable sessions were cleaned up, staging Auth providers remained
disabled, and no outbound delivery was requested. Sanitized evidence is retained in
`release-evidence-20260916-grading-029-staging/staging-grading-029-acceptance-v1.json`
and `release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v9.json`.
Production requests, connections and mutations were zero; production remains untouched.

### Milestone 64 — subscription-rate interval repair prepared locally (16/09/2026)

Prepared migration 030 to preserve both sides of bounded Member override intervals,
retain dojo baseline history, handle future-rate scheduling without legacy gaps, and
give rate removal explicit end-of-today semantics while cancelling future rows. Updated
the Admin subscription UI to select the current override first, otherwise the nearest
future override, ignore expired overrides and use a stable tie-break; explanatory
wording now matches the database behavior.

Independent review found and corrected a same-effective-date dojo-rate reversal defect:
idempotency now compares only the latest winning history row, so an intentional
`A → B → A` correction is not suppressed by the older A record. The full Node suite
passes 115/115, lint has zero warnings, TypeScript passes, and the optimized production
build succeeds at 47 routes. Migration 030 SHA-256 is
`A4C429C36F3D3E10537683210B593A514B24E0B2DAEF33F8F455A0B26323F202`.

The isolated PostgreSQL 17 runtime rehearsal passes 10/10 against staging-compatible
fixtures, including bounded and open-ended tails, leading overlap, future/backdated
dojo resolution, same-date `A → B → A` correction inside one transaction,
end-of-today removal semantics, function shapes and grants. The reviewed implementation
assigns a strictly increasing change timestamp after the serialized dojo lock, avoiding
transaction-stable `now()` and random-UUID ordering ties. The loopback-only server
stopped cleanly and made zero remote connections; evidence is retained under
`release-evidence-20260916-subscription-030/postgres17-migration-030-v7`.

Migration 030 and its UI/test changes remain local-only. They have not been applied to
staging or production and now require separate, explicit staging approval before a
guarded apply and subscription/security acceptance run. Production was not contacted
or changed.

### Milestone 65 — migration 030 staging subscription acceptance complete (16/09/2026)

Applied migration 030 to the explicitly approved Sydney staging project
`eomubndonbetszdbhsrj` only. Fresh guards verified the exact healthy staging identity,
reviewed SHA-256 `A4C429C36F3D3E10537683210B593A514B24E0B2DAEF33F8F455A0B26323F202`,
pre-apply history 006–029 and a dry run containing only
`030_preserve_subscription_rate_intervals.sql`. The apply output named only migration
030, and independent post-apply listing confirms exact history 006–030. Warning-level
`public` schema lint reports no errors or warnings.

The rollback-contained subscription acceptance passes 15/15. It verifies function
ownership, `SECURITY DEFINER` settings, fixed search paths and grants; scoped Finance
Admin success; cross-scope Admin and Member denial with zero mutation; service-only
rate resolution; bounded interval tail preservation; historical, future and backdated
dojo rate resolution; same-date `A → B → A` serialized ordering; end-of-today removal;
and future override cancellation. An independent read-only connection confirmed exact
history 006–030 and zero fixture residue across classes, dojos, memberships, assignments,
settings, rate history and Member overrides.

The post-migration role security smoke passes 12/12 for Member, scoped Admin and Super
Admin. All disposable sessions were cleaned up, staging email and phone providers stayed
disabled, and no outbound delivery was requested. Evidence is retained in
`release-evidence-20260916-subscription-030-staging/staging-migration-030-apply-v1.json`,
`release-evidence-20260916-subscription-030-staging/staging-subscription-030-acceptance-v1.json`
and `release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v10.json`.
Production database connections and mutations were zero; production remains untouched.

### Milestone 66 — post-030 staging catalog baseline completed (16/09/2026)

Exported a fresh read-only staging catalog after migration 030 and reviewed public
and storage relations, columns, views, indexes, constraints, triggers, policies,
table/column/routine privileges, routines, types, sequences, default privileges,
extensions, publications, migration history, role context and normalized identity
duplicates. The authoritative evidence is retained under
`release-evidence-20260916-staging-catalog-post-030-v2` in the project evidence
workspace.

The baseline confirms exact migration history 006–030; 66 relations and 59 tables;
RLS enabled on every table; 68 policies; 188 routines; 156 `SECURITY DEFINER`
routines with zero missing the reviewed fixed search path; 775 columns; 188 indexes;
313 constraints; 21 triggers; 81 types; 3 sequences; 5 extensions; and zero
normalized profile identity duplicates. Platform-owned `supabase_admin` public
default privileges remain an explicit owner/platform review blocker. The database
was read only during this export, and production was not contacted.

### Milestone 67 — recovery gate and cross-engine responsive browser gate (16/09/2026)

Added a fail-closed recovery-readiness validator, 5 executable recovery tests, a
versioned manifest template and an operator runbook. The gate inventories the
application database, managed Auth users/identities/configuration, Storage metadata
and private object bytes, roles/grants, Vault/encryption dependencies, Resend,
push/VAPID, Cloudflare Stream, schedules and hosting configuration. It rejects a
production restore target, any production mutation, incomplete evidence, unsafe
retention and exceeded recovery objectives. A complete restore rehearsal still
requires a protected disposable Supabase target plus operator-controlled provider
and backup access, so no recovery success is claimed yet.

Expanded the isolated browser fixture with the rejected Member reapply, pending and
cancel enrolment lifecycle, deterministic mock RPCs and labelled Class/Dojo/Note
controls. Fixed Safari/WebKit compatibility for native dark form controls and
explicit sequential focus on authentication recovery links, and made the browser
tests type fields through real keyboard input to avoid WebKit automation autofill
interference. The production CSP still upgrades insecure requests; only the exact
fixed loopback browser-smoke environment omits that directive.

Chromium passes 60/60 and WebKit passes 60/60 across 1440px desktop, 768px/iPad
tablet and 390px/iPhone mobile profiles, including automated WCAG A/AA checks.
The final local release gate passes 121/121 Node regressions, lint with zero warnings,
TypeScript and an optimized 47-route production build. The Firefox retry stopped
before all 20 cases because its pinned executable cannot launch on this Windows host
(`spawn UNKNOWN`); no Firefox application assertion ran. These checks used fixed
loopback fixtures only. Staging and production were not contacted or mutated.

### Milestone 68 — legacy finance/settlement SQL isolated from the active chain (16/09/2026)

Closed the root-level SQL reconciliation blocker without rewriting migration
history. The conflicting `migrations/004_finance_module.sql`,
`004_subscription_module.sql` and `005_settlement_module.sql` files remain
unchanged as immutable design evidence. Their SHA-256 fingerprints, overlapping
version/function conflict and non-executable status are now documented in
`migrations/README.md`. Only `supabase/migrations` is an active migration source.

Added an executable migration-layout guard that requires exactly one contiguous
active sequence 006–030, rejects duplicate active versions, pins every legacy SQL
fingerprint and requires the non-executable warning to remain present. Updated the
main database-release documentation to reflect staging acceptance through 030 and
to forbid legacy-draft use by deployment tooling. The focused guard passes 2/2;
the full local suite passes 123/123 with TypeScript clean, and lint exits cleanly
with zero warnings. No database or provider was contacted and no data changed.

### Milestone 69 — parallel workflow, provider, browser-CI and test-account hardening (16/09/2026)

Completed four coordinated local release-hardening lanes. Administrative Excel
exports now neutralize formula-like Member/admin text and report titles while
preserving numeric values, and fail closed if no columns are defined. Member,
individual Admin and batch dojo-transfer rejection paths now require a nonblank
reason before any mutation RPC. Added cross-workflow source contracts covering
grading/assessors, titles/certificates/archive/audit, transfers,
payments/subscriptions, settlements and exports.

Added an offline fail-closed provider configuration gate and operations runbook.
The gate checks the exact Supabase target and deployment/video origins, sender
configuration, strong distinct secrets, matching VAPID P-256 keys, Cloudflare
identifiers and playback TTL without printing values or contacting providers.
Activation emails reject malformed or executable links; Cloudflare configuration
rejects insecure, wildcard, credential/path-bearing or duplicate origins; push
delivery, subscription-state and unexpected failures now produce explicit safe
non-success responses. `npm run provider:check` exposes the offline gate.

Hardened staging dummy-account handling without deleting the accounts still needed
for acceptance. The seed is now staging-only, requires an exact project ref and a
protected strong password rather than storing a shared password in source. Cleanup
is audit-first, requires both independent account markers and a token bound to the
exact project/candidate set, rejects production/staging mislabelling, requires an
extra production acknowledgement and independently verifies zero marked Auth users
after deletion. Final deletion and orphan checks remain deliberately deferred until
all staging acceptance is complete.

Added browser-engine host preflight and split CI into independent Chromium/Linux,
Firefox/Linux, WebKit/Linux and WebKit/macOS jobs with per-engine evidence. Firefox
still cannot launch on this Windows host (`spawn UNKNOWN`), but now fails once before
the app/build instead of producing misleading application failures. Playwright
WebKit/device profiles remain compatibility evidence, not a substitute for physical
macOS/iOS Safari testing or an executed remote CI run.

The combined local gate passes 151/151 Node regressions, TypeScript, lint with zero
warnings and the optimized 47-route production build. A freshly rebuilt isolated
desktop matrix passes 40/40 across Chromium and WebKit with clean process exit; the
previous responsive matrices remain 60/60 for each engine. No staging, production,
Resend, push or Cloudflare endpoint was contacted, and no data or provider asset was
mutated in this milestone.

### Milestone 70 — Cloudflare cancelled and YouTube-only repository prepared (17/09/2026)

Implemented the approved v1 change from Cloudflare Stream to organization-owned
Unlisted YouTube. Removed the active upload/finalize/webhook/signed-playback routes,
provider adapter, upload component, provider-specific tests and TUS dependency. Admin
Content now accepts only YouTube URLs or exact 11-character IDs; parsing uses exact
HTTPS host allowlists and rejects lookalike hosts, credentials, insecure URLs and
malformed IDs. Member playback uses `youtube-nocookie.com` under the narrowed CSP.

Preserved the two requested non-personalized client overlays: the Jingwuguan Seibukan
organization logo and current class logo. A class-logo URL change takes effect without
re-uploading videos; the organization asset updates on deployment. Documentation now
states the security limit accurately: Unlisted links are shareable, overlays are not
DRM or burned-in watermarks, and native fullscreen/browser modification may hide them.
The provider readiness gate now covers Supabase, Resend/email worker and VAPID/push
only; no YouTube API key is required for embed-only playback.

Migrations 024–025 remain immutable because they were already applied to staging;
their managed-video schema is dormant. Prepared migration 031 adds a fail-closed
YouTube-only content constraint and refuses to apply if existing content contains a
non-YouTube or malformed video pair. It performs no content updates or deletions.
Migration SHA-256 is
`2A7655984621266ABB0541D007FFEB372B5AB0BD05C7B26201AB42BC19CCD987`.
It is local-only and requires explicit staging approval after a read-only data
preflight. Staging remains exact 006–030; production was not contacted.

The final local source gate passes TypeScript and 134/134 Node regressions, lint with
zero warnings, a production-only dependency audit with zero known vulnerabilities,
and an optimized 43-route build. A fresh Chromium/WebKit desktop/tablet/mobile run
passes 120/120 with a clean report and process exit when allowed to manage its own
local browser/server child processes. The earlier restricted runs passed every test
body but could not terminate the process tree; the clean run proves this was execution
sandbox process control, not an application assertion failure. Remote CI remains open.
No staging, production, Cloudflare, YouTube, Resend or push endpoint was contacted,
and no database row or provider asset changed.

### Milestone 71 — migration 031 staging preflight and guarded package ready (17/09/2026)

Ran a guarded transaction-read-only preflight against exact healthy Sydney staging
`eomubndonbetszdbhsrj`. TLS and read-only mode were confirmed, migration history is
exactly 006–030, and migration 031 SHA-256 remains
`2A7655984621266ABB0541D007FFEB372B5AB0BD05C7B26201AB42BC19CCD987`.
Staging contains zero repository content rows, partial pairs, YouTube/Vimeo/other
provider rows, managed video sources/assets/events, watermark profiles and legacy
`repository-video-originals` Storage objects. The migration compatibility preflight
passes without any mutation. Production requests, connections and mutations were zero.

Prepared an exact-target apply guard and rollback-contained post-apply acceptance
package under `release-evidence-20260917-youtube-031`. The apply runner requires an
explicit staging approval switch, verifies pinned tooling and the 031 hash, requires
exact source migrations 006–031, performs an isolated Supabase dry run, refuses any
unexpected pending migration, scans output for secrets/production references, applies
only 031 and verifies unchanged row counts. The acceptance runner requires separate
approval and performs 15 actual constraint, RLS and ACL assertions in one transaction
that always rolls back, followed by an independent zero-residue query. All three
PowerShell runners parse cleanly; the acceptance SQL has zero COMMIT statements,
exactly one ROLLBACK and 15 counted assertions. Neither prepared runner was executed.

### Milestone 72 — migration 031 applied; corrective 032 prepared (17/09/2026)

Applied migration 031 to explicitly approved Sydney staging
`eomubndonbetszdbhsrj` only. The guarded v1 apply verified the reviewed SHA-256,
healthy Sydney identity, exact pre-apply history 006–030, an isolated dry run naming
only migration 031, and exact post-apply history 006–031. Independent catalog checks
confirmed the legacy constraint was removed, the new constraint was validated, and
content, video-source, video-asset, video-event, watermark-profile and legacy Storage
object counts all remained zero. Production requests, connections and mutations were
zero.

The rollback-contained YouTube acceptance suite then caught a real defect: migration
031's second `CHECK` branch did not explicitly require both columns to be non-null, so
a provider-only or ID-only row could evaluate to SQL `UNKNOWN` and be accepted. The
suite stopped at the provider-only probe. Attempt v5 independently verified exact
history 006–031 and zero residue in every affected table/bucket; no acceptance fixture
was committed. Migration 031 remains immutable applied history.

Prepared corrective migration 032 with explicit `video_provider IS NOT NULL` and
`video_id IS NOT NULL` guards, fail-closed compatibility preflight, table lock,
validated postflight and no application-row rewrite. Its SHA-256 is
`D9FE3E65D02149E63DB9DB4CB9CF88465CBEA5024AAC110143710F90303C1526`.
The guarded staging apply and 15-assertion rollback acceptance package is retained in
`release-evidence-20260917-youtube-032`; both PowerShell scripts parse, and the SQL has
zero COMMIT statements, one ROLLBACK and 15 assertion increments. Migration 032 was
not applied and requires a new explicit approval naming it and the exact staging ref.

The approved post-031 authorization smoke passed 12/12 on its clean retry for Member,
scoped Admin and Super Admin, including row/scope privacy and privileged-RPC denial.
The first run had one transient `JWT issued at future` Admin-role failure; all other
checks passed, session cleanup succeeded, and the immediate clean retry passed every
check. Email/phone providers stayed disabled, all one-time sessions were revoked, and
no outbound delivery occurred. The local release gate passes 135/135 Node regressions,
TypeScript, lint with zero warnings and the optimized 43-route production build.
Production remained untouched.

### Milestone 73 — migration 032 staging acceptance complete (17/09/2026)

Applied corrective migration 032 to explicitly approved Sydney staging
`eomubndonbetszdbhsrj` only. The guarded v1 apply pinned SHA-256
`D9FE3E65D02149E63DB9DB4CB9CF88465CBEA5024AAC110143710F90303C1526`,
verified the exact healthy staging identity and pre-apply history 006–031, selected
only `032_enforce_complete_youtube_video_pairs.sql`, and confirmed exact post-apply
history 006–032. The validated constraint now requires both `video_provider` and
`video_id` to be non-null for a YouTube pair. Content, video sources/assets/events,
watermark profiles and legacy video Storage-object counts remained zero; the
migration rewrote no application rows.

The rollback-contained YouTube acceptance passes 15/15. It accepts the absent pair
and a valid complete YouTube pair, rejects Vimeo, malformed IDs, provider-only,
ID-only and invalid-update probes, preserves the repository RLS/ACL boundary, and
always rolls back. A separate read-only connection verified exact history 006–032
and zero residue across every monitored relation and bucket.

The post-migration role-security suite passed 12/12 on clean attempt v14 for Member,
scoped Admin and Super Admin. Attempt v13 passed 11/12 but one freshly issued Member
token encountered the same transient Supabase `JWT issued at future` condition seen
previously; all temporary sessions were revoked on both attempts and the clean retry
passed every role, isolation, privacy and privileged-RPC denial check. Auth providers
remained disabled and no email or phone delivery was requested.

Evidence is retained in
`release-evidence-20260917-youtube-032/staging-migration-032-apply-v1.json`,
`release-evidence-20260917-youtube-032/staging-youtube-032-acceptance-v1.json` and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v14.json`.
Production requests, connections and mutations were zero; production remains
untouched.

### Milestone 74 — current-ledger grading, assessor and title acceptance (17/09/2026)

Refreshed the live functional evidence against exact staging migration history
006–032 rather than relying only on the earlier 006–019 and 006–029 runs. The
staging-only suite passed 14/14 in one transaction that always rolled back. It
proved Super Admin-only assessor mutation; enable, deactivate, active-list removal
and reactivation; scoped Admin promotion; wrong-scope Admin and Member denial;
Member and normalized external assessor snapshots; backdate rejection; promotion
undo with retained revoked history; grade-certificate original/reprint idempotency;
revoked-grade certificate denial; ordered titles; title certificate logging; and
reasoned title revocation with retained audit history.

An independent read-only connection confirmed exact history 006–032 and zero
fixture residue across classes, dojos, ranks, memberships, grade/title history,
grade/title certificates, and both print logs. The evidence package is retained in
`release-evidence-20260917-grading-title-current`, including
`staging-grading-title-current-acceptance-v1.json`. This closes the grading,
assessor-lifecycle and title functional checklist items. The broader archive/report
search, PDF/UI rendering and export-log gate remains open. Production requests,
connections and mutations were zero.

### Milestone 75 — current-ledger certificate, archive and report acceptance (17/09/2026)

Completed a 22-check rollback-contained staging suite at exact migration history
006–032. Scoped Admin certificate history, original/reprint logs, official member
report audit creation and archive searches by reference/group/type/class/dojo/status
all passed. A wrong-class Admin and ordinary Member saw no protected certificate,
report or archive rows and were denied print-detail and report-generation calls;
Super Admin visibility passed. Grade and title certificates remained searchable with
their print history and reasoned revoked status after the source awards were undone.

Attempt v1 exposed a harness diagnostic issue when PostgreSQL closed stdin early.
Attempt v2 then showed a fixture-only identity assumption: report audit IDs and
archive row IDs are intentionally distinct and correlated by immutable document
reference/source metadata. Both attempts rolled back. The corrected v3 suite passed
22/22, and an independent read-only connection confirmed exact history 006–032 plus
zero residue across classes, dojos, ranks, memberships, grade/title history,
certificates, print logs, report audits, archived documents and the archive view.

Evidence is retained under `release-evidence-20260917-archive-report-current`, with
the successful result in `staging-archive-report-current-acceptance-v3.json`. This
closes the database portion of the certificate/archive/report functional gate.
Visual PDF rendering and real browser export/download behavior remain open.
Production requests, connections and mutations were zero.

### Milestone 76 — current-ledger settlement acceptance refreshed (17/09/2026)

Refreshed the high-risk financial settlement workflow against exact staging history
006–032. The rollback-contained suite passed 30/30 for configuration history,
eligible payment selection, atomic drafts, deterministic gross/share calculations,
transfer evidence, submission notifications, rejection and resubmission, approval
and immutable archive, cancellation, released-payment reuse, and Member/wrong-dojo
authorization denial.

The temporary database login remained bounded, the transaction rolled back, and an
independent read-only connection confirmed exact history 006–032 with zero fixture
classes, dojos or settlements. Evidence is retained under
`release-evidence-20260917-settlement-current`, including
`staging-settlement-current-acceptance-v1.json`. This closes the settlement
functional checklist item at the current migration boundary. Production requests,
connections and mutations were zero.

### Milestone 77 — provider operations and email-delay hardening (17/09/2026)

Prepared local-only migration 033 to replace the email queue health function with a
two-minute overdue-ready signal that respects future retry backoff. The function
remains service-role-only and performs no email-outbox row mutation. The email worker
now returns a normalized, non-sensitive queue-health summary and non-success status
for unhealthy or unverifiable state. Push notification targets are constrained to
same-origin application paths in both the sender and service worker, and the Admin
YouTube preview now uses the hardened embed contract.

Focused provider tests pass 33/33. The integrated local gate passes 143/143 Node
tests, TypeScript, lint, a 41-route production build and a production dependency audit
with zero known vulnerabilities. Migration 033 SHA-256 is
`EBECFED6BFBDA61B573512229313EA72DEC5DC30F73972654346C363387B725F`.
It was not applied; staging, production and external providers were not contacted.
Evidence is retained under `release-evidence-20260917-provider-operations-local`.

### Milestone 78 — browser export and Archive acceptance (17/09/2026)

Completed fresh-build desktop browser acceptance in Chromium and WebKit, passing
23/23 in each engine. Certificate and official-report Excel files were downloaded,
opened with SheetJS and validated against their expected workbook rows. Archive was
confirmed to be intentionally view-only. A missing accessible-dialog contract on the
Archive record modal was found and corrected. Staging, production and provider
requests were zero. Evidence is retained under
`release-evidence-20260917-browser-exports`.

### Milestone 79 — PDF visual and structural acceptance (17/09/2026)

Generated non-production stress samples for the grade certificate, title certificate
and official member record. Every final page was rendered and inspected at original
resolution: grade 1/1, title 1/1 and member record 3/3 passed with no clipping,
overlap, broken table rows, extra certificate pages or unreadable glyphs. The review
corrected certificate overflow, long-value wrapping and a collapsed title detail
column. `pdfinfo` and `pypdf` confirmed A4 page geometry, 1/1/3 page counts,
unencrypted output and representative required text. No live service or member data
was used. Evidence is retained under `release-evidence-20260917-pdf-visual-current`.

### Milestone 80 — current-ledger transfer acceptance refreshed (17/09/2026)

Completed a 21-check rollback-contained transfer suite against exact staging history
006–032. It proved Member and wrong-dojo denial, duplicate/missing batch atomicity,
source/destination/isolation scope, one routed email-outbox notification, review
authorization, future scheduling, Super-Admin-only rescheduling, application/history
idempotency, cancellation, rejection, failure recording and retry. Final facts were
two of two batch rows applied, three transfer-history rows, one outbox notification,
and three destination memberships.

Attempts v1–v3 safely exposed fixture assumptions about migration-023 notification
routing, server-only RPC ACLs and the hardened browser batch wrapper; each rolled back
with independent zero residue. Corrected v4 passed 21/21, and a separate read-only
connection confirmed exact history and zero fixture residue. No migration was applied;
production and providers were not contacted. Evidence is retained under
`release-evidence-20260917-transfer-current`.

### Milestone 81 — migration 033 staging apply and email-health acceptance (17/09/2026)

Applied only migration 033 to explicitly approved Sydney staging
`eomubndonbetszdbhsrj`. The guarded runner pinned SHA-256
`EBECFED6BFBDA61B573512229313EA72DEC5DC30F73972654346C363387B725F`,
verified the exact healthy staging identity and pre-apply history 006–032, selected
only `033_email_queue_operational_health.sql`, and confirmed exact post-apply history
006–033. The email-outbox row count remained one before and after; no application
row was changed. The health function now uses the two-minute ready-time threshold,
respects `next_attempt_at` backoff, and remains executable by `service_role` only.

The corrected rollback-contained email-health suite passed 12/12. It proved actual
`anon` and `authenticated` execution denial, `service_role` execution, overdue
pending detection, future pending scheduling, future retry backoff, overdue retry
detection, exhausted retry detection and baseline restoration. Attempt v1 exposed
only a session-local test-helper ACL issue and rolled back with zero residue. Attempt
v2 passed, and a separate read-only connection confirmed exact history 006–033, one
baseline queue row, zero fixture rows, healthy final status and the intended ACL.

The broader role-security attempt v15 passed 11/12; its only failure was the known
transient `JWT issued at future` response on a freshly issued Member session. All
sessions were revoked and outbound providers stayed disabled. Clean retry v16 passed
12/12 for Member, scoped Admin and Super Admin. Evidence is retained under
`release-evidence-20260917-email-health-033` and in the v15/v16 security reports under
`release-evidence-20260913-staging-migrations-022-024`. Production and external
providers were not contacted.

### Milestone 82 — production region selected (17/09/2026)

Recorded the product decision that the eventual production Supabase primary must be
created in Singapore (`ap-southeast-1`) for the Jakarta/Indonesia user base. Sydney
`eomubndonbetszdbhsrj` remains staging only and will not be promoted or relabelled as
production. The deployment runbook now requires a separate Singapore project,
independent identity/region verification, protected recovery point, full
database/Auth/Storage/configuration migration, environment and redirect changes,
and fresh security/workflow/browser acceptance before cutover.

No Singapore project was created, no paid resource was enabled, no database was
migrated, and neither staging nor production was contacted for this documentation
decision.

### Milestone 83 — current-ledger payment acceptance refreshed (17/09/2026)

Completed a 23-check rollback-contained payment suite against exact staging
migration history 006–033. It proved Member-owned confirmation submission,
cross-Member denial, scoped Admin listing/review, wrong-dojo denial, rejection with
reason and reapplication, linked partial and full payments, duplicate-review and
overpayment denial, waived-charge protection, fee-adjustment locking, and the
explicit Admin direct-payment path without a Member request. Expected Admin and
Member notifications were created inside the transaction.

The current authorization boundary was also verified: anonymous payment RPC
execution is denied; confirmations remain RPC-only; official payment rows are
RLS-scoped to the owning Member or assigned dojo-finance Admin; and a Super Admin
does not automatically gain dojo-finance access unless separately assigned. Attempts
v1 and v2 safely identified harness assumptions about the grant-plus-RLS model and
intentional Super Admin finance separation. Both rolled back; v2 independently
confirmed zero residue. Corrected v3 passed 23/23, and an independent read-only
connection confirmed exact history 006–033 with zero fixture classes or dojos.

Evidence is retained under `release-evidence-20260917-payment-current`, including
`staging-payment-current-acceptance-v3.json`. No migration was applied, no payment
provider was contacted, and production requests, connections and mutations were
zero.

### Milestone 84 — repository/event defects repaired and rehearsed (17/09/2026)

The current staging diagnostic confirmed four related release defects at exact
history 006–033: `break_1` and `break_2` Members pass the repository page guard but
are rejected by `has_repository_access`; class Admins cannot read draft content;
Super Admins cannot read content required by the management UI; and migration 010
is recorded while its event/announcement in-app notification functions and triggers
are absent from the restored schema. Every diagnostic attempt rolled back, and
independent read-only checks found zero fixture residue.

Prepared migration 034 to align repository RLS with the existing UI and mutation
RPC boundary, retain caller binding and browser write denial, restore eligible
break-state access, add manager visibility for draft and published content, and
restore the missing event/announcement trigger helpers with browser execution
revoked. The staging-only migration rehearsal passed 27/27 inside a transaction that
always rolled back. It proved active/break access, inactive/wrong-class isolation,
Member and wrong-class mutation denial, scoped Admin and Super Admin management
visibility, class/rank/tier integrity, valid YouTube pairs, event create/update
fan-out, no-op update idempotency, announcement publish idempotency, Super-Admin-only
manual email queueing, the three-send maximum, nine deduplicated outbox rows, and
zero external provider calls.

The full local suite passes 144/144 including TypeScript, focused SQL security tests
pass 23/23, lint is clean, and the production build completes all 41 routes. Migration
034 SHA-256 is
`42F74C01B81FFFF15B33278BA950F02DD97002A2B6224A20D7ECB8CFE7671145`.
Evidence is retained under `release-evidence-20260917-repository-events-current`,
including `staging-repository-events-rehearse034-v2.json`. Migration 034 is prepared
but not applied. Production and external providers were not contacted.

### Milestone 85 — migration 034 applied and accepted on staging (17/09/2026)

Applied only migration 034 to explicitly approved Sydney staging
`eomubndonbetszdbhsrj`. The guarded runner pinned SHA-256
`42F74C01B81FFFF15B33278BA950F02DD97002A2B6224A20D7ECB8CFE7671145`,
verified exact pre-apply history 006–033, selected only the reviewed migration in
the CLI dry run, and confirmed exact post-apply history 006–034. Repository helper,
manager policy, restored notification functions/triggers and trigger-only ACLs all
passed postflight. Counts for classes, content, events, announcements, notifications
and email outbox were unchanged, proving zero application-data mutation.

The rollback-contained post-apply repository/event suite passed 27/27. Active and
supported break-state Members received only published in-class repository rows;
inactive and wrong-class Members received none. Class Admin and Super Admin
management visibility, mutation denials, class/rank/tier integrity, complete YouTube
pairs, event create/update fan-out, no-op update idempotency, announcement publish
idempotency, three-send email queue limits and nine deduplicated outbox fixtures all
passed. The transaction rolled back and an independent read-only connection
confirmed exact history 006–034 with zero fixture residue. No email was delivered.

The subsequent live role-security suite passed 12/12 for Member, scoped Admin and
Super Admin. Auth providers remained disabled, Edge Functions and secrets remained
empty, all temporary sessions were revoked, and no email or phone delivery was
requested. Evidence is retained in
`release-evidence-20260917-repository-events-current/staging-migration-034-apply-v7.json`,
`staging-repository-events-postapply-v1.json`, and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-024-v17.json`.
Production requests, connections and mutations were zero.

### Milestone 86 — real-browser PDF and responsive-print acceptance (17/09/2026)

Completed isolated loopback-only PDF acceptance in Chromium and Playwright WebKit.
Both engines downloaded the official Member record, grade certificate and title
certificate as non-empty PDF files with safe expected filenames. Desktop, tablet
and mobile layouts had no horizontal overflow and kept all PDF controls visible.

The first run exposed a production CSP block on React-PDF's embedded WebAssembly
layout engine. The CSP now permits only `wasm-unsafe-eval` plus the required `data:`
connection while continuing to reject general production `unsafe-eval`; a focused
regression protects that boundary. Corrected evidence passes with staging,
production and provider contacts all zero under
`release-evidence-20260917-browser-pdf-print`.

### Milestone 87 — Member lifecycle defect found and migration 035 rehearsed (17/09/2026)

The current staging diagnostic completed 31/33 checks and proved that monthly
Break progression produced two audit-history rows for each Break 1 -> Break 2 and
Break 2 -> Inactive transition. The enabled status-change trigger and the processor
were both writing the same history row; all state changes, authorization checks and
rollback facts otherwise passed.

Prepared migration 035 makes the trigger the sole history writer for both scheduled
Break activation and monthly progression, preserves the two service-only function
contracts, and does not rewrite historical data. Its rollback-only staging rehearsal
passes 35/35 at exact live history 006–034, including permanent IDs, normalized
uniqueness, multi-class scope, Aikikai eligibility, immediate/scheduled Breaks,
monthly idempotency, return and rejection. Independent checks prove zero residue.
Migration 035 SHA-256 is
`2952CD9834C5659968DB7DBA695DE75A78FA7FFDEE749F8BF807A81503E16897`.
It was not applied; evidence is under
`release-evidence-20260917-member-lifecycle-current/staging-member-lifecycle-v9.json`.

### Milestone 88 — registration trigger defect and migration 036 rehearsal (17/09/2026)

The expanded registration diagnostic confirmed that staging had no non-internal
triggers on `auth.users`: new Auth rows did not receive an application profile and
email confirmation could not create the initial class request. Prepared migration
036 restores exactly one signup-profile trigger and one email-confirmation trigger,
while retaining service-only direct execution of both trigger helpers and refusing
duplicate equivalent triggers.

The rollback-only migration-036 rehearsal passes 23/23 at exact live history
006–034. It proves profile creation, verification, idempotent initial request,
scoped/Super approval, rejection, Member denial, corrected reapplication,
notifications, password-reset request idempotency, wrong-scope denial, rejection,
approval, apply and completion. Rollback restores Auth/profile/request/membership/
notification/outbox/password state with zero fixture residue. Migration 036 SHA-256
is `6A60844DDE83B895E70E8194630F3EC33C6F75336FE46E2143EDFB36612FB792`.
It was not applied; evidence is
`release-evidence-20260915-registration-approval/staging-registration-027-acceptance-v12.json`.

### Milestone 89 — combined local release gates refreshed (17/09/2026)

After both pending repairs and the PDF CSP correction, TypeScript and 147/147 Node
regressions pass, lint exits cleanly, and the production build generates all 41
routes. The isolated Chromium/WebKit suite passes 138/138 across desktop, tablet and
mobile. The first unprivileged build attempt could not write `.next/trace`; the same
build was rerun with the required workspace permission and passed. No dependency,
production or provider configuration was changed.

### Milestone 90 — migrations 035–036 applied and accepted on staging (17/09/2026)

With explicit staging-only approval, applied hash-pinned migrations 035 then 036 to
Sydney staging `eomubndonbetszdbhsrj`. The guarded runner verified the exact healthy
project identity, pre-apply history 006–034, reviewed SHA-256 hashes, and a CLI dry
run selecting only 035 then 036. Postflight confirmed exact history 006–036, removal
of duplicate automated Break-history writes, exactly one enabled signup-profile and
email-confirmation trigger, service-only helper execution, and zero application-data
row changes.

Post-apply Member lifecycle acceptance passed 35/35 and registration/password-reset
acceptance passed 23/23. Both suites ran inside rollback-only transactions and
independent checks confirmed exact history 006–036 with zero fixture residue. The
read-only `public` database linter found no schema errors. Authenticated role security
passed 12/12 for Member, scoped Admin and Super Admin; outbound Auth providers stayed
disabled, Edge Functions and secrets stayed empty, and every temporary session was
revoked.

Evidence is retained under `release-evidence-20260917-migrations-035-036`,
`release-evidence-20260917-member-lifecycle-current/staging-member-lifecycle-v10.json`,
`release-evidence-20260915-registration-approval/staging-registration-027-acceptance-v13.json`,
`release-evidence-20260913-content-embed-repair/staging-db-lint-post-036-v1.json`, and
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-036-v1.json`.
Production requests, connections and mutations were zero; no external provider was
contacted.

### Milestone 91 — accessibility and responsive browser gates refreshed (18/09/2026)

Reran the isolated production-mode browser suite against the current source in all
six supported local profiles: Chromium and WebKit at desktop, tablet and mobile
sizes. All 138 tests passed with zero failures, flakes or skips, after a successful
41-route production build. The JSON result SHA-256 is
`83D599804D27B9E57003096F02E8DC2980E021BFE68F4F61D3BF6D4E704CEAB7`.

The covered release states include loading/disabled controls, empty class and dojo
catalogs, recoverable login/registration/confirmation errors, safe status feedback,
keyboard order, visible focus, skip-to-content focus transfer, mobile-modal focus
containment/restoration, Escape dismissal, reduced motion, role-scoped navigation,
automated WCAG scans, and horizontal-overflow checks. Certificate/report downloads,
Archive view-only behavior and enrollment reapplication remain included across all
profiles.

This closes the local accessibility-state and desktop/tablet/mobile layout gates.
It does not claim remote CI execution, native macOS Safari/iOS hardware playback, or
complete live authenticated business-workflow browser acceptance. The suite used
fixed loopback fixtures; staging, production and external providers were not
contacted.

### Milestone 92 — post-036 privileged-function coverage inventory (18/09/2026)

Captured a fresh read-only public/storage catalog from explicitly verified Sydney
staging at exact migration history 006–036. It contains 176 public routines, 161
`SECURITY DEFINER` routines, 108 browser-executable definers, 69 public RLS policies
and 23 application triggers. Every public table has RLS; every public definer fixes
`search_path` to `public, pg_temp`; no definer is executable by `PUBLIC` or `anon`;
and browser roles retain zero direct `TRUNCATE`, `REFERENCES`, `TRIGGER` or
`MAINTAIN` privileges.

Cross-referencing the live routine signatures against focused Node/SQL tests and
rollback-contained acceptance sources found explicit evidence references for 66 of
the 108 browser definers. Forty-two still need direct workflow evidence. One wrapper,
`request_admin_dojo_transfer_batch`, has no direct caller marker because it delegates
to the already reviewed atomic `request_bulk_dojo_transfer` implementation. No
unguarded direct-write candidate was found, but textual coverage is not semantic
proof, so the complete SECURITY DEFINER validation item correctly remains open.

The refreshed catalog also isolates the unchanged platform blocker to three
`supabase_admin` public default-ACL rows covering future tables, sequences and
functions. The audit role and project `postgres` role cannot alter them. Evidence and
the exact uncovered-signature list are under
`release-evidence-20260918-security-definer-coverage`. Production requests,
connections and mutations were zero.

### Milestone 93 — transfer boundary and Break-state repair prepared (18/09/2026)

Semantic review of the first uncovered privileged-function tranche found two live
defects at exact staging history 006–036. Several older routines omitted the current
`break_1` and `break_2` states, and authenticated users retained direct INSERT on
`dojo_transfer_requests` under a policy checking only `user_id = auth.uid()`. That
table path bypassed the application RPC's membership, active-dojo, same-dojo and
pending-request validation. The application itself uses the validated RPC.
The review also found that `record_membership_break` could restart a retained legacy
`break` membership at Break 1 instead of rejecting it as already on Break.

Prepared migration 037 updates the affected class/dojo helpers, assignment checks
and notification triggers, retains legacy `break`, routes transfer notifications
through active dojo-admin assignments, revokes only direct browser INSERT, preserves
authenticated RLS-scoped SELECT and reasserts service-only trigger/helper ACLs. Its
SHA-256 is
`849866937AE085FAC16372852D1724E71570925ADF3868B106531E4D4AE1563A`.

The local release gate passes: lint is clean, TypeScript plus 148/148 Node
regressions pass, and the production build generates all 41 routes. A pinned,
rollback-contained 30-check staging rehearsal package is prepared under
`release-evidence-20260918-transfer-boundary-037`; its runner parses cleanly and
requires an explicit staging-only mutation-test switch. It has not been executed.
Migration 037 is not applied, staging remains 006–036, and production/provider
requests, connections and mutations are zero.

### Milestone 94 — second semantic tranche isolated report-status drift (18/09/2026)

The follow-on read-only review found no caller-scope bypass in the class-management,
self-profile, Member-notification or finance routines inspected: they bind writes to
`auth.uid()`, Super Admin, active dojo assignment, or the Member's own charge.
Finance access intentionally requires a Dojo Admin assignment even for a Super Admin,
matching the subscriptions UI copy.

It did find a non-security reporting defect: `get_member_report_history` labels
`break_1`/`break_2` as Active, while `get_official_member_record` labels retained
legacy `break` as Active. A separate status-normalization repair and staging report/
PDF acceptance remain outstanding; it was not silently folded into the hash-pinned
transfer-boundary rehearsal. No database or provider was contacted for this review.

### Milestone 95 — five SECURITY DEFINER semantic tranches and independent post-gates (18/09/2026)

Completed the five approved rollback-contained semantic-acceptance tranches against
Sydney staging `eomubndonbetszdbhsrj` at exact migration history 006–036. The
transfer/Break migration-037 rehearsal passed 30/30; Member lifecycle passed 35/35;
registration, reapplication and password reset passed 23/23; payments passed 23/23;
and the combined grading/title plus archive/report tranche passed 14/14 and 22/22.
All 147 checks passed, every transaction rolled back, and every result records zero
production requests, connections and mutations. Migration 037 remained unapplied.

A separate guarded read-only connection then passed 12/12 zero-residue checks. It
confirmed exact history 006–036, no migration-037 ledger row, zero known fixture
markers across all five tranches, restored pre-rehearsal transfer INSERT privilege
and policy, restored registration password state, and Member-lifecycle digests and
counts matching the post-rollback v11 baseline. Staging mutations and external
provider requests were zero. Evidence is retained under
`release-evidence-20260918-semantic-five-tranches`; the passing report is
`independent-zero-residue-v2.json`. The immutable v1 report records a safe identity
lookup failure before any database connection.

The post-tranche role-security retry passed 12/12 for Member, scoped Admin and Super
Admin, including row isolation, archive/delivery/payment privacy, finance and role
helper isolation, effective-rate privacy and privileged-RPC denial. All temporary
sessions were revoked, outbound Auth providers remained disabled, and no email or
phone delivery was requested. The preceding immutable attempt passed 11/12 and
failed only the known transient freshly-issued Member JWT clock-skew check; cleanup
also completed. Passing evidence is
`release-evidence-20260913-staging-migrations-022-024/staging-security-smoke-post-036-v3.json`.

This closes the approved five-tranche and migration-037 rollback-rehearsal gate. It
does not apply migration 037 or close the separate report-status defect, platform
default-ACL blocker, or the remaining direct semantic evidence work for every
previously uncovered browser-executable `SECURITY DEFINER` signature.

### Milestone 96 — report normalization prepared and local release gates refreshed (18/09/2026)

Prepared local-only migration 038 to correct the remaining report-status drift.
`get_member_report_history()` and `get_official_member_record(uuid)` now normalize
legacy `break` plus current `break_1` and `break_2` to `Break`, while leaving Active
and every unrelated function behavior unchanged. The migration transforms the two
catalog definitions with exact drift guards, performs no table-data mutation, and
postflights the intended expressions. Its SHA-256 is
`61ACD5A591CE91B4EB7D46C331AB332B4A83946D53E3F6BFBB02CEC984DB0352`.

The updated local gate passes lint, TypeScript and 150/150 Node regressions. The
isolated optimized build generates all 41 routes, and the six Chromium/WebKit
desktop, tablet and mobile profiles pass 138/138 with zero failures, skips, flakes or
retries. Browser-result SHA-256 is
`D98C94E044AABEF597B5AA178D6420BC3642A5042EC4BD90E574485E8FB9844E`.
Remote CI and physical Safari/iOS remain separate external gates.

A guarded 21-check staging package is prepared under
`release-evidence-20260918-report-status-038`. It injects reviewed migrations 037
then 038 into one rollback-only transaction, verifies all four relevant labels in
both RPCs, exercises scoped Admin, cross-scope Admin, ordinary Member and Super Admin
authorization, preserves routine attributes/ACLs, and independently checks history
006–036 and zero residue. It was statically validated but not executed.

The post-Milestone-95 coverage refresh maps direct/reference evidence for 74 of 108
browser-executable `SECURITY DEFINER` routines, reducing the unmapped list from 42 to
34. The exact list and priorities are under
`release-evidence-20260918-security-definer-coverage-refresh`. A separate guarded
35-check package for the three highest-risk receiving-account routines is prepared
under `release-evidence-20260918-receiving-account-boundary`; it covers bank-routing
data scope, owned-charge access, Admin/Super assignment boundaries, mutation guards,
rollback and independent residue. It also was not executed.

No migration was applied and no staging, production, remote CI, physical device or
external provider was contacted while preparing these changes and packages.

### Milestone 97 — guarded 037–038 application and next semantic suites prepared (18/09/2026)

Prepared and independently audited a staging-only migration runner under
`release-evidence-20260918-staging-migrations-037-038`. It requires exact prehistory
006–036, isolates a dry run to migrations 037 and 038 in order, requires an explicit
apply switch, verifies exact posthistory 006–038, compares every application-table
row count, and postflights both the transfer boundary and Break-label repairs. The
runner SHA-256 is
`9CAE6DF47B0850219E07C63D25D39C4F8B098B71546A504CAE6319E699794E77`.
It has not been executed and migrations 037–038 remain unapplied.

Prepared a rollback-contained 31-check financial-summary boundary package under
`release-evidence-20260918-financial-summary-boundary`. It covers same-dojo finance
Admin access; Member, wrong-dojo Admin, unassigned Super Admin and anonymous denial;
assigned Super Admin access; missing-membership fail-closed behavior; complete
notification/outbox residue checks; and exact migration history 006–036. The SQL
SHA-256 is
`CF11C626A2BEE283E5FBD553C00C9ED9AA4558D3DF9EE266582AFA3F0077B664`
and the runner SHA-256 is
`F22B245F4905230DE7414EE1C98E1FCBE35D47F037F7CF12CBC1BE13979E2EB9`.

Prepared a separate rollback-contained 16-check transfer-failure control package
under `release-evidence-20260918-transfer-failure-controls`. It covers cancellation
and retry state transitions, normalized cancellation reasons, idempotency, Member
and wrong-dojo denial, source/destination Admin boundaries, Super Admin behavior,
migration-history privacy, rollback and independent zero residue. The SQL SHA-256
is `E486B856F6F0F76F2018A723FEC78614F63B8210555C05A9E6DD221AD3B0D196`
and the runner SHA-256 is
`2D69896EB8F187591B1B2D341B9E027612670D46796746A46784E0A66F06F9C8`.

All three packages passed local parser, hash/pin and transaction-containment checks.
They were not executed; staging and production connections, mutations and external
provider requests were zero. The mapped SECURITY DEFINER evidence count therefore
remains 74/108 until the prepared semantic packages are explicitly approved and run.

### Milestone 98 — migrations 037–038 applied and post-migration gates run (18/09/2026)

Applied migrations 037 then 038, in order, to Sydney staging
`eomubndonbetszdbhsrj` only. The guarded runner verified exact history 006–036 before
application and 006–038 afterward, both transfer/report postflights, preserved
routine security and ACLs, and unchanged row counts for every application table.
Production requests, connections and mutations were zero.

Post-migration report-status acceptance passed 21/21, receiving-account boundaries
passed 35/35 on immutable attempt v2, and financial-summary boundaries passed 31/31.
Each suite used one rollback-only transaction and its independent residue check found
zero fixture rows. The receiving-account v1 evidence remains intentionally retained:
its SQL passed 35/35 and rolled back, but its local runner still expected ledger
006–036; the corrected v2 runner expected and verified 006–038.

The Member/scoped-Admin/Super-Admin security smoke passed 12/12 on immutable attempt
v2. Attempt v1 passed 11/12 and failed only the known transient freshly-issued Admin
JWT clock-skew check. Both attempts revoked every temporary session, Auth providers
remained disabled, no email or phone delivery was requested, and production was not
contacted.

The transfer-failure suite found a real live contract defect. Both failed-transfer
cancellation RPCs permit a null or whitespace-only cancellation reason because they
store `nullif(trim(cancellation_reason), '')` without rejecting the null result. The
final immutable v8 evidence records the expected failure and independently verifies
exact ledger 006–038 plus zero classes, dojos, memberships, assignments, requests,
migration-history rows and email-outbox residue. Earlier immutable attempts document
runner corrections and were also connection-rolled back.

Prepared but did not apply migration 039,
`039_require_failed_transfer_cancellation_reason.sql`, to reject blank reasons before
either failed-transfer cancellation mutation while preserving Super-Admin-only
authorization, fixed search paths and authenticated/service-role ACLs. Its SHA-256 is
`9352DF37044B2369908CC81CE3104C364537747E2C221A1D51BEC12D16C8AEA0`.
The local TypeScript and Node gate passes 150/150, including contiguous migrations
006–039. Staging remains exactly 006–038; applying or rehearsing migration 039 needs
separate explicit approval.

### Milestone 99 — migration 039 applied and transfer/security gates closed (18/09/2026)

Applied migration 039 to Sydney staging `eomubndonbetszdbhsrj` only after an
isolated dry run selected exactly
`039_require_failed_transfer_cancellation_reason.sql`. The guarded application
verified exact history 006–038 before and 006–039 afterward. Postflight confirmed
the single and batch blank-reason guards, fixed `SECURITY DEFINER` search paths,
and authenticated/service-role-only execution. Passing apply evidence is
`release-evidence-20260918-staging-migration-039/staging-migration-039-apply-v3.json`
with SHA-256
`98D630ABE7A9B95336A9779DAFC3E3E7F5C203992084CB7F2477734E86B59461`.
Immutable v1 and v2 stopped during preflight before migration execution while the
new local runner's PostgreSQL argument handling was corrected.

The corrected rollback-contained transfer-failure suite passed 16/16 on immutable
attempt v11. It verifies required and normalized cancellation reasons, pending and
failed cancellation, Super-Admin-only failed controls, retry behavior, replay state
preservation, Super-Admin-only migration-history visibility, and exact ledger
006–039. The separate residue connection found zero fixture classes, dojos,
memberships, assignments, transfer requests, migration-history rows and outbox rows.
Passing evidence SHA-256 is
`6D49CFE09A9DBB7541290E3E118596664A87AEDE265358B4C4E1395D87962A15`.

The post-039 Member/scoped-Admin/Super-Admin security smoke passed 12/12 on immutable
attempt v2. Attempt v1 passed 11/12 and failed only the known transient fresh Super
Admin JWT clock-skew check. Both attempts revoked all temporary sessions, kept Auth
providers disabled, requested no outbound email or phone delivery, and contacted no
production service. Passing evidence SHA-256 is
`4C609C3B6B4B935299B70F9B0EDF9DC9D877471D2B17ACEE106F998BEF826A76`.

Staging is now exactly 006–039. Production requests, connections and mutations were
zero throughout Milestone 99.

### Milestone 100 — current coverage map and Member self-service tranche prepared (18/09/2026)

Refreshed the post-039 `SECURITY DEFINER` evidence map. Passing report-status,
receiving-account, financial-summary and transfer-failure suites directly map 12
previously uncovered routines, bringing current evidence to 86/108 and reducing the
unmapped list from 34 to 22. The exact remaining signatures and tranche routing are
recorded under `release-evidence-20260918-security-definer-coverage-post039`.

Prepared a staging-only rollback-contained Member self-service package under
`release-evidence-20260918-member-self-service-boundary`. Its 23 assertions and
guarded denial blocks directly exercise eight remaining routines covering personal
notifications, unread/read state, avatar and WhatsApp updates, Break-request history
and Member cancellation. It includes cross-Member and anonymous denial, ACL/security
attribute checks, exact history 006–039, audit-row retention, replay behavior and an
independent zero-residue connection. The SQL SHA-256 is
`1A4D45EF52F8185A8709C2E9ABB516285017DC849E1FBA98BDC0BB268AA64559`.

The package passed local parser, hash/pin, assertion-count and transaction-containment
validation but was not executed. Staging and production connections, mutations and
external-provider requests for Milestone 100 were zero. A passing staging run would
raise mapped coverage to 94/108 and leave 14 routines for the class/membership and
grading/title/Admin-reader tranches.

### Milestone 101 — Member self-service boundary and role security passed (18/09/2026)

Completed the approved rollback-contained Member self-service suite against Sydney
staging at exact migration history 006–039. Immutable attempt v5 passed 23/23 across
eight routines covering caller-only notification reads and mutations, unread counts,
avatar and Indonesian WhatsApp normalization, personal Break-request history,
cross-Member cancellation denial, own pending-request cancellation, replay behavior,
anonymous denial, routine ACLs and fixed security attributes. Its SHA-256 is
`03DC4CAB9B73330042079298A20DFEC131E9CA7A8BF4AD2A08B354C3B63EA42D`.

The independent connection confirmed exact ledger 006–039 and zero fixture
notifications, Break requests or profile values. Attempts v1–v4 are retained as
immutable test-harness diagnostics; every attempt rolled back and independently
reported zero residue.

The post-suite Member/scoped-Admin/Super-Admin security smoke passed 12/12 on
immutable attempt v4. Attempt v3 passed all authorization/privacy probes and failed
only the known transient fresh Member JWT clock-skew check. All temporary sessions
were revoked, Auth providers remained disabled, no outbound email or phone delivery
was requested, and production was not contacted. Passing evidence SHA-256 is
`F6E74FFFBA6EBC13CE8FC6407EA4E993C71C38F4CB4DC77E1021B4FF24A4A957`.

Direct/reference semantic coverage is now 94/108 browser-executable
`SECURITY DEFINER` routines, leaving 14 exact signatures. Production requests,
connections and mutations were zero throughout Milestone 101.

### Milestone 102 — class and membership Admin tranche prepared (18/09/2026)

Prepared a staging-only rollback-contained package under
`release-evidence-20260918-class-membership-admin-boundary` for eight of the final 14
unmapped privileged routines. It covers class creation, rename, active status, logo
and title-system changes; dojo-Admin revocation; membership inactivation; and joined-
date correction. The role matrix includes Super-Admin-only class operations, scoped
Admin success, wrong-dojo Admin denial, ordinary Member denial, anonymous denial,
input normalization, revocation audit fields, routine ACL/security attributes, exact
ledger 006–039, rollback and independent zero residue.

The SQL contains 13 explicit assertions plus guarded denial blocks, one `BEGIN`, one
`ROLLBACK` and no `COMMIT`. PowerShell parsing, dependency pins, target guards and
assertion counts pass locally. SQL SHA-256 is
`8DF0DACBAABB8684C1CE006BA660CF4F73FCBF9DDA25829C5EF72CA3B39EDB53`;
runner SHA-256 is
`1ACA2D17F3466EAD6800FABAEB937744ECA8AB6B11FE06D9FEAEDF1E409860EC`.
The package was not executed; staging and production connections were zero while it
was prepared. A passing run would raise direct/reference coverage to 102/108.

### Milestone 103 — class/membership Admin boundaries and role security passed (18/09/2026)

Completed the approved rollback-contained class and membership administration suite
against Sydney staging `eomubndonbetszdbhsrj` at exact migration history 006–039.
Immutable attempt v3 passed 13/13 across eight routines covering Super-Admin class
creation and normalized fields, rename, logo, title-system and active-state changes;
scoped and wrong-dojo Admin membership boundaries; membership joined-date correction
and inactivation; dojo-Admin revocation audit fields; Member and anonymous denial;
and fixed security attributes and ACLs. The independent connection confirmed exact
ledger 006–039 and zero fixture classes, dojos, memberships or Admin assignments.
Passing evidence SHA-256 is
`4D4DFD8D088E6C4239D0B15810C43476C94DC913295C13A9E9599344A2D4C9B4`.

Attempts v1 and v2 are retained as immutable harness diagnostics. Both rolled back
and independently reported zero residue. The harness was corrected to match the
existing title-case normalization trigger, make residue matching case-insensitive,
and ensure the inactive-membership denial truly uses a wrong-dojo Admin. The final
SQL SHA-256 is
`C3E42655ED8655D26D9969C5C656E9AB9E505E9E5BC47D8BC02DA8ADC3CA3964`
and runner SHA-256 is
`00222BD113438B85C6D7785CCB6C334457657B966A1FECA2746C3F4339815D24`.

The independently executed post-suite Member/scoped-Admin/Super-Admin security smoke
passed 12/12 on immutable attempt v6. Attempt v5 passed 11/12 and failed only the
known transient fresh Super Admin JWT clock-skew check. Every temporary session was
revoked, Auth providers remained disabled, and no outbound email or phone delivery
was requested. Passing role-security evidence SHA-256 is
`CCB0A944988EEF3DA5CFE8ED6F5DA8A98683E232F4D95CD6B890EB159189E35E`.

Direct/reference semantic coverage is now 102/108 browser-executable
`SECURITY DEFINER` routines. Production requests, connections and mutations were
zero throughout Milestone 103.

### Milestone 104 — final six-reader tranche prepared (18/09/2026)

Prepared but did not execute the final staging-only rollback package under
`release-evidence-20260918-final-admin-readers`. Its 26 assertions plus guarded
denial blocks cover all six remaining reader routines: Admin enrollment requests,
manageable Break requests, grading history with assessor snapshots, title history,
latest valid rank promotion and latest valid title appointment.

The role matrix covers Member-owned history, scoped Admin success, other-class Admin
denial, Super-Admin-only certificate reads and anonymous denial. Business semantics
cover enrollment/Break scoping and filters, partial-payment facts, revoked-history
retention, latest-valid selection and missing-membership fail-closed behavior. The
package requires exact ledger 006–039, one rollback-only transaction, verified TLS,
bounded temporary credentials and an independent zero-residue connection.

PowerShell parsing, assertion count, hash pin, target guard and transaction-
containment validation pass locally. SQL SHA-256 is
`A2F417032B8B9970D0D502583ADA14D8064239276D4380DD15269E879A7AD6CA`;
runner SHA-256 is
`A76E48B4D6CC7E29965BE8E8171627717A4E1196B52B22DEF65F9F06E778D047`.
No staging, production or provider connection was made while preparing this package.
Execution requires separate explicit staging-only approval.

### Milestone 105 — final reader and complete semantic coverage gates passed (18/09/2026)

Completed the approved rollback-contained final Admin-reader suite against Sydney
staging `eomubndonbetszdbhsrj` at exact migration history 006–039. Immutable attempt
v1 passed 26/26 across the final six routines: Admin enrollment requests, manageable
membership-Break requests, grading history with assessor snapshots, title history,
latest valid rank promotion and latest valid title appointment.

The passing role matrix includes Member-owned history, scoped Admin access,
other-class Admin denial, Super-Admin-only certificate reads and anonymous denial.
Business assertions confirm enrollment/Break scope and filters, partial-payment
facts, revoked-history retention, latest-valid selection and missing-membership
fail-closed behavior. The independent connection verified exact ledger 006–039 and
zero fixture classes, dojos, memberships, ranks, grading/title history,
enrollment/Break requests, charges, payments, assignments, notifications or
email-outbox rows. Passing evidence SHA-256 is
`2F765DA26A2F22156479657304127DE19E04FF691FEB6D899BBD9E847819BA33`.

The independently authenticated Member/scoped-Admin/Super-Admin security suite
passed 12/12 on immutable attempt v8. Attempt v7 passed 11/12 and failed only the
known transient fresh Member JWT clock-skew check. Both attempts revoked all
temporary sessions, kept Auth providers disabled and requested no outbound email or
phone delivery. Passing role-security evidence SHA-256 is
`9DA5883D0A39F51524BCC42C5455F9B22C985113923D0F4BEE34B5FE82BC9469`.

Direct/reference semantic evidence now covers 108/108 browser-executable
`SECURITY DEFINER` routines. Staging remains exactly 006–039; no migration was
applied. Production requests, connections and mutations were zero throughout
Milestone 105. This closes the semantic routine-coverage gate but does not authorize
production deployment.

### Milestone 106 — current local release gates refreshed (18/09/2026)

Revalidated the accumulated v1 source in `C:\Projects\martial-repository` without
discarding or overwriting its existing dirty/untracked work. `npm ci` installed and
audited 450 packages with zero known vulnerabilities. Lint passed with no reported
warnings or errors; TypeScript plus all 150 Node regressions passed; the optimized
Next.js 16.3.4 production build completed all 41 routes; and `git diff --check`
passed apart from informational future line-ending warnings.

The default isolated seven-profile browser attempt passed 138 tests. Its 23 failures
were all the known Windows Playwright Firefox host-launch error, `spawn UNKNOWN`,
before Firefox opened any application page. The explicit engine-preflight run then
passed 138/138 with zero failures or skips across Chromium and WebKit desktop,
tablet and mobile profiles. Passing browser-result SHA-256 is
`87E7979975FEA9803952F0412170B6F2061190D44620DF58502237F33372D9BC`.

The offline provider gate correctly failed closed because protected release
configuration was not supplied. The recovery gate correctly required a sanitized
manifest argument. The prepared GitHub workflow includes independent Chromium,
Firefox/Linux, WebKit/Linux and WebKit/macOS jobs, but it remains untracked in the
large local `main` working tree; no commit, push or remote workflow dispatch was
authorized or attempted. Physical release Safari/iOS remains a separate device
gate.

Evidence is under `release-evidence-20260918-local-release-gates-post105`. Staging,
production, providers, hosting and remote CI contacts were zero, and no database or
production mutation occurred. Remaining blockers are external release configuration,
complete recovery evidence, remote CI, physical Safari/iOS and reviewed publication
of the accumulated source.

### Milestone 107 — recoverable source-publication bundle prepared (18/09/2026)

Prepared a local-only, secret-screened publication preflight for the dirty release
candidate without staging, committing or pushing. The bundle covers 56 modified
tracked files and 126 untracked source/evidence files, 182 candidate files total,
with zero ignored files included. The high-signal scan found no real secrets; its
only hit is the obvious numeric Resend fixture in the provider-readiness regression.

The binary tracked patch passes `git apply --check --reverse` against the current
tree. The untracked ZIP contains 126/126 expected entries, and every archived entry
matches its manifest SHA-256. Bundle hashes are:

- manifest: `180A8791B89C3E54C9DAC00264632D09885A0E6497345CFEFA84490E72B7AD63`;
- tracked patch: `E5E30198481A96EB841FDABE3CDF15D6DA3FC6B33F51BF3DAC86CE32E29D1650`;
- untracked ZIP: `E2F13C1DA5F7607E275583F8CC92B7634CD23D40DC751C6C45AC10846AD2B184`.

Evidence is under `release-evidence-20260918-source-publication-preflight`. The
earlier `failed-v1` generator output is retained and explicitly marked unusable.
No Git index, commit, branch, remote, CI, hosting, database or production state was
changed. A reviewed commit/push decision is now the next publication gate.

### Milestone 108 — release branch published and remote CI passed (19/09/2026)

Verified the sealed 182-file publication manifest against the source tree with zero
missing, unexpected or hash-mismatched files, then created and pushed
`release/v1-readiness-20260918`. The release-candidate commit is
`f7eed8a4b9b77b02ded5bfd6a80ad155bfc2d117`. Draft pull request #1 was opened only
to register and trigger the new pull-request workflow; it was not merged or deployed.

The first remote run exposed a platform-dependent CRLF/LF hash in the immutable
legacy-migration regression. Commit
`3ebb8772a225196d4a58a05f01b3ee2c39299da7` now hashes canonical LF text while
retaining exact content pins for all three legacy drafts. The next run passed checks,
Chromium/Linux and Firefox/Linux, then exposed two WebKit-specific gates: disabled
Register-button contrast on Linux and the macOS Playwright keyboard-navigation host
preference. Commit `7d2500024a88e5d36b3178e5f970afe89e93c424` replaced opacity-based disabled styling
with explicit accessible colors and enabled `AppleKeyboardUIMode` only for the
macOS WebKit CI job; no browser assertion was suppressed.

Local verification after the fixes passed lint, TypeScript, all 150 Node tests, the
41-route production build and all 23 WebKit-mobile tests. GitHub Actions run
`35395933998` then passed every job: checks, Chromium/Linux, Firefox/Linux,
WebKit/Linux and WebKit/macOS. The draft PR remains open and unmerged. No deployment,
database connection, provider call or production contact occurred during this
milestone.

A documentation-only branch-tip confirmation subsequently caught a timing-dependent
3.24:1 contrast frame while the account-menu sign-out button transitioned out of
`disabled:opacity-50`. The control now uses color-only transitions and explicit
high-contrast disabled colors, preventing the accessibility result from depending on
scan timing.

### Milestone 109 — implementation checkpoint and memorial lifecycle prepared locally (23/09/2026)

Reconfirmed the published checkpoint at branch `release/v1-readiness-20260918`,
commit `bc001b5`, with the local tracking ref matching the recorded origin ref. The
current working tree is intentionally uncommitted while migrations 040–041 and their
application work are reviewed. The most recent verified staging ledger remains
exactly 006–039; neither staging nor production was contacted in this milestone.

Prepared migration 040 and the Super-Admin deceased-member workflow without changing
membership status or historical records. The local candidate adds
`profiles.date_of_passing`, memorial settings/recipient/audit/publication tables,
multi-class announcement recipients, active-account request enforcement, scoped
announcement visibility, initial memorial publishing and idempotent Jakarta-date
annual Remembrance Day/Heavenly Birthday processing. The Admin UI and protected API
routes support mark/reverse, settings and initial publication; the server route also
coordinates Supabase Auth ban/unban with retry-safe partial-failure reporting. The
email worker invokes the annual processor without hiding its health result.

Migration 040 is local-only. Its database objects, Auth ban/unban integration,
annual worker behavior, recipient delivery, rollback residue and role matrix have not
been exercised against staging. Source inspection also found no existing ordinary
birthday-announcement scheduler to replace; any future ordinary birthday automation
must explicitly exclude deceased profiles.

### Milestone 110 — atomic bulk assessment and certificate batch prepared locally (23/09/2026)

Prepared migration 041 with private, RLS-enabled `assessment_batches` and
`assessment_results`, scoped `get_bulk_assessment_candidates`, and one atomic
`submit_bulk_assessment` boundary. The submission validates the complete roster
before mutation, locks candidates deterministically, rejects stale expected targets
and duplicates, records both outcomes, promotes only Pass rows, leaves Fail rows
unchanged, and publishes one class results announcement only when at least one member
passes. Instructor text is retained as a historical per-candidate snapshot and does
not replace the required grading assessor.

Added `/admin/assessments` with class/dojo/date scope, explicit roster inclusion,
candidate photo and grading context, Pass/Fail, instructor, notes, review confirmation
and one idempotent submission. After a successful batch, eligible rank promotions can
be issued certificates and downloaded as one multi-page PDF; failed or non-rank rows
are excluded. Rollback-contained SQL fixtures/assertions are prepared but have not run
against staging. A fresh local PostgreSQL 17 cluster installed migration 029 then 041
and passed all 14 semantic assertions, including disabled/deceased assessor denial,
pass-only mutation, idempotency, ACLs and private-table audit checks; the temporary
cluster was removed afterward.

The refreshed local gate passes lint, non-incremental TypeScript, 190/190 Node tests,
the 44-route optimized production build and `git diff --check` (apart from
informational Windows line-ending notices). Migration 041, authenticated browser
flows, bulk announcement/certificate behavior and Safari/iOS remain live-unverified.
Staging remains 006–039, migrations 040–041 remain unapplied, and production was not
contacted.

### Milestone 111 — pre-assessment pending certificates and atomic finalization prepared (23/09/2026)

Clarified and implemented the intended Super-Admin assessment sequence locally.
Migration 042 persists the selected roster before assessment day, reserves auditable
certificate numbers for certificate-eligible candidates, and permits one multi-page
PDF to be printed while every certificate remains `pending`. The roster can be
reopened on assessment day with its date, class/dojo, assessor, member photo, home
dojo, current/target grade, instructor, notes and Pass/Fail controls.

Every prepared candidate must receive exactly one result in one final submission.
The existing migration-041 atomic grading boundary performs the promotions and
records both outcomes; migration 042 then marks Pass certificates `issued` and Fail
certificates `voided` in the same transaction. Failed candidates retain their current
grade. Direct browser execution of the unprepared submission RPC is revoked. The one
published class announcement includes only successful candidates and uses
`Name, previous rank to promoted rank` under a Congratulations heading.

A fresh temporary PostgreSQL 17 cluster installed migrations 029, 041 and 042 and
passed the rollback-contained 9/9 semantic suite: complete-roster enforcement,
pending certificate creation, print audit, issued/voided transitions, pass-only
promotion and announcement, idempotent finalization, Super-Admin scope and private
table ACLs. The temporary cluster was stopped and removed. The final local gate passes
lint, TypeScript, 198/198 Node tests, the optimized 44-route production build and
`git diff --check`. Migrations 040–042 remain unapplied; staging and production were
not contacted.

### Milestone 112 — database-verified certificate QR and ordered dojo results completed locally (23/09/2026)

Added a QR barcode to each prepared assessment certificate. Its signed-internal
payload records the certificate UUID, member name, promoted rank, promotion date,
assessor and the app verification URL. The public scan route performs the lookup on
the server through a service-role-only database function and reports `PENDING - NOT
YET VALID`, `ISSUED - VALID` or `VOID - NOT VALID`. It exposes no certificate PDF or
member document library. Prepared-assessment tables remain unreadable to browser
roles, and every preparation, open, print and finalization workflow remains guarded
for an active Super Admin.

Updated the single grading-results announcement so a selected-dojo assessment names
that dojo in its title and contains only its selected roster. An all-dojo assessment
groups result lines by home dojo. Within each dojo, successful promotions are ordered
by destination rank and sub-rank from highest to lowest, then deterministically by
member name. Failed candidates remain absent from the announcement.

The certificate face now has one centered `Authorized Signatory` signature line;
the separate assessor signature was removed. Assessor identity remains preserved in
the database and QR verification payload as historical audit evidence. The class name
is displayed in bold immediately below `JINGWUGUAN SEIBUKAN`, and the QR caption now
states `SCAN TO VERIFY AUTHENTICITY` while retaining live database-status validation.

The final local gate passes lint, non-incremental TypeScript, 204/204 Node tests,
`git diff --check`, and an isolated optimized Next.js 16.3.4 production build that
includes `/certificate/verify/[certificateId]`. The ordinary repository `.next`
directory was held by another local Next.js process, so the build was executed from
an exact temporary copy; that copy and its environment file were deleted afterward.

A fresh disposable PostgreSQL 17 cluster installed the fixture and migrations 029,
041 and 042, then passed the rollback-contained 9/9 prepared-certificate semantic
suite. The server was stopped and all temporary database files were removed. Staging
remains at the last verified 006–039 ledger; migrations 040–042 remain unapplied,
and neither staging nor production was contacted.

### Milestone 113 — staging 040–042 read-only preflight passed (23/09/2026)

Detected that the repository's Supabase CLI metadata is still linked to production
`pkmllhaavadhaozmwapz` and refused to use that link. The protected staging
configuration independently passed the exact-project guard for Sydney staging
`eomubndonbetszdbhsrj`. No relink was performed.

A direct TLS-verified, transaction-read-only staging audit confirmed the exact ledger
006–039 with latest migration 039. A second read-only catalog query confirmed every
migration 040–042 prerequisite, the required rank/sub-rank ordering columns, the
authenticator role and `is_super_admin(uuid)` default contract. The PostgREST
pre-request hook is currently unclaimed, all new relations and the prepared-certificate
sequence are absent, and there are zero conflicting new routines.

Exact SHA-256 pins were recorded for migrations 040–042. Staging mutations were zero;
production requests, connections and mutations were zero. Sanitized evidence is in
`release-evidence-20260923-migrations-040-042-preflight`. Applying migrations 040,
041 and 042 remains a separate consequential action requiring explicit staging-only
approval.

### Milestone 114 — staging 040–042 applied; live semantics exposed migration 043 repair (24/09/2026)

Applied migrations 040, 041 and 042, in order, to Sydney staging
`eomubndonbetszdbhsrj` only through an isolated migration directory and a direct
TLS-verified staging URL. The repository's production-linked Supabase metadata was
not used or changed, and production was not contacted. Migration 042 initially
failed transactionally because staging uses the established `is_super_admin(uuid)`
contract rather than a `profiles.role` column. The corrected 042 passed 35 targeted
checks, a disposable PostgreSQL semantic suite, the full local gate and a staging
dry run before it was applied. The staging ledger then became exactly 006–042.

The first rollback-contained live semantic run found two additional runtime catalog
mismatches without leaving residue: PostgreSQL does not provide `min(uuid)` in the
memorial publisher, and the prepared-assessment function referenced the nonexistent
`profiles.member_id` instead of `profiles.registration_number`. Prepared local
migration 043 with exact-definition fail-closed guards and restored ACL assertions.
Migration 043 has not been applied. A guarded Supabase CLI dry run selected exactly
`043_repair_memorial_and_prepared_assessment_runtime.sql` and no seed or role files.

Applied the 043 candidate only inside a staging transaction and ran the full guarded
suite. The initial memorial, annual Remembrance Day and Heavenly Birthday passed.
A three-person rank-promotion roster created three Pending certificates, recorded a
print, finalized two Pass and one Fail atomically, issued two certificates, voided
the failed certificate, promoted only the passes and created the result announcement.
Pending and final QR/database authenticity payloads passed. Existing Admin and Member
identities were denied the Super-Admin-only and private-table paths. The transaction
was rolled back, and a separate connection confirmed zero memorial/assessment/
certificate residue, the exact 006–042 ledger and the intended RPC ACLs.

The general database verifier still stops at the previously documented Supabase
platform-owned default-privilege finding; it was not weakened. Dedicated security
test account variables in the protected staging file are still placeholders, so
password-authenticated API/browser role smoke remains pending. Local verification
passes TypeScript plus 207/207 Node tests, lint and `git diff --check` (apart from
informational Windows line-ending notices). No commit, push, deployment or production
contact occurred.

### Milestone 115 — migration 043 and persisted staging acceptance passed (24/09/2026)

Applied migration 043 to staging `eomubndonbetszdbhsrj` only through the isolated,
hash-pinned migration directory and direct TLS-verified staging connection. The CLI
selected and applied only
`043_repair_memorial_and_prepared_assessment_runtime.sql`; no seed or role files were
applied. A separate read-only check confirmed both repaired function definitions are
persisted and the staging migration ledger is exactly 006–043.

Reran the complete rollback-contained suite without the temporary candidate repair.
The persisted memorial lifecycle passed initial publication, Remembrance Day and
Heavenly Birthday generation. The persisted assessment flow prepared three Pending
certificates, recorded printing, finalized two Pass and one Fail, promoted only the
passes, issued two certificates, voided one and created the result announcement.
Pending and final QR/database verification passed. Member and scoped Admin identities
were denied the protected boundaries. The transaction rolled back successfully.

An independent connection then passed zero-residue, exact-ledger and RPC-ACL checks.
The strict database verifier was also rerun and still stops only at the previously
documented Supabase platform-owned default-privilege finding; it was not weakened.
Dedicated security-test credentials remain placeholders, so password-authenticated
API/browser smoke and provider delivery remain pending. Production was not contacted,
and no deployment, commit, push or merge occurred.

### Milestone 116 — parallel account, provider, role-route and release audit (24/09/2026)

Ran four independent readiness tracks in parallel. The dedicated staging Member,
scoped Admin and Super Admin identities already exist, but all six protected email/
password values are placeholders. The lower-impact next action is to rotate only
those three staging Auth passwords and update protected configuration; the existing
seed is not the default because it rewrites 56 dummy users, profiles and memberships.

Corrected the assessment role inconsistency. `/admin/assessments` is now displayed
only to Super Admin and has a server layout guard that redirects direct access by
Members and scoped Admins. This matches the migration-042 prepared-assessment RPCs
and the agreed assessor workflow.

Hardened offline provider readiness so `--expected-origin` must exactly match the
normalized `NEXT_PUBLIC_SITE_URL`; path/query-bearing and mismatched origins fail
closed. The protected staging configuration passes the strengthened offline check.
This remains configuration-consistency evidence only, not live provider delivery.

The strict default-ACL blocker is platform-owned: the project migration role cannot
alter `supabase_admin` defaults. Existing app objects remain explicitly ACL-hardened.
The next action is a Supabase owner-level staging remediation request or a narrow,
time-bounded release exception; the verifier must remain unchanged and nonzero.

TypeScript and 210/210 Node tests pass, lint passes, and provider configuration is
offline-ready. A fresh isolated optimized production build passed all 44 routes,
including `/admin/assessments` and certificate verification. Chromium and WebKit
both launched locally and the browser production build compiled, but this session
could not complete Playwright fixtures: the
shared trace was locked by another local process and the isolated copy's esbuild
fixture resolver was blocked by the sandbox while traversing parent directories.
This is not counted as browser acceptance. Earlier remote browser CI remains valid,
while new authenticated 040–043 browser workflows still require real staging
credentials and a deployed HTTPS staging origin. Production was not contacted.

### Milestone 117 — guarded staging-account rotation tooling and release notes finalized (24/09/2026)

Added a targeted security-test account rotation utility that is audit-only by
default and hard-limited to staging `eomubndonbetszdbhsrj`. It requires exactly the
existing Member 0101, Admin 0002 and Super Admin 0001 identities, verifies their
active/living profiles and resolved roles, rejects browser credentials, placeholder
or duplicate passwords, and uses password-only Auth Admin mutation payloads. The
explicit `--apply` path is the only mutation mode. Seven focused tests cover target
guards, credentials, exact identity matching, audit-only behavior and the three
password-only updates.

The full local gate now passes TypeScript plus 217/217 Node tests, lint, the prior
fresh isolated 44-route production build and diff checking. Updated the current
release boundary so historical 011–016 instructions cannot be mistaken for active
operator steps. The remote account audit and password rotation were not run and the
protected configuration was not changed; those remain behind explicit staging-only
approval. Production was not contacted.

### Milestone 118 — dedicated staging credentials rotated and role security passed (24/09/2026)

With explicit approval, updated only the six protected `SECURITY_TEST_*` entries in
`C:\protected\jingwuguan-staging.env`. A read-only Auth/profile audit first verified
exactly Member 0101, scoped Admin 0002 and Super Admin 0001, including member numbers,
active/living status and resolved roles. The apply then changed only those three Auth
passwords; it created no users and changed no profile or membership records.

The first password-authenticated test stopped before authorization probes because
staging intentionally has public email login disabled. Provider settings were not
changed. A staging-locked runner generated non-delivered one-time sessions for the
same audited accounts, waited for token clock consistency, and passed 12/12 checks:
all role flags, Member row isolation, scoped-Admin isolation, archive/delivery/payment
privacy, finance and role-helper caller isolation, effective-rate privacy and the
Member privileged-RPC denial. The child suite signed out each session and the wrapper
confirmed cleanup. Production contacts and production mutations were zero.

### Milestone 119 — automatic JS Member ID on Super Admin approval prepared locally (24/09/2026)

Prepared migration 044 without contacting any remote database. Applicants no longer
choose a JS Member ID during registration. They may still provide their distinct,
optional Aikikai Registration Number; signup normalizes and stores it in
`profiles.aikikai_registration_number`, while leaving the JS ID column
`profiles.registration_number` empty. The review queue displays and exports the
Aikikai value when present. The initial Applications workflow is now
Super-Admin-only in navigation, at the server route boundary and inside both review
RPC signatures. When a Super Admin approves a pending application, the transaction
locks the request and profile, preserves any existing nonblank Member ID, otherwise
allocates the next private numeric sequence value with a minimum four-digit display,
creates or activates the selected membership, records the review and queues the
approval notification containing the assigned ID. Rejection assigns no ID. The
existing manual Member ID page remains available for an authorized later correction.

The sequence seeds above the greatest existing 1–18 digit numeric Member ID, never
cycles and is not directly usable by browser or service roles. A disposable local
PostgreSQL 17 acceptance run proved supplied and blank Aikikai values persist as a
normalized value and `NULL`, respectively, without assigning a JS ID at signup. It
also proved `0101` advances to `0102`, `9999` advances to `10000` without truncation,
legacy `LEGACY-7` is preserved, rejection leaves the JS ID empty, the legacy RPC
delegates to the same boundary, a scoped Admin is denied and sequence ACLs remain
private. The temporary cluster was stopped and removed.

The complete local gate passes TypeScript plus 223/223 Node tests, lint,
`git diff --check` and a clean isolated 44-route optimized production build. The
source build's shared `.next/trace-build` remained locked by another local process,
so the build used a physical temporary copy that was deleted after success. Staging
remains exactly 006–043; migration 044 requires separate explicit staging-only
approval, dry-run isolation and guarded rollback-contained acceptance. Production
was not contacted.

### Milestone 120 — migration 044 applied and accepted on staging (24/09/2026)

With explicit staging-only approval, verified the protected target as Sydney staging
`eomubndonbetszdbhsrj`, confirmed exact history 006–043, pinned the migration hash
and ran an isolated Supabase CLI dry run that selected only
`044_assign_member_id_on_approval.sql`. The first apply stopped transactionally at
the fail-closed preflight because staging exposes `is_super_admin(uuid default
auth.uid())`, not a separate zero-argument overload. No schema or ledger change
persisted. Repaired the preflight to validate the established UUID signature and its
one default argument, reran its focused local tests and dry run, then applied only
migration 044. Production was not contacted.

Independent postflight confirms the persisted optional-Aikikai signup definition,
Super-Admin-only automatic JS Member ID approval path, application-review field,
private sequence ACL and exact staging ledger 006–044. The rollback-contained live
suite proved supplied and blank Aikikai handling, no JS ID at signup, numeric
minimum-four-digit ID assignment on approval, scoped-Admin denial, Super Admin
approval, membership plus routed-email atomicity, rejection without an ID, legacy
ID preservation and sequence restoration. A separate connection confirmed zero
synthetic residue and the exact ledger.

The guarded authenticated API suite passed 12/12 Member, scoped Admin and Super
Admin security checks. Supabase database lint reports no schema errors, and the
post-apply dry run reports no pending migrations. The unchanged strict SQL verifier
still stops only at the documented platform-owned `postgres`/`supabase_admin`
global/public-schema default privileges; it was not weakened. The complete local
gate passes TypeScript plus 223/223 Node tests, lint and the direct 44-route optimized
production build. No commit, push, deployment or production contact occurred.

### Milestone 121 — parallel browser, provider, recovery and release audit (24/09/2026)

Ran four independent readiness tracks without contacting production. The browser
track built all 44 routes and exercised the 161-case isolated matrix. It found one
real WCAG contrast defect in the new registration explanation (`text-neutral-500`
on the dark card, measured 3.78:1); changed only that copy to `text-neutral-400`.
After the fix, Chromium desktop completed 23/23 assertions and WebKit desktop,
tablet and mobile completed 69/69 assertions. Both commands then hung during runner
shutdown after the final pass and required interruption, so this is assertion
evidence rather than a clean browser-command exit. Firefox never opened because its
Windows executable returned `spawn UNKNOWN`. The local harness intentionally strips
remote targets and credentials, so deployed authenticated workflows and physical
Safari/iOS remain unverified.

Provider configuration passes offline with zero blockers and 50/50 focused email,
push, memorial, rate-limit and route tests pass. A forced read-only staging probe
confirmed ledger 044, a healthy empty email queue, private health RPCs, push RLS with
four own-user policies and five stored subscriptions, and a service-role-only
memorial processor. No email or push was sent. The configured staging origin returns
404 for the app and worker endpoints, `pg_cron` is absent, and the read-only Resend
domain lookup returned 401; therefore deployed hosting, an external one-minute
scheduler, Resend key scope/domain ownership and real test-recipient/device delivery
remain operational blockers.

Recovery validator tests pass 5/5 and the template correctly fails closed. The last
restore evidence covers only `public` plus the migration ledger through 006–026; it
does not prove the current 006–044 candidate, managed Auth, Storage bytes/metadata,
roles/default grants, Vault/encryption custody, providers, schedules, RPO/RTO or
post-restore security. A fresh disposable full managed-platform rehearsal requires
separate target and protected-evidence authorization.

The production dependency audit reports zero vulnerabilities. Read-only catalog
inventory narrowed the strict database blocker to `supabase_admin` future-object
defaults: broad `anon`/`authenticated` public-schema defaults and built-in PUBLIC
function execution. Current application objects remain explicitly hardened. The
connected `postgres` role cannot use or become `supabase_admin`, so remediation must
come from a supported Supabase owner action or an explicit reviewed risk decision;
the verifier was not weakened. The full post-fix local gate remains TypeScript plus
223/223 Node tests, lint and a fresh isolated optimized build of all 44 routes. The
source `.next/trace-build` was locked by the completed browser run, so the build used
a physical temporary copy; the first junction-based attempt failed closed, the
dependency directory was physically copied, the clean build passed, and the entire
temporary copy was verified and removed. No commit, push or deployment occurred.

### Milestone 122 — release-candidate preservation and clean browser exits (24/09/2026)

Backed up the complete uncommitted release candidate before further edits. The
binary tracked patch and untracked-source archive are retained outside the
repository in `release-evidence-20260924-source-backup` with SHA-256 values
recorded in the release handoff.
Local certificate preview output and temporary rendering files are now ignored and
remain outside the release candidate. Removed one user-specific PostgreSQL-tool
cache path from the deployment runbook and replaced it with portable, versioned
client guidance. A complete source review found no real secrets, debug artifacts or
unrelated code in the intended 040–044 candidate.

Reproduced the Playwright post-assertion hang and isolated it to the restricted
Windows host denying Playwright 1.62's `taskkill /T /F` web-server cleanup. Added a
test-only loopback shutdown contract and global teardown so both the Next server and
navigation fixture close before Playwright's fallback. Chromium desktop now passes
23/23 with exit code zero and leaves no residual test Node process. The first clean
WebKit matrix rerun exposed a native mobile-select contrast failure; the registration
Class and Dojo controls now explicitly retain a dark native color scheme and white
WebKit text. WebKit desktop, tablet and mobile then passed 69/69 with exit code zero.

The complete local gate passes TypeScript plus 223/223 Node tests, lint,
`git diff --check` and a direct optimized production build of all 44 routes. An
offline deployment audit confirms `/login`, `/api/system/email-worker` and
`/api/push/send` exist in source and the compiled manifest. The blanket staging 404
therefore points to an absent, unlinked, mis-aliased or wrong-root Vercel staging
deployment, not a Next route defect. No Vercel deployment workflow or external
worker schedule exists in the repository, and staging has no database cron.

During the offline deployment audit, an internal command output inadvertently
included the staging database connection URL. Its password must be rotated before
any further live staging use. The value is not repeated and was not used after the
event. No production service was contacted. The distinct Developer-role audit also
confirmed it would require a new authorization boundary and migration; it remains a
post-v1 feature rather than expanding the current release gate.

### Milestone 123 — last-training-session candidate prepared locally (24/09/2026)

Prepared migration 045 and the corresponding Admin/Member interfaces without
contacting staging or production. Each class membership can now retain its latest
instructor-recorded training date, the recorder and timestamp. Corrections append
to a private forced-RLS audit table. Only an active Super Admin or the scoped Admin
assigned to that class/dojo can record a non-future date on or after the membership
join date; deceased-member updates are rejected. Members receive only their own
per-membership values through a caller-bound read RPC.

The one-click `Mark Trained Today` action uses the Asia/Jakarta server date through
the same locked and audited write boundary; the separate date control remains for
corrections or backdated sessions. The database, rather than the browser clock,
calculates elapsed days against the Asia/Jakarta business date. The Admin member list and Member profile display Today,
1 day ago or N days ago for 0–29 days; at 30 days or later they display the stored
calendar date, and an empty value displays Not recorded. The Admin update keeps an
audit trail while an idempotent repeat does not create duplicate history.

Migration review corrected the replacement view before execution so the established
`admin_visible_members` column order remains intact and the two new columns are
appended. Focused migration/UI/security assertions pass 5/5. The full local gate
passes TypeScript plus 228/228 Node tests, lint, `git diff --check` and the direct
optimized 44-route production build. Staging remains exactly 006–044 and migration
045 is not applied. The exposed staging database password must be rotated before
any guarded staging apply or live acceptance; production was not contacted.

### Milestone 124 — staging password rotation, migration 045 apply and forward repair (24/09/2026)

Rotated the staging database password through the dashboard, retained the generated
replacement only in the protected staging environment and verified the new explicit
connection. Confirmed exact staging history 006–044, ran an isolated dry run that
selected only `045_last_training_session.sql`, then applied migration 045 to Sydney
staging `eomubndonbetszdbhsrj`. Production was not contacted.

The guarded first runtime call failed on the deployed function because its audit
insert names `effective_training_date` as a column even though the table defines
`new_training_date`; it also passes the nullable input argument rather than the
resolved effective date. Supabase database lint independently reports SQLSTATE
42703 for the same statement. The single-statement acceptance harness failed before
its deliberate success marker, so PostgreSQL rolled the statement back. Independent
before/after snapshots match: Member 0101 and Super Admin 0001 remain active and
living, both last-training dates remain NULL and both audit counts remain zero.

Prepared forward-only migration 046 to replace only the affected function, use the
real audit column and persist the effective Jakarta date. Its reviewed SHA-256 is
`61894AF224D2BFB9758D5C87FC65B49CE216DEC31CBC3DDE388B1169F948F35B`.
The local gate passes TypeScript plus 230/230 Node tests, lint, `git diff --check`
and a fresh optimized production build of all 44 routes. A non-mutating staging dry
run lists exactly migration 046 with no seeds or roles.
The independently authenticated staging suite still passes all 12 Member, scoped
Admin and Super Admin security checks. The exact ledger is 006–045 with only local
046 pending. Migration 046 was not applied; it requires explicit staging-only
approval followed by the rollback-contained semantic, audit, idempotency, role,
zero-residue, exact-ledger and lint checks.

### Milestone 125 — migration 046 applied and last-training accepted on staging (25/09/2026)

With explicit staging-only approval, reverified SHA-256
`61894AF224D2BFB9758D5C87FC65B49CE216DEC31CBC3DDE388B1169F948F35B`, confirmed
exact history 006–045 and ran a dry run that selected only
`046_repair_last_training_audit_insert.sql` with no seeds or roles. Applied that one
forward-only migration to Sydney staging `eomubndonbetszdbhsrj`. Production was not
contacted.

The persisted repaired function passed the rollback-contained acceptance suite for
Member denial, scoped-Admin success, Jakarta mark-today, complete previous/new audit
attribution, same-day idempotency, valid backdated correction, repeated-correction
idempotency, Member-own getter isolation, wrong-dojo denial, future-date
rejection, Super Admin organization scope, inactive membership rejection, pre-join
rejection, deceased-member rejection and RPC/table ACLs. The suite reached its exact
deliberate rollback success marker. Independent before/after snapshots are identical:
Member 0101 and Super Admin 0001 remain active and living, their last-training dates
remain NULL and their audit counts remain zero.

Postflight confirms exact ledger 006–046, no pending migrations and clean Supabase
database lint. The one-time-session role suite passes all 12 Member, scoped Admin and
Super Admin checks with cleanup confirmed. The strict multi-statement SQL verifier
could not be re-executed through this CLI's prepared-statement query command; the
previously documented platform-owned default-privilege finding therefore remains a
separate release decision and was not weakened. The local gate remains TypeScript
plus 230/230 Node tests, lint, `git diff --check` and a 44-route production build.

### Milestone 126 — staging hosting readiness and missing runtime secret closed (25/09/2026)

Ran parallel deployment, protected-environment and post-deploy browser audits. The
existing Vercel team `js1-ccd7` contains project `jingwuguanseibukan`, but the project
currently has no environment variables, no connected Git repository, no deploy hook
and no deployed staging application at the configured fixed origin. The repository
also has no Vercel configuration or external one-minute worker scheduler. Production
was not contacted and no Vercel setting was changed.

The audit found that the runtime requires `DURABLE_RATE_LIMIT_SECRET`, while the
offline readiness validator and protected staging environment previously omitted it.
The validator now requires the server-only value, checks its strength/separation and
rejects a public-prefixed copy. A new distinct 64-character value was generated
directly into the protected staging environment without printing it. Focused tests
pass 9/9, the full TypeScript/Node gate passes 230/230, lint passes and the offline
staging provider check reports ready with zero blockers. The first build attempt hit
the known stale `.next` Windows lock; after removing only that ignored generated
directory, a fresh optimized build compiled successfully and produced a build ID.

The Vercel browser session is signed in, while Vercel CLI remains untrusted until the
operator authorizes its device-login request. Do not upload `STAGING_DB_URL`, database
passwords, `SECURITY_TEST_*` or backup paths. After CLI authorization, link only the
existing staging project, upload the reviewed staging runtime variables to Preview
scope, deploy the exact release commit, verify the fixed HTTPS alias and run the
read-only host gate before any authenticated or provider mutation test.

### Milestone 127 — Preview staging deployed and protected-host smoke tested (25/09/2026)

Authorized Vercel CLI access was completed, and the repository was linked only to the
existing `js1-ccd7/jingwuguanseibukan` project. The reviewed 13-variable runtime
allowlist was loaded from the protected staging environment into Preview scope for
`release/v1-readiness-20260918`. Database URLs/passwords, backup paths,
`SECURITY_TEST_*` and legacy duplicate aliases were excluded. The offline provider
validator passed before upload. Production variables and deployments were untouched.

Commit `cf0876a` deployed successfully as Preview
`dpl_Eh1NP7nSfrz2WhJm9Spwcguz7iJ9`; its immutable URL is
`https://jingwuguanseibukan-plwra42mx-js1-ccd7.vercel.app`, status is Ready, and
`https://jingwuguanseibukan-staging.vercel.app` points to it. The Vercel build passed
dependency installation, Next.js compilation, TypeScript, static generation of all
44 routes and output deployment. GitHub Actions run `36054340271` independently passed
checks plus Chromium, Firefox, WebKit/Linux and WebKit/macOS.

The exact-host public probe reached Vercel, but all 11 safe GETs returned a 302 to
Vercel SSO before the application. Through the signed-in in-app browser, `/login` and
`/auth/error` rendered, static assets and GET method-denial API boundaries passed, and
unauthenticated `/admin` reached the app and routed to `/login`. This is valid
behind-protection evidence only. Ordinary members, Supabase confirmation callbacks and
the external worker scheduler remain blocked until an explicitly approved exception is
added for only the fixed staging alias or another staging-safe access design is chosen.

### Milestone 128 — anonymous registration pre-request defect isolated and migration 047 prepared (25/09/2026)

The deployed registration page rendered but could not load its class selector. A
direct read-only query with the protected staging publishable key reproduced SQLSTATE
`42501`, `permission denied for function is_active_app_user`, for both `classes` and
`dojos`. Migration 018's anonymous catalog SELECT grants and active-only RLS policies
remain correct. The failure occurs earlier: migration 040's PostgREST pre-request hook
combines the authenticated-role test and protected helper call in one boolean
expression, whose evaluation order PostgreSQL does not guarantee.

Candidate migration 047 replaces only that SECURITY INVOKER hook. It returns before
the helper call for every non-authenticated role, preserves the fixed search path,
keeps `is_active_app_user(uuid)` denied to anonymous callers, retains the authenticated
disabled/deceased-account error and reasserts the authenticator hook plus ACLs. Focused
migration and layout tests pass 5/5. Migration 047 has not been applied anywhere and
requires explicit staging-only approval followed by anonymous catalog, helper denial,
disabled/deceased JWT, role-security, lint, exact-ledger and zero-residue acceptance.
GitHub Actions run `36096335398` passed checks, Chromium/Linux, Firefox/Linux,
WebKit/Linux and WebKit/macOS for the pushed candidate.

### Milestone 129 — migration 047 accepted and staging authentication opened (25/09/2026)

Migration 047 was applied only to staging `eomubndonbetszdbhsrj`. Its exact ledger is
now 006–047, the post-apply dry run is up to date and warning-level database lint is
clean. Anonymous API acceptance passed five active classes, four active dojos, zero
inactive catalog leakage, protected-helper denial, six sensitive-relation denials,
safe anonymous wrapper execution and the service-role boundary. The rollback-contained
active/disabled/deceased request-gate suite produced its expected rollback marker; an
independent connection confirmed zero Member 0101 residue and the exact ledger. The
Member/scoped Admin/Super Admin role suite passed 12/12.

Only `jingwuguanseibukan-staging.vercel.app` was added as a Vercel Deployment
Protection exception. Generated Preview URLs remain protected. The direct host probe
now passes all 11 public-page, asset, worker-method and security-header checks.
Supabase staging now uses that exact Site URL and only its exact `/auth/confirm`
redirect. Email/password login, confirmation, a ten-character mixed-case-and-digit
policy, protected Resend SMTP and the reviewed token-hash confirmation template were
enabled without exposing credentials.

Deployed browser acceptance passed public registration with all five classes, the
generic invalid-confirmation path, Member login plus Admin denial, scoped Admin login
plus Aikido-only member visibility, Super Admin login plus all-class visibility and
the pending Applications page. All sessions were signed out and no member record was
changed. A real signup/confirmation email was intentionally not sent because no
dedicated deliverable staging recipient is present in protected configuration.

The final local gate passes TypeScript and 233/233 Node tests, lint and a fresh
44-route optimized production build. Production was not contacted.

### Milestone 130 — staging worker and guarded WebKit release gates (25/09/2026)

Completed a non-mutating staging operations audit without contacting production.
The service-role queue-health RPC reports `PASS`; stuck, exhausted, overdue, queued,
due and duplicate counts are all zero. Invalid-secret probes against the deployed
`/api/system/email-worker` and `/api/push/send` routes both returned HTTP 401, and no
email or push was sent. Staging has only `supabase_vault` among the relevant installed
extensions: neither `pg_cron` nor `pg_net` is available, so no database scheduler is
currently installed.

The email worker requires an external once-per-minute POST to the exact staging
worker URL with the protected `x-worker-secret`, no request body, no redirects,
single-flight execution and sanitized logs. Native Vercel cron is not the selected
design because its request/target/frequency model does not match this endpoint. The
push route is not a queue worker: it requires an explicit user and notification
payload and must not be put on the email schedule. The protected Resend credential's
domain-inventory request returned HTTP 401, so sender-domain ownership and real
provider delivery remain unverified even though custom SMTP configuration exists.

Added a separate guarded, read-only deployed-staging WebKit harness; it does not
replace or repoint the loopback browser suite. The final staging-only run passes
18/18 in 28.5 seconds across WebKit desktop, iPad Mini and iPhone 13. The interim
no-request login failures were a harness-only Next hydration race, corrected by
waiting for network idle and verifying the controlled email/password values before
submit. The request allowlist adds exactly two legitimate read-only Member-profile
RPCs. Redundant sign-out was removed because Playwright creates an isolated browser
context for every test. No mutation was allowed, no member record changed and no
credential-bearing artifact was retained. This is automated WebKit evidence;
physical Safari/iOS and separately approved mutation workflows remain open.

The updated strict SQL verifier was also run read-only against exact staging history
006–047. All migration, hook, ACL, ownership and role checks before the final default-
privilege gate passed. The verifier then stopped as designed with SQLSTATE `P0001`:
only `supabase_admin`-owned defaults remain unsafe. They grant global `PUBLIC EXECUTE`
on future functions and public-schema `anon`/`authenticated` function, sequence and
table privileges, including all eight relation privileges. No unsafe `postgres`-
owned default was found. This managed-platform owner gate remains unresolved and was
not weakened or accepted.

### Milestone 131 — exact 006–047 recovery contract prepared (25/09/2026)

Upgraded the offline recovery-readiness gate to manifest version 2 without contacting
staging or production. The gate now requires exact staging project
`eomubndonbetszdbhsrj`, an explicit `production.exists=false`/null reference while no
production project exists, measured recovery-point/start/completion timestamps, and
RPO/RTO consistency. It fails closed on invented production identities, stale
recovery points and inconsistent restore durations.

Added a deterministic release fingerprint covering every canonicalized migration
file from 006 through 047 and a protected-ledger fingerprint mode that hashes ordered
version, name and statement evidence without printing SQL. Manifest readiness now
requires the immutable repository contract plus matching source/restored ledger
fingerprints. Thirteen focused recovery tests pass, and the intentionally incomplete
template remains blocked as designed. This prepares the disposable-target rehearsal;
it does not claim that managed Auth, Storage bytes/metadata, roles, configuration or
provider resources have been restored.
### Milestone 132 — JS Video Uploader Stage G provider-ready candidate (27/09/2026)

Advanced the preserved Windows uploader from the Stage B authentication preview to
a provider-ready Stage G candidate without contacting production or uploading a real
video. Desktop v0.8.1 now enforces the dedicated Repository Uploader appointment,
loads exact database class/rank/tier and class-logo data, selects local video files,
bundles FFmpeg with its license, applies organization and class logo watermarks,
uses installed-app Google OAuth with PKCE and exact-channel verification, performs
resumable YouTube uploads, exposes upload progress/cancellation and saves successful
uploads as repository Drafts through the existing guarded RPC.

TypeScript/build and 21/21 desktop tests pass. Read-only staging acceptance denies
the unappointed Member and Admin fixtures and grants all five classes to Super Admin.
Development and packaged Electron smoke tests pass; package inspection found no
protected credential/env/test-fixture leakage. Local FFmpeg processed and decoded a
synthetic dual-watermark video. The rebuilt NSIS installer passed a complete silent
install, installed-app smoke test and silent uninstall with zero residue.

Live uploader release remains blocked on the public Google Desktop OAuth client ID,
the exact organization YouTube channel ID, any Google audit needed to avoid forced
Private uploads, and correcting the class-logo audit: Aikido still references retired
project `pkmllhaavadhaozmwapz`, while Kungfu Kids has no logo. Karate, Taiji and
Xingyi use approved current origins. The candidate is unsigned and
still uses the default Electron icon. No production, retired Supabase storage or
YouTube upload endpoint was contacted.

### Milestone 133 — JS Video Uploader upload-path hardening (27/09/2026)

Added deterministic mocked resumable-upload acceptance for request metadata, privacy,
content range, returned video identity and hostile upload-session addresses. Tightened
the upload-session boundary to the exact HTTPS Google API origin/path with a required
session ID, closing a suffix-validation weakness. The test compiler now isolates each
parallel process so the expanded 21/21 suite is deterministic. A new read-only staging
logo audit confirmed three current logos and the exact two blockers above. No video,
repository content, database record or production system was changed.

### Milestone 134 — managed Supabase default-privilege gate closed (27/09/2026)

Re-audited the staging catalog read-only and proved all 77 public relations, 214
public routines and 87 public types are `postgres`-owned, with no public object owned
by managed `supabase_admin`. The `postgres` application role cannot inherit or alter
that platform role. Updated the strict verifier to continue failing on unsafe
`postgres` defaults and to accept managed defaults only while both ownership and
role-membership invariants remain true. A future managed-role public object or role
inheritance therefore fails closed. Focused SQL-security tests and the exact pinned
read-only staging verifier pass. Production and application data were not contacted
or changed.

### Milestone 135 — regular-schedule browser mutation gate (27/09/2026)

Added a network-disabled browser fixture around the real Admin schedules page and
the exact schedule RPC contract. It verifies scope/instructor loading, creation,
editing, deactivation, error visibility and no created row after rejection. After
fixing fixture synchronization around asynchronously loaded select options, the full
browser gate passes 50/50 on Chromium/WebKit desktop and 75/75 on Chromium mobile,
WebKit tablet and WebKit mobile. No external request or database mutation occurred;
the earlier rollback-contained staging SQL evidence continues to prove the persisted
authorization, audit and scope semantics.

### Milestone 136 — bulk-assessment browser mutation gate (27/09/2026)

Added a network-disabled fixture around the real Super Admin assessment page and its
exact prepared-assessment RPC contract. The workflow loads a scoped three-member
roster, selects both required assessor types, prepares all certificates as Pending,
marks two Pass and one Fail, reviews the whole roster and submits it exactly once.
The fixture verifies pass-only promotion, no grade change for the failed member,
Issued/Void certificate transitions and a class/dojo announcement ordered from the
highest successful destination grade down.

The production build generated all 50 routes. The final browser matrix passes 156/156
checks across Chromium and WebKit desktop, tablet and mobile; the new assessment
workflow passes once in each of the six profiles. Type-check plus Node tests pass
279/279 and lint passes. No external request, staging mutation or production contact
occurred. Existing rollback-contained staging SQL evidence remains the persisted
authorization, transaction, announcement-order and zero-residue proof.

### Milestone 137 — certificate QR verification browser states (27/09/2026)

Extended the isolated production server with a loopback-only Supabase RPC stub for
the exact server-side `verify_prepared_assessment_certificate` call. The stub accepts
only the fixed local service credential and only the verification endpoint. The real
server-rendered public route now verifies Issued, Pending, Void and unknown UUIDs,
including the expected identity/rank/number details, distinct validity copy, no links
or downloadable document, responsive layout and an automated accessibility scan.

The finalized expanded matrix passes 162/162 checks across Chromium and WebKit
desktop, tablet and mobile; certificate verification passes 6/6 profile executions.
The first attempt reached the correct Issued page but expected the route title without
the configured site-name suffix; the assertion was aligned with actual production
metadata before the clean final runs. No staging record, provider or production
system was read or changed.

### Milestone 138 — deceased-member memorial interface and contrast gate (27/09/2026)

Added network-disabled browser coverage around the real Super Admin memorial panel.
The workflow marks a member Deceased, enters Date of Passing, selects Aikido and
Karate recipients, enables and writes both annual reminders, saves the complete
draft, and manually publishes Initial Memorial title/message content. A separate
reversal workflow proves clearing Deceased empties the date, clears annual enablement
and disables all memorial publication controls. The preservation and non-Terminated
copy is asserted directly.

The first accessibility scan found two genuine contrast failures in the production
panel's neutral-500 explanatory text. Both were corrected to neutral-400. The final
production build generated 50 routes and the expanded matrix passes 174/174 checks
across Chromium and WebKit desktop, tablet and mobile; memorial workflows pass 12/12
profile executions. Type-check/Node tests pass 279/279 and lint passes. Existing API
unit tests and rollback-contained staging SQL remain the authorization, Auth-action,
transaction and zero-residue evidence; no live Auth or data mutation occurred.

### Milestone 139 — Member contact and verified-email browser gate (27/09/2026)

Added a network-disabled fixture around the real Member profile. The successful
workflow edits only phone and optional Instagram, verifies normalized values,
preserves Member ID/name/current email, and checks the exact authenticated
email-change request. The recovery workflow proves a rejected contact update and a
duplicate email remain visible and retryable without losing the form values.

The fixture uncovered an unstable `useRouter` test double which returned a new
router object on every render and retriggered the profile loading effect. The double
now uses the stable identity provided by real Next.js routing. The production build
generated 50 routes and the finalized browser matrix passes 186/186 checks across
Chromium and WebKit desktop, tablet and mobile; the two contact workflows pass 12/12
profile executions. Type-check/Node tests pass 279/279 and lint passes. No external
request, staging mutation, Auth-provider change, email delivery or production contact
occurred; the real confirmation round trip remains a guarded staging gate.

### Milestone 140 — Mux video uploader and signed repository playback candidate (27/09/2026)

Replaced the desktop uploader's new-upload YouTube path with Mux Direct Uploads while
preserving existing YouTube repository items as legacy playback. Desktop v0.9.0 keeps
both organization/class watermarks in the locally processed MP4, obtains a one-time
upload URL from the authenticated Super App, uploads resumable 8 MiB chunks directly
to Mux, polls processing, and asks the server to create a repository Draft. Google
OAuth, channel configuration and YouTube uploader code were removed from the desktop
package. No Mux, staging or production endpoint was contacted.

Added a deferred Mux migration candidate, which stores a separate Mux asset ID, validates complete
provider pairs, keeps legacy YouTube rows valid, makes asset IDs unique/idempotent, and
adds a service-role-only Draft finalizer. The server re-reads the Direct Upload and
Asset from Mux, verifies the signed playback policy plus uploader/class passthrough,
then supplies the provider IDs to the database; the desktop cannot supply them. Mux
provider IDs are immutable through the browser update RPC, while authorized title,
description, status and sort-order edits remain available. Guarded rollback-contained
staging acceptance and independent ledger/residue/security SQL were prepared but not
run because the Mux candidate has not been assigned an active migration number or applied remotely.

Member playback now uses the lazy Mux React player after existing repository RLS grants
visibility. A server endpoint issues an RS256 playback JWT with the Mux-required claims;
the player receives no API credential or signing key and disables Mux Data tracking and
cookies. The CSP permits Mux playback CDNs, and legacy YouTube embeds continue to use
the privacy-enhanced host. Provider readiness now validates four server-only Mux values:
`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID` and a base64-encoded
`MUX_SIGNING_PRIVATE_KEY`.

The complete Super App type-check/Node suite passes 285/285, the desktop TypeScript/
build suite passes 21/21, lint passes, the 51-route production build passes, migration
006–054 integrity matches its updated 49-file fingerprint, and `git diff --check`
reports no whitespace errors. Root and desktop production-dependency audits each report
zero vulnerabilities. Live release remains blocked on a Mux account/API token,
URL-signing key, protected staging environment values, an active Mux migration number,
staging deployment, a disposable real-video upload/playback test, and a rebuilt/verified
Windows installer. Existing Aikido and Kungfu Kids logo blockers also still apply.

### Milestone 141 — last-training browser and accessibility gate (27/09/2026)

Completed the non-Mux last-training-session browser milestone without contacting
staging, production or any provider. A network-disabled fixture now exercises the
real Admin members page and Member profile. It covers marking an active membership
as trained today, correcting an older date, the server-calculated under-30-day
relative display, the 30-day date fallback, an unavailable Member status and a
rejected Admin mutation that remains retryable without losing its entered date.

The first run exposed a genuine UI state defect: the training mutation set the
page-wide processing ID but never cleared it, leaving correction and retry controls
disabled after either success or failure. The Admin page now clears both processing
locks in `finally`. The full-page accessibility scan also found five unnamed filter
selects and low-contrast neutral helper text; the filters now have explicit accessible
names and the affected text uses the compliant neutral-400 presentation.

The production build generated all 51 routes. The finalized browser matrix passes
204/204 checks across Chromium and WebKit desktop, tablet and mobile; the three new
last-training workflows pass 18/18 profile executions. Type-check and Node tests pass
285/285, lint passes and `git diff --check` reports no whitespace errors. Migration
045–046 staging evidence remains the persisted authorization/audit proof; no live
membership or audit row was changed. Mux configuration and its deferred migration remain
explicitly deferred.

### Milestone 142 — finance payment workflow browser gate (27/09/2026)

Completed the next non-Mux finance milestone through network-disabled fixtures around
the real Admin subscription and payment-confirmation pages. A scoped Admin can record
a complete payment without waiting for a Member request, retain the entered audit
details after a rejected RPC, retry the full payment, identify a payment made after
its billing month as `LATE PAYMENT`, approve a confirmation, require a reason before
rejection, and retry a failed review without losing that reason. The fixtures assert
the exact guarded RPC payloads and confirm the resulting paid, approved and
rejected history states.

The first confirmation-review run exposed a genuine feedback defect: success was shown
before the page refresh, whose initial message reset immediately erased it. Approval and
rejection now refresh first and then present their persistent success message. Automated
accessibility checks also found unnamed search/month/status/class/dojo filters,
low-contrast helper text and a mobile history table whose horizontal scroll region was
not keyboard focusable. The controls now have explicit accessible names, affected text
uses neutral-400, and the named history region accepts keyboard focus.

The production build generated all 51 routes. The finalized browser matrix passes
222/222 checks across Chromium and WebKit desktop, tablet and mobile; the three new
finance workflows pass 18/18 profile executions. Type-check and Node tests pass
285/285, lint passes and `git diff --check` reports no whitespace errors. This milestone
did not contact staging, production, Supabase, Vercel or any payment provider. Positive
settlement-detail browser coverage and live guarded finance mutations remain separate
staging gates; Mux remains explicitly deferred.

### Milestone 143 — full-payment-only simplification (27/09/2026)

Removed partial payments from future Member and Admin workflows. The Admin page now
offers one `Mark Full Payment` action with a fixed, non-editable outstanding amount;
the Member confirmation page likewise displays the complete outstanding amount instead
of accepting an amount. Partial-payment cards, filters, badges and wording were removed.
Historical payment rows remain intact, and any historical incomplete payment is treated
as an outstanding charge rather than offered as a new partial-payment workflow.

Candidate migration 054 adds private fixed-search-path insert triggers to both official
payments and Member confirmations. Each trigger locks its charge, recalculates the
remaining balance and rejects any new amount that is not exactly the full outstanding
balance. It does not update or delete historical payments. The active local recovery
contract is now the exact 49-file migration chain 006–054. Migration 054 is prepared
locally only and has not been applied to staging or production.

The production build still generates all 51 routes. The finalized browser matrix passes
222/222 checks across Chromium and WebKit desktop, tablet and mobile, including full
payment success and retry recovery in every profile. Type-check and Node tests pass
288/288, lint passes and `git diff --check` reports no whitespace errors. No remote
database, provider, Vercel environment or production service was contacted.

### Milestone 144 — settlement review, export and responsive browser gate (27/09/2026)

Completed the remaining local finance presentation gate through a network-disabled
fixture around the real Super Admin settlement page. The workflow verifies late and
on-time payment classification against charge month, keyboard-accessible settlement
details, a real Excel detail download, failed-then-successful detail loading, approval,
required rejection reasons and rejection retry without losing the entered audit note.
The fixture asserts every settlement-detail and review RPC payload.

The workflow exposed a genuine feedback defect shared by settlement creation, transfer,
submission, cancellation and review: each success message was set before `loadPage()`,
which immediately cleared it. These actions now refresh first and then show persistent
success feedback. Filter controls now have accessible names, the wide payment table is
a named keyboard-focusable scroll region, and low-contrast settlement labels/buttons
were corrected.

The production build generates all 51 routes. The expanded browser matrix passes
228/228 checks across Chromium and WebKit desktop, tablet and mobile; the settlement
workflow passes 6/6 profile executions. Type-check and Node tests pass 288/288, lint
passes and the test harness blocks all external browser requests. Migration 054 remains
prepared locally and unapplied. No staging database, provider, Vercel environment or
production service was contacted.

### Milestone 145 — migration 054 guarded staging test preparation (27/09/2026)

Prepared, but did not run, the guarded staging checks for the full-payment-only
migration. The rollback-contained semantic suite selects only the three known staging
identity roles, creates two isolated future charges inside one exception-rolled-back
transaction, proves partial direct payment and partial Member confirmation denial,
accepts each exact outstanding amount once and rejects a second direct payment. It uses
a unique timestamp marker plus dynamically selected unused months and makes no changes
to existing payment history.

The independent postflight requires the exact 006–054 ledger and migration name,
checks zero marker residue, both enabled triggers, serialized `FOR UPDATE` balance
checks, private browser ACLs and fixed helper search paths. A Node contract test guards
the rollback signal and postflight coverage. These SQL files remain local and unrun;
migration 054 remains unapplied, and no staging or production endpoint was contacted.

### Milestone 146 — migration 054 staging persistence and finance security gate (27/09/2026)

Applied only `054_full_payment_only.sql` to staging `eomubndonbetszdbhsrj` after an
explicit target guard, an exact pre-apply 006–053 ledger check and a dry run that named
054 as the sole pending migration. No linked-project command was used. The independent
post-apply ledger now records the exact contiguous 006–054 chain with 054 exactly once.

The rollback-contained semantic suite returned its exact expected success exception.
It proved partial direct-payment denial, exact full direct-payment acceptance, duplicate
payment denial, partial Member-confirmation denial and exact full confirmation acceptance.
The independent postflight passed with zero marker residue, both triggers enabled,
serialized balance checks, fixed helper search paths and no browser helper execution.
Supabase database lint reported no schema errors, and the stricter repository database
verifier also passed.

All 12 authenticated staging security checks passed for Member, scoped Admin and Super
Admin, including row isolation, archive/delivery/payment-confirmation privacy, finance
helper caller isolation and privileged RPC denial. The guarded read-only WebKit staging
matrix passed 18/18 across desktop, tablet and mobile, including scoped Admin payments
and Super Admin settlements without mutation. One-time sessions were cleaned up by the
guarded runners. Production was not contacted. The current full-payment interface still
requires a new staging deployment before a disposable end-to-end browser mutation test.

### Milestone 147 — release CI and branch Preview verified (27/09/2026)

Published the reviewed training and full-payment release work, followed by the
locale-safe finance assertion repair, to `release/v1-readiness-20260918`. The
implementation checkpoint is `3a118f7`; later commits contain release evidence and
recovery metadata only. GitHub CI passed all five release
checks: the common checks job, Chromium/Linux, Firefox/Linux, WebKit/Linux and
WebKit/macOS. The corrected local Playwright WebKit matrix passed 114/114 with zero
skips, unexpected results or flakes.

Vercel Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP` is Ready through the
release-branch Preview alias. The fixed staging alias was not changed and still serves
the prior release because the project-scoped-token alias API returned HTTP 404. The
temporary Vercel token was revoked, its local temporary file was removed and the
clipboard was cleared. Therefore, guarded browser acceptance through the fixed staging
alias is still open and no success is claimed for the new Preview through that host.

Migration 054's independent staging postflight again passed the exact 006–054 ledger,
zero-residue and security contract. The authenticated staging security suite passed
12/12 for Member, scoped Admin and Super Admin. No production endpoint, deployment,
configuration or data was contacted or changed.

### Milestone 148 — operational and recovery evidence reconciled (28/09/2026)

Corrected current-state documentation that had incorrectly implied the fixed staging
alias served the latest Preview. It still serves the prior deployment, so the earlier
11 host probes and authenticated browser checks remain historical evidence rather than
acceptance of the current Preview. Mux remains deferred and is not a gate for the
current non-Mux release candidate.

The isolated recovery and provider-operations checks passed 18/18, the recovery
fingerprint still matches the exact 006–054, 49-file contract, and the focused email
worker/provider tests passed 30/30. The email worker implementation and retry/backoff
behavior are locally verified, but no external once-per-minute scheduler is configured
and real Resend sender-domain/delivery evidence remains open.

The audit also confirmed that the exact migration ledger is not a complete schema
baseline: the live `email_outbox` table and its core queue, claim and acknowledgement
RPCs predate the checked-in chain. Protected backup evidence and a disposable restore
must capture and exercise those objects. The Vercel integration still reports as not
installed, the staging alias was not changed, and production was not contacted.

### Milestone 149 — fixed staging alias and current-Preview WebKit acceptance (28/09/2026)

Authenticated the supported Vercel CLI to the existing account and reassigned only
`jingwuguanseibukan-staging.vercel.app` from the prior Preview to Ready deployment
`dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP`. A post-change inspection resolved the fixed alias
to that exact deployment, and the Vercel dashboard listed the fixed alias on the
release Preview. No Production alias, domain, deployment, configuration or data was
contacted or changed.

The pinned staging host gate passed 11/11 read-only probes covering public pages,
assets, protected route shells, method guards and security headers. The guarded
staging WebKit matrix passed 18/18 checks with one worker: six checks each on desktop,
tablet and mobile for anonymous registration and confirmation recovery, Member access,
scoped Admin boundaries, Super Admin read-only pages and certificate not-found
handling. The suite made no application-data mutations. Deferred Mux and uploader
files remained untouched.

### Milestone 150 — deployed Repository Draft zero-residue mutation gate (28/09/2026)

Added a staging-pinned WebKit harness for the smallest safe deployed mutation: one
Super Admin Repository item created as Draft, edited and deleted. The guard enforces
the exact fixed staging Vercel and Supabase targets, the protected Super Admin 0001
identity, an exact create → captured-UUID update → same-UUID delete state machine and
the deployed empty-video wire contract. Off-origin, provider, publishing, direct-table,
duplicate and out-of-order browser mutations are blocked before network I/O.

The Supabase server credential stays in the parent process. Before mutation the parent
requires an empty reserved test-marker inventory and fingerprints Repository Uploader
assignment audit history. On every normal exit or interruption it validates the exact
fixture creator, scope and fields, refuses ambiguous or video-linked rows, deletes only
the verified UUID when cleanup is necessary, then requires zero marker residue and an
unchanged uploader-audit count. A later run fails closed if a hard host loss ever leaves
a reserved marker.

The local contract tests passed 3/3, targeted ESLint and TypeScript passed, and the
approved live WebKit staging workflow passed 1/1 in 12.9 seconds. Its independent
parent postflight completed successfully: the fixture inventory is empty, no video
asset exists and uploader appointment/audit state did not change. No content was
published, no provider or production endpoint was contacted, and deferred Mux/uploader
files remained untouched. The post-mutation fixed-host gate passed 11/11 and the
read-only WebKit matrix passed 18/18 across desktop, tablet and mobile after its config
was updated to exclude mutation-only specs explicitly.

### Milestone 151 — contact concurrency boundary and next-gate safety review (28/09/2026)

Prepared migration 055 and the matching Member profile update locally. The new
`update_my_contact_details_if_unchanged` RPC locks the caller's profile, compares the
exact phone and nullable Instagram values captured when editing began, and rejects a
stale form with SQLSTATE `40001` before any profile or audit write. Exact no-op calls
skip both the profile update and contact-audit insert. The existing two-argument RPC
remains available for older deployed clients during the migration-first rollout.

The profile editor now sends the captured baseline, refreshes current contact values
and stays open when another session wins the race, and distinguishes an already-current
no-op from a saved change. A staging-pinned contact no-op harness is prepared with an
exact four-field CAS payload, Member-only identity checks, an explicit read-path
allowlist, parent-only server credentials, and a postflight scoped to unchanged
profile/contact-audit state. Expected Auth sign-in metadata is explicitly outside that
guarantee. Rollback-contained SQL acceptance and an independent exact-ledger,
zero-marker, ACL and fixed-search-path postflight are prepared but unrun.

An independent review rejected the first disposable-registration harness before any
live write: normal registration would retain both applicant and administrator email
outbox rows, could race the email worker, and did not inventory all dependent history
objects. Those unsafe harness files were removed. A real registration test remains
blocked on a dedicated deliverable inbox plus an isolated staging class/dojo and a
catalog-derived cleanup boundary; the JS Member ID sequence advance must remain an
explicit irreversible staging side effect.

The local migration/recovery contract is now the exact 50-file chain 006–055. Type-
check and all 302 Node tests pass, repository-wide ESLint passes, the 51-route
production build passes, the recovery fingerprint matches, YAML parsing passes and
`git diff --check` reports no whitespace errors. GitHub Action references are prepared
at immutable Node-24-compatible release SHAs, but none of this milestone has been
committed, pushed, deployed or applied to staging. Staging remains at migration 054;
production and deferred Mux/uploader work were not contacted or changed.

Post-commit guard correction: a requested read-only `migration list --linked` check
revealed that the checkout's Supabase CLI link still names retired project
`pkmllhaavadhaozmwapz`, not staging. The command only listed its migration ledger and
made no schema or data mutation, but it did contact that retired project, so its output
is not staging evidence and all further linked commands are blocked. Before migration
055, the CLI must be safely relinked and re-verified against staging
`eomubndonbetszdbhsrj`; production/retired-project mutation remains prohibited.

### Milestone 152 — migration 055 staging rollout and contact CAS release gate (28/09/2026)

Relinked the checkout to staging `eomubndonbetszdbhsrj` and verified the exact
pre-apply ledger was 006–054 before a dry run named only migration 055. Applied only
`055_contact_details_compare_and_swap.sql`; the remote ledger is now exactly 006–055.
The rollback-contained contact compare-and-swap suite returned its expected success
signal, and the independent postflight passed zero marker residue, exact ledger, ACL
and fixed-search-path checks. Warning-level database lint reported no public-schema
errors and the stricter repository database-security verifier passed.

Deployed clean commit `c639e0d` to Ready staging Preview
`dpl_otHaqRmeREfKMAeT653D4CN7Tugd` with the protected staging runtime/build values and
assigned only `jingwuguanseibukan-staging.vercel.app`. An earlier manual Preview had
inherited a retired backend URL; the browser request guard blocked that target before
network I/O, the alias was restored immediately, and the corrected Preview was then
verified. No request from the guarded browser reached the retired project or
production.

The guarded Member 0101 compare-and-swap no-op passed 1/1 in both Chromium and WebKit;
its parent postflight proved the complete profile row and contact-audit history were
unchanged. Auth sign-in/session metadata remains the explicitly documented exception.
The staging role suite passed 12/12, and the fixed host passed 11/11 current route and
security-header probes. The live WebKit read-only matrix passed 18/18 across desktop,
tablet and mobile. Windows Schannel/WebKit temporarily failed every HTTPS navigation
despite an independently authorized Vercel certificate, so the successful WebKit
application runs used Playwright's transport bypass only after Node TLS validated the
certificate and host. Both checked-in Playwright configs were restored to
`ignoreHTTPSErrors: false`; this is qualified application evidence, not a claim that
the local Windows WebKit TLS path passed.

CI initially exposed a stale isolated profile-contact fixture that still recognized
the legacy RPC. The fixture now models the four-field CAS call and conflict response;
the full local Chromium suite passes 38/38. Final GitHub run `36411271185` for
implementation/test head `5dc869f` passes all five jobs: common lint/tests,
Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS. Deferred Mux/uploader
files were neither staged, committed nor deployed.

### Milestone 153 — pre-migration recovery baseline gate (29/09/2026)

A staging-only, read-only catalog audit confirmed that the 006–055 migration chain is
not a standalone schema baseline. The live `email_outbox` table has 21 columns, RLS
enabled with no browser policies, service-role-only table access, four indexes plus
its primary key, two profile foreign keys, a status constraint and the
`normalize_email_outbox_trigger`. Its queue/claim/sent/failed functions are fixed-
search-path security definers executable only by `service_role`, but they still depend
on older untracked primitives such as `normalize_email_outbox()` and `clean_text()`.
No table rows were queried and no database object or data was changed.

Upgraded the offline recovery manifest to version 3. A restore can no longer pass on
matching migration history alone: it must include an explicit verified pre-migration
baseline component/check plus matching positive source/restored schema-catalog object
counts and SHA-256 digests. Added a deterministic schema-catalog fingerprint tool that
accepts exactly 18 schema-only JSON exports, rejects missing/extra JSON and empty or
malformed evidence, normalizes key/row order and line endings, and never prints raw
definitions. The recovery guide now consistently names the exact 006–055 contract.

The focused recovery suite passes 18/18, targeted ESLint passes, TypeScript passes,
and the intentionally incomplete template fails closed on every unverified recovery
component including the new baseline proof. This strengthens the gate but does not
claim a protected backup or disposable restore; those still require a separately
authorized isolated restore target and protected catalog exports. No production,
provider, member data or deferred Mux/uploader file was contacted or changed.

### Milestone 154 — guarded regular-schedule mutation gate (29/09/2026)

Completed the next deployed mutation gate. The staging-pinned WebKit harness permits
exactly one scoped Admin 0002 schedule create followed by one update that deactivates
the same captured UUID. Its request state machine rejects a
wrong dojo, altered fields, instructor assignment, duplicate/out-of-order calls,
reactivation, direct-table traffic, the retired backend, providers and production.
The selected time slot is collision-checked inside one actual Admin-managed scope,
and regular schedules have no event, attendance, reminder or notification side
effects.

The server credential and database-owner URL remain in the parent process. On every
normal exit or interruption the parent requires either the exact created state with
one audit row or the exact updated/inactive state with two audit rows, locks that
captured row through the staging database-owner connection, deletes only its audit
rows and schedule UUID in one transaction, then requires the reserved marker
inventory to be empty. Ambiguous or changed state fails closed for manual review.
The cleanup connection is restricted to the recorded Sydney staging pooler; no
test-only product RPC was added.

The request-guard tests pass 3/3, targeted ESLint, TypeScript and whitespace checks
pass, and the ordinary read-only staging matrix explicitly excludes this
mutation-only spec. The approved live WebKit workflow passed 1/1 in 13.2 seconds.
Parent postflight verified the exact inactive fixture and its two audit rows, removed
only those rows in one database transaction, and confirmed an empty reserved-marker
inventory. Expected Auth sign-in/session metadata is outside the zero-residue
guarantee. A read-only GitHub API check confirms run `36473581644` at recovery-gate
head `b0e8bcb` completed successfully across checks, Chromium/Linux, Firefox/Linux,
WebKit/Linux and WebKit/macOS. Production, the retired project and deferred
Mux/uploader files were not contacted or changed.

### Milestone 155 — guarded last-training mutation gate (29/09/2026)

Completed the next deployed mutation gate for the existing last-training workflow.
The staging-pinned WebKit harness searches exact dummy
Member 0101 inside scoped Admin 0002's live administrative view, submits one safe
past-date correction, and then marks that same captured membership trained today.
Its request state machine permits only those two RPCs in that order and rejects a
different membership, date, identity, backend, provider, duplicate or direct-table
mutation.

Before browser mutation, the parent captures the complete membership row and the
complete append-only training-audit history. On every normal exit or interruption it
accepts only the exact one-row correction or exact two-row correction/today sequence,
locks the membership and newly captured audit UUIDs, removes only those audit rows,
restores the original training date, then requires the full membership and audit
business baselines to match. The existing membership trigger advances `updated_at`
on every update, so that timestamp is explicitly excluded from zero-residue while
every business field remains exact. Pre-existing audit drift, another membership-
field change or an ambiguous row set fails closed. Server/database credentials stay
out of Playwright.

The first approved run completed both application mutations, but a text-based button
assertion missed the button's longer accessible name and postflight correctly stopped
when the existing membership trigger advanced `updated_at`. A forensic read proved
the exact two new audit UUIDs and `null → correction → today` transitions. The
approved cleanup removed only those UUIDs and restored the original null date; an
independent read confirmed zero training-audit rows. The harness now asserts the
actual accessible button and treats only trigger-managed `updated_at` as metadata.

The corrected WebKit run passed 1/1 in 10.8 seconds. Parent and independent
postflight both confirmed the original null training date, exact business membership
fields and zero audit rows; only `updated_at` plus expected Auth session metadata are
outside the zero-residue guarantee. Request-guard tests pass 3/3; syntax, targeted
ESLint, TypeScript and whitespace checks pass. Production, the retired project,
providers and deferred Mux/uploader files were not contacted or changed.

### Milestone 156 — protected staging recovery source captured (29/09/2026)

Completed the source half of the managed-platform recovery rehearsal against only
staging `eomubndonbetszdbhsrj`. The protected logical package contains the application
database, Auth and Storage metadata and global role definitions with role passwords
excluded. It is AES-256-CBC/PBKDF2 encrypted, passed decrypt-and-list verification and
has SHA-256 `5c3ebb6079fbc8f1e0c8544bb78fca4b9e1b418c3020283dab6d40cb5d3d1ef2`.
New plaintext dump/tar intermediates were removed after verification.

The exact source ledger is 006–055 with 50 migrations and digest
`e76ad2f14c8a7723d335d6b57a7517cad01fa969358ca415355fd1b7bbc94ce4`.
The deterministic 18-file catalog contains 4,146 schema objects with digest
`91dddeeadfb43b1d710dfa5574cb9d860a588ffbd103015aae01ffab27be2bd7`.
Source inventory records 57 Auth users/identities, two Storage buckets and one
1,580,749-byte Storage object. That byte object was downloaded from staging,
size/SHA-256 verified, encrypted separately and decrypt/list verified; the encrypted
archive digest is `ba7eecbd60e12ec9af6c25d7f6d99eefdd08506226df1066809a6299682b65f7`.
Its plaintext copy was removed. Staging contains no database `cron` schema/job table.

The approved free disposable Supabase project could not be created because the
account already has two active free projects. Supabase rejected the request before
creation; no payment, upgrade, pause, deletion or existing-project change occurred.
The protected source evidence is complete, but restored catalog/ledger fingerprints,
Auth/API login, Storage upload/download, RLS smoke and target quarantine remain open.
A local PostgreSQL 17 target is available as a narrower interim option, but it cannot
substitute for managed Auth, Storage API and platform-configuration recovery proof.
Production, the retired project, providers and deferred Mux/uploader files were not
contacted or changed.

### Milestone 157 — local PostgreSQL recovery rehearsal completed (30/09/2026)

Restored the protected staging database package into a disposable, loopback-only
PostgreSQL 17.11 cluster using a separate local bootstrap owner. The restored counts
are exact: 67 public tables, 57 Auth users, 57 identities, two Storage buckets, one
Storage object metadata row and 50 migrations. The 006–055 migration ledger is
semantically exact.

The restore emitted exactly eight expected `supabase_vault` errors and no unexpected
errors because Supabase's managed Vault extension is unavailable in standalone
PostgreSQL. After normalizing the three captured owner ACLs, 17 of 18 catalog files
and 4,145 of 4,146 catalog objects match canonically; only the managed Vault extension
is absent.

The repository database-security verifier passes. Independent checks confirm 75 RLS
relations, 11 forced-RLS relations, 69 policies, denial of sensitive-view access for
both browser roles, 16 captured roles, 22 captured memberships, no direct membership
for the local bootstrap owner, and no subscriptions, replication slots, foreign
servers or cron schema. Supabase CLI 2.118.0 connected locally, but a new CLI-lint pass
cannot be claimed because the standalone distribution lacks `plpgsql_check`.

The cluster was fast-stopped and quarantined with no PID file, listener or PostgreSQL
process remaining. Sanitized evidence is retained in the restricted local recovery
workspace and the protected encrypted source evidence was not modified or deleted.
Managed Auth, Storage object/API, managed-extension and platform-configuration restore
proof remains open until a disposable Supabase target is available. Production, the
retired project, remote staging, providers and deferred Mux/uploader files were not
contacted or changed.

### Milestone 158 — normalized logo library and staging class logos (30/09/2026)

Converted all ten supplied logos to uniform 1024 × 1024 PNGs, centered and aspect-fit
on white without cropping or stretching. Added the organization logo, five class logos
and four dojo/affiliate logos under `public/logos`, documented their database-name
mappings, and switched every active organization-logo reference from the old JPEG to
`/logos/organization/logo-js.png`.

Uploaded exactly the five active class logos to staging `eomubndonbetszdbhsrj` at
`class-logos/{class-id}/logo.png` and updated their class logo URLs. Aikido no longer
references the retired project and Kungfu Kids now has a logo. Postflight confirms all
five remote objects are exact byte matches to the repository PNGs, with valid PNG
signatures and 1024 × 1024 dimensions. Previous target-object and URL baselines were
captured locally before mutation.

Chushin & Zhongxin, Kagami, UAC and Hayashitane remain versioned static assets because
the current database has no dojo-logo field or upload workflow. ESLint, TypeScript,
312/312 application tests, 21/21 desktop-uploader tests, whitespace checks and the
51-route production build pass. No deployment occurred; production and the retired
project were not contacted.

### Milestone 159 — logo release deployed and accepted on staging (30/09/2026)

Pushed release commits `c0e7310`, `9ab548b` and `2d939d1` to
`release/v1-readiness-20260918`. GitHub Actions run `36632559544` at exact head
`2d939d1` passed all five jobs: common checks, Chromium/Linux, Firefox/Linux,
WebKit/Linux and WebKit/macOS.

Created a clean deployment export from `2d939d1` so none of the unrelated deferred
Mux/uploader working-tree files could be uploaded. The first manual Preview inherited
the retired Supabase public URL; the staging browser request guard rejected it before
network I/O, and the staging alias was immediately restored to the preceding verified
Preview. Rebuilt the same commit with the 13 protected staging runtime/build values and
assigned only `jingwuguanseibukan-staging.vercel.app` to Ready Preview
`dpl_D5FDeemduJDLfd86SGZ9Vmjg6Xcz`.

Updated the read-only host probe to expect the new organization asset's `image/png`
content type. The corrected deployment passes all 11 route/method/security-header
probes and all 18 guarded read-only WebKit tests across desktop, tablet and mobile.
Every one of the ten static logo URLs returns HTTP 200 `image/png`, is exactly
1024 × 1024, and byte-for-byte matches the corresponding committed asset. Production
was not deployed or contacted, and the retired project received no guarded request.

### Milestone 160 — current release boundary reconciled (30/09/2026)

Revalidated the checkout's staging-only link before network use. A read-only migration
listing proves an exact 50-entry local/remote ledger from 006 through 055 with no gap or
pending file. The pinned strict database-security verifier completed successfully in
read-only mode against only `eomubndonbetszdbhsrj`.

The committed non-Mux provider-readiness script at branch head was executed from a
clean Git archive against `C:\protected\jingwuguan-staging.env`; it reports ready with
zero blockers. The dirty working-tree version additionally requires Mux credentials,
but those files belong to the explicitly deferred uploader work and are not evidence
for this release candidate.

Reconciled the current status, checkpoint and deployment runbook so they no longer
claim staging is at 054 or 047, identify an obsolete Preview, treat the resolved
managed default-privilege boundary as open, or omit the completed protected source and
local PostgreSQL recovery rehearsal. Production remains blocked only on the explicitly
recorded external/managed-platform gates. Production, the retired project and deferred
Mux files were not contacted or changed.

### Milestone 161 — sanitized recovery evidence published (30/09/2026)

Updated the recovery guide to reflect the completed protected source capture and
loopback-only PostgreSQL 17.11 rehearsal at exact ledger 006–055. Added a sanitized,
versioned evidence record containing only counts, digests, security results and explicit
limitations; it contains no dump, object bytes, credential or personal identity value.

The recovery gate continues to fail closed for the right reason: standalone PostgreSQL
cannot prove managed Auth login/refresh, Storage API behavior, managed Vault/encryption,
hosted provider configuration or final security acceptance on a managed restore target.
Those checks still require a disposable Supabase project slot. No remote system was
contacted and no protected source evidence was modified.

### Milestone 162 — email scheduler platform boundary verified (30/09/2026)

Rechecked the disposable managed-restore prerequisite: the Supabase organization still
has exactly two active projects, staging `eomubndonbetszdbhsrj` and the historical
project `pkmllhaavadhaozmwapz`. No free disposable project slot is available. Neither
project was paused, deleted or modified.

Ran the committed worker/provider security suite locally. All 28 focused checks pass,
covering wrong-secret denial before database/provider work, durable rate-limit failure,
empty and capped batches, retry-state persistence, acknowledgement failure, sanitized
queue health, delayed/exhausted email visibility, memorial processing and provider-
configuration separation.

Verified from current official Vercel documentation that Vercel Cron calls only the
project's production deployment with `GET`, Hobby permits only daily execution, and
one-minute execution requires Pro or Enterprise. Vercel also does not retry failed
cron invocations and can overlap or duplicate them. The current accepted worker instead
requires authenticated `POST` once per minute to the fixed staging Preview host, so a
Vercel Cron entry would be misleading and was not added. The runbook now requires a
separately authorized external staging scheduler or a future reviewed production-only
Vercel adapter and paid-plan decision.

Real Resend delivery, scheduler monitoring, backlog/retry/exhaustion acceptance and the
dedicated-inbox Auth flows remain external gates. Production, the historical project,
provider settings and deferred Mux/uploader files were not contacted or changed.

### Milestone 163 — privileged worker secrets use constant-time verification (30/09/2026)

Replaced direct string equality at both privileged server-to-server boundaries with a
shared server-only verifier. Email-worker and push-delivery secret headers are now
SHA-256 digested and compared with Node's `timingSafeEqual`, providing fixed-length
comparison for wrong-length input. Missing, empty and incorrect values still fail
closed before rate-limit, database or provider work.

Added focused runtime tests for exact matching, absent/empty/wrong values and the
fixed 32-byte digest contract, plus route regressions proving both workers reject bad
credentials before side effects. The focused security suite passes 30/30; the complete
local application suite passes 315/315. TypeScript, targeted ESLint and whitespace
validation also pass.

This change rotates no secret and invokes no deployed route. Staging, production, the
historical project and providers were not contacted, and unrelated deferred Mux/
uploader files remain outside the intended change set.

### Milestone 164 — parallel Auth, email-monitoring and push hardening (30/09/2026)

Ran three read-only audits in parallel for the remaining scheduler/Resend,
dedicated-inbox Auth and Web Push/Safari gates, while independently auditing privileged
server modules. The audits contacted no live target and changed no data.

Added one shared exact application-origin validator. Registration confirmation and
account-email replacement callbacks now use `NEXT_PUBLIC_SITE_URL`; `/auth/confirm`
always redirects success or failure to that canonical origin rather than cloning the
incoming host. Unrelated and credential-bearing query parameters are dropped. Tests
cover HTTPS normalization, permitted loopback development origins, insecure/path/
credential/query/fragment rejection and an attacker-controlled request host.

Exposed the queue telemetry already returned by migration 033 but previously discarded
by the API: `queuedEmails`, `dueEmails` and `oldestReadyAgeSeconds`. Empty queues retain
a null oldest age, and unhealthy response coverage proves the sanitized numeric values
reach monitoring without recipients, message bodies or provider identifiers.

Marked every module that reads or transports the Supabase service key, VAPID private
key or durable rate-limit HMAC secret as `server-only`, with a regression inventory.
Hardened the service worker so JSON `null`, arrays and primitive push payloads use safe
title/body/path fallbacks rather than throwing.

The external gates remain explicit: select and configure a one-minute staging
scheduler, use a dedicated inbox for real Auth/Resend evidence, decide whether to ship
the currently hidden push/PWA settings tranche, and test actual installed iOS/iPadOS
and macOS Safari delivery. Production, staging, the historical project, providers and
deferred Mux/uploader files were not contacted or changed.

### Milestone 165 — isolated browser origin regression repaired (30/09/2026)

GitHub Actions run `36675538878` passed common checks but failed all four browser jobs.
Parallel read-only CI and source audits traced the shared failure to the isolated
browser harness: it deliberately removed inherited target URLs but did not replace
`NEXT_PUBLIC_SITE_URL`, which the new canonical callback-origin boundary requires when
the registration test submits a valid application.

The harness now supplies only its fixed loopback `APP_ORIGIN`, rejects direct runs that
change that value, and tests that an inherited external value is discarded. The
focused origin/config suite passes 7/7. A clean archive of commit `41b1deb` plus only
this two-file fix completed a production browser build and passed the full Chromium
desktop suite 38/38. Local Playwright Firefox remains unavailable on this Windows host,
so cross-engine proof came from GitHub Actions run `36677366204` at exact commit
`9eb570a`: common checks, Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS
all pass.

No application runtime, live credential, staging resource or provider was changed.
Production, the historical project and deferred Mux/uploader files were not contacted
or modified.

### Milestone 166 — fail-closed worker health and dormant push/Auth hardening (30/09/2026)

Ran parallel read-only audits of the remaining scheduler, dedicated-inbox Auth and
hidden push/PWA gates. The audits contacted no remote system and identified three
offline defects that could be resolved without choosing a provider or exposing the
unfinished push UI.

The email worker now rejects every missing, malformed, negative or fractional required
queue-health counter and rejects missing/invalid monitoring timestamps instead of
coercing them to a false zero/null healthy result. A malformed memorial processor
success payload is likewise reported as failed and makes the worker unhealthy.

Push delivery logs now retain only a bounded provider status code and generic failure
category. Subscription endpoints, provider response bodies/headers and raw database
errors no longer enter application logs. Notification clicks now await same-origin
client navigation before focus, preventing an early service-worker termination from
losing navigation on Safari-compatible engines.

Added six stateful offline tests around the privileged Admin password-reset apply route:
authentication and scope denial, 16-character class-complete temporary-password
secrecy, normalized queueing, idempotent existing-email retry, lost queue-response
recovery and mark-failure recovery. Focused worker/push tests pass 27/27 and password-
reset tests pass 6/6.

Real one-minute scheduler cadence/dead-man alerting, real Resend and dedicated-inbox
evidence, provider endpoint policy, intentionally shipping the PWA/push UI, and
physical Safari/iOS delivery remain external or consequential decisions. Production,
staging, the historical project, providers and deferred Mux/uploader files were not
contacted or changed.

### Milestone 167 — push recipient lifecycle enforcement (30/09/2026)

The privileged push-delivery route now performs a narrow server-only profile eligibility
probe before reading subscriptions or contacting a push provider, requiring the target
account to be active and to have no Date of Passing. Disabled and deceased accounts
therefore receive no push delivery even if an older active subscription row remains.
Eligibility-query failures fail closed with a sanitized HTTP 500 response and no
provider call.

Focused push/service-worker coverage passes 12/12, including disabled/deceased denial,
private database-detail suppression and proof that subscription access never occurs for
an ineligible recipient. No schema change or migration was needed. No live target or
provider was contacted; the push UI remains deliberately hidden.

### Milestone 168 — Mux activation candidate verified locally (30/09/2026)

Resumed the previously deferred Mux repository-video tranche without touching
production or the retired project. Promoted the reviewed SQL to the next available
ordered migration, `056_mux_repository_video.sql`, and updated its guarded
rollback-contained acceptance, exact-ledger/zero-residue postflight and immutable
recovery fingerprint. A staging-linked read-only ledger check proves remote staging is
still exactly 006–055; a dry run names only migration 056. Migration 056 has not been
applied.

The candidate preserves existing YouTube content while sending every new desktop
upload directly to Mux through a one-time provider URL. The server re-verifies upload
ownership and ready state, stores only a Draft through a service-only fixed-search-path
RPC, and authorizes Member playback through short-lived signed tokens after the normal
repository RLS check. Mux token and signing secrets remain server-only; raw route
exceptions were removed from logs.

The complete application suite passes 330/330, the desktop uploader passes 21/21,
ESLint, TypeScript, the optimized 51-route production build, migration-layout/recovery
fingerprint and whitespace checks pass. The four protected staging Mux values are still
absent, and the available Mux dashboard is at its login screen. Provider key creation,
Vercel Preview secret upload, migration 056 application, disposable upload/playback
acceptance and installer packaging remain blocked until Mux sign-in and an explicit
staging-only migration approval. No production or retired-project endpoint was
contacted.

### Milestone 169 — staging Mux credentials provisioned and rotated (30/09/2026)

Configured the existing empty Mux environment as `JS Super App Staging`. Created one
least-privilege API token with only Mux Video read/write permissions and one playback-
signing key. A first token was treated as exposed after its one-time secret appeared in
a local browser proof image; it was never saved or deployed, was explicitly revoked,
and the local proof image was removed. Exactly one replacement staging token and one
signing key remain active.

Saved `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID` and the base64 RSA
`MUX_SIGNING_PRIVATE_KEY` directly to `C:\protected\jingwuguan-staging.env` without
printing their values. Presence/shape checks pass, and the complete offline staging
provider-readiness command reports `ready: true` with zero blockers. No secret was
added to Git or the desktop installer.

Migration 056 remains unapplied and no Vercel environment was changed. The next
consequential gate is an explicit staging-only approval to upload the four variables to
Vercel Preview, apply migration 056, redeploy, and run guarded disposable Mux upload,
signed-playback, rollback-residue, ledger, database-lint and role-security acceptance.
Production and the retired project were not contacted.

### Milestone 170 — staging Mux activation and signed-playback acceptance (01/10/2026)

Uploaded only the four protected `MUX_*` values to the branch-scoped Vercel Preview
environment for `release/v1-readiness-20260918`. Applied only migration
`056_mux_repository_video.sql` to staging `eomubndonbetszdbhsrj`; the exact remote
ledger is now 006–056 and database lint reports no findings. Production and the retired
project were not contacted.

Deployed the release branch through a Git-reference Preview. Guarded live acceptance
found that Mux now returns regional OCI signed-upload addresses under
`direct-uploads-*.mux.com/upload/{id}`, while the original candidate trusted only the
legacy Google Storage form. Added bounded failure-category logging with no provider
body, headers, URL, identifier or credential; then narrowed the URL rule to HTTPS,
credential-free, default-port regional Mux upload hosts with the exact identifier path,
while retaining the legacy Google Storage boundary. Host, path-traversal and lookalike-
domain regressions pass.

All disposable sessions created while diagnosing the old URL rule were identified by
their unique acceptance marker and cancelled before media upload. The final guarded
run created exactly one disposable Mux asset and one linked Repository Draft, promoted
the same row only long enough to verify the RS256 playback token and signed HLS
manifest, restored it to Draft, and deleted the exact content row and Mux asset. The
captured asset returns provider 404, the deleted playback route returns application
404, and independent database postflight confirms zero application residue. Mux may
retain its normal Direct Upload control-plane/audit records; no live video asset or
Repository Draft remains.

Ready Preview `dpl_AZK7CPjTCcbeQCytugpwyEtbgFBv` at application commit `8caa3e9`
serves only `jingwuguanseibukan-staging.vercel.app`. Final evidence passes: 11/11 host
and security-header probes, 12/12 role-security checks, 18/18 read-only WebKit checks
across desktop/tablet/mobile, strict database verification, exact ledger, database
lint, migration-056 postflight, 332/332 application tests, 21/21 desktop uploader
tests, ESLint, TypeScript and the optimized 51-route production build. The guarded
acceptance harness now also cancels marker-matched waiting sessions during recovery
and on pre-asset failures.

### Milestone 171 — current Mux installer and retired-target guardrails (01/10/2026)

Closed the desktop/server URL-boundary mismatch discovered after live Mux activation.
The Electron uploader now accepts the verified regional
`direct-uploads-*.mux.com/upload/{id}` address as well as Mux's legacy Google Storage
form, with exact HTTPS host/path constraints and denial of credentials, custom ports,
fragments, malformed identifiers and deceptive hosts. Desktop coverage passes 22/22.

Built a fresh staging-only x64 NSIS package and inspected its ASAR. It contains only
the approved staging public configuration, both reviewed Mux URL forms, bundled FFmpeg
and license files; it contains no protected credential, environment file or test
fixture. The installer is 156,411,382 bytes with SHA-256
`1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`. Read-only
staging role acceptance passes for Member, Admin and Super Admin, and a generated MP4
processes and decodes with two current watermarks. The package remains unsigned and
staging-pinned. Restricted-runner GUI automation and the silent uninstall registry
path were not accepted as proof, so ordinary interactive install/launch/uninstall on
the user's Windows session remains open.

Removed obsolete script assumptions that the retired project
`pkmllhaavadhaozmwapz` is production. Security probes and dummy-user cleanup now reject
that project in every mode. Future production read-only probes require a separately
supplied exact active project ref, while staging rotation stays pinned to
`eomubndonbetszdbhsrj`. The focused cleanup/target/rotation suite passes 18/18.
Production and the retired project were not contacted.

### Milestone 172 — dormant Web Push endpoint and state-boundary hardening (01/10/2026)

Hardened the hidden Web Push tranche without enabling its UI or contacting a live
service. Subscription create/delete accepts only HTTPS endpoints on the exact reviewed
Google FCM, Mozilla Push Service, and Apple Web Push hosts, with credentials, custom
ports, fragments, root/double-slash paths, deceptive names, control characters,
oversized values, arbitrary domains, IP addresses, and localhost rejected before any
database RPC. Stored endpoints are revalidated immediately before provider access.

The browser workflow now compensates for cross-system failures. A failed persistence
of a newly created subscription removes only that new browser subscription; a failed
database delete keeps the old browser subscription and stops reset. This prevents a
false disabled/enabled state and avoids destroying an existing subscription when a
re-save fails.

Focused endpoint, route and state-transition tests pass 29/29. The complete suite
passes 336/336; ESLint, TypeScript, whitespace validation, and the optimized 51-route
production build pass. Push/PWA settings remain intentionally hidden. Physical
Safari/iOS delivery, live provider failure handling, and the product decision to ship
push remain external gates. No staging, production, retired project, database,
deployment, or provider was contacted.

### Milestone 173 — production target, worker runtime and installer gate hardening (01/10/2026)

Ran three offline production-readiness tracks in parallel. Added a secret-safe,
fail-closed production target validator that requires the future exact Supabase project
reference, approved Singapore region, matching public origin and an exact direct or
Singapore session-pooler database URL on port 5432 with `sslmode=require`. It rejects
the staging and retired projects, wrong regions, mismatched project identities,
transaction-pooler connections and unsupported connection options. It cannot prove
dashboard ownership/region, so a second operator check remains mandatory before the
first read-only production connection.

Bounded the email worker to a default 45-second run budget and each Resend request to a
default 10 seconds, with narrow validated overrides. Budget exhaustion stops further
claims and returns monitored HTTP 503. This reduces scheduler overlap risk without
weakening the existing idempotency, retry, acknowledgement or queue-health contracts.
Privileged deceased-member and memorial routes now log category-only failures rather
than raw database/Auth error objects; regression coverage proves private details stay
out of responses and logs.

Added a guided Windows installer acceptance runner. It fingerprints the candidate,
refuses an existing exact per-user installation, requires a visible launched window,
closes only its captured process, invokes the exact registered uninstaller, verifies
registry and installation-directory removal, and always emits JSON evidence. The
current staging installer preflight passes at 156,411,382 bytes and SHA-256
`1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`;
ordinary interactive install/launch/uninstall remains unclaimed and the installer is
still unsigned.

Combined evidence passes 346/346 application tests, 22/22 uploader tests, 50/50
focused production/recovery/email/memorial tests, ESLint, TypeScript, whitespace
validation, and the optimized 51-route production build. No staging, production,
retired project, database, deployment, inbox, scheduler, or provider was contacted.

### Milestone 174 — production configuration, restore evidence and release-window gates (01/10/2026)

Completed four production-readiness tracks in parallel without contacting a live
system. Hardened provider configuration so production requires an exact production
project binding, role-correct Supabase credentials and a production Vercel context,
while refusing aliases, placeholders, control characters, staging/test residue and
role-confused modern or legacy credentials.

Upgraded the recovery evidence contract to manifest version 4. A rehearsal must now
identify the exact protected source backup by project, capture time, format, byte count
and SHA-256, and placeholder provenance cannot pass. Existing ledger, catalog,
Auth/Storage, RLS/grant, freshness, RTO and no-production-mutation requirements remain
fail closed.

Added a two-pass offline staging Auth/email preflight. It binds the exact staging host
and project, dedicated inbox, protected Member/Admin/Super Admin accounts, isolated
class/dojo UUIDs, strong disposable passwords, current catalog digest and reviewed
cleanup scopes for Auth users and identities, profiles, class requests, password reset
requests and email outbox. The second pass uses an EMAIL_WORKER_SECRET-keyed HMAC review
token. No registration, message delivery or cleanup was run; guarded live acceptance
still requires current catalog and cleanup evidence.

Added a production release-window gate requiring exact release/rollback revisions,
deployment IDs, named owners, an independently verified commit, Sydney time bounds,
a recovery point captured within 24 hours, tested rollback, every external approval
and explicit stop conditions. The repository template intentionally fails until those
operator-controlled facts exist.

Verification passes 367/367 application tests, 42/42 focused gate tests, ESLint,
TypeScript, whitespace validation, and the optimized 51-route production build. No
staging, production, retired project, database, deployment, inbox, scheduler or
provider was contacted.

### Milestone 175 — external-gate evidence and installer trust hardening (01/10/2026)

Ran four independent offline release tracks in parallel. The staging Auth/email
preflight now reads two distinct protected evidence files outside the repository,
checks their actual SHA-256 digests and refuses review-token issuance when either file
or any other acceptance input is invalid. This closes the previous gap where arbitrary
digest strings could represent nonexistent evidence. The live acceptance still needs
a dedicated deliverable inbox, reviewed class/dojo UUIDs, current catalog evidence,
independently reviewed cleanup evidence, disposable passwords and a second-pass token.

Strengthened recovery manifest v4 so local PostgreSQL cannot claim complete managed
recovery. Completion requires a disposable managed Supabase target, SHA-256 and byte
count for the finalized sanitized evidence bundle, explicit-offset and correctly
ordered timestamps, completed non-placeholder component evidence, and protected proof
that the disposable target was deleted or quarantined.

Hardened the guided JS Video Uploader acceptance runner. Full execution requires a
separately approved expected SHA-256 before launch, an interactive Windows x64 desktop,
and a JSON evidence destination that cannot overwrite the installer. Partial failures
remain visible for manual exact-target cleanup instead of triggering hidden removal.
The non-installing preflight passes for the existing 156,411,382-byte unsigned staging
candidate at SHA-256
`1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`.

Added a sanitized email-scheduler readiness manifest and offline validator. It binds
staging or production to the exact worker POST URL, 60-second cadence, one
non-overlapping run, bounded worker/provider/scheduler timeouts, protected secret
injection, no automatic retry, retained failures, queue-health monitoring and an
empty-queue scheduler-only acceptance with zero provider requests. The template fails
closed until a provider, supported plan, owners, monitoring and acceptance evidence
exist; no scheduler was selected or configured implicitly.

Verification passes 378/378 application tests, 37/37 combined focused gate tests,
27/27 uploader tests, ESLint, TypeScript, whitespace validation and the optimized
51-route production build. No software was installed, launched or uninstalled and no
staging host, database, inbox, scheduler, provider, production or retired project was
contacted.

### Milestone 176 — release evidence binding and dependency security (01/10/2026)

Ran the remaining offline release-readiness tracks in parallel and independently
reviewed their fail-closed behavior. A fresh dependency audit identified the installed
Next.js 16.3.4 line as affected by the current authorization-bypass advisory. Updated
Next.js and `eslint-config-next` to 16.3.8 and refreshed vulnerable transitive
`brace-expansion` copies to 1.1.21/5.0.12. Full, production-only and uploader audits
now report zero known vulnerabilities.

Added strict evidence validators and deliberately incomplete templates for physical
Safari, production identity cleanup and monitoring/incident/rollback readiness.
Physical device records bind real Mac/iPhone/iPad Safari sessions to the exact staging
deployment, release commit and independently supplied minimum versions. Production
identity evidence now has project/policy/query-bound canonical provenance, three
distinct non-PII actor fingerprints, matching Auth/profile counts and an independent
review attestation. Monitoring now uses exact schemas, release/deployment binding,
all-non-success worker alerts and a fail-closed hidden-or-fully-monitored Web Push
disposition.

Hardened the release-window gate so three distinct SHA-256 manifest digests—not bare
checkboxes—bind physical Safari, production monitoring and production identity
results to the exact release, deployment and production project. Focused regression
coverage passes 35/35 and the complete suite passes 408/408. ESLint, TypeScript,
whitespace validation, all JSON templates and the optimized 51-route Next.js 16.3.8
build pass. No live host, database, provider, inbox, deployment, production or retired
project was contacted.

The JS Video Uploader continues to burn the two logo watermarks locally and upload the
finished media directly to Mux; Supabase stores the Repository Draft plus provider
identifiers/metadata, not video bytes. Existing YouTube records remain legacy-readable.
The guarded staging Mux upload, signed playback and exact cleanup evidence remain valid.

Production readiness is approximately 9.3/10. Remaining work is external evidence and
operations, not another broad feature build: create/verify the Singapore production
project, prove managed restore, complete dedicated-inbox Auth/email delivery, select
and verify the scheduler plus live alerts, run physical Safari and interactive signed
installer acceptance, prove production identity cleanup, then obtain an exact release
window approval. Production remains blocked until every gate passes.

### Milestone 177 — final bootstrap, installer-signing and CI gates (01/10/2026)

Completed three offline release-readiness tracks in parallel and integrated their
evidence into the final release gate. The production bootstrap validator now requires
an exact empty Singapore target, read-only inventory, the protected pre-006 baseline,
the immutable 006–056 contract, source-ledger agreement, import/recovery proof and an
independent canonical review. It refuses production mutation and refuses to treat the
incremental migration set as an empty-database bootstrap.

Added a signed-installer evidence validator for the JS Video Uploader. Release evidence
must bind the exact artifact hash, byte count and commit to valid Authenticode signer
and trusted-timestamp records, a current clean malware scan, packaged-secret scanning,
and a physical Windows x64 install/launch/staging-sign-in/local-processing/uninstall
run. The physical test deliberately stops before any upload request, Repository Draft,
Mux asset or provider/production contact. Placeholder hashes and signer fingerprints,
unknown fields and secret-bearing values fail closed.

The release-window gate now requires eleven distinct evidence digests covering
rollback, recovery, physical Safari, monitoring, production identities, managed
restore, production bootstrap/target, production secrets, provider delivery and the
dedicated inbox, scheduler, and signed installer. Every referenced result must pass
and bind the exact release, deployment and project; approval booleans alone do not
pass. GitHub CI now also enforces full and production dependency audits, the production
build, and the complete uploader build/test/audit suite without carrying secrets or
deploying.

Local verification passes 432/432 application tests, 30/30 focused gate tests and
27/27 uploader tests. ESLint, TypeScript, whitespace checks, all JSON templates, the
optimized 51-route Next.js 16.3.8 build, and full/production/uploader audits pass with
zero reported vulnerabilities. No staging, production, retired project, database,
deployment, inbox, scheduler or provider was contacted.

Production readiness remains approximately 9.3/10 because the remaining work is
operator-controlled evidence rather than unfinished application code: create and
verify the Singapore production project, complete a managed restore, configure and
prove production secrets/provider delivery/scheduler/monitoring, run physical Safari
and signed-installer acceptance, prove production identity cleanliness, and approve
the exact release window. Production remains blocked until all eleven evidence-bound
gates pass.

### Milestone 178 — production operations evidence closure (01/10/2026)

Completed three offline production-readiness tracks in parallel, then ran three
independent review tracks before integration. Added a production-secrets validator
that checks the complete protected configuration in memory and binds it to the exact
future Singapore project, release commit, deployment and Vercel Production context.
It requires modern Supabase role separation, strong distinct internal secrets,
matching VAPID keys, Resend/Mux configuration, ten ownership/access/rotation records,
fresh distinct evidence and independent review while rejecting staging/test residue.

Added a dedicated provider-delivery gate for Resend domain/SMTP/log evidence, Auth
confirmation and password reset, Member/event/worker email, retry/backoff/exhaustion,
and guarded staging Mux upload/signed playback/cleanup. Dedicated-inbox recipients use
keyed HMAC fingerprints; raw addresses, unsalted hashes, role/sender reuse, production
mutation, publication, test identities and residue cannot pass. Every accepted field
is covered by the canonical independent-review attestation.

Strengthened the existing scheduler and monitoring validators rather than creating
duplicates. Production evidence now binds the exact project, commit, deployment and
worker endpoint; enforces a one-minute non-overlapping job with bounded timeouts,
protected headers, retained failures, queue health, live-alert acceptance, ordered
timestamps, 24-hour freshness and normalized reviewer independence. The release-window
monitoring summary now carries the exact production project reference.

Added a final evidence-packet binder for the actual protected release-window and eleven
child evidence files. It verifies all files exist outside the repository, are distinct
regular JSON files, cannot use local/network aliases or double as the release manifest,
and exactly match the recorded SHA-256 digests. This prevents valid-looking digest
strings from representing missing or substituted evidence.

Independent review found and fixed ambient process values overriding the named
production env file, incomplete provider attestation binding, guessable mailbox
fingerprints, evidence-file reuse, forward-slash UNC access and case/whitespace reviewer
aliases. Combined verification passes 473/473 application tests, 67/67 focused gate
tests and 27/27 uploader tests. ESLint, TypeScript, template parsing, whitespace checks,
the optimized 51-route build and all three dependency audits pass with zero reported
vulnerabilities. No live system or provider was contacted.

Production readiness is approximately 9.4/10. Remaining work is execution of the
operator-controlled gates—not new broad feature development: create and independently
verify the Singapore production project, perform the managed restore, configure and
capture production secrets/provider/scheduler/monitoring evidence, run physical Safari
and signed-installer acceptance, prove the production identity inventory is clean, and
approve the exact release window. Production remains blocked until the completed
protected evidence packet passes.

### Milestone 179 — semantic rollback evidence gate (01/10/2026)

Closed the remaining rollback-evidence integrity gap without contacting any live
system. Added a fail-closed protected rollback manifest and validator for the exact
candidate and known-good commits/deployments, staging application rollback rehearsal,
replacement-target managed database recovery, ledger `006-056`, catalog/lint/RLS/role
security, deadline/RTO compliance, zero residue and canonical independent review.

The command rejects repository, link, network and oversized inputs and provides a safe
`--print-review-digest` mode that prints only the canonical digest after every other
field passes. Impossible dates, substituted deployment identities, understated
durations, reused evidence hashes, production/provider contact and destructive down
migrations fail closed.

The final evidence packet now reruns rollback semantics from the independently bound
release-window identities and requires the decision deadline to match. Correct hashes
can no longer make placeholder, substituted or deadline-divergent rollback evidence
pass. Independent review findings were fixed before integration.

Verification passes 488/488 application tests, 33/33 focused rollback/window/packet
tests, 27/27 uploader tests, ESLint, TypeScript, whitespace validation, the optimized
51-route build, and full/production/uploader audits with zero reported vulnerabilities.
No live system or provider was contacted.

Production readiness remains approximately 9.4/10. Remaining work is still the
operator-controlled execution evidence: create and verify the Singapore production
project, complete managed restore, production secrets/provider/scheduler/monitoring,
physical Safari, signed installer acceptance, clean production identities, production
cutover/database evidence, and final release-window approval.

### Milestone 180 — production cutover evidence gate (01/10/2026)

Added a fail-closed protected production-cutover record and validator without
contacting any live environment. It requires an independently supplied Singapore
production project and exact immutable release/deployment, dashboard ownership and
region verification, exact ledger 006–056, catalog, database lint, strict security,
grants/RLS, and a resolved platform default ACL or the documented narrow independently
reviewed exception expiring within 30 days.

Fresh read-only Member, scoped Admin and Super Admin checks use reviewed existing
accounts, acknowledge expected Auth session writes, and prohibit application
mutations. The exact production domain, valid TLS, Site URL,
`/auth/confirm` redirect and public project binding must agree; all 11 host probes,
browser auth, redirects and security headers must pass with zero server errors and
zero application/domain acceptance writes. Member mutation, new test accounts, outbound-provider,
staging or retired-project contact fails closed, and the known-good rollback
deployment must remain reachable.

The release-window gate now requires this passing summary and approval. The final
packet contains twelve distinct protected evidence files and semantically revalidates
both rollback and production cutover against independent identities. Operator docs
now make the sequence explicit: separate authorization precedes production action;
fresh post-cutover evidence then closes the release window and final packet.

Local verification passes 507/507 application tests, 40/40 focused tests and 27/27
uploader tests. ESLint, TypeScript, whitespace validation, the optimized 51-route
build and all three dependency audits pass with zero reported vulnerabilities. No
live system or provider was contacted.

Production readiness is approximately 9.5/10. Remaining work is operator-controlled
execution evidence and separate authorization: create/verify the Singapore production
project, managed restore, production secrets/provider/scheduler/monitoring, physical
Safari, signed installer acceptance, clean production identities, approved cutover,
and the final protected release-window plus twelve-file evidence packet.

### Milestone 181 — email or JS Member ID login (02/10/2026)

Explicitly approved local implementation adds a same-origin server login endpoint
and one email-or-JS-ID field. Exact JS IDs retain leading zeros; pending applicants
use email. Server-only ID resolution uses the Auth email associated with the matched
profile UUID. Generic failures, durable request limits, bounded input, confirmation/
account checks, delayed failure responses and buffered session cookies protect the
flow. Stale same-project cookie chunks are cleared only on successful replacement.
No new schema/RPC or migration is introduced; uploader email login is unchanged.

529/529 tests, TypeScript, ESLint and a synthetic-environment optimized production
build pass. Focused login/frontend/form/staging-guard checks pass 49/49 and local
Chromium/WebKit desktop browser checks pass 78/78 after correcting a hydration race
in the new WebKit JS-ID test. Login creates expected Auth operational records and HMAC-keyed limiter
counters; acceptance docs now distinguish those from forbidden business-row writes.
Deployment, live staging email/JS-ID role acceptance and remote CI remain pending.
No production, retired project, provider or live database was contacted.

Approved release follow-up (02/10/2026): login commit `ed15327` is pushed to the
existing release branch; unrelated Supabase cache changes were preserved. The live
suite now contains 27 guarded WebKit cases, including exact JS-ID login for all three
approved roles. TypeScript and 24 focused tests passed again. GitHub Actions run
`36971234524` subsequently passed all five CI jobs. After Vercel sign-in, Ready
Preview `dpl_5tjVrPaXs7yuyywmwUkefoNfEtVx` was built from `ed15327` and assigned
only the existing staging hostname. All 11 host/security-header probes passed;
registration bundles confirmed only the staging Supabase host. Guarded live WebKit
acceptance passed 27/27 in 4.0 minutes, covering email and exact JS-ID login plus
role boundaries on desktop, tablet and mobile. No guard violations occurred.
Only expected Auth/session and login rate-limit operational writes were permitted;
no migration, business-record mutation, production or retired-project contact.
Physical Safari/iOS and the separately authorized production release gates remain open.

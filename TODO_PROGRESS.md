# Jingwuguan Seibukan production progress

Last updated: 25/09/2026

## Release status

The published release branch is `release/v1-readiness-20260918` at `89abe27`, with
local HEAD and the recorded origin ref synchronized before the current migration-047
candidate. The local candidate passes lint with no warnings, TypeScript and 233/233
Node regressions. A fresh isolated staging-configured build generated all 44 routes.
The earlier dependency audit
reported zero known vulnerabilities. Sydney staging `eomubndonbetszdbhsrj` is
verified at exact migration history 006–046. Migrations 040–046 are applied and the
persisted rollback-contained memorial, annual-reminder, bulk-assessment,
prepared-certificate/QR, zero-residue, exact-ledger and direct role-boundary suites
pass. Migration 044's optional-Aikikai, automatic-JS-Member-ID, role-boundary and
sequence-restoration suite also passes against the persisted staging objects.
Migration 046 repairs migration 045's audit-insert runtime defect and passed the
rollback-contained semantic, audit, idempotency, role-boundary, zero-residue,
database-lint and exact-ledger checks. Production was not contacted.

Migration 047 is prepared locally but not applied. It repairs the anonymous
PostgREST pre-request evaluation defect found through the deployed registration
page without weakening the authenticated disabled/deceased-account boundary.

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

Authenticated Chromium desktop route/navigation testing now passes for the
dedicated staging Member, scoped Admin and Super Admin accounts, including UI
sign-out. This closes the role-shell browser sub-gate, not the outstanding complete
business-workflow and multi-browser coverage.

The isolated local browser suite passes 69/69 in Chromium and 69/69 in WebKit
across desktop, tablet and mobile profiles after the YouTube change. The combined
138/138 run completed with a clean report and exit when allowed to manage its own
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

The application is **not approved for production deployment yet**. The scoped
staging application-schema restore is proven, but complete Supabase managed Auth,
Storage-object and platform-configuration recovery proof, email/push scheduler and
YouTube channel operational configuration, authenticated browser coverage for the
new workflows, and the remaining operational release gates are still required.
Production's current migration ledger remains unverified because it was not
contacted. Migrations 040–046 are applied to staging only and have not been applied
to production.

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
- [ ] Complete authenticated browser workflow testing with dedicated accounts.

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
- [ ] Take protected restorable role/schema/data backups and prove a restore.
  - [x] Prove a protected staging `public` plus `supabase_migrations` logical
    backup/restore into isolated PostgreSQL 17 with matching catalog totals,
    critical table counts and exact history 006–026.
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
- [ ] Resolve the platform-owned `supabase_admin` unsafe default privileges.
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

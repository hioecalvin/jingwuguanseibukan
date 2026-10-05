# Jingwuguan Seibukan Super App — verified checkpoint

## Directory and tier/assessment boundary — 5 October 2026 (staging deployed and accepted)

Supersedes the historical 057 stop gate below. User approved running the clarified
dojo-scoped tier-only change and updating staging. Migrations 057 and 058 were
applied together to staging eomubndonbetszdbhsrj after successful rollback rehearsals.
Exact applied ledger is 006–058 (53 entries). Existing v1 directory is unchanged.
Persisted rollback-contained acceptance passed: narrow organisation-wide directory,
role/disabled/deceased boundaries, own-dojo tier progression, foreign/null-dojo
denial, direct rank denial (including Super Admin), assessment rank promotion and
idempotency, and Admin undo limited to same-rank tiers. Internal assessment helpers
are not executable by API roles. Independent hashes of 13 business/audit/outbox
tables matched before and after; no test rows or test promotions persisted.

Strict read-only database verifier and all 12 protected-account role-security
checks passed. Staging database lint completed with no schema errors. Local
type-check, 548 automated tests, ESLint, isolated production
build and 232 WebKit/Chromium browser checks passed. Release commit 8143a20 is
deployed as READY Preview dpl_9SmayAxT3GgDyHLP68EGtssLSzcP; only
jingwuguanseibukan-staging.vercel.app was reassigned. All 11 host probes passed
and the public bundle binds only to the expected staging backend.

All 27 guarded live WebKit cases now have passing evidence: 24 passed initially;
three Member cases initially failed because the test counted Next.js's empty
route-announcer alert outside main as an error. After scoping the assertion to
directory errors inside main, all three passed on desktop/tablet/mobile (46.6s).
No application or role guard was weakened; the follow-up commit changes tests
and documentation only and does not require an application redeployment.

CI is NOT green: GitHub run 37299562571 stopped at the development dependency
audit (braces@3.0.3, GHSA-vfj7-8cjw-p6xm; no patched version listed).
Production dependency audit reports zero vulnerabilities. No audit bypass or
forced ESLint downgrade was performed. See release/staging-058-verification.md.

Release/recovery templates now require 006–058 and fingerprint
`a412432bedf7c95578e7ebfb83317987c1d4350d19121fe533007a1967b26ffd`.
Historical restore evidence remains historical; it does not prove the new chain.
No production/retired/disposable project or delivery-provider contact; no scheduler
or worker triggered. This milestone does not certify every legacy class-management
operation as dojo-scoped or declare production ready.

## Approved 057 preflight — 5 October 2026 (blocked before mutation)

User approved staging-only 057 and subsequent verified UI deployment. Existing
strict database verifier passed read-only; exact ledger remains 006–056 (51 rows),
057 and get_my_member_directory_v2 absent. No migration/deployment performed.

New dojo-only requirement fails live authorization-definition review: Admin 0002
has zero out-of-scope member-list rows, but can_manage_class returns true for
classes at three dojos outside their assigned management scope. Deployed
promote_membership and get_next_membership_promotion both use that class-only
guard, not target dojo; promotion routine is executable by authenticated users.
No unauthorized promotion was attempted; this is read-only helper and deployed
definition evidence. Current five admin assignments all include class and dojo.

Stop gate: prepare a separate dojo-authorization correction, including read/write
promotion and null-dojo boundaries, then obtain approval for that additional live
migration. Do not silently expand approved directory migration 057. Existing 057
approval remains recorded. No business data writes, production, other project or
delivery-provider contact. Evidence:
workspace staging-readiness/057-STAGING-PREFLIGHT-BLOCKER-2026-10-05.md.

## Organisation-wide compact member directory — 5 October 2026 (local, release blocked)

Latest requested four sections: Photo / Name / Classes enrolled with Dojo and
Rank / Instagram. One person per row, every enrolment together; namesakes are
not merged. Phone layout wraps under the name, desktop shows four columns.
Class and Dojo filters match the same enrolment; sorting supports Class then
Dojo, Dojo then Class, or Name. Changing Class clears the Dojo filter. Instagram
accepts only a validated handle and uses an HTTPS profile link (opening in the
installed app depends on device/link settings; browser fallback is supported).
No JS ID, contact, DOB, finance, attendance or management controls in this view.

New client calls only get_my_member_directory_v2, with fail-closed load/error/
retry handling. Draft supabase/pending/057_organisation_member_directory.sql
returns four top-level fields and three per enrolment. Groups by profile UUID
internally without returning it. Requires an authenticated active caller,
excludes deceased/inactive targets and inactive classes, includes existing
active/break membership statuses; no table grants, policies or writes changed.
Existing v1 and the active 006–056 migration/recovery contracts remain intact.

Do NOT deploy this UI until 057 is separately approved, moved into the ordered
migration chain, applied and accepted on staging. SQL has local source-level
checks only, not live execution/security evidence. See supabase/pending/README.md
for acceptance gates. No remote projects/providers contacted in this milestone.
Dojo-only Admin management remains separate and unverified: existing class-only
Admin assignments may grant broader scope; no claim of dojo-only enforcement.

Verification: type-check, 544 automated tests and lint passed initially. Isolated
production-mode build passed. Initial browser run: 224 passed, four failures in
the new sort test's exact-label locator. Fixed the test to use the accessible
combobox role/name. Final rerun: 228/228 browser cases passed (2.3m, no retries)
across Chromium mobile and WebKit desktop/tablet/mobile. Type-check, 544/544
automated tests, lint and diff-check passed again. Browser run reused the exact
unchanged isolated production build; phone/desktop screenshots visually checked.
Evidence is in workspace staging-readiness/member-directory-2026-10-05.md.

## Compact Member Lists and Member ID details — 5 October 2026 (local only)

Supersedes the earlier always-visible member-detail dropdown grid: the collapsed
list now shows small avatar, clickable JS Member ID, name/class, rank, dojo,
last training session, Promote Member button and current-status dropdown. Desktop
uses a horizontal row; phones wrap the same information without page overflow.
Member ID opens contacts (email, WhatsApp, phone, DOB), rank history, subscription
history and official-record controls, with other management sections still
available below. Promote opens the existing form, never submits automatically.
Break/Active/Inactive selection reuses existing handlers and inactive confirmation;
deceased rows cannot change status or promote. Closed details preserve drafts.

New MemberSubscriptionHistory reads existing membership_subscription_charges and
membership_payments through the authenticated client, explicitly scoped to the
selected membership and displayed charge IDs. Twelve charges per page, lazy
loading, cancellation guards and error/retry states; no financial mutations or
new schema. Live RLS/results for these queries have not been newly verified.
All 54 existing named Member Management functions compare unchanged to HEAD
(ignoring whitespace); layout and read-only history additions are separate.

Final verification: type-check and 539/539 automated tests, lint, diff check,
isolated production-mode build, and 208/208 local browser cases passed (2.2m,
no retries) across Chromium mobile and WebKit desktop/tablet/mobile. New tests
cover member-ID details, lazy scoped/paginated history, hidden content, promotion
opening without mutation, status cancellation/error/retry, deceased controls,
draft retention and axe accessibility. Initial 8 failures were a low-contrast
rank-history caption and fixture selectors/data shape, corrected before final
pass. Desktop/mobile screenshots visually inspected.

No commit, push, deployment, live database tests, migrations or provider contact.
Staging still serves the previous d9f253c release; staging approval and physical
iPhone review remain outstanding. Prior unrelated changes preserved.

## Promotion certificate layout — 5 October 2026 (local only)

Updated the shared GradeCertificatePage used by individual and bulk promotion
certificates. Printed details now contain exactly Member ID (JS ID), Promotion
Date and Certificate No., in that order. Removed the Discipline, Dojo, assessor
and Print Type detail rows and visible generator/timestamp footer. Preserved
the bold class heading below the organisation, logos, QR authenticity verification,
and existing Official Reprint notice. Authorized Signatory now identifies
Jingwuguan Seibukan Head. No stored audit fields, print-history logic, QR payload,
permissions, title-certificate template or database objects were changed.

Verification: type-check and 539/539 automated tests passed; lint and diff check
passed; isolated production-mode build and 100/100 desktop/mobile WebKit browser
cases passed (1.3m). Generated a synthetic, non-valid single-page A4 landscape
preview using the actual template; PDF text/order checks passed and final rendered
page visually inspected. PDF skill review prompted widening the QR caption to
avoid splitting its authenticity wording. Preview QR contains sample-only text,
not a live certificate link. Standard PDF file creation metadata remains; the
requested visible generation timestamp is removed.

Local only: no commit, push, deployment, live security tests, migrations or
production/provider contact. Existing compact UI and unrelated work preserved.

## Member-details clarification — 5 October 2026 (local only)

Refined Member Management per the user's clarification: Date Joined, Rank Now
and Last Training Session appear side by side in an always-visible overview.
Last Grading, Next Promotion, Promote Member and Official Records each have an
independent, initially closed disclosure. Other administrative details/actions
are also grouped into compact two-column disclosure buttons. These member
sections stay collapsed on desktop as well as mobile; print reveals content.
Existing role conditions, date calculations and mutation handlers are preserved.

Final verification: type-check, 538/538 automated tests, lint, diff whitespace check,
isolated production build and 200/200 local browser cases passed (2.1m, no retries).
The new layout test verifies the three-column overview, independent disclosure
state, hidden actions, draft preservation, print and accessibility. Training
today/correction/retry tests passed. Mobile screenshot inspected. An earlier run
was invalidated by source changes during execution; the final run rebuilt and
passed without bypassing the isolation/fingerprint guard.

No live tests, push, deployment, database or provider changes. Staging remains on
the previously verified d9f253c release. Approval and a fresh physical phone review
remain required before treating this UI as accepted on staging.

## Compact UI across all roles — 5 October 2026 (local, not deployed)

User requested smaller dropdown-style layouts across Member, Admin and Super
Admin screens. Added shared responsive density to the authenticated shell and
46 expandable record/tool groups across 29 pages. Mobile/tablet summaries reveal
details and actions on demand; desktop and print retain expanded content. Bulk
assessment candidates start expanded to preserve the all-candidates workflow.
Controls retain 44px minimum touch height and text inputs use 16px text.
Collapsing preserves mounted draft fields; invalid hidden fields reopen/focus.
Public authentication, certificate PDFs, APIs, financial logic, database objects
and provider configuration were not changed by this UI work.

Final local verification: type-check and 538/538 automated tests passed; lint
passed; isolated production-mode build and 196/196 browser cases passed across
Chromium mobile and WebKit desktop/tablet/mobile (2.0m, no retries). Representative
dashboard screenshots were inspected. Earlier runs exposed dashboard contrast
and settlement locator/reload handling issues, corrected before the final pass.
Browser fixtures use synthetic data; these are not live role-security results.
Staging still serves d9f253c; this UI is uncommitted
and not deployed. No live staging acceptance result is claimed for these edits.
Next gate: approve staging release, then guarded role/browser checks and a fresh
physical iPhone review. Existing unrelated documentation and Supabase .temp edits
were preserved. No production, retired/disposable project or provider contact.

Additional physical feedback for the previous d9f253c release: the user replied
"it work" after the requested Admin 0002 scoped-access/logout check. This is a
narrow user-reported confirmation, not independently captured evidence and not
physical acceptance of the new compact UI. Super Admin and other-device checks
remain open.

## Mobile sign-out correction — 5 October 2026

Final verification: `d9f253cca54e243b8bfcb8691701c3806046930d` is the Ready staging
Preview `dpl_AUrAektGYfrcs7hgg72tm8qY4QCe`, independently mapped to staging only.
First live run (fc5463a) was 26/27: Super Admin desktop Sign out was obstructed by
page content. Fixed desktop header stacking and added positioned-content fixture.
Final rerun: **27/27 guarded live WebKit cases passed, 5.0m, zero retries**;
Member/Admin/Super Admin logout and subsequent protected-page denial passed at
desktop/tablet/mobile. 11 host probes and public staging binding passed again.
Local final build/typecheck/538 tests/lint and 84 browser cases passed. On 5 October
the user replied "correct, next" to the requested iPhone Member logout/direct
/profile retest: narrow user-reported confirmation recorded, not independent
device evidence or a full Safari pass. Physical Admin/Super Admin and other-device
checks remain open; production readiness is not inferred. Prior entries
below record the first deployment phase, superseded by this final result.

- Physical iPhone report (user: iPhone 17, iOS 26.6) exposed a real missing mobile
  Sign out control; prior automated checks did not cover it. Physical logout
  finding was subsequently fixed and the narrow retest user-confirmed above.
- Fix `fc5463aeeffbf8f91e571a3afaabdbcd472df318` committed/pushed on the release
  branch: shared local-session sign-out handler, visible mobile footer button,
  safe-area padding, retry feedback, focus and duplicate-request coverage.
- Type-check plus 538 tests, lint, isolated production build and 84 local
  desktop/mobile WebKit tests passed. Initial harness failures were corrected
  before the final pass; no application test bypass.
- Staging Preview `dpl_GA8yvhbhGERbGVCA3CdJgyYJYgUQ` verified READY and exact-SHA;
  only staging hostname reassigned and independently read back. 11 host probes
  and public staging-backend binding passed. Final result recorded above.
- Existing unrelated edits preserved. No production contact, delivery,
  scheduler activation, database migration or account change.

Checkpoint date: 04/10/2026

## Staging scheduler deployed and corrected — 4 October 2026

- Supersedes the preparation-only status below. Workspace operations scaffold is
  deployed to Cloudflare account `744af58c89b6051b68a0ef118eae6281` as
  `jingwuguan-staging-email-scheduler`; not copied into the app release branch.
- Local workerd testing found `redirect: 'error'` unsupported. Fixed to manual
  redirects with explicit 3xx rejection; 20 core and 7 local runtime/config tests
  passed. Real local SQLite verifies overlap exclusion and durable failure/duplicate
  state across runtime restart. Fake HTTP only; no live delivery claim.
- Corrected build deployed and independently read back at 2026-10-04T11:12:08Z:
  version `d1587e88-a448-4c82-8cac-b293797f0c23`, deployment
  `a48635ae-abae-48f7-ab5e-5549f9bb50ec`. ENABLED=false, staging ref exact,
  zero cron triggers, workers.dev and preview URLs off. Both approved secret_text
  bindings retained: EMAIL_WORKER_SECRET and HEALTHCHECKS_PING_URL.
- Dedicated Healthchecks check previously verified paused; not pinged or changed.
  No worker invocation, email, alert, application/database request, production,
  retired-project or disposable contact in this deployment step. Token expiry and
  permissions unchanged. Prior deployment evidence preserved before replacement.
- Evidence in workspace `staging-readiness/email-scheduler/`:
  `deployed-disabled-evidence.json`, `runtime-tests.tap`, provisioning checkpoint.
  Read-only verification no longer labels current local hashes as deployed code.
- Remaining gates: guarded live email/memorial/provider and monitoring acceptance,
  actual scheduler cadence/alert receipt, original-password recovery acceptance,
  physical Safari (deferred, not passed), exact production target/secrets and
  authorized setup/cutover/rollback evidence. Local HEAD verified `7471c44`;
  existing unrelated dirty changes preserved. No app commit/push or production work.

## Disabled staging scheduler scaffold — 4 October 2026

- Selected Cloudflare Workers Free + Healthchecks.io Free. Prepared local files in
  `C:\Users\hioec\Documents\Codex\2026-08-30\files-pasted-by-the-user-you\staging-readiness\email-scheduler`.
  Not yet copied into this release, bundled, deployed or enabled; no provider writes.
- Configuration has no cron triggers, ENABLED=false and public endpoints disabled.
  Exact staging-only target, persistent single-flight lock, duplicate-slot guard,
  no automatic retries, bounded requests, sanitized history and validated heartbeat.
  Unhealthy/uncertain execution latches the lock for operator reconciliation.
- 20 new offline tests passed (mock HTTP/in-memory transactional storage). These
  do not verify live Cloudflare behavior, provider quotas, delivery or alert receipt.
  Existing worker/scheduler/monitoring suites also rerun: 25/25 passed; total 45/45.
  Scheduler syntax and checkpoint/progress diff checks passed (line-ending warnings).
- Activation/runbook prepared; provider resources, secret upload, guarded worker
  invocation, notification tests and recurring activation require separate approval.
  Existing scheduler/monitoring acceptance gates remain unfulfilled.

## Read-only staging email/scheduler/monitoring audit — 4 October 2026

- User approved staging-only read-only audit; completed through exact project-bound
  session pooler with verify-full TLS and default/explicit read-only transactions.
  No worker/job/RPC invocation, sends, settings changes, disposable resume or other
  project/provider contact. Protected evidence: `staging-email-audit-1791106030328`
  under the existing private recovery directory (2026-10-04T09:27:22.453Z).
- Version inventory exactly 006–056; no pg_cron/pg_net/http extension or cron tables.
  No database scheduler configured. An external scheduler may exist; not verified.
- Queue aggregates: one historical sent row, latest attempt 20 August 2026; zero
  queued/due/overdue/stuck/exhausted and duplicate dedupe keys. Outbox RLS enabled.
  Internal worker/health RPCs deny browser roles and permit service_role. Application
  queue_event_email retains authenticated access; its scope semantics not rerun here.
- Local secret shape/presence checks passed, not deployed env/provider validity.
  Initial overstrict Resend regex result superseded by protected correction using
  the existing repository rule; no secret changed or exposed. All 25 focused local
  worker runtime/scheduler/monitoring tests passed.
- Full sanitized findings: workspace `staging-readiness/STAGING_EMAIL_AUDIT_2026-10-04.md`.
  External job identity/cadence, monitoring configuration/owners/alert delivery,
  deployed secrets and delivery remain unverified. No completed relevant evidence
  found in the top-level protected filename check; not an exhaustive inventory.
  Next needs external scheduler/monitoring service identification, not an automatic
  worker invocation. Even an empty queue worker can create memorial announcements.

## Full local regression passed; physical Safari deferred by user

- User explicitly said "skip, next" in response to physical Safari coverage.
  Recorded physical Safari testing as deferred for now, NOT passed and not a
  production support-policy waiver. Existing release gate and device requirements
  remain unchanged. Original-password recovery remains separately unresolved.
- Fresh `npm test` passed TypeScript and all 537 local application/guard tests
  (0 failures, 0 skipped). This is synthetic/unit regression evidence, not live
  delivery, physical-device, password-recovery or production acceptance.
- No database/project resume, password reset, staging/provider/production contact,
  commit, push or deployment occurred. No build or browser rerun is claimed.
  Existing application code, migrations and unrelated local changes preserved.
- Reviewed the existing CI synthetic-build and release evidence requirements.
  Remaining execution work includes actual provider delivery/scheduler/monitoring,
  completed recovery/Auth and rollback evidence, exact production target/secrets,
  identity and authorized cutover. These require scoped authorization and/or
  operator evidence; do not mark them complete from passing offline fixtures.

## Local release recheck — 4 October 2026

- Continued safe offline work without interpreting the user's "next" as approval
  to waive original-password recovery, reset accounts, resume the disposable or
  contact staging/production. Password recovery remains unresolved, not passed or
  formally deferred. Last verified disposable state remains INACTIVE/Auth disabled.
- Local HEAD remains `7471c44` (web-first release scope). Existing checkpoint,
  recovery README and nine Supabase temporary metadata changes were preserved.
  No fetch, push, deployment, secret read or live environment contact this step.
- Fresh checks passed: `npm run typecheck`, `npm run lint`, 34 release-window and
  evidence-packet tests, 8 physical-Safari validator tests, and `git diff --check`.
  Git reported line-ending normalization warnings only. No production build,
  complete application test suite, browser session or live CI rerun is claimed.
- Prepared workspace `staging-readiness/PHYSICAL_SAFARI_HANDOFF.md` from existing
  physical-device requirements: exact deployed identity, private test credentials,
  Mac/iPhone/iPad read-only role checks and manual accessibility. All are NOT RUN.
  Needs explicit staging access approval and available physical devices; do not
  treat mocked validator tests or automated WebKit as device acceptance.

## Latest corrected Auth attempt — protected password validation blocked

- Corrected disposable-only retry passed three stability probes, the pinned full
  database preflight, no-job check and fresh baseline capture: 103 tables,
  21 catalog sections, 57 Auth users/identities, zero sessions/refresh tokens.
- Corrected identity SQL ran past the former profiles.role defect. Execution then
  stopped at the password-hash guard with `Protected password differs from restored
  hash`. This combined guard checks supported bcrypt hash format and password match;
  no per-account diagnostic was retained. Do not guess which account failed or
  claim all three credentials were checked. Backup-era credentials may differ
  from current saved credentials; this explanation has not been independently proven.
- No password login, refresh or logout acceptance completed; Auth was never enabled.
  Protected test values were read into memory, never logged or changed. No resets,
  account creation or application mutations were attempted. No other project or
  delivery provider was contacted. Backup and prior failed evidence preserved.
- Result at 2026-10-04T02:06:19.107Z verified Auth disabled and target INACTIVE;
  a subsequent target-only management read independently reconfirmed INACTIVE.
  Evidence: `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acceptance-1791079240657\result.json`.
  Zero accounts passed. False final verification flags mean incomplete acceptance,
  not a finding that the database or Storage changed.
- Hosted Auth recovery remains OPEN. Need backup-era test credentials stored
  securely, or an explicit decision to defer password recovery acceptance. Resetting
  disposable passwords would require separate approval and would test new-password
  login only, not preservation of the original backed-up passwords. Do not silently
  substitute magic links, reset accounts, or resume for another identical retry.

## Latest approved retry — preflight passed; verifier query corrected offline

- Resumed only disposable `wtnonpldqvzipqmwgbru` for the approved single retry.
  Three separated health/database probes passed with stable postmaster start time.
  The pinned full database verification completed successfully, no scheduled jobs
  were found, and fresh baseline capture completed: 103 tables, 21 catalog sections,
  57 Auth users and identities, zero sessions and refresh tokens.
- The next read-only account query failed before any Auth enablement or login.
  Local inspection identified a definite runner defect: it referenced profiles.role,
  absent from the captured schema. The old secret-query branch suppressed raw SQL
  errors, so the server diagnostic was not retained. No credential mismatch was
  established; the account/password check did not complete. The six protected test
  values had been loaded into memory at this stage, not logged or changed.
- Corrected the runner to derive role from profiles.is_super_admin, active dojo
  assignments and active/Break admin memberships, matching existing role sources.
  Added a required-column guard before loading test values and safe SQLSTATE-only
  failure capture for secret queries. The corrected schema guard passes against
  the captured baseline offline. All 29 helper tests and Node syntax check pass.
  No database/app schema change, password reset, or unapproved live retry occurred.
- Auth remained disabled; target INACTIVE independently confirmed by the wrapper
  after runner quarantine at 2026-10-04T01:52:55.059Z. Evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acceptance-1791078451683`.
  Accounts passed: 0. Overall false acceptance fields mean incomplete verification,
  not observed data corruption. Preserve this and all earlier/source evidence.
- Hosted login/refresh/logout remains OPEN. The single retry authorization is used;
  next requires a corrected disposable-only retry with the same disable-and-pause
  cleanup. No other project or delivery provider was contacted.

## Latest Auth recovery — ACL repaired, database preflight interrupted

- Approved exact-file ACL repair completed: `C:\protected\jingwuguan-staging.env`
  is now owned by VIN\hioec with inheritance disabled and one owner-only full-control
  rule. Its content hash matched before/after and on independent verification.
  Elevated helper exited nonzero because its new evidence file was administrator-
  owned; normalized only that generated evidence owner and verified its private ACL.
  Evidence: `staging-env-acl-restriction-1791077635775.json` in the protected
  recovery directory. The original credential values were not changed.
- Resumed only `wtnonpldqvzipqmwgbru`; management status reached ACTIVE_HEALTHY.
  Auth/worker/SMTP isolation checks passed. The subsequent SQL preflight connection
  was terminated during data-equality.sql line 145 with `terminating connection due
  to administrator command`, followed by unexpected SSL closure. No completed
  preflight success or data-mismatch assertion was observed. Cause is unverified;
  do not label it a proven platform restart or failed restore.
- The runner stopped before reading SECURITY_TEST values or enabling Auth. Zero
  login/refresh/logout account tests ran. Auth disabled and INACTIVE quarantine
  were verified at 2026-10-04T01:40:01.658Z, with independent wrapper confirmation.
  Protected result: `auth-acceptance-1791077907900/result.json` under the existing
  protected recovery directory. Failed SQL evidence and all source evidence remain.
  Result flags for data/hash acceptance being false mean NOT VERIFIED this attempt,
  not evidence that the stored data or logos changed.
- Added three separated exact-target health/database probes with stable postmaster
  start time before a future preflight; failures still stop rather than retry.
  All 27 local helper tests and Node syntax check pass. This guard is locally tested
  only and cannot guarantee backend uptime. No retry/resume after quarantine yet.
- Hosted Auth recovery remains OPEN. Next: approve one disposable-only resume and
  guarded retry after stability checks, then disable Auth and pause again. No other
  project, retired/production system or delivery provider was contacted.

## Earlier Auth recovery attempt — blocked locally, disposable paused

- User approved password login/refresh/logout for the three restored test accounts
  on disposable `wtnonpldqvzipqmwgbru`, temporary password-provider enablement,
  disabled-Auth restoration and project pause. Prepared separate exact-target
  runner/wrapper; staging security tooling was not retargeted or run.
- Invocation stopped at the local owner-only ACL guard before the Node runner
  started: `C:\protected\jingwuguan-staging.env` is owned by CodexSandboxOnline
  and has broader group access, including Users and Authenticated Users. No test
  passwords were read, Auth was not enabled, and no login/refresh/logout requests
  were sent. No passwords, file permissions or application records were changed.
- Separate target-only quarantine confirmed Auth providers/hooks disabled and
  project INACTIVE at 2026-10-04T00:47:33.7623581Z. Evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acl-stop-quarantine-1791074853766.json`.
  Its `credentialsRead:false` refers to test-account credentials; the existing
  management credential was used for the approved quarantine only.
- All 25 local recovery helper tests pass; Node and runner-wrapper syntax checked.
  These do not verify live Auth acceptance or the new runner's runtime behavior.
  Earlier database/Storage recovery success remains valid. Hosted Auth acceptance
  is OPEN. No staging, production, retired project or delivery provider contacted.
- Next needs approval to restrict that exact env file's owner/access to the user
  without changing values, then resume this disposable and run the approved tests,
  disable Auth and pause again. Do not relax the ACL guard or reset any passwords.

## Hosted Auth recovery preparation — 4 October 2026

- Prepared a disposable-only password-login/refresh/local-logout acceptance plan
  for restored Member 0101, Admin 0002 and Super Admin 0001. Existing staging
  security tooling is staging-pinned and uses magic links; it was not retargeted
  or run, and cannot prove restored password-hash recovery.
- Added pure request/isolation/approval guards and four local Auth guard tests.
  All 25 local recovery helper tests passed across six test files. This is local
  preparation evidence only: no executable live Auth runner has been completed,
  no remote project was contacted, no credentials were read, and no provider or
  account settings were changed during this preparation.
- Plan and helpers: workspace `staging-readiness/AUTH_RECOVERY_ACCEPTANCE_PLAN.md`
  and `recovery-auth-guard.mjs` / `recovery-auth-guard.test.mjs`.
- Live acceptance remains OPEN. Requires explicit approval to temporarily enable
  password login on `wtnonpldqvzipqmwgbru` only, read the six protected test-account
  email/password values, verify the restored identities/hashes, test login,
  refresh and local logout, restore disabled Auth, then pause the disposable.
  Signup, other providers, hooks and delivery remain disabled. No password reset,
  user creation, direct Auth-row cleanup or contact with other projects is allowed.
  Expected Auth timestamps/audit/session deltas must be reported, not called
  zero residue. Existing access JWTs may survive logout until expiry.

## Latest Storage recovery — 4 October 2026

### Approved continuation PASSED

- Resumed only disposable `wtnonpldqvzipqmwgbru` and independently reconciled
  exactly one empty private class-logos bucket; no objects or unexpected policies.
  Reused that bucket without recreating it. Created the empty private video bucket
  with the expressly approved 52,428,800-byte limit (source: 2,147,483,648 bytes).
  Source backup/plan metadata was not modified; this deviation is disposable-only.
- Restored exactly six logo files, 3,412,943 bytes, with upsert disabled. Verified
  all six downloaded byte counts/SHA-256 hashes while private and again through
  public URLs after making only class-logos public. No existing files overwritten.
- Anonymous downloads of all six existing objects were denied while private.
  Anonymous listing returned empty or denied for both buckets, and the guarded
  no-upsert insert probe was denied by authorization/RLS. Bucket privacy, limits,
  MIME restrictions, null ownership, object MIME/cache metadata and unchanged RLS
  were verified. No policies were created or broadened. The source video bucket
  is empty; protection of an existing video object was not tested or claimed.
- Fresh preflight and independent postflight database verification PASSED:
  copied data, catalog, ledger, sequence, managed-object and security assertions.
  Final target status ACTIVE_HEALTHY and isolation verified: Auth providers/hooks
  disabled, no Edge Functions/secrets or delivery workers. Failure pause was not
  needed on this successful continuation. No other project/database/provider was
  contacted; no application deployment, commit or push occurred.
- Verified result recorded at 2026-10-03T23:36:06.677Z (4 October in Sydney):
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-restore-1791070301947\result.json`.
  Access results and independent SQL evidence are retained beside it. Original
  failed-attempt journal is unchanged; the approved continuation has a separate
  write-once attempt-02 journal. Original encrypted backup fingerprint matched.
- All 21 local helper tests passed, including immutable target-only limit
  adjustment and strict partial-state rejection. Full hosted Auth login/refresh/
  logout recovery acceptance remains OPEN; no account/password/provider changes
  or successful Auth login are implied by this Storage success. Earlier failed
  attempt notes below are historical and superseded by this approved continuation.

### Live attempt stopped; disposable target confirmed paused

- Ran the approved no-overwrite Storage recovery against disposable
  `wtnonpldqvzipqmwgbru` only. Fresh full database verification PASSED before
  Storage changes, including copied data, catalog, ledger and security assertions.
  Auth isolation preflight passed; providers/hooks were not enabled.
- `class-logos` was created PRIVATE. The next bucket creation failed before the
  upload loop; no logo files were uploaded. Creation of the video bucket was not
  acknowledged and must be reconciled after any separately approved resume.
  No existing files were overwritten and no delete/cleanup was attempted.
- Failure handling paused the disposable project. Independent management
  inventory subsequently confirmed INACTIVE. No production/staging/retired
  database or delivery provider was contacted.
- Read-only management configuration shows a 52,428,800-byte global file-size
  limit; the source empty video bucket specifies 2,147,483,648 bytes. This is an
  incompatible restore setting. The first runner did not retain the exact failed
  HTTP response, so that response's status/body is not claimed as verified.
- Protected evidence and exclusive attempt journal are retained:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-restore-1791069349580`.
  Added local preflight size-limit validation and protected HTTP diagnostics for
  future attempts; five Storage helper tests pass. No retry was run.
- Next needs a decision/approval: resume this disposable project, read-only
  reconcile partial Storage state, then either use an explicitly documented
  50 MiB limit on its empty video bucket or defer that bucket. Do not silently
  alter source metadata, upgrade billing, bypass the journal or overwrite objects.
  Storage live hash/access/postflight acceptance remains OPEN.

- Offline Storage preparation PASSED: authenticated source/archive hashes and
  all six file SHA-256 hashes verified; total 3,412,943 bytes. Manifest identities
  and metadata match the selected dump's Storage records. No network contact,
  upload, bucket creation, Auth change or database mutation occurred this step.
- Source layout: public `class-logos` contains all six files; private
  `repository-video-originals` is empty with a 2 GiB limit and captured video MIME
  allowlist. No object/bucket owners or Storage policies are recorded. The restore
  must preserve these facts rather than invent grants, owners or MIME restrictions.
- Corrected the offline pg_restore selection to use a separate Storage schema
  filter and strict unqualified table names. The earlier selection produced no
  COPY blocks and stopped safely. Four Storage helper tests pass.
- Protected verified plan:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-preparation-1791068719153\storage-plan.json`.
  Original encrypted evidence and failed-preparation scratch remain preserved;
  extracted plaintext is retained under owner-only protected ACLs.
- Hosted upload/download and Auth recovery acceptance remain OPEN. Prepared a
  target-only execution plan: create private initially, upload without overwrite,
  hash-check, then restore public access only for class-logos. Do not enable Auth
  providers or send delivery messages as part of the Storage operation.

## Latest recovery preflight — 3 October 2026

### Corrected persistent disposable restore PASSED

- Executed exactly one separately approved corrected attempt on disposable
  `wtnonpldqvzipqmwgbru`. Fresh read-only reconciliation first matched the empty
  baseline. A separate write-once `persistent-restore-attempt-02.json` records
  this attempt; the original failed-attempt journal remains unchanged.
- Import exited 0, all transaction assertions passed, and COMMIT was acknowledged.
  A fresh database connection independently verified all 383 copied rows across
  70 tables, 15 application catalog comparisons, exact 51-row migration ledger
  006–056, all six sequence values, Auth triggers/default privileges and the
  repository database-security assertions. This is a verified persistent database
  restore, not only a rollback rehearsal.
- All 18 managed catalog datasets (excluding the intended application changes),
  six Auth constraints, 19 Auth indexes and unrelated authenticator settings
  matched the preserved target baseline. No cron.job, subscriptions, foreign
  servers, Storage buckets or Storage objects were introduced.
- Final platform isolation verification PASSED at 2026-10-03T10:52:48Z:
  Auth providers/hooks remain disabled; zero Edge Functions/secrets. The runner
  completed with exit 0, so failure quarantine was not invoked. Target remains
  active and isolated; it is NOT a production project.
- Protected success evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\persistent-restore-1791024441642\result.json`
  with `commit-outcome.json`, independent verification SQL/output, and a separate
  protected platform-postflight record. The original encrypted backup SHA-256
  still matches its recorded fingerprint; failed-attempt evidence is retained.
- Local validation: 14 helper tests pass, including literal SQL insertion and
  corrected-attempt target/outcome/freshness guards; Node syntax and PowerShell
  parsing pass. No production, staging or retired database, or external delivery
  provider, was contacted. No application deployment, commit or push occurred.
- Remaining recovery work: Storage-byte restoration and hosted Auth/Storage API
  acceptance. Neither is claimed complete by this database-only result. Earlier
  failure/quarantine and rollback-only notes below are historical milestones.

### Approved resume and read-only reconciliation PASSED

- Resumed only disposable `wtnonpldqvzipqmwgbru`; management inventory confirmed
  ACTIVE_HEALTHY. No import was retried, and the existing attempt journal is
  byte-for-byte unchanged. The target remains active with isolation intact.
- A fresh client-TLS-verified, repeatable-read READ ONLY transaction compared
  all 18 catalog datasets and the complete saved Auth/session/Storage counts,
  ledger-schema absence, Auth triggers and authenticator role settings. Its
  fingerprint exactly matches the pre-import baseline:
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
  Independent zero-residue reconciliation PASSED; no changed catalog sections.
- Also matched the saved Auth constraints/indexes; confirmed zero public tables,
  Auth users/identities/sessions/refresh tokens and Storage buckets/objects, no
  application ledger, cron.job, subscriptions or foreign servers.
- Auth signup/providers/hooks remain disabled, with zero Edge Functions/secrets,
  verified before and after database reconciliation. Initial isolation checks
  stopped before database access because the local PowerShell helper counted an
  empty API array as a pipeline item. Assigning responses before counting fixed
  that false positive; no remote settings were changed.
- Protected results:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\read-only-reconciliation-1791021907586\result.json`.
  Source evidence and failed-attempt journal are preserved. No staging, retired
  or production database, or outbound delivery provider, was contacted.
- This closes reconciliation of the failed attempt only. A new persistent import
  is NOT authorized by this read-only approval and was NOT performed. Persistent
  restore and hosted Auth/Storage recovery acceptance remain open.

### Persistent attempt stopped; disposable target quarantined

- The first persistent attempt stopped with a SQL syntax error before the
  transaction-assertions marker or commit acknowledgement (psql exit 3).
  Independent verification also failed on a missing relation. This is NOT a
  successful persistent restore or a fresh complete zero-residue verification.
- Protected attempt evidence remains in
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\persistent-restore-1791019323683`.
  The exclusive attempt journal and encrypted source evidence were retained;
  no automatic retry or journal removal occurred.
- The guard requested quarantine. A subsequent read-only management inventory
  confirmed disposable `wtnonpldqvzipqmwgbru` is INACTIVE. Staging remains
  ACTIVE_HEALTHY and the retired project remains INACTIVE; their databases were
  not contacted. No production/provider operation occurred.
- Root cause: String.replace interpreted a dollar-sign replacement token in a
  captured Auth index definition, corrupting the generated assertion SQL.
  Workspace recovery tooling now inserts checks via a literal callback and
  rejects missing/duplicate markers. All 12 local helper tests pass, including
  replacement-token regressions for both commit and verification SQL. Node
  syntax checking also passes. The fixed generator has NOT been run remotely.
- Next requires approval to resume only this quarantined disposable project and
  perform read-only full-baseline reconciliation. Do not replay the import or
  bypass the existing attempt journal. Persistent restore, Storage-byte recovery
  and hosted Auth/Storage acceptance remain open. Prior rollback results below
  are historical successes, not evidence that this persistent attempt passed.

### Rollback-only managed restore passed

- Expanded data-integrity follow-up also PASSED: exact semantic equality for all
  383 copied rows across the exact 70-table set (67 public tables, auth.users,
  auth.identities and the migration ledger). Expected rows were loaded into
  pg_temp-qualified tables without triggers/defaults; both directions used
  EXCEPT ALL, preserving duplicate-row sensitivity. Only copied columns were
  compared; this is semantic SQL/JSONB equality, not byte-for-byte serialization.
  No row values were exposed in console output.
- Expanded protected result:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\rollback-rehearsal-1791018511840\result.json`.
  All 15 catalog comparisons, six sequence-value checks, exact ledger, Auth
  triggers/default ACLs and security assertions passed again. The independent
  before/after fingerprint remained
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
  No import was committed and temporary expected tables disappeared on rollback.
- Eight local helper tests pass: malformed/duplicate/unexpected COPY tables and
  columns, quoted reserved columns, escapes, nulls, duplicate rows, empty tables,
  terminators and TOC descriptor handling. Initial quoted-column parser rejection
  occurred during offline preparation before any database attempt. Persistent
  restore needs its own post-commit reconciliation path, fresh isolation checks,
  Storage bytes and hosted API acceptance; do not merely replace ROLLBACK with
  COMMIT in this runner. These remaining gates are not claimed complete.

- The selected staging backup was loaded inside one transaction on disposable
  `wtnonpldqvzipqmwgbru`, verified, then rolled back. This is an executed rehearsal,
  not a persistent restore. Staging, production and the paused old database were
  not contacted. Auth providers/hooks stayed disabled; no outbound provider ran.
- Passed 15 application catalog comparisons, exact 51-row migration ledger
  006–056, all six sequence values, 57 Auth users and identities, the three custom
  Auth triggers, final default ACLs and the repository database-security verifier.
  An independent connection compared all 18 catalog datasets, Auth/session and
  Storage counts, Auth triggers and authenticator settings before/after rollback.
  The hashes match exactly:
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
- Successful protected evidence directory:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\rollback-rehearsal-1791016739453`.
  Final public table/Auth user/identity counts are zero; application ledger absent.
- Earlier bounded attempts timed out or stopped on comparison errors and independently
  verified the same zero-residue baseline. Schema-only batching fixed round-trip
  latency without changing statement order or accepting failed assertions.
- Two owner-only sequences required four explicit SELECT/UPDATE grants to postgres
  to match the source catalog; no browser/service role access was broadened. Six
  bigint sequence maximums in the source JSON were rounded by JavaScript numeric
  serialization; exact 9223372036854775807 limits were independently verified from
  the authenticated SQL dump's bigint/NO MAXVALUE definitions. Original encrypted
  backup/catalog evidence was preserved. Future catalog export should preserve
  int8 values losslessly; the bounded correction is disclosed in rehearsal results.
- At the initial rehearsal, per-table data equality remained open; the expanded
  follow-up above closes that rehearsal check. Persistent managed restore, Storage
  bytes and Auth/Storage API recovery acceptance remain OPEN. No production readiness gate
  is closed solely by this rollback rehearsal. Helpers remain local; no push or
  deployment occurred.

### Selective SQL and connection follow-up

- Read-only management metadata and a client probe target only disposable
  `wtnonpldqvzipqmwgbru`. The API-provided Singapore transaction-pooler endpoint
  was verified without guessing a connection host. The client connects with
  `sslmode=verify-full` and explicit psql TLS evidence. Its observed pooler-to-DB
  `pg_stat_ssl` value is false; this is recorded separately, not misrepresented as
  end-to-end TLS. The probe uses an explicit read-only transaction.
- The empty baseline remains zero public tables, Auth users/identities and Storage
  objects. The recovery role can create public objects and insert Auth users and
  identities; required `extensions.digest(bytea,text)` and
  `extensions.gen_random_bytes(integer)` functions exist and are executable.
- Source/target Auth column names, types and generated flags match exactly for
  35 users columns and nine identities columns. Six target Auth constraints and
  19 indexes were captured for subsequent comparison; matching columns alone is
  not full Auth compatibility or login proof.
- Generated a protected offline schema-only proposal containing 1,240 entries;
  three platform-owned public default ACL entries are excluded for comparison
  rather than overwrite. SQL SHA-256:
  `a9a185850f52cbe28a4f3cda91302303bb55149f7a8581aa6028c7a2399ac734`.
  Static egress-pattern scanning found no flagged objects, but is not a complete
  executable-SQL safety audit. No restore SQL has been executed.
- Parallel repository review identified migration 047's separate authenticator
  `pgrst.db_pre_request=public.enforce_active_account_request` setting. A public
  schema restore alone omits it. Exact role-setting restoration/readback, sequence
  state, current grants, Auth triggers and platform-owned objects must be accounted
  for before managed acceptance. Global roles must not be imported wholesale.
- Recovery API tests must remain target-only: restored avatar URLs can still point
  to staging. Do not open a restored UI or rewrite source facts to conceal this.
- Four classifier regression tests and the SQL-preparation JavaScript syntax check
  pass. Helpers and protected evidence are local; no commit, deployment,
  production/retired access, staging mutation or provider call occurred. Managed
  import and acceptance remain open; freshly recheck isolation before import.

- The disposable Singapore recovery project `wtnonpldqvzipqmwgbru` passed an
  empty-target inspection: no public application relations/routines, Auth users or
  identities, Storage buckets/objects, application ledger, cron table, database
  webhook triggers, subscriptions or foreign servers. PostgreSQL is 17.11.
- Signup, email/phone/anonymous providers were disabled and read back; the Site URL
  is `https://recovery.invalid` with an empty redirect allowlist. Other providers,
  Auth hooks and mail notifications were already disabled. There are no deployed
  Edge Functions or Edge secrets. This is pre-import isolation only: no SMTP sink
  was configured, and invite/reset/admin-email routes must not be invoked.
- Initial isolation attempts received HTTP 402 when unnecessary disabled premium
  hook/notification fields were included. The successful patch changes only basic
  settings after checking those unused features were disabled; no paid upgrade was
  requested. Isolation was independently read back; no email was sent.
- Authenticated decryption of the approved 2 October staging backup passed GCM,
  ciphertext/plaintext SHA-256 and byte-length checks. Selected tar entries were
  verified as safe regular-file paths. Protected inspection scratch contains the
  dump, schema-only SQL and metadata; it is retained under current-user-only ACLs
  at `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\inspection-20261003`.
  Only the temporary decrypted verification tar was removed. Encrypted source
  evidence remains unchanged; retained scratch is not a public release artifact.
- Offline classification covers all 1,866 TOC entries (106 TABLE DATA entries).
  The classifier initially rejected one standard DEFAULT entry; a regression test
  was added and all four synthetic tests now pass. The protected classification
  remains a review proposal, not an executable restore list or authorization.
  Application proposals comprise 303 pre-data, 73 data and 935 post-data entries;
  two core Auth data entries are separated from managed objects and old sessions.
- All three expected custom Auth triggers are present in the source catalog:
  `jwg_profile_on_auth_user_created`, `jwg_class_request_on_email_verified`, and
  `jwg_profile_email_on_auth_email_changed`. They require separate definition and
  post-import checks and must not fire during Auth/profile loading. Ledger table,
  data and primary-key entries are identified for explicit review.
- Read-only target compatibility evidence captures 344 managed Auth/Storage column
  records and seven managed triggers. Available extensions include Supabase Vault
  0.3.1, resolving the earlier local cluster's missing-extension prerequisite but
  not proving restore compatibility or recovery acceptance.
- No database import or data mutation occurred. Next: review exact selected SQL,
  dependencies, ownership/grants and managed-schema column compatibility; construct
  the guarded staged import; restore Storage bytes without overwrite; run exact
  ledger/catalog/Auth/Storage/security checks; then quarantine the disposable target.
  Managed recovery remains OPEN. Physical Safari and production operational gates
  remain separate. No production, retired database, Mux, Resend, push provider,
  deployment or domain was contacted or changed by this milestone.
- Parallel independent review produced an execution checklist and identified why
  the old wholesale restore script must not be retargeted. Helpers/checklist are
  retained in this task's local `staging-readiness` directory. These documentation
  updates are local/uncommitted; no new CI or deployment success is claimed.

## Current release checkpoint — 1 October 2026

- Branch `release/v1-readiness-20260918` remains the active release candidate. The
  latest staging application deployment is exact commit `8caa3e9`, and its Preview contains only the
  four protected `MUX_*` additions required by this activation; their values remain
  outside Git.
- Ready Preview `dpl_AZK7CPjTCcbeQCytugpwyEtbgFBv` serves only
  `jingwuguanseibukan-staging.vercel.app`. It passes 11/11 host/security-header probes,
  12/12 role-security checks and 18/18 read-only WebKit checks across desktop, tablet
  and mobile.
- Staging `eomubndonbetszdbhsrj` has the exact remote migration ledger 006–056.
  Migration 056 is applied only there; database lint, strict database verification and
  the independent migration-056 security/zero-residue postflight pass.
- Guarded live Mux acceptance created one disposable asset and linked Repository Draft,
  verified a short-lived RS256 playback token plus signed HLS, restored the row to
  Draft and deleted the exact row and asset. Provider asset 404, application playback
  404 and database baselines prove no live asset or application fixture remains.
- Mux's current regional OCI Direct Upload URL shape is now accepted through a narrow
  HTTPS host/path allowlist. Lookalike hosts, traversal paths, credentials, custom
  ports and fragments remain rejected. Failure logs expose only bounded categories.
- Final local evidence passes 346/346 application tests, 22/22 desktop uploader tests,
  ESLint, TypeScript and the optimized 51-route production build.
- Protected database/Auth/Storage metadata, role and Storage-object source evidence is
  captured. A disposable local PostgreSQL 17 restore proves the exact ledger, critical
  counts, roles, grants, RLS and all catalog objects except the managed Vault extension.
  Sanitized results are recorded in
  `release-evidence/local-recovery-rehearsal-20260930.md`.
- Production remains blocked on a new Singapore Supabase project, managed-platform
  restore/cutover proof, real email scheduler/delivery, dedicated-inbox Auth workflows,
  targeted push and physical Safari/iOS evidence, removal of weak staging test accounts,
  production-only secrets/DNS/redirect configuration and an approved release/rollback
  window. Mux activation is complete and verified on staging; it has not been configured
  or deployed to production.
- Production and the retired Supabase project were not contacted by this checkpoint.

## Desktop installer and retired-target guardrail checkpoint — 1 October 2026

- The desktop uploader now accepts the same narrow regional Mux Direct Upload URL
  shape proved by staging while retaining the legacy Google Storage form. Host/path
  lookalikes, credentials, custom ports, fragments and malformed identifiers fail
  closed. The uploader suite passes 22/22.
- A new staging-only NSIS installer was built and inspected. Its ASAR contains the
  approved staging public configuration, current regional and legacy Mux guards,
  bundled FFmpeg/license files, and no protected credentials, environment files or
  test fixtures. SHA-256 is
  `1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`.
- Read-only staging role acceptance passes for Member, Admin and Super Admin, and a
  synthetic MP4 processes and decodes with the two current watermarks. The package
  remains staging-pinned, x64 and unsigned. GUI automation could not be completed in
  the restricted Windows runner, so ordinary interactive launch/uninstall remains a
  user-host acceptance item rather than a claimed pass.
- Release scripts no longer label retired project `pkmllhaavadhaozmwapz` as
  production. Security probes and dummy cleanup reject it in every mode; any future
  production read-only probe requires an exact separately supplied active project ref.

## Staging Mux activation checkpoint — 1 October 2026

- Only the four `MUX_*` secrets were added to the branch-scoped Vercel Preview; no
  Production environment variable was changed.
- Migration 056 was applied only after the staging URL guard and exact 006–055 ledger
  check. The final ledger is exactly 006–056 with no database-lint findings.
- The live acceptance uses the protected Super Admin staging account and a 5,044-byte
  disposable MP4. It creates at most one asset and one Draft, validates server-side
  ownership/finalization, signed token claims, unsigned playback denial and signed HLS,
  then removes the captured database row and provider asset.
- Earlier pre-upload failures created no asset or Draft. Their marker-matched waiting
  Direct Upload sessions were cancelled with provider 200 responses. The successful
  run verified provider 404 for its deleted asset and application 404 for its deleted
  content.
- Exact deployment, database, browser and security results are recorded in milestone
  170 of `TODO_PROGRESS.md`. Production and `pkmllhaavadhaozmwapz` were not contacted.

## Email scheduler feasibility checkpoint — 30 September 2026

- The committed worker/provider suite passes 28/28 focused tests, including wrong-
  secret denial before database/provider access, durable rate-limit failure behavior,
  empty and 20-message batches, retry persistence, acknowledgement failure, queue
  health normalization and memorial-processor observability.
- A current read-only Supabase project inventory still shows both available projects
  active, so the approved disposable managed-restore rehearsal remains blocked by the
  missing free project slot. Neither existing project was paused, deleted or changed.
- Current Vercel documentation confirms that Cron targets the project's production
  deployment with `GET`; Hobby runs at most daily, while one-minute execution requires
  Pro or Enterprise. It also does not retry failures and may overlap/duplicate runs.
  Therefore no Vercel Cron entry was added to this Preview-only staging release.
- Staging still needs a separately authorized one-minute external `POST` scheduler,
  monitored real Resend delivery to a dedicated staging inbox and the complete retry/
  exhaustion acceptance record. Production still needs an independently reviewed
  scheduler choice and must not inherit a staging Preview assumption.
- Production, the retired project, provider settings and the deferred Mux/uploader
  working tree were not contacted or changed.

## Privileged worker secret hardening — 30 September 2026

- The email-worker and push-delivery routes now use one server-only constant-time
  comparison helper. Both supplied and configured values are SHA-256 digested before
  `timingSafeEqual`, so a wrong-length header follows the same fixed-length comparison
  boundary while a missing or empty configured secret continues to fail closed.
- Regression coverage proves exact-match acceptance, missing/empty/wrong-value denial,
  fixed 32-byte digest comparison for different-length input and rejection before any
  database or provider work. The complete local application suite passes 315/315,
  TypeScript passes, targeted ESLint passes and the intended diff is whitespace-clean.
- No secret value changed, no environment variable was exposed and no live worker was
  invoked. Staging, production, the historical project and external providers were not
  contacted; deferred Mux/uploader changes remain outside this milestone.

## Parallel external-gate hardening — 30 September 2026

- Parallel read-only audits covered the email scheduler/Resend gate, dedicated-inbox
  Auth flows and Web Push/Safari readiness. No audit contacted a live system.
- Registration, account-email replacement and `/auth/confirm` now share one exact
  configured-origin validator. Registration no longer derives its callback from the
  browser host, and confirmation success/error redirects no longer inherit an
  untrusted request host or unrelated query parameters. HTTPS is required except for
  explicit localhost/loopback development origins.
- Email-worker responses now retain migration 033's existing sanitized backlog
  telemetry: total queued messages, due messages and oldest-ready age. This closes the
  local monitoring gap for growing-queue alerts without changing the database.
- Modules that access the Supabase service key, VAPID private key or durable rate-limit
  secret are explicitly `server-only`. The service worker now treats JSON `null`,
  arrays and primitive push payloads as safe empty payloads and uses notification
  fallbacks instead of throwing.
- Real inbox delivery, external scheduler monitoring, the intentionally hidden push
  settings UI/PWA installation tranche and physical Safari/iOS delivery remain open.
  Production, staging, the historical project, providers and deferred Mux/uploader
  files were not contacted or changed.

## Fixed staging alias and guarded WebKit gate verified (28/09/2026)

The fixed staging alias `https://jingwuguanseibukan-staging.vercel.app` was reassigned
only to Ready Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP`, built from the
release implementation commit `3a118f7` on `release/v1-readiness-20260918`. A
post-change Vercel inspection resolved the fixed alias back to that exact deployment,
and the deployment dashboard listed the fixed alias alongside the release-branch and
immutable Preview URLs.

The staging-only host gate then passed 11/11 read-only probes covering public pages,
static assets, protected route shells, method guards and security headers. The guarded
WebKit suite passed 18/18 checks with one worker: six checks each on desktop, tablet
and mobile for anonymous registration and confirmation recovery, Member access,
scoped Admin boundaries, Super Admin read-only pages and certificate not-found
handling. No application records were mutated. Production was not contacted, and the
deferred Mux/uploader working tree was not changed.

## Release commit, CI and Preview gate verified (27/09/2026)

The implementation release checkpoint on `release/v1-readiness-20260918` is commit
`3a118f7`; subsequent commits contain release evidence and recovery metadata only.
GitHub CI passed all five release checks: the common
checks job plus Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS. The
locale-safe finance assertion was also rerun locally in Playwright WebKit, passing
114/114 checks with zero skips, unexpected results or flakes.

Vercel Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP` is Ready and available
through both its release-branch Preview alias and the deliberately reassigned fixed
staging alias. The earlier project-scoped-token alias API failure is superseded by the
verified CLI reassignment recorded above. Production was not contacted or modified.

Migration 054 remains persisted only on staging `eomubndonbetszdbhsrj`. Its independent
postflight again passed the exact 006–054 ledger, zero-residue and security contract,
and all 12 authenticated Member, scoped Admin and Super Admin role-security checks
passed. Guarded read-only browser verification of the new release through the fixed
staging alias now passes 18/18 WebKit checks.

## Member contact self-service browser workflows verified (27/09/2026)

The real Member profile now has isolated browser coverage for phone and optional
Instagram updates plus the verified email-change request. The successful workflow
proves phone/Instagram normalization is reflected in the interface, Member ID/name
remain intact, the current email remains active while confirmation is pending, and
the same-origin request carries the Member session bearer token. The rejection
workflow proves both contact and duplicate-email errors remain visible and retryable
without losing the entered form values.

The production build generated all 50 routes. The finalized browser matrix passes
186/186 checks across Chromium and WebKit desktop, tablet and mobile; the two new
contact workflows pass 12/12 profile executions. Type-check plus unit/security tests
pass 279/279 and lint passes. The browser fixture is network-disabled, so no staging
Member, Auth provider, email inbox or production system was read or changed. A real
provider confirmation round trip remains an external staging gate.

## Deceased-member memorial interface verified (27/09/2026)

The real Super Admin memorial panel now has isolated browser coverage for opening the
settings, marking Deceased, entering Date of Passing, selecting multiple recipient
classes, enabling and writing Remembrance Day and Heavenly Birthday messages, saving
the complete draft, manually publishing the Initial Memorial, and clearing Deceased.
The reversal check proves the date is cleared and all memorial publication controls
become disabled. The interface explicitly preserves Member ID, grades, certificates,
attendance and records, and states that Deceased is separate from Terminated.

The first automated accessibility scan found two low-contrast explanatory labels in
the production panel. Both were corrected from neutral-500 to neutral-400. The final
browser matrix passes 174/174 checks across Chromium and WebKit desktop, tablet and
mobile; the two memorial workflows pass 12/12 profile executions. This UI proof
complements the existing API authorization/Auth-ban unit tests and persisted,
rollback-contained staging memorial SQL acceptance. It does not claim live Auth
ban/unban or publication: no staging or production record was changed.

## Certificate QR verification browser states verified (27/09/2026)

The real server-rendered public verification page now has isolated end-to-end browser
coverage through an exact loopback-only service-role RPC stub. Issued, Pending, Void
and unknown UUIDs render their distinct database-backed states; the page shows the
expected member, promoted rank and certificate number, remains responsive, passes the
automated accessibility scan, and exposes no link or certificate download.

The expanded finalized browser matrix passes 162/162 checks across Chromium and
WebKit desktop, tablet and mobile; six executions cover all four verification states.
The stub accepts only the fixed local test service credential and rejects every other
endpoint. No staging certificate, member, provider or production system was read or
changed. A deployed staging random/unknown UUID check already passes; a real deployed
valid-certificate scan remains unnecessary unless dedicated disposable certificate
history is deliberately created.

## Bulk-assessment browser workflow verified (27/09/2026)

The real Super Admin assessment page now has an isolated, network-disabled browser
fixture covering scoped roster loading, required Mudansha and Yudansha assessors,
three-candidate roster preparation, Pending certificates, one combined Pass/Fail
review and one atomic submission. The final fixture state proves two passing members
were promoted, the failed member remained unchanged, Pass certificates became Issued,
the failed certificate became Void, and the class/dojo announcement payload remained
ordered from the highest successful destination grade to the lower grade.

The finalized production-build suite passes 156/156 checks across Chromium and
WebKit desktop, tablet and mobile; six of those checks are this complete assessment
workflow. Type-check plus unit/security tests pass 279/279, and lint passes. This UI
evidence complements the existing persisted rollback-contained staging SQL proof. It
does not claim that a deployed browser changed staging: no member, grade, certificate,
announcement, provider or production record was mutated.

## Regular-schedule browser mutation workflow verified (27/09/2026)

The real Admin schedule page now has an isolated, network-disabled browser mutation
fixture covering scoped catalog loading, instructor selection, create, edit,
deactivate, server-error presentation and no-row-on-failure behavior. The finalized
suite passes 125/125 checks across Chromium desktop/mobile and WebKit
desktop/tablet/mobile; ten of those checks are the two new schedule workflows across
five responsive profiles. The first synchronization attempt exposed only a fixture
wait issue and was corrected by waiting for the actual RPC-provided options.

This UI evidence complements the existing rollback-contained staging database proof
for schedule authorization, audit and scope semantics. It does not claim that a
deployed browser committed a staging schedule: no Supabase row, provider or production
system was changed.

## Managed Supabase default-privilege gate resolved (27/09/2026)

The former strict-verifier blocker is closed without weakening application-object
checks. A fresh read-only staging catalog proves all 77 public relations, 214 public
routines and 87 public types are owned by `postgres`; zero public objects are owned
by `supabase_admin`; and `postgres` is not a member of that managed role. The only
remaining browser-role defaults owned by `supabase_admin` are hosted-platform
defaults which the application role cannot alter and which do not apply to the
`postgres`-owned migration objects.

The verifier now keeps unsafe global/public defaults owned by `postgres` as a hard
failure. It accepts the managed defaults only while `postgres` cannot inherit
`supabase_admin` and that role owns no public relation, sequence or routine; either
condition changing reopens the release gate. The pinned read-only verifier then
passed against staging `eomubndonbetszdbhsrj`. This matches Supabase's documentation
that `supabase_admin` is an internal administrative role and its default grants are
part of the managed Data API permission model. Production was not contacted.

## JS Video Uploader — Stage G provider-ready candidate (27/09/2026)

The existing Stage B login preview was advanced locally to desktop v0.8.1. The
Windows app now loads exact `get_my_repository_upload_scopes` authority instead of
mistaking ordinary Admin scope for upload permission; an unappointed Member and
unappointed Admin are denied, while Super Admin receives all five staging classes.
It provides database-driven class/rank/tier choices, local video selection, current
organization/class logo retrieval, bundled FFmpeg dual-watermark processing, Google
desktop OAuth with PKCE and exact-channel verification, resumable YouTube upload,
privacy choice with Unlisted recommended, cancellation/progress and guarded Draft
creation through `create_repository_content`. JS and Google tokens remain memory-only;
video bytes never route through Vercel or Supabase Storage.

Verification completed without contacting production or uploading a real video:

- TypeScript/build plus 21/21 desktop security, authentication, configuration and
  local-file tests pass; dependency audit reports zero vulnerabilities.
- Read-only staging role acceptance passes: Member denied, unappointed Admin denied,
  Super Admin receives Aikido, Karate, Kungfu Kids, Taiji and Xingyi.
- Development and packaged Electron UI smoke tests pass renderer isolation, blocked
  renderer networking, password clearing, exact role scope, sign-out and responsive
  minimum-width behavior.
- Local FFmpeg successfully processed and decoded a synthetic two-watermark video.
- Package inspection confirms only staging public configuration, the external
  FFmpeg binary/license/readme and no protected credentials, env files or fixtures.
- The NSIS installer completed a silent install, installed-app smoke test and silent
  uninstall with exit code zero and no remaining install directory.

The candidate is not yet a live uploader release. The protected staging environment
does not contain the public installed-app Google OAuth client ID or the expected
organization YouTube channel ID, and Google may force uploads from a new unaudited
API project to Private. A read-only audit proves 3/5 class logos use current approved
origins: Aikido references retired Supabase origin `pkmllhaavadhaozmwapz`, Kungfu
Kids has no logo, and Karate, Taiji and Xingyi are current. The processing smoke
refused to contact the retired origin. Re-upload/add the affected class logos in staging,
project, configure the two public Google/YouTube identifiers, obtain any required
Google API audit, then run a guarded
real Unlisted upload/Draft-save acceptance. The installer remains unsigned and uses
the default Electron icon; those are distribution/polish gates, not hidden successes.

The v0.8.1 hardening tests the resumable upload metadata, exact Google upload-session
origin/path/ID, returned YouTube video-ID shape and concurrent test isolation. It fixes
an address-validation suffix weakness that could otherwise accept a deceptive hostname.

## Staging migrations 048–052 accepted (26/09/2026)

With explicit staging-only approval, migrations 048 through 052 were applied in
order to Sydney staging `eomubndonbetszdbhsrj`. Postflight confirms the exact
migration ledger is 006–052, the explicit-project dry run is empty and Supabase
database lint reports no errors. The guarded Member/scoped Admin/Super Admin
security suite passes 12/12.

The hardened combined rollback-contained acceptance suite passed the
regular-schedule, Member-contact, exact Member-directory eligible-set,
finance-presentation wrapper/ACL and Repository-Uploader database boundaries. It
reached its deliberate rollback success marker, and an independent postflight
connection confirmed zero synthetic residue, forced RLS/private-table ACLs and the
exact 006–052 ledger. Staging did not contain finance rows suitable for a positive
late-payment example; the positive late/on-time semantics remain verified by the
disposable local database fixture rather than being overstated as live-data proof.

The branch-aware Vercel Preview for release commit `bda9bf9` is Ready, and the fixed
staging alias now points to that deployment. The guarded deployed WebKit matrix passes
18/18 read-only checks across desktop, iPad Mini and iPhone 13. Two earlier 16/18
attempts failed in different authenticated checks because three device projects were
signing the same protected role accounts in concurrently. Serial execution then passed
18/18 twice, including the official guarded command, so the staging harness now uses
one worker to keep the shared-account proof deterministic.

The local production-build browser matrix passed all 69 Chromium and all 69 WebKit
desktop/tablet/mobile checks (138 application checks total). The 23 Firefox checks
could not start because this Windows host returns `spawn UNKNOWN`; the dedicated
host preflight reproduces that limitation before opening an application page, so
Firefox application coverage remains assigned to the isolated Linux CI gate rather
than being reported as an application failure.

Production was not contacted. Migration 053 was reviewed, dry-run as the only
pending change, applied to staging and verified as an idempotency repair for repeated
Repository-Uploader appointments. Its rollback-contained active-retry and
revoke/reactivate acceptance reached the deliberate success marker; independent
postflight confirmed zero marker residue, the exact 006–053 ledger and the intended
RPC/private-table ACLs. Database lint remains clean and the authenticated role-security
suite still passes 12/12.

## Repository Uploader appointments — historical local milestone verified (26/09/2026)

Migration 052 separates repository publishing authority from ordinary Admin scope.
Only an active Super Admin can appoint or revoke an active Member as a Repository
Uploader, and each appointment is limited to one active class. Appointed ordinary
Members may create, update, delete and read drafts only for their appointed classes;
an unappointed Admin receives no implicit publishing authority. Super Admin retains
global authority. Assignment tables are private, forced-RLS and audited, while all
browser mutations remain RPC-only.

The shared `/repository/upload` UI now loads exact RPC-provided class scopes, maps
the returned `class_id`/`class_name` fields explicitly, and appears in navigation
only when the signed-in user has an active upload scope. The Super Admin appointment
screen prevents stale-member mutations while options are loading. The legacy
`/admin/content/manage` URL delegates to the same scoped uploader page, and the Admin
dashboard no longer advertises duplicate or unscoped content controls.

Verification:

- Disposable PostgreSQL 18.3/PGlite apply and semantic acceptance passed Super-only
  appointment/revocation, active-class enforcement, exact-class Member CRUD,
  cross-class denial, unappointed-Admin denial, Super global access, direct-write
  denial, draft RLS isolation, two-row appointment/revocation audit, immediate
  revocation, cleanup and function/table ACLs.
- The independent UI review found and closed the RPC field mismatch, stale selection
  race, unconditional navigation, legacy dashboard links and Admin-only wording.
- Focused migration 052 contract tests pass 5/5. The full local gate passes TypeScript
  and 274/274 Node tests, ESLint, the 50-route production build and `git diff --check`.
- The immutable local migration contract is exactly 006–052 with SHA-256
  `1bf1fc36b17d67ea91b049339efdcd695f15a733adf6ae68eae4356cecf49cd5`.

At this local milestone, migration 052 had **not** been applied to staging and the
verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above; production was not contacted.

## Finance late-payment presentation — historical local milestone verified (26/09/2026)

Migration 051 adds read-only settlement-detail wrappers that retain the existing
cash-received settlement eligibility, duplicate exclusion, share, currency and
lifecycle rules while exposing each charge's billing month and a display-only
late-payment flag. Admin payment confirmations and settlement details/exports now
show the charge month and mark payment in a later calendar month as `LATE PAYMENT`.
No accounting row, settlement amount or financial transaction rule is changed.

Verification:

- Disposable PostgreSQL/PGlite semantic acceptance proved a January charge paid in
  February is late, a February charge paid in February is on time, and the original
  payment/share/currency projections remain unchanged.
- Anonymous execution is denied; authenticated and service-role execution retain the
  intended guarded wrapper access.
- Focused migration 051 contract tests pass 4/4, and the full local release gate
  listed above includes the finance UI and SQL-security assertions.

At this local milestone, migration 051 had **not** been applied to staging. This was
superseded by the staging acceptance recorded above. No staging or production system
was contacted for the local milestone.

## Member directory privacy — historical local milestone verified (26/09/2026)

The third remaining frozen V1 feature is now implemented locally as migration 050.
The new Member Directory is available to Member, scoped Admin and Super Admin roles,
but every caller receives entries only for classes in which that caller has a current
active/Break membership. A same-class Member is visible across all dojos. Eligible
record-only profiles are not required to have an Auth row and may appear when their
profile and membership remain current.

The database RPC returns exactly six fields: class name, profile photo URL, name,
current official rank, home dojo and optional Instagram username. It does not return
email, phone, birth date, Member/Registration ID, membership status, attendance,
payments, notes or administrative data. Inactive/terminated memberships, deceased
profiles, disabled profiles and cross-class members are excluded at the database
boundary rather than fetched and hidden in the browser.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: caller-only
  class scope, cross-dojo visibility, current-rank formatting, record-only inclusion,
  cross-class/inactive/deceased exclusion, disabled-caller denial and RPC ACL checks.
- `npm test`: 265/265 passed, including four directory privacy/UI contract tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 48-route Next.js production build, including
  `/directory`.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–050 with SHA-256
  `86f0cbd215f7f06364284f0f28fe9209e052c2b26873e4fb98ba55f01b63640d`.

At this local milestone, migration 050 had **not** been applied to staging. This was
superseded by the staging acceptance recorded above. No staging or production system
was contacted or changed for the local milestone.

## Member contact self-service — historical local milestone verified (26/09/2026)

The second remaining frozen V1 feature is now implemented locally as migration 049.
Active Members can update only their own phone and optional Instagram username from
the existing profile page. Phone values are validated and normalized; Instagram is
stored in lowercase without a leading `@`, displayed with `@`, and omitted from the
read-only display when absent. No name, birth date, Member ID, Aikikai ID, role,
membership or other identity field became member-editable.

Email replacement uses an authenticated, same-origin, durable-rate-limited server
route and the Member's own Supabase Auth session. It checks the normalized profile
email index for duplicates, requests Supabase's verified email-change flow with the
exact `/auth/confirm` callback, and leaves the current profile email unchanged while
verification is pending. A fixed-path Auth trigger synchronizes the profile only
after `auth.users.email` actually changes, so Auth and profile remain consistent.

Migration 049 also adds a private, forced-RLS, append-only contact audit. Completed
phone and Instagram changes record the authenticated Member as actor; completed Auth
email replacements record the affected Member and explicit confirmation source.
Browser roles cannot read or write audit rows, cannot update `profiles` directly,
and receive only the caller-bound `update_my_contact_details` RPC.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: phone and
  Instagram normalization, two-field audit, invalid-value rejection, disabled-user
  denial, verified Auth email sync, duplicate-email rollback and browser ACL denial.
- `npm test`: 261/261 passed, including route behavior, same-origin denial,
  durable rate limiting, duplicate protection, audit/ACL and migration tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 47-route Next.js production build, including
  `/api/account/change-email` and the updated `/profile` page.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–049 with SHA-256
  `5e2c2661178f30dc12fb3094aac55928a9fc228c21e7ca671e54f0b180a14f4d`.

At this local milestone, migrations 048 and 049 had **not** been applied to staging
and the verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above. Supabase Auth provider behavior and real email delivery
for the email replacement flow remain guarded acceptance work. No staging or
production system was contacted or changed for the local milestone. The unrelated
uncommitted Windows uploader work remains preserved.

## Regular schedules — historical local milestone verified (26/09/2026)

The first remaining frozen V1 feature is now implemented locally as migration 048.
It adds one audited, database-driven weekly timetable source for Member browsing by
dojo or class and for scoped Admin/Super Admin maintenance. Each row records the
dojo/class offering, weekday, start/finish time, an optional existing active class
member as instructor, optional venue/room and notes, and active/inactive state.

The write boundary reuses `is_class_admin(class_id, dojo_id, user_id)`: scoped
Admins can create or update rows only inside their exact active dojo/class assignment,
while Super Admin can maintain all active offerings. Moving an existing schedule
requires authority over both its old and new scopes. Direct browser table access is
denied; member-safe reads and all maintenance use explicit SECURITY DEFINER RPCs
with fixed search paths, active-account checks, narrow fields and private append-only
audit rows. Deceased/disabled profiles are not offered or displayed as instructors.

The feature is information-only. Migration 048 contains no event, attendance,
announcement, notification, email, vote or teaching-hours writes. Member navigation
now includes **Schedules**; Admin navigation and the Admin dashboard include
**Manage Schedules**. The responsive pages support active timetable browsing grouped
by dojo or class, plus create/edit/deactivate/reactivate management.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: scoped create
  and update, out-of-scope denial, Member read-only access, inactive-row visibility,
  active-class instructor choices, audit creation and direct-table ACL denial.
- `npm test`: 252/252 passed, including migration 048 security and schedule UI tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 46-route Next.js production build, including
  `/schedules` and `/admin/schedules`.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–048 with SHA-256
  `f0c76d21763b5c014896d5646640c87478e6371a4129067e59dc7641e8daf135`.

At this local milestone, migration 048 had **not** been applied to staging and the
verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above. No production database/project was contacted or changed
for the local milestone. The existing uncommitted Windows uploader work was
preserved and was not advanced because the V1 scope freeze keeps it post-launch.

## JS Video Uploader — Stage B verified (25/09/2026)

The user approved continuation after Stage A. Desktop v0.2.0 now signs in using
existing JS Supabase email/password authentication, shows the verified name/role
and active classes the account can manage, rejects ordinary members, and signs out.
The preview is explicitly bound to staging project `eomubndonbetszdbhsrj`.

Authentication and all Supabase calls stay in Electron's main process. Sessions
are memory-only; passwords/tokens are not persisted or returned to the renderer.
Explicit sign-out uses local session scope. Authorization checks `getUser`, profile
state, `is_active_app_user`, `is_super_admin` and `can_manage_class` with the user's
token. It denies inactive/deceased/password-change-required accounts. Permission
checks repeat every minute and on focus and fail closed. Future write operations
must independently enforce current permissions through existing database RPCs.
No auto-refresh/remember-me: an expired session requires sign-in again.

The sandboxed renderer remains unable to make network requests. Each of the four
preload operations checks the exact main-frame sender. Only the staging public
URL/key are packaged. Build validation rejects secret/service-role keys and other
project URLs. Video selection, FFmpeg, Google OAuth and uploads are not implemented.

Verification:

- Desktop TypeScript/build and 17/17 security/auth tests pass, including revoked
  access, denied account states, database failure and a late login after sign-out.
- Live read-only staging acceptance: Member denied, Admin limited to Aikido,
  Super Admin receives all five classes; refresh and local sign-out pass.
- Development and packaged Electron UI tests pass: member denial, Aikido-only
  Admin display, password field clearing, sign-out, renderer isolation/network
  blocking and layout at default/minimum sizes. An initial development UI attempt
  timed out; the diagnostic rerun and packaged run passed without code changes
  to authentication. Screenshot reviewed.
- Package inspection confirms no protected credentials, environment files or
  test fixtures. Dependency install audit reported zero vulnerabilities.
- Windows x64 NSIS installer: 112,870,299 bytes, Authenticode NotSigned.
- SHA-256: `B5222308127000AC9DE63440F826F93EC442CFBB4524F0D99D3AB32A32F12FAE`.
- Packaged executable tested; complete install/uninstall and a second physical
  device are not tested. Root web code/build configuration was not changed in B;
  prior Stage A root verification remains 245/245 tests plus typecheck/lint/build.

Changed files in B: desktop `package.json`/lockfile, `src/auth.ts`, `src/config.ts`,
`src/contracts.ts`, `src/main.ts`, `src/preload.ts`, renderer TSX/CSS,
`scripts/build.mjs`, `build-staging.mjs`, `staging-acceptance.mjs`, `smoke.mjs`,
`verify-package.mjs`, `tests/auth.test.mjs`, `tests/load-auth.mjs`, desktop README,
and this checkpoint. No migration, database data change, deployment or production
call. Only staging auth sessions and read-only permission queries were used.

Stage B ends here. Next stage is C: database-driven video form.

## JS Video Uploader — Stage A verified (historical, 25/09/2026)

The user approved the inspection report and Stage A only. The Windows desktop
shell now lives in `desktop/js-video-uploader/` inside this repository, with its
own package/lockfile, React/TypeScript renderer, Electron main/preload processes,
build script, security tests, launch smoke test and Windows x64 NSIS configuration.
It is a clearly labelled preview: sign-in is disabled and no processing or upload
functions exist yet. Authentication is the next stage and has not been started.

The desktop renderer uses sandboxing, context isolation and no Node integration.
The only IPC method returns application version/stage information and verifies
the exact main-frame sender. Navigation, popups, webviews, network requests and
permission requests are blocked. No Supabase service key or Google credentials are
bundled. Root TypeScript/ESLint and Vercel inputs exclude the desktop directory;
the web package dependencies and lockfile were not changed.

The earlier uncommitted cloud-upload proposal was withdrawn by reverse-applying
its verified patch, including its Storage upload UI/API, worker, proposed migration
048 and related test changes. The migration chain remains 006–047. No applied
migration or database object was removed or changed. The earlier unrelated
`classes.active` fix was part of that withdrawn patch; a future repository-form
stage should use the verified `classes.is_active` column.

Verification:

- Desktop TypeScript/build and 2/2 security unit tests pass.
- Electron development and packaged Windows launch tests pass: rendered title,
  preload bridge, disabled sign-in, no renderer Node access, blocked network,
  and no horizontal overflow at default and minimum window sizes.
- Preview screenshot visually reviewed.
- NSIS installer built: `JS-Video-Uploader-Setup.exe` (112,083,689 bytes).
- SHA-256: `49EF5E9478FAC361C5995B4CA6F96981980468FA420800BB3A3064D985502073`.
- Installer Authenticode status is NotSigned; default Electron installer icon is
  still used. Packaged executable launch was tested; a complete install/uninstall
  cycle has not been tested. Do not present this artifact as a signed release.
- Packaged application inventory contains no environment files, Supabase
  configuration or cloud worker. Desktop production dependency audit: zero findings.
- Root TypeScript, ESLint and 245/245 existing tests pass. The isolated web
  production build passes with dummy public Supabase configuration.

Changed files: `.gitignore`, `.vercelignore`, `tsconfig.json`,
`eslint.config.mjs`, this checkpoint, and the new `desktop/js-video-uploader/`
package (source, configuration, lockfile, README and tests). Generated dependencies,
build output, installer and screenshots are ignored by Git. Deliverables are also
copied to this task's outputs folder.

No database migration, production data change, deployment, source publication or
live provider call was performed for Stage A. FFmpeg bundling belongs to Stage D.
Stop here; obtain approval for Stage B before implementing JS login/authorization.

## Source and database state

- The release candidate implementation on `release/v1-readiness-20260918` is commit
  `3a118f7`; later commits contain release evidence and recovery metadata only.
- Migrations 048 through 054 were applied only to staging
  `eomubndonbetszdbhsrj`. The verified staging migration ledger is now exactly
  006–054. Migration 054 passed rollback-contained full/partial/duplicate-payment
  acceptance, independent zero-residue/security postflight and Supabase database lint.
- Migrations 040 through 054 were applied in order to staging
  `eomubndonbetszdbhsrj` only. The repository's local Supabase metadata remains
  linked to production, so it was not used or changed.
- The staging database password was rotated, stored only in the protected staging
  environment and successfully used for an explicit staging connection.
- Migration 044, optional Aikikai-number capture plus automatic JS Member ID
  assignment on initial approval, is persisted and accepted on staging. It has not
  been applied to production.
- Migration 043 repaired the two runtime catalog mismatches found by live acceptance:
  unsupported `min(uuid)` in memorial publishing and the prepared-assessment lookup
  of `profiles.member_id` instead of `profiles.registration_number`.
- Vercel Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP` is Ready through its
  release-branch Preview alias and was built from release commit `3a118f7`. The fixed
  alias `https://jingwuguanseibukan-staging.vercel.app` now points to that exact Ready
  deployment. The earlier project-scoped-token API attempt failed safely and was
  superseded by the verified CLI reassignment. The Preview uses the 13 approved
  staging-only variables. Only
  the exact fixed alias is a Deployment Protection exception; generated Preview URLs
  remain protected. The unused `Staging Release` deploy hook was removed and a
  follow-up listing returned no project deploy hooks. The four temporary Codex Vercel
  token used for the final alias operation was deleted and its local temporary copy
  was removed. Three earlier staging-preview token records are expired and no longer
  authorize access, but remain visible in Vercel history because the dashboard did
  not complete their deletion. Production was not contacted or modified.

## Actual feature inventory

| Feature | Existing implementation | Missing or unverified work | Relevant files / database objects |
| --- | --- | --- | --- |
| Member management and statuses | Existing member, membership, class/dojo, approval, Break, transfer, grading and retained-history flows. Migration 047's active/disabled/deceased request gate passed rollback-contained staging acceptance. | Physical Safari/iOS and remaining mutation workflows still require guarded coverage. | `app/admin/members/page.tsx`; `profiles`; `memberships`; `admin_visible_members`; migration 047 |
| Aikikai and JS Member IDs | Registration accepts the applicant's optional Aikikai Registration Number and stores it separately. Persisted migration 044 assigns the next permanent numeric JS Member ID atomically only when a Super Admin approves the initial application. Supplied/blank Aikikai values, ID assignment, rejection, legacy preservation, role denial, queue atomicity and zero residue passed live staging acceptance. | Exercise both blank and supplied Aikikai registration paths through the deployed browser workflow. | migration 044; `profiles.aikikai_registration_number`; `profiles.registration_number`; `js_member_id_seq`; both `review_class_request*` RPCs; registration and Applications pages |
| Last training session | Migrations 045–046 are persisted on staging. The implementation stores the latest date per class membership, appends the effective Jakarta date to a private audit, enforces scoped Admin/Super Admin writes and exposes Member-own reads. Rollback-contained live tests passed mark-today, correction/audit, idempotency, Member denial, Admin scope, Super Admin scope, inactive/pre-join/deceased rejection and ACL checks. The real Admin and Member interfaces now pass isolated mark-today, correction, rejection/retry, recent/older-date display and unavailable-state workflows across Chromium/WebKit desktop, tablet and mobile. The browser gate also repaired a processing lock that previously remained set after training mutations. | Complete the deliberate deployed mutation workflow on a disposable membership and physical Safari/iOS. | migrations 045–046; `class_memberships.last_training_session_date`; `membership_training_session_audit`; `mark_membership_trained_today`; `set_membership_last_training_session`; `get_my_last_training_sessions`; Admin member page; Member profile; `tests/browser/last-training-session.spec.ts` |
| Ordinary birthday announcements | Date of birth is retained. No ordinary birthday announcement scheduler was found in source or retained evidence. | If added later, it must exclude `date_of_passing is not null`; do not claim that migration 040 replaces an existing birthday job. | `profiles.date_of_birth` |
| Announcements and notifications | Existing published text announcements, class scoping, in-app notification creation and durable email outbox integration are present. The staging queue-health probe currently passes with no queued, due, overdue, stuck, exhausted or duplicate rows. | Announcement comments and image attachments were not found. External email-worker scheduling, sender-domain ownership and real delivery remain operational gates. The push delivery route is per-recipient and is not a scheduler worker. | `announcements`; `notifications`; `email_outbox`; `/api/system/email-worker`; `/api/push/send`; migration 034; migration 040 recipient extensions |
| Events | Existing create/delete/list/export paths and bounded queued event-email notifications are present. | Event voting, voting deadlines and vote correction were not found. | `app/admin/events`; `events`; event notification functions |
| Deceased member and memorials | Migrations 040 and 043 are on staging. The persisted state transition, initial memorial, annual Remembrance Day and Heavenly Birthday, class recipients, idempotency and Member/Admin denials passed rollback-contained acceptance. The real memorial panel now passes mark/save/publish/reversal and accessibility workflows across Chromium/WebKit desktop, tablet and mobile. | Live Auth ban/unban and real scheduled delivery still require dedicated disposable accounts/provider execution. | migrations 040 and 043; deceased UI/API; memorial tables and RPCs; `tests/browser/admin-memorial.spec.ts` |
| Bulk assessment and promotion | Migrations 041–043 are on staging. A persisted three-person rollback suite prepared all certificates as Pending, submitted two Pass and one Fail atomically, promoted only passes, created the results announcement and rolled everything back. The real page now also passes an isolated Chromium/WebKit desktop, tablet and mobile workflow for preparation, Pending status, mixed results and one atomic submission. | A password-authenticated deployed staging mutation remains deliberately unperformed because it would create immutable grading/audit history; use dedicated disposable records if this final live proof is required. | migrations 041–043; `app/admin/assessments/page.tsx`; private assessment tables and guarded RPCs; `tests/browser/admin-assessments.spec.ts` |
| Certificate barcode verification | Pending QR payloads and final Issued/Void database statuses passed persisted service-role verification; browser roles were denied direct verification/table access. The real server-rendered public page now passes Issued, Pending, Void and unknown-record browser checks across Chromium/WebKit desktop, tablet and mobile with no download exposure. | Physical Safari/iOS remains open. A deployed valid-record scan would require deliberately creating disposable immutable certificate history; deployed random/unknown verification already passes. | `verify_prepared_assessment_certificate(uuid)`; public verification page; certificate PDF components; `tests/browser/certificate-verification.spec.ts` |
| Regular schedules | Migration 048 is persisted and passed rollback-contained scoped-write, Member-read, audit and ACL acceptance. The current schedule routes load in the deployed release matrix. | Guarded authenticated schedule mutations and physical Safari/iOS remain open. | migration 048; `/schedules`; `/admin/schedules`; schedule RPCs and private audit |
| Member contact self-service | Migration 049 is persisted and passed rollback-contained normalization, audit, disabled-user, duplicate-email and ACL acceptance. The real profile contact and email-change workflows pass 12/12 isolated Chromium/WebKit desktop, tablet and mobile executions, including failure recovery. | Guarded real Auth email-confirmation/provider delivery and physical Safari/iOS remain open. | migration 049; `/profile`; `/api/account/change-email`; `update_my_contact_details`; `tests/browser/profile-contact.spec.ts` |
| Member directory privacy | Migration 050 is persisted and passed caller-class isolation, record-only inclusion, excluded-account and ACL acceptance. Scoped Admin membership visibility passes in the deployed role matrix. | Guarded directory-related mutations are not applicable; physical Safari/iOS remains open. | migration 050; `/directory`; Member-directory RPC |
| Finance and full-payment-only workflow | Migrations 051 and 054 are persisted on staging. Migration 054 passed rollback-contained partial/full/duplicate-payment semantics, exact 006–054 ledger, zero residue, enabled-trigger, fixed-search-path, helper-ACL, database-lint and 12-check role-security verification. Network-disabled real-page browser coverage verifies fixed full Admin payment, payment-confirmation approval/rejection, settlement late/on-time details, real Excel detail export, Super Admin approval/rejection, preserved retry input and success feedback, accessibility and responsive Chromium/WebKit behavior. The deployed read-only WebKit matrix also loads scoped Admin payments and Super Admin settlements without mutation. Release commit `3a118f7` is Ready on the fixed staging alias and passed all five CI checks plus 114/114 local WebKit checks. | A deliberate disposable-record end-to-end payment mutation, positive deployed settlement-detail example and physical Safari/iOS coverage remain open. | migrations 051 and 054; Admin/Member subscriptions and Admin payments/settlements; `tests/browser/finance-workflows.spec.ts`; `tests/sql/054_staging_acceptance.sql`; `tests/sql/054_staging_postflight.sql`; settlement-detail wrappers |
| Repository Uploader appointments | Migration 052 is persisted and passed Super-only appointment, exact-class CRUD, revocation/audit, RLS and ACL acceptance. The current uploader controls are present in the deployed release. | Guarded appointment and scoped CRUD browser mutations plus physical Safari/iOS remain open. | migration 052; `/repository/upload`; `/admin/repository-uploaders`; uploader RPCs and audit |

## Memorial design in the local candidate

Migration 040 adds `profiles.date_of_passing` without rewriting membership state or
deleting identity/history. Memorial configuration, recipients, publication ledger and
audit records are private tables behind guarded routines. Announcement visibility for
multi-class recipients uses a fixed-search-path helper rather than an RLS-hidden
`NOT EXISTS` fallback. Active-account request enforcement protects already-issued
PostgREST JWTs, while the server API coordinates future-sign-in ban/unban through the
Supabase Auth Admin boundary.

The initial memorial is an explicit Super Admin publication. Annual generation is
service-role-only, idempotent, uses Jakarta business dates, and defines 29 February
anniversaries as 28 February in non-leap years. The protected email-worker invocation
reports memorial processor failure separately instead of disguising it as successful.

## Bulk-assessment design in the local candidate

Migration 041 validates every submitted decision before applying any effect, takes a
transaction-scoped idempotency lock, locks membership rows deterministically, and
pins the expected target rank/level to reject a stale roster. Existing assessor rules
still apply. Pass rows delegate to the established promotion routine; Fail rows only
create immutable assessment evidence and do not alter grade, level or membership.

One published class announcement is created only if the batch has passes. Migration
042 reserves certificate records and numbers before assessment day for certificate-
eligible candidates and renders them into one multi-page PDF while their database
status is Pending. A single complete-roster finalization issues Pass certificates and
voids Fail certificates in the same transaction. Printing or retrying the PDF does
not submit results. The PDF carries a QR barcode with the requested certificate facts
and a database-verification URL. The scan endpoint uses a service-role-only routine;
browser roles cannot query the private preparation tables or verification routine.

For a selected dojo, the announcement remains limited to that prepared dojo roster
and names it in the title. For an all-dojo batch, lines are grouped by dojo. Each dojo
group is ordered by destination rank and sub-rank from highest to lowest, with member
name as a deterministic tie-breaker.

## Verification completed locally

- Migration 045/046 focused source/security suites, the migration-047 repair and the
  migration 048–052 contract suites pass. The current full local gate passes
  TypeScript plus 274/274 Node tests, ESLint, the 50-route production build and
  `git diff --check`.
- Migrations 048–052 are persisted on staging. Their combined rollback-contained
  acceptance reached its deliberate success marker; independent postflight proved
  zero fixture residue, exact ledger 006–052, an empty dry run and database lint with
  no errors. The authenticated role-security suite passes 12/12.
- Migration 053 is persisted on staging. Its separate rollback-contained
  idempotency/role/audit acceptance and independent zero-residue/ACL postflight pass;
  the staging ledger is exactly 006–053, database lint has no errors and the same
  role-security suite remains 12/12.
- The migration-045 review preserves the existing `admin_visible_members` column
  order and appends its two new fields, preventing an unsafe/incompatible view
  replacement. Migration 045 is now persisted on staging; production was not
  contacted.
- The migration-046 staging dry run is non-mutating and lists exactly
  `046_repair_last_training_audit_insert.sql`, with no seeds or roles.
- Persisted migration 046 passed the rollback-contained last-training semantic,
  audit, idempotency, role-boundary and ACL suite. Independent snapshots proved zero
  residue, database lint reports no errors, the ledger is exactly 006–046, the
  post-apply dry run is up to date and the authenticated role suite passes 12/12.
- Deployment-readiness review found and closed one fail-closed configuration gap:
  `DURABLE_RATE_LIMIT_SECRET` is now required by the offline provider validator,
  covered by regression tests and present as a distinct generated value only in the
  protected staging environment. The offline staging provider check passes without
  exposing values. The existing `js1-ccd7/jingwuguanseibukan` project is linked
  locally and the reviewed 13-variable runtime allowlist was uploaded only to the
  release branch's Preview scope. Database URLs/passwords, backup paths,
  `SECURITY_TEST_*` and legacy duplicate key aliases were excluded. The resulting
  Preview build is Ready on the fixed staging alias. Current-Preview host acceptance
  passes 11/11 and guarded read-only WebKit acceptance passes 18/18; no Production
  environment value or deployment was changed.
- GitHub Actions runs `36096335398` and `36096832757` passed checks plus
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS for the migration-047
  candidate and its evidence-only checkpoint.
- Migration 047 passed isolated apply, exact-ledger, up-to-date dry-run, database
  lint, anonymous catalog, helper-denial, sensitive-relation-denial, service-role,
  rollback-contained active/disabled/deceased semantics, 12/12 role-security and
  independent zero-residue checks on staging.
- The strict SQL verifier previously stopped on hosted `supabase_admin` defaults.
  The 27 September ownership audit and narrow managed-platform exception above close
  that blocker while retaining hard failures for application-owned defaults and
  any actual managed-role public object.
- The exact staging alias is publicly reachable through the approved single-domain
  Vercel exception and resolves to Ready deployment
  `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP`. All 11 host probes pass against that current
  Preview, including public pages, assets, method guards and security headers.
  Generated Preview URLs remain protected.
- Supabase staging now has the exact staging Site URL and `/auth/confirm` redirect,
  email/password login, confirmation, a ten-character mixed-case-and-digit policy,
  custom Resend SMTP and the reviewed token-hash confirmation template.
- Guarded deployed browser checks against the current Preview pass 18/18 in WebKit
  across desktop, tablet and mobile. They cover public registration catalog loading,
  generic invalid-confirmation handling, Member login and Admin denial, scoped Admin
  login and Aikido-only member visibility, Super Admin Applications/Assessments access
  and unknown-certificate handling. Test sessions were signed out and no member
  record was changed.

- `npm test`: passed TypeScript plus 223/223 Node tests after adding migration 044,
  optional Aikikai and automatic JS Member ID coverage, Super-Admin-only
  approval/assessment routing and
  provider-origin binding.
- `npm run lint`: passed with no reported warnings or errors.
- `npm run build`: passed the direct 44-route optimized Next.js production build,
  including the assessment and dynamic certificate-verification routes. After the
  later contrast fix, a fresh physical isolated copy passed the same 44-route build
  and was removed; the source `.next/trace-build` remained locked by browser tooling.
- `git diff --check`: passed; only informational future CRLF notices were printed.
- Static migration, API, UI, navigation, worker, certificate, barcode-verification,
  SQL-security and guarded security-account rotation regressions for 040–044 passed
  inside the 223-test suite.
- A fresh local PostgreSQL 17 fixture installed migration 044 and proved atomic
  JS-ID approval assignment, optional Aikikai value/NULL retention, review visibility,
  existing-ID preservation, rejection behavior, legacy-RPC delegation, `9999` to
  `10000` growth without truncation, scoped-Admin denial and private sequence ACLs.
  It was removed after the passing run; this is not a staging apply.
- Persisted staging migration 044 passed supplied/blank Aikikai, pre-approval JS-ID
  absence, automatic approval assignment, scoped-Admin denial, Super Admin approval,
  rejection, existing-ID preservation, routed-email/membership atomicity, sequence
  restoration, zero-residue, exact 006–044 ledger and private-sequence checks.
- The post-044 authenticated staging security suite passed all 12 Member, scoped
  Admin and Super Admin checks. Database lint reports no schema errors and the
  explicit-project dry run reports no pending migrations.
- The registration/browser assertions now exit cleanly: Chromium desktop passes
  23/23 and WebKit desktop/tablet/mobile passes 69/69. The restricted Windows runner
  denied Playwright's `taskkill` process-tree cleanup after otherwise passing runs;
  loopback-only test-server teardown now closes both servers before that fallback.
  A WebKit mobile native-select contrast failure found during the clean-exit rerun
  was corrected on both registration selectors. Firefox still cannot launch on this
  Windows host (`spawn UNKNOWN`).
- Provider configuration and 50/50 focused worker tests pass. A read-only staging
  probe reports queue-health `PASS`, with stuck, exhausted, overdue, queued, due and
  duplicate counts all zero. Invalid-secret probes against both the deployed email
  worker and push route returned the expected HTTP 401 without sending anything.
  Staging has neither `pg_cron` nor `pg_net`, so no database scheduler is installed.
  The protected Resend key's domain-inventory request returned HTTP 401; this is
  consistent with a restricted send-only key but does not verify sender-domain
  ownership or live delivery.
- Before migrations 048–052, a guarded read-only Playwright staging harness covered
  the public registration, invalid-confirmation, role-boundary and certificate-not-
  found paths in WebKit desktop, iPad Mini and iPhone 13 and passed 18/18. The interim
  login failures were a harness-only Next hydration race; the
  harness now waits for network idle and verifies controlled input values before
  submitting. Its allowlist adds exactly two legitimate read-only Member-profile
  RPCs, and redundant sign-out was removed because every test has an isolated browser
  context. This is automated WebKit evidence; physical Safari/iOS and guarded
  mutation workflows remain open.
- Release deployment `dpl_DocKgDVEB2EjtMt6i2sh4owYdhVj` serves commit `bda9bf9`
  through the fixed staging alias. The current guarded read-only WebKit matrix passes
  18/18 across desktop, iPad Mini and iPhone 13. The configuration uses one worker
  because its three device projects intentionally share the same protected Member,
  Admin and Super Admin accounts; this prevents concurrent logins from invalidating
  one another's sessions. No member record was changed.
- Recovery tooling now passes 14/14 focused tests. Manifest v2 binds a rehearsal to
  exact staging, the immutable repository 006–054 fingerprint, matching sanitized
  source/restored ledger fingerprints and measured RPO/RTO timestamps; it also
  represents the absence of a production project without a fake reference. The
  retained restore itself still reaches only ledger 006–026 and excludes managed
  Auth/Storage and other platform resources, so it is not current recovery evidence.
  The live `email_outbox` table and its core queue/claim/acknowledgement RPCs also
  predate the checked-in migration chain: migrations 006–054 validate but do not
  recreate those baseline definitions, so they require explicit protected-backup and
  disposable-restore evidence.
- `npm audit --audit-level=high --omit=dev` reports zero vulnerabilities.
- A fresh local PostgreSQL 17 cluster installed migration 029 then 041 and passed the
  14-check semantic suite, including active/non-deceased assessor enforcement,
  pass-only mutation, idempotency, ACLs and owner-side private-table auditing. The
  temporary cluster was removed afterward.
- The combined rollback-contained staging suite passed with candidate migration 043
  applied only inside the transaction: memorial, assessment, certificate/QR and
  Member/Admin boundaries all passed. An independent connection confirmed zero
  residue and an exact 006–042 ledger.
- After migration 043 was applied, the same suite passed against the persisted
  functions without a temporary repair. Independent postflight confirmed zero
  residue, intended RPC ACLs and the exact 006–043 ledger.
- A second fresh local PostgreSQL 17 cluster installed migrations 029, 041 and 042;
  its rollback-contained prepared-certificate suite passed 9/9 and the temporary
  cluster was removed.

## Live verification still required

1. Exercise a real disposable registration plus confirmation delivery, optional
   Aikikai input and automatic JS Member ID approval using an authorized staging
   recipient. No dedicated deliverable test mailbox is currently configured.
2. Exercise deceased-member Supabase Auth ban/unban and the protected annual worker
   with dedicated disposable staging accounts; the isolated memorial UI workflow is
   now covered across Chromium and WebKit. Verify no live member data is mutated.
3. Complete the remaining authenticated mutation workflows in deployed staging;
   the regular-schedule browser mutation path is now covered locally across Chromium
   and WebKit, as is the complete bulk-assessment preparation/finalization path. The
   deployed Repository Draft create/edit/delete path now has guarded zero-residue
   WebKit evidence. Repeat the other relevant guarded WebKit coverage and run physical
   Safari/iOS.
4. Configure and monitor an external **email** worker scheduler, then verify real
   test-recipient delivery. Push remains an explicitly targeted per-user operation,
   not a scheduled queue worker; verify it separately with a dedicated test device.
5. Rehearse a complete 006–055 managed-platform restore into a disposable isolated
   target, including Auth, Storage, roles/grants and post-restore security evidence.

The three reusable staging dummy identities exist and their protected passwords were
rotated through password-only Auth Admin updates. The exact-account audit, 12/12 API
role suite and password-authenticated deployed Member/scoped Admin/Super Admin checks
pass. No profile, membership or live member record was changed. The offline provider
configuration check passes and now proves that the expected origin matches normalized
`NEXT_PUBLIC_SITE_URL`; it does not replace live delivery tests.

The targeted rotation command is audit-only by default, is hard-limited to staging,
requires the exact three existing member numbers and resolved roles, and sends only
password updates. Its remote audit and explicitly approved apply both passed. Staging
email/password login is now enabled and the protected dummy accounts authenticate;
the API role suite still uses short-lived sessions and confirms their cleanup.

The assessment page and navigation are now explicitly Super-Admin-only. Scoped
Admins no longer see the entry, and direct non-Super-Admin access is redirected.

Production was not contacted. No production connection, deployment or merge is
claimed by this checkpoint. Migration 053 was applied to staging only and its guarded
acceptance completed; production remains unchanged.

## Repository Draft mutation checkpoint — 28 September 2026

- The deployed fixed staging alias completed one guarded Super Admin Repository Draft
  lifecycle in WebKit: create as Draft, edit the same captured content UUID, and delete
  it through the application UI.
- The browser request gate allowed exactly one `create_repository_content`, one
  `update_repository_content` and one `delete_repository_content` call in that order.
  It rejected publishing, provider traffic, direct table writes, duplicate or
  out-of-order mutations, and any update/delete not bound to the captured UUID.
- The Supabase server credential remained in the parent cleanup process and was not
  passed to Playwright. The parent verified the exact staging project, Super Admin
  0001, fixture creator and fields, no video-pipeline row, an unchanged Repository
  Uploader assignment-audit count, and an empty reserved-marker inventory afterward.
- The guarded WebKit test passed 1/1. No Repository Uploader appointment, published
  content, provider, production endpoint or deferred Mux/uploader file was touched.
  Afterward, the fixed-host probes passed 11/11 and the isolated read-only WebKit
  regression matrix passed 18/18 across desktop, tablet and mobile. The standard
  read-only config now explicitly excludes mutation-only specs.

## Contact compare-and-swap candidate — 28 September 2026

- Migration 055 is prepared locally, not applied. It adds a backward-compatible,
  fixed-search-path `update_my_contact_details_if_unchanged` RPC that locks the
  authenticated active Member's profile and rejects stale edit baselines atomically
  with SQLSTATE `40001` before profile or audit writes.
- The Member profile UI now captures the exact phone and nullable Instagram values
  when editing starts, sends them with the proposed values, refreshes on a conflict
  while keeping the editor open, and reports a true no-op separately from a change.
- A guarded Member 0101 no-op browser harness and rollback-contained SQL acceptance
  are prepared. They have not run against staging because migration 055 requires
  explicit staging approval and must be applied before the UI is deployed.
- Security review stopped and removed the first disposable-registration harness. It
  could have queued applicant and administrator email to persistent outbox rows and
  did not prove complete cleanup across all dependent history. No registration or
  confirmation email was sent.
- Local verification passes: TypeScript plus 302/302 Node tests, repository-wide
  ESLint, the 51-route optimized production build, exact 006–055 recovery fingerprint,
  workflow YAML parsing and whitespace validation. The immutable GitHub Action pin
  refresh is prepared but uncommitted.
- Current remote staging remains on exact migrations 006–054. Production, providers,
  Vercel configuration and deferred Mux/uploader files were not contacted or changed.
- A subsequent read-only CLI guard found the checkout still linked to retired project
  `pkmllhaavadhaozmwapz`, not staging. `migration list --linked` listed only that
  retired ledger and performed no write, but it did contact the retired project. Its
  result is not staging evidence. No further linked command is permitted until the
  checkout is explicitly relinked and verified as staging `eomubndonbetszdbhsrj`.

## Contact compare-and-swap staging checkpoint — 28 September 2026

- The checkout is now linked to exact staging project `eomubndonbetszdbhsrj`.
  Migration 055 was the sole pending migration after the exact 006–054 preflight and
  was applied only to staging. Rollback-contained semantic acceptance, independent
  zero-residue/ACL/search-path postflight, exact 006–055 ledger verification,
  warning-level database lint and the repository security verifier all pass.
- Clean release commit `c639e0d` is deployed as Ready Preview
  `dpl_otHaqRmeREfKMAeT653D4CN7Tugd` behind only
  `jingwuguanseibukan-staging.vercel.app`. A first Preview inherited a retired backend
  setting, but the browser target guard blocked it before network I/O and the alias was
  immediately restored before the corrected deployment. Production and the retired
  backend received no guarded browser request.
- The Member 0101 contact CAS no-op passes 1/1 in Chromium and WebKit. The parent
  postflight independently proves the complete profile record and contact-audit
  history are unchanged; only expected Auth sign-in/session metadata is outside that
  guarantee. The authenticated Member/scoped Admin/Super Admin security suite passes
  12/12.
- The fixed host passes 11/11 current route/method/security-header probes. Live
  staging WebKit application acceptance passes 18/18 across desktop, tablet and
  mobile. The Windows Schannel/WebKit certificate path failed locally despite the
  same Vercel certificate being independently authorized by Node TLS; therefore the
  successful WebKit application runs used a temporary Playwright transport bypass.
  Both repository configs were restored to `ignoreHTTPSErrors: false`, so this is not
  recorded as a native Windows WebKit TLS pass.
- The isolated profile-contact browser fixture now models the four-argument CAS RPC
  and its `40001` conflict boundary. Local Chromium passes 38/38. Final GitHub Actions
  run `36411271185` at implementation/test commit `5dc869f` passes common checks,
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS. Deferred Mux/uploader
  work was not staged, committed, deployed or otherwise modified by this rollout.

## Pre-migration recovery baseline checkpoint — 29 September 2026

- A read-only staging catalog audit confirms that the checked-in 006–055 chain assumes
  an older base schema. `email_outbox`, its normalization trigger and its four queue
  worker RPCs exist and are hardened, but foundational definitions such as
  `normalize_email_outbox()` and `clean_text()` predate the repository migrations.
  Creating only an `email_outbox` migration would therefore give false restore
  confidence and was deliberately rejected.
- Recovery manifest version 3 now requires matching source/restored schema-catalog
  SHA-256 values and positive object counts, an explicit verified pre-migration
  baseline component, and a `preMigrationBaselineVerified` check in addition to the
  exact 006–055 migration-ledger proof.
- `scripts/recovery-catalog-fingerprint.mjs` fingerprints exactly 18 schema-only
  public/storage catalog exports without printing their definitions. It rejects
  missing, unexpected, malformed or empty JSON and normalizes cross-platform line
  endings, object keys and row order.
- The focused recovery contract passes 18/18 tests; targeted lint and TypeScript pass.
  The template remains intentionally not ready until a protected source backup is
  restored into a disposable isolated target and the two catalog fingerprints match.
  No application row, database object, production endpoint, provider or deferred Mux
  file was changed.

## Guarded regular-schedule staging checkpoint — 29 September 2026

- A dedicated WebKit harness completed one Admin 0002 schedule create and one
  captured-UUID edit/deactivation through the fixed staging application. It passed
  1/1 in 13.2 seconds and is not part of the read-only staging matrix.
- The browser gate allows only the exact collision-checked dojo/day/time, null
  instructor, reserved marker fields and create-then-update state transition. The
  browser receives neither the server key nor the database-owner URL.
- Parent cleanup accepts only the exact created fixture with one audit row or the
  exact updated fixture with two audit rows. It locks the captured UUID, deletes only
  those audit rows and that schedule inside one transaction, and then requires zero
  reserved-marker residue. Any ambiguity or field drift stops cleanup for manual
  review. No test-only cleanup RPC was added to the application schema.
- Parent postflight verified the exact inactive fixture and two audit rows, then
  removed only those rows transactionally and confirmed an empty reserved-marker
  inventory. Expected Auth sign-in/session metadata is outside this zero-residue
  guarantee.
- Local request-guard tests pass 3/3; targeted ESLint, TypeScript and whitespace
  validation pass. GitHub run `36473581644` at recovery-gate head `b0e8bcb` passes
  checks plus Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS.
  Production, the retired Supabase project and deferred Mux/uploader files were not
  contacted or changed.

## Guarded last-training staging checkpoint — 29 September 2026

- A dedicated WebKit harness completed scoped Admin 0002 correcting and then
  mark trained today on the exact active Member 0101 membership visible in the
  deployed staging member-management page. The corrected run passed 1/1 in 10.8
  seconds.
- The browser allows only the captured membership's exact correction-date RPC
  followed by its mark-today RPC. Different identities, targets, dates, order,
  origins, direct-table writes and provider requests are denied before network I/O.
- The parent snapshots the complete membership and audit baselines. Cleanup accepts
  only the exact newly appended audit transition(s), deletes those captured UUIDs,
  restores the original date, and requires every business membership field plus the
  full audit baseline to match. The trigger-managed `updated_at` timestamp is an
  explicit metadata exception. Credentials remain outside Playwright and no
  test-only database function is added.
- The first attempt completed both approved writes but failed a button-text locator;
  postflight then refused its overly strict full-row comparison because the existing
  membership trigger advanced `updated_at`. A staging-only forensic read identified
  the exact two audit UUIDs and transitions. Cleanup removed only those rows and
  restored the original null date before the corrected rerun.
- Parent and independent final checks confirm the original null date, exact business
  fields and zero training-audit rows. Only trigger-managed `updated_at` and expected
  Auth metadata are excluded. Local guard tests pass 3/3; syntax, targeted ESLint,
  TypeScript and whitespace validation pass.

## Protected staging recovery-source checkpoint — 29 September 2026

- The exact staging project guard accepted only `eomubndonbetszdbhsrj`. A free-plan
  disposable-project creation was attempted only after explicit approval, but the
  Supabase control plane rejected it because the account already has two active free
  projects. No project, payment, upgrade or existing-project change occurred.
- A protected staging logical backup now captures the application database, Auth and
  Storage metadata plus global role definitions with role passwords excluded. The
  database package is encrypted with AES-256-CBC/PBKDF2 (600,000 iterations), passed
  a decrypt-and-list verification and has SHA-256
  `5c3ebb6079fbc8f1e0c8544bb78fca4b9e1b418c3020283dab6d40cb5d3d1ef2`.
  Its temporary plaintext dump, globals file and tar archive were removed after
  verification; the protected encryption key is outside Git.
- The source migration ledger is exactly 006–055 (50 migrations) with digest
  `e76ad2f14c8a7723d335d6b57a7517cad01fa969358ca415355fd1b7bbc94ce4`.
  The 18-file schema catalog contains 4,146 objects and has digest
  `91dddeeadfb43b1d710dfa5574cb9d860a588ffbd103015aae01ffab27be2bd7`.
- Source inventory records 57 Auth users, 57 identities, two Storage buckets and one
  1,580,749-byte Storage object. That object was downloaded from staging, size- and
  SHA-256-verified, encrypted separately and passed decrypt-and-list verification;
  its encrypted archive digest is
  `ba7eecbd60e12ec9af6c25d7f6d99eefdd08506226df1066809a6299682b65f7`.
  Temporary plaintext object bytes were removed. No `cron` schema/job table exists
  in the staging database, so any worker schedule remains an external-platform item.
- Recovery source evidence is under the access-restricted
  `C:\protected\jingwuguan-recovery-source-20260929` directory and is not tracked by
  Git. The source side is complete, but no restore is claimed: a disposable Supabase
  target remains unavailable until a free project slot is released or a paid project
  is separately authorized. PostgreSQL 17 local-cluster tools are present and can
  provide interim database/ledger/catalog/RLS proof if that narrower target is
  approved; it cannot prove managed Auth, Storage API or platform configuration.
- Production, the retired project, providers and deferred Mux/uploader files were not
  contacted or changed.

## Local PostgreSQL recovery rehearsal — 30 September 2026

- The protected staging database package was decrypted only into the restricted local
  recovery workspace and restored into a disposable PostgreSQL 17.11 cluster bound to
  `127.0.0.1:59827`. The cluster used a separate bootstrap owner so the restored
  `postgres` role could retain its captured non-superuser attributes. All 16 captured
  Supabase roles and 22 captured role memberships were restored; the local bootstrap
  role has no direct memberships.
- The custom-format restore completed with exactly eight expected errors and no
  unexpected errors. Every error is caused by the managed `supabase_vault` 0.3.1
  extension being unavailable in standalone PostgreSQL. The restored counts are 67
  public tables, 57 Auth users, 57 identities, two Storage buckets, one Storage object
  metadata row and 50 migrations.
- The restored 006–055 ledger is semantically exact. Canonical comparison matches 17
  of 18 catalog files and 4,145 of 4,146 catalog objects; the only missing object is
  the managed `supabase_vault` extension. Explicit owner ACLs on two sequences and one
  rate-limit table were normalized to the captured source before the final comparison.
- `scripts/verify-database-security.sql` passes in a read-only transaction. Independent
  checks confirm 75 RLS relations, 11 forced-RLS relations, 69 policies, expected denial
  for both `anon` and `authenticated` on a sensitive view, no subscriptions, replication
  slots, foreign servers or cron schema, and loopback-only networking.
- Supabase CLI 2.118.0 reached the local database for linting but could not enable
  `plpgsql_check`, which is not installed in this standalone distribution. Therefore a
  new local CLI-lint success is not claimed; the repository security verifier and exact
  catalog comparison are the applicable local evidence.
- The cluster was fast-stopped and quarantined. Its PID file, listener and PostgreSQL
  processes are absent. Sanitized evidence is retained under the restricted local
  recovery workspace, while the protected encrypted source evidence remains unchanged.
  A managed Supabase restore is still required to prove Auth API, Storage object/API,
  managed extensions and platform configuration end to end.
- Production, the retired project, remote staging, providers and deferred Mux/uploader
  files were not contacted or changed during this local rehearsal.

## Normalized organization, class and dojo logos — 30 September 2026

- Ten user-supplied JPEG logos were converted from their original pixels into square
  1024 × 1024 PNG assets. Each image is centered and aspect-fit on white without
  cropping or stretching, giving video watermarks, certificates and responsive UI a
  consistent rendering contract.
- The assets are organized under `public/logos`: one organization logo, five class
  logos (Taiji/Taijiquan, Karate, Xingyi/Xingyiquan, Aikido and Kungfu Kids), and four
  dojo/affiliate logos (Chushin & Zhongxin, Kagami, UAC and Hayashitane). The app,
  service worker, certificate routes, video watermark overlay and desktop uploader now
  reference `/logos/organization/logo-js.png`; the old JPEG remains only as an
  unreferenced compatibility asset.
- Staging `eomubndonbetszdbhsrj` received exactly the five active class PNGs at
  `class-logos/{class-id}/logo.png`. Their five `classes.logo_url` values now point to
  that staging project. This repairs Aikido's retired-project URL and supplies the
  previously missing Kungfu Kids logo. Read-only postflight downloaded all five
  objects and confirmed exact byte matches, PNG signatures and 1024 × 1024 dimensions.
- Existing target objects and database URLs were captured before mutation under the
  protected local logo-upload evidence directory. The current schema has no dojo-logo
  column or workflow, so the four dojo logos remain versioned static assets rather
  than being written into an unrelated field.
- Verified: ESLint passes, TypeScript passes, application tests pass 312/312, desktop
  uploader tests pass 21/21, whitespace/stale-reference checks pass, and the 51-route
  production build succeeds. No deployment was performed and production was not
  contacted.

## Isolated browser callback-origin repair — 30 September 2026

- GitHub Actions run `36675538878` passed common checks and failed Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS in their browser steps. Public logs do
  not expose the individual assertion, but the retained artifacts and identical job
  boundary show a shared harness failure rather than a Firefox-only release defect.
- Source inspection found that the isolated browser environment removed inherited
  external target URLs without assigning `NEXT_PUBLIC_SITE_URL`. The canonical
  callback-origin boundary therefore failed closed during the valid registration
  submission exercised by every browser project.
- The fixture now binds `NEXT_PUBLIC_SITE_URL` to its fixed loopback `APP_ORIGIN`, and
  direct browser runs reject any replacement. Regression tests prove inherited
  external origins are discarded. The focused suite passes 7/7.
- A clean archive of exact commit `41b1deb` with only the two-file harness correction
  completed the production browser build and passed Chromium desktop 38/38. This
  Windows host cannot launch Playwright Firefox; replacement GitHub Actions run
  `36677366204` at exact commit `9eb570a` passes common checks, Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS.
- No live target was contacted. Production, staging, the historical project, providers
  and deferred Mux/uploader work remain unchanged.

## Worker monitoring, push logging and password-reset hardening — 30 September 2026

- Parallel audits found that malformed queue-health counters were silently converted
  to zero. The email worker now requires every migration-033 counter, the nullable
  oldest-ready age and a valid monitoring timestamp. Invalid queue data follows the
  existing sanitized HTTP 500 path; malformed memorial results make the worker
  unhealthy instead of reporting zero created announcements.
- Push delivery no longer logs raw provider or database errors. Only a generic category
  and bounded numeric provider status are retained, protecting subscription endpoint
  tokens and provider response contents. The service worker awaits client navigation
  before focus for reliable Safari-compatible notification clicks.
- A new six-test stateful suite exercises the privileged Admin password-reset apply
  route: caller/scope denial, strong temporary-password secrecy, queue payload and
  dedupe contract, existing-email idempotency, lost-response recovery and mark-failure
  retry. No generated password is returned or logged.
- Focused worker/push coverage passes 27/27; password-reset coverage passes 6/6. All
  tests are hermetic and use fictional data.
- External scheduler ownership/cadence/dead-man alerts, real Resend and dedicated-inbox
  evidence, push endpoint policy/PWA shipping and physical Safari/iOS remain open. No
  live target was contacted; deferred Mux/uploader work remains untouched.

## Push recipient lifecycle enforcement — 30 September 2026

- The service-role push route now verifies the target with a narrow server-only profile
  query requiring active status and no Date of Passing before subscription access or
  provider delivery. Disabled and deceased accounts cannot receive push through stale
  active subscription rows.
- Eligibility lookup errors fail closed and expose no database detail. Focused push and
  service-worker tests pass 12/12. No schema change was introduced and no live system
  was contacted.

## Mux uploader checkpoint — 27 September 2026

- Local release work now uses Mux Direct Uploads for all new JS Video Uploader videos.
  Existing YouTube content remains readable as legacy content; it was not migrated or
  deleted.
- The desktop preserves the two baked-in JS/class logo watermarks, contains no Mux
  secret, uploads directly to Mux with a one-time URL, and creates only a Draft after
  server-side provider/owner verification.
- Member playback is protected by repository RLS plus a server-issued RS256 Mux token.
  Mux Data tracking/cookies are disabled and no viewer name, member number or email is
  included in the token or player metadata.
- The Mux migration and its rollback-contained acceptance/postflight SQL are preserved
  under deferred paths. They have no active migration number and have **not** been
  applied to staging or production.
- Verified locally: Super App 288/288 tests, desktop uploader 21/21 tests, lint, exact
  006–054 recovery fingerprint, whitespace validation, and the 51-route production
  build all pass; both production-dependency audits report zero vulnerabilities.
- Still required before a usable Mux staging installer: create/configure the Mux API
  token and URL-signing key in protected staging/Vercel settings; assign and approve the
  next available Mux migration; deploy the release candidate; run the guarded SQL/security suite;
  perform one disposable real upload and signed Member playback; then rebuild, inspect,
  install, smoke-test and uninstall the Windows installer. Production remains untouched.

## Normalized logo staging deployment — 30 September 2026

- Release commits `c0e7310`, `9ab548b` and `2d939d1` are pushed to
  `release/v1-readiness-20260918`. GitHub Actions run `36632559544` at exact head
  `2d939d1` passes common checks, Chromium/Linux, Firefox/Linux, WebKit/Linux and
  WebKit/macOS.
- Deployment input came from a clean archive of `2d939d1`; no uncommitted deferred
  Mux/uploader file was present. An initial manual Preview inherited the retired
  Supabase public URL. The browser request guard blocked every attempted retired-host
  request before network I/O, and the staging alias was immediately restored.
- The corrected build received the 13 protected staging values at build and runtime.
  Ready Preview `dpl_D5FDeemduJDLfd86SGZ9Vmjg6Xcz` now owns only
  `jingwuguanseibukan-staging.vercel.app`; its deployment metadata names exact commit
  `2d939d1` and branch `release/v1-readiness-20260918`.
- The host probe now validates the organization logo as `image/png`. All 11 staging
  route/method/security-header probes pass, followed by 18/18 guarded read-only WebKit
  tests across desktop, tablet and mobile. Member 0101, scoped Admin 0002 and Super
  Admin 0001 remained within the approved staging backend.
- All ten deployed static logo assets return HTTP 200 `image/png`, have exact
  1024 × 1024 dimensions, and SHA-256-match their committed files. Production was not
  deployed or contacted; the retired project received no guarded browser request.

## Dormant Web Push endpoint and subscription-state hardening — 1 October 2026

- Subscription create/delete now accepts only HTTPS endpoints on the reviewed browser
  push services: Google FCM, Mozilla Push Service, and Apple Web Push. Credentials,
  custom ports, fragments, root/double-slash paths, deceptive hostnames, control
  characters, oversized values, arbitrary domains, IP addresses, and localhost are
  rejected before any database RPC.
- Stored subscription endpoints are independently revalidated immediately before a
  provider request, so historical or externally inserted invalid rows fail closed
  without network access.
- Browser enable/reset flows now preserve consistency across the browser and database:
  a failed create removes only a newly created browser subscription, while a failed
  delete retains the existing browser subscription. Reset does not proceed after a
  persistence failure.
- Focused route, endpoint and client-state coverage passes 29/29. The complete
  application suite passes 336/336; ESLint, TypeScript, whitespace validation, and the
  optimized 51-route production build pass.
- Push/PWA settings remain deliberately hidden. No live database, deployment, push
  service, staging, production, retired project, or other provider was contacted.
  Physical Safari/iOS delivery, real provider failure behavior, and the product
  decision to expose push remain external gates.

## Production-target, email-runtime and installer acceptance hardening — 1 October 2026

- A new offline production-target gate binds the future exact 20-character project
  reference to Singapore (`ap-southeast-1`), its HTTPS Supabase origin, and either its
  direct database host or Singapore session pooler on port 5432 with
  `sslmode=require`. It rejects staging, the retired project, wrong/mismatched regions
  and projects, the transaction pooler, unsupported connection options, and never
  prints the database URL or password. Dashboard ownership and region still require an
  independent operator check before the first read-only connection.
- The email worker now has a default 45-second invocation budget and 10-second Resend
  request timeout. Both accept only bounded overrides. It stops claiming new messages
  once the budget is exhausted and returns monitored HTTP 503 rather than overlapping
  the next scheduler tick silently. Existing idempotency and retry handling remain in
  force.
- Privileged deceased-member and memorial API failures now log only bounded failure
  categories. Database/Auth error objects, identifiers, hints, and provider detail are
  excluded from both responses and server logs.
- The Windows uploader now includes a guided acceptance runner that verifies the exact
  installer hash, refuses to overwrite an existing per-user installation, requires a
  visible installed application window, invokes only the captured product uninstaller,
  verifies registry/install-directory removal, and writes JSON evidence even on
  failure. Preflight passes for the current 156,411,382-byte staging installer at the
  approved SHA-256; full interactive install/launch/uninstall remains a real-desktop
  user acceptance step, and the package remains unsigned.
- Combined verification passes 346/346 application tests, 22/22 uploader tests,
  50/50 focused release tests, ESLint, TypeScript, whitespace validation, and the
  optimized 51-route production build. No staging, production, retired project,
  deployment, database, scheduler, inbox, or provider was contacted.

## Production configuration, restore evidence and release-window gates — 1 October 2026

- Production provider validation now binds the future exact production Supabase URL
  and project reference to role-correct publishable/secret credentials. It accepts the
  reviewed modern key formats or legacy JWTs with exact role/project claims, and
  rejects aliases, placeholders, control characters, staging/test residue and any
  non-production Vercel environment. Values remain redacted.
- The recovery manifest is now version 4 and cryptographically identifies the exact
  protected backup payload by source project, capture time, format, byte count and
  SHA-256. Placeholder provenance, stale evidence, incomplete Auth/Storage recovery,
  ledger drift and production mutation fail closed.
- A two-pass offline staging Auth/email acceptance preflight now requires the exact
  staging target, dedicated inbox, three protected security-test identities, isolated
  class/dojo UUIDs, strong disposable passwords, current catalog evidence and a
  reviewed cleanup plan covering Auth users and identities, profiles, class requests,
  password-reset requests and email outbox rows. Its second-pass authorization token
  is an HMAC over non-secret scope. The live registration/confirmation/delivery test
  remains intentionally unrun until current catalog and cleanup evidence are supplied.
- A release-window validator now binds the release and rollback SHAs, deployment IDs,
  Sydney time window, named owners, independent commit verification, a recovery point
  captured within 24 hours, tested rollback, external approvals and explicit stop
  conditions. The checked-in template is deliberately incomplete and cannot authorize
  a release.
- Combined verification passes 367/367 application tests and 42/42 focused gate tests,
  ESLint, TypeScript, whitespace validation, and the optimized 51-route production
  build. No staging, production, retired project, deployment, database, inbox,
  scheduler or provider was contacted.

## External-gate evidence and installer trust hardening — 1 October 2026

- Staging Auth/email preflight now requires two distinct, non-empty protected evidence
  files outside the repository and verifies their real SHA-256 values before issuing
  the HMAC review token. Invalid credentials or any other blocker also prevents token
  issuance. A live run still needs a dedicated deliverable inbox, reviewed staging
  class/dojo UUIDs, current catalog evidence, an independently reviewed cleanup plan,
  disposable passwords and the second-pass token.
- Complete recovery can no longer be claimed from the local PostgreSQL drill. The v4
  gate requires a disposable managed Supabase target, a SHA-256/size-bound finalized
  sanitized evidence bundle, explicit-offset timestamps, in-window component evidence,
  and protected proof that the disposable target was deleted or quarantined.
- Full physical JS Video Uploader acceptance now requires the independently approved
  installer SHA-256 before launch, an interactive Windows x64 session and JSON-only
  evidence output. It refuses an existing exact installation and never silently
  removes a partial installation after failure. Non-installing preflight still passes
  for the 156,411,382-byte unsigned candidate at SHA-256
  `1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`.
- A new secret-free scheduler manifest gate requires the exact worker POST endpoint,
  60-second cadence, single non-overlapping execution, bounded timeouts, protected
  header injection, retained failures, queue-health monitoring, approvals and an
  empty-queue acceptance with zero provider requests. Its template intentionally
  fails until an external scheduler and plan are selected and verified.
- Verification passes 378/378 application tests, 37/37 combined focused gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace validation and the optimized
  51-route production build. No software was installed, launched or uninstalled and
  no live host, database, inbox, provider, production or retired project was contacted.

## Release evidence binding and dependency security — 1 October 2026

- A current dependency audit found the installed Next.js 16.3.4 line affected by the
  published authorization-bypass advisory. Next.js and `eslint-config-next` are now
  pinned to 16.3.8; transitive `brace-expansion` copies are updated to 1.1.21 and
  5.0.12. Full and production-only application audits and the JS Video Uploader audit
  each report zero known vulnerabilities.
- Added a physical-Safari evidence gate for one real Mac, iPhone and iPad. Every
  session must be read-only, use dedicated non-personal accounts, meet independently
  supplied minimum OS/Safari versions, and bind its protected evidence hashes to the
  exact release commit and staging deployment. WebKit, simulators and emulators do
  not count. Unknown fields and sensitive field names cannot be echoed.
- Added a production identity-inventory gate. Separate Auth and read-only database
  captures must be fresh, complete and count-consistent, use three distinct non-PII
  actor fingerprints, and carry canonical project/policy/query-bound provenance and
  review-attestation hashes. Dummy, security-test, unreviewed, missing, orphaned or
  duplicate identities remain hard blockers.
- Added a strict monitoring/incident/rollback evidence gate bound to the exact release
  commit and deployment. It requires an exact sanitized schema, all-non-success email
  worker alerting, application/Auth/database/Mux coverage, tested escalation and
  rollback, and either hidden Web Push or complete push failure monitoring and alert
  acceptance.
- The final release-window gate now requires three distinct SHA-256 manifest digests
  for physical Safari, production monitoring and production identity evidence. Their
  commit, deployment, project and policy bindings must agree with the release record;
  bare approval booleans can no longer certify these gates.
- Verification passes 408/408 application tests, 35/35 focused readiness tests,
  ESLint, TypeScript, whitespace validation, JSON-template parsing, dependency-tree
  verification, and the optimized 51-route Next.js 16.3.8 production build. No live
  host, database, account, deployment, inbox, provider, production or retired project
  was contacted or changed.
- Production remains blocked on operator-controlled evidence: creation and independent
  verification of the Singapore production project, managed Supabase restore,
  dedicated-inbox Auth/email delivery, external scheduler and live monitoring,
  physical Safari devices, interactive signed-installer acceptance, removal of any
  production test identities, and a separately approved release window.

## Final production bootstrap, signed-installer and CI evidence gates — 1 October 2026

- Added a fail-closed production bootstrap validator and deliberately incomplete
  manifest. It requires an exact new empty Singapore Supabase target, read-only
  inventory evidence, the protected pre-006 baseline, the immutable 006–056 migration
  contract, matching source ledger, import/recovery evidence and independent review.
  It explicitly rejects using migrations 006–056 as an empty-database bootstrap and
  performs no production mutation.
- Added a signed Windows uploader release validator and evidence template. It binds the
  exact installer SHA-256 and size to the release commit, requires a valid Authenticode
  signature and trusted timestamp, a current clean malware scan, secret-free packaged
  configuration, and physical Windows x64 install/launch/staging-sign-in/local-video/
  uninstall evidence. The acceptance boundary prohibits Mux upload, Repository Draft
  creation and provider or production contact.
- Expanded the final release-window validator from three to eleven distinct evidence
  digests. Rollback, recovery, physical Safari, monitoring, production identity,
  managed restore, production target/bootstrap, production secrets, provider delivery,
  scheduler and signed installer evidence must all pass and agree on the exact release,
  deployment and production project. Bare approvals cannot substitute for evidence.
- Strengthened GitHub CI so its common release job now runs full and production-only
  dependency audits, lint, all tests, the optimized production build, and the complete
  JS Video Uploader build/test/audit suite. Regression tests keep the workflow
  secret-free and prevent it from authorizing deployment.
- Local verification passes 432/432 application tests, 30/30 focused gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace validation, JSON-template
  parsing, the optimized 51-route production build, and all three dependency audits
  with zero reported vulnerabilities. No live host, database, deployment, account,
  inbox, scheduler, provider, production or retired project was contacted.

## Production secrets, provider delivery and evidence-packet closure — 1 October 2026

- Added an offline production-secrets gate that composes the existing provider check
  and binds the complete 19-value environment to the exact Singapore project, release
  commit, production deployment and Vercel Production environment. It enforces modern
  role-correct Supabase credentials, strong distinct worker/push/rate-limit secrets,
  matching VAPID keys, valid Resend/Mux configuration, ten explicit ownership/access/
  rotation records, fresh independent review, and zero staging or test residue.
- Added a provider-delivery evidence gate covering dedicated non-role inbox policy,
  Resend sender/domain/SMTP evidence, Auth confirmation and reset, Member/event/worker
  delivery, retry/backoff/exhaustion, and guarded staging Mux upload/signed-playback/
  cleanup. Keyed HMAC fingerprints bind every recipient without storing reversible
  mailbox hashes; canonical review binds every accepted outcome and timestamp.
- Strengthened the production scheduler and monitoring gates with exact project,
  release, deployment and endpoint binding; one-minute single-flight scheduling,
  bounded timeouts, protected header handling, retained failures, complete queue
  telemetry, live alert acceptance, 24-hour freshness and normalized independent
  reviewer checks. Monitoring evidence is now also project-bound in the release window.
- Added a release evidence-packet verifier. It independently loads the protected
  release-window file and all eleven evidence files, rejects repository/network paths,
  links, malformed or duplicate files and release/evidence reuse, and verifies exact
  raw-byte SHA-256 agreement. It does not replace any semantic child validator.
- Independent reviews fixed ambient-environment override of the protected production
  env file, incomplete provider attestation coverage, guessable recipient hashes,
  evidence-file reuse, forward-slash UNC paths and case/whitespace reviewer aliases.
- Verification passes 473/473 application tests, 67/67 focused combined gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace and template checks, the
  optimized 51-route build, and full/production/uploader audits with zero reported
  vulnerabilities. No staging, production, retired project, database, deployment,
  inbox, scheduler or provider was contacted.

## Semantic rollback evidence gate — 1 October 2026

- Added `rollback-readiness.mjs`, a protected template and operator guide. The gate
  binds the exact release and known-good commits/deployments to a non-production
  application rollback rehearsal and replacement-target managed database recovery.
- It requires staging auth/authorization/host probes, restoration of the candidate,
  exact ledger `006-056`, catalog/lint/grants/RLS/role checks, decision deadline and
  RTO compliance, distinct evidence digests, zero production/provider contact and
  deletion or quarantine of the disposable target.
- The CLI enforces protected regular files outside the repository and provides a safe
  digest-generation pass. Canonical review covers every accepted evidence field;
  impossible dates, understated durations and substituted Vercel deployment IDs fail.
- The release evidence packet now semantically validates rollback evidence using the
  release-window identities and cross-checks `decisionDeadlineMinutes`. A valid hash
  cannot substitute invalid or self-bound rollback JSON.
- Verification passes 488/488 application tests, 33/33 focused tests, 27/27 uploader
  tests, ESLint, TypeScript, whitespace validation, the optimized 51-route build and
  all three dependency audits with zero reported vulnerabilities. No live system was
  contacted.

## Production cutover evidence gate — 1 October 2026

- Added an offline, fail-closed production-cutover validator and deliberately
  incomplete protected manifest template. It binds the exact immutable release and
  deployment to an independently supplied Singapore production project, dashboard
  ownership/region evidence, exact migration ledger 006–056, catalog, database lint,
  strict security verification, grants and RLS.
- The gate requires the managed-platform future-object default ACL to be resolved or
  covered by the single documented narrow exception with independent security review
  and an expiry within 30 days. It also requires fresh read-only Member, scoped Admin
  and Super Admin acceptance with reviewed existing accounts, expected Auth-session
  writes and no attempted application mutation.
- Production DNS/TLS, exact Site URL and `/auth/confirm` redirect, public Supabase
  binding, all 11 host probes, browser auth, redirects, security headers, zero server
  errors, zero application/domain acceptance writes and rollback reachability are mandatory. Staging,
  retired-project, provider, test-account and member-record contact all fail closed.
- The release-window gate now requires the production-cutover approval and sanitized
  passing summary. The final evidence packet expands to twelve distinct protected
  files and semantically reruns both rollback and cutover validators against
  independently supplied identities; matching hashes cannot make placeholders or
  self-bound records pass.
- Verification passes 507/507 application tests, 40/40 focused cutover/window/packet
  tests, 27/27 uploader tests, ESLint, TypeScript, whitespace validation, the optimized
  51-route production build, and full/production/uploader dependency audits with zero
  reported vulnerabilities. No live host, database, deployment, account, inbox,
  provider, production or retired project was contacted.
- Production readiness remains approximately 9.5/10. Remaining work is execution of
  the operator-controlled gates and separate production authorization: create and
  verify the Singapore project, managed restore, production secrets and delivery,
  scheduler/monitoring, physical Safari, signed installer, identity cleanup, approved
  cutover, then the final protected release-window and twelve-file evidence packet.

## Milestone 181 — email or JS Member ID login — 2 October 2026

- Implemented locally after explicit approval. The web login accepts email or exact
  `profiles.registration_number` plus password, preserving leading zeros. Aikikai
  numbers and usernames are not aliases. Pending applicants continue using email;
  existing post-login approval/role routing and desktop uploader email login remain.
- The server resolves the ID privately through the profile UUID and authoritative
  Auth email. Ambiguous IDs, unconfirmed users, identity mismatch, disabled/deceased
  profiles, missing profiles and backend failures cannot issue browser cookies.
  Failed post-auth validation revokes the newly issued session best-effort. Successful
  replacement clears only the current project's stale session cookie chunks.
- Exact configured-origin checks, an 8 KiB streamed body limit, durable global/client/
  identifier limits, generic errors, no credential logging and a one-second rejection
  floor are included. The floor reduces simple timing probes, but network timing can
  still vary. Live validation must confirm the existing rate-limit secret and grants.
- Local checks: `npm test` passes 529/529 including TypeScript; ESLint passes; the
  optimized production build passes (52 generated pages) with synthetic configuration.
  Focused login, frontend, public-form and staging-guard tests pass 49/49. The local
  Chromium-desktop and WebKit-desktop browser suite passes 78/78. Its initial run
  passed 77/78; the new WebKit JS-ID test was corrected to wait for hydration and
  verify the entered value before submission, then both projects passed on rerun.
  No migration was needed. No staging/production database or provider was contacted,
  and this milestone is not committed, pushed, deployed or live-verified yet.

### Approved staging release follow-up — 2 October 2026

- Committed the 19 intended login, test and documentation files as `ed15327` and
  pushed to `release/v1-readiness-20260918`. Existing `supabase/.temp` changes were
  excluded and preserved. Added exact JS-ID role checks for Member 0101, Admin 0002
  and Super Admin 0001 on all three guarded WebKit device projects (27 total cases).
- TypeScript and 24 focused login/target-guard tests passed again before the commit.
  GitHub Actions run `36971234524` passed all five jobs: common checks, Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS.
- After the user restored Vercel sign-in, exact commit `ed15327` was built as Ready
  Preview `dpl_5tjVrPaXs7yuyywmwUkefoNfEtVx` (53-second build). Existing CLI access
  assigned only `jingwuguanseibukan-staging.vercel.app` to
  `jingwuguanseibukan-e1vrid5dg-js1-ccd7.vercel.app`; no production promotion occurred.
- All 11 staging host probes and required security headers passed. The new login
  label is deployed. The login bundle no longer includes the Supabase client, so
  backend binding was verified from registration bundles: only
  `eomubndonbetszdbhsrj.supabase.co` was present.
- `npm run test:browser:staging:read-only` passed 27/27 in 4.0 minutes: desktop,
  tablet and mobile WebKit each verified registration catalog, invalid confirmation,
  email login for all three roles, Member/Admin denied routes, Super Admin readers,
  unknown-certificate handling, and exact JS-ID login for 0101, 0002 and 0001.
  The request guard reported no application mutation, unapproved RPC or off-origin
  browser request. This is not a separate database-wide zero-residue audit or a
  substitute for physical Safari/iOS testing.
- No production, retired project or outbound delivery/video provider was contacted.
  No database migration or business-record mutation was performed. Authentication
  sessions and HMAC-keyed login rate-limit counters are expected operational writes.

## Approved web-first release scope — 2 October 2026

- The user approved updating V1 to a web-first launch after confirming that no
  Windows code-signing certificate is available. The Windows uploader is deferred
  and withheld from production distribution, not marked tested or released.
- Release-window and evidence-packet validators now require explicit `release.scope`:
  `web-only` or `web-and-windows-uploader`. Web-only requires confirmation of
  `approvals.windowsUploaderWithheld`, excludes installer evidence rather than
  treating it as passed, and requires eleven distinct final evidence files (ten
  pre-cutover). Combined releases retain twelve final files and the existing signed
  installer requirements. Missing/unknown scopes fail closed.
- Updated both release templates, deployment runbook, evidence-packet instructions,
  installer deferral notice and current TODO scope. Existing protected manifests
  must be deliberately updated with scope; no protected evidence was changed or
  fabricated. All web recovery, security, identity, provider/Mux delivery, scheduler,
  monitoring, physical Safari, production target/secrets and cutover gates remain.
- Verified locally: `npm test` passes TypeScript and 537/537 tests; the focused
  release-window/packet suite passes 34/34; `npm run lint`, `git diff --check` and
  parsing of both updated JSON templates pass. Eight new regression tests cover
  scope validation, distribution withholding, evidence counts, retained web gates,
  and missing/unsigned/misbound installer rejection for combined releases.
- No application UI, database migration, credential, uploader binary or standalone
  installer validator was changed. No build/browser/live provider tests were rerun
  for this offline release-policy change. No live systems were contacted. Changes
  were prepared on top of `34e43c4`; pre-existing Supabase temporary
  metadata changes were preserved. Production creation, import and deployment still
  require separate explicit authorization.
- Follow-up local commit review reran all 34 focused release-window/packet tests and
  whitespace validation successfully. Only the eleven intended scope-change files
  are included in the local commit; Supabase temporary metadata is excluded. No
  push, deployment or remote CI run is part of this follow-up. The next publication
  step requires approval to push the commit and run GitHub CI; managed recovery,
  physical Safari and the separately approved production setup remain open.

### Web-first remote CI verification — 2 October 2026

- Pushed only reviewed commit `7471c44d85c5c5dda14e64e73cef1050fa04f76b` to
  `release/v1-readiness-20260918`. GitHub Actions run `37002672716` completed
  successfully at that exact SHA. All five jobs passed: common checks,
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS.
- The common job passed dependency audits, lint, TypeScript/application tests,
  production-mode build and desktop uploader tests/audit. Browser jobs used isolated
  synthetic fixtures; automated WebKit is not physical Safari acceptance.
- No staging alias was reassigned, no production or retired project was contacted,
  and no database, provider or member record was changed. A new Vercel Preview's
  existence/readiness was not verified; GitHub CI success is not deployment evidence.
- Remaining execution gates include physical Safari, managed-platform restore,
  production target/bootstrap, secrets/provider delivery, scheduler/monitoring,
  identity cleanup, rollback and separately approved cutover. Windows installer
  distribution remains deferred under the approved web-only scope.
- This verification entry is a local documentation update; it is not included in
  the remotely tested commit and has not been pushed.

## Approved staging backup refresh — 2 October 2026

- With explicit user approval, captured only staging `eomubndonbetszdbhsrj` through
  its exact project-bound Sydney session-pooler identity with verified TLS and
  read-only transactions. A shared repeatable-read snapshot binds the custom-format
  database dump, ledger, catalog and Storage metadata. Global roles were captured
  separately with role passwords excluded; no managed restore was performed.
- New current-user-only backup folder:
  `C:\protected\jingwuguan-recovery-source-20261002-b23c1337`.
  The package contains database/Auth/Storage metadata, roles, the exact 51-entry
  006–056 ledger, 18 catalog files (4,151 objects), and all six Storage objects
  totaling 3,412,943 bytes. Counts include 57 Auth users, 57 identities, two buckets
  and 67 public tables. Storage metadata and ledger were unchanged on the final
  source check; Storage bytes are a separate service capture, not an atomic database
  snapshot. Role globals likewise are not snapshot-bound.
- Source-ledger SHA-256:
  `4e5c16b7bd06b98c814054c10da5337ec916f9a8a984a83a84fdcf2902ed2c4a`.
  Catalog SHA-256:
  `fbce4bc17f17cccd723c01b508798991c3d4e37cf75a22ff7da0e2fc1077be5f`.
  The immutable repository 006–056 migration contract passed independently.
- The new archive uses AES-256-GCM with a fresh random key and nonce. Its protected
  `encryption.json` records format, nonce and authentication tag; the separate
  `recovery-backup.key` remains in the restricted folder and must never enter Git.
  Archive SHA-256 is
  `082c1adcb3435c8052570fadf21a04f960442cf2c3a1b31aac0518d533facfc2`.
  Authenticated decryption, byte-length/SHA-256 comparison and tar listing passed;
  the custom dump's local `pg_restore --list` check also passed. This is not a
  database restore or validation of managed Auth/Storage API recovery.
- Temporary plaintext dump, SQL, catalog, ledger, object bytes and tar verification
  files were removed only after successful verification. An independent follow-up
  confirmed the new ciphertext hash, exactly four retained protected files, no
  plaintext directories, and unchanged hashes for both September encrypted archives.
  Existing and new backups are retained pending a separately approved retention
  decision. No source data was deleted or changed.
- No production/retired project, Resend, Mux or push provider was contacted; no
  project, paid resource, deployment or migration was created. Hosted Auth settings,
  provider secret custody, scheduler settings and managed restore/recovery acceptance
  remain unverified by this package. The disposable project capacity limit was not
  rechecked. Physical Safari remains a separate open gate.
- Backup scripts are retained in the local task's `staging-readiness` directory;
  only sanitized evidence is recorded here. Documentation updates are local and
  uncommitted; no additional remote CI or deployment is claimed.

## Approved old-project pause and disposable recovery target — 2 October 2026

- The user explicitly authorized disabling the old project to free a slot for the
  new restore-test project. This narrowly supersedes the prior no-contact restriction
  for the old project's management-plane pause only; it does not authorize old
  database access, deletion, migration, production deployment or domain cutover.
- Verified organization `uqbibabcmufzxetfoqqw` was Free and exact old project
  `pkmllhaavadhaozmwapz` was named `js-repository`. Submitted one pause request,
  observed `PAUSING`, then independently verified `INACTIVE`. The old project was
  not deleted; anything relying on that old backend is now unavailable while paused.
- Created exactly one project `js-recovery-rehearsal-20261002`, reference
  `wtnonpldqvzipqmwgbru`, in Singapore (`ap-southeast-1`) on the existing Free
  organization. Independent account inventory confirmed `ACTIVE_HEALTHY`, old
  project `INACTIVE`, staging `eomubndonbetszdbhsrj` still `ACTIVE_HEALTHY`, and
  organization plan still Free. No paid add-on or upgrade was requested.
- Generated a fresh database password and saved it only in current-user-only
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\managed-recovery.env`.
  No credential value was printed or committed. This is a disposable recovery
  target, not the future production project, and neither source credentials nor
  website/deployment aliases were repointed to it.
- No backup import, database query, schema mutation or managed restore acceptance
  was run against the new target. Outbound isolation must be configured and verified
  before any restore; no such isolation is claimed yet. The next step is guarded
  isolation/preflight of this exact empty target, followed by the approved staging
  backup rehearsal and recovery/security checks. Physical Safari remains open.
- Updated documentation remains local/uncommitted. No app deployment occurred.

# Jingwuguan Seibukan Super App — verified checkpoint

Checkpoint date: 26/09/2026

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

- The release candidate is `release/v1-readiness-20260918` at `bda9bf9`; local HEAD
  and `origin/release/v1-readiness-20260918` matched before this evidence update.
- Migrations 048 through 053 were applied only to staging
  `eomubndonbetszdbhsrj`. The verified staging migration ledger is now exactly
  006–053, and the post-apply dry run reports no pending migration.
- Migrations 040 through 053 were applied in order to staging
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
- Vercel Preview deployment `dpl_DocKgDVEB2EjtMt6i2sh4owYdhVj` is Ready at
  `https://jingwuguanseibukan-lcpp3n10i-js1-ccd7.vercel.app`, and the fixed alias
  `https://jingwuguanseibukan-staging.vercel.app` points to it. It was built from
  release commit `bda9bf9` with the 13 approved staging-only Preview variables. Only
  the exact fixed alias is a Deployment Protection exception; generated Preview URLs
  remain protected. The unused `Staging Release` deploy hook was removed and a
  follow-up listing returned no project deploy hooks. The four temporary Codex Vercel
  token records used for this staging operation were deleted, and their local
  temporary copies were removed. Production was not contacted or modified.

## Actual feature inventory

| Feature | Existing implementation | Missing or unverified work | Relevant files / database objects |
| --- | --- | --- | --- |
| Member management and statuses | Existing member, membership, class/dojo, approval, Break, transfer, grading and retained-history flows. Migration 047's active/disabled/deceased request gate passed rollback-contained staging acceptance. | Physical Safari/iOS and remaining mutation workflows still require guarded coverage. | `app/admin/members/page.tsx`; `profiles`; `memberships`; `admin_visible_members`; migration 047 |
| Aikikai and JS Member IDs | Registration accepts the applicant's optional Aikikai Registration Number and stores it separately. Persisted migration 044 assigns the next permanent numeric JS Member ID atomically only when a Super Admin approves the initial application. Supplied/blank Aikikai values, ID assignment, rejection, legacy preservation, role denial, queue atomicity and zero residue passed live staging acceptance. | Exercise both blank and supplied Aikikai registration paths through the deployed browser workflow. | migration 044; `profiles.aikikai_registration_number`; `profiles.registration_number`; `js_member_id_seq`; both `review_class_request*` RPCs; registration and Applications pages |
| Last training session | Migrations 045–046 are persisted on staging. The repaired implementation stores the latest date per class membership, appends the effective Jakarta date to a private audit, enforces scoped Admin/Super Admin writes and exposes Member-own reads. Rollback-contained live tests passed mark-today, correction/audit, idempotency, Member denial, Admin scope, Super Admin scope, inactive/pre-join/deceased rejection and ACL checks. The deployed Admin member list rendered the controls without mutation. | Complete the deliberate mutation workflow on a disposable membership and physical Safari/iOS. | migrations 045–046; `class_memberships.last_training_session_date`; `membership_training_session_audit`; `mark_membership_trained_today`; `set_membership_last_training_session`; `get_my_last_training_sessions`; Admin member page; Member profile |
| Ordinary birthday announcements | Date of birth is retained. No ordinary birthday announcement scheduler was found in source or retained evidence. | If added later, it must exclude `date_of_passing is not null`; do not claim that migration 040 replaces an existing birthday job. | `profiles.date_of_birth` |
| Announcements and notifications | Existing published text announcements, class scoping, in-app notification creation and durable email outbox integration are present. The staging queue-health probe currently passes with no queued, due, overdue, stuck, exhausted or duplicate rows. | Announcement comments and image attachments were not found. External email-worker scheduling, sender-domain ownership and real delivery remain operational gates. The push delivery route is per-recipient and is not a scheduler worker. | `announcements`; `notifications`; `email_outbox`; `/api/system/email-worker`; `/api/push/send`; migration 034; migration 040 recipient extensions |
| Events | Existing create/delete/list/export paths and bounded queued event-email notifications are present. | Event voting, voting deadlines and vote correction were not found. | `app/admin/events`; `events`; event notification functions |
| Deceased member and memorials | Migrations 040 and 043 are on staging. The persisted state transition, initial memorial, annual Remembrance Day and Heavenly Birthday, class recipients, idempotency and Member/Admin denials passed rollback-contained acceptance. | Auth ban/unban and real scheduled delivery still require dedicated accounts/provider execution. | migrations 040 and 043; deceased UI/API; memorial tables and RPCs |
| Bulk assessment and promotion | Migrations 041–043 are on staging. A persisted three-person rollback suite prepared all certificates as Pending, submitted two Pass and one Fail atomically, promoted only passes, created the results announcement and rolled everything back. | Complete password-authenticated and browser workflows using dedicated staging accounts. | migrations 041–043; `app/admin/assessments/page.tsx`; private assessment tables and guarded RPCs |
| Certificate barcode verification | Pending QR payloads and final Issued/Void database statuses passed persisted service-role verification; browser roles were denied direct verification/table access. | Exercise the public scan page through the deployed staging app and physical Safari/iOS. | `verify_prepared_assessment_certificate(uuid)`; public verification page; certificate PDF components |
| Regular schedules | Migration 048 is persisted and passed rollback-contained scoped-write, Member-read, audit and ACL acceptance. The current schedule routes load in the deployed release matrix. | Guarded authenticated schedule mutations and physical Safari/iOS remain open. | migration 048; `/schedules`; `/admin/schedules`; schedule RPCs and private audit |
| Member contact self-service | Migration 049 is persisted and passed rollback-contained normalization, audit, disabled-user, duplicate-email and ACL acceptance. The Member profile loads in the deployed role matrix. | Guarded Auth email-change/provider delivery and physical Safari/iOS remain open. | migration 049; `/profile`; `/api/account/change-email`; `update_my_contact_details` |
| Member directory privacy | Migration 050 is persisted and passed caller-class isolation, record-only inclusion, excluded-account and ACL acceptance. Scoped Admin membership visibility passes in the deployed role matrix. | Guarded directory-related mutations are not applicable; physical Safari/iOS remains open. | migration 050; `/directory`; Member-directory RPC |
| Finance late-payment presentation | Migration 051 is persisted and passed late/on-time classification, projection-preservation and wrapper-ACL acceptance. | A positive live late-payment presentation example and guarded payment/settlement mutations remain open. | migration 051; Admin payments and settlements; settlement-detail wrappers |
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
  Preview build is Ready and its fixed staging alias is assigned; no Production
  environment value or deployment was changed.
- GitHub Actions runs `36096335398` and `36096832757` passed checks plus
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS for the migration-047
  candidate and its evidence-only checkpoint.
- Migration 047 passed isolated apply, exact-ledger, up-to-date dry-run, database
  lint, anonymous catalog, helper-denial, sensitive-relation-denial, service-role,
  rollback-contained active/disabled/deceased semantics, 12/12 role-security and
  independent zero-residue checks on staging.
- The updated strict SQL verifier was executed read-only against staging through
  migration 047. Every preceding check passed; its final default-privilege gate
  stopped with SQLSTATE `P0001`. The remaining unsafe defaults are owned exclusively
  by managed-platform role `supabase_admin`: global function defaults grant
  `PUBLIC EXECUTE`; public-schema function defaults grant `anon`/`authenticated`
  `EXECUTE`; sequence defaults grant those roles `SELECT`/`UPDATE`/`USAGE`; and table
  defaults grant all eight relation privileges, including mutations, `TRUNCATE`,
  `TRIGGER` and `MAINTAIN`. No unsafe `postgres`-owned default was found.
- The exact staging alias is publicly reachable through the approved single-domain
  Vercel exception. All 11 host probes pass, including public pages, assets, method
  guards and security headers. Generated Preview URLs remain protected.
- Supabase staging now has the exact staging Site URL and `/auth/confirm` redirect,
  email/password login, confirmation, a ten-character mixed-case-and-digit policy,
  custom Resend SMTP and the reviewed token-hash confirmation template.
- Deployed browser checks passed public registration catalog loading, generic invalid
  confirmation handling, Member login and Admin denial, scoped Admin login and
  Aikido-only member visibility, Super Admin login and all-class visibility, and the
  Applications page. Test sessions were signed out and no member record was changed.

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
- Recovery tooling now passes 13/13 focused tests. Manifest v2 binds a rehearsal to
  exact staging, the immutable repository 006–053 fingerprint, matching sanitized
  source/restored ledger fingerprints and measured RPO/RTO timestamps; it also
  represents the absence of a production project without a fake reference. The
  retained restore itself still reaches only ledger 006–026 and excludes managed
  Auth/Storage and other platform resources, so it is not current recovery evidence.
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
   with dedicated staging accounts; verify no live member data is mutated.
3. Complete the remaining authenticated mutation workflows in deployed staging,
   then repeat relevant guarded WebKit coverage and run physical Safari/iOS coverage.
4. Resolve or formally accept the existing Supabase platform-owned default-privilege
   database-verifier blocker without weakening the verifier.
5. Configure and monitor an external **email** worker scheduler, then verify real
   test-recipient delivery. Push remains an explicitly targeted per-user operation,
   not a scheduled queue worker; verify it separately with a dedicated test device.
6. Rehearse a complete 006–053 managed-platform restore into a disposable isolated
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

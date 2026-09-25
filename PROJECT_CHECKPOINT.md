# Jingwuguan Seibukan Super App — verified checkpoint

Checkpoint date: 25/09/2026

## Source and database state

- Last pushed checkpoint before this staging acceptance:
  `release/v1-readiness-20260918` at `75fdeec`.
- Local HEAD and `origin/release/v1-readiness-20260918` matched at that checkpoint.
- Migration 047 was applied only to staging `eomubndonbetszdbhsrj`. The verified
  staging migration ledger is now exactly 006–047, and the post-apply dry run is
  up to date.
- Migrations 040 through 047 were applied in order to staging
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
- Vercel Preview deployment `dpl_Eh1NP7nSfrz2WhJm9Spwcguz7iJ9` is Ready at the
  immutable preview URL and fixed alias
  `https://jingwuguanseibukan-staging.vercel.app`. Only that exact alias is now a
  Deployment Protection exception; generated Preview URLs remain protected.
  Production was not contacted or modified.

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

- Migration 045/046 focused source/security suites and the migration-047 repair
  suites pass. The current full gate passes TypeScript plus 233/233 Node tests,
  lint and a fresh optimized production build of all 44 routes using the protected
  staging build environment.
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
- A guarded read-only Playwright staging harness now covers the public registration,
  invalid-confirmation, role-boundary and certificate-not-found paths in WebKit
  desktop, iPad Mini and iPhone 13. The final staging-only run passes 18/18 in 28.5
  seconds. The interim login failures were a harness-only Next hydration race; the
  harness now waits for network idle and verifies controlled input values before
  submitting. Its allowlist adds exactly two legitimate read-only Member-profile
  RPCs, and redundant sign-out was removed because every test has an isolated browser
  context. This is automated WebKit evidence; physical Safari/iOS and guarded
  mutation workflows remain open.
- Recovery tooling now passes 13/13 focused tests. Manifest v2 binds a rehearsal to
  exact staging, the immutable repository 006–047 fingerprint, matching sanitized
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
   repeat the relevant guarded WebKit coverage, and run physical Safari/iOS coverage.
4. Resolve or formally accept the existing Supabase platform-owned default-privilege
   database-verifier blocker without weakening the verifier.
5. Configure and monitor an external **email** worker scheduler, then verify real
   test-recipient delivery. Push remains an explicitly targeted per-user operation,
   not a scheduled queue worker; verify it separately with a dedicated test device.
6. Rehearse a complete 006–047 managed-platform restore into a disposable isolated
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

No production connection, deployment or merge is claimed by this checkpoint.

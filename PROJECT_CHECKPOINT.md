# Jingwuguan Seibukan Super App — verified checkpoint

Checkpoint date: 24/09/2026

## Source and database state

- Published branch checkpoint: `release/v1-readiness-20260918` at `68252fd`.
- Local HEAD and the recorded `origin/release/v1-readiness-20260918` ref matched at
  the start of the last-training-session work; no fresh remote fetch was performed.
- The current working tree is an uncommitted local migration-045 candidate adding
  the instructor-recorded last-training-session feature described below.
- The verified staging migration ledger is exactly 006–044.
- Migrations 040, 041, 042, 043 and 044 were applied in order to staging
  `eomubndonbetszdbhsrj` only. The repository's local Supabase metadata remains
  linked to production, so it was not used or changed.
- Migration 044, optional Aikikai-number capture plus automatic JS Member ID
  assignment on initial approval, is persisted and accepted on staging. It has not
  been applied to production.
- Migration 043 repaired the two runtime catalog mismatches found by live acceptance:
  unsupported `min(uuid)` in memorial publishing and the prepared-assessment lookup
  of `profiles.member_id` instead of `profiles.registration_number`.
- Production was not contacted. Its current database ledger is therefore unverified.

## Actual feature inventory

| Feature | Existing implementation | Missing or unverified work | Relevant files / database objects |
| --- | --- | --- | --- |
| Member management and statuses | Existing member, membership, class/dojo, approval, Break, transfer, grading and retained-history flows. | New deceased boundaries require staging and browser acceptance. | `app/admin/members/page.tsx`; `profiles`; `memberships`; `admin_visible_members` |
| Aikikai and JS Member IDs | Registration accepts the applicant's optional Aikikai Registration Number and stores it separately. Persisted migration 044 assigns the next permanent numeric JS Member ID atomically only when a Super Admin approves the initial application. Supplied/blank Aikikai values, ID assignment, rejection, legacy preservation, role denial, queue atomicity and zero residue passed live staging acceptance. | Exercise both blank and supplied Aikikai registration paths through the deployed browser workflow. | migration 044; `profiles.aikikai_registration_number`; `profiles.registration_number`; `js_member_id_seq`; both `review_class_request*` RPCs; registration and Applications pages |
| Last training session | Local migration 045 stores the latest training date per class membership, keeps a private append-only correction audit, and permits only the assigned scoped Admin or Super Admin to record it. The one-click attendance action uses the Jakarta server date, while a separate date field supports corrections/backdating. The Admin member list and Member profile display Today, 1 day ago, or N days ago through day 29, then the actual date from day 30 onward. | Migration 045 is not applied to staging or production. It still requires isolated PostgreSQL semantic acceptance, guarded staging apply after password rotation, role-boundary/zero-residue checks, and authenticated browser verification. | migration 045; `class_memberships.last_training_session_*`; `membership_training_session_audit`; `mark_membership_trained_today`; `set_membership_last_training_session`; `get_my_last_training_sessions`; Admin member page; Member profile |
| Ordinary birthday announcements | Date of birth is retained. No ordinary birthday announcement scheduler was found in source or retained evidence. | If added later, it must exclude `date_of_passing is not null`; do not claim that migration 040 replaces an existing birthday job. | `profiles.date_of_birth` |
| Announcements and notifications | Existing published text announcements, class scoping, in-app notification creation and durable email outbox integration are present. | Announcement comments and image attachments were not found. Live delivery/scheduler configuration remains an operational gate. | `announcements`; `notifications`; `email_outbox`; migration 034; migration 040 recipient extensions |
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

- Migration 045's focused source/security suite passes 5/5. The full gate passes
  TypeScript plus 228/228 Node tests, lint, `git diff --check`, and the direct
  optimized Next.js production build of all 44 routes.
- The migration-045 review preserves the existing `admin_visible_members` column
  order and appends its two new fields, preventing an unsafe/incompatible view
  replacement. No remote database was contacted for this candidate.

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
- Provider configuration and 50/50 focused worker tests pass; a read-only staging
  probe confirms a healthy empty email queue, push RLS/policies and service-only
  memorial processing. The configured staging host currently returns 404 for the app
  and worker routes, and no database scheduler is installed.
- Recovery tooling passes 5/5, but the retained restore rehearsal reaches only
  ledger 006–026 and excludes managed Auth/Storage and other platform resources. It
  is not current recovery evidence for 006–044.
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

1. Rotate the staging database password before any further live staging work. A
   staging connection URL was exposed in internal command output during an offline
   audit on 24/09/2026; the value is not repeated or used after that event.
2. Exercise optional-Aikikai registration and automatic JS Member ID approval in the
   deployed authenticated browser workflow.
3. Exercise deceased-member Supabase Auth ban/unban and the protected annual worker
   with dedicated staging accounts; verify no live member data is mutated.
4. Run authenticated Member, scoped Admin and Super Admin browser workflows for the
   new features on a deployed staging host, including WebKit, then complete physical
   Safari/iOS validation. The currently configured host returns 404.
5. Resolve or formally accept the existing Supabase platform-owned default-privilege
   database-verifier blocker without weakening the verifier.
6. Configure and monitor the external scheduler/provider boundaries before release.
7. Rehearse a complete 006–044 managed-platform restore into a disposable isolated
   target, including Auth, Storage, roles/grants and post-restore security evidence.

The three reusable staging dummy identities exist and their protected passwords were
rotated through password-only Auth Admin updates. The exact-account audit passed, and
the one-time-session Member/scoped Admin/Super Admin security suite passed 12/12 while
public email login remained disabled. No profile, membership or live member record
was changed. The offline provider configuration check passes and now proves that the
expected origin matches normalized `NEXT_PUBLIC_SITE_URL`; it does not replace live
delivery tests.

The targeted rotation command is audit-only by default, is hard-limited to staging,
requires the exact three existing member numbers and resolved roles, and sends only
password updates. Its remote audit and explicitly approved apply both passed. Because
staging intentionally disables public email login, the final suite used non-delivered
one-time sessions and confirmed their cleanup instead of changing provider settings.

The assessment page and navigation are now explicitly Super-Admin-only. Scoped
Admins no longer see the entry, and direct non-Super-Admin access is redirected.

No deployment, production connection, commit, push or merge is claimed by this
checkpoint.

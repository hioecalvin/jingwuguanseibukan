# Assessment numbering 061 — guarded acceptance plan

Prepared locally on 19 October 2026. NOT executed, applied, deployed or approved
for a new live action by this document. Existing accepted ledger is 006–060.

## Candidate and boundaries

- Source: `supabase/pending/061_individual_assessment_numbers.sql`.
- SHA256: `28e16904ed31c1ad29191bcf23fe4390a46b6038e7ffc2ce22582d021e9ca37b`.
- Format: YYYY-XXXX; one shared sequence per year across all classes. All submitted
  Pass/Fail attempts are numbered. Same-request retries keep the number; a new
  reassessment gets another. Certificates and QR references do not change.
- Candidate has not been added to the active migration chain. Do not run a broad
  `db push`, infer a target from CLI link metadata, or mark 061 applied prematurely.
- Any approved next live test must pin only staging `eomubndonbetszdbhsrj`.
  Production, retired/disposable projects and delivery providers are out of scope.
- Keep `ASSESSMENT_HISTORY_ENABLED` absent/false until exact-target acceptance.
  Auth, passwords, assignments, schedulers and provider settings stay unchanged.

## Required before mutation

1. Review the exact candidate hash and intended release files; preserve all other
   working changes, backups and deferred Excel work. Record the release commit
   separately before deployment; this plan does not authorize commit/push.
2. Obtain explicit staging migration/rehearsal authority. Verify target identity
   and exact ledger 006–060 with statement provenance, not version labels alone.
   If 061 already exists, stop to reconcile instead of replaying it.
3. Capture encrypted pre-migration schema/data evidence and exact table baselines
   privately. Verify backup integrity and the applicable recovery procedure.
4. Compare full catalog dependencies, grants/RLS, trigger inventory and the exact
   `submit_bulk_assessment` replacement markers. Stop on drift or pre-existing
   numbering columns/table/functions, rather than weakening guards.
5. Read-only preflight must reject missing profile/rank joins, dates outside
   1900–2199, more than 9999 results in any year, or unavailable membership/date
   constraint. Review configured rank/tier ordering before immutable backfill.
   Account for the migration's access-exclusive result-table lock with bounded
   statement/lock timeouts and a maintenance window.

## Rehearsal and independent verification

- First rehearse the exact statements inside a rollback-only transaction using
  a reviewed wrapper. The candidate contains BEGIN/COMMIT; blindly nesting it
  inside an outer transaction is NOT rollback containment.
- The existing `tests/sql/061_assessment_numbering_assertions.sql` is a synthetic
  local fixture suite. It assumes fixture UUIDs and `app.current_uid`; DO NOT run
  it unchanged on staging. Prepare production-shaped, transaction-contained
  fixtures and real `auth.uid()` JWT claim context, without Auth Admin API writes.
- Include successful and failed attempts, same-day reassessment, request replay,
  shared cross-class numbering, annual reset, century separation, overflow,
  invalid dates, immutable update/delete and concurrent allocation.
- Cover own Member history, other-Member denial, exact assigned Dojo Admin,
  other-dojo denial, revoked scope, inactive/deceased/unauthenticated access,
  Super Admin access and direct counter/function ACL denial.
- Ensure synthetic inserts cannot send messages: inspect all triggers/queues,
  keep delivery/schedulers disabled, use isolated rollback-contained database
  fixtures only, and fail closed if any external side effect is possible.
- Independently compare complete baselines after rollback, not just fixture
  counts: profiles, memberships, assessment/prepared/certificate/QR records,
  audit history, announcements, notifications, outbox and numbering counters.
- After a separately approved successful application, verify persisted schema,
  unchanged original result fields, complete valid numbering, exact ledger
  006–061 (56 versions), intended ACL/RLS and database lint. Then repeat guarded
  semantic tests and independent zero-residue checks.

## Release and recovery

Only enable the history flag on an approved deployment whose database passed the
above checks. Verify Member/Dojo Admin/Super Admin behavior using the existing
protected staging accounts; never reset passwords or send messages implicitly.
Retain the previous deployment identity for application rollback. Disabling the
flag is an application fallback, not a database rollback. Do not drop numbering
columns or renumber issued records after new assessments have been submitted.

Future historical Excel imports remain deferred. One-time backfill is ordered by
date, configured grade/tier, Member ID and deterministic tie-breaks; future late
imports must not silently renumber already issued immutable references.

## Evidence already available (not live acceptance)

- 913 unit tests, 486 local Chromium/WebKit checks, lint/typecheck/build.
- Synthetic PostgreSQL 17 workflow/backfill/concurrency and role checks.
- Hash-pinned saved-schema static compatibility, not full-schema execution.
- Full-schema local restore requires unavailable Supabase Vault support; do not
  replace platform dependencies with mocks and label the result a complete restore.
- Linux Firefox/CI, dependency-policy disposition and live release gates remain.

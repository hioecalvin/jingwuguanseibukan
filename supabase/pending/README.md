# Pending SQL — not an executable migration source

Status update, 14 October 2026: the exact pinned 059 and 060 sources in this
directory were applied once, in order, to staging eomubndonbetszdbhsrj. They must
NOT be reapplied. Independent read-only reconciliation now verifies the exact
006–060 ledger, committed transaction and preserved catalog/data/actor baselines
(14 October, 08:57 Sydney). Corrected post-commit rollback acceptance PASSED at
17:31 Sydney: independent transaction-aborted/backend-gone proof, all 67 public
tables/six sequences, exact ledger and three actors verified unchanged.
These files retain their original reviewed bytes as historical evidence only.
Exact-byte copies now exist in `supabase/migrations`, the ONLY active migration
chain. Current release/recovery contracts require all 55 migrations, 006–060.
The copies here are NOT pending application work and must NOT be passed to the CLI.
Historical backup/restore evidence remains scoped to its original chain and cannot
satisfy the current release gate. No deployment is authorized by this status. See
operations/finance-postcommit-acceptance-review-20261014.json and PROJECT_CHECKPOINT.md.

Status update, 5 October 2026: 057 and 058 are now approved, promoted to
`supabase/migrations`, applied and accepted on staging only. This directory is
not a migration source. Historical draft notes below are superseded by the
verified milestone in PROJECT_CHECKPOINT.md. Historic 006–056 restore evidence
must not be relabelled as proof for the new 006–058 chain.

## Historical draft gates (now satisfied for staging)

The new directory UI requires `get_my_member_directory_v2`; do not deploy it
until 057 is approved, promoted to the active chain, and database acceptance is
complete. No fallback to unrestricted table queries or identity/name grouping.
The old v1 RPC remains unchanged for deployed clients.

Before promotion, recheck that 057 is still free, reconcile the exact staging
ledger, and update release/recovery contracts explicitly. Old recovery evidence
must not be relabelled as evidence for the new schema.

Required guarded rollback-contained acceptance on approved staging only:

- Member/Admin/Super Admin active callers can read cross-class/cross-dojo rows.
- Anonymous, disabled and deceased callers denied; inactive/deceased targets and
  inactive classes excluded. Active/break enrolments included.
- One result per profile, including distinct people with identical names;
  multiple enrolments carry their own dojo and rank.
- Exactly four top-level keys and three enrolment keys; no contact, DOB, JS ID,
  profile UUID, attendance, finance or audit fields returned.
- Existing v1 function and management RLS/grants unchanged; no writes or provider
  calls. Independently compare zero-residue baselines, exact ledger and role ACLs.
- Repeat database-lint/security and guarded browser tests after deployment.

Dojo-only Admin management is a separate pending authorization hardening task:
existing class-only admin assignments may currently grant broader access. This
directory change does not claim to solve or verify that boundary.

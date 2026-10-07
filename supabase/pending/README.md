# Pending SQL — not an executable migration source

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

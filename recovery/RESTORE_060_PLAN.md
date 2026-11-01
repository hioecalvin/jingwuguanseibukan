# Recovery scope after finance migrations 059–060

Prepared offline, 14 October 2026. This plan authorizes no remote action.

The current source contract is 55 migrations, 006–060, with canonical repository
fingerprint `1fb8ea8facf8f4553d81d40f2ae808665290709a52367facd7a227be988ff8f2`.
Staging application and rollback-contained finance acceptance already passed;
neither is backup-and-restore evidence. Preserve all original backups, captured
ledgers, failed-attempt evidence and historical 006–058 recovery plans unchanged.

## Approval-dependent work

1. Capture a new encrypted, read-only backup of staging `eomubndonbetszdbhsrj`,
   including the exact full ledger, current catalog/data, roles/grants/RLS, Auth
   and Storage metadata/objects. Preserve all older archives and protect keys
   separately. Verify authenticated decryption and captured payload hashes.
2. Review a disposable restore target and isolation plan before any restore.
   Keep delivery, scheduled jobs, webhooks and Auth providers disabled. Never
   substitute production, the retired project, or an existing target without approval.
3. Restore only the reviewed new payload; independently compare data, full ledger,
   catalog, privileges and object bytes. Verify finance functions and role boundaries
   with isolated fixtures and exact cleanup. Require separate approval for any
   temporary Auth login test; do not reset passwords or send messages.
4. Disable Auth and stop/quarantine the target after verification (or on failure).
   Record measured RPO/RTO, target disposition, payload and evidence hashes using
   the current recovery manifest. Complete all managed-platform checks before
   claiming the recovery gate passes.

Old evidence must not be relabelled, truncated, or combined with synthetic test
results to claim a successful 006–060 restore. A local PostgreSQL fixture is useful
regression coverage but is not a managed Supabase recovery drill.

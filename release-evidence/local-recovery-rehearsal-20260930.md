# Local PostgreSQL recovery rehearsal — 30 September 2026

## Scope

- Source: staging project `eomubndonbetszdbhsrj` only.
- Target: disposable PostgreSQL 17.11 cluster bound to loopback on a non-default port.
- Production and the retired Supabase project were not contacted.
- Outbound email, push, webhooks and scheduled jobs were not invoked.
- Protected source dumps, object bytes, credentials and personal records are excluded
  from this repository evidence.

## Protected source evidence

- Encrypted database/Auth/Storage-metadata package SHA-256:
  `5c3ebb6079fbc8f1e0c8544bb78fca4b9e1b418c3020283dab6d40cb5d3d1ef2`.
- Exact 50-migration 006–055 ledger digest:
  `e76ad2f14c8a7723d335d6b57a7517cad01fa969358ca415355fd1b7bbc94ce4`.
- Deterministic 18-file source catalog: 4,146 objects, SHA-256
  `91dddeeadfb43b1d710dfa5574cb9d860a588ffbd103015aae01ffab27be2bd7`.
- Encrypted retained-Storage-object archive SHA-256:
  `ba7eecbd60e12ec9af6c25d7f6d99eefdd08506226df1066809a6299682b65f7`.
- Source inventory: 57 Auth users, 57 identities, two Storage buckets and one retained
  Storage object. No personal identity values or object bytes are recorded here.

## Restore results

- Exact counts restored: 67 public tables, 57 Auth users, 57 identities, two Storage
  buckets, one Storage object metadata row and 50 migration-ledger rows.
- The restored ledger is semantically exact from 006 through 055.
- After normalizing three captured owner ACLs, 17 of 18 catalog files and 4,145 of
  4,146 catalog objects matched canonically.
- The sole missing object is managed extension `supabase_vault` 0.3.1. The restore log
  contained exactly eight expected Vault-related errors and no unexpected error.
- The repository database-security verifier passed in a read-only transaction.
- Independent checks confirmed 75 RLS relations, 11 forced-RLS relations, 69 policies,
  16 captured roles, 22 captured memberships, and denial of the sensitive view to both
  browser roles.
- No subscription, replication slot, foreign server or `cron` schema existed on the
  restored target.
- The disposable cluster was fast-stopped and quarantined. Its PID file, listener and
  PostgreSQL processes were absent after shutdown.

## Explicit limitations

This local rehearsal does not prove managed Auth login/refresh, Storage API behavior,
managed Vault/encryption recovery, hosted redirect/template/provider configuration,
external scheduler definitions, or the final security suite on a managed Supabase
restore target. Those remain production blockers until a disposable Supabase project
slot is available. This evidence must not be used to claim a production backup or
production restore succeeded.

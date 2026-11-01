# Staging migration 046 acceptance evidence

Date: 25/09/2026 (Australia/Brisbane)

Target: staging project `eomubndonbetszdbhsrj` only

Production contact: none

## Reviewed migration

- File: `supabase/migrations/046_repair_last_training_audit_insert.sql`
- SHA-256: `61894AF224D2BFB9758D5C87FC65B49CE216DEC31CBC3DDE388B1169F948F35B`
- Pre-apply ledger: exact 006–045
- Dry run: migration 046 only; no seeds or roles
- Apply: migration 046 only
- Post-apply ledger: exact 006–046
- Post-apply dry run: up to date; no pending migrations

## Guarded acceptance

The single-statement PostgreSQL harness deliberately raises the exact final marker
`ROLLBACK-CONTAINED PASS: migrations 045-046 last-training acceptance`. That marker
was reached, atomically rolling back every test mutation.

Verified behaviors:

- Member denied from recording a session.
- Scoped Admin permitted for the assigned class/dojo.
- Jakarta server-date mark-today result and audit attribution.
- Same-date retry produces no duplicate audit row.
- Member getter returns only the caller's memberships.
- Valid backdated correction stores the requested effective date.
- Correction audit retains both previous and new dates plus the original actor.
- Repeated correction produces no duplicate audit row.
- Scoped Admin denied outside the assigned dojo.
- Future date rejected.
- Super Admin organization-wide path permitted.
- Inactive, pre-join and deceased targets rejected.
- RPC and private audit-table ACL assertions passed.

Independent pre/post snapshots matched exactly for staging security-test identities
0001 and 0101: active status retained, date of passing remained NULL, last-training
date remained NULL and audit count remained zero.

## Independent gates

- Supabase database lint: no schema errors.
- Authenticated staging security suite: 12/12 passed for Member, scoped Admin and
  Super Admin, with one-time-session cleanup confirmed.
- Local TypeScript and Node gate: 230/230 tests passed.
- ESLint: passed with no reported error or warning.
- Optimized Next.js production build: 44/44 routes generated.
- `git diff --check`: passed; line-ending notices only.

The strict multi-statement SQL verifier could not be rerun through the pinned CLI's
prepared-statement query command. The previously documented platform-owned default-
privilege finding remains a separate release decision and was not weakened.

No passwords, tokens, connection strings, private keys, personal member data or raw
provider responses are stored in this evidence file.

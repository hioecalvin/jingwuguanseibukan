# Supabase schema and migration reconciliation

Last updated: 31/08/2026 (Australia/Sydney); catalog captured 30/08/2026.

## Decision

The linked project is not a staging environment and must not receive the
pending migrations during testing. Production is `js-repository`
(`pkmllhaavadhaozmwapz`). A separate Free staging project now exists:
`js-repository-staging` (`eomubndonbetszdbhsrj`, Sydney/ap-southeast-2).
It still requires data-location consent, protected access and a fresh, isolated,
proved backup restore before any pending migration can be applied there.
Historical single-project inventories below describe their original audit times.

The catalog evidence in this review was collected with Management API queries
using `read_only: true`. No database row, schema object, grant, policy, or
migration-history entry was changed.

## Verified remote migration history

The remote `supabase_migrations.schema_migrations` ledger contains:

| Version | Name | Local comparison |
| --- | --- | --- |
| 006 | monthly_subscription_notifications | Exact match: 7 statements |
| 007 | member_payment_confirmation | Exact match: 19 statements |
| 008 | member_subscription_history | Exact match: 3 statements |
| 009 | dojo_admin_receiving_account_helper | Exact match: 3 statements |
| 010 | announcement_event_notifications | Exact match: 14 statements |

The comparisons are statement-for-statement SHA-256 checks using a
PostgreSQL-aware splitter. Existing remote history must not be renamed,
repaired, or replayed.

Migrations 011–016 are local-only and have not been applied. Root-level files
`migrations/004_finance_module.sql`,
`migrations/004_subscription_module.sql`, and
`migrations/005_settlement_module.sql` do not appear in the remote ledger.
They are not a safe migration chain: the two 004 files overwrite shared
functions, current live function bodies have subsequently diverged, and these
three local function definitions are absent from the live schema:

- `normalise_subscription_billing_month()`;
- `set_class_subscription_rate(uuid, numeric, text)`;
- `generate_monthly_subscription_charges(date)`.

The recorded 006 migration defines three notification functions that are now
absent from the live catalog: `notify_monthly_subscription_charges`,
`notify_unpaid_subscription_reminders`, and
`generate_and_notify_monthly_subscriptions`. The latter two are still called by
the Admin subscription UI. Migration 016 restores this drift without replaying
006 or editing its verified history. A name-presence scan is not signature or
workflow verification; concurrency and notification counts must pass in staging.

Do not move, rename, or insert 004/005 into the active migration directory.
First capture a restorable baseline and prove a clean staging restore.

## Read-only live catalog inventory

The public/storage catalog export captured:

- 60 tables, views, materialized views, and sequences;
- 711 columns;
- 168 indexes;
- 275 constraints;
- 16 non-internal triggers;
- 78 RLS policies, including storage policies;
- 1,614 relation ACL entries;
- 179 routines and 746 routine ACL entries;
- 76 public/storage types;
- 9 default-privilege records;
- installed extensions and publication membership.

No JWT, Supabase secret key, Resend key, or credential-bearing database URL was
found in the export. The normalized profile duplicate preflight returned zero
Member ID collisions and zero email collisions at the audit time. This must be
rerun against the staging clone immediately before migration 012.

The catalog export is comprehensive review evidence for public/storage objects,
but it is not a restorable `pg_dump`. Portable PostgreSQL 17.11 clients are now
available in the workspace tools directory. A protected backup connection and
verified restore are still required before any Supabase migration.

## Live security findings

- `admin_visible_members`, `document_archive`, and `certificate_archive` are
  owner-executed views with browser SELECT grants.
- `admin_visible_requests` is already `security_invoker=true`, but still has an
  anonymous grant.
- 149 of 179 routines are `SECURITY DEFINER`; all 149 have a fixed public
  `search_path`.
- Before migration 014, 132 definer routines are executable by `anon`, 131 by
  `authenticated`, and 86 through `PUBLIC`.
- Internal scheduled transfer/break processors and arbitrary notification
  helpers lack caller authorization and must be service-only.
- Caller helper functions accept arbitrary user UUIDs, allowing role/scope
  probing unless bound to `auth.uid()`.
- PostgreSQL default privileges auto-expose new public tables, sequences, and
  functions to browser roles.
- The hosted `postgres` role cannot alter `supabase_admin` default privileges.
  Application objects must therefore be created as `postgres` with explicit
  grants; changing the platform-owned defaults requires an authorized
  owner-level mechanism.

Migration 011 addresses the exposed views. Migration 013 makes payment tables
RPC-only. Migration 014 binds caller helpers, revokes public/anonymous access
from every definer routine, makes internal processors service-only, and removes
unsafe `postgres` defaults.
The default-function revoke is global as well as schema-specific; PostgreSQL's
global PUBLIC EXECUTE default cannot be removed with `IN SCHEMA` alone.
Migration 014 also pins temporary-schema lookup after public; 015 and 016 retain
that order. Platform/storage-owner defaults are not silently modified.

## Live database lint findings

`supabase db lint --linked --level warning` found runtime errors in nine
functions:

- repository-content create/update enum assignments;
- grading promotion enum assignment;
- settlement approval writing obsolete archive column names;
- latest-title and latest-rank certificate lookup ambiguity;
- invitation token generation using an unqualified extension function;
- return-from-break parameter ambiguity;
- enrollment reading a removed `profiles.member_id` column.

It also found unused variables in the receiving-account and fee-adjustment
functions. Migration 015 was generated from the exact read-only live function
definitions and repairs all nine errors plus the warnings. It must still pass
staging migration execution, database lint, and functional tests.

## Baseline reconciliation procedure

1. Create a staging project/branch from a fresh production backup.
2. With PostgreSQL 17 client tools or Docker, capture roles, schema, and data
   dumps plus `supabase_migrations.schema_migrations`.
3. Store a secret-free immutable pre-011 schema baseline outside the active
   migration chain; scan it for credentials and ownership statements.
4. Restore that baseline to an empty disposable database and restore the exact
   006–010 migration ledger.
5. Confirm `supabase migration list --db-url $env:STAGING_DB_URL` reports 006–010
   on both sides and only 011–016 as local pending migrations. Never use the
   source directory's production link for staging commands.
6. Do not replay root 004/005. Retain them as legacy evidence until their
   tables/functions are represented by the verified baseline.
7. Run `supabase db push --db-url $env:STAGING_DB_URL --skip-vault --dry-run`
   against staging and review every statement.
8. Apply 011–016 to staging only, then run database lint, the security suite,
   authenticated workflows, and row-count/audit-history comparisons.

Only after a clean restore and all staging gates pass can the baseline and
legacy SQL layout be consolidated for a future clean-room migration history.

## Milestone 14 supplemental SQL validation

The unchanged 014 migration executed in a synthetic PostgreSQL 17.11 fixture;
runtime ACL, default-grant, caller binding, scope and pg_temp assertions passed.
This fixture used three synthetic tables, stub internal/trigger routines and
test JWT-setting helpers. It is not the restored live schema or Supabase Auth.
It validates selected 014 behavior only; 011–013, 015 and 016 remain unexecuted,
and no pending migration was applied to a Supabase project.

The exported platform defaults comprise three supabase_admin-owned public-schema
ACL records: tables and sequences grant all privileges to anon/authenticated;
functions grant EXECUTE to them. In addition, PostgreSQL's built-in global
PUBLIC EXECUTE applies when the owner has no overriding global default ACL.
The fixture confirms one owner's global revoke does not fix another owner.
The postgres-owned storage-schema defaults also remain unchanged deliberately;
review these with the platform owner before changing managed Storage behavior.

## Milestone 16 frontend continuation

All migration SQL and the retained catalog evidence remain unchanged. No new
database connection was made, and no migration was executed in this continuation.
The new registration catalog/race checks are client-side behavior only; they do
not establish schema correctness, RLS, Auth registration/approval or a restored
baseline. Supabase migrations 011–016 remain unapplied. The protected complete
backup, restore rehearsal, verified staging target and platform-owner default
grant remediation remain release blockers.

## Milestone 18 — inventory refresh, no schema execution

Read-only Supabase CLI 2.116.0 project/branch discovery again returned only live
project pkmllhaavadhaozmwapz (PostgreSQL 17.6.1.155) and an empty branch list.
The unlinked workspace was not linked to production or relabelled as staging.
No database SQL or migration command was executed. The prepared 011–016 files,
verified 006–010 history and root legacy SQL remain unchanged.

The new browser mocks and navigation fixture contain fictional rows and no
database. Their passes cannot validate schema restoration, duplicate preflight,
SQL runtime behavior, grants/RLS, payments or subscription concurrency. The
three supabase_admin-owned default ACL records, global PUBLIC EXECUTE ownership
limitation and postgres-owned storage defaults remain as documented above.
Only an authorized owner/platform mechanism may remediate them after review.

Continue with protected full backup/restore, explicit staging identity, fresh
duplicate checks, reviewed dry-run and only then staging 011–016. Do not replay
the audit, reconstruct a baseline from mocks or treat catalog JSON as a backup.

## Milestone 20 — unchanged database boundary

Only read-only project/branch discovery was repeated: pkmllhaavadhaozmwapz remains
the sole accessible project and no branch was returned. No SQL was queried,
edited or applied. The skip-link accessibility correction and isolated keyboard
diagnostic provide no database, restore, Auth or RLS evidence. The verified
006–010 history, pending 011–016 and documented platform-owner limitations are
unchanged. Continue from the existing reconciliation once protected backup and
separate staging access are supplied; do not restart or replay completed history.

## Milestone 21 — environment refresh, SQL unchanged

Read-only project and branch listings again returned only pkmllhaavadhaozmwapz,
in ap-south-1, and no branches. No database connection, SQL query, migration, backup
or restore ran. Pending 011–016, verified 006–010 and the platform-owner default
grant limitations are unchanged. New local HTTPS test support adds no schema or
recovery evidence. A separate staging project and protected full backup/restore
remain prerequisites; neither connector access nor browser tests replace them.

## Milestone 22 — backup authority granted, connection still missing

Protected read-only production export and isolated staging restoration/testing are
now authorized, but no backup connection, protected destination or separate staging
target was supplied. Project/branch discovery still shows only live
pkmllhaavadhaozmwapz and no branches. No SQL, backup, restore or migration ran.
Pending 011–016 and verified 006–010 are unchanged; root legacy SQL was not replayed.
Node HTTPS transport evidence does not establish database recovery or authorization.
Platform-owner default-grant remediation and the complete staged acceptance remain
mandatory. See release-evidence-20260831-https-validation/ENVIRONMENT_STATUS.md.

## Milestone 23 — supplemental migration-016 runtime evidence

The exact 016 file was executed only in new fictional PostgreSQL 17.11 clusters
on 127.0.0.1:55441, not on either Supabase project. Twenty baseline checks passed;
two DateStyle-specific dedupe/lock checks failed. Explicit YYYY-MM-DD formatting
for all three month locks and the daily reminder key repairs those failures; all
22 checks then pass. History 006–010, other pending migrations and live catalog
evidence remain unchanged. No live notification row or key was rewritten.

Fixture Auth, finance scope, notification insertion and charge generation are
minimal test dependencies, not reconstructed production functions. This evidence
does not complete schema baseline, lint, RLS, Auth, backup/restore or staging gates.
Use the new 016 hash from the subscription-hardening final manifest for subsequent
review; older prepared copies have been superseded locally, not applied remotely.
Review existing non-ISO reminder keys and session timezone before a real release.

## Milestone 30 — restored staging state and pending ACL repair

Sydney staging `eomubndonbetszdbhsrj` was restored from the protected
production-derived recovery package and then advanced with reviewed migrations
011–016. Its migration ledger now records exactly 006–016; production remains
unchanged. The restored baseline includes public/Auth/Storage schema and data while
sessions and tokens were excluded and outbound Auth/Edge delivery stayed disabled.

Database lint after 016 found error 42883 in `create_member_invitation`. Prepared
migration 017 qualifies `extensions.digest` and `extensions.gen_random_bytes`.
The post-016 catalog also shows that the ACL-free restore omitted the authenticated
SELECT/EXECUTE grants needed by the application while inherited browser relation
ACLs still expose `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN`.

Prepared migration 018 replaces those inherited privileges with explicit table,
view and routine allowlists, grants no browser sequence privileges, and keeps the
six worker/password routines service-role-only. It also adds the scoped
`membership_grade_history` SELECT policy required by the security-invoker admin
view. Static checks resolve all referenced relations/routines. An exact dry run
selected only 017–018, and a transaction rehearsal applied both, passed ACL/policy
assertions and rolled back to the exact 006–016 prestate.

Neither 017 nor 018 is applied. Their staging application requires separate explicit
approval. After application, rerun lint, the strengthened database verifier and the
complete role security suite. The existing platform-owned `supabase_admin` default
ACL finding remains a release gate and was not weakened or waived.

## Milestone 31 — staging reconciled through 018

Sydney staging migration history now records exactly 006–018. Migrations 017 and 018
were the only files selected and applied; verified 006–010 and previously applied
011–016 were not replayed. Migration 017 qualifies the invitation digest/random-byte
dependencies. Migration 018 replaces current browser ACL inheritance with reviewed
relation/RPC allowlists and adds the scoped grading-history policy.

Independent post-apply catalog assertions, a clean database lint and the 12/12 role
suite confirm the current schema behavior. The remaining schema-security mismatch is
outside migration ownership: hosted `supabase_admin` default privileges for future
global/public objects. Project `postgres` cannot reconcile another role's defaults.
Keep that item open for a supported platform-owner action or explicit release-risk
decision. Production history is unchanged; no production migration was applied.

## Milestone 32 — migration 016 hosted-runtime reconciliation complete

The exact applied migration-016 hash now passes its required hosted staging runtime
matrix. Concurrent calls share the dojo/month advisory lock across normalized dates
and DateStyle settings; charge and notification dedupe behavior, payment sums,
status exclusions and wrong-dojo/member denial match the reviewed implementation.
The final ledger remains exactly 006–018.

The synthetic class, two dojos, seven memberships, finance assignment, rate, charges,
payments and notifications were removed after the test and zero-count cleanup was
verified. Production schema/history remains unchanged. The only open database-wide
release finding is the separately documented platform-owned future-object default
ACL, plus any defects found by the remaining business workflow acceptance.

## Milestone 33 — staging reconciled through 019

Sydney staging now records exact migration history 006–019. Migration 019 was the
only pending file selected and applied; 006–018 were not replayed. It reconciles the
two membership status RPCs with the existing enabled trigger so each status change
has one future history writer. It does not remove or rewrite historical data.

Read-only post-apply catalog checks prove both redundant explicit inserts are gone,
the trigger remains enabled, function search paths and grants match the reviewed
definition, and the database contains zero exact historical duplicate groups. Public-
schema lint is clean and the hosted workflow fixture proves one break row and one
return-active row. Cleanup returned all synthetic tables/outbox entries to zero.

Production schema and migration history remain unchanged. The remaining database-
wide reconciliation issue is still the hosted `supabase_admin` future-object default
ACL, which is owned outside project migration authority. All other untested business
workflows remain acceptance items rather than known schema mismatches.

## Milestone 35 — staging reconciled through 020

Sydney staging now records exact migration history 006–020. Migration 020 was the
only newly applied file. It makes `request_admin_dojo_transfer_batch` a hardened
compatibility wrapper over `request_bulk_dojo_transfer`, closing the confirmed
partial-batch acceptance defect without rewriting 006–019.

Post-apply catalog assertions, clean database lint and the 20/20 hosted transfer
suite confirm atomic ID validation, notification deduplication, scope enforcement,
scheduler idempotency, cancellation, failure/retry recovery and transfer history.
The fixture rolled back with zero residue and the 12/12 role security smoke passed.

Production schema and history remain unchanged. The platform-owned future-object
default ACL and untested OPEN workflow/operational gates remain unreconciled release
items.

## Milestone 36 — pending payment reconciliation 021

Hosted staging exposed behavioral drift in the current payment routines: direct
official payments did not enforce the remaining balance or closed charge state, and
confirmation reviews omitted Member result notifications. Prepared migration 021
reconciles both routines while preserving signatures, linked-payment uniqueness,
scope checks and fixed search paths.

A transaction-only staging rehearsal passed the full 19-case payment matrix and
rolled back to exact history 006–020. Migration 021 is not yet part of the active
staging ledger or integrated source.

## Milestone 37 — staging reconciled through 021

Migration 021 is integrated and committed only on Sydney staging. The exact active
history is now 006–021; migrations 006–020 were not replayed or rewritten. Runtime
assertions confirm both repaired function definitions, fixed search paths, owners,
browser/service ACLs, overpayment rejection and Member-result notification logic.

Database lint is clean and the full rollback-contained payment acceptance suite
passes 19/19 on the committed schema with zero residue. The hosted
`supabase_admin` future-object default ACL remains the only strict-verifier schema
gate. Production schema and migration history remain unchanged.

## Milestone 38 — pending settlement overload reconciliation

Staging remains at exact migration history 006–021. Its catalog contains both
`set_dojo_settlement_transfer(uuid,date,text,text)` and the legacy
`set_dojo_settlement_transfer(uuid,date,text,text,text)`; the latter defaults its
final two parameters, making the frontend's four-field RPC request ambiguous.

Prepared migration 022 preflights both signatures and the legacy default count,
drops only the five-argument overload, preserves the four-argument function with a
fixed `public, pg_temp` path, and reasserts authenticated/service-only execution.
The migration and regression test pass locally but remain working-copy-only and
unapplied. All staging acceptance attempts rolled back, so active history is still
006–021. Production was not contacted.

## Milestone 39 — forward sequence through 024

The reconciled candidate resolves the parallel-branch numbering conflict without
rewriting applied history. Migrations 019–021 retain their source/staging meanings;
022 remains the prepared settlement overload repair; the unapplied legacy-email
bridge and repository-video pipeline are renumbered to 023 and 024. Their SQL bodies
are unchanged except for the previously tested late-webhook deletion guard in 024.

Staging remains at exact history 006–021. Before applying anything, compare hashes,
require a dry run selecting only 022–024, and verify no old
`019_route_legacy_notifications_to_email_outbox.sql` or
`020_repository_video_pipeline.sql` filename is present in the release package.

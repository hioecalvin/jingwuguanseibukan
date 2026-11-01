# Security and migration audit

Last updated: 2026-09-18 (Australia/Brisbane); staging catalog evidence: 2026-09-18.

## Release decision

The application passes lint, TypeScript, 148 Node regressions, its 41-route
production build, and the 138-case Chromium/WebKit browser suite. Sydney staging
is healthy at exact migration history 006–036; database lint and the 12/12
Member/scoped Admin/Super Admin security smoke pass. The application is **not ready
for production release** because 42 browser-executable privileged workflows still
need explicit semantic evidence, platform-owned future-object defaults remain
unsafe, and provider/recovery/production operational gates remain open. Production
was not contacted during the current catalog review.

The first semantic tranche confirmed that the textual inventory understated real
issues: authenticated direct INSERT on `dojo_transfer_requests` bypasses the
validated request RPC, several older helpers omit current Break states, transfer
notifications use obsolete class-role routing, and the legacy Break admin RPC can
restart a retained Break at month one. Migration 037 repairs these boundaries and
passes static/local gates, but is prepared only. Its guarded rollback-contained
staging rehearsal has not been authorized or run; staging remains 006–036.

## Current staging security status

The fresh read-only 006–036 catalog contains 176 public routines, including 161
`SECURITY DEFINER` routines and 108 browser-executable definers. All 161 have fixed
`public, pg_temp` search paths; zero are executable by `PUBLIC` or `anon`. All public
tables have RLS, 69 public policies are present, and browser roles hold zero direct
`TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN` privileges.

Existing workflow and regression evidence references 66 of the 108 browser
definers. Forty-two require a new direct evidence reference; one additional wrapper,
`request_admin_dojo_transfer_batch`, delegates authorization to the reviewed atomic
`request_bulk_dojo_transfer` implementation. These are coverage gaps, not confirmed
authorization defects. The semantic-security checklist remains open until successful
in-scope and denied cross-scope behavior is proved.

Three unsafe `supabase_admin` public default-ACL rows remain for future tables,
sequences and functions. The read-only audit role and project `postgres` role cannot
manage those platform-owned defaults. Current application objects remain explicitly
hardened, but the future-object default gate is not waived.

## Historical production baseline findings (30/08/2026)

The dedicated Member, scoped Admin, and Super Admin accounts can authenticate.
The aggregate read-only smoke suite produced these results:

- PASS: Member, Admin, and Super Admin role checks.
- FAIL: Member account can read 56 foreign rows from `admin_visible_members`.
- FAIL: scoped Admin can read 53 out-of-scope rows from
  `admin_visible_members`.
- FAIL: Member account can directly read `document_archive`.
- FAIL: Member account can directly read `dojo_receiving_accounts`.
- PASS: `email_outbox` and other users' push-subscription metadata are private.
- PASS: a Member cannot invoke `set_grading_assessor_status` successfully.

Migration 011 addresses the member/admin view and archive-view findings.
Migration 013 addresses the receiving-account and payment-confirmation table
exposure. These claims must be rerun after applying migrations in staging.

The complete read-only public/storage catalog review additionally found 149
`SECURITY DEFINER` routines. Every one has a fixed public `search_path`, but 132
are executable by `anon`, 131 by `authenticated`, and 86 through `PUBLIC`.
Internal scheduled processors and notification helpers are among the exposed
functions. Migration 014 removes that exposure, binds caller-identity helpers,
and hardens `postgres` default privileges.
The resumed review additionally makes `pg_temp` explicit and last. A fixed
`public` path alone permits implicit temporary-schema precedence. Migration 015
preserves that hardened ordering when replacing functions.

`supabase db lint --linked --level warning` reports runtime errors in nine live
functions covering repository content, grading, settlement archive, invitation,
enrollment, break-return, and certificate workflows. Migration 015 repairs the
exact live definitions and two additional warning-only functions. None of these
repairs has been applied or staging-validated.

## Checked-in schema coverage

The repository is not a complete database baseline. The application references
many RPCs whose definitions are not checked in, including registration review,
grading, titles, certificates, archive search, transfers, enrollment, break
requests, audit history, email worker, push subscriptions, and repository
content functions. The live API also contains substantially more relations and
functions than the checked-in SQL.

Additionally, finance/subscription migrations are split between `migrations/`
and `supabase/migrations/`, and two unrelated files share the `004` prefix.
That layout is not a deterministic Supabase migration chain. Obtain a schema-only
dump and `supabase_migrations.schema_migrations` history before consolidating or
renaming any existing migration.

The remote ledger now proves that versions 006–010 match the checked-in files
statement-for-statement. Root 004/005 remain unrecorded legacy evidence and must
not be replayed. See `SCHEMA_RECONCILIATION.md` for the verified inventory and
baseline procedure.

## Migration review

### 011 — security view hardening

Prepared and required. It changes `admin_visible_members` and
`admin_visible_requests` to caller-invoker semantics, removes anonymous access,
removes browser access to archive implementation views, and revokes direct
execution of notification trigger helpers. It does not modify application rows.

Apply first in staging, then rerun the full role smoke suite. Confirm the Admin
UI still receives only assigned dojo/class rows and archive searches still work
through scoped RPCs.

### 012 — profile identity constraints

Prepared but requires data preflight and a maintenance window. It now fails with
a clear exception if normalised Member IDs or emails collide. It creates unique
expression indexes, normalises identity fields before writes, and prevents a
non-Super user from changing an assigned Member ID. It does not auto-merge or
discard duplicate profiles.

The unique-index build is transactional, not concurrent, so it can lock writes
to `profiles` while indexes are built. Apply only after the duplicate queries
return no rows and after confirming the exact `is_super_admin(uuid)` signature.

### 013 — payment-confirmation RLS hardening

Prepared after this audit found migration 007 created sensitive payment tables
without RLS/grant hardening. It enables RLS, makes both tables RPC-only for
browser roles, preserves service-role access, and removes anonymous execution of
the seven scoped payment RPCs. Apply after confirming migrations 007 and 009 are
present in the target schema.

### 014 — SECURITY DEFINER caller hardening

Prepared after full catalog/ACL review. It binds role/scope helper UUIDs to the
JWT caller, revokes PUBLIC/anonymous execution from all definer routines, makes
internal processors service-only, and removes browser grants from future
`postgres`-owned public objects. It explicitly revokes GLOBAL default function
execution from PUBLIC/anon/authenticated, as well as schema-level defaults:
a per-schema revoke cannot remove the built-in global PUBLIC grant.
See [PostgreSQL default privilege rules](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html)
and [safe definer search paths](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
The hosted `postgres` role cannot alter
`supabase_admin` defaults; that platform-owned residual must be handled through
an authorized owner-level mechanism.

### 015 — live runtime function repairs

Prepared from exact read-only live definitions. It fixes all functions reported
by the current database lint result without reconstructing them from the
incomplete root migrations. Staging must prove migration syntax, clean database
lint, and the affected workflows.

### 016 — missing subscription-notification RPC repair

A literal-name scan found 106 application RPC names and two absent ones:
`generate_and_notify_monthly_subscriptions` and
`notify_unpaid_subscription_reminders`. Their helper
`notify_monthly_subscription_charges` is also absent. All three are defined in
the verified 006 history. Migration 016 restores their historical bodies with
explicit caller grants, `public, pg_temp`, non-null inputs, and a shared
dojo/month transaction lock before dedupe/generation. The original finance
scope and per-charge/day notification rules are retained. The verified 006
file and ledger remain unchanged. This is prepared, not applied or runtime-tested.

### Test-runner and public-form fixes (31/08)

- Explicit staging/production-read-only modes and expected-host confirmation
  prevent an accidental production mutation probe.
- Only SQLSTATE 42501 counts as a read denial; network/schema-cache failures fail.
- The staging mutation probe must return a known authorization denial, not merely
  an absent-member error. Auth cleanup signs out only the test's own sessions.
- Member view pagination detects truncation and changing fixture counts.
- SQL attribute tests cover inline attributes, comments, dollar bodies, unsafe
  paths, and the global default-privilege requirement.
- Login/registration controls have associated labels and live result regions.
  The browser confirmed the original registration had eight unlabelled controls.

The all-function search-path/ACL inventory and targeted caller review are not a
completed semantic proof of all 149 routines. Full staged authorization and
business-workflow coverage remain release requirements.

## Required staging verification

### Additional local evidence — milestone 14 (31/08)

Twelve actual-handler unit tests now cover email queue/acknowledgement errors,
provider retry keys, the batch cap, authentication, own-user push RPCs, malformed
JSON, and exception-response privacy. Eight assertions failed before the fixes;
all twelve pass afterward. No real Auth, database, email or push service is used
by these tests. Email worker failures now return non-2xx status with counters;
unexpected password errors no longer expose internal exception messages.

The exact pending migration 014 was executed successfully under PostgreSQL
17.11 in a synthetic, loopback-only fixture. Runtime assertions confirm global
PUBLIC EXECUTE revocation (including a second schema), existing definer ACLs,
new public table/sequence defaults, all six helper impersonation denials, valid
scoped access, wrong-dojo denial and protection against a temporary profiles
table. A function created by another owner still inherits PUBLIC EXECUTE: the
fixture deliberately demonstrates, rather than hides, that residual risk.
This is limited SQL unit coverage, not proof against the complete hosted schema.
No migration has been applied to Supabase. All staging requirements below remain.

### Frontend safeguards — milestone 16 (31/08)

Registration submission now requires a successfully loaded catalog bound to the
currently selected class, and a valid listed dojo when one is required. Stale
responses are ignored; failed catalogs cannot masquerade as an empty successful
lookup. Login/signup catch unexpected exceptions with generic recovery messages.
Fourteen isolated component-logic/accessibility tests were added; the total is
49 regressions. These client checks are usability safeguards, NOT authorization
boundaries. All server identity, RLS, approval and RPC checks remain mandatory.

No live database checks, migration applications or authenticated browser tests
were performed in this frontend continuation. The synthetic browser backend was
blocked by the browser client; its Auth/catalog counters stayed zero. No security
headers or network restrictions were weakened. The known live findings, pending
011–016, platform-owner default grants and required staging matrix remain open.

1. Take a schema-only dump, migration-history export, and database backup.
2. Run the duplicate Member ID/email preflight from migration 012.
3. Apply 011–016 in order to a staging clone.
4. Rerun `npm run test:security`; every check must pass.
5. Run authenticated browser tests with dedicated Member, scoped Admin, and
   Super Admin accounts.
6. Exercise mutation workflows only in staging: approval/rejection/reapplication,
   password reset/outbox, grading, titles, certificates, transfers, payment
   confirmations, subscriptions, settlements, and notification fan-out.
7. Compare row counts and audit history before and after each workflow.
8. Only then schedule the production migration window and repeat the smoke tests.

## Milestone 18 — browser CI evidence and unchanged release blockers

Added 85 isolated browser test instances and three environment-guard regressions.
Backend calls are intercepted and answered from fictional data, sessions start
empty, service workers are blocked, and unexpected/external requests fail the
test. Navigation roles are presentation fixtures, not impersonated Auth claims.
No real API keys, database credentials or provider secrets enter these tests.
The CI workflow is checked in locally only; no GitHub execution is claimed.

Current full local browser result is 75 passes and 10 failures, not a security
or release pass. WebKit's nine public-page failures are blocked by HTTPS asset
upgrades; its skip-link keyboard traversal also remains unresolved. The CSP,
TLS verification and in-app browser restrictions were preserved. The remaining
seven WebKit navigation cases and all Chromium/Firefox cases passed, including
axe scans on the selected surfaces. This does not prove screen-reader usability,
Safari/device compatibility, authenticated authorization or database isolation.

Fixed navigation contrast/focus and disclosure sign-out error visibility based
on failing browser assertions. Distinct auth-page titles aid orientation.
These changes do not alter Auth, RLS or grants. No SQL was edited/applied.
Read-only inventory again found only pkmllhaavadhaozmwapz and no branches;
complete protected backup, verified restore, non-production credentials and
platform-owner default-grant remediation remain outstanding.

## Milestone 20 — keyboard correction, no authorization change

Explicit tabIndex={0} makes the skip link participate in this WebKit engine's
sequential keyboard navigation without a browser setting change or programmatic
focus in the test. The existing native-keyboard browser case passes; one new
source regression brings the Node total to 53. The full working browser result
is 76 passed / 9 failed. All remaining failures are WebKit public-page checks
blocked by HTTPS asset upgrades on the HTTP-only local server; none is waived.

This change does not alter Auth, RLS, grants, SQL or backend behavior. No database
query/migration or production mutation ran. Read-only project discovery again
returned only the known live project and no branches. Prior live findings and
all staging, backup/restore, owner-grant and real role/workflow gates remain open.

## Milestone 21 — HTTPS runner support, not a security release

Optional HTTPS keeps the isolated runner on fixed loopback ports with unchanged
mocked backend boundaries. Explicit certificate/key/public-CA paths are required;
invalid or incomplete setup fails before browser/build work. Private key content
is never logged, files must be outside the repository, and browser/server readiness
certificate verification remains enabled. The runner does not install trust; adding
the provided CA to child Node trust occurs only in explicitly enabled HTTPS mode.
Browser trust and protected Windows key ACLs remain operator responsibilities.

Eight new guards and five offline synthetic certificate assertions pass. Offline
parsing is not a trusted handshake or browser pass. No trust changes occurred and
the nine known WebKit HTTP/CSP failures are not waived. No Auth, RLS, grant or SQL
change was made. Supabase still lists only production; backups and real staged
authorization remain blocked. Verified GitHub connector access does not authorize
publishing the dirty worktree or imply a remotely executed CI workflow.

## Milestone 22 — real TLS transport, unchanged security blockers

Five actual HTTPS checks pass with explicit Node-client trust and normal certificate
verification, including all 14 login assets and negative untrusted/wrong-host cases.
This proves the existing app/fixture HTTPS transport, not browser trust or Auth/RLS.
The CurrentUser trust attempt stalled and was interrupted before browser execution;
the exact entry remained absent and generated keys were removed. No machine-wide
trust, security-dialog automation, TLS bypass, CSP change or test waiver occurred.

No application or SQL implementation changed. Supabase 011–016 remain unapplied and
all known live authorization findings remain release blockers. Only live Supabase is
accessible; complete protected recovery and staging acceptance are still required.
GitHub publication is now authorized subject to isolation, but a real Vercel status
shows external automation; deployment-rule access is required before any push/CI.
Full browser/security suites were not rerun against unchanged missing prerequisites.
See release-evidence-20260831-https-validation for precise results and cleanup.

## Milestone 23 — subscription DateStyle defect reproduced and repaired

The exact pending migration 016 initially passed 20 synthetic PostgreSQL checks
but failed two: ISO and SQL/DMY sessions generated different text for the same
month/day. Consequently, one session did not wait on the other session's advisory
lock, and a same-day retry created duplicate reminders. PostgreSQL documents that
date output varies with [DateStyle](https://www.postgresql.org/docs/17/datatype-datetime.html#DATATYPE-DATETIME-OUTPUT).

The three lock keys and daily reminder key now format their date as YYYY-MM-DD
explicitly. Existing ISO keys are retained; no notification data/history is
rewritten. All 22 synthetic runtime tests pass after the change, and a new source
regression guards the four conversions. These tests use READ COMMITTED transactions
and UTC sessions, with fictional Auth/scope and charge-generator/notifier stubs.
They do not prove hosted authorization, real payment-writer concurrency, alternate
transaction isolation, timezone policy or actual external delivery.

Before staging promotion, review existing reminder-key formats and database/session
timezone configuration. If non-ISO historical keys exist, stop for a reviewed
compatibility plan; do not silently rewrite records or claim duplicate prevention
for unreviewed historical keys. Repeat the real functional/concurrency matrix after
restoring the complete schema. Verified migration 006 is unchanged.

The selected Free Sydney staging project is healthy at the latest access check;
production-copy location consent and protected database credentials remain missing.
Preview automatic branch deployments are OFF, but shared production secret scopes
remain a publication blocker. No production mutation, Supabase migration, real
security test or release occurred. New evidence is in the subscription-runtime
and subscription-hardening directories; all original release gates remain open.

## Milestone 30 — real staging Auth/RLS and ACL findings

The restored staging database now contains migrations 006–016. Dedicated restored
dummy Member, scoped Admin and Super Admin accounts were authenticated without
enabling email/phone providers: guarded admin-generated magic-link tokens were
consumed locally, no message was delivered, and Auth/Edge outbound isolation was
rechecked before and after. The 12-check suite executed and failed nine checks;
this is retained as a failed security result, not reported as a pass.

The post-016 catalog identifies the root cause. Browser relation ACLs contain
`TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN`, operations outside RLS row
filtering, while restored base-table SELECT and most browser-RPC EXECUTE grants are
absent. Migration 014 intentionally revoked PUBLIC/anon access from definers but
could not reconstruct authenticated grants omitted by the `--no-acl` restore.

Prepared migration 018 establishes an explicit allowlist: blanket browser revokes,
policy-backed relation operations, no browser sequence access, explicit browser RPC
names, and service-role-only server worker/password routines. The database verifier
now fails on any browser `TRUNCATE`/`REFERENCES`/`TRIGGER`/`MAINTAIN`, public-sequence
access, or authenticated execution of those server-only routines. Its existing
`supabase_admin` default-ACL release gate was not weakened.

Migration 017 fixes the separate confirmed database-lint failure. Both 017 and 018
pass static regressions, dry-run selection and a staging transaction rehearsal with
rollback; neither is applied. After explicit staging approval, apply only 017–018,
rerun database lint/verifier and all role checks, then investigate every remaining
failure. Production remains untouched and unapproved.

## Milestone 31 — current-object ACL verification passed; platform defaults blocked

Migrations 017 and 018 are now applied only to Sydney staging. Independent read-only
verification proves history 006–018, no browser dangerous relation privileges, no
browser sequence privileges, expected public catalog access, authenticated profile
and helper access, and denial of archive/server-worker access. Database lint reports
no public-schema errors.

The unchanged authenticated suite passes 12/12 using restored dedicated dummy Member,
scoped Admin and Super Admin accounts. It verifies user/dojo isolation, payment and
delivery privacy, caller-safe role/finance/rate helpers and privileged RPC denial.
All temporary sessions were cleaned up; Auth delivery and Edge outbound surfaces
remained disabled.

The strict SQL verifier intentionally remains nonzero because 15 `supabase_admin`
default ACL records contain 72 browser-facing entries. The hosted project `postgres`
role cannot alter platform-owner defaults. This affects future objects, while 018
secures current application objects. Do not remove the gate or infer that RLS alone
controls privileges such as TRUNCATE/REFERENCES/TRIGGER/MAINTAIN. Seek a supported
platform-owner resolution and rerun the exact verifier afterward; any exception
requires an explicit documented security decision before production.

## Milestone 32 — subscription RPC caller and concurrency acceptance

The exact migration-016 functions passed 10/10 hosted staging checks with real
`authenticated` role claims. Member and wrong-dojo callers were denied without data
change. Authorized Admin sessions serialized on the same transaction advisory lock
across normalized dates and `ISO, MDY`/`SQL, DMY` settings. Concurrent charge,
monthly-notification and unpaid-reminder retries created no duplicate dedupe keys.

Payment metadata correctly represented no payment and a summed IDR 40 partial payment
as IDR 100 and IDR 60 outstanding. Fully paid, overpaid, waived and cancelled cases
did not receive unpaid reminders; waived/cancelled charges did not receive monthly
charge notices. Same-day retry returned zero. All synthetic objects were removed,
outbound surfaces remained disabled and the 12/12 role suite passed again afterward.

The separate `supabase_admin` future-object default ACL blocker remains unchanged.
This acceptance proves current subscription RPC behavior; it does not waive that
platform-owner risk or the remaining functional/browser/operational gates.

## Milestone 33 — status-history repair and post-019 security result

Migration 019 is applied only to Sydney staging and the ledger is exactly 006–019.
It leaves the enabled `membership_status_change` trigger as the single future history
writer and removes the two redundant RPC inserts without deleting old records. Live
post-apply checks confirm zero explicit inserts in the affected definitions, fixed
`public, pg_temp` search paths, `anon` denial, authenticated execution, and zero exact
historical duplicate groups.

Database lint passes with zero public-schema errors. The guarded authenticated suite
passes all 12 row/dojo/privacy/helper/privileged-RPC checks. The membership suite
passes all 11 groups and proves one history row for both break and return-active
transitions. All sessions and synthetic rows were cleaned and outbound providers and
Edge surfaces remained isolated.

The exact SQL verifier still fails only because hosted `supabase_admin` owns unsafe
future-object default ACLs that project `postgres` cannot alter. Migration 019 added
no new verifier failure. Current application objects remain explicitly allowlisted;
do not weaken the future-object gate or treat the role suite as a waiver.

The dependency audit additionally exposed a critical Next.js advisory and high Sharp
and `js-yaml` advisories in the prior lock. Patch-level updates now use Next.js and
`eslint-config-next` 16.3.4, Sharp 0.35.4 and `js-yaml` 4.3.2. The final integrated
audit reports zero known vulnerabilities and all local gates pass. Production was
not contacted, migrated or deployed.

## Milestone 34–35 — transfer wrapper hardening and current security result

Migration 020 replaces the partial-success behavior of the browser-facing Admin
batch-transfer compatibility RPC by delegating to the existing atomic bulk
implementation. It retains `SECURITY DEFINER` with fixed `public, pg_temp` search
path, removes `PUBLIC` and `anon` execution, and grants only `authenticated` and
`service_role`.

Hosted staging acceptance proves missing and duplicate identifiers fail the entire
batch, valid batches emit one destination notification, browser callers cannot use
the server-only rescheduler, scoped roles cannot cross dojo boundaries, and trusted
scheduler/retry paths remain idempotent and audited. The complete fixture rolled back
with zero residue. A fresh post-test security run passes all 12 role/privacy/helper
checks and leaves sessions and outbound surfaces isolated.

Database lint remains clean. The strict verifier still stops only at the unchanged
hosted `supabase_admin` default ACL for future objects; this milestone neither fixes
nor waives that platform-owner finding. Production was not contacted or changed.

## Milestone 36 — payment mutation boundary repair prepared

Baseline staging acceptance proved `record_membership_payment` trusted UI state and
accepted a further payment after a fully paid charge. Prepared migration 021 moves
the remaining-balance and closed-state enforcement into the SECURITY DEFINER RPC,
under its existing row lock and dojo-finance authorization. It also restores Member
result notifications after confirmation review without weakening the unique
confirmation-to-payment link.

The exact migration passed a rollback-only hosted rehearsal with 19/19 payment and
scope assertions. It remains working-copy-only and unapplied. The separate hosted
`supabase_admin` future-object default-ACL blocker is unchanged.

## Milestone 37 — payment controls verified on committed staging schema

Migration 021 is now installed on staging at exact history 006–021. Both payment
mutation functions remain `SECURITY DEFINER`, owned by `postgres`, use fixed
`public, pg_temp` search paths, deny `PUBLIC`/`anon`, and allow only the reviewed
authenticated/service roles. The complete payment suite proves remaining-balance,
closed-state, linked-payment uniqueness, caller and dojo-scope enforcement while
rolling back all fixtures.

The post-test Member/Admin/Super Admin smoke passed all 12 privacy, helper and RPC
denial checks; outbound Auth providers remained disabled and all one-time sessions
were cleaned up. Database lint passed. The only strict-verifier failure remains the
unchanged platform-owned `supabase_admin` default ACL; it was neither waived nor
weakened. Production was not contacted.

## Milestone 38 — settlement RPC ambiguity isolated

Authenticated security smoke v12 passed all 12 Member, scoped Admin and Super Admin
isolation checks after the settlement attempts, with one-time sessions cleaned up
and outbound providers still disabled. The settlement configuration writer remains
server-only under the explicit migration-018 ACL; the harness now asserts that
boundary rather than granting browser access.

Settlement attempt v4 exposed two executable overloads for
`set_dojo_settlement_transfer`. Because the legacy five-argument overload defaults
both trailing arguments, a four-field browser request is ambiguous. Prepared
migration 022 removes only that legacy overload and reasserts minimal grants on the
four-argument browser API. It is not integrated or applied. Attempts v1-v4 all
rolled back with zero residue; production contacts and mutations were zero.

## Milestone 39 — reconciled email/video security boundary

Prepared migrations 023–024 are service-bound additions after the existing 019–022
sequence. Browser roles receive no direct access to watermark profiles, private
source keys, provider asset identifiers, webhook diagnostics or provider mutation
functions. Caller-scoped server routes recheck repository management/access before
using the service role. Playback returns only short-lived signed Cloudflare URLs;
provider credentials and private signed source URLs remain server-only.

Late provider callbacks cannot revive deleting/deleted assets. Failed derivative
retries are bounded and claimed before provider work; provider cleanup is idempotent
and persistence failures trigger compensating deletion. These controls have local
static/runtime coverage but still require live staging provider acceptance.

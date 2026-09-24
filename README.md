# Jingwuguan Seibukan

The authenticated Member repository and administration system for Jingwuguan
Seibukan. The application is built with Next.js 16, React 19, Supabase, Resend,
web push, React PDF, and SheetJS.

## Local development

Use Node.js 20 or later.

```bash
npm install
npm run dev
```

Before opening a pull request, run the complete local release gate:

```bash
npm run lint
npm test
npm run build
```

## Environment

Required browser-safe configuration:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Required server-only configuration:

- `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `EMAIL_WORKER_SECRET`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example `mailto:admin@example.com`)
- `PUSH_API_SECRET`
- `DURABLE_RATE_LIMIT_SECRET`

Never expose a Supabase secret/service-role key, Resend key, VAPID private key,
worker secret, push secret, or durable rate-limit secret through a `NEXT_PUBLIC_`
variable.

Before staging deployment, run the offline configuration check against the protected
staging environment. It validates required names, exact target/origin binding, key
shapes and secret separation without printing values:

```powershell
node scripts/provider-config-readiness.mjs --environment=staging `
  --expected-origin=$env:NEXT_PUBLIC_SITE_URL `
  --expected-supabase-host=eomubndonbetszdbhsrj.supabase.co
```

## Database release

After a protected backup and verified restore, apply only reviewed pending
migrations to an explicitly verified staging connection. The repository is
linked to production: never use `--linked` for staging. Do not replay 006–010
or the legacy root SQL. Migration 011 is a mandatory
security release: it makes administrative views obey caller RLS, removes direct
browser access to archive views, and revokes trigger-helper execution. Migration
012 adds canonical, unique Member ID/email enforcement and protects assigned
Member IDs from non-Super-Admin changes. Migration 013 makes receiving-account
and payment-confirmation tables RPC-only for browser roles. Migration 014
hardens `SECURITY DEFINER` caller identity and default grants. Migration 015
repairs live function errors identified by the Supabase database linter.
Migration 016 restores the three missing subscription-notification functions
from verified migration 006, with explicit grants and serialized retries.

The reconciled staging sequence is exact through migration 036. Migration 037 is
prepared locally but has not been rehearsed or applied. It aligns legacy/current
Break-state handling, routes dojo-transfer notifications through active dojo-admin
assignments, and removes the direct authenticated transfer-table INSERT path that
bypasses the validated request RPC. It also prevents a retained legacy Break from
being incorrectly restarted at Break 1. Its rollback-only staging rehearsal requires
separate explicit approval; staging remains 006–036 until then. Migration 023
routes future legacy notification writes into the durable email outbox without
historical replay. Migrations 024–025 are retained as immutable, already-applied
staging history; their former managed-video schema is dormant. Migrations 026–030
add durable API limits, atomic registration approval, repository-content ACL
hardening, serialized grading and subscription-rate interval preservation.
These migrations are accepted on staging only; they are not production approval.
Migration 031 was applied to staging, but its rollback-contained acceptance suite
found that a partial YouTube pair could pass because PostgreSQL accepts a `CHECK`
expression that evaluates to `UNKNOWN`. No test data was committed. Corrective
migration 032 adds explicit non-null guards and is applied and accepted on staging:
all 15 rollback-contained YouTube checks and all 12 role-security checks pass with
zero fixture residue. This is staging evidence only, not production approval.
Migrations 033–034 add email-queue operational health and repair repository/event
scope and notifications. Migration 035 removes duplicate system-generated Break
audit rows, and migration 036 restores the absent Auth signup and email-confirmation
triggers. All four are applied and accepted on staging only. Post-035 Member lifecycle
acceptance passes 35/35, post-036 registration/password-reset acceptance passes
23/23, database lint is clean, role security passes 12/12, and rollback checks find
zero fixture residue. None of these staging results authorizes production.

The SQL files under `migrations/` are conflicting legacy design drafts, not a
migration chain. Their hashes and non-executable status are documented in
`migrations/README.md`. Only `supabase/migrations` may be used by migration
tooling.

Administrators upload videos to the organization-owned YouTube channel as Unlisted,
then save the URL or video ID in Admin Content. The member viewer uses a
privacy-enhanced YouTube embed with current organization and class logo overlays.
No YouTube API key is required. Unlisted links are shareable and the overlays are
branding rather than DRM; see `VIDEO_PROVIDER_DECISION.md`.

The repository does not contain a complete baseline for every object already
present in the linked Supabase project. Before treating a fresh database reset
as reproducible, pull a schema dump with an authorised Supabase CLI session,
review it for secrets/ownership statements, and commit the missing baseline.
Do not reconstruct database functions from the Data API surface alone.
See `SCHEMA_RECONCILIATION.md` and `DEPLOYMENT_RUNBOOK.md` before any staging or
production database operation.

## Email delivery

User actions enqueue email rows through database RPCs. They do not call an Edge
Function directly. A trusted scheduler must make a `POST` request to
`/api/system/email-worker` with the `x-worker-secret` header. Run the job at
least once per minute; each request claims up to 20 outbox rows. Resend receives
a stable idempotency key for every row.

Monitor the outbox for rows that remain queued or repeatedly fail. Rotate
`EMAIL_WORKER_SECRET` if it is disclosed.

Worker HTTP responses distinguish an empty/successful and healthy run (200),
queue, retry-state, or health-check persistence failure (500), a batch with
delivery/acknowledgement failures (502), and a queue-health alert (503). Counters
report work already completed; `success` is false for failed or unhealthy runs.
The sanitized `queueHealth` summary identifies work ready for more than two
minutes, stale claims, exhausted retries, and duplicate dedupe keys. Alert on
non-2xx responses instead of assuming all 20 items succeeded. Retain the same
outbox ID on retry so provider idempotency is preserved. Scheduling, real
delivery, retry recovery and provider idempotency lifetime still require staging
verification. Migration 033 must be applied before relying on the two-minute
overdue-ready threshold.

## Authorization smoke test

Use dedicated, disposable accounts with Member, scoped Admin, and Super Admin
roles. Set these server-side variables (do not commit them):

- `SECURITY_TEST_MEMBER_EMAIL` / `SECURITY_TEST_MEMBER_PASSWORD`
- `SECURITY_TEST_ADMIN_EMAIL` / `SECURITY_TEST_ADMIN_PASSWORD`
- `SECURITY_TEST_SUPER_EMAIL` / `SECURITY_TEST_SUPER_PASSWORD`
- `SECURITY_TEST_ENVIRONMENT=staging` (use `production-read-only` only for an
  explicitly authorized production check)
- `SECURITY_TEST_EXPECTED_HOST` matching the Supabase URL host exactly

Then run:

```bash
npm run test:security
```

The production-read-only mode never invokes a mutation RPC. Staging mode also
probes denial of a privileged mutation using a nonexistent random Member ID;
it must never be pointed at production. The runner rejects the known production
host in staging mode, refuses unconfirmed targets, paginates member rows, and
does not count network/schema errors as permission denials. It reports checks in one
run and verifies Member isolation, Admin class/dojo scope, archive and payment
table privacy, delivery-data privacy, role resolution, and denial of a
representative privileged RPC. Run it against staging after migrations and
before production promotion.

SQL attribute checks are lexical regression checks, not proof that a migration
executes correctly. Run `scripts/verify-database-security.sql` and database lint
on staging, then complete the role and functional test matrix.

## Authentication workflow

Registration requires a Member ID, normalized contact data, class/dojo request,
and a strong password. Supabase email confirmation must remain enabled. A
verified Member without an approved class membership is held on the approval
page; the protected repository is unlocked only after an Admin approves a
membership. Temporary-password accounts are redirected to the password-change
flow before application access.

See `TODO_PROGRESS.md` for the audited release status and known external
blockers.

## Frontend reliability checks

`npm test` includes 14 frontend component-logic/accessibility regressions in
addition to the existing 35 tests. They exercise real TSX handlers/effects with
isolated dependencies; they are not browser, authenticated or database tests.
Registration fails closed while catalogs are loading or unavailable, provides
retry controls, and ignores stale dojo responses after a class change.

The shared navigation has a native modal mobile menu, current-page semantics,
a skip link, visible focus and reduced-motion styles. Complete actual keyboard,
screen-reader and role-specific responsive checks in staging before release.

For a synthetic public-form browser fixture, an app built with loopback backend
placeholders can run on `127.0.0.1:3100` alongside:

```powershell
node scripts/frontend-catalog-fixture.mjs
```

The fixture listens only on `127.0.0.1:54321`, intentionally fails the first
class/dojo lookup, contains only fictional catalog rows and rejects EVERY Auth
request. It does not create accounts, store bodies or contact external services.
Do not run it alongside a real service already using that port. Stop it after
testing. The in-app browser blocked its URL at milestone 16; successful catalog
recovery remains unverified in that browser. Do not bypass that restriction or
weaken CSP to force a pass. Use the approved staging environment for real flows.

## Repeatable isolated browser smoke tests — milestone 18

Install the pinned development dependencies and browser engines, then run:

```powershell
npm ci
npx playwright install chromium firefox webkit
npm run test:browser
```

The wrapper builds a fresh production-mode app with fixed loopback placeholders,
strips inherited provider/test credentials and refuses target/config overrides.
It starts its own servers on 127.0.0.1 ports 3100/3101 and refuses occupied ports.
All backend responses are fulfilled in-memory by Playwright; no connection is
made to port 54321 or Supabase. The separate navigation fixture renders the real
React components with fictional roles and inert Auth/router shims. It is NOT an
authenticated route, authorization test or deployed application feature.

Seventeen cases run under five profiles: Chromium desktop/tablet/mobile,
Firefox desktop and WebKit mobile-width (85 test instances). Coverage includes
registration failure/empty/retry/race behavior, mocked signup metadata, signed-out
redirects, page titles, focus, modal dismissal/resize, role-link presentation,
sign-out failure and automated axe scans. Three new runner-isolation regressions
bring `npm test` to 52 tests plus TypeScript. Generated reports are ignored by
Git and ESLint, not by the test assertions.

Reports: `test-results/browser-results.json`, screenshots/traces in `test-results`,
and `playwright-report`. The checked-in GitHub workflow uses immutable action
revisions, read-only permissions and no secrets; it has NOT run on GitHub yet.
For diagnosis only, `npm run test:browser -- --project=chromium-mobile` selects a
profile. `--skip-build` requires a matching isolated-build fingerprint. A subset
pass must never be reported as a full-suite pass.

Milestone 20 full local run: **76 passed, 9 failed**. All 68 Chromium/Firefox cases
pass; WebKit now passes all eight navigation cases, including native keyboard
activation of the skip link after adding explicit `tabIndex={0}`. Nine public-page
failures remain where production CSP upgrades HTTP assets to HTTPS. No TLS trust
or browser/CSP protections were disabled. Keep those checks failing until tested
with trusted HTTPS. The suite is not a green release gate. Mobile-width desktop engines
are not real Safari/iOS/Android devices, and axe is not a screen-reader audit.
The previous in-app browser restriction remains unchanged and was not bypassed.

The new skip-link regression brings `npm test` to 53 tests plus TypeScript.
See workspace evidence `release-evidence-20260831-keyboard` and the deployment
runbook; milestone-19 reports remain in `release-evidence-20260831-browser-ci`.
These builds are validation artifacts, never production releases.

### Operator-provided HTTPS for isolated tests — milestone 21

The runner now supports optional HTTPS on the same fixed 127.0.0.1:3100/3101
servers. It never installs trust, changes production CSP or accepts a remote
target. Before enabling it, obtain authorization for any certificate trust change
and supply a dedicated current certificate with IP SAN 127.0.0.1, its matching
private key and a public CA/chain file. Keep all three outside both repositories
and evidence directories; protect the private key with owner-only permissions/ACLs.

Set these process-local variables to operator-provided absolute local file paths:

- `BROWSER_SMOKE_HTTPS=1`
- `BROWSER_SMOKE_TLS_CERT_FILE`
- `BROWSER_SMOKE_TLS_KEY_FILE`
- `BROWSER_SMOKE_TLS_CA_FILE`

Then run the same `npm run test:browser` command. The explicitly supplied public
CA is added to child Node trust via `NODE_EXTRA_CA_CERTS`; browser-engine trust
must be configured separately through an authorized mechanism. TLS verification
remains enabled for browsers and server readiness. Partial/invalid setup stops
before build/browser execution, with no fallback to HTTP. Unset all four variables
to retain the original HTTP diagnostic mode, whose nine WebKit failures remain.
Neither a configured CA file nor offline certificate parsing proves browser trust.

Eight additional guard regressions bring the Node total to 61. Offline synthetic
certificate checks validate parsing, expiry, key mismatch and host rejection,
but no trusted-HTTPS handshake or HTTPS browser pass is claimed yet. These changes
are test infrastructure only; the production start command is unchanged. See
`release-evidence-20260831-https-support` for current gate results and access needs.

### Actual HTTPS transport validation — milestone 22

The existing HTTPS app and navigation servers now pass five real transport checks:
login/CSP, all 14 login static assets, navigation, rejection without trust and
wrong-host rejection. A fresh 40-page placeholder build was used. Trust was explicit
for the dedicated Node client only; no browser/OS trust was installed.

The authorized CurrentUser certificate installation stalled before browser execution
and was stopped; its exact trust entry was absent and temporary material removed.
An interactive narrow trust setup is still required. No security prompt was automated
or suppressed. The full browser suite was not rerun: its last result remains 76/9,
not a pass. All 85 required cases and protections are unchanged.

Latest evidence: `release-evidence-20260831-https-validation`. GitHub access works,
but an active Vercel integration requires authenticated deployment-rule inspection
before the authorized validation-branch publication. Staging, complete backup/restore,
real role/workflow tests and production release approval are still outstanding.

### Current continuation — milestone 23

Existing Free Sydney staging `eomubndonbetszdbhsrj` has been resumed; it has not
been populated from production or validated. Vercel Preview automatic branch
deployments are OFF, but production/preview credential scopes are not isolated.
Do not publish test deployments or copy live data until the documented access,
location-consent, recovery and outbound-isolation prerequisites are satisfied.

Pending migration 016 now formats lock and daily notification keys explicitly as
YYYY-MM-DD. Two failing local DateStyle regressions demonstrated duplicate
reminders and distinct locks for the same month; all 22 synthetic PostgreSQL
checks pass after the fix. `npm test` now includes 62 Node regressions plus
TypeScript. The SQL fixture is workspace tooling with fictional data and stub
dependencies, not actual Auth/RLS/finance/delivery acceptance or a restored backup.

Latest implementation/evidence: `release-evidence-20260831-subscription-hardening`;
raw PostgreSQL attempts: `release-evidence-20260831-subscription-runtime`.
Supabase migrations 011–016 remain unapplied. Full trusted-HTTPS browser execution,
staging security/business workflows, remote CI and operational validation remain
required. No placeholder build may be promoted to production.

### Current continuation — milestone 30

The protected production-derived database package has been restored only to Sydney
staging `eomubndonbetszdbhsrj`, and reviewed migrations 011–016 are applied there.
Production is unchanged. The first real authenticated security run executed all 12
checks and failed nine because the restored ACL baseline had unsafe maintenance
privileges but lacked required browser SELECT and RPC EXECUTE grants.

Prepared migration 017 fixes the confirmed invitation-function lint error. Prepared
migration 018 replaces inherited browser privileges with explicit relation and RPC
allowlists and leaves worker/password routines service-role-only. Both pass static
tests, exact dry-run selection and a rollback transaction rehearsal, but neither is
applied. Applying them requires explicit staging-only approval.

The integrated source passes `npm ci`, lint, 67 Node regressions plus TypeScript,
standalone typecheck and the 40-route build. The build uses placeholder local
configuration and is not deployable. After approved staging application, rerun
database lint, the strict verifier and all role checks. Functional workflows,
full browser/accessibility coverage, remote CI, provider/hosting isolation,
monitoring and the platform-owned default-ACL gate still block production.

### Current continuation — milestone 31

User-approved migrations 017 and 018 are applied to Sydney staging only. Exact
read-only verification proves migration history 006–018 and the intended current
ACL allowlist; database lint passes and the authenticated Member/Admin/Super Admin
security suite passes 12/12. Production was not contacted or changed.

The strict verifier remains blocked by hosted `supabase_admin` default privileges
for future objects, which project `postgres` cannot change. This gate was not waived.
The real functional/concurrency matrix, trusted browser/accessibility coverage,
remote CI and operational release controls also remain unfinished. Do not reapply
017–018 or promote the placeholder build. Latest evidence:
`release-evidence-20260905-staging-acl`.

### Current continuation — milestone 32

Migration 016's real staging acceptance now passes 10/10: concurrent advisory-lock
waiting, normalized-month and DateStyle-safe deduplication, payment totals, status
exclusions, same-day retry and Member/wrong-dojo denial. All synthetic rows were
removed, outbound isolation stayed enabled and the 12/12 authenticated role suite
passed again. Production was untouched.

The hosted `supabase_admin` future-object default ACL, broader authenticated business
workflows, trusted browser/accessibility, remote CI and operational gates still block
production. Latest evidence: `release-evidence-20260909-staging-subscriptions`.

### Current continuation — milestone 33

Migration 019 is applied only to Sydney staging, whose exact ledger is 006–019.
Database lint passes, the authenticated Member/Admin/Super Admin suite passes 12/12,
and enrollment/membership-break acceptance passes 11/11 with exactly one audit row
for both break and return-active status changes. Cleanup and outbound-isolation checks
pass. Production was not contacted or changed.

The dependency baseline is now Next.js and `eslint-config-next` 16.3.4, Sharp 0.35.4
and `js-yaml` 4.3.2. The integrated source passes a zero-vulnerability npm audit,
lint, 67 regressions plus TypeScript, standalone typecheck and a 40-route build. That
build uses loopback placeholders and is not deployable.

The unchanged hosted `supabase_admin` future-object default-ACL gate, remaining
authenticated business workflows, trusted browser/accessibility and remote CI, and
operational/production configuration still block release. Do not reapply 011–019 or
deploy production without a separately reviewed and explicitly approved release.
Latest evidence: `release-evidence-20260909-staging-membership-workflows`.

### Current continuation — milestone 35

Migration 020 is integrated and applied only to Sydney staging, whose exact ledger
is now 006–020. Database lint passes, the rollback-contained transfer acceptance
suite passes 20/20, and the fresh authenticated Member/Admin/Super Admin security
smoke passes 12/12. Missing or duplicate batch members are rejected atomically;
authorized scheduling, cancellation, retry, notifications and history behave as
reviewed. Test residue and production contact counts are zero.

The strict verifier still reports only the pre-existing hosted `supabase_admin`
future-object default ACL. Other functional workflows, trusted browser/accessibility
and remote CI, production configuration and operational controls remain release
blockers. Production has not been migrated or deployed and still requires a separate
reviewed approval. Latest evidence: `release-evidence-20260909-staging-transfers`.

### Current continuation — milestone 36

Payment acceptance found two server-side defects: official payments could exceed a
fully paid charge, and confirmation review omitted Member result notifications.
Prepared migration 021 repairs both and passed a 19/19 transaction-only staging
rehearsal with zero residue. Working-copy lint and 69 regressions plus TypeScript
pass. The migration is not integrated or applied; staging remains 006–020 and
production remains untouched. Latest evidence:
`release-evidence-20260909-staging-payments`.

### Current continuation — milestone 37

Migration 021 and its regression are integrated, and migration 021 is applied only
to Sydney staging at exact history 006–021. Integrated lint and 69 regressions plus
TypeScript pass. Post-apply database lint is clean, payment acceptance passes 19/19,
and authenticated role security smoke passes 12/12 with zero fixture residue and
zero production contact.

The strict verifier still reports only the existing hosted `supabase_admin`
future-object default ACL. Remaining OPEN functional workflows, authenticated
browser/accessibility and remote CI, hosting/operational configuration, recovery and
release controls still block production. Latest evidence:
`release-evidence-20260910-staging-payment-021`.

### Current continuation — milestone 38 execution

A 30-check rollback-contained settlement acceptance suite is prepared and its
runner passed 22/22 offline guards. It covers configuration audit history, eligible
payment selection, atomic draft creation, transfer evidence, submission,
rejection/resubmission, approval/archive idempotency, cancellation/payment release,
notifications and role/dojo isolation. Approved staging attempts v1-v4 rolled
back with zero residue. The latest attempt exposed a real ambiguous transfer RPC:
the application-used four-argument signature conflicts with a legacy five-argument
signature containing defaults. Migration 022 and a regression test are prepared
only in the working copy; they are not integrated or applied. SET-01 is BLOCKED
until that repair is reviewed, approved for staging, applied and the complete suite
passes. Authenticated security smoke v12 passed 12/12. Production was not contacted.

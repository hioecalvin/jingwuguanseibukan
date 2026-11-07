# Multi-month subscriptions — local candidate, 7 October 2026

## Protected credentials — local milestone, 9 October 2026

Prepared a fixed read-only staging probe with owner-only DPAPI credential checks,
current-SID/project binding, pinned client/CA, verify-full TLS and isolated child
password injection. Synthetic offline tests cover valid credentials, wrong binding,
empty secrets, unsafe permissions and missing connection prerequisites. Typecheck
and all 680 tests plus focused lint pass. No actual protected credentials, remote
connection, migration, deployment or provider activity this milestone. Live probe
and remote rollback integration remain unverified; 059–060 are still pending.

## Real permission adapter and offline connection plan — 9 October 2026

Real Windows ACL checks now integrate with the journal and reject broad/drifted
permissions in actual temporary-directory tests. Offline read-only connection plan
requires pinned client/CA bytes, exact staging target and verify-full TLS while
excluding inherited routing/options and application secrets. No credential loaded,
connection made or live TLS verified. Typecheck +675 tests and focused lint pass.
Actual client/CA/credential/server-evidence integration remains outstanding. Neither
059 nor 060 was applied; no deployment or live state changes occurred.

## Persistent attempt and staging target safeguards — 9 October 2026

Local journal now saves a create-once claim before execution and a separate outcome;
existing/uncertain records block reuse. Two-process race and failure tests pass.
Strict direct staging target/verify-full configuration rejects other projects and
fallbacks. Mock controller integration prevents execution before claim and prevents
success if outcome persistence fails. Typecheck +668 tests and focused lint pass.
No live contact, SQL acceptance/build/browser rerun or migration changes. Real
credential/TLS/private-folder adapters and fresh remote bindings remain unfinished;
059–060 still pending, with separate write approval required.

## Rollback failure handling strengthened locally — 9 October 2026

One-attempt controller now requires the expected abort, closed mutation session
and independent unchanged baselines. Execution failures still trigger reconciliation;
timeout/uncertainty never passes or retries automatically. Concurrent/repeated calls
to the same instance reject a second dispatch. Nine controller tests, typecheck
+652 total tests, lint and local PG17/eleven races pass; cluster stopped.
Remote target/evidence adapters and durable attempt journal remain unimplemented.
No live contact or migration changes; 059–060 remain unapplied.

## Approved staging index audit completed — 9 October 2026

Read-only capture/review passed for ten scoped tables and all 33 indexes. No
expression indexes; three simple partial predicates; five unchanged dependency
helpers. Ledger versions remain 006–058. Evidence is owner-only and summarized in
finance-index-dependency-review-20261009.json. Six offline validation tests pass.
No live data or settings changes, member rows, messages, providers, other projects
or deployment. Remote rollback executor and separate write approval remain pending;
059–060 were not applied and automatic month-end billing is still disabled.

## Index capture query verified locally — 9 October 2026

Prepared metadata SQL now runs successfully under server READ ONLY against ten
synthetic tables, twelve indexes and five guarded function-dependency types without
invoking them. Added fail-closed offline structure validation; no staging/identity
acceptance is inferred. Typecheck +643 tests, lint, local PG17 rollback and eleven
races pass; clusters stopped. Next external step requires explicit read-only staging
index/dependency audit approval. No live contact, migration or deployment this turn.

## Actual captured notification path — 9 October 2026

Combined local fixture now uses exact captured create_notification and class/dojo
normalizers. Five exact in-app alerts and fixture UUID references verified; legacy
outbox/history/sequence baselines preserved. Broader failure-injection tranches
retain their separate synthetic stub. Assignment/rate UUIDs now recorded explicitly.
Typecheck +637 tests, lint, local rollback/baselines and eleven races pass.

Path review: operations/FINANCE_FIXTURE_PATH_REVIEW.md. Ordinary index metadata is
missing from saved captures; a prepared read-only query needs separate staging
approval and verification. Remote executor remains incomplete; neither migration
is applied. No remote access, messages, deployment or month-end automation enabled.

## Captured-hook and selected-policy checks — 9 October 2026

The local PG17 rehearsal now installs the two exact captured general DDL hooks.
Independent LISTEN sees committed CREATE/DROP and final controls, but no event from
the combined 059–060 rollback. Event hooks are included in independent fingerprints.
Nine captured SELECT policies and three captured helpers enforce tested Member-own,
dojo Admin, Super Admin, missing-claim and unassigned synthetic-actor reads. Direct
charge updates remain denied. Local fixture enum/order mismatches were corrected
without changing captured policy expressions. All eleven races, rollback baselines,
typecheck +634 tests and focused lint pass; local clusters stopped.

These are synthetic local results only: SELECT grants are harness-defined; the
fourth synthetic actor is not a permitted remote actor. No live services, migration
application or delivery. Full call-chain review/remote wrapper and separately
approved fresh staging rehearsal remain outstanding. 059–060 are still pending;
automated month-end billing remains unimplemented and disabled.

## Combined draft DDL rollback validated locally — 9 October 2026

Rehearsed reviewed 059 and 060 bodies plus payment fixtures inside one local
transaction, then forced constraints and an exact nonce-bound abort. Independent
read-only sessions verified unchanged data/catalog/ACL/sequence fingerprints.
Wrong hashes or unexpected exit/error cannot be interpreted as a successful test.
Added preservation checks for pre-existing audit/outbox/notifications and used
sequences; notifications are restricted to fixture Member/Admin recipients.
Typecheck +628 tests, focused lint, full local SQL suite and eleven races pass.
Clusters stopped; no remote contact, apply, deploy, commit or push. Complete-schema
review and fixed-target staging executor remain unfinished; separate approval is
still required before the write rehearsal. This is not live acceptance evidence.

## Remaining metadata audit completed — 9 October 2026, 17:26 Sydney

Approved staging-only read-only audit captured three Auth helpers, six database-wide
event triggers, public enum labels and four owned sequence mappings. Version set
remains 006–058; 059–060 not applied. See finance-remaining-metadata-review-20261009.json
for protected evidence digest and reviewed hook classifications. No member/Auth rows,
DDL, worker/provider invocation, settings change or other-project contact.

Captured Auth semantics now replace simplified local helpers. Scalar/JSON fallback,
precedence, absent claims and malformed UUID cases pass. Full local SQL/eleven races,
independent rollback fingerprints, typecheck +624 tests and focused lint pass; cluster
stopped. Complete transitive review and a guarded remote wrapper remain outstanding
before requesting the separate write rehearsal. No migration or deployment approval.

## Independent rollback fingerprints — 9 October 2026

Local fixture now has independent read-only before/after sessions: public row hashes,
catalog/permissions/Auth-helper hashes, sequence values and is_called must match.
Normal fixture passes; a deliberately advanced local sequence after rollback fails
comparison as expected. New verifier rejects mismatched targets/session reuse and
incomplete inventory. No raw records or definitions are printed by fingerprinting.
Typecheck +622 tests and full local SQL/eleven races pass. Cluster stopped.

Remaining live-metadata query (Auth helpers/enums/DDL event triggers/sequence ownership)
is prepared but unexecuted, pending staging-only read-only approval. Full remote
wrapper and full-schema acceptance remain unfinished; no 059–060 application or
deployment. No remote system was contacted for this local milestone.

## Isolated fixture tranche — 9 October 2026

Prepared and ran loopback-only fixture SQL using three existing synthetic actors,
new classes/dojos/memberships and isolated bills. No Auth/profile creation or existing
membership update. Verified waiver, skipped debt, pending report then authorized
receipt, Admin scope, Super Admin oversight and identical actor profiles. Normal path
does not consume legacy identities. Local-only negative control proves rolled-back
rows can still advance sequences; NEVER include that control in remote acceptance.
Actual 030 resolver/037 validator run; remaining schema is deliberately synthetic.

Typecheck +616 tests, focused lint, local PG assertions and eleven concurrency cases
pass. All disposable local clusters stopped. No remote contact, migration change,
apply/deploy/commit/push. Current enum/Auth helper verification, full transitive review,
independent residue wrapper and explicit three-account staging rehearsal approval
remain required. See FINANCE_REHEARSAL_059_060_PLAN.md for exact fixture boundaries.

## Dependency follow-up — 8 October 2026, 11:40 UTC

Approved metadata-only staging audit completed. See finance-dependency-review-20261008.json
and updated FINANCE_REHEARSAL_059_060_PLAN.md; earlier sections are historical.
All 18 identified routine dependencies now have bodies. Raw 223-function/23-trigger
capture stays owner-only outside the repository. Exact ledger versions remain 006–058.
No public foreign tables/rewrite rules; this is not proof of complete isolation.

Legacy membership-status/history/outbox paths consume identity sequences that rollback
does not restore. Fixture setup must exclude those paths, without bypassing triggers
or resetting sequences. The real notification bridge and queue_email have been inspected;
no delivery was invoked. Complete transitive candidate/RLS/default review, safe Auth/FK
fixtures and assertion/baseline runner remain outstanding before rehearsal approval.
Offline dependency inventory always reports readyToExecute=false. Local typecheck +612
tests and focused lint pass. No apply/deploy/browser or production work performed.

## Rehearsal preparation — 8 October 2026

See FINANCE_REHEARSAL_059_060_PLAN.md and finance-rehearsal-preparation-20261008.json.
The offline preparation command binds candidate/ledger/capture hashes and refuses
execution: 13 potentially reachable routine bodies are absent from the scoped audit.
Notification creation, bridge/outbox normalization and other triggers must be reviewed
transitively before any test writes. Rollback cannot be assumed to undo external
delivery or sequence effects. No trigger disabling or notification-sink replacement.

The dependency-catalog SELECT is prepared under tests/sql but has not run. Raw
definitions belong in private evidence. Actual complete-schema fixture/assertion
runner remains unimplemented until dependencies and safe fixture boundaries are
verified. Plan includes separate approval, bounded transaction, exact rollback
sentinel, deferred-constraint forcing and independent ledger/catalog/residue checks.
No retries on uncertain outcomes and no cleanup DELETE to manufacture a match.

Local verification: npm test typecheck +607 pass; focused ESLint and whitespace
checks pass. No new UI/build/browser run, remote contact, migration application or
deployment. This preparation does not complete live behavioural security acceptance.

## Fresh staging catalog preflight — 8 October 2026, 11:26 UTC

Read-only audit authorized after the explicit approval question; target restricted
to eomubndonbetszdbhsrj. Workspace helper Audit-Finance059060ReadOnly.ps1 verifies
metadata ID/healthy state, sends only reviewed catalog SELECT with read_only=true,
and verifies transaction_read_only=on. It never uses local CLI project links, follows
redirects, prints credentials, invokes application RPCs or runs migration SQL.
Fresh output: staging-readiness/finance059060-readonly-20261008T112627271Z.
No business records returned; schema metadata, finance definitions and ledger only.

Offline command: node scripts/verify-finance-catalog-candidate.mjs <capture directory>.
Summary: finance-staging-readonly-preflight-20261008.json. All 53 ledger names and
ordered SQL contents match 006–058 repository migrations. The comparison preserves
all internal SQL/comments/literals; only CRLF/outer whitespace and CLI-stripped
statement separators are tolerated. A simple newline join initially compared false
for CLI-split entries; ordered separator-aware comparison verifies all 53, including
the two whole-file entries. Ledger SHA256:
9d341d30c586cfe85fd8c328e05ef97d008f26623f7dc9506b615f89cbd6c4d1.
Repository fingerprint still matches the pinned recovery contract.

All six planned body-replacement checks pass; no pending RPC/group-column/policy
collision; expected fee-history constraint exists. Fresh finance definitions match
29 historical definitions, confirming the legacy zero-fee and active-only-dojo gaps
still exist. No direct browser mutation grants on the four checked finance tables.
The routine inventory omits extension aggregates from pg_get_functiondef and saves
full definitions only for finance-scoped routines; raw catalog counts therefore
must not be compared blindly with differently shaped historical exports.

This is metadata verification, NOT behavioural role/RLS or migration acceptance.
readyToApply stays false. Prepare a reviewed complete-schema rollback-contained
rehearsal with isolated fixtures, preflight all reachable triggers/provider paths,
and obtain explicit rehearsal approval. Require independent post-rollback ledger
and residue checks. Actual migration application/deployment needs separate approval.
No worker, scheduler, email, settings or production contact occurred. npm test:
typecheck +603 pass; focused lint/diff check pass. No new UI/build/browser run.

## Latest compatibility findings and fixes — 8 October 2026

The sections below are historical; this section records the newest local changes.
No live schema or member data has been read or changed for this milestone.

Command: `node scripts/advance-payment-catalog-review.mjs <local schema-only catalog>`.
Source: workspace recovery-restore-20260929/restored-catalog-final-cluster, five JSON
exports only. Per-file hashes and inventory are recorded in
advance-payment-catalog-review-20261008.json. This covers 236 routine definitions,
69 policy rows, 85 relations, 442 constraints and 1,344 table grants. It identifies
25 direct helper consumers (including settlements/reports/bank settings) and seven
policies; indirect/dynamic references and actual RLS behaviour still need review.
No browser mutation grants were found on the four examined finance tables.
The report is always readyToApply=false, even when its basic blockers array is empty.
An attempted whole-catalog fingerprint refused a historical publications object
format; the new audit hashes only the five arrays it actually examines. The existing
recovery fingerprint validator was not weakened and original files were preserved.

The catalog exposed an active-only dojo SELECT policy and four zero-fee Paid writers.
Pending 059 now adds a SELECT-only finance-helper policy for authorized inactive-dojo
visibility, preserving the public policy. Pending 060 already covered apply_membership_fee_adjustment;
it now also guards/replaces one zero-fee branch in each of adjust_current_membership_fee,
generate_dojo_monthly_subscription_charges and system_generate_monthly_subscriptions.
Missing functions or unexpected branch shapes stop the migration. Existing signatures,
ACLs, schedules and saved rows remain unchanged. These fixes do not enable automation.

Expanded synthetic PostgreSQL runner imports the actual migration-030 rate resolver
inside a rolled-back test transaction. It verifies scheduled/default rates, expiring
overrides, fallback, mixed currencies, stale quotes, internal EXECUTE denial, and
preserved paid/reported amounts. The clearly labelled 060 legacy fixture includes
only three reviewed function definitions from the schema export, with source hash.
Synthetic RLS checks run as authenticated/anon, not only owner claims: Members retain
active-public visibility, Admin adds only assigned inactive dojo, Super Admin sees
all, disabled Admin loses privileged visibility. Legacy generation/adjustment tests
verify Waived status, no artificial receipts, replay safety and prepaid preservation.
These targeted tests are NOT a full Supabase schema restore or live acceptance.

Final commands/results: npm test (typecheck +601 pass); focused ESLint and git diff
--check pass; test-advance-payment-local.mjs --synthetic-local-only passes the expanded
SQL checks plus all eleven concurrency cases. Final cluster js-fee-test-aIhjBc stopped.
One earlier full-suite failure exposed separate Date.now calls around an exact eight-
minute synthetic rehearsal; the fixture now uses one instant, leaving real validation
unchanged. Full suite passed after the fix. No UI change/build/browser rerun this
milestone; the 210 fixture-browser passes below are previous evidence only.

Remaining gate: current staging catalog/ledger and complete-schema role/security,
indirect consumers, real FK/trigger/outbox interactions and ledger/residue acceptance.
Get separate read-only staging approval before remote probes, then separate explicit
059–060 application/deployment approval. Automatic month-end generation still needs
implementation and testing; its activation is not part of this local work.

## Latest verification — selected months, 8 October 2026

This section supersedes the range-only, Super Admin-loader and synthetic race gaps
in the historical verification notes below. Both migrations remain PENDING ONLY.

- Select a range of 1–12 calendar months, then untick any not being paid. The UI
  supplies requested_months to quote/report/receipt; the server validates and sorts
  exact dates. Missing historical bills are still rejected. Only selected months
  are locked/changed. First selected month is no later than current month +12;
  final selected month is no later than current month +23 (existing range horizon).
- Member has an optional oldest loaded unpaid-bill shortcut. This is not automatic
  allocation or a full server-generated arrears catalog; pending reports remain
  subject to server rejection. Group review now shows exact month labels.
- Super Admin loads all dojos; ordinary Admin still loads assignments only. A
  failed initial Super Admin dojo lookup leaves no usable selection. Fixture checks
  do not establish real RLS permissions on the staging schema.
- npm test: typecheck and 595 tests pass. Focused ESLint and diff whitespace checks
  pass. Final SQL/static subset: 31 pass.
- node scripts/browser-smoke.mjs --project=chromium-mobile --project=webkit-desktop
  --project=webkit-mobile: isolated production build passes (55 pages), all 210
  fixture tests pass. No physical-device or live staging test is implied.
- LOCAL_PG_BIN=<installed PostgreSQL 17 bin> node scripts/test-advance-payment-local.mjs
  --synthetic-local-only: SQL selection, scope, waiver, audit and rollback checks pass.
  Eight controlled fee-change/payment conflicts cover waiver or repricing versus
  report or receipt in both winner orderings. Real lock waits are observed before
  committing the winner; loser rejection and final bill/payment/history state are
  asserted. Together with the previous three duplicate races: eleven pass.
- New SQL fixture initially retained immediate constraint timing from an earlier
  test; corrected to the trigger's normal deferred transaction mode. New fixture
  result typing corrected before passing typecheck. No application guard weakened.
- All local clusters stopped; synthetic temporary evidence retained. No env-file,
  source backup, provider, staging, production or retired-project access occurred.

Still required: complete-schema acceptance including all existing shared-finance
consumers, separately authorized fresh staging catalog/ACL/RLS/ledger comparison,
explicit migration approval and guarded application, then matched staging UI
deployment. Monthly last-day 09:00 Jakarta generation is not implemented/activated.

## Overdue fees and waivers — 8 October 2026 update

The current local candidate now allows existing overdue bills in the 059 quote/
report/receipt flow. It refuses to invent a bill for a missing past month. The form
still selects a first month and 1–12 consecutive months (use one month for a single
bill); an arbitrary nonconsecutive checkbox picker and automatic oldest-month
selection are not implemented. Closed months must be excluded from the range.

Pending 060 adds `adjust_unpaid_subscription_charge(uuid,numeric,numeric,text)`
and reuses the existing `membership_fee_adjustment_history` table, adding only the
`selected_month_only` allowed type. Old amount, new amount, selected month, reason,
actor and timestamp are retained. A zero fee sets amount to 0 and status to Waived;
it never creates a payment. Other months, standard rates and rate overrides stay
unchanged. The existing notification function informs the Member transactionally.
Only an authorized dojo Admin/Super Admin may adjust a bill, with a nonblank reason,
an exact expected old fee and no official payment/pending report/closed status.
The RPC locks generation, membership and charge in 059 order. Failed notification
rolls back the fee and history together; uncertain UI responses disable repeat
submission until a reload/history check.

The Admin payment list has a compact per-bill adjustment form. Member closed-bill
display no longer converts Waived to Paid and hides its report button; Admin list
and financial-report status retain Waived. A guarded replacement in 060 also fixes
the two existing zero-fee branches of `apply_membership_fee_adjustment` to Waived,
without rewriting previously stored records or changing its future-rate behaviour.

Reuse was verified against migration 015 and the saved 29 September schema-only
catalog under the workspace recovery evidence. This is historical evidence, not a
fresh staging audit. Both the history type constraint and old fee-function text
are checked before replacement; unexpected definitions fail the candidate transaction.
No live schema, backup payload, credentials, services or member records were used.

Synthetic PostgreSQL tests now include three overdue months -> first waived -> two
reported -> declined -> second repriced and paid alone -> third still due. They
verify original-fee audit, notification rollback, wrong-dojo/Member denial, pending/
paid/stale/duplicate protection, authenticated execution and existing zero-fee API
behaviour. The prior three two-session payment races continue to pass. Dedicated
waiver-versus-report/fee-adjustment races and complete restored-schema acceptance
remain outstanding. All synthetic clusters were stopped.

Latest local application suite: typecheck plus 595 tests passed outside the sandbox;
the first sandbox run had protected-path synthetic-evidence access failures, not a
passing result. Focused lint and isolated production build passed. Browser fixtures
include required reason, confirmation cancellation, one RPC, uncertain-result lock,
accessibility/responsive layout and the real Admin list's Waived status.
Final rerun: all 195 tests passed across Chromium mobile and WebKit desktop/mobile.
The initial added real-list test failed on two mobile projects because it had not
expanded the nested adjustment disclosure; corrected that interaction and reran
the full suite. No force-click or hidden-input bypass was used.

Neither pending 059 nor 060 is applied. Do not deploy the UI yet. The gates below
now apply to BOTH candidates; automatic monthly billing still remains unimplemented.
The existing Admin finance page still selects dojos from assignments; reconcile
its Super Admin scope loader/copy with 059's backend oversight before deployment.

## Scope and release boundary

Uncommitted local implementation only. No remote catalog was queried and no migration,
payment, notification, scheduler, provider or deployment was changed for this work.
The SQL candidate is `supabase/pending/059_advance_subscription_payment_records.sql`.
It is NOT in the active migration directory or the verified 006–058 recovery ledger.
Do not deploy the new UI before approving and verifying its database dependency.

## Behaviour

- Member chooses their own membership and 1–12 consecutive months, starting in the
  current Jakarta month or up to 12 months ahead, then reviews the individual fees.
- A report records an already-transferred full total, date, method and notes. It
  remains Pending; only the dojo's existing assigned Admins receive pending alerts.
  The existing notification system is reused (one alert per selected month).
- An active dojo Admin confirms the whole report only after checking receipt, or
  declines the whole report with a reason. Super Admin can oversee all dojos.
- Confirming receipt creates the existing official payment records and makes every
  selected month Paid in one transaction. Declining leaves bills unpaid and permits
  another report. Admins can also directly record a full total already received.
- No payment gateway, bank reconciliation, charge to a card or partial-payment
  feature is introduced. This is a record and receipt-confirmation workflow.
- Existing bills preserve their original fee. New bills use the existing rate
  resolver for each billing month. Mixed currencies and previously part-paid bills
  are rejected. A changed quote must be reviewed again.
- Duplicate/competing writes cannot produce duplicate receipts. Uncertain client
  responses are not automatically retried: check history before another action.
- Paid bills are excluded from the existing monthly due-notification query.

The old single-month list still displays its individual history. Grouped reports
must be reviewed in the new grouped section; the database rejects attempts to split
one group through old single-month review controls.

## Database review points

No new table. Adds nullable `membership_payment_confirmations.payment_group_id`,
an index and a deferred atomic-group constraint trigger. Adds quote, member report,
direct receipt, group review and pending-group read RPCs, each restricted to the
authenticated role and checked against caller/dojo ownership in the function.

The shared `can_access_dojo_finance` helper is changed, not duplicated: it retains
caller binding and assigned-dojo scope, requires an active/nondeceased profile, and
adds Super Admin oversight. This affects existing finance consumers too, including
rates, notifications and receiving-account helpers. Review their role expectations
against the real staging catalog before approval; local synthetic tests are not a
substitute for that review. Existing helper ACLs are preserved by replacement.

The candidate also updates the existing payment-report alert wording so reporting
does not claim the bill is Paid. Both old-function text replacements fail closed if
the expected installed body differs. All candidate DDL runs in one transaction.

## Verification performed

- `npm test`: typecheck and 593 application/static-contract tests passed.
- Focused ESLint on the changed TS/TSX/MJS files and `git diff --check`: passed.
- Isolated Next production build: passed, 55 pages.
- `node scripts/browser-smoke.mjs --skip-build --project=chromium-mobile
  --project=webkit-desktop --project=webkit-mobile`: all 186 local fixture tests
  passed, including the new forms, confirmation dialog, uncertain-response handling,
  responsive width and automated accessibility checks. WebKit emulation is not a
  new physical-iPhone acceptance result. Initial six new test failures were caused
  by an overly exact wrapped-select label locator; fixed to use its accessible
  combobox role and reran the complete suite.
- `LOCAL_PG_BIN=<installed PostgreSQL 17 bin>` and
  `node scripts/test-advance-payment-local.mjs --synthetic-local-only`: passed.
  Uses fresh loopback-only synthetic data, never env files or backups; stops its
  cluster in `finally`. Tests use actual existing 007/021 payment function bodies
  plus 016 notification and 054 full-payment logic; the catalog/rate resolver and
  notification sink are simplified synthetic fixtures, not a Supabase restore.
- SQL assertions cover pending versus Paid, wrong-dojo/member denial, Super Admin,
  inactive/deceased callers, anonymous EXECUTE denial, authenticated table denial,
  quote changes, amounts, duplicates, declining/re-reporting, paid-message suppression,
  and rollback of earlier bills/payments/alerts on final-month failure.
- Two real SQL sessions are synchronized behind a lock barrier for each of three
  races: direct receipt, member report and group confirmation. Exactly one request
  succeeds in each race and final totals/counts are asserted. No retry is hidden.
  Assertion transactions roll back; race data remains synthetic in the stopped
  disposable local cluster. No live zero-residue/security result is claimed.

## Remaining gates

1. Read-only staging catalog/ACL/RLS/ledger and shared-finance-helper comparison,
   scoped and authorized separately. Confirm slot 059 is still free and inspect
   existing jobs and rate/generation behaviour before changing any schema.
2. Add guarded rollback-contained acceptance against the complete staging schema,
   including real rate intervals, balance/audit totals, old and new role consumers,
   group UI/history, concurrency and independent residue/ledger checks. Keep all
   external delivery disabled/isolated. No member records may be used as fixtures.
3. After explicit approval, promote the reviewed candidate to an active migration,
   apply to staging only, verify it, then deploy its matching UI to staging and run
   guarded browser/security acceptance. Refresh ledger/recovery evidence only after
   verified application; never rewrite historical migration fingerprints.
4. Monthly automation remains UNIMPLEMENTED and DISABLED: next-month bills on the
   last calendar day of the current month at 09:00 Asia/Jakarta. Reuse the existing
   charge generation/notification logic, preserve paid advances, and test month-end,
   leap-year, timezone, replay and missed-run boundaries before any activation.
   This candidate creates no cron or scheduled job and does not activate Cloudflare.

Production remains out of scope. Do not treat this document as authorization to
apply a migration, send messages, run a worker or deploy.

# Jingwuguan Seibukan Super App — verified checkpoint

## Finance browser release preparation — 14 October 2026

Local review found that the live guarded suite never opened the subscription
pages. Added Member/Admin/Super Admin non-mutating finance inspection: offline
Playwright collection now finds 36 cases (12 per WebKit device), versus 27 before.
The nine new live finance cases have NOT been executed against staging.

Reviewed four read-only page-load RPCs using migration sources and the saved
8 October routine catalog. Added only these reads to the staging browser guard.
Moved RPC classification before the GET/HEAD fast path so those methods cannot
bypass the allowlist. Payment/receipt/waiver mutations, quote requests, unknown
RPCs, off-origin traffic and worker POSTs remain blocked.

Verified: typecheck; 29 focused SQL/security/browser-guard tests; 11 shared
browser/schedule/training guard tests (overlap, not additive); targeted lint and
diff whitespace; offline collection of all 36 staging cases with fake credentials.
Production-mode isolated build plus 210 local WebKit desktop/tablet/mobile browser
tests passed with zero failures. These use mock data and are not live evidence.
The first build stopped on sandbox trace-file EPERM before tests; the unchanged
mock-only command passed under the Windows user identity. Both logs preserved.

Initial inventory: 228 non-CLI-metadata changed/new paths before this review's
report was added; nine `supabase/.temp` files excluded. Filename/size scan found
no credential/dump filenames or files over 2 MiB, but this is NOT a complete
secret-content/source review. Final intended-file review remains before commit.
Git index empty; HEAD remains `319fb20`. No push, deployment, remote project or
provider contact, migrations, protected-secret changes or outbound messages.

Next approval: final intended-file review, commit/push release candidate, existing
staging Preview deployment/alias, then exact staging read-only preflight, 11 host
probes and 36 guarded browser cases using existing test accounts. No finance
writes, SQL reapplication, account resets or production access. See
`release/staging-060-verification-plan.md` for the boundaries.

## Active migration/release contracts synchronized — 14 October 2026

Local-only milestone on `release/v1-readiness-20260918`, HEAD still `319fb20`.
Exact-byte copies of the already-applied 059 and 060 sources now live in the active
`supabase/migrations` chain. Original reviewed copies remain in `supabase/pending`
as explicitly historical evidence, NOT pending work. No SQL was applied this turn.
Targeted LF checkout rules preserve the six exact-byte-pinned finance SQL files.

Current release/recovery/bootstrap/cutover/rollback/window contracts require all
55 migrations, 006–060, repository fingerprint
`1fb8ea8facf8f4553d81d40f2ae808665290709a52367facd7a227be988ff8f2`.
Historical pre-application finance checks retain an explicitly separate 006–058
contract. Regression tests prove old evidence cannot pass current release gates.
No prior backup, restore receipt or live acceptance evidence was relabelled.

Verified locally: `npm test` (typecheck + 868 tests, zero failures/skips); final
focused release/recovery/layout suite (102 tests, zero failures/skips, including
one LF regression added after the full suite had loaded its tests); full ESLint
and final targeted ESLint; isolated production-mode Next build using mock localhost
configuration; synthetic PostgreSQL 17 finance/security/concurrency suite; current
migration fingerprint and `git diff --check`. Disposable PG cluster stopped.
No protected backup was read by the synthetic suite. Local results are not fresh
live-browser, CI, provider-delivery or managed-recovery evidence.

Next approval-dependent work: review/commit/push only the intended candidate,
deploy the existing staging Preview and run guarded staging UI/role acceptance
as described in `release/staging-060-verification-plan.md`. Separately obtain a
fresh encrypted 006–060 backup and isolated recovery evidence using
`recovery/RESTORE_060_PLAN.md`. No production readiness claim or production access.
No remote project/provider contact, account/scheduler changes, messages, commit,
push or deployment occurred this turn. Unrelated dirty work was preserved.
Sanitized results: `operations/finance-active-chain-review-20261014.json`.

## Post-commit finance/security acceptance PASSED — 14 October 2026, 17:31 Sydney

The explicitly approved corrected attempt ran ONCE on staging eomubndonbetszdbhsrj.
Fresh exact 006–060 ledger, accepted catalog, capability and three-account checks
passed before the fixture. The pinned fixture/assertions reached the exact Z0590
rollback sentinel (psql exit 3). No migration body was reapplied.

Verified live coverage: selected-month payment reports remain pending until receipt
confirmation; assigned Admin confirms both months; first overdue month is waived
with audit; skipped unpaid debt remains; Member, scoped Admin, Super Admin and
missing-claims boundaries; direct/cross-dojo financial bypass denial; transactional
in-app notification recipients; unchanged original profiles, memberships,
appointments, notifications, outbox and sequences. Fixture notifications were
rolled back, with no external delivery/provider call.

The reserved distinct READ ONLY TLS observer proves transaction aborted and the
physical mutation backend absent. Independent before/after checks prove ZERO
RESIDUE across all 67 public tables, six sequences, catalog, exact ledger (55
migrations, 006–060), and all three original actors. All clients closed cleanly.
Protected receipt hashes were independently rechecked after the runner completed.

Consumed successful journal: C:\protected\jwg-finance-059-060-postcommit-acceptance-02.
Verified at 2026-10-14T06:31:34.300Z. Receipt SHA256:
a3b9f39770d1db02a31e47396e9645d85724ab724faa32c95c0e8df7cf66145e.
Preserve all previous failed attempts and original application/reconciliation
evidence. Never rerun this journal or reapply 059/060.

This turn ran the corrected runner, offline import/PowerShell syntax checks and
post-run receipt hash checks. The prior 858-test full suite, ten focused tests and
synthetic PG17 results remain historical; they were not rerun in this live turn.
No production/retired/disposable project, external provider, messages, Auth/account
or scheduler/settings change, commit/push/deployment occurred. Existing source
changes remain uncommitted and preserved.

Next: synchronize the already-applied pinned 059/060 sources into the active
repository migration chain and current release/recovery contracts, retaining
historical 006–058 backup/restore proof unchanged. Then rerun local release gates
and prepare staging UI/browser acceptance. This milestone is not production
readiness or deployment approval. See operations/finance-postcommit-acceptance-review-20261014.json.

## Observer connection gate resolved READ ONLY — 14 October 2026, 17:28 Sydney

The observer timeout was reproduced with an inert local child: small
BaseStream.WriteAsync calls completed into a buffer without delivering the query.
The new finance-interactive-input.ps1 explicitly flushes while draining bounded
output. Small-input and 500 KB input/700 KB output backpressure regressions pass.
The original consumed runner/controller sources remain byte-for-byte unchanged;
corrected -02 workspace copies are prepared, not executed for acceptance.

A separate READ ONLY probe reached two distinct staging backends but its initial
freshness check mixed UTC and local DateTime values. Direct parsing of preserved
JSON confirms both responses were within one second, not stale. That failed
capture is preserved. DateTimeOffset-based comparison now passes equivalent UTC,
Sydney and Jakarta instants and rejects stale, future and malformed timestamps.

Corrected staging-only READ ONLY probe verified at 2026-10-14T06:28:21.4106088Z:
two distinct TLS backends, expected server identity, both readers closed cleanly,
and a subsequent read-only probe confirms zero remaining witness sessions.
Evidence: C:\protected\jwg-finance-observer-flush-readonly-02\capture.json.
SHA256: 1fe2d35c8c2e910542b103a303d283e8f2b7c10f397988de5c674e386db58623.
Ten focused pipe/guard/acceptance regression tests pass with no skips; offline
timestamp tests and corrected runner syntax/import checks pass. The full 858-test
result below is historical and was not rerun in this diagnostic turn.

NO acceptance write test was retried. No migrations, settings, accounts, delivery
providers, messages, production/other projects, push or deployment were touched.
The new postcommit-acceptance-02 journal remains absent. Next requires approval
for one corrected rollback-contained finance/role acceptance with fresh exact
006–060 evidence, followed by independent closure and full zero-residue checks.
Never reuse postcommit-acceptance-01 or either read-only diagnostic journal.
Active migration/recovery-contract synchronization remains after acceptance.
See operations/finance-observer-flush-review-20261014.json.

## Post-commit preflight passed; observer stopped before writes — 14 October 2026, 09:14 Sydney

Added a dedicated POST-COMMIT acceptance assembler/verifier for the full exact
006–060 ledger, without reapplying 059/060 or relaxing historical 006–058 recovery
checks. It reuses the pinned three-account fixture and SQL guard, requires the
accepted committed catalog, and checks independent rollback/ledger/data/actor
evidence. The old rehearsal/application entry points retain their existing gates.

Verification: typecheck +858 unit tests passed (zero failures/skips), 12 focused
tests passed, targeted ESLint and PowerShell/import checks passed. Synthetic local
PG17 finance/role/waiver/repricing/concurrency/savepoint tests passed and the cluster
stopped. Initial sandbox runs encountered Windows filesystem/identity restrictions;
the successful full suite and local PG run used the real Windows account.

Fresh staging-only READ ONLY preflight at 09:14 passed: exact 55 migrations
(006–060), accepted catalog, 67 public-table baselines, six sequences and three
unchanged bound test actors. The concurrently opened read-only observer then timed
out with no output. The runner stopped BEFORE invoking any mutation client:
mutationAttempted=false; no mutation.json exists. The rollback fixture did NOT run.
Do not call this completed post-commit acceptance or post-test zero-residue proof.

Consumed journal: C:\protected\jwg-finance-059-060-postcommit-acceptance-01.
Preserve its claim, preflight and timeout evidence; do not reuse or automatically
retry it. A separate READ ONLY connection diagnostic succeeded and confirmed zero
remaining acceptance sessions. Server max_connections=60 is NOT evidence of the
session pooler's configured capacity; the concurrent observer timeout cause remains
unverified. No account/settings changes, messages/providers, production/other
projects, migration reapplication, commit/push/deployment occurred.

Next: resolve the independent-observer connection gate, then use fresh evidence and
a newly approved one-attempt journal for post-commit acceptance. Active migration
and recovery-contract synchronization still follows acceptance; do not relabel
older backup/restore evidence. See operations/finance-postcommit-review-20261014.json.

## Independent application reconciliation PASSED — 14 October 2026, 08:57 Sydney

The approved corrected READ ONLY verification completed on staging
eomubndonbetszdbhsrj. A distinct observer confirmed the original transaction
committed, no original session remained, exact ledger names/statements/catalog
cover 006–060 (55 migrations), and the accepted catalog matches. All 67 public
table baselines, six sequences and three test actors' profile/membership/assignment
digests are preserved. Both clients closed cleanly; all six evidence rows are
READ ONLY with TLS. No migration was reapplied and no data was changed.

New owner-only evidence: C:\protected\jwg-finance-059-060-application-reconciliation-02.
Capture SHA256: 2385d414dcab5a679555f472b508d13b026f926e891632551dc7337029d8da8d.
Prior failed capture and original application receipt were hash-checked unchanged.
The original unverified-stop-no-retry outcome is preserved as history; the new
verified.json separately records application-independently-reconciled. Never
overwrite/reuse either journal or retry the already-applied migration transaction.

The corrected asynchronous input/draining path passed an offline backpressure test
with 500000 input bytes and 700000 output characters. Seven focused application
assembly/evidence tests and syntax checks passed; the full 852-test suite result
below is from the previous application turn, not rerun here.

Next: prepare guarded POST-COMMIT rollback-contained finance/role acceptance using
fresh exact 006–060 evidence and independent post-test closure/residue checks.
That post-commit test has NOT run. Active repository migration/recovery contract
synchronization remains outstanding before any deployment. This verification is
not production readiness, a deployment, or new authorization for external changes.
Production, other projects, delivery providers, email/push/monitors and schedulers
were untouched. See operations/finance-staging-reconciliation-review-20261014.json.

## Staging 059–060 APPLIED; final verification incomplete — 14 October 2026

This section supersedes the older "unapplied" status below. One approved atomic
application committed 059 then 060 on eomubndonbetszdbhsrj at approximately
08:45 Sydney. Exact saved ledger names/statements now cover 006–060 (55 rows).
DO NOT reapply either migration or rerun the consumed application journal.

A fresh encrypted consistent database/Storage backup was verified at
C:\protected\jingwuguan-recovery-source-20261014-ac02b357; all previous backups
are preserved. Authenticated decryption and byte comparison passed; temporary
plaintext was removed. Six stored logo files are included.

The pinned finance/security fixture passed INSIDE the application transaction,
then its savepoint rolled back before COMMIT. Original data across 67 public
tables and six sequences was compared before commit, and saved post-commit
snapshots match the accepted catalog, exact ledger and three original actors.
However, all sequential checks reused the mutation backend. The strict independent
observer gate correctly stopped before post-commit rollback acceptance.

A separate two-connection READ ONLY reconciliation reported committed from a
different backend and no remaining original session, but its capture then stalled.
Only its exact locally-owned read-only psql child was stopped; all clients closed.
Its partial evidence, original application claim/outcome and prior rehearsal remain
unchanged. A bounded asynchronous input correction is prepared locally, NOT rerun.
Do not describe the incomplete reconciliation as complete zero-residue acceptance.

Local verification: typecheck +852 tests passed with no failures/skips before
application; synthetic PG17 finance/concurrency and savepoint cleanup passed and
cluster stopped. Three late-reconciliation verifier tests and targeted ESLint pass.
A Windows ESM import error was corrected before any application claim/mutation;
the actual migration transaction was attempted exactly once.

Next: approve one corrected READ ONLY independent staging reconciliation in a new
protected evidence directory. Then finish the already-requested post-commit
rollback acceptance using fresh 006–060 evidence. Do not retry the migrations.
The active repository recovery contract is still 006–058: promotion of the pinned
059–060 files and contract synchronization remain pending verification. Deployment
is blocked until that work is reconciled. No production/retired/disposable or
delivery-provider contact, emails/push, scheduler enablement, Auth changes,
commit/push/deploy occurred. See operations/finance-staging-application-review-20261014.json.

## Live staging rollback rehearsal VERIFIED — 14 October 2026

One approved 059–060 rollback-contained rehearsal passed on staging
eomubndonbetszdbhsrj only. The fixed journal records verified-rollback at
2026-10-13 21:17:09 UTC (14 October 08:17 Sydney), with zero failures. Fresh
read-only prerequisites/baseline/ledger/identity/actor captures preceded the run.
The unmodified pinned guard/account recheck, both migration bodies, three-account
fixture and all assertions reached the exact Z0590 rollback sentinel (psql exit 3).

Independent post-run checks prove transaction aborted and physical mutation backend
gone, with unchanged catalog/data across 67 public tables and all 6 sequences.
Ledger names/statements/catalog remain 006–058 (53 rows), and three bound actor
profile/membership/assignment digests are unchanged. Observers used different
backends from mutation; after-baseline also differs from before-baseline backend.
All clients closed and the durable fixed-journal outcome was recorded. No retries.

Acceptance covers first-month waiver, retained skipped debt, two-month pending
report, assigned receiver confirmation, role/RLS boundaries, denied direct finance
writes, expected transactional alerts/audit and preserved original records/outbox.
No emails/push/provider calls, Auth changes, persistent migrations, production/
retired/disposable contact, commit/push or deployment. 059–060 remain unapplied.

Preparation initially stopped locally (zero database connections, empty unclaimed
folders): the credential writer includes createdUtc, but the protected reader only
accepted the legacy six-field shape. Added support for precisely that known extra
field with strict UTC timestamp validation; unknown keys, malformed metadata and
all wrong target/SID/hash/ACL cases still fail. Credential/password bytes unchanged.
After tests, resumed only the same empty private folders before the first DB attempt.
No claim/outcome or previous evidence was cleared, changed or reused.

Verification: typecheck +845 tests pass, zero failures/skips; nine protected-transport
and ten assembler/guard/fixture focused tests pass; lint and syntax checks pass.
Full report: operations/finance-staging-rehearsal-review-20261014.json.
Fixed evidence: C:\protected\jwg-finance-059-060-staging-rehearsal (do not reuse).
Inputs: C:\protected\jwg-finance-rehearsal-inputs-749c443975264cb7ad714085b0c7dedc.
Branch/HEAD remain release/v1-readiness-20260918 / 319fb20; unrelated work preserved.

Next gate: separate explicit approval for permanent staging application of 059 then
060 and guarded post-application acceptance. This successful rehearsal does not
authorize migration application, deployment or production access.

## Live read-only staging evidence passed — 13 October 2026

Executed the approved read-only batch against eomubndonbetszdbhsrj only, using the
existing protected staging credential, pinned Node/psql/CA and TLS verify-full.
Seven client connections, no retries. All captures report read-only transactions
and server TLS. Eight new owner-only files (including locally derived independent
bindings) are preserved under C:\protected\jwg-finance-readonly-a823c8874a05448db72f977a3e684fee.
All previous evidence and credential files were preserved.

Verified at 08:05:49 UTC: baseline covers 67 public tables and 6 sequences; all
53 ledger names/statements (006–058) match repository sources; three dedicated
test-account identities, independent bindings and role eligibility pass. Required
pooler capabilities, statistics visibility, baseline prerequisites and consistent
server identity pass. Private loader and complete offline bundle assembly pass.
This is NOT a login/security-write test or a successful live rollback rehearsal.
The sequential connections reused one physical backend; independent post-mutation
closure/reconciliation remains unproven and its distinct-backend gates unchanged.

One-off capture/verifier syntax checks and seven focused assembler/guard tests
pass. Application code unchanged; prior full typecheck +843-test result retained,
not rerun this turn. See operations/finance-readonly-evidence-review-20261013.json.
No database writes, messages, other-project/provider/production access, migrations,
commit/push or deployment. 059–060 remain unapplied; HEAD remains 319fb20.

Next requires separate explicit approval for one rollback-contained 059–060 staging
rehearsal and fresh before/after captures with independent zero-residue, ledger,
actor and session checks. Evidence freshness passed only at the recorded time:
refresh immediately before any separately approved rehearsal; never retimestamp
or reuse expired captures. Persistent migration application is a later approval.

## Reviewed protected preparation entry point — 13 October 2026

Added finance-reviewed-staging-preparation.mjs: exact fixed-target inputs load
owner-only evidence, build the pinned rollback bundle and prepare the existing
fixed-journal/protected controller. Caller SQL, source paths, raw evidence, custom
adapters, journal overrides and framing/timeout changes are rejected. Resource and
target values are copied before async reads. Preparation exposes only an immutable
hash receipt, not SQL or private actor/baseline data, and does not dispatch work.

The separately callable runApproved requires the exact project/nonce/bundle hash
and rollback-rehearsal operation. This is a binding acknowledgement, NOT a substitute
for human approval. Existing controller freshness, single-attempt, protected
journal and independent rollback/ledger/actor reconciliation remain unchanged.
No CLI or automatic execution has been added; readyToExecute remains false.

Thirteen protected-loader/preparation tests and four assembler tests pass, along
with focused ESLint. Synthetic owner-only files remain unchanged; nonexistent
credential/client/certificate resources are never opened. All acknowledgement
tests intentionally mismatch, so the real fixed journal and transport never run.
Full npm test passes typecheck and all 843 tests, zero failures/skips. Whitespace
checks pass and both pending migration hashes remain unchanged.

Correction to the prior next-step wording: an unmodified complete successful
staging guard cannot be exercised against the intentionally rejected loopback
database. No bypass, fabricated live evidence or weakened guard was introduced.
Positive live TLS/account/assembly execution remains unverified. The next external
step requires separate approval for fresh read-only staging evidence (baseline,
capabilities, ledger, actor bindings); it does not authorize a write rehearsal.
No remote service, real protected credential/backup, migration, commit, push or
deployment was used. 059–060 remain unapplied; branch/HEAD remain
release/v1-readiness-20260918 / 319fb20. Unrelated changes preserved.

## Pinned rollback-only assembly — 13 October 2026

Added an offline assembler with exact target/nonce/baseline/release-evidence inputs.
It reads only four fixed repository sources, verifies their raw SHA256 bytes, and
orders transaction/timeouts/assertions, server/account guard, xid8 identity, 059,
060, three-account fixture, assertions and deliberate rollback sentinel. Reviewed
migration transaction envelopes are removed; no COMMIT is included. No caller SQL,
paths, framing, timeout overrides or guard bypass are accepted. Immutable output
includes complete/component hashes and explicitly remains readyToExecute=false.

Verification: npm test passed typecheck and all 840 tests, zero failures/skips.
Ten focused tests and ESLint were rerun after aligning the fixed statement timeout
to the existing launch plan's 15 seconds. Actual local PG17 rerun passed unmodified
bundle rejection before identity/migration work, existing independent rollback
baselines, simulated-ticket fixture assertions and all eleven concurrency cases.
Both disposable clusters js-fee-test-oK3sdJ and js-fee-test-Ub8hiK are stopped.
Original migration and local-fixture hashes remain unchanged; whitespace checks pass.

This does NOT prove the complete positive TLS/guard/assembly path: that integration
and a restricted connection to the protected executor remain next. Only afterward
request separately approved fresh live evidence/rehearsal. No real credentials,
protected source backups, remote services, migration, commit/push or deployment
were used. 059–060 remain unapplied; branch/HEAD remain release/v1-readiness-20260918
/ 319fb20. Existing unrelated working-tree changes were preserved.

## Separate three-account fixture — 13 October 2026

Added separate 059_060_staging_fixture.sql and assertions, preserving the original
local-only fixture, fourth-account assertions and sequence-negative tests byte for
byte. The new component requires a transaction-local nonce/binding ticket, owner
role, read-write transaction and enabled assertions. The pre-work guard emits that
ticket only after server/account checks; the fixture consumes it. This ticket is
an ordering contract, not standalone authorization or proof of the target server.

The fixture inserts only isolated classes, dojos, memberships, one assignment, rates
and charges for the three independently bound accounts. It does not create accounts,
modify profiles/original memberships/assignments, invoke monthly generators, or
contain COMMIT. Assertions cover waiver, retained skipped debt, pending-before-paid,
assigned receiver confirmation, three-role/missing-claim boundaries, exact alerts,
and unchanged original profiles/memberships/assignments/audit/outbox/sequence state.
The owner-only baseline is not granted to authenticated; only fixture IDs are shared.

Six focused fixture/guard tests and focused ESLint pass. Actual local PG17 executes
the new fixture/assertions with an explicitly simulated ticket, rejects missing or
wrong tickets, duplicate actors and original-profile mutation, and independently
verifies unchanged public catalog/data/sequences after every rollback. Existing
finance regression and all eleven concurrency cases pass. Cluster js-fee-test-s2AGKM
stopped; no protected source backups or real credentials read. Final npm test passed
typecheck and all 836 tests, zero failures/skips. Focused ESLint and whitespace
checks pass. Branch/HEAD remain release/v1-readiness-20260918 / 319fb20.

The positive staging TLS guard remains unverified; simulated local tickets do NOT
prove that path. Next: pinned rollback-only assembler and complete positive guard/
assembly integration tests, followed by separately approved fresh live evidence.
No remote access, migration, commit/push or deployment. 059–060 remain unapplied.

## Staging pre-work identity/account guard — 13 October 2026

Added an offline guard builder requiring the exact staging target, nonce, protected
baseline and complete release evidence. It snapshots inputs and validates the
existing evidence gates before generating SQL. In an already-open transaction the
guard checks database/user, address/port/cluster, TLS, read-write state, nonce marker
and baseline/account freshness before recomputing the pinned account SELECT and
comparing the exact three-account snapshot. No account or migration writes occur.
Application name is transaction-local; no local bypass or caller SQL is accepted.

This is ONLY a pre-work component, not a complete fixture/assembler or executable
release command. It returns completeBundle/readyToExecute false. The local fixture,
fourth synthetic account and deliberate sequence-negative test remain unchanged.

Three new offline tests pass. The unmodified generated guard compiles on local
PG17 and rejects loopback/non-TLS and read-only contexts before account/migration
work, with no surviving nonce session. Its positive staging/TLS path and account
comparison execution remain unverified. Do not describe rejection as live success.

The first PG17 run failed an existing retained-backend test's intended committed
transaction assertion because Node/PostgreSQL clock ordering failed first. The
synthetic retained-client model now witnesses release on the server clock and
explicitly checks ordering; production clientFinishedAt validation is unchanged.
Full PG17 rerun passed rollback, catalog/data/sequence checks and all eleven races.
Both clusters stopped: failed js-fee-test-fJB1yB and successful js-fee-test-ZAvZdx.
No protected source backups were read. Final npm test passed typecheck and all 833
tests, zero failures/skips. Focused ESLint and whitespace checks passed.

Next: separate three-account staging fixture/assertions and pinned transaction
assembler; positive guard integration must be verified before proposing live use.
No remote service, real credential, migration, commit/push or deployment. Candidate
059–060 and original fixture hashes remain unchanged; neither migration applied.

## Protected version-2 ledger/account captures — 13 October 2026

Added exclusive CaptureReleaseLedger and CaptureReleaseActors modes to the existing
protected preflight. Both require explicit read-only staging/session-pooler flags,
private output and pinned Node/client/CA resources. They use the already reviewed
server-bound queries without modifying historical SQL, v1 capture modes or files.
Independent actor bindings must have a caller-provided matching SHA-256; invalid
bindings are refused before client startup. No arbitrary SQL parameter was added.

Create-once ledger-v2-capture.json and actors-v2-capture.json retain actual snapshots
before semantic verification. Complete server identity, TLS, freshness, exact ledger
content and independently bound eligible accounts are checked. Failed evidence or
empty reservations are preserved and block reuse; public output is receipt-only.
The complete evidence loader still separately enforces cross-capture server identity.

Seven new focused tests pass (six capture tests plus one combined integration test).
The combined test runs inventory, baseline, capability, ledger and actor captures
through the protected preflight using synthetic DPAPI credentials and no-network
inert clients, then successfully loads the complete private evidence set. Failures,
timeouts, mixed modes, bad bindings and unchanged historical files are covered.
Final regression: npm test passed typecheck and all 830 tests, zero failures/skips.
Focused ESLint and git diff --check pass. Branch/HEAD remain
release/v1-readiness-20260918 / 319fb20; unrelated work remains untouched.

Next: separately reviewed staging-only fixture/SQL assembler and final integration
review, then explicit permission for fresh live evidence and any write rehearsal.
No live provenance or Supavisor rollback behavior has been verified by these tests.
No staging/production/provider contact, real credential access, migration, commit,
push or deployment. Migrations 059–060 and all pinned SQL hashes remain unchanged.

## Protected capability capture integration — 13 October 2026

Added exclusive CapturePoolerCapabilities mode to the existing protected preflight.
It requires explicit read-only staging/session-pooler flags, protected output and
pinned Node/client/CA resources. The offline bridge supplies only the fixed query;
no caller SQL is accepted. The bounded child uses the existing clean environment,
TLS verification and read-only defaults. Output is saved create-once to
capabilities-capture.json, then checked by the existing capability verifier.

Invalid capability content is preserved privately and rejected; failed child I/O
leaves its reserved file and cannot be retried into the same path. Public output
contains only a receipt, never capability rows or credentials. Successful capture
does not prove rollback, independent server closure, or authorization to rehearse.

All 15 focused capture tests pass, including five new capability cases covering
fixed-query planning, private success/no overwrite, mode/resource guards, semantic
failure preservation, bounded output and timeout/client cleanup. The shared test
exit probe now supports the exact baseline-inert executable as well as protected-inert,
avoiding recyclable PID checks. No runtime process safeguard was relaxed.

Final regression completed: npm test passed typecheck and all 823 tests, zero
failures or skips. Focused ESLint and git diff --check passed. Branch/HEAD remain
release/v1-readiness-20260918 / 319fb20; unrelated changes remain untouched.

Next: version-2 ledger/actor preflight capture and the separately reviewed staging
fixture/SQL assembler. Capability SQL and migration/source hashes are unchanged.
No staging/production/provider contact, real credential access, migration, commit,
push or deployment; 059–060 remain unapplied. Live use requires fresh authorization.

## Protected evidence file loader — 13 October 2026

Added a local-only, read-only file boundary for the future finance rehearsal.
The Windows reader requires an owner-only directory and file ACL, rejects reparse
ancestors/files, holds a deny-write/delete read handle, bounds size before hashing,
checks the receipt and strict UTF-8, and rechecks ACLs before returning private IPC.
The Node loader independently checks the bounded receipt/bytes and validates all
baseline, capability, version-2 ledger/actor and independent binding content.
Failures have fixed messages without private evidence or paths.

The additive prepareFixedProtectedStagingPoolerRollbackFromFiles entry reads only
the five fixed capture filenames. It snapshots caller configuration and prepares
the existing controller, never invoking it. No credentials, client/CA resources or
actual staging journal are opened during preparation. Existing internal transport
factories remain primitives, not reviewed release commands or SQL allowlists.

Ten new synthetic tests cover unchanged files, ACLs, junctions, missing/tampered
files, encoding/size limits, stale/wrong-server/version evidence, configuration
mutation and preparation-only behavior. npm test passed typecheck and all 818
tests, zero skipped. Focused ESLint passed. SQL unchanged; no PG cluster needed.

Still required: protected preflight capture integration and a separately reviewed
staging fixture/SQL assembler, then fresh live evidence with explicit authorization.
File privacy and hash consistency do not authenticate remote provenance. This was
local-only: no remote contact, real secrets, migration, commit/push or deployment.
Migrations 059–060 remain unapplied; unrelated work is preserved.

## Server-bound ledger/account evidence — 13 October 2026

Completed the final read-only diff review blocked by the previous usage limit;
branch/HEAD remain release/v1-readiness-20260918 / 319fb20. Preserved unrelated edits.

Release evidence now requires version-2 ledger and actor envelopes with server
address, port and cluster ID matching capability/public-baseline identity. Both
preclaim and post-run checks reject missing or different server identity even when
data matches. Historical SQL and version-1 evidence are unchanged and cannot be
upgraded by copying metadata. Original source hashes and complete extended query
hashes are pinned; the protected after-capture bridge accepts only the new queries.

Added negative tests for old envelopes, incomplete clients, wrong query/source
digests, wrong bindings and missing/different server identities. Actual extended SQL
preserves ledger contents and actor digests on local PG17. Full local finance
rollback and eleven races passed; js-fee-test-6EW7nC stopped, no source backups read.

The first full suite hit EPERM in a test-only post-exit PID probe. A PID alone can
be recycled on Windows and is not stable child identity. Replaced that probe with
an exact synthetic-executable check, preserving protected clientClosed assertions.
A negative test confirms it rejects a running child, ignores another executable
path and passes after shutdown. No application process safeguards were changed.

Final verification: npm test passed typecheck and all 808 tests, zero skipped.
Focused evidence/controller tests (18), protected bridge tests (6), ESLint and
whitespace checks pass. The initial PID-probe failure is not counted as a successful
run; the full rerun passed after the test-only correction.

Next: protected version-2 preflight capture/evidence loader and separate reviewed
staging fixture/assembler. Content/hash/server matching still does not independently
authenticate live provenance. No staging/production/provider contact, real secrets,
actual staging claim, migration, commit, push or deployment. 059–060 remain unapplied.

## Mandatory pooler capability content gate — 12 October 2026

Added finance-pooler-capabilities.mjs with a fixed, bounded READ ONLY query and
offline receipt/snapshot validation. Both fixed pooler factories now require its
capture through releaseEvidence.capabilities. The gate checks function permissions,
statistics visibility, self activity, TLS/read-only state and freshness. Before a
journal claim it binds address/port/database/user/cluster to the public baseline.
The query reads bootstrap xid 1 status and requires no xid assigned to its own
transaction. Missing capability evidence, denied permissions, stale captures or
server mismatch block dispatch. This does not prove live capture provenance.

Actual query verified on disposable local PG17 in two independent read-only sessions;
remote verification rejects loopback evidence. Full local finance rollback and all
eleven concurrency cases passed; js-fee-test-2Lgmvu stopped. No source backups read.

The first full-suite run exposed an unrelated intermittent provider-config test:
OpenSSL can export a random P-256 scalar as 31 bytes, making an intended valid
configuration fail length validation (and destabilizing pair-mismatch tests too).
Reproduced with a leading-zero scalar;
made positive/mismatch synthetic keys deterministic and added a 31-byte rejection
regression. Production/provider validator and all real credential values unchanged.

Final verification: npm test passed typecheck and all 804 tests, zero skipped.
Focused ESLint and git diff --check passed. The earlier failing full-suite run is
not counted as success; the complete rerun passed after the test-only correction.

Next: protected capability capture/evidence-loading provenance boundary, then the
separately reviewed staging fixture/SQL assembler. Existing ledger/actor captures
still lack server-address/cluster metadata. No live services, real credentials,
actual staging journal, migration, deployment, commit or push. 059–060 remain
unapplied; branch/HEAD release/v1-readiness-20260918 / 319fb20 unchanged.

## Mandatory pooler ledger/account gate — 12 October 2026

Added finance-pooler-release-evidence.mjs and wired it into both fixed pooler
factories. Pinned capture envelopes and independent three-account bindings are
mandatory. Freshness, eligibility and exact 006–058 ledger content are rechecked
before a journal claim; stale or invalid evidence cannot dispatch a client.

Protected adapters/bridge now capture ledger and actors through unchanged pinned
read-only SQL, reserving private phase files create-once. Independent comparisons
run after the attempted mutation even when another check fails. Either ledger or
account drift/failure prevents verified success, and both booleans are persisted in
the sanitized journal. Raw SQL, account identifiers and transport errors stay private.

Tests cover missing/stale/corrupt/changed evidence, clock expiry after preparation,
ineligible actors, reused backends, pre-completion evidence and failures of either
capture. The synthetic Windows bridge executes all five phases using inert clients,
temporary owner-only ACL/DPAPI evidence and fake credentials. Fixed a test-client
encoding defect by explicitly emitting UTF-8 so full migration text round-trips.

Verification: npm test (typecheck +798 tests) passed, zero skipped; focused ESLint
and git diff --check passed. No SQL/migration body changed, and no PostgreSQL cluster
or remote service was started this milestone. No real credentials, staging claim,
deployment, commit or push. Branch/HEAD remain release/v1-readiness-20260918 / 319fb20.

059–060 remain unapplied. This is local gate implementation, not live acceptance.
Next: capability/provenance gate (existing ledger/actor queries lack address/cluster
metadata), followed by a separately reviewed staging fixture/SQL assembler. Only
after local verification should fresh live evidence and explicit rehearsal approval
be proposed. See operations/FINANCE_FINAL_BUNDLE_REVIEW_20261012.md.

## Final-bundle review: real-client diagnostic fix and remaining gates — 12 October 2026

Reviewed local rehearsal assembly, fixture/assertions, pinned candidate hashes,
protected factory/adapters and separate ledger/actor verifiers. See
operations/FINANCE_FINAL_BUNDLE_REVIEW_20261012.md for the precise gap list.

Found a real transport incompatibility missed by inert tests: mutation psql used
terse diagnostics, which omit SQLSTATE required by isExpectedRollback. Changed
mutation plans/protected helper to verbose; read-only evidence remains terse.
Added actual local psql regression proving terse rejection and verbose acceptance
using the exact nonce/SQLSTATE sentinel. Raw diagnostics remain private.

Full typecheck +792 tests pass, none skipped; focused lint/whitespace pass. Actual
local PG17 diagnostic test, finance rollback and eleven races pass; temporary
js-fee-test-uTNxyP cluster stopped. Existing fixture guards and migrations unchanged.

Important correction of scope: protected transport wiring is locally complete, but
there is no reviewed executable staging SQL bundle or complete release prerequisite
gate. Current fixed factory does not require exact ledger/actor/capability evidence;
its public-only after-baseline does not cover the separate migration ledger. Local
fixture/schema/fourth-actor/negative-sequence setup must not be copied to staging.
Required next work is mandatory outer evidence gating and independent ledger/actor
reconciliation, followed by a separate staging fixture/assembler and local tests.

No live services, real credentials, source backups, staging journal claim,
migration, deployment, commit or push. 059–060 unapplied; branch/HEAD remain
release/v1-readiness-20260918 / 319fb20. No live rehearsal approval inferred.

## Protected controller and private evidence wiring — 12 October 2026

Added finance-protected-pooler-adapters.mjs and the internal PowerShell receipt
bridge, wired through prepareFixedProtectedStagingPoolerRollback. The fixed factory
offers no journal-directory, ACL, transport, comparator or closure overrides and
does not dispatch or read credentials during preparation. The existing fixed
attempt journal must be claimed before any child can start.

Each bridge phase checks the private schema-2 staging journal, nonce, bundle digest,
scope and unfinished state. Mutation input must match the journal digest. Exact
private mutation/closure/baseline capture files are reserved create-once BEFORE
credential use/client startup; empty or partial files are retained and block reuse.
Only a small phase/hash receipt crosses stdout. Raw bounded client results stay in
owner-only capture files; the adapter verifies receipt/content binding before use.
Protected baseline envelopes are reconstructed from the original verified inventory
and the independently captured result. No captured password is returned to Node.

End-to-end tests exercise real Windows ACL/DPAPI, process bridge, pinned inert
executable, controller and journal. Synthetic rollback succeeds with retained idle
backend semantics. Wrong sentinel, committed transaction and changed catalog fail
while independent baseline evidence is still collected. Missing claims/reused phase
files prevent mutation; resource replacement after preparation prevents any client
startup and persists failure. All started synthetic children are verified exited.
Tests never invoke the real fixed C:\protected journal or a database executable.

Verified: five focused integration tests, typecheck +792 tests (none skipped),
focused lint and whitespace checks pass. An initial new-test field-name typo was
corrected and both focused/full suites rerun successfully. No SQL/database behavior
was exercised by the inert simulator; this is NOT live pooler or migration evidence.

No real credentials, live services, actual staging journal claim, migrations,
deployment, commit or push. Branch/HEAD remain release/v1-readiness-20260918 /
319fb20; 059–060 unapplied. The protected wiring milestone is complete locally.
Remaining before live use: final SQL/fixture bundle review, fresh exact ledger,
actors/baseline/capability evidence, real pooler visibility/behavior verification,
and explicit live-rehearsal approval. The internal primitive/bridge must not be
used as a bypass of that review or the fixed factory.

## Protected pooler credential/transport primitive — 12 October 2026

Added finance-protected-pooler-process.ps1 as an internal library, not a live-run
CLI or approval gate. It validates owner-only directory/file ACLs, local non-reparse
paths, encrypted-record SHA256, bounded record size, Windows SID, project/purpose,
and the exact staging PSCredential binding before using DPAPI credentials.
Client/CA bytes are checked immediately before use and held under read-only file
sharing through child completion. No supplied host, environment or connection
arguments are accepted; modes match the independently tested launch plans.

Only the child ProcessStartInfo receives PGPASSWORD. Its parent copy is removed
after spawn and in cleanup; the SecureString is disposed. Plaintext strings are
still managed memory: this is not a memory-zeroization guarantee. SQL is exact
hash-bound strict UTF-8 (no BOM/NUL), written asynchronously. The process has bounded
input/output, a five-second input deadline, thirty-second completion deadline and
five-second termination wait. Failures discard partial output and return fixed
categories. Exit 3 remains raw internal evidence, never a rollback success verdict.
No retry is implemented. Successful raw output must remain private in the caller.

Seven new tests use only newly generated synthetic DPAPI records and a compiled
no-network executable. Both modes match the launch plans; secret isolation,
wrong bindings/hashes/ACLs/paths/input, unknown parameters, rollback exit, oversized
or invalid output and timeout cleanup pass. Every started synthetic child is
verified exited. Fixed a culture-sensitive BOM comparison during testing by using
ordinal comparison. Typecheck +787 tests pass, none skipped; focused lint and
whitespace checks pass. Existing preflight and controller behavior is unchanged.

No real credentials, live connections, source backup access, staging journal claim,
migration, deployment, commit or push. 059–060 remain unapplied. Branch/HEAD remain
release/v1-readiness-20260918 / 319fb20. Final Node/controller bridge and private
evidence capture wiring are still outstanding; the primitive alone does not enforce
the fixed journal or SQL semantic review. Next: wire those boundaries using inert
end-to-end tests, then obtain fresh capabilities/evidence and explicit live approval.

## Pooler launcher resource/environment layer — 12 October 2026

Added preparation-only finance-pooler-launch-plan.mjs. It accepts exact configuration,
snapshots caller inputs before asynchronous checks, pins the existing staging
session-pooler target and SHA256-reviewed client/CA files, and rejects path links,
Windows UNC/device paths and alternate streams before reading those resources.
Separate rollback-rehearsal and read-only-evidence plans fix TLS, psql startup flags,
connection/statement/lock/idle timeouts and bounded output. Only four OS environment
variables are carried forward; ambient secrets, PG connection overrides, startup
hooks and proxy variables are not copied. Unknown config and ambiguous OS keys fail.

The plans carry no password or execution authority, are frozen and explicitly
require resource revalidation and credential loading before future dispatch. This
is the launcher's resource/environment layer, NOT a completed protected live launcher.
Client/CA hashes prove byte identity only, not executable trust or certificate validity.

Verified: typecheck +780 tests pass, none skipped; nine focused launch/direct-plan
tests and focused lint pass. A compiled inert Windows executable (no network or
database code) receives both modes' exact arguments, environment and Unicode/CRLF
input through the bounded runner. Mutation of config, resource replacement and
untrusted path/environment controls fail. The interrupted prior whitespace check
was rerun successfully; no local PG cluster was needed or started this turn.

No live connections, real secrets, staging journal claim, migration, deployment,
commit or push. Branch/HEAD remain release/v1-readiness-20260918 / 319fb20; 059–060
remain unapplied. Next is protected credential loading and final dispatch/controller
wiring with inert tests; capability/visibility checks, fresh evidence and separately
approved real-pooler rehearsal remain outstanding.

## Pooler controller and fixed journal integration — 12 October 2026

Completed code/local-test assembly of the separate pooler path. The fixed factory
uses the existing single staging journal directory with no path, mode, ACL or
closure override. Preparation performs no filesystem claim or remote operation.
Exact UTF-8 SQL bytes/hash and protected baseline bytes are copied before dispatch;
baseline freshness is checked again before the create-once journal claim.

Bounded client completion/input hash, nonce/XID identity, baseline server/time,
independent read-only closure evidence, exact rollback sentinel and independent
public catalog/data/sequence reconciliation must all pass. Invalid identities
cannot reach the observer. Post-dispatch failures still attempt reconciliation;
existing claims or failed persistence never permit automatic retry.

Pooler journal schema 2 records closureKind=pooler-transaction, closureVerified and
physicalBackendGone, rejecting the legacy sessionClosed field. An aborted/idle
retained backend is not reported as physical shutdown. The direct path remains
separate and its regression tests pass. Mock adapters prove assembly only, not
SQL semantic safety, protected transport or real Supavisor behavior.

Verified: 21 focused controller/journal tests; typecheck and all 775 tests pass,
none skipped; focused lint and Git whitespace pass. Full local PG17 finance,
rollback and eleven concurrency cases pass; js-fee-test-2v6UVW stopped. Branch/HEAD
remain release/v1-readiness-20260918 / 319fb20; unrelated changes preserved.

No live connection, real credential read, source-backup access, staging journal
claim, migration, deployment, commit or push. 059–060 remain unapplied. Next:
prepare the protected pooler launcher and transport adapters with inert local
tests, then obtain fresh capability/visibility, ledger/actor/baseline evidence and
separate live-rehearsal approval. This supersedes the journal-integration TODO below,
not the remaining launcher, fixture or live-evidence requirements.

## Explicit session-pooler preparation and closure model — 12 October 2026

User approved option 2 (code/local tests only). Added finance-pooler-rehearsal.mjs
with an exact session-pooler preparation target: staging eomubndonbetszdbhsrj,
aws-0-ap-southeast-2.pooler.supabase.com:5432, project-qualified postgres user and
verify-full TLS. It grants no execution authority and does not change the existing
direct-only write-target validator or fixed staging journal entry point.

Pooler identity captures pg_current_xact_id() as xid8 before work. A separate fresh
READ ONLY observer must prove pg_xact_status is aborted, bind the nonce/transaction/
server/cluster, use a different PID and follow client completion. A retained backend
must be exactly idle, with matching backend start, no xact_start/backend_xid and no
original LOCAL application marker. Committed/in-progress/unknown status, active or
open reused transactions, PID replacement, stale/ambiguous evidence all fail.
Result distinguishes rehearsalScopeClosed from physicalBackendGone and never claims
baseline equality. The direct physical-backend-absence verifier remains unchanged.

Actual disposable PG17 model kept a psql backend alive after rollback and proved
acceptance of aborted/idle state plus rejection of open, committed and reused-open
transactions. This models backend retention; it is NOT live Supavisor/pooler
acceptance or proof of real frontend disconnect behavior. Global PostgreSQL XID
allocation is expected and is not an application sequence mutation.

Six new unit tests plus existing direct target/closure tests pass; focused lint
passes. Full local finance/rollback and eleven races pass; js-fee-test-9S9Nye stopped.
Final typecheck +771 tests pass, none skipped; whitespace checks pass. Branch/HEAD
remain release/v1-readiness-20260918 / 319fb20; unrelated dirty work preserved.
No live services, real credentials, source backups, migration, deployment, commit
or push. 059–060 remain unapplied; staging journal not created/claimed.

Remaining before live use: protected pooler launcher/journal integration with
explicit closure semantics, capability/visibility checks for pg_xact_status and
pg_stat_activity, real session-pooler evidence, fresh baseline/ledger/actors,
cross-schema/resource review and reviewed staging fixtures. No implicit fallback,
automatic retry or permission for a live write was added by this preparation.

## Transport decision required before staging write integration — 12 October 2026

Read-only local network inspection again found zero preferred non-loopback/non-link-
local IPv6 addresses and zero IPv6 default routes. No DNS lookup or remote request
was made. The prior direct-endpoint diagnosis was IPv6-only; that endpoint was not
requeried today. finance-rehearsal-target.mjs still permits only the exact staging
direct host, postgres user, port 5432 and verify-full TLS. The successful staging
catalog audits used the separately approved read-only session-pooler transport.

Do not continue towards an unusable direct-only live launch or silently convert the
read-only pooler permission into write authority. User choice needed: provide an
IPv6-capable execution connection/host, or approve preparation of an explicit
staging session-pooler rehearsal path with reviewed identity/closure semantics.
Pooler backend reuse must not be hidden by dropping the independent closure check.
Code preparation would not authorize a live write; rehearsal and migration application
remain separate approvals. No target/credential/fixture guard changed this turn.

No application changes or new test run this step; last verified local result remains
765 tests plus typecheck and disposable PG17 rollback/eleven-race acceptance.
059–060 remain unapplied. No staging/production/provider contact, migration,
deployment, commit or push. Local credential contents were not accessed.

## Bounded execution tested on disposable PostgreSQL — 12 October 2026

Added finance-bounded-process.mjs and integrated it into the actual local 059–060
rollback rehearsal. The runner copies exact input bytes/arguments/environment,
hashes input, uses no shell, bounds stdout/stderr by bytes and enforces a deadline.
Timeout/pipe/output failures attempt child termination and wait for closure; an
unconfirmed close stays a failure. Partial output is discarded on transport errors.
Expected exit-code-3 rollback evidence remains available for semantic verification.
Client closure does not replace the independent database-session closure check.

Seven inert-process tests pass: Unicode/CRLF byte preservation, no inherited
application secrets, input mutation, nonzero sentinel output, timeout/limits,
invalid encoding/closed pipes/missing executable and reconciliation without retry.
Node on Windows supplies some standard OS environment entries; this primitive is
not a replacement for the protected launcher's credential/target/environment checks.

Actual synthetic PostgreSQL 17 rehearsal passed with exact journal-bound input,
independent session closure and unchanged catalog/row/sequence baselines. All eleven
finance concurrency cases pass. Cluster js-fee-test-HuJU7Z stopped; no source backup
or real credential read. The remote fixed journal remains uncreated/unclaimed.
Final typecheck +765 tests pass (none skipped), focused ESLint and whitespace
checks pass. Branch/HEAD remain release/v1-readiness-20260918 / 319fb20.

This is a tested process primitive and local integration, NOT an enabled staging
executor. The protected staging credential bridge, fresh evidence gates, reviewed
staging fixture scope and transport remain to be integrated. Existing direct-only
write and loopback-fixture guards are unchanged. No live connections, migrations,
deployment, commit or push; 059–060 remain unapplied.

## SQL/journal binding and fixed staging journal — 12 October 2026

prepareJournaledRollback now requires the exact SQL bundle bytes and verifies their
SHA-256 against the journal digest before any claim or dispatch. It rejects empty,
oversized, invalid UTF-8, BOM and NUL input; preserves Unicode and CRLF bytes; and
passes immutable SQL/hash/nonce/target to the captured execution adapter. Later
caller changes to the Buffer, config or callback cannot alter the prepared payload.
Hash equality binds input only: it is not SQL semantic review or server execution proof.

Added finance-fixed-staging-journal.mjs: the future staging entry point pins
C:\protected\jwg-finance-059-060-staging-rehearsal and the real Windows ACL checker.
It accepts no directory, mode or ACL override, and retains the direct-only target
guard. Preparation performs no I/O. The actual directory/claim was NOT created;
no remote transport, credentials, automatic retry or live execution was introduced.

Eight focused journal-controller tests pass, including immutable input, altered hash,
invalid encodings, failure reconciliation, outcome-persistence failure and blocked
reuse. Initial sandbox run failed on Windows realpath access; rerun with required
local access passed without changing filesystem guards. Focused ESLint and Git
whitespace checks pass. Final typecheck +758 tests pass, none skipped. No new local
PostgreSQL, production-build or browser run was needed for this controller-only change;
the new binding tests use mock transport and do not establish live executor acceptance.

No live service or protected-secret access, migration, deployment, commit or push.
Existing dirty work preserved; branch/HEAD remain release/v1-readiness-20260918 /
319fb20. 059–060 remain unapplied. Remaining: protected executor and staging fixture
integration, cross-schema/dependency/resource review, fresh evidence and separately
approved live rehearsal. The fixed journal entry point alone is not execution approval.

## Staging catalog prerequisites captured and reviewed — 11 October 2026

Ran the approved single metadata-only READ ONLY capture on eomubndonbetszdbhsrj
through its fixed session pooler, with pinned psql/CA/Node and verify-full TLS.
Saved 70,738 bytes in a new owner-only protected directory. No member rows,
sequence values, migrations, other projects, providers or messages were involved.
See operations/finance-prerequisites-review-20261011.json for the sanitized receipt.

Initial wrapper verification failed because PostgreSQL inet::text returned an IPv6
host with /128. Stopped without reconnecting or retrying. Fixed the offline verifier
to accept exact /32 IPv4 and /128 IPv6 host masks, while rejecting subnets, malformed
addresses and loopback (including expanded/mapped IPv6). Original capture/query/hash
are unchanged. Reverification passed at 08:37:31Z, within five minutes of capture.
The original nonzero wrapper result remains recorded; it is not retroactively hidden.

Catalog findings: 67 ordinary tables and six sequences; all relation SELECT checks
pass. All 67 tables have RLS, 11 forced; the audited postgres role has BYPASSRLS,
not superuser. pg_control_system EXECUTE privilege exists, but it was not invoked.
All 12 inspected output/JSON-cast functions are in pg_catalog and executable.
Eight noncatalog types are public enums. No unsupported public relation kind or
detected prerequisite blocker. This is not an application-role security test.
53 relations have unknown row estimates; estimates are not resource guarantees.

Typecheck +754 tests pass (none skipped), focused ESLint and whitespace checks pass.
No SQL query change or second live connection. No new build/browser run, migration,
deployment, commit or push. Branch/HEAD remain release/v1-readiness-20260918 / 319fb20.

Next: finish cross-schema/inheritance/resource review and protected executor/journal/
fixture integration locally. Fresh row baselines/ledger/actors and any write rehearsal
need their own approved scope; 059–060 remain unapplied. Empty prerequisite blockers
do not mean production-ready, full baseline approval or independent server closure.

## Baseline prerequisite catalog audit prepared — 11 October 2026

Added fixed READ ONLY catalog SQL and exclusive CaptureBaselinePrerequisites mode
to the protected preflight. It checks (without invoking) pg_control_system EXECUTE
permission, public table/sequence SELECT permissions, role/RLS restrictions and
unsupported relation kinds. It captures column type dependencies through domains,
arrays, composites, ranges and multiranges, plus output functions and JSON casts.
Only catalog metadata and definition hashes are captured: no member rows, sequence
values, application function execution or full row hashing. Counts are estimates.

The existing pinned psql/CA/Node, owner-only DPAPI, bounded pipes and create-once
private evidence handling are reused. Errors preserve evidence; no automatic retry.
Permission/custom-function findings remain blockers for review, not execution
approval. Even an empty blocker list does NOT certify dependency safety or authorize
a baseline read/write rehearsal. This narrow audit has no cluster identity claim;
it must not substitute for full baseline identity, cross-schema dependency/resource
review, fresh ledger/actors, independent closure or rollback reconciliation.

Verified locally: typecheck +753 tests, none skipped; focused ESLint; whitespace
checks. Fixed and retested PowerShell empty/singleton blocker array serialization.
Actual synthetic PG17 follows the nested type graph and captures a deliberately
throwing custom JSON cast without invoking it. Local finance/rollback and eleven
concurrency cases pass; js-fee-test-9q3CaC stopped. No live services or real secrets
read; no migration, deployment, commit or push. Branch/HEAD remain
release/v1-readiness-20260918 / 319fb20; unrelated dirty work preserved.

Next approval needed: ONE catalog-only read on staging eomubndonbetszdbhsrj via
the fixed session pooler, saved in a new owner-only C:\protected directory, followed
by offline review. No public/member row reads, migrations, messages, retries or
other-project access. 059–060 remain unapplied; production readiness is not implied.

## Independent closure and private journal integrated locally — 11 October 2026

Added finance-session-closure.mjs with fixed mutation-identity and read-only closure
SQL. Identity captures the nonce, PID, backend/transaction start, application name,
database/server/cluster, session user, TLS and timestamp before rehearsal work.
Closure requires a fresh distinct observer after client completion on the same
server/cluster and no pg_stat_activity row matching either the recorded PID or
nonce-bound application name. Active, idle, aborted and reused-PID cases fail closed.
No cancellation/termination SQL, credential reads or remote transport introduced.
An explicit synthetic loopback mode cannot validate remote identities.

Actual local PostgreSQL testing proves rejection while the transaction remains
open and acceptance only after client completion plus an independent absence check.
The disposable 059–060 rollback rehearsal now uses this identity/closure verifier
instead of only counting application-name matches. Missing identity cannot pass;
the attempt controller still performs independent baseline reconciliation on errors.

The same actual local rehearsal now claims and flushes an owner-only journal before
mutation, hashes the exact SQL bundle, records the verified rollback outcome after
closure/baseline checks, and proves that the existing claim blocks reuse. Windows
ACLs are checked by the real adapter; the preserved journal contains synthetic
evidence only. The synthetic temp location is NOT an approved remote journal path.
The production/staging journaled wrapper and direct-only write guard are unchanged.

Six new tests cover surviving backends, PID reuse, stale/wrong/TLS identity, ordering,
injection, explicit loopback mode, and reconciliation/no-retry after closure failure.
Typecheck +749 tests pass (none skipped), focused ESLint and whitespace checks pass.
Synthetic PG17 finance/rollback and all eleven concurrency checks pass;
js-fee-test-hf4qJp stopped. Branch release/v1-readiness-20260918 / HEAD 319fb20 unchanged.
No live services, real protected credentials, deployment, commit, push or new build/
browser run. 059–060 remain unapplied; local test DDL is not staging application.

Remaining before remote rehearsal: current dependency/type/resource/permission
review and fresh protected evidence; bind identity/closure capture to the actual
remote executor and fixed private journal location; finalize staging fixture/role
scope and transport without weakening existing guards. Pooler PID reuse deliberately
remains a failure/uncertainty condition, not permission to retry or relax comparison.
No additional staging or write approval is implied by this local milestone.

## Protected inventory/baseline capture implemented locally — 11 October 2026

Added exclusive CapturePublicInventory / CapturePublicBaseline modes to the
protected preflight. Both require explicit read-only staging session transport,
owner-only evidence, pinned psql/CA and an additional pinned Windows Node binary.
The fixed Node bridge accepts only inventory planning, baseline planning from a
verified private inventory, and offline verification; no arbitrary SQL or file-path
input. It inherits no PG credentials, NODE_OPTIONS, tokens, PATH or proxy settings.
The client still receives only the fixed staging transport and child-only password.

CreateNew reserves public-inventory-capture.json or public-baseline-capture.json
before any child starts. Input/output operations are bounded; failures kill/wait
for the client, preserve empty/partial evidence, suppress raw errors and never retry.
Valid JSON server responses are saved privately before semantic validation, so a
wrong SSL/identity response is retained but cannot report success. Baselines retain
the exact source inventory text and receipt hash, binding query generation and
verification to the same bytes. New finance-baseline-capture.mjs applies the existing
freshness/identity/inventory/table/catalog/sequence gates without relaxing them.
Success means a verified read-only capture, NOT rollback or full managed-schema proof.

Local tests caught and fixed two Windows PowerShell transport bugs: an async-write
return object contaminating JSON, and default-codepage conversion of non-ASCII input.
The helper now suppresses the return value and writes explicit strict UTF-8 bytes.
Positive tests include Chinese identifiers, actual DPAPI/ACL plumbing, pinned runtime
rejection and inherited NODE_OPTIONS isolation. Failure tests cover altered source,
wrong receipts, stale data, server mismatch, malformed/oversized output, timeout,
child closure, exclusive modes and no overwrite/retry. All clients are inert and
have no networking. SQL now fixes standard_conforming_strings=on before quoted names.

Final typecheck +743 tests pass (none skipped), focused ESLint and whitespace checks
pass. Actual SQL still ran ONLY in synthetic PG17; baseline/finance/rollback and all
eleven concurrency checks pass; js-fee-test-tujgGC stopped. No new remote baseline,
real credential read, provider call, build/browser run, deployment, commit or push.
Branch release/v1-readiness-20260918 / HEAD 319fb20 unchanged; 059–060 unapplied.

Still required before live rehearsal: current dependency/type/resource/permission
review (including managed pg_control_system availability and a quiet capture window),
fresh protected ledger/actor/baseline capture, fixed attempt-journal integration and
independent mutation-session closure. These new modes have NOT run against staging
and do not authorize them. Existing local-only fixture and direct-only write-target
guards remain intact; no pooler write execution or new migration authority added.

## Public baseline adapter prepared and tested locally — 11 October 2026

Extracted the existing public table/catalog/sequence query and content validation
into finance-baseline-core.mjs so local and prepared staging paths use the same
coverage. local-finance-baseline.mjs still requires 127.0.0.1 and independent PIDs;
the direct-only write-target guard is unchanged. Shared SQL now includes capture
time, session identity and backend SSL, with row_security=off so RLS cannot silently
produce a filtered full-table fingerprint. Transactions remain repeatable-read,
READ ONLY, pg_catalog search path, UTC/ISO and bounded statement/lock timeouts.

finance-staging-baseline.mjs is an OFFLINE adapter: exact staging session-pooler
read target, complete public inventory, generated-query binding and capture receipt
hash checks. It rejects stale/non-TLS/local identity, unsupported foreign/materialized
relations, inventory drift, incomplete table/sequence coverage, same backend,
changed server/cluster and reversed capture order. Before/after comparisons detect
row, catalog and nontransactional sequence drift. It explicitly does not claim
remote provenance, full managed-schema coverage, rollback success or write readiness.
No executable transport, credential access, retry or write API was introduced.

Eight new unit tests pass. Actual generated SQL ran only against disposable local
PG17: complete public coverage and equal independent snapshots passed; actual
loopback/non-TLS captures were correctly refused by staging verification without
adding a local bypass. Existing catalog drift, finance/rollback and eleven race
checks pass; js-fee-test-Quj6J1 stopped. Initial full suite exposed one static test
looking for DDL-hook SQL in its old file; changed it to inspect generated SQL with
the same assertions. Final typecheck +734 tests (none skipped), focused ESLint and
whitespace checks pass. No production build or browser tests run for this tooling.

Next: integrate protected inventory/baseline capture (including live type/dependency
and resource/permission review), combine fresh ledger/actor evidence, and bind the
fixed attempt journal/session-closure adapters. Public coverage does not include
managed-schema row fingerprints; do not present it as complete Supabase restoration
or security acceptance. Sequence values are not MVCC and concurrent activity still
invalidates equality. Fresh remote capture and any write rehearsal/application need
separate approval. No remote services or real credentials accessed this step;
059–060 remain unapplied, no deployment/commit/push, unrelated changes preserved.

## Staging overlapping-session diagnostic passed — 11 October 2026

Ran the explicitly approved diagnostic ONCE against eomubndonbetszdbhsrj only.
Exactly two fixed session-pooler client connections; no fallback or retry. Existing
protected DPAPI staging binding, pinned client/CA and verify-full TLS verified.
Both server snapshots report postgres database/session user, READ ONLY and SSL.
The primary stayed open while the observer saw its matching PID, backend start,
transaction start, nonce-bound application name and idle-in-transaction state.
The two backend PIDs were distinct. Both clients then exited cleanly.

Saved create-once, owner-only evidence under
C:\protected\jwg-finance-witness-6d8be23a157e4c499bbf8fe87af09142\session-witness-capture.json.
Receipt SHA256 f791df33eca16adf8a5cb2881dc84ed85c1200c52ca73fd0eb8f8327fe2d6a39.
Primary captured 07:36:27.604993 UTC, observer 07:36:27.906514 UTC. Offline verification
immediately passed receipt/query hashes, fixed target, freshness and strict
overlapping/distinct-backend requirements. Sanitized record:
operations/finance-session-witness-review-20261011.json. No raw server rows or
credentials printed; previous captures untouched.

This establishes staging's ability to provide distinct overlapping read-only
sessions; it does not retroactively change the earlier same-PID captures or prove
future before/after independence. Client clean exits are not a separate server-side
closure probe. Offline JSON integrity is not independent remote authentication.
No member records, fresh ledger or full catalog captured in this diagnostic.
No writes, migrations, messages, other projects/providers, deployment, commit or
push. 059–060 remain unapplied. Prior local typecheck +726 tests unchanged, not
rerun as part of this live read-only step. Remote baseline/catalog/journal integration
and separately approved rollback-contained rehearsal/application remain next.

## Protected session-witness capture ready locally — 11 October 2026

Added exclusive CaptureSessionWitness mode to finance-protected-preflight.ps1.
It reuses the existing DPAPI staging identity, exact session-pooler target,
executable/CA hashes, verify-full TLS and child-only allowlisted environment.
Before either client starts, it reserves an owner-only CreateNew evidence file.
The primary READ ONLY transaction stays open during the observer query; both
streams have 64 Ki-character limits and bounded waits. Finally paths stop both
clients, clear credential environment copies and preserve failed reservations.
No fallback, retry, arbitrary SQL or overwritten evidence is supported.

finance-session-witness-capture.ps1 saves a private nonce/query-hash-bound envelope
only after both clients exit cleanly. The receipt explicitly reports capture only,
NOT semantic acceptance. finance-session-witness-capture.mjs then checks byte/hash,
fixed target/query metadata, freshness and the existing overlapping/distinct-backend
rules offline. Reused PID evidence is preserved but fails that gate. A receipt/hash
does not independently authenticate remote provenance or prove server closure.

Six new tests exercise actual Windows DPAPI/ACL plumbing with a compiled NO-NETWORK
inert client: successful two-client capture, exact SQL equality with the tested JS
builder, no overwrite, mode guards, reused PID rejection, early exit, stderr,
oversized/trailing output, primary/observer/close timeout and child cleanup.
Typecheck +726 tests pass, none skipped; focused ESLint and whitespace checks pass.
Synthetic PG17 session/finance/rollback checks and all eleven concurrency cases
pass; disposable js-fee-test-YV6i41 stopped. Branch release/v1-readiness-20260918,
HEAD 319fb20 unchanged; existing unrelated work preserved.

Next requires explicit approval for ONE read-only overlapping-session diagnostic
on staging eomubndonbetszdbhsrj, with a new private evidence directory under
C:\protected and offline receipt/witness comparison. No retry on failure. This
diagnostic does not validate a future write rollback or relax its independence
checks. Fresh catalog/baseline/journal integration and separate write/application
approvals remain outstanding. 059–060 remain unapplied. This step read no real
protected credentials and contacted no staging, production or providers; no
build/browser run, migration, deployment, commit or push.

## Overlapping read-only session witness — local proof, 11 October 2026

Added finance-session-witness.mjs: fixed, nonce-bound read-only SQL keeps a primary
transaction open while a second observer records its PID, backend start, transaction
start, application name and idle-in-transaction state from pg_stat_activity. The
verifier requires distinct PIDs, matching live-primary metadata, ordered/fresh
timestamps, same server endpoint and read-only/SSL evidence (SSL excluded only for
explicit synthetic loopback mode). No relaxed existing ledger/actor/baseline guards.
No helper accepts arbitrary SQL; diagnostic uses no advisory locks or sleep query.
Bounded statement and idle-transaction timeouts prevent an indefinite open primary.

Five tests cover reused PID, missing/ended/mismatched peer, stale/unsafe metadata,
injection and explicit local-only mode. Actual synthetic PG17 integration proves
two overlapping distinct backends and clean primary closure. It uses no credentials
or remote network; complete finance/rollback checks and eleven races also pass.
Disposable cluster js-fee-test-BllPJJ stopped. Typecheck +720 tests (none skipped),
focused ESLint and whitespace checks pass.

This is a locally tested diagnostic design, NOT staging-pooler acceptance, proof of
future before/after rollback independence, or a completed remote baseline adapter.
Existing staging same-PID evidence is unchanged. Protected remote wrapper/evidence
integration and explicit read-only diagnostic approval are required before staging
use. Do not treat historical identity evidence as fresh authorization. Complete
catalog/baseline/journal integration and separate write/application approvals still
remain. 059–060 unapplied. No protected credential reads, staging/production/provider
contact, build/browser run, deployment, commit or push this step.

## Staging identities and actor eligibility verified — 11 October 2026

Completed approved narrow read-only identity lookup for exactly the three dedicated
test mailboxes/JS IDs (Member 0101, Admin 0002, Super Admin 0001). Each expected
mailbox maps to one Auth UUID and one matching active/living profile with the
expected role. No passwords, tokens, unrelated Auth rows or raw emails returned.
Saved verified independent UUID bindings privately, then ran one actor capture.
Both fixed staging session-pooler connections passed verify-full TLS, backend SSL
and server READ ONLY. Exactly two client processes, no remote retry.

Protected evidence is in C:\protected\jwg-finance-identities-802f8e8f99d44b19a92b527c2e50a4ea:
identity-capture.json, bindings-capture.json and actors-capture.json. New owner-only
directory, CreateNew/flush/readback checks; previous evidence unchanged. Offline
receipt/binding hashes, target/query metadata, freshness, identity and account
eligibility passed. No UUIDs or secrets printed. Sanitized evidence is recorded in
operations/finance-identity-actor-review-20261011.json.

Important limitation: separate client processes received the SAME server backend
PID from the pooler. An extra distinct-PID check initially rejected the combined
report. Offline diagnosis confirmed hash/ordering/content checks pass, but different
backend proof is NOT established. No remote retry or relaxation of existing
independent-backend rollback gates. These reads are identity/eligibility evidence,
not Auth login, behavioural RLS tests or a rollback-residue result.

Added hash-pinned CaptureIdentity mode, narrow SQL, offline binding validator/save
and synthetic integration coverage. Local tests caught a file-hash helper issue;
hashing the exact in-memory bytes fixed it before live use. Typecheck +715 tests
(none skipped), focused ESLint and whitespace checks pass. Exact SQL passed in
synthetic PostgreSQL, including duplicate Auth detection and no password/unrelated
data output; full finance/rollback suite and eleven races pass. js-fee-test-XxQvvu
stopped. No build/browser run, deployment, commit or push.

No account/membership/database writes, password reset, login, message/provider or
production/other-project contact. 059–060 remain unapplied. Remaining: fresh catalog,
complete remote baseline/journal integration and independent reconciliation session
proof before separately approved rollback writes and permanent application.

## Identity-binding prerequisite located — offline review, 11 October 2026

Reviewed the existing security-test runner and account-rotation audit implementation.
run-staging-security-tests.mjs pins the dedicated Member/Admin/Super Admin mailboxes
and JS IDs. security-test-account-rotation.mjs already defines the independent check:
Auth email must resolve to exactly one user, whose UUID must match exactly one
profile with the expected JS ID, active/living state and expected resolved role.
These are useful independently known identifiers, not independently verified UUIDs.
The inspected saved audit receipt and local scripts do not supply a usable saved
UUID binding. Do not infer UUIDs or derive expectations from the actor capture.

No password file was opened or credential decrypted in this review. C:\protected
was inspected by filenames only for account/identity evidence. No live audit, login,
password rotation, Auth token generation, migration, test suite, build, deployment,
commit or push ran. Prior verified result remains 711 local tests, not rerun here.

Next external prerequisite requires explicit approval: a read-only staging lookup
limited to the three already recorded dummy test mailboxes and JS IDs (0101, 0002,
0001), returning only UUID/identity/state/role evidence, never password/token fields.
Save a verified mapping in a new owner-only C:\protected folder, preserving existing
files; then run the already prepared read-only actor capture and offline comparison.
No all-user Auth export, login, messages or account changes are needed. On mismatch,
preserve evidence and stop without creating accounts or retrying.

This clears only actor identity/eligibility if successful. Complete remote baseline
and journal integration plus fresh catalog evidence remain outstanding; the current
baseline adapter deliberately accepts only synthetic loopback targets. 059–060
remain unapplied and are not authorized by the proposed read-only checks.

## Rollback catalog coverage hardened — local verification, 11 October 2026

Reviewed saved September staging account audit: it records successful Auth/member
number/active-living/role checks but does not provide usable independent UUID
bindings. No bindings were invented or taken from the candidate actor capture.
Actual test-account binding remains outstanding; no credential or live account read.

Closed a concrete local baseline gap: pg_rules excludes internal view _RETURN
rules, so view-body changes were not necessarily covered. local-finance-baseline.mjs
now explicitly includes view definitions, relation security/options/partition
metadata, default privileges, database-role settings, inheritance and role connection
limits/expiry. Search path, timezone and date formatting are pinned during capture.
No password catalog is read. Existing loopback-only guards remain unchanged; this
is not a remote baseline adapter or proof of complete managed-Supabase coverage.

Added real local catalog-drift controls for view body, view security option, default
ACL, role connection limit and database-role setting. Each changed comparison was
rejected without relying on row-count/content differences. Only synthetic probe
objects were removed afterward. Existing rollback/role/ledger/actor/sequence tests
and all eleven finance concurrency scenarios passed. Disposable PostgreSQL cluster
js-fee-test-HHhT5U is stopped. Source backups were not read.

Initial test dispatch was blocked by approval-service usage capacity before any
execution. After the user continued, the same approved local tests ran successfully:
typecheck +711 tests (none skipped), focused ESLint and whitespace checks pass.
No staging/production/provider contact, migrations, deployment, commit or push.
059–060 remain unapplied. Next: independently verified actor bindings, fresh scoped
catalog evidence and complete remote baseline/journal integration before separately
approved rollback-write rehearsal. No application build/browser rerun this step.

## Protected actor-capture integration — local verification, 11 October 2026

finance-protected-preflight.ps1 now supports exclusive -CaptureActors mode with
-ConfirmReadOnlyStaging, -ConfirmSessionPooler, -EvidenceDirectory and a private
-ActorBindingsPath. Before client startup it checks the staging-bound, three-UUID
binding document, pins the reviewed actor SQL bytes and reserves actors-capture.json
using the existing owner-only ACL/CreateNew/flush/readback evidence guard. Ledger
mode remains separate; callers cannot mix capture modes or supply arbitrary SQL.
Captured JS IDs and UUIDs must match the independent binding. Receipt explicitly
leaves actorEligibilityCompared=false until the offline comparison succeeds.

New finance-actor-capture.mjs verifies capture receipt SHA256, binding-file SHA256,
query SHA256 and fixed staging/session/TLS metadata, then applies the tested actor
eligibility/freshness verifier. It refuses local-probe bypass and does not report
JSON/hash checks as independent remote provenance, Auth login or live role security.
Actual binding UUIDs must come from independently verified dedicated identities;
no real binding file was created or read in this step.

Seven tests added. Full typecheck +710 tests (none skipped), focused ESLint and
git diff --check pass. Real Windows PowerShell integration uses synthetic DPAPI
credentials, real temporary ACLs and a compiled inert client with NO networking
code. It checks exact arguments, query bytes and child environment, returns fixture
data, and verifies protected capture plus offline comparison. Repeated evidence
use is blocked before client startup; invalid binding starts no client; wrong actor
response preserves an empty reserved file and cannot retry. This is NOT live TLS,
database connectivity or staging acceptance evidence. Synthetic test artifacts were
removed; existing protected evidence and credentials were untouched.

No remote contact, migration, application build/browser/PG harness rerun, deployment
or commit/push. Actual SQL was unchanged from the preceding successful local PG17
milestone. 059–060 remain unapplied. Remaining: independently verified real actor
bindings, explicitly approved fresh catalog/actor captures, complete independent
remote baseline reconciliation and fixed attempt-journal integration, followed by
distinct rollback-write and persistent-application approvals.

## Dedicated actor binding — local preparation, 11 October 2026

Added fixed tests/sql/059_060_actors_readonly.sql for JS IDs 0101, 0002 and 0001.
It uses repeatable-read READ ONLY, fixed pg_catalog search path and timeouts; reads
only these profiles and their memberships/assignments. Returns minimal identity/
eligibility fields and SHA256 row-set digests, not raw contact details. No Auth
reads, application helper calls, account changes or arbitrary caller SQL. Query
SHA256: 723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80.

finance-actor-evidence.mjs requires three distinct independently supplied UUIDs
matching the exact JS IDs; active/non-deceased profiles; correct Super Admin flag;
eligible Member/Admin memberships; no active Admin appointment for Member; and an
active assignment for Admin. Rejects stale, incomplete, wrong-target metadata and
duplicate identities. Independent before/after comparisons detect changes to full
profile, membership and assignment digests. Output excludes UUIDs and never claims
login, live role-security success or write authority. Supplied bindings must come
from independently verified dedicated identities, NOT be copied from the same
capture. Counts are eligibility checks, not complete dojo-scope authorization.

Seven new tests pass. npm test: typecheck and 703 tests passed, none skipped.
Focused ESLint and whitespace checks pass. Actual prepared query executed in a
separate synthetic loopback PG17 database: equality, changed-private-field,
disabled/deceased, missing active Admin assignment and duplicate-JS-ID controls
passed. Raw private fixture notes were not returned. Existing remote fixture
guards and migration drafts were not relaxed or changed.
The full synthetic finance/rollback/role suite and all eleven concurrency cases
also passed; disposable cluster js-fee-test-gSeezg is stopped.

No protected credentials read or remote systems contacted. This actor query has
NOT run on staging and is not wired into the protected remote capture wrapper.
Remaining: independent real actor UUID binding, fresh catalog/actor evidence,
complete remote baseline/journal integration and separately approved rollback-only
writes. 059–060 remain unapplied. No build/browser run, deployment, commit or push.

## Full staging ledger captured and compared — 11 October 2026

Completed ONE approved read-only full-ledger capture against eomubndonbetszdbhsrj
through its bound session-pooler endpoint. Pinned client, CA and query verified;
verify-full TLS, backend SSL and server READ ONLY passed. Saved only to new private
current-user-only C:\protected\jwg-finance-ledger-b3aad0b7d54f45cbba6e2db666d622eb\ledger-capture.json.
CreateNew reservation, flush/readback and offline capture-hash checks passed.
No raw SQL bodies or credential values printed; all prior evidence preserved.

Offline comparison within the five-minute freshness window passed the repository
migration contract and all 53 migration versions, names and SQL bodies (006–058),
using the existing narrowly normalized SQL matcher. Captured ledger-table catalog
digest is evidence for later comparison, not an independent full-schema audit.
Sanitized receipt: operations/finance-full-ledger-review-20261011.json.

Local setup encountered a host PowerShell compatibility issue before any connection;
direct invocation of the tested Windows PowerShell runtime verified private ACLs.
Exactly one remote capture then succeeded; no retry or additional remote probe.

No database writes, password reset, credential changes, member/Auth reads, provider,
production/other-project access, deployment, commit or push. No application code
changed or full local suite rerun (prior 696-test result unchanged). Migrations
059–060 remain unapplied. Remaining: complete catalog/actor binding, independent
remote baseline reconciliation and fixed protected journal integration; distinct
approval is still required for rollback-contained writes and permanent application.

## Protected ledger capture — local verification, 11 October 2026

Added an explicit full-ledger mode to finance-protected-preflight.ps1. It requires
the existing staging-only read-only/session-pooler confirmations, pinned client/CA,
and a reviewed fixed SQL hash. No arbitrary SQL or write executor was added.
The query now records pg_stat_ssl for the current backend; its current SHA256 is
2c80c6b732c80ff9ad3ad645ef672a31a3dcccd5804ab675a62dcd7405eed3e9
(supersedes the earlier query hash recorded below).

New finance-private-capture.ps1 verifies current-user-only directory/file ACLs and
non-reparse paths, reserves ledger-capture.json with CreateNew before client start,
and blocks reuse of existing, empty or partial evidence. Saves UTF-8 JSON only after
ACL revalidation and a 4 MiB size check, flushes to disk and verifies readback.
Raw SQL bodies stay in the private file; stdout contains only a sanitized receipt.
The receipt explicitly says ledgerContentsCompared=false: successful capture is
not successful body verification or authorization for a write rehearsal. Client
output is buffered before the size check, not a bounded streaming implementation.

Four real Windows ACL/file tests and two preflight guard tests added. All 14 focused
tests pass; npm test passes typecheck and 696 tests (none skipped). Focused ESLint
and git diff --check pass. The synthetic-only PostgreSQL 17 harness passes, including
ledger query checks, role/rollback/sequence checks and eleven finance races. Cluster
js-fee-test-LWccYS is stopped. No application build/browser rerun was needed for
these local operational scripts.

No protected real credentials read, remote connection, migration, deployment or
commit/push in this step. Full-ledger capture has NOT run on staging. Next: approve
one read-only staging capture to a new private evidence directory and verify its
full bodies offline with the existing verifier, preserving incomplete evidence on
failure and never automatically retrying. Fresh catalog/actor binding, complete
independent remote baseline reconciliation and fixed journal integration remain
required before separately approved rollback-only writes. 059–060 remain unapplied.

## Full ledger-content and drift checks — local milestone, 11 October 2026

Prepared tests/sql/059_060_ledger_readonly.sql: repeatable-read READ ONLY, fixed
pg_catalog search path and time limits, full stored migration version/name/body
capture plus a digest of the ledger table's definition, ACL/RLS, constraints,
indexes, triggers and policies. Does not read member/Auth rows or invoke application
functions. Raw statement bodies must remain in protected evidence, not logs.
Query SHA256: a6e90e60a8288280e68b69a1a13f25f3cb593621498f5c0be2f83a7ed1783a93.

Added offline finance-ledger-evidence.mjs, reusing existing release-contract,
ledger-fingerprint and SQL comparison logic. Requires all 53 versions 006–058,
matching names and full SQL bodies, valid read-only/session metadata, and a capture
within five minutes (at most 30 seconds future clock skew). Independent before/
after captures must have different backend PIDs and ordered timestamps; stored
statement or ledger-catalog drift is surfaced. Output contains hashes/flags only.
JSON metadata is NOT remote identity proof: target/TLS must be bound independently
by the future capture wrapper. Verifier never grants write/rehearsal authority.

Seven new tests, typecheck +690 tests, focused ESLint and git diff --check pass.
Actual fixed query passed in the disposable loopback PG17 catalog database with
all 53 repository migration bodies stored as synthetic ledger data (not applied
there). Independent equal captures passed; column-drift and altered-body negative
controls failed closed. Existing local rollback/role/notification/sequence checks
and all eleven concurrency scenarios also passed. Cluster js-fee-test-gZhb1Y stopped.

No staging/production/provider connection, credentials, migrations, deployment or
commit/push this milestone. No browser/build rerun. The new full-content query has
NOT run on staging: last live evidence remains TLS/login/READ ONLY and versions
006–058 only. Next: protected remote capture integration plus fresh full ledger,
catalog/actor and independent baseline binding; then separately approved write
rehearsal. 059–060 remain pending/unapplied.

## Staging read-only connection verified — 11 October 2026

Completed the explicitly approved credential refresh and ONE read-only retry.
Created a new Windows-DPAPI record at
C:\protected\jwg-finance-staging-credential-40228b0a8abc4a82bff0c0379466bd9b\staging.credential.xml
from the existing staging-bound STAGING_DB_URL password. Verified sole current-user
full-control ACL, decryption round trip and exact unchanged hashes for the source
environment and old encrypted credential. No secret values emitted or server
password reset. Original record and all prior evidence preserved.

Local setup corrections: used explicit String.Split overload for Windows PowerShell;
then avoided unnecessary owner reassignment when securing the newly created empty
directory. Its correct owner was verified and only its DACL restricted before any
credential write. No existing directory/file permissions changed.

Single live session-pooler probe returned exit 0: verify-full TLS passed, login
succeeded, database/session user are postgres, server READ ONLY verified, and
ledger versions are exactly 006–058. No database writes, messages, provider or
production/other-project contact. This is version-only ledger evidence, not a fresh
comparison of migration statement bodies/catalog/actor scope. Receipt:
operations/finance-session-preflight-success-20261011.json.

059–060 remain unapplied. Next work is complete remote baseline/reconciliation,
fresh complete ledger/catalog/actor binding and a fixed owner-only attempt journal;
write rehearsal and permanent application still require distinct approval.
No application/probe code edits, build/browser/full-suite rerun, deployment or
commit/push this milestone; prior full suite remains 683 passed. HEAD 319fb20.

## Session-pooler preflight: saved credential mismatch — 11 October 2026

Staging management GETs confirmed ACTIVE_HEALTHY and the exact pooler host
aws-0-ap-southeast-2.pooler.supabase.com, postgres.eomubndonbetszdbhsrj user and
postgres database. API lists transaction port 6543; official Supabase docs specify
session mode on the same host at port 5432. No endpoint/settings change performed.

Added explicit ConfirmSessionPooler to the fixed read-only probe. It requires live
read-only mode, pins this host/project-qualified user/session port, preserves
verify-full TLS and never falls back on failure. Existing direct-only Node target
and mutation guards were not relaxed. Eight focused tests, typecheck +683 tests
and focused lint pass; no build/browser or local SQL rehearsal rerun.

One session-pooler probe reached the endpoint but exited AUTHENTICATION_FAILED.
No retry; login and ledger remain unverified, no SQL writes/migrations. Local-only
comparison then found the DPAPI password (record last written 31 August) differs
from the staging-bound STAGING_DB_URL password in C:\protected\jingwuguan-staging.env.
No values were displayed/changed; environment password acceptance is NOT verified.
Receipt: operations/finance-session-preflight-20261011.json.

Next approval: save a new owner-only encrypted credential from the existing
staging-bound STAGING_DB_URL value, preserve the old record, and perform one
read-only session-pooler preflight. No remote password reset is proposed. No
production/other-project/provider access, messages, configuration changes,
deployment, commit or push. 059–060 remain pending; rehearsal/application still
require distinct authority and complete remote safety integration.

## Read-only DNS diagnosis completed — 10 October 2026

Approved project-metadata GET confirmed staging eomubndonbetszdbhsrj is
ACTIVE_HEALTHY in ap-southeast-2 and advertises the exact configured direct host.
DNS-only A query returned no IPv4 address (SOA response); AAAA returned one IPv6
address. Windows system resolver reports HostNotFound. Local interface/route
inspection found zero non-loopback/non-link-local IPv6 addresses and zero IPv6
default routes. The healthy direct endpoint requires an IPv6 path unavailable here;
this does not establish whether the saved database password is accepted.

Sanitized evidence: operations/finance-staging-dns-diagnosis-20261010.json.
Used a fixed-project, no-redirect GET wrapper in workspace staging-readiness;
management credential stayed in memory, raw API bodies/secrets were not printed.
No database login retry, SQL, settings/routing changes, password reset, migration,
production/other-project/provider access or messages. Read public Supabase docs,
which document session pooling on port 5432 as the IPv4-compatible alternative.

Next proposed approval: inspect the exact staging session-pooler metadata, prepare
an explicitly bound session-pooler read-only probe with verify-full TLS, then run
one preflight. No fallback is enabled and no pooler endpoint is guessed. Existing
direct-only guards remain unchanged. 059–060 remain pending; remote write rehearsal
and application are separately gated. Prior full suite: 681 passed, not rerun for
this metadata/documentation-only milestone. No commit/push or deployment.

## Approved diagnostic retry: DNS failure — 10 October 2026

Ran exactly one explicitly approved revised read-only staging probe. Exit 1 with
DNS_FAILED: the PostgreSQL client could not resolve the fixed direct hostname
db.eomubndonbetszdbhsrj.supabase.co. No database connection/login was reached;
TLS, credential server acceptance and ledger remain unverified. This is not
evidence of a wrong password. The first generic failure's cause remains unknown.

Saved separate non-secret receipt operations/finance-readonly-probe-retry-20261010.json;
earlier evidence preserved. No additional retry, alternate routing, password reset,
database/settings changes, migration, messages, production or provider contact.
No code changes, commit or push. Previous full test result remains 681 passing;
not rerun for this documentation-only update.

Next proposed action: read-only inspection of this staging project's status and
advertised direct hostname, plus DNS/network diagnosis. Not yet performed; obtain
approval before expanding the probe. Do not assume a pooler fallback is authorized.
059–060 remain unapplied; no write rehearsal or application approval is implied.

## Approved read-only probe stopped — 10 October 2026

Ran the approved fixed staging TLS/login/ledger probe once using the previously
checked credential/client/CA paths and pinned hashes. Exit 1 with generic sanitized
FINANCE_PREFLIGHT_FAILED. This version did not retain failure-stage evidence; the
cause and whether a server connection was established remain unknown. TLS, login,
server read-only state and ledger are NOT verified. No retry or alternate routing.
Preserved the exact non-secret outcome in
operations/finance-readonly-probe-attempt-20261010.json. No write SQL, migrations,
password resets, production/provider access, messages or configuration changes.

Improved local diagnostics afterward: fixed phase codes and allowlisted client
error categories (authentication/TLS/DNS/network/unknown); never emit raw error
strings or secrets. Six focused preflight tests, full typecheck +681 tests and
focused ESLint pass. Existing synthetic DPAPI/ACL rejection tests now check phase
codes; new classifier test covers known/unknown/empty synthetic errors. No live
retry of the changed probe. No build/browser/local PG rerun, commit or push.

Next requires approval for ONE revised read-only diagnostic probe on the same
staging endpoint. Do not reset credentials, select a pooler or weaken TLS on
failure. 059–060 remain unapplied; complete remote reconciliation and distinct
write-rehearsal/application approvals are still outstanding.

## Actual local connection prerequisites — 10 October 2026

Located the existing staging DPAPI credential using its documented location.
ValidateCredentialOnly passed: owner-only file/parent permissions, current SID,
staging project/purpose binding and decryption. No password was printed, copied,
changed or sent to a server; its current server validity is unknown.

Existing psql reports PostgreSQL 17.11. Saved Supabase Root 2021 CA parses as a CA,
has a valid self-signature and validity through 26 April 2031. Captured local file
hashes and passed the offline planner's real-path, no-link and hash checks. Initial
sandbox realpath EPERM resolved with approved local-only escalation. These checks
do not independently establish vendor provenance or a live TLS trust chain.

Exact non-secret paths/hashes and limitations are recorded in
operations/finance-connection-prerequisites-20261010.json. No code or migration
changes this milestone. Existing unrelated edits preserved; HEAD remains 319fb20.
No remote contact, ledger refresh, migration application, provider activity,
deployment, commit or push. Previous full suite remains 680 passing tests; not
rerun for this documentation-only milestone.

Next gate: explicit approval for the fixed read-only staging connection probe
(TLS/login/server READ ONLY and exact ledger versions 006–058). No mutations or
arbitrary SQL. Full ledger contents/catalog/actor binding and independent remote
rollback reconciliation remain separate work. 059–060 remain pending/unapplied.

## Protected credential preflight — local verification, 9 October 2026

Added scripts/finance-protected-preflight.ps1 with two explicit modes: local
credential validation or a separately approved fixed read-only staging probe.
Validates owner-only file/directory ACLs, non-reparse local paths, Windows DPAPI
credential format, current SID and exact staging project/purpose binding. No
arbitrary SQL or password arguments. The probe requires reviewed client/CA hashes,
verify-full TLS, a cleared/allowlisted child environment and bounded timeouts.
Only the child receives PGPASSWORD; the parent launch-info copy is removed after
start. Raw client errors and credentials are never emitted. The fixed query checks
server read-only/SSL, postgres user/database and ledger versions exactly 006–058;
this is not a ledger statement-content or full catalog comparison.

Five new tests passed using synthetic DPAPI credentials and temporary Windows ACLs:
valid decryption, wrong target/SID/empty rejection, invalid modes/missing resources,
broad-access rejection and static read-only/secret-output guards. Typecheck and all
680 tests pass; focused ESLint and git diff --check pass. No real protected
credential was read, no client/CA/live TLS was verified, and no network, database,
provider, deployment or Git write occurred. No build/browser/local PG rerun.

The live probe path remains unexecuted. Configure/review the actual protected
credential, binary and CA before requesting a live read-only connection check.
The offline Node launch plan and PowerShell probe are not yet integrated into the
remote rollback runner. Fixed journal location, fresh complete catalog/ledger/actor
baselines and independent remote reconciliation remain outstanding. 059–060 stay
pending; write rehearsal and persistent application require separate approvals.

## Real Windows ACL adapter and offline connection plan — 9 October 2026

Added finance-private-directory.ps1/.mjs: read-only current-user owner/full-control,
protected inheritance, child-inheritance and reparse-path checks. Tested against
actual Windows ACLs on new temporary synthetic directories, including broad-access
denial and permission drift before journal completion. Real adapter integrates with
the persistent journal; no existing protected folder permissions were changed.
Resolved Windows PowerShell module-path incompatibility by using .NET ACL APIs.

Added finance-psql-plan.mjs: offline read-only launch planning pins executable/CA
file hashes, rejects link/junction paths, validates the exact staging direct target,
requires verify-full TLS, disables GSS encryption substitution, disables psql startup
files/prompts, and sets connection/statement/lock/idle time limits. An environment
allowlist excludes inherited PostgreSQL routing/service/options, proxy/startup
settings and app secrets. No password is accepted or placed in process arguments.
Tests use inert file bytes, not a real client binary, CA certificate or credential.

Seven new tests, typecheck +675 total tests and focused lint pass. No credential
read, network call, staging write, migration application, deployment or commit/push.
No local PG/build/browser rerun. Temporary synthetic ACL evidence cleaned by tests;
existing protected evidence unchanged. 059–060 remain pending.

The plan is not a runnable remote transport: actual reviewed PostgreSQL binary/CA,
credential injection, TLS handshake/server identity and fresh ledger/catalog/actor
binding remain unverified. Real private-directory adapter is implemented, but a
fixed production-use journal path is not configured. Keep remote readiness false;
write rehearsal and application still require distinct approvals.

## Persistent attempt journal and target gate — local milestone, 9 October 2026

Added create-once, flushed/read-back attempt records and separate create-once
outcome records. Existing, incomplete, corrupt or orphaned records block reuse;
success does not unlock the journal. No reset/delete recovery API. Claims bind
nonce, candidate-bundle digest, mode and fixed staging reference without passwords
or raw errors. Directory ancestors reject links/junctions; a caller-supplied private
ACL check is mandatory. A two-process race test proves only one claim succeeds in
the same journal directory. File flush is not a guarantee against every hardware/
power-loss failure; an uncertain/partial record remains a stop condition.

Added strict direct-target validation: only db.eomubndonbetszdbhsrj.supabase.co,
port 5432, postgres database/user and verify-full TLS mode; reject unknown options,
other projects, poolers, IPs and URL/default fallbacks. Offline target validation
does NOT establish a real TLS session or server identity.

Mocked assembly claims before executing the one-attempt controller, then records
the result. A journal-write failure cannot pass or dispatch again. Sixteen new
tests, typecheck +668 total tests and focused lint pass. Corrected a lint-only test
variable name. No network/credentials/live database, migrations, deployment or
commit/push; no SQL/browser/build rerun this milestone.

Remote path remains incomplete: fixed owner-only journal location/Windows ACL
adapter, real credential/TLS connection, reviewed SQL-bundle binding, fresh
identity/catalog/ledger/actor evidence and complete remote reconciliation adapter
must still be connected and reviewed. Mock ACL/transport callbacks are tests only.
The eventual wrapper must never choose a fresh directory to bypass an old claim.
059–060 remain unapplied; any write rehearsal still needs separate approval.

## One-attempt rollback controller — local milestone, 9 October 2026

Added scripts/finance-rollback-attempt.mjs and integrated it into the disposable
local runner. One controller instance dispatches at most once, including concurrent
invocation or failed execution. Exact nonce/SQLSTATE abort, confirmed session exit
and independent unchanged baselines are all required. Even execution/closure errors
still attempt reconciliation. Sanitized failure categories replace raw SQL/transport
errors; no failed/uncertain result is converted to a pass or automatically retried.
The local mutation session has a unique application_name; a separate read-only
pg_stat_activity check verifies its absence before independent baseline comparison.

Nine controller tests cover exceptions, timeout/error results, wrong nonce, uncertain
closure, missing/failed reconciliation, residue, concurrent invocation and baseline
mutation. Typecheck +652 tests, focused lint, full local PG17 rehearsal and eleven
races pass; disposable cluster stopped. No remote contact this milestone. No
migration candidate changes, deployment, commit/push or build/browser rerun.

This is transport-independent control flow exercised locally, NOT a completed
remote execution wrapper. It supplies neither credentials nor target/approval
checks. The once-only latch is per instance/in-memory, not a durable cross-process
attempt journal. Remote TLS/identity, fresh catalog/ledger and actor binding,
durable uncertainty handling and remote baseline adapter remain outstanding.
059–060 remain pending; new write-rehearsal approval is still required before use.

## Approved staging index/dependency audit — 9 October 2026, 18:49 Sydney

Executed the specifically approved hash-pinned read-only query against
eomubndonbetszdbhsrj only. Project identity/healthy state and server read-only mode
verified. New owner-only evidence saved without overwriting earlier captures;
receipt/file digest checked independently. Sanitized report:
operations/finance-index-dependency-review-20261009.json.

All ten scoped tables found with RLS enabled, postgres ownership, no partitions or
forced RLS. All 33 indexes valid/ready/live; ordinary btree column indexes, zero
expression indexes and three simple partial predicates. Five dependency helpers
manually inspected and matched prior protected definitions. No new application
function path found in these index expressions/predicates. Ledger versions exactly
006–058; ledger statement contents were not re-compared in this narrow audit.

Offline structure validation and six focused validator tests pass. Full 643-test
suite, build/browser and SQL acceptance were not rerun during this read-only audit.
No member/Auth rows read, application RPCs invoked, database/settings changes,
messages, scheduler/delivery calls, other-project contact, deployment or commit/push.
059–060 remain unapplied. Index-metadata gap closed at capture time; complete remote
rollback-only executor, actor binding and fresh comprehensive baselines still needed.
The audit approval does not authorize write rehearsal or persistent application.

## Index metadata query validated locally — 9 October 2026

Executed the unchanged prepared index/dependency query in a server-enforced
READ ONLY transaction against a separate synthetic finance_catalog_probe database
inside the disposable loopback PG17 cluster. All ten target tables, twelve test
indexes and five application-function dependencies (expression, predicate, default,
check and policy) captured. Deliberately throwing function bodies prove inspection
does not invoke them. Synthetic ledger only: this is not staging evidence.

Added offline structural validation rejecting missing/duplicate relations/indexes,
invalid indexes, incomplete function bodies, wrong database/read-only mode and
unexpected 006–058 versions. Output is sanitized counts with readyToExecute,
transitiveReviewComplete and liveAcceptance all false; no identity/receipt binding
or remote executor is implied. Corrected local fixture default setup after its
intentional tripwire fired during ADD COLUMN; both failed/successful clusters stopped.

Typecheck +643 tests, focused lint, local metadata query, combined rollback,
independent fingerprints and all eleven concurrency cases passed. No remote contact,
migration application, deployment, commit/push or browser/build rerun. 059–060 pending.
Next external gate remains explicit approval for read-only staging index/dependency
capture; a generic continue does not bypass that gate or authorize write rehearsal.

## Captured notification writer and fixture path review — 9 October 2026

The combined local rollback fixture now uses the exact captured create_notification
body and class/dojo name-normalization triggers. The original synthetic failure
injection stub remains only in the broader, separate local test tranches. Verified
five exact in-app notifications: two assigned-Admin pending alerts, two Member
receipt alerts and one Member waiver alert, with correct references and wording.
Existing notifications/outbox/history/sequence baselines remain unchanged. Added
assignment and rate-setting UUIDs to the fixture manifest. No real actor changes.

Local PG17 combined rollback, independent baselines, general DDL notification
controls, captured RLS checks and eleven races pass; cluster stopped. Typecheck
+637 tests and focused lint pass. No migration candidate edits, remote contact,
deployment, commit/push, build/browser rerun or production work this milestone.

See operations/FINANCE_FIXTURE_PATH_REVIEW.md for reviewed paths and exclusions.
Saved metadata lacks ordinary index definitions/predicates/dependencies. Prepared
tests/sql/059_060_rehearsal_indexes_readonly.sql for a separate approved read-only
staging capture; NOT executed or yet runtime-validated. Dynamic/transitive function
calls still require manual review after capture. Remote wrapper is incomplete;
059–060 remain pending. Next external step needs explicit read-only staging approval,
not permission to rehearse writes, apply migrations, deploy or invoke delivery.

## Captured DDL notifications and finance read policies — local milestone, 9 October 2026

Installed exact reviewed copies of the two general captured schema-watch hooks in
disposable local PostgreSQL. An independent LISTEN connection receives committed
CREATE/DROP controls, receives no notification from the combined 059–060 rollback,
and receives a final committed control. Independent catalog fingerprints now cover
event-trigger identity, configuration, ownership and function definitions as well.
The four extension-only hooks are not installed: neither candidate changes extensions.

Locally exercised nine captured SELECT policies across profiles, memberships,
assignments, charges, receipts and fee history, with three exact captured helpers.
Verified those bodies/expressions against protected saved metadata without any live
connection. Member-own, assigned-Admin, cross-dojo denial, Super Admin, unassigned
synthetic actor, missing-claim and direct-write-denial checks pass. Fixed local-only
helper ordering and account-status enum to match policy dependencies. SELECT grants
are harness grants, not a reproduction or verification of all live ACLs. The fourth
actor is synthetic/local-only, not additional authority for staging test accounts.

Typecheck +634 tests, focused lint, local combined migration/fixture rollback,
independent data/catalog/ACL/sequence fingerprints and eleven concurrency cases pass.
Local clusters stopped. No staging writes/connections, provider contact, migration
application, deployment, commit/push or production access. No build/browser rerun.
059–060 remain pending. Next: finish the complete reachable fixture/candidate
call-chain review and remote hash-bound rollback-only executor; a separately approved
staging rehearsal with fresh target/ledger/actor/baseline checks is still required.
This closes local general-DDL-notification and selected-policy coverage only, not
the entire Supabase schema, managed Auth, live notification rollback or release gate.

## Combined migration/fixture rollback — local milestone, 9 October 2026

Local PG17 runner now rehearses the actual 059 then 060 draft DDL and payment
fixtures in ONE transaction before applying them to its disposable synthetic
database for the existing test suite. New offline transaction helper accepts only
the two reviewed SHA256 byte sequences, strips exactly their outer BEGIN/COMMIT,
forces deferred constraints and raises a unique Z0590 end-of-test exception.
The caller requires psql exit 3 plus one exact SQLSTATE/nonce error; a success exit,
timeout, wrong exception or extra error cannot pass. Separate read-only sessions
compare data/catalog/ACL/sequence baselines even on an unexpected execution error.
Combined DDL/fixture rollback passed with identical independent baselines.

Removed empty-history assumptions from fixture assertions. Owner-only temporary
baselines now compare pre-existing status history, legacy outbox, notifications and
both identity states. Seeded unrelated synthetic records prove preservation even
when tables are nonempty and identities already consumed. New notifications may
target only the fixture Member/Admin. Local-only negative control still proves
identity advances can survive restored rows; no sequence reset or trigger bypass.

Typecheck +628 tests, focused ESLint, local combined DDL rollback, independent
fingerprints and all eleven concurrency cases pass. Disposable clusters stopped.
No live connections, credentials/backups, new migration edit, deploy, commit/push
or production work this milestone. Actual staging 059–060 remain unapplied; HEAD
319fb20. Synthetic schema remains incomplete relative to Supabase: managed ledger,
full RLS/trigger call-chain review, actual event-hook notification rollback, fixed
remote actor binding and full remote wrapper still require completion/review.
The helper is local-only, not authorization or a runnable staging write command.

## Remaining staging metadata reviewed — 9 October 2026, 17:26 Sydney

Executed the explicitly approved, hash-bound read-only metadata query against
eomubndonbetszdbhsrj only. Verified project identity/healthy status, server read-only
mode and ledger versions exactly 006–058. This follow-up checks versions, not a new
full statement-content comparison. Captured three Auth helpers, six DDL event
triggers, public enum labels and four owned public identity-sequence mappings.
Owner-only raw evidence is referenced by sanitized report
operations/finance-remaining-metadata-review-20261009.json; all previous evidence kept.

Auth uid/role/jwt are SQL/STABLE readers of request claim settings. Confirmed current
membership_status includes active/break/break_1/break_2/inactive; account_status is
active/disabled. Two general DDL hooks inspect command/drop metadata and issue
NOTIFY pgrst; four other hooks are limited to CREATE/DROP EXTENSION. Current drafts
perform neither extension action. No hook, application function, worker or job was
invoked. Sequence ownership confirms status-history/outbox identities plus two
repository audit/event identities; their values were not read or advanced.

Local finance harness now loads reviewed copies of all three captured Auth-helper
bodies instead of constant-role behavior. Compared bodies with captured definitions
after whitespace normalization; tested scalar/JSON precedence, missing claims and
malformed UUID rejection under authenticated role. This does not validate managed
Auth login or real JWTs. Expanded PG17 suite, independent rollback fingerprints and
all eleven races pass; local cluster stopped. Typecheck +624 tests and focused lint
pass. No new build/browser run. No live member/Auth rows, settings/data writes,
migration application, email, provider/other-project contact, deployment or commit/push.

059–060 remain pending, HEAD 319fb20. Remaining work is the complete candidate,
fixture and RLS call-chain review and hash-bound rollback-only remote wrapper,
followed by separately approved rehearsal using only the dedicated test actors
and fresh independent baselines. Metadata review is not permission to run writes
or proof that the full application is production-ready. Month-end billing disabled.

## Independent rollback fingerprints — local milestone, 9 October 2026

Added scripts/local-finance-baseline.mjs and six regression tests. The loopback
runner now captures before/after state using separate psql processes and explicit
REPEATABLE READ READ ONLY transactions. Target binding includes loopback address,
port, database and PostgreSQL system identifier; reused backend PID is rejected.
Inventory is checked against capture coverage and drift. Hashes cover public table
contents/counts, catalog definitions, policies, triggers, ACLs, roles/memberships,
public/Auth routine definitions, enum definitions and sequence definitions/state.
No raw records or definitions are returned by the baseline query. Unsupported
foreign/materialized relations cause refusal instead of silent data omission.

Normal fixture rollback produced identical captured table hashes, catalog hash,
and last_value/is_called for sequences. An independent LOCAL-ONLY negative control
advances a pre-existing synthetic probe sequence within an aborted transaction;
the verifier correctly reports sequences changed, without resetting the sequence.
The disposable cluster was stopped afterward. This remains synthetic evidence,
not full staging schema, real migration-ledger or managed Auth security evidence.

Typecheck +622 tests and focused ESLint pass; local SQL suite including all eleven races passes.
Initial local capture refused inet text with a CIDR suffix; SQL now uses host()
without loosening the strict 127.0.0.1 target guard. No application/migration changes,
live contact, deployment, commit/push or production access. HEAD remains 319fb20.

Prepared (NOT executed) tests/sql/059_060_rehearsal_remaining_metadata_readonly.sql
to resolve missing current public enums, Auth uid/role/jwt definitions, database-wide
DDL event triggers and owned sequence mappings. These are schema/catalog reads only,
with raw definitions kept private. Need staging-only read-only approval before this
follow-up, then complete transitive review and a separately approved write rehearsal.
059–060 remain pending; the remote wrapper is not ready. Month-end billing disabled.

## Isolated finance fixtures — local milestone, 9 October 2026

Added a loopback-only fixture and authenticated-role acceptance tranche for 059–060.
It binds three existing synthetic actors, creates new UUID-scoped classes/dojos,
memberships, assignment, rates and bills, and never inserts Auth users/profiles or
updates existing memberships. The proposed staging counterpart would use only the
dedicated Member 0101, Admin 0002 and Super Admin 0001 after explicit approval and
fresh identity verification; no such accounts were accessed this turn.

Local assertions verify Member cannot waive/confirm receipt, Admin cannot quote
the other fixture dojo, Super Admin can, first month becomes Waived with audit,
reported months remain Pending until Admin confirms, skipped debt stays unpaid,
all three actor profiles stay identical and both legacy identity sequences remain
uncalled. Deferred constraints are forced; fixture rows/temporary schema roll back.
Added a LOCAL-ONLY negative control: a deliberate status change inside an aborted
subtransaction leaves zero audit/outbox rows but advances identities, demonstrating
why row counts alone cannot establish zero residue. Never run this control remotely.

The tranche uses the actual migration 030 rate resolver, actual migration 037
assignment validator and reviewed captured membership-status trigger body. Fixed
the pre-existing synthetic enum to include legacy 'break', matching the historical
catalog (current live enum still needs fresh metadata verification). Other parts
remain simplified synthetic schema: this is NOT complete Supabase/RLS/Auth coverage.
No trigger disabling, sequence reset, external connection or source backup used.

Verification: typecheck +616 tests pass; focused ESLint passes. Expanded local PG17
suite and all eleven two-session payment/adjustment races pass. Disposable clusters
were stopped, including the initial enum-mismatch run. No new build/browser tests.
No migration edits/application, staging contact, deployment, commit/push or production.
059–060 remain pending; HEAD remains 319fb20. Full-schema dependency review, current
enum/Auth-helper verification, independent baseline/residue runner and explicit
staging rehearsal approval remain outstanding. Month-end billing remains disabled.

## Staging dependency audit — read-only, 8 October 2026, 11:40 UTC

Explicit approval executed for eomubndonbetszdbhsrj only. Verified exact project,
server-enforced read-only transaction and versions 006–058. Captured 223 function
bodies and 23 public triggers, defaults, policies and extensions; no public foreign
tables/rewrite rules. All 13 formerly missing bodies plus five helpers are available.
Raw capture is owner-only under C:\protected; sanitized digest/findings are in
operations/finance-dependency-review-20261008.json. No member rows/application RPCs,
settings changes, migrations, jobs, delivery providers or other projects contacted.

Reviewed notification creation, legacy bridge, queue_email and fixture triggers.
Found identity-backed membership_status_history and notification_outbox writes:
rollback does not restore sequence state, even when the legacy bridge suppresses
its row. Expanded baseline inventory and added a hash-bound offline inventory guard
plus five tests. Missing identified definitions is now zero; transitiveReviewComplete
and readyToExecute remain false. Auth/profile fixture prerequisites, candidate/RLS
call chains and complete-schema assertion/independent residue runner remain unfinished.
No trigger bypass, sequence reset, real-member edit or delivery invocation is allowed.

Typecheck +612 tests pass; focused ESLint passes. Initial sandbox test run failed
protected temporary-evidence reads; approved normal-filesystem rerun passed unchanged.
No new build/browser tests; no commit/push/deployment. HEAD remains 319fb20.
Next: finish the isolated fixture/assertion runner locally, avoiding legacy sequence
paths; request explicit rehearsal approval only after isolation is verified.
059–060 remain pending. Month-end automatic billing remains unimplemented/disabled.

## Rollback rehearsal preparation — local only, 8 October 2026

Prepared operations/FINANCE_REHEARSAL_059_060_PLAN.md and an offline guard in
scripts/prepare-finance-rehearsal.mjs. Output binds the existing staging snapshot,
ledger and draft hashes in operations/finance-rehearsal-preparation-20261008.json.
It explicitly reports readyToExecute=false and runnerImplemented=false; no runnable
remote mutation helper or approval is implied. It inventories 13 missing reachable
routine bodies, including create_notification, full-payment triggers and email bridge.
Presence of a definition is not treated as transitive side-effect review or proof
that database rollback prevents provider calls/sequence changes.

Prepared tests/sql/059_060_rehearsal_dependency_readonly.sql for a metadata-only
follow-up; NOT executed. Raw function definitions must go to private evidence, not
console or repository, since definitions may contain sensitive literals. No ordinary
member-record edits, trigger bypass, scheduler changes or provider calls are allowed.
Fixture IDs, transitive call-chain review, complete-schema assertions and independent
before/after catalog/ledger/data-residue checks remain prerequisites. No acceptance
runner was rushed past those missing checks. Existing synthetic tests are unchanged.

npm test: typecheck +607 tests passed. Focused ESLint and diff whitespace check pass.
Guard tests cover missing and overloaded definitions, replica/always triggers, and
absence of credential/network/execution code. No new build/browser run. No remote
contact, migration application, deployment, commit/push or change to active 006–058.
Next: authorize/read the staging dependency definitions, review isolation and prepare
the actual guarded fixture/assertion runner; then request explicit rehearsal approval.

## Read-only staging finance preflight passed — 8 October 2026, 11:26 UTC

User continued after the explicit read-only staging approval question. Contacted
only Supabase management endpoints for eomubndonbetszdbhsrj: project metadata GET
and database/query POST with read_only=true. Verified target ID, ACTIVE_HEALTHY,
database=postgres and server transaction_read_only=on. Region remains ap-southeast-2;
no region/configuration change was attempted. Protected credential stayed in memory.

Current staging ledger is exactly 006–058 (53 entries). All 53 names and ordered SQL
statement contents match repository migrations, allowing CRLF/outer whitespace and
CLI-stripped statement separators only. Repository migration fingerprint remains
a412432bedf7c95578e7ebfb83317987c1d4350d19121fe533007a1967b26ffd;
live ledger fingerprint is
9d341d30c586cfe85fd8c328e05ef97d008f26623f7dc9506b615f89cbd6c4d1.
Pending 059–060 are NOT applied. Fresh catalog confirms no candidate RPC collision,
no payment_group_id column or proposed policy collision, expected fee-history check,
all six guarded replacement prerequisites, and no direct browser mutation grants on
the four inspected finance tables. All 29 captured finance definitions match their
saved historical counterparts. Direct impact remains 25 helper consumers/seven policies.

Evidence: workspace staging-readiness/finance059060-readonly-20261008T112627271Z.
Reviewed summary: operations/finance-staging-readonly-preflight-20261008.json.
Raw function definitions were limited to the finance scope; other public routines
have catalog metadata/digests. No business/member rows, application RPC calls,
worker execution, email, settings changes, deployment or other-project contact.
Catalog prerequisites passed does NOT mean behavioural acceptance or apply approval.
The summary intentionally remains readyToApply=false.

New offline verifier checks exact ledger statements and guarded replacement shapes;
tests reject changed literals, reordered/missing statements, comments removed and
overloaded/missing definitions. npm test passed typecheck +603 tests; focused lint
and diff whitespace validation passed. No UI changes or browser/build rerun.

Next: prepare and obtain approval for complete-schema rollback-contained staging
rehearsal of BOTH drafts, with no delivery/provider calls, reviewed isolated fixtures,
trigger/outbox safety preflight and independent ledger/residue comparison. Do not
apply migrations or deploy until that rehearsal passes and explicit application
approval is given. Month-end automatic billing remains unimplemented/disabled.

## Historical finance compatibility review — local only, 8 October 2026

Reviewed five schema-only JSON exports from the stopped 29 September recovery
catalog (not member rows, protected env files or a current remote database).
New offline review tool records per-file SHA256 and inventories 25 direct finance
helper consumers and seven RLS policies. Evidence is in
operations/advance-payment-catalog-review-20261008.json. Its readyToApply remains
false: no current-ledger or complete-schema execution claim. The pretty-printed
history constraint has equivalent parentheses; pending 060's exact runtime check
remains unchanged. No existing snapshot or migration fingerprint was overwritten.

Two compatibility gaps were found and fixed in the LOCAL candidates:
- Pending 059 adds a SELECT-only dojo policy using the caller-bound finance helper.
  Authorized Admins retain access to assigned inactive dojos; Super Admin sees all.
  Existing public active-dojo policy remains unchanged; no write grant added.
- Pending 060 also corrects zero-fee status in three reviewed legacy internal
  functions: adjust_current_membership_fee, generate_dojo_monthly_subscription_charges,
  system_generate_monthly_subscriptions. Each guarded body replacement requires one
  exact old branch, preserves signature/ACL, and changes only new zero-fee results
  to Waived. Existing rows are not rewritten and no scheduler is activated.

Actual migration-030 rate resolver tested with synthetic tables: scheduled changes,
bounded member overrides/expiry, old-rate fallback, internal resolver EXECUTE denial,
stale quotes, mixed currencies, paid amounts preserved and reported bill pricing
retained through confirmation. Three schema-only legacy function definitions were
copied into a clearly marked test fixture with source hash; no member data copied.
Local actual-role SELECT tests cover Member, Admin, Super Admin, inactive Admin and
anonymous visibility. Zero-fee generation/replay creates no artificial payments;
prepaid advances survive later zero rates and repeat generation.

Final verification: npm test passed typecheck +601 tests; focused ESLint and diff
whitespace check passed. Expanded local PostgreSQL suite and all eleven two-session
races passed; final cluster js-fee-test-aIhjBc stopped. One initial suite hit a
synthetic rollback-duration timing race; fixed fixture to use one clock sample,
not a relaxed production validator. Full suite passed afterward. No new UI changes,
build or browser run this milestone; prior 210 browser/55-page build result remains
historical evidence, not a new live acceptance result.

NOT a complete restored-schema acceptance. Real profiles/membership policies,
indirect finance consumers, settlement/report interactions, trigger/outbox isolation,
current ledger and actual staging RPC definitions still need guarded verification.
Next remote step requires read-only staging catalog/ledger approval; application
and deployment remain separate. 059–060 are still pending, month-end automation
still unimplemented/disabled, and production/providers were never contacted.

## Selected months and competing fee changes — local milestone, 8 October 2026

Supersedes the range-only/Super Admin loader gaps in the earlier entries below.
Member/Admin forms now show a range of up to 12 months with individual checkboxes;
unticked months are excluded from both the quote and mutation. A Member can choose
the oldest loaded unpaid bill as a suggestion, without automatic submission.
Changing the selection invalidates the quote. Group review lists the exact months,
not a misleading continuous range. This is not yet a full arrears-catalog picker.

Pending 059 accepts an optional explicit date array, rejects duplicate/null/noncanonical
dates and count mismatches, sorts dates before locks, and locks/updates only selected
bills. Its preflight rejects any existing same-named RPC overload. Legacy positional
calls remain valid through the default argument. Pending 060's prerequisite matches.
The existing Admin page now loads all dojos for Super Admin and preserves assignment
filters for ordinary Admin; browser fixtures verify both and lookup-error behaviour.
Real Supabase RLS/catalog compatibility still requires separately guarded verification.

Verified locally: typecheck + 595 app tests; focused lint; isolated Next production
build (55 pages); 210/210 Chromium mobile and WebKit desktop/mobile fixture tests;
final 31 SQL/static security contract tests. Synthetic PostgreSQL tests verify paying
first/third overdue months leaves the middle bill's entire row unchanged, exact group
review months, no skipped future charge generation, and invalid selection rejection.
The new SQL test initially inherited immediate constraint timing from a prior test;
reset to deferred at its boundary (the production trigger is already deferred).
A fixture PromiseLike type was corrected before the final passing typecheck.

Eleven two-session races pass: prior duplicate receipt/report/group-review races,
plus waiver/repricing versus report/receipt with BOTH winner orderings forced.
The second session is observed waiting on a real lock before the first commits;
it must reject rather than leave conflicting bill/payment/confirmation/audit records.
Final synthetic cluster js-fee-test-Xg6Tzg is identified by runner output, stopped
after testing; no protected backups or remote credentials are used.

No migrations applied, no remote contact, no commit/push or deployment. Candidates
059–060 remain under supabase/pending; unrelated recovery/.temp changes preserved.
Next: complete-schema compatibility/security acceptance and separately authorized
read-only staging catalog/ledger review before requesting application. Month-end
09:00 Asia/Jakarta billing remains unimplemented and disabled.

## Overdue fee adjustment and waiver — local candidate, 8 October 2026

Reused existing waived charge state and membership_fee_adjustment_history (verified
against migration 015 and the saved 29 September schema-only catalog). Pending 060
adds a selected-charge adjustment RPC and extends the existing history type check;
no new history table. Required reason/expected old fee, dojo scope, ordered locks,
and no paid/pending/closed bill changes. Fee zero becomes Waived, not Paid; original
amount remains in history with actor/date/reason. Notification and audit failure
roll back the entire adjustment. Existing current-month zero-fee API branches are
also repaired by a fail-closed body replacement, without rewriting past records.

Existing Member/Admin subscription pages now preserve Waived labels and prevent
payment on closed bills. Admin has a compact per-bill adjustment control. Pending
059 now permits existing overdue bills while refusing to manufacture missing past
bills. Single-month or consecutive-range selection works; arbitrary nonconsecutive
checkbox selection/automatic oldest-month selection is not implemented.

Synthetic PostgreSQL test verifies three overdue months, first waived, remaining
two reported/rejected, second repriced/paid alone, third still due. Permission,
pending/paid/stale/duplicate checks, notification rollback, authenticated-role
execution and old zero-fee API pass; prior three payment concurrency races pass.
Clusters stopped. Typecheck and 595 app tests passed outside the Windows sandbox
after the first run's synthetic protected-path evidence access failures; focused
lint and isolated optimized build passed. Final browser rerun: all 195 tests passed
across Chromium mobile and WebKit desktop/mobile. Corrected the new test's missing
nested-disclosure expansion after two initial mobile failures; no failed run counted
as a pass. This is local emulation, not live/physical-device acceptance.

No live catalog, credentials, staging/production/provider contact, deployment,
commit/push or migration application. 059 and 060 remain under supabase/pending;
verified active ledger remains unchanged. Before deployment: reconcile Super Admin
finance-page dojo selection/copy, run waiver/payment race tests and complete-schema
acceptance, review staging catalog/ACL/RLS and obtain explicit migration approval.
Monthly automation remains unimplemented. Unrelated working changes preserved.

## Multi-month dojo payment workflow verified locally — 7 October 2026

Added local Member full-total reports (Pending until receipt), scoped dojo-Admin
group approval/rejection and direct received-payment entry, with Super Admin
oversight. Reuses existing monthly bills, rate resolver, payment records and alerts.
Paid months retain prices and are excluded from ordinary monthly due messages.
No partial payments or automatic money collection added.

Candidate SQL 059 remains in supabase/pending, NOT the active 006–058 migration set.
Adds a nullable confirmation group ID/index, atomic group trigger and five RPCs;
also tightens the shared finance helper's active-account checks and includes Super
Admin oversight. The shared helper's existing consumers require full-catalog review.
UI lives in the existing Member/Admin subscription pages and two new components.

Verified: typecheck +593 app tests, focused lint, isolated Next build (55 pages),
and 186 Chromium-mobile/WebKit-desktop/WebKit-mobile fixture tests passed. Fixed a
new test's wrapped-select locator after the initial six browser failures; full
rerun passed. No physical-iPhone or live browser result claimed.

Disposable synthetic PostgreSQL 17 tests passed ownership/dojo/ACL/disabled-account
checks, amount/quote/replay checks, pending/receipt/rejection flows and last-month
failure rollback of earlier bills/payments/alerts. Three synchronized two-session
races (direct receipt/report/group review) each commit exactly once; final counts
and totals verified. Clusters stopped; no real backups, credentials or remote data
used. Synthetic rate/catalog fixtures do not replace staging acceptance.

Full scope, commands, limitations and next gates:
operations/ADVANCE_SUBSCRIPTION_PAYMENTS.md. Monthly last-day 09:00 Jakarta automation
still needs implementation and remains disabled. No remote catalog audit, migration
application, commit/push, deployment, provider call or scheduler activation occurred.
Existing unrelated local changes preserved. HEAD remains 319fb20.

## Disabled no-send probe deployed to staging — 7 October 2026

Under explicit user approval, committed and pushed only the four no-send probe
files as 319fb201a0da4172709d9e7e813c9773009e8680 on release/v1-readiness-20260918.
Existing Vercel project prj_uCQO2Y5KiACpA5YAWKAWp8yb5rZ8 built Preview
dpl_HW2ismrCKo8tw1trEbcdXtcUtxKH to READY. Assigned only
jingwuguanseibukan-staging.vercel.app and independently verified its deployment ID.
Previous Ready Preview dpl_B77ksoPScNXXNN5QFrfZWQzU1htS remains the rollback target.

Preview configuration was checked before deployment and after alias assignment:
staging project/site bindings match, SCHEDULER_ACCEPTANCE_* and temporary email-test/
diagnostic variables are absent, and environment inventory is unchanged. No secrets
were created or uploaded. Live unauthenticated probe POST returned 404/disabled with
Cache-Control no-store; GET returned 405. No email/queue/memorial work was invoked.

Fresh verification: typecheck and all 588 application tests, focused ESLint, all 44
local scheduler/deployment-guard tests, and all 11 staging host probes plus security
headers passed. Host probes initially failed at Windows sandbox TLS before HTTP;
reran outside the sandbox with certificate verification intact and all passed.
Vercel production build succeeded. No browser-role or live scheduler trial claimed.

Only the four intended files were committed. Unrelated checkpoint/recovery and
Supabase temporary-link edits remain local and preserved. Cloudflare and Healthchecks
were not accessed or changed; no cron enabled, no pings or emails sent, no production,
retired or disposable project contacted. No database migration was performed.
Evidence: workspace staging-readiness/email-scheduler/probe-disabled-319fb201a0da4172709d9e7e813c9773009e8680.json
and DISABLED_PROBE_DEPLOYMENT_2026-10-07.md. Next gate is separately approved disabled
Cloudflare deployment with valid scoped credentials, not recurring activation.

## Local bounded no-send scheduler safeguards verified — 7 October 2026

Under the user's local-only implementation approval, added the staging scheduler
probe route/config guard, its four handler tests and operations runbook. The probe
is default-disabled and bound to the exact Preview branch/project/site/commit,
v4 trial ID, independent secret and at-most-ten-minute UTC window. It has no
database/queue/memorial/Resend dependencies; no request can process unrelated work.
This is explicitly a no-send routing probe, not normal-worker acceptance.

Workspace scheduler core now requires an explicit execution mode, pins acceptance
to the no-send route, and persists a maximum 1–3 claimed attempts plus immutable
trial identity/bounds in the existing SQLite object. Restart, overlap, UUID/window/
commit/cap edits or switching mode cannot silently renew the allowance. Expiry is
checked before/inside/after claim with full request/heartbeat time reserved; expiry
or uncertainty retains the lock. Acceptance credentials are not sent to Healthchecks,
and the ordinary worker secret is never sent to the probe. No reset endpoint added.
Checked-in ENABLED=false, zero crons and disabled public URLs remain. Historical
deployed hashes were preserved; local core/config now intentionally differ.

Verification: npm test passed typecheck and all 588 app tests; 40 scheduler core/
workerd/SQLite tests passed, with fake credentials and intercepted HTTP. Focused
ESLint and git diff --check passed. Optimized isolated build passed (55 pages).
Loopback-only built-server probe: GET 405, POST 404/disabled/no-store; server stopped.
The initial new handler harness lacked the server-only/crypto mock imports; fixed
the harness and reran the full suite successfully. No failed run counted as a pass.

App files: app/api/system/staging-scheduler-probe/route.ts,
lib/email/staging-scheduler-probe.ts, scripts/staging-scheduler-probe.test.mjs,
operations/STAGING_SCHEDULER_PROBE.md. Workspace scheduler files: core.mjs,
core.test.mjs, runtime.test.mjs, wrangler.jsonc and README.md. Unrelated edits retained.
No migration, commit/push, deployment, credential generation/read/upload, live tests,
monitoring pings, worker execution, production/retired/disposable/provider contact.

Next: review the local candidate and separately approve its disabled staging
deployment/provisioning scope. Any live no-send scheduler trial requires its own
bounded window, valid control-plane shutdown access and monitor approval. Normal
worker execution/producer isolation and recurring activation remain separate gates.

## Scheduler acceptance safety review — 7 October 2026

Local HEAD remains 15669c3. Passed 39 focused repository tests plus 27 scheduler
core/workerd/SQLite tests (66 total), with fake credentials and intercepted HTTP.
No remote calls or changes. Existing scheduler source/config hashes still match
recorded disabled deployment evidence; this is not a fresh remote-state check.

Two live-trial boundaries remain: the scheduler has no absolute acceptance expiry
or total-attempt cap, and the ordinary worker can publish memorials and claim up to
20 unfiltered emails. Empty-queue snapshots do not isolate concurrent producers.
Prepared workspace staging-readiness/email-scheduler/SCHEDULER_NEXT_GATE_2026-10-07.md
with a bounded acceptance-mode proposal and separate producer-isolation gate.
No implementation/deployment, token renewal, activation or worker execution here.
Next requires agreeing the local guard/isolation scope before any live trial.

## Both monitoring alerts received — 7 October 2026

User explicitly confirmed both UP and DOWN emails received at 17:38 (Sydney) in
the existing alert mailbox. This supersedes the earlier non-receipt report and
closes recipient acceptance for this bounded monitor-only failure/recovery cycle.
Recovery receipt is user-confirmed, not a newly verified provider-dispatch log.
The monitor remains in its last independently verified Paused state; no retest,
ping, settings change or remote contact was made to record this confirmation.
Live Cloudflare scheduler cadence, ordinary application-worker execution and
independent backup-alert routing remain separate gates, not passed by this test.

## Monitoring receipt gate not passed — 7 October 2026

User reports receiving neither monitoring email. Read-only provider recheck still
shows recipient repository.js@gmail.com and Last Notification Delivered; this is
provider-reported status only, not proof of inbox receipt. Recovery-email dispatch
also remains unverified. Do not count end-to-end alert delivery as passed. The
monitor was left paused; no new alert, ping, recipient change or repeat cycle was
performed. Next: confirm the user checked that exact mailbox including Spam/All
Mail and resolve delivery before any separately approved retest. The earlier
successful Resend email to whv.calvin@gmail.com is a separate delivery path.

## Monitor-only cycle completed and paused — 7 October 2026

Under explicit approval, exercised only the existing staging Healthchecks check
40bb4907-a229-41a1-a1e4-55cad99872ab. Exactly two UI success heartbeats; observed
paused -> up -> late -> down -> up -> paused. Window 06:34:30–06:40:51 UTC
(17:34–17:40 Sydney), under the approved 10-minute cap. The Down email to
repository.js@gmail.com was recorded and the integration reported Delivered.
Recovery state was verified, but recovery-email dispatch/recipient receipt remains
unverified. Read-only integration inspection shows both Up and Down enabled; the
log's Downtime alert filter does not establish whether an Up email was sent.
No automatic repeat, third ping, settings change or integration test was performed.

Independently reloaded and verified Paused after shutdown. Existing 1-minute period,
2-minute grace and shared recipient integration preserved. No application worker,
Cloudflare activation, database or production/retired/disposable contact. The
monitor-only result does not certify scheduler cadence or application-worker safety.
Evidence: workspace staging-readiness/email-scheduler/MONITOR_ACCEPTANCE_RESULT_2026-10-07.md
and monitor-down-20261007.jpg / monitor-paused-20261007.jpg. Next: confirm receipt
of both test notifications, then scope the remaining scheduler/worker acceptance.

## Recipient receipt confirmed; monitoring preflight — 7 October 2026

User explicitly confirmed receipt of the single authorized staging test email.
The provider-delivered and human-received checks for that exact message are now
complete; no further send or repeat of the consumed fixture was performed.

Read-only Healthchecks dashboard inspection verified the existing check
`Jingwuguan staging email scheduler` remains paused, with 1-minute period and
2-minute grace. Its only enabled notification method is the existing email
integration to repository.js@gmail.com, shown Ready to deliver with no previous
notification. The unrelated My First Check was not changed. No ping, alert,
integration modification or unpause was performed. Cloudflare remote state was
not rechecked; the local disabled/no-cron configuration remains unchanged.

Reran the 20 offline scheduler-core tests: all pass. These are mock-based safety
checks, not live scheduler execution or alert evidence. Next is a separately
approved monitor-only missing-heartbeat/recovery test, after confirming the owner
can receive the existing alert mailbox. Keep Cloudflare and the normal application
worker inactive; do not infer ordinary-worker safety from an empty queue snapshot.
No database, production, retired/disposable project or delivery API contacted here.

## One-message staging delivery verified — 7 October 2026

Completed the separately approved single-email acceptance on staging
eomubndonbetszdbhsrj at commit 15669c3. Independently verified the existing fixture
was unused before execution; no additional fixture was inserted. The bounded gate
window was 05:52:47–06:04:47 UTC. Exactly one authorized request at 05:53:38 UTC
returned HTTP 200/provider_accepted. The outbox now records sent, attempts 1 of 1,
with a provider ID and sent timestamp. Resend's exact-message dashboard visibly
confirmed Sent and Delivered for the approved owner mailbox. This is provider
delivery evidence, not confirmation that the recipient read or saw it in Inbox.

Shutdown completed at 05:53:51 UTC: only the staging alias was restored to normal
disabled Preview dpl_B77ksoPScNXXNN5QFrfZWQzU1htS, all eight temporary project
settings were removed, unrelated configuration metadata was unchanged, and the
alias returned HTTP 404/disabled/no-store. The immutable temporary Preview retains
its original expiring configuration; the fixture's one-attempt allowance is consumed.
No resend, ordinary worker invocation, or scheduler activation was performed.

All 68 database baselines were unchanged excluding the exact authorized fixture.
That consumed fixture is intentionally retained for audit, not claimed as zero
residue. Independent read-only audit at 05:56 UTC confirmed exact ledger 006–058,
expected email-function definitions/ACLs and outbox RLS, no pending/due/stuck queue,
and two sent rows total including the pre-existing historical row. All 11 read-only
staging host/security-header probes passed. Production, retired and disposable
projects were not contacted. No migrations or application source changes this step.

Evidence: workspace staging-readiness/email-scheduler/single-email-15669c3-20261007.json;
protected reconciliation jwg-database-access-ad3490877f79490bbf4f0dfed14551da;
independent audit jwg-database-access-06ca13cacc0b4a649c11a5e41476da26/
staging-email-audit-1791352604387; Resend message 01a114ec-bb44-7494-be83-e829ea8df5f2.
Prior milestone entries below are historical. Next: recipient receipt confirmation,
then separately scoped scheduler/monitoring acceptance. This test does not certify
ordinary-worker scheduling, Auth/reset delivery, or overall production readiness.

## Empty-stream fix deployed with sending disabled — 7 October 2026

Under the user's explicit commit/push/staging-deployment approval, committed only
the send route, its regression tests and single-message runbook as
15669c3ca64260756524bb661c2c3a3b29b094f7; pushed the existing release/v1-readiness-20260918
branch. Preserved unrelated checkpoint/recovery/Supabase metadata changes.
Fresh npm test passed (typecheck and 584 tests); focused ESLint passed. The previous
isolated optimized build remains applicable to unchanged runtime source.

Vercel Preview dpl_B77ksoPScNXXNN5QFrfZWQzU1htS built Ready from the exact commit,
jingwuguanseibukan-94wyxq0zl-js1-ccd7.vercel.app. Verified project/branch/SHA/Preview
identity and staging bindings, no STAGING_EMAIL_TEST_* or STAGING_EMAIL_DIAGNOSTIC_*
settings, and unchanged before/after Preview configuration metadata. Assigned only
jingwuguanseibukan-staging.vercel.app and read back the exact deployment target.

Initial immediate endpoint verification stopped and restored the old alias. Preserved
that journal. Reused the same already-Ready deployment (no duplicate build), assigned
the alias and used bounded unauthenticated observations to allow propagation. The
diagnostic GET initially returned 404 then 405; final both routes returned POST
404/disabled/no-store and GET 405. This demonstrates transient routing in this run,
not definitive proof of the earlier single-message 404's cause.
All 11 read-only staging host/security-header probes passed afterward.

No sending gate enabled, authenticated send attempt, provider/email contact, worker
invocation, scheduler activation, database access/write/migration, production,
retired or disposable project contact. Retained fixture untouched. Delivery and
live execution of the corrected authenticated send path remain unverified.

Evidence: workspace staging-readiness/email-scheduler/disabled-fix-20261007.json
(preserved initial check failure) and disabled-fix-20261007-reconciled.json (success).
Next is a separately approved short single-email window, with the existing fixture
independently confirmed unused, one attempt only, gate shutdown and reconciliation.

## Send-route empty-stream fix verified locally — 7 October 2026

Under the approved fix-and-test-only scope, updated the staging-email-test handler
to accept a null body or immediate EOF from an empty adapter stream, after existing
authentication. Every chunk, including an empty chunk, is rejected before database
work. Consumed/locked/errored streams and cancellation failures return a sanitized
400; reader locks are released. The approved window is checked again after stream
validation. No recipient/content, atomic claim, attempt limit or provider behavior
was changed. The ordinary worker and diagnostic route are unchanged.

Added six regression tests covering empty-stream success/replay, body rejection
despite Content-Length: 0, error/consumed/locked/cancel-failure cases, authentication
before stream access, expiry before database work and eight concurrent empty-stream
requests sharing one mocked send latch. All network/database/provider dependencies
in these handler tests are fakes. Full npm test passed: typecheck plus 584 tests;
23 focused diagnostic/send tests, focused ESLint and isolated optimized Next build
(54 pages) also passed. No live security/delivery test was run in this step.

Files changed: app/api/system/staging-email-test/route.ts,
scripts/staging-single-message.test.mjs, operations/STAGING_SINGLE_MESSAGE.md,
and these checkpoint/progress notes. Changes remain local/uncommitted; no push,
deployment, migration, environment change, database access, message or provider
contact. Previously retained fixture was not touched. Production/retired/disposable
projects were not contacted. Existing unrelated dirty files preserved.

Next requires approval to commit/push this scoped fix and deploy to staging with
sending disabled, then verify the disabled gate. A new bounded single-email window
is separate; do not infer it from this local compatibility-fix approval.

## No-send diagnostic completed; empty-stream blocker identified — 7 October 2026

Approved diagnostic-only work committed/pushed as 6b398e8 and a6edfe9. Four diagnostic
files added; existing email-send route/guard and unrelated working changes preserved.
578 tests (17 focused) passed; typecheck, focused lint and initial isolated optimized
build passed. Corrected Preview a6edfe9 also built Ready as
dpl_XhECHd6eURiTtmKQYr1uDhfP2Ltb. Both probes used the original diagnostic window
05:25:20.336Z–05:37:20.336Z, not an extended window. No sending configuration enabled.

First diagnostic returned 400; after accepting empty adapter streams (still rejecting
non-empty input), authenticated diagnostic returned 200 with fixed labels/booleans.
All stable runtime checks passed, exact request URL matched, synthetic in-memory
config was accepted by the original pure guard, actual send config remained disabled.
Vercel confirmed requestBodyStreamPresent=true for a bodyless POST. The unchanged
send route rejects this representation, identifying a definite future-send blocker.
This does not by itself explain the earlier unauthenticated 404; previous per-test
configuration/alias propagation remains unverified. No provider validity/delivery claim.

Restored staging alias to dpl_81iWNn1dZT83kpxUhsiitwnn3jZD, removed the three temporary
diagnostic settings, verified no test/diagnostic settings and unchanged unrelated
metadata. Send endpoint 404/disabled; all 11 host/security-header probes passed.
Read-only SQL confirmed ledger 006–058, expected email ACL/RLS/source, quiet queue
and retained unused synthetic fixture. No database write, message, worker/scheduler
activation, production/retired/disposable contact or migration in this diagnostic.

Report: workspace staging-readiness/email-scheduler/DIAGNOSTIC_RESULT_2026-10-07.md;
immutable diagnostic evidence in diagnostic-20261007.json and diagnostic-stream-20261007.json.
Next: approved compatibility fix/tests for the sending route, then separately bounded
future acceptance. Do not send/rearm/delete the retained fixture automatically.

## Single-email acceptance stopped safely at live gate — 7 October 2026

Vercel CLI refreshed the user's login; exact staging Preview access recovered.
Created one approved synthetic email_outbox fixture b58477e6-8c2c-4a0e-8ff8-1e6019ace778
for whv.calvin@gmail.com. Corrected a local helper error: Vercel env-pull sensitive
values are empty redactions, not runtime values, and must not overwrite protected
local values during a local shape check. No deployed secrets or application code changed.

Continued with the same unused fixture, preserved earlier logs, and kept the original
12-minute window (05:04:52.370Z–05:16:52.370Z). Eight temporary branch-scoped Preview
variables were acknowledged/read back. Exact commit 198747a built Ready as
dpl_APxoAFwqxfSG8EULYYjNBt9zYhwJ. After assigning only the staging alias, its
unauthenticated gate probe returned 404/disabled, not expected 403/not_authorised.
No authorized send request or provider send was attempted; no automatic retry.

Restored alias to dpl_81iWNn1dZT83kpxUhsiitwnn3jZD, removed all eight temporary
variables and verified unchanged unrelated environment metadata. Restored gate
404/disabled/no-store and all 11 host/security-header probes passed. All 68 baseline
table checks matched excluding the exact fixture. Fixture remains cancelled with
attempts 0/max 1 and no provider ID/sent time; retained, not deleted or reset.
Independent read-only staging audit reconfirmed 006–058, expected email ACL/RLS and
function sources, quiet actionable queue and recipient isolation from profiles/Auth.

Runtime-gate cause remains unverified: deployment metadata includes required names,
exact branch/SHA and autoExposeSystemEnvs=true, but does not prove runtime values;
immediate alias propagation is not excluded. Do not weaken the gate or send again.
Next requires narrowly scoped secret-free staging diagnostics before a new window.
No scheduler activation, normal-worker call, production/retired/disposable contact,
migration, source commit or push. Immutable test Preview retains its expired-by-design
window even though project variables were removed; alias restoration was verified.

Report: workspace staging-readiness/email-scheduler/SINGLE_EMAIL_STOPPED_2026-10-07.md.
Sanitized journals: single-email-20261007-resumed.json and single-email-20261007-send.json.
Protected reconciliation: C:/protected/jwg-database-access-84ad3ea09a1e4941875e05c57be5814f.

## Approved single-message test blocked before mutation — 7 October 2026

Approval received for one synthetic fixture and one test email to whv.calvin@gmail.com,
with a gate lasting at most 15 minutes, shutdown and reconciliation, and no retries.
Refreshed staging-only read-only audit: exact versions 006–058, empty actionable queue,
recipient absent from profiles/Auth/outbox, SQL definitions matching offline 058,
and expected email ACL/RLS. Resend UI shows staging-v3 sending-only/domain-scoped
key and verified domain. Cloudflare staging scheduler remains ENABLED=false with
no cron, queue or email triggers. No settings changed through either dashboard.

Prepared syntax-checked one-shot helper with a 12-minute gate, exact-row fixture,
single authorized POST, alias restoration, gate-variable removal and public-table
baseline reconciliation. Execution stopped on its first Vercel project GET:
HTTP 403, code forbidden, invalidToken=true (independently read-only confirmed).
No fixture insertion, enabling configuration, redeployment, alias change or send
was attempted. Live staging guard still returns 404/disabled/no-store.

Evidence: workspace staging-readiness/email-scheduler/single-email-20261007.json;
fresh audit under C:/protected/jwg-database-access-06ca13cacc0b4a649c11a5e41476da26/
staging-email-audit-1791348828939. The new protected evidence directory
C:/protected/jwg-database-access-3e71f3221c304728bddd1ea5a4c6d072 contains no test
secret or fixture evidence because the operation stopped before those steps.
Next: reauthenticate the Vercel CLI, then resume the approved scope with a fresh
one-shot journal after verifying that this attempt made no remote mutations.
Do not replay or overwrite the failed-attempt journal. Actual delivery remains open.

## Approved Preview email configuration synchronized — 7 October 2026

User confirmed ownership/access to the proposed whv.calvin@gmail.com inbox, then
separately approved the configuration step. Reapplied only SUPABASE_SECRET_KEY and
RESEND_API_KEY from the owner-only protected staging file, keeping both sensitive,
and added STAGING_PROJECT_REF=eomubndonbetszdbhsrj as non-secret configuration.
All three are scoped only to Preview/release/v1-readiness-20260918. Vercel acknowledged
each write; subsequent scope/type readback passed. Unrelated Preview metadata was
compared before/after and unchanged. Source credential values were not edited or logged.

Created one new same-commit Preview after the updates:
dpl_81iWNn1dZT83kpxUhsiitwnn3jZD, commit 198747a5303754416b82ae230a8ab381128c2d56,
jingwuguanseibukan-hxdt08joo-js1-ccd7.vercel.app. Verified Ready and exact identity,
then assigned only jingwuguanseibukan-staging.vercel.app and verified alias readback.
All 11 host probes/security headers passed. Live unauthenticated guard POST returns
404/{code:disabled}/no-store and GET returns 405. No enabling guard settings added.

This is acknowledged configuration synchronization and a verified disabled deployment,
not decrypted runtime-secret equality, provider-key validity or inbox delivery proof.
Secret readback remains unavailable. No fixture, message, worker execution, scheduler
activation, Supabase write/migration, production/retired/disposable contact or
deployment-protection change. No code commit/push; unrelated working changes preserved.

Sanitized one-shot journal: workspace staging-readiness/email-scheduler/
config-sync-198747a-20261007.json; report CONFIG_SYNC_VERIFIED_2026-10-07.md.
Do not replay the sync helper: it refuses an existing journal and records uncertain
writes/deployments for reconciliation. Next remains separately approved one-message
fixture/configuration window with post-send disablement; actual delivery unverified.

## Read-only single-message prerequisites audited — 7 October 2026

Read-only staging SQL verified exact version inventory 006–058, zero queued/due/
processing/exhausted mail, and no due memorials on Jakarta 7–8 October. Proposed
replacement inbox has zero profile/Auth-user/Auth-identity/outbox matches and differs
from local sender/security-test emails. Ownership/deliverability remain unverified.
Claim, acknowledgement and normalization function bodies match reviewed offline 058
schema; browser-role execute/table access denied; service-role access and enabled
normalization trigger inspected. No function invocation or data/schema change.

Vercel reverified Ready 198747a and exact staging alias. Current Preview branch
settings' site URL, Supabase URL and sender match local protected values. Three
secrets are sensitive and branch-scoped, but their equality is unverified. Required
STAGING_PROJECT_REF is absent; no guard settings were added. Deployment-specific
configuration read returned 400: current project settings are not deployed-value proof.
Initial encrypted list-record comparison produced false mismatches; corrected CLI
Preview-pull evidence supersedes that attempt, without overwriting failure evidence.

Evidence and boundaries: workspace staging-readiness/email-scheduler/
READ_ONLY_PREFLIGHT_2026-10-07.md. New SQL evidence directory suffix is
staging-email-audit-1791310873216 under the existing protected 06ca13c directory;
explicit current-user-only ACLs and all three file hashes verified. No source
credential changes, fixture, sends, provider delivery, scheduler activation,
production/retired/disposable contact, commit, push or deployment this turn.

Next requires inbox ownership confirmation and separately approved runtime-secret
verification/configuration preparation. Actual fixture/send/cleanup remains unapproved.

## Disabled guard staging alias and host acceptance passed — 7 October 2026

Vercel CLI device sign-in completed successfully after the user's website approval.
Authenticated readback verified Ready Preview `dpl_9vu4U6DsV7sUDeScyHVz8gCSS1KA`,
exact commit `198747a5303754416b82ae230a8ab381128c2d56`, existing project/team and
`release/v1-readiness-20260918`. Under the existing scoped approval, assigned only
`jingwuguanseibukan-staging.vercel.app` to this deployment; independent alias API
readback verified both deployment and project IDs. No second deployment was created.

`scripts/probe-staging-host.ps1` passed all 11 read-only HTTP cases and required
security headers on the newly assigned staging alias. The new guard's bodyless,
unauthenticated POST returned HTTP 404 with exactly `{ "code": "disabled" }` and
`Cache-Control: no-store`; GET returned HTTP 405. Redirects were not followed.
This verifies the live guard is disabled, not live sending or database concurrency.

No guard settings/secrets changed, fixture created, email sent, normal worker run,
database migration/mutation, scheduler activation or production/retired/disposable
contact. No deployment protection changes. No authenticated browser/role suite or
new CI run in this alias-only milestone. Existing local changes remain preserved.

The prior alias/auth blocker below is resolved. Next is separately scoped read-only
recipient/deployed-configuration/SQL acceptance preparation; actual fixture creation,
one-message sending, cleanup, monitoring and scheduler activation remain separately
unapproved. Evidence summary: workspace staging-readiness/email-scheduler/
ALIAS_198747A_VERIFIED_2026-10-07.md.

## Guard committed; Preview Ready; alias update blocked — 6 October 2026

Under explicit approval, committed only four guard files (route, config, tests and
operator runbook) as `198747a5303754416b82ae230a8ab381128c2d56`, then pushed the existing
`release/v1-readiness-20260918` branch. Remote SHA independently matched. Existing
checkpoint/recovery notes and Supabase temporary-file changes remain uncommitted
and preserved; no unrelated work was included. All 11 guard tests passed again.

Vercel browser verified no STAGING_EMAIL_TEST variables in either Project or Shared
Preview settings. Preview branch tracking remains disabled. Created one explicit
Preview from the release branch after the UI resolved exactly commit 198747a.
Deployment `dpl_9vu4U6DsV7sUDeScyHVz8gCSS1KA` reached Ready (41-second build):
`jingwuguanseibukan-blzxvuzbq-js1-ccd7.vercel.app`. No gate variables or secrets added;
the implementation remains disabled by default. No send or fixture was attempted.

The custom staging alias was NOT reassigned. Existing CLI authentication returned
403 forbidden even for the new Preview's read-only deployment detail. Dashboard
deployment actions offered no alias assignment; the staging alias is absent from
the project's domain-settings list. No permissions or protection were weakened,
and no replacement token was created. The new Preview's unauthenticated GET to the
guard returned 302 to Vercel authentication, without following the redirect.
Therefore the live disabled-route response and new-release host probes remain
unverified; probes on the old staging alias would not certify the new commit.

Screenshot evidence: workspace `staging-readiness/email-scheduler/preview-198747a-ready.png`.
No production/retired/disposable contact, database changes, email sends, scheduler
activation or new CI dispatch. Next: restore authorized Vercel CLI/API access,
assign only `jingwuguanseibukan-staging.vercel.app` to this Ready deployment, then
verify its disabled route and host probes. Live test-email approval stays separate.

## Single-message staging email guard locally verified — 6 October 2026

Implemented the approved local-only guard at `POST /api/system/staging-email-test`,
with configuration in `lib/email/staging-single-message.ts`, 11 focused tests in
`scripts/staging-single-message.test.mjs`, and the operator contract in
`operations/STAGING_SINGLE_MESSAGE.md`. The normal worker is unchanged.

Disabled by default; requires the exact staging project/origin, Preview release
branch/commit, separate secret, matching UUID/recipient and a maximum 15-minute
window. Checks recipient absence in profiles/Auth and conditionally claims only
one exact cancelled synthetic outbox row with attempts 0/max_attempts 1. No ordinary
queue claim or memorial RPC. Consumed attempts are never reset/requeued on failure.
Provider address is pinned; redirects refused; timeout bounded; one idempotency key.
Replies are sanitized and distinguish provider acceptance from inbox delivery.

Verification completed locally:

- `npm test`: typecheck and all **572 tests passed**, including all 11 new tests.
- `npm run lint`: passed, with no warnings/errors.
- Optimized Next build using `smokeEnvironment()` and `.next-browser-smoke`: passed,
  including all 53 static pages and the new dynamic route.
- Built Next server on loopback only: disabled POST returned 404 `{code: disabled}`
  with no-store; GET returned 405; local server stopped afterward.
- Installed Resend SDK tested with mocked fetch: timeout, no redirect, idempotency
  header, no automatic retry and no raw-error logging in the required runtime mode.

Initial sandbox full-suite/build failures were Windows canonical-path/access errors;
unchanged checks passed after approved local execution outside the sandbox. The
concurrency test uses an in-memory atomic-claim model, NOT a live PostgREST/SQL test.
Existing claim/ack/normalization function bodies and table shape were inspected
from the protected offline 058 schema; no new migration was created or applied.

Unverified: live conditional-update behavior and grants, deployed gate/secret
identity, recipient ownership/isolation and actual delivery. Account inventory is
not a transactional lock against new registration; acceptance requires independent
recipient/producer checks. This guard does not certify scheduler or reset delivery.

No commit/push/deploy, fixture, message, remote database write or provider request
was made for this implementation. No production/retired/disposable contact. Local
HEAD remains 2a06eb3; unrelated recovery and Supabase temporary-file edits preserved.
Next requires review and separate staging-only deployment approval with the gate
disabled, followed by explicit approval of one named recipient/fixture/send window.

## Read-only staging delivery preflight refreshed — 6 October 2026

Read-only staging SQL at 10:37 UTC (21:37 Sydney) verified version inventory
006–058, outbox RLS/internal worker ACLs, no outstanding/processing/exhausted mail,
no due memorial candidates for Jakarta 6–7 October, and no database cron tables.
Memorial source bodies match migration 040; no RPC or worker was invoked.

Saved Cloudflare/Vercel credentials returned 401/403. Read-only browser fallbacks
confirmed staging scheduler disabled/no triggers/public URLs, Healthchecks paused,
and Resend verified sender domain with domain-restricted sending-only Staging v3 key.
No credential changes or production-key detail inspection. Vercel dashboard shows
Ready Preview dpl_9SmayAxT3GgDyHLP68EGtssLSzcP, commit 8143a20, release branch and
staging alias. Independent registration-bundle inspection found only the staging
Supabase hostname across 11 scripts. This does not prove deployed server secrets.

Full sanitized report: workspace staging-readiness/email-scheduler/
READ_ONLY_PREFLIGHT_2026-10-06.md. Protected SQL evidence is staging-email-audit-
1791283022697 under C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26.
Remaining blockers: deployed secret equality, dedicated recipient verification,
enforceable single-fixture/producer isolation, installed claim/ack source comparison,
then explicit send/cleanup and separate alert/activation approval. Current worker
can process memorials and up to 20 outbox rows; queue emptiness is not isolation.
No messages, pings, remote settings/data writes, production/disposable contact,
code/migration changes, commit, push or deployment. Live delivery remains unverified.

## Email/scheduler next-gate preparation refreshed — 6 October 2026

Reused the existing workspace `staging-readiness/email-scheduler/GUARDED_DELIVERY_PLAN.md`
and historical read-only preflight; no duplicate implementation. Verified local
HEAD 2a06eb35eeb228fded7dec5e9399a5da59816d16 and no committed changes to the
worker/email/admin-client/rate-limit paths since recorded staging release 8143a20.
Remote deployment, provider configuration and queue observations were NOT refreshed.

Seventy-five focused local tests pass: 48 repository email-worker/scheduler/
monitoring/provider-delivery/Auth-email guards, 20 scheduler core tests and seven
workerd/SQLite runtime/config checks. Initial sandbox runtime startup failed six
cases with Access Denied; unchanged tests passed outside the sandbox with mocked
outbound requests and telemetry disabled. No application code or test policy changed.

Worker scope still includes memorial publication and up to 20 outbox claims;
queue emptiness is not producer isolation or permission for a single-recipient send.
Existing delivery plan now distinguishes current recorded 006–058/8143a20 from
historical 006–056 preflight, and staging evidence from production-bound manifests.

Next requires scoped Phase A read-only inspection of staging and its existing
Vercel/Cloudflare/Resend/Healthchecks resources. Sending, Auth recovery messages,
worker/RPC execution, heartbeat pings and recurring activation remain separately
unapproved. No protected credentials read, remote requests, production contact,
disposable resume, commit, push or deployment in this preparation turn.

## Disposable original-password recovery acceptance PASSED — 6 October 2026

The separately approved readiness-gated run completed only on disposable
`xiqvkarqcvhbiexuzglo`. Member 0101, Admin 0002 and Super Admin 0001 each passed
original-password login, server-side user/session identity verification, refresh,
local logout and rejection of the logged-out refresh token (`refresh_token_not_found`).
No password resets, signup, messages, member/profile changes or import replay.

Before any password grant, the pinned full database verifier, stable DB probes,
account/role/password checks, prior-attempt reconciliation, six logo hashes and
isolation checks passed. GET `/auth/v1/settings` first reported email disabled,
then enabled about 15 seconds later. Two enabled samples 15 seconds apart were
required before login. Disablement likewise took effect on the next sample and
was verified twice. This run directly observed delayed effective-settings changes;
prior failure evidence is retained, not rewritten as a successful attempt.

Independent postflight passed: application tables, migration ledger, catalog/RLS/
grants, Storage metadata and all six logo hashes unchanged; no scheduled jobs.
Only the three tested auth.users records changed in permitted sign-in/update
timestamp fields. All immutable user data and identities remained unchanged,
zero Auth audit rows were added, and zero sessions/refresh tokens remained.
No Auth/audit rows were explicitly deleted by the runner. Original backup and
both failed-attempt journals/results remained hash-pinned and unchanged.

The runner and wrapper passed and verified INACTIVE. An independent read-only
inspection at **2026-10-06T07:21:54.4847118Z** confirmed INACTIVE, Auth disabled,
SMTP absent, zero Edge Functions and zero secrets. The new 20-file evidence
directory is explicitly current-user-only with inheritance disabled; its contents
were hash-checked unchanged after ACL hardening.

Evidence: `C:\protected\jwg-database-access-1b49534ec6d144368bceedfdcecaebfd\auth-service-ready-1791270788205`.
Result SHA-256: `e51aef77ada87c25ad8c154b620bf5ac60fe50187c6df73f3299386737d0c81f`.
After-baseline SHA-256: `16b952b43c81c7926c148ef44cc2161de68b912f464175f920fd1e8623b4be6a`.

Local verification: Node syntax, PowerShell parser and 22 recovery preparation,
Storage-plan, Auth-boundary/readiness tests passed. New one-shot helpers in the
workspace staging-readiness folder are Run-Recovery058AuthServiceReady.mjs and
Invoke-Recovery058AuthServiceReady.ps1; their exclusive attempt marker prohibits
replay. No application code, migrations, commit, push or deployment changed.

This closes the hosted original-password recovery acceptance gate for the
006–058 disposable restore. It does not certify production, physical Safari,
password-reset email, live delivery/scheduler/monitoring or cutover. The next
recommended release task is a scoped staging delivery/scheduler/monitoring
acceptance plan; any live sending or worker execution needs explicit approval.
No staging, production, retired project, older disposable or delivery provider
was contacted during this run. Historical incomplete entries below are superseded
only by the verified results above.

## Disposable Auth diagnostic — effective provider disabled, 6 October 2026

One separately approved diagnostic retry ran only on `xiqvkarqcvhbiexuzglo`.
The original failed attempt, baseline and result were hash-pinned and unchanged.
Read-only reconciliation before retry found no changed tables, added Auth audits,
sessions or refresh records. Password hashes/identities for all three accounts,
full database preflight, isolation and six logo hashes passed again.

After the management API accepted `external_email_enabled:true` and returned the
enabled setting with no other configuration change, the first Member password
request returned HTTP 422, `email_provider_disabled`, "Email logins are disabled".
Request ID: `01a10ff6-1d2f-74bf-a5af-e42f00e373ae`. This proves an effective
Auth-provider/configuration mismatch at request time, not an invalid-password
response. Configuration propagation delay is a hypothesis, not yet verified.
Admin/Super Admin login and all refresh/logout tests remain NOT RUN; no account passed.

The runner restored the disabled Auth baseline and independently reconciled data
after failure: no changed table fingerprints, no added audit rows, zero sessions
and refresh records, unchanged catalog, all six logo hashes matching and no jobs.
Failure postflight passed; historical success-only booleans in result.json remain
false because hosted acceptance did not pass, not because data drift was detected.
Evidence: `C:\protected\jwg-database-access-1b49534ec6d144368bceedfdcecaebfd\auth-diagnostic-1791268872141`.
Independent final inspection at 2026-10-06T06:48:57.2084782Z confirmed INACTIVE,
Auth disabled, SMTP absent, zero Edge Functions and zero secrets.

Prepared an offline-tested effective-service readiness guard using the documented
GET `/auth/v1/settings`: require signup disabled, no other enabled provider and two
email-enabled observations 15–60 seconds apart before any password grant. Thirteen
Auth guard/readiness tests pass. This pure helper has no network/configuration
effects and has not been live-tested or integrated into another authorized attempt.
Reference: https://raw.githubusercontent.com/supabase/auth/master/openapi.yaml
(public settings endpoint). A further readiness-gated test needs explicit approval;
retain distinct immutable journals and all prior evidence. No resets, imports,
Auth/audit-row deletions, messages, other-project contact, commits or deployment.

## Disposable Auth acceptance stopped safely — 6 October 2026

User explicitly approved original-password login/refresh/logout for restored
Member 0101, Admin 0002 and Super Admin 0001 on `xiqvkarqcvhbiexuzglo` only,
with no resets/messages and mandatory provider disablement/pause afterward.
New target-pinned helpers were prepared; 21 selected local tests passed. Offline
bcrypt comparisons proved all three protected passwords match the hash-pinned
006–058 backup. Live read-only account checks also confirmed all three passwords,
identities, roles, confirmation/active state and absence of MFA factors.

Stable database probes, the pinned full database verifier, no-job checks, baseline
capture and six logo hashes passed before temporarily enabling password login.
The first Member password-grant response was unsuccessful. No account passed;
Admin/Super Admin login, refresh/logout and independent post-Auth data reconciliation
were NOT reached. No password, profile or membership was explicitly modified.
Do not interpret incomplete postflight booleans as proof of detected data changes.

The original runner saved only "Password login failed", not the HTTP status or
machine-readable Auth error code. The cause remains unknown despite matching
password hashes; do not diagnose invalid credentials or provider timing without
evidence. Added bounded machine-code/status capture for future failed requests,
without raw bodies, passwords, emails or tokens; nine Auth guard tests passed.
This diagnostic change has NOT been live-retried. Exclusive attempt evidence is
preserved, and automatic retry remains prohibited.

Evidence:
`C:\protected\jwg-database-access-1b49534ec6d144368bceedfdcecaebfd\auth-acceptance-1791267985539`.
The runner restored the original disabled Auth configuration and verified pause.
Independent inspection at 2026-10-06T06:32:32.6792704Z confirmed INACTIVE,
Auth disabled, SMTP absent, zero Edge Functions and zero secrets. No other project
or delivery provider was contacted; no import, deployment, commit or push occurred.
Next: separately approve one diagnostic retry with a new immutable journal and
baseline reconciliation, preserving this failed attempt. Do not reset passwords,
clear Auth/audit rows or treat the prior DB/Storage success as hosted Auth success.

## New disposable 006–058 database and Storage restore verified — 6 October 2026

Execution approval followed the clean-target plan below. Created exactly one
new free Singapore disposable, `xiqvkarqcvhbiexuzglo`
(`js-recovery-058-20261006`); the older disposable and all source backups are
preserved. No staging, production, retired-project or delivery-provider requests
were made during this new-target recovery execution.

Auth providers, signup, hooks and notifications remain disabled, with no SMTP,
Edge Functions or Edge secrets. Initial metadata-preflight failures were retained;
a corrected direct TLS/read-only preflight established an empty compatible target.
The rollback rehearsal passed exact data equality for 70 tables/403 rows,
15 application catalog comparisons, six sequence values and the exact 006–058
ledger (53 versions). Independent before/after baseline hashes matched.

One hash-pinned persistent import was then committed and acknowledged. Its separate
verification passed the same data/catalog/ledger/security/sequence checks and
confirmed 18 managed catalog datasets unchanged. No automatic replay is allowed.
Protected evidence:
`C:\protected\jwg-database-access-1b49534ec6d144368bceedfdcecaebfd\persistent-restore-1791265513733`.
Source ciphertext and original failed/preflight/rehearsal evidence are preserved.
The database wrapper verified final INACTIVE at 2026-10-06T05:51:06.3265670Z;
Auth isolation remained verified. A separately guarded Storage phase may resume
only this same target and must independently pause it afterward.

The separate Storage phase completed: two buckets and six logos (3,412,943 bytes),
create-only uploads without overwrites, six private and six public hash matches,
six anonymous private-download denials, two empty/denied anonymous listings and
anonymous upload denied by RLS. Ownership, MIME/cache metadata, bucket restrictions
and unchanged Storage RLS passed. The empty private video bucket uses the explicitly
approved 50 MiB destination limit instead of the source 2 GiB; there was no video
object to test. No existing objects were overwritten or deleted.

Database lint passed for public using cached CLI 2.117.0, read-only database options
and warnings treated as failures. Telemetry/update checks were disabled and CLI
HTTP egress blocked. Read-only SQL role checks passed for the restored Member,
scoped Admin and Super Admin: directory field privacy, foreign-dojo progression
denial for Admin, anonymous denial and internal-function ACLs. These are SQL role
checks, not browser login or comprehensive mutation-workflow acceptance. Full
data/catalog/ledger/sequence verification passed again after Storage and role tests.

Storage evidence:
`C:\protected\jwg-database-access-1b49534ec6d144368bceedfdcecaebfd\storage-restore-1791266145211`.
The wrapper verified INACTIVE at 2026-10-06T06:04:03.0252874Z. A separate read-only
inspection at 2026-10-06T06:08:35.4911437Z independently confirmed INACTIVE,
Auth disabled, SMTP absent, zero Edge Functions and zero secrets. No passwords
were reset, Auth enabled or messages sent. Protected extracted plaintext remains
quarantined under current-user-only ACLs; originals and all evidence are preserved.

Thirty-five selected local guard/helper tests passed. Original-password
login/refresh/logout remains a separate explicitly authorized test on this new
target, and is NOT claimed complete. No deployment, commit or push was performed.

## Clean-target 006–058 restore plan prepared — 6 October 2026 (Sydney)

Prepared `recovery/RESTORE_058_PLAN.md` under planning approval. Reverified the
existing encrypted source locally via authenticated streaming decryption; exact
006–058/53-version metadata, 4,159 catalog objects and six Storage files remain
verified. No plaintext written. Twelve selected persistent-plan/Auth-guard unit
tests passed; these are helper tests, not a new hosted restore or Auth acceptance.

Recommended next execution target: one new empty free disposable in Singapore,
leaving the valid older `wtnonpldqvzipqmwgbru` restore paused and untouched. Free
capacity is unverified; stop if unavailable rather than deleting another project
or enabling billing. The old runner is pinned to 006–056 and is not reusable as-is.
The new plan requires source-derived 058 expectations, an exact new target binding,
reviewed rollback rehearsal, persisted verification, Storage acceptance and pause.
Execution approval is still required. No remote requests, project creation,
resumes, imports, deployments, commits or pushes were performed this planning turn.
Original-password recovery remains separately open; keep Auth disabled in the
proposed database/Storage phase. Prior evidence is preserved without relabelling.

## Disposable restored baseline reconciled — 6 October 2026 (Sydney)

With explicit approval, resumed only disposable `wtnonpldqvzipqmwgbru`, checked
its existing restored baseline using read-only transactions, and paused it again.
Final API state INACTIVE verified at 2026-10-05T18:46:58.723Z (6 October locally).
Auth providers/hooks/notifications remained disabled, signup disabled, recovery
site URL unchanged, no SMTP configuration, Edge Functions or Edge secrets.
No Auth settings were patched and no login/password operation was attempted.

All 103 table count/SHA-256 fingerprints and all 21 catalog sections match the
protected 4 October pre-Auth-attempt baseline. Independent before/after snapshots
also match byte-for-byte. Exact historical ledger remains 006–056 (51 versions),
with 57 Auth users, 57 identities, zero sessions/refresh tokens, two Storage
buckets and six object metadata records. No scheduled jobs, database webhooks,
subscriptions or foreign servers were found. Local independent verification
confirmed snapshot hashes, the sorted exact ledger and current-user-only ACLs
on all four new evidence files.

Protected evidence prefix:
`C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\baseline-20261006-449dbb7e-56f5-4a80-a10d-f7781255d41f`.
New workspace helpers: `staging-readiness/Inspect-RestoredBaseline-20261006.ps1`
and `staging-readiness/inspect-restored-baseline-20261006.mjs`. Run with PowerShell
7; the first Windows PowerShell launch failed locally compiling the credential
reader before any remote request. JavaScript and PowerShell syntax checks and
the 21-query read-only guard passed before the successful run.

No restore/import, schema or member-data writes, account changes, messages,
staging/production/retired-project/provider requests, or source-backup changes.
Storage bytes were not downloaded/rehashed in this baseline-only audit. This is
NOT new 006–058 restore acceptance or hosted password-login acceptance.

Next: separately approve a clean-target restore plan for the new 006–058 package.
The disposable already contains a valid older restore; do not import over it or
discard its data without explicit approval. Preserve all backups and prior
failed/successful evidence. Original-password recovery remains unresolved.

## Approved encrypted staging backup verified — 6 October 2026 (Sydney)

Created a new current-user-only protected package at
`C:\protected\jingwuguan-recovery-source-20261006-99bcd14c` from staging
eomubndonbetszdbhsrj only. Capture 2026-10-05T18:30:03.482Z; verification
2026-10-05T18:30:42.787Z (6 October locally). Exact 006–058 ledger: 53 versions;
repository migration fingerprint matches. Captured 4,159 schema-catalog objects,
57 Auth users/identities, 2 Storage buckets and 6 objects (3,412,943 bytes).
The database uses one shared read-only snapshot; role globals (no role passwords)
and Storage bytes are separate captures. Source ledger and Storage metadata were
unchanged at the end of capture. No source member/account records were modified.

AES-256-GCM encrypted archive is 7,635,456 bytes. Authenticated decryption,
payload SHA-256/size comparison and archive/dump listing passed. A separate local
streaming verification independently rechecked ciphertext and plaintext hashes,
GCM authentication and absence of plaintext, without writing decrypted material.
ACL checks passed on the directory and all four final files. Key is a separate
file in the same protected directory; this is access restriction, not off-device
key separation. Preserve the archive, key and encryption metadata together.

Ciphertext SHA-256:
`80fe758ac52908e209a80c2b96e9545f205f1d20ee905ed36c0f74ab51eec285`.
Payload SHA-256:
`0427de398e136c93931510795018875b74311fb1fcff9a75f4cf107064879a77`.
Detailed sanitized evidence is backup-verification.json in the protected directory.
Only this run's tracked plaintext was removed after successful verification;
previous backups and failed-attempt evidence were not changed or deleted.

No restore/import, project resume, account reset, outbound messages, scheduler
invocation, production/retired/disposable or delivery-provider contact. This is
source-backup integrity evidence, NOT restore acceptance. Hosted Auth configuration
and provider secrets were not captured; original-password recovery and managed
restore/Storage/Auth acceptance for this new package remain separate open gates.

## Full remote CI passed — verified 6 October 2026 (Sydney)

GitHub run 37301928136 completed SUCCESS for release commit
`bc481bf34e9d3160a3796c0c4b25d96402a29a49`. Independently read back all five jobs:
checks, Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS, all success.
This supersedes the pending-CI statements below, not the historical failed runs.
The checks job includes the approved expiring development audit policy, unchanged
strict production and uploader audits, lint, application tests/build and uploader
tests/build. The development exception is still active and is not a vulnerability
fix; its 19 October 2026 11:09:49 UTC expiry remains unchanged.

No deployment, account or database mutation was performed to verify CI. Staging
application remains the verified 8143a20 Preview; later commits are tests, policy,
documentation and the uploader build dependency. No new installer was released.
Automated macOS WebKit is not a physical Safari acceptance result.

Next recommended recovery step is an explicitly approved new encrypted read-only
source backup from staging eomubndonbetszdbhsrj for exact 006–058, preserving all
prior backups. No restore, disposable resume or password reset is authorized by
this checkpoint. Original-password restore acceptance, fresh managed recovery,
physical Safari, live delivery/scheduler/monitoring and production provisioning/
cutover evidence remain separate open gates. Production was not contacted.

## CI follow-up: uploader dependency corrected — 5 October 2026

Run 37301577626 passed the approved full audit policy, strict production audit,
lint, all 561 application tests, production build and uploader build/27 tests.
It then stopped on the separate uploader development dependency
http-cache-semantics@4.2.0 (GHSA-ch52-4w7c-c8xp); browser jobs were skipped.
Updated only that lockfile entry to compatible 4.3.0 (including registry URL and
integrity); no overrides, exception expansion or installation scripts. Uploader
strict full audit now reports zero vulnerabilities, and type-check/build/all
27 tests passed locally. No installed EXE was rebuilt or released. New remote CI
is required; prior failed run is preserved. No production/database/provider contact.

## Owner-approved temporary CI exception — 5 October 2026

User explicitly approved a 14-day development-only exception for
GHSA-vfj7-8cjw-p6xm. Implemented a fail-closed audit policy with exact advisory,
dependency chain, version, dev-only lockfile node and severity checks. It expires
2026-10-19 at 11:09:49 UTC. Other high/critical findings, audit errors, production
and desktop uploader audits remain blocking. No dependency downgrade or app/DB
change. Thirteen policy tests and the live policy/strict production audits passed.
Full local validation passed: ESLint, type-check, and 561 automated tests.
Remote CI completion is still pending; historical
failed CI below is not reclassified as success. See release/development-audit-exception.md.

## Directory and tier/assessment boundary — 5 October 2026 (staging deployed and accepted)

Supersedes the historical 057 stop gate below. User approved running the clarified
dojo-scoped tier-only change and updating staging. Migrations 057 and 058 were
applied together to staging eomubndonbetszdbhsrj after successful rollback rehearsals.
Exact applied ledger is 006–058 (53 entries). Existing v1 directory is unchanged.
Persisted rollback-contained acceptance passed: narrow organisation-wide directory,
role/disabled/deceased boundaries, own-dojo tier progression, foreign/null-dojo
denial, direct rank denial (including Super Admin), assessment rank promotion and
idempotency, and Admin undo limited to same-rank tiers. Internal assessment helpers
are not executable by API roles. Independent hashes of 13 business/audit/outbox
tables matched before and after; no test rows or test promotions persisted.

Strict read-only database verifier and all 12 protected-account role-security
checks passed. Staging database lint completed with no schema errors. Local
type-check, 548 automated tests, ESLint, isolated production
build and 232 WebKit/Chromium browser checks passed. Release commit 8143a20 is
deployed as READY Preview dpl_9SmayAxT3GgDyHLP68EGtssLSzcP; only
jingwuguanseibukan-staging.vercel.app was reassigned. All 11 host probes passed
and the public bundle binds only to the expected staging backend.

All 27 guarded live WebKit cases now have passing evidence: 24 passed initially;
three Member cases initially failed because the test counted Next.js's empty
route-announcer alert outside main as an error. After scoping the assertion to
directory errors inside main, all three passed on desktop/tablet/mobile (46.6s).
No application or role guard was weakened; the follow-up commit changes tests
and documentation only and does not require an application redeployment.

CI is NOT green: GitHub run 37299562571 stopped at the development dependency
audit (braces@3.0.3, GHSA-vfj7-8cjw-p6xm; no patched version listed).
Production dependency audit reports zero vulnerabilities. No audit bypass or
forced ESLint downgrade was performed. See release/staging-058-verification.md.

Release/recovery templates now require 006–058 and fingerprint
`a412432bedf7c95578e7ebfb83317987c1d4350d19121fe533007a1967b26ffd`.
Historical restore evidence remains historical; it does not prove the new chain.
No production/retired/disposable project or delivery-provider contact; no scheduler
or worker triggered. This milestone does not certify every legacy class-management
operation as dojo-scoped or declare production ready.

## Approved 057 preflight — 5 October 2026 (blocked before mutation)

User approved staging-only 057 and subsequent verified UI deployment. Existing
strict database verifier passed read-only; exact ledger remains 006–056 (51 rows),
057 and get_my_member_directory_v2 absent. No migration/deployment performed.

New dojo-only requirement fails live authorization-definition review: Admin 0002
has zero out-of-scope member-list rows, but can_manage_class returns true for
classes at three dojos outside their assigned management scope. Deployed
promote_membership and get_next_membership_promotion both use that class-only
guard, not target dojo; promotion routine is executable by authenticated users.
No unauthorized promotion was attempted; this is read-only helper and deployed
definition evidence. Current five admin assignments all include class and dojo.

Stop gate: prepare a separate dojo-authorization correction, including read/write
promotion and null-dojo boundaries, then obtain approval for that additional live
migration. Do not silently expand approved directory migration 057. Existing 057
approval remains recorded. No business data writes, production, other project or
delivery-provider contact. Evidence:
workspace staging-readiness/057-STAGING-PREFLIGHT-BLOCKER-2026-10-05.md.

## Organisation-wide compact member directory — 5 October 2026 (local, release blocked)

Latest requested four sections: Photo / Name / Classes enrolled with Dojo and
Rank / Instagram. One person per row, every enrolment together; namesakes are
not merged. Phone layout wraps under the name, desktop shows four columns.
Class and Dojo filters match the same enrolment; sorting supports Class then
Dojo, Dojo then Class, or Name. Changing Class clears the Dojo filter. Instagram
accepts only a validated handle and uses an HTTPS profile link (opening in the
installed app depends on device/link settings; browser fallback is supported).
No JS ID, contact, DOB, finance, attendance or management controls in this view.

New client calls only get_my_member_directory_v2, with fail-closed load/error/
retry handling. Draft supabase/pending/057_organisation_member_directory.sql
returns four top-level fields and three per enrolment. Groups by profile UUID
internally without returning it. Requires an authenticated active caller,
excludes deceased/inactive targets and inactive classes, includes existing
active/break membership statuses; no table grants, policies or writes changed.
Existing v1 and the active 006–056 migration/recovery contracts remain intact.

Do NOT deploy this UI until 057 is separately approved, moved into the ordered
migration chain, applied and accepted on staging. SQL has local source-level
checks only, not live execution/security evidence. See supabase/pending/README.md
for acceptance gates. No remote projects/providers contacted in this milestone.
Dojo-only Admin management remains separate and unverified: existing class-only
Admin assignments may grant broader scope; no claim of dojo-only enforcement.

Verification: type-check, 544 automated tests and lint passed initially. Isolated
production-mode build passed. Initial browser run: 224 passed, four failures in
the new sort test's exact-label locator. Fixed the test to use the accessible
combobox role/name. Final rerun: 228/228 browser cases passed (2.3m, no retries)
across Chromium mobile and WebKit desktop/tablet/mobile. Type-check, 544/544
automated tests, lint and diff-check passed again. Browser run reused the exact
unchanged isolated production build; phone/desktop screenshots visually checked.
Evidence is in workspace staging-readiness/member-directory-2026-10-05.md.

## Compact Member Lists and Member ID details — 5 October 2026 (local only)

Supersedes the earlier always-visible member-detail dropdown grid: the collapsed
list now shows small avatar, clickable JS Member ID, name/class, rank, dojo,
last training session, Promote Member button and current-status dropdown. Desktop
uses a horizontal row; phones wrap the same information without page overflow.
Member ID opens contacts (email, WhatsApp, phone, DOB), rank history, subscription
history and official-record controls, with other management sections still
available below. Promote opens the existing form, never submits automatically.
Break/Active/Inactive selection reuses existing handlers and inactive confirmation;
deceased rows cannot change status or promote. Closed details preserve drafts.

New MemberSubscriptionHistory reads existing membership_subscription_charges and
membership_payments through the authenticated client, explicitly scoped to the
selected membership and displayed charge IDs. Twelve charges per page, lazy
loading, cancellation guards and error/retry states; no financial mutations or
new schema. Live RLS/results for these queries have not been newly verified.
All 54 existing named Member Management functions compare unchanged to HEAD
(ignoring whitespace); layout and read-only history additions are separate.

Final verification: type-check and 539/539 automated tests, lint, diff check,
isolated production-mode build, and 208/208 local browser cases passed (2.2m,
no retries) across Chromium mobile and WebKit desktop/tablet/mobile. New tests
cover member-ID details, lazy scoped/paginated history, hidden content, promotion
opening without mutation, status cancellation/error/retry, deceased controls,
draft retention and axe accessibility. Initial 8 failures were a low-contrast
rank-history caption and fixture selectors/data shape, corrected before final
pass. Desktop/mobile screenshots visually inspected.

No commit, push, deployment, live database tests, migrations or provider contact.
Staging still serves the previous d9f253c release; staging approval and physical
iPhone review remain outstanding. Prior unrelated changes preserved.

## Promotion certificate layout — 5 October 2026 (local only)

Updated the shared GradeCertificatePage used by individual and bulk promotion
certificates. Printed details now contain exactly Member ID (JS ID), Promotion
Date and Certificate No., in that order. Removed the Discipline, Dojo, assessor
and Print Type detail rows and visible generator/timestamp footer. Preserved
the bold class heading below the organisation, logos, QR authenticity verification,
and existing Official Reprint notice. Authorized Signatory now identifies
Jingwuguan Seibukan Head. No stored audit fields, print-history logic, QR payload,
permissions, title-certificate template or database objects were changed.

Verification: type-check and 539/539 automated tests passed; lint and diff check
passed; isolated production-mode build and 100/100 desktop/mobile WebKit browser
cases passed (1.3m). Generated a synthetic, non-valid single-page A4 landscape
preview using the actual template; PDF text/order checks passed and final rendered
page visually inspected. PDF skill review prompted widening the QR caption to
avoid splitting its authenticity wording. Preview QR contains sample-only text,
not a live certificate link. Standard PDF file creation metadata remains; the
requested visible generation timestamp is removed.

Local only: no commit, push, deployment, live security tests, migrations or
production/provider contact. Existing compact UI and unrelated work preserved.

## Member-details clarification — 5 October 2026 (local only)

Refined Member Management per the user's clarification: Date Joined, Rank Now
and Last Training Session appear side by side in an always-visible overview.
Last Grading, Next Promotion, Promote Member and Official Records each have an
independent, initially closed disclosure. Other administrative details/actions
are also grouped into compact two-column disclosure buttons. These member
sections stay collapsed on desktop as well as mobile; print reveals content.
Existing role conditions, date calculations and mutation handlers are preserved.

Final verification: type-check, 538/538 automated tests, lint, diff whitespace check,
isolated production build and 200/200 local browser cases passed (2.1m, no retries).
The new layout test verifies the three-column overview, independent disclosure
state, hidden actions, draft preservation, print and accessibility. Training
today/correction/retry tests passed. Mobile screenshot inspected. An earlier run
was invalidated by source changes during execution; the final run rebuilt and
passed without bypassing the isolation/fingerprint guard.

No live tests, push, deployment, database or provider changes. Staging remains on
the previously verified d9f253c release. Approval and a fresh physical phone review
remain required before treating this UI as accepted on staging.

## Compact UI across all roles — 5 October 2026 (local, not deployed)

User requested smaller dropdown-style layouts across Member, Admin and Super
Admin screens. Added shared responsive density to the authenticated shell and
46 expandable record/tool groups across 29 pages. Mobile/tablet summaries reveal
details and actions on demand; desktop and print retain expanded content. Bulk
assessment candidates start expanded to preserve the all-candidates workflow.
Controls retain 44px minimum touch height and text inputs use 16px text.
Collapsing preserves mounted draft fields; invalid hidden fields reopen/focus.
Public authentication, certificate PDFs, APIs, financial logic, database objects
and provider configuration were not changed by this UI work.

Final local verification: type-check and 538/538 automated tests passed; lint
passed; isolated production-mode build and 196/196 browser cases passed across
Chromium mobile and WebKit desktop/tablet/mobile (2.0m, no retries). Representative
dashboard screenshots were inspected. Earlier runs exposed dashboard contrast
and settlement locator/reload handling issues, corrected before the final pass.
Browser fixtures use synthetic data; these are not live role-security results.
Staging still serves d9f253c; this UI is uncommitted
and not deployed. No live staging acceptance result is claimed for these edits.
Next gate: approve staging release, then guarded role/browser checks and a fresh
physical iPhone review. Existing unrelated documentation and Supabase .temp edits
were preserved. No production, retired/disposable project or provider contact.

Additional physical feedback for the previous d9f253c release: the user replied
"it work" after the requested Admin 0002 scoped-access/logout check. This is a
narrow user-reported confirmation, not independently captured evidence and not
physical acceptance of the new compact UI. Super Admin and other-device checks
remain open.

## Mobile sign-out correction — 5 October 2026

Final verification: `d9f253cca54e243b8bfcb8691701c3806046930d` is the Ready staging
Preview `dpl_AUrAektGYfrcs7hgg72tm8qY4QCe`, independently mapped to staging only.
First live run (fc5463a) was 26/27: Super Admin desktop Sign out was obstructed by
page content. Fixed desktop header stacking and added positioned-content fixture.
Final rerun: **27/27 guarded live WebKit cases passed, 5.0m, zero retries**;
Member/Admin/Super Admin logout and subsequent protected-page denial passed at
desktop/tablet/mobile. 11 host probes and public staging binding passed again.
Local final build/typecheck/538 tests/lint and 84 browser cases passed. On 5 October
the user replied "correct, next" to the requested iPhone Member logout/direct
/profile retest: narrow user-reported confirmation recorded, not independent
device evidence or a full Safari pass. Physical Admin/Super Admin and other-device
checks remain open; production readiness is not inferred. Prior entries
below record the first deployment phase, superseded by this final result.

- Physical iPhone report (user: iPhone 17, iOS 26.6) exposed a real missing mobile
  Sign out control; prior automated checks did not cover it. Physical logout
  finding was subsequently fixed and the narrow retest user-confirmed above.
- Fix `fc5463aeeffbf8f91e571a3afaabdbcd472df318` committed/pushed on the release
  branch: shared local-session sign-out handler, visible mobile footer button,
  safe-area padding, retry feedback, focus and duplicate-request coverage.
- Type-check plus 538 tests, lint, isolated production build and 84 local
  desktop/mobile WebKit tests passed. Initial harness failures were corrected
  before the final pass; no application test bypass.
- Staging Preview `dpl_GA8yvhbhGERbGVCA3CdJgyYJYgUQ` verified READY and exact-SHA;
  only staging hostname reassigned and independently read back. 11 host probes
  and public staging-backend binding passed. Final result recorded above.
- Existing unrelated edits preserved. No production contact, delivery,
  scheduler activation, database migration or account change.

Checkpoint date: 04/10/2026

## Staging scheduler deployed and corrected — 4 October 2026

- Supersedes the preparation-only status below. Workspace operations scaffold is
  deployed to Cloudflare account `744af58c89b6051b68a0ef118eae6281` as
  `jingwuguan-staging-email-scheduler`; not copied into the app release branch.
- Local workerd testing found `redirect: 'error'` unsupported. Fixed to manual
  redirects with explicit 3xx rejection; 20 core and 7 local runtime/config tests
  passed. Real local SQLite verifies overlap exclusion and durable failure/duplicate
  state across runtime restart. Fake HTTP only; no live delivery claim.
- Corrected build deployed and independently read back at 2026-10-04T11:12:08Z:
  version `d1587e88-a448-4c82-8cac-b293797f0c23`, deployment
  `a48635ae-abae-48f7-ab5e-5549f9bb50ec`. ENABLED=false, staging ref exact,
  zero cron triggers, workers.dev and preview URLs off. Both approved secret_text
  bindings retained: EMAIL_WORKER_SECRET and HEALTHCHECKS_PING_URL.
- Dedicated Healthchecks check previously verified paused; not pinged or changed.
  No worker invocation, email, alert, application/database request, production,
  retired-project or disposable contact in this deployment step. Token expiry and
  permissions unchanged. Prior deployment evidence preserved before replacement.
- Evidence in workspace `staging-readiness/email-scheduler/`:
  `deployed-disabled-evidence.json`, `runtime-tests.tap`, provisioning checkpoint.
  Read-only verification no longer labels current local hashes as deployed code.
- Remaining gates: guarded live email/memorial/provider and monitoring acceptance,
  actual scheduler cadence/alert receipt, original-password recovery acceptance,
  physical Safari (deferred, not passed), exact production target/secrets and
  authorized setup/cutover/rollback evidence. Local HEAD verified `7471c44`;
  existing unrelated dirty changes preserved. No app commit/push or production work.

## Disabled staging scheduler scaffold — 4 October 2026

- Selected Cloudflare Workers Free + Healthchecks.io Free. Prepared local files in
  `C:\Users\hioec\Documents\Codex\2026-08-30\files-pasted-by-the-user-you\staging-readiness\email-scheduler`.
  Not yet copied into this release, bundled, deployed or enabled; no provider writes.
- Configuration has no cron triggers, ENABLED=false and public endpoints disabled.
  Exact staging-only target, persistent single-flight lock, duplicate-slot guard,
  no automatic retries, bounded requests, sanitized history and validated heartbeat.
  Unhealthy/uncertain execution latches the lock for operator reconciliation.
- 20 new offline tests passed (mock HTTP/in-memory transactional storage). These
  do not verify live Cloudflare behavior, provider quotas, delivery or alert receipt.
  Existing worker/scheduler/monitoring suites also rerun: 25/25 passed; total 45/45.
  Scheduler syntax and checkpoint/progress diff checks passed (line-ending warnings).
- Activation/runbook prepared; provider resources, secret upload, guarded worker
  invocation, notification tests and recurring activation require separate approval.
  Existing scheduler/monitoring acceptance gates remain unfulfilled.

## Read-only staging email/scheduler/monitoring audit — 4 October 2026

- User approved staging-only read-only audit; completed through exact project-bound
  session pooler with verify-full TLS and default/explicit read-only transactions.
  No worker/job/RPC invocation, sends, settings changes, disposable resume or other
  project/provider contact. Protected evidence: `staging-email-audit-1791106030328`
  under the existing private recovery directory (2026-10-04T09:27:22.453Z).
- Version inventory exactly 006–056; no pg_cron/pg_net/http extension or cron tables.
  No database scheduler configured. An external scheduler may exist; not verified.
- Queue aggregates: one historical sent row, latest attempt 20 August 2026; zero
  queued/due/overdue/stuck/exhausted and duplicate dedupe keys. Outbox RLS enabled.
  Internal worker/health RPCs deny browser roles and permit service_role. Application
  queue_event_email retains authenticated access; its scope semantics not rerun here.
- Local secret shape/presence checks passed, not deployed env/provider validity.
  Initial overstrict Resend regex result superseded by protected correction using
  the existing repository rule; no secret changed or exposed. All 25 focused local
  worker runtime/scheduler/monitoring tests passed.
- Full sanitized findings: workspace `staging-readiness/STAGING_EMAIL_AUDIT_2026-10-04.md`.
  External job identity/cadence, monitoring configuration/owners/alert delivery,
  deployed secrets and delivery remain unverified. No completed relevant evidence
  found in the top-level protected filename check; not an exhaustive inventory.
  Next needs external scheduler/monitoring service identification, not an automatic
  worker invocation. Even an empty queue worker can create memorial announcements.

## Full local regression passed; physical Safari deferred by user

- User explicitly said "skip, next" in response to physical Safari coverage.
  Recorded physical Safari testing as deferred for now, NOT passed and not a
  production support-policy waiver. Existing release gate and device requirements
  remain unchanged. Original-password recovery remains separately unresolved.
- Fresh `npm test` passed TypeScript and all 537 local application/guard tests
  (0 failures, 0 skipped). This is synthetic/unit regression evidence, not live
  delivery, physical-device, password-recovery or production acceptance.
- No database/project resume, password reset, staging/provider/production contact,
  commit, push or deployment occurred. No build or browser rerun is claimed.
  Existing application code, migrations and unrelated local changes preserved.
- Reviewed the existing CI synthetic-build and release evidence requirements.
  Remaining execution work includes actual provider delivery/scheduler/monitoring,
  completed recovery/Auth and rollback evidence, exact production target/secrets,
  identity and authorized cutover. These require scoped authorization and/or
  operator evidence; do not mark them complete from passing offline fixtures.

## Local release recheck — 4 October 2026

- Continued safe offline work without interpreting the user's "next" as approval
  to waive original-password recovery, reset accounts, resume the disposable or
  contact staging/production. Password recovery remains unresolved, not passed or
  formally deferred. Last verified disposable state remains INACTIVE/Auth disabled.
- Local HEAD remains `7471c44` (web-first release scope). Existing checkpoint,
  recovery README and nine Supabase temporary metadata changes were preserved.
  No fetch, push, deployment, secret read or live environment contact this step.
- Fresh checks passed: `npm run typecheck`, `npm run lint`, 34 release-window and
  evidence-packet tests, 8 physical-Safari validator tests, and `git diff --check`.
  Git reported line-ending normalization warnings only. No production build,
  complete application test suite, browser session or live CI rerun is claimed.
- Prepared workspace `staging-readiness/PHYSICAL_SAFARI_HANDOFF.md` from existing
  physical-device requirements: exact deployed identity, private test credentials,
  Mac/iPhone/iPad read-only role checks and manual accessibility. All are NOT RUN.
  Needs explicit staging access approval and available physical devices; do not
  treat mocked validator tests or automated WebKit as device acceptance.

## Latest corrected Auth attempt — protected password validation blocked

- Corrected disposable-only retry passed three stability probes, the pinned full
  database preflight, no-job check and fresh baseline capture: 103 tables,
  21 catalog sections, 57 Auth users/identities, zero sessions/refresh tokens.
- Corrected identity SQL ran past the former profiles.role defect. Execution then
  stopped at the password-hash guard with `Protected password differs from restored
  hash`. This combined guard checks supported bcrypt hash format and password match;
  no per-account diagnostic was retained. Do not guess which account failed or
  claim all three credentials were checked. Backup-era credentials may differ
  from current saved credentials; this explanation has not been independently proven.
- No password login, refresh or logout acceptance completed; Auth was never enabled.
  Protected test values were read into memory, never logged or changed. No resets,
  account creation or application mutations were attempted. No other project or
  delivery provider was contacted. Backup and prior failed evidence preserved.
- Result at 2026-10-04T02:06:19.107Z verified Auth disabled and target INACTIVE;
  a subsequent target-only management read independently reconfirmed INACTIVE.
  Evidence: `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acceptance-1791079240657\result.json`.
  Zero accounts passed. False final verification flags mean incomplete acceptance,
  not a finding that the database or Storage changed.
- Hosted Auth recovery remains OPEN. Need backup-era test credentials stored
  securely, or an explicit decision to defer password recovery acceptance. Resetting
  disposable passwords would require separate approval and would test new-password
  login only, not preservation of the original backed-up passwords. Do not silently
  substitute magic links, reset accounts, or resume for another identical retry.

## Latest approved retry — preflight passed; verifier query corrected offline

- Resumed only disposable `wtnonpldqvzipqmwgbru` for the approved single retry.
  Three separated health/database probes passed with stable postmaster start time.
  The pinned full database verification completed successfully, no scheduled jobs
  were found, and fresh baseline capture completed: 103 tables, 21 catalog sections,
  57 Auth users and identities, zero sessions and refresh tokens.
- The next read-only account query failed before any Auth enablement or login.
  Local inspection identified a definite runner defect: it referenced profiles.role,
  absent from the captured schema. The old secret-query branch suppressed raw SQL
  errors, so the server diagnostic was not retained. No credential mismatch was
  established; the account/password check did not complete. The six protected test
  values had been loaded into memory at this stage, not logged or changed.
- Corrected the runner to derive role from profiles.is_super_admin, active dojo
  assignments and active/Break admin memberships, matching existing role sources.
  Added a required-column guard before loading test values and safe SQLSTATE-only
  failure capture for secret queries. The corrected schema guard passes against
  the captured baseline offline. All 29 helper tests and Node syntax check pass.
  No database/app schema change, password reset, or unapproved live retry occurred.
- Auth remained disabled; target INACTIVE independently confirmed by the wrapper
  after runner quarantine at 2026-10-04T01:52:55.059Z. Evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acceptance-1791078451683`.
  Accounts passed: 0. Overall false acceptance fields mean incomplete verification,
  not observed data corruption. Preserve this and all earlier/source evidence.
- Hosted login/refresh/logout remains OPEN. The single retry authorization is used;
  next requires a corrected disposable-only retry with the same disable-and-pause
  cleanup. No other project or delivery provider was contacted.

## Latest Auth recovery — ACL repaired, database preflight interrupted

- Approved exact-file ACL repair completed: `C:\protected\jingwuguan-staging.env`
  is now owned by VIN\hioec with inheritance disabled and one owner-only full-control
  rule. Its content hash matched before/after and on independent verification.
  Elevated helper exited nonzero because its new evidence file was administrator-
  owned; normalized only that generated evidence owner and verified its private ACL.
  Evidence: `staging-env-acl-restriction-1791077635775.json` in the protected
  recovery directory. The original credential values were not changed.
- Resumed only `wtnonpldqvzipqmwgbru`; management status reached ACTIVE_HEALTHY.
  Auth/worker/SMTP isolation checks passed. The subsequent SQL preflight connection
  was terminated during data-equality.sql line 145 with `terminating connection due
  to administrator command`, followed by unexpected SSL closure. No completed
  preflight success or data-mismatch assertion was observed. Cause is unverified;
  do not label it a proven platform restart or failed restore.
- The runner stopped before reading SECURITY_TEST values or enabling Auth. Zero
  login/refresh/logout account tests ran. Auth disabled and INACTIVE quarantine
  were verified at 2026-10-04T01:40:01.658Z, with independent wrapper confirmation.
  Protected result: `auth-acceptance-1791077907900/result.json` under the existing
  protected recovery directory. Failed SQL evidence and all source evidence remain.
  Result flags for data/hash acceptance being false mean NOT VERIFIED this attempt,
  not evidence that the stored data or logos changed.
- Added three separated exact-target health/database probes with stable postmaster
  start time before a future preflight; failures still stop rather than retry.
  All 27 local helper tests and Node syntax check pass. This guard is locally tested
  only and cannot guarantee backend uptime. No retry/resume after quarantine yet.
- Hosted Auth recovery remains OPEN. Next: approve one disposable-only resume and
  guarded retry after stability checks, then disable Auth and pause again. No other
  project, retired/production system or delivery provider was contacted.

## Earlier Auth recovery attempt — blocked locally, disposable paused

- User approved password login/refresh/logout for the three restored test accounts
  on disposable `wtnonpldqvzipqmwgbru`, temporary password-provider enablement,
  disabled-Auth restoration and project pause. Prepared separate exact-target
  runner/wrapper; staging security tooling was not retargeted or run.
- Invocation stopped at the local owner-only ACL guard before the Node runner
  started: `C:\protected\jingwuguan-staging.env` is owned by CodexSandboxOnline
  and has broader group access, including Users and Authenticated Users. No test
  passwords were read, Auth was not enabled, and no login/refresh/logout requests
  were sent. No passwords, file permissions or application records were changed.
- Separate target-only quarantine confirmed Auth providers/hooks disabled and
  project INACTIVE at 2026-10-04T00:47:33.7623581Z. Evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\auth-acl-stop-quarantine-1791074853766.json`.
  Its `credentialsRead:false` refers to test-account credentials; the existing
  management credential was used for the approved quarantine only.
- All 25 local recovery helper tests pass; Node and runner-wrapper syntax checked.
  These do not verify live Auth acceptance or the new runner's runtime behavior.
  Earlier database/Storage recovery success remains valid. Hosted Auth acceptance
  is OPEN. No staging, production, retired project or delivery provider contacted.
- Next needs approval to restrict that exact env file's owner/access to the user
  without changing values, then resume this disposable and run the approved tests,
  disable Auth and pause again. Do not relax the ACL guard or reset any passwords.

## Hosted Auth recovery preparation — 4 October 2026

- Prepared a disposable-only password-login/refresh/local-logout acceptance plan
  for restored Member 0101, Admin 0002 and Super Admin 0001. Existing staging
  security tooling is staging-pinned and uses magic links; it was not retargeted
  or run, and cannot prove restored password-hash recovery.
- Added pure request/isolation/approval guards and four local Auth guard tests.
  All 25 local recovery helper tests passed across six test files. This is local
  preparation evidence only: no executable live Auth runner has been completed,
  no remote project was contacted, no credentials were read, and no provider or
  account settings were changed during this preparation.
- Plan and helpers: workspace `staging-readiness/AUTH_RECOVERY_ACCEPTANCE_PLAN.md`
  and `recovery-auth-guard.mjs` / `recovery-auth-guard.test.mjs`.
- Live acceptance remains OPEN. Requires explicit approval to temporarily enable
  password login on `wtnonpldqvzipqmwgbru` only, read the six protected test-account
  email/password values, verify the restored identities/hashes, test login,
  refresh and local logout, restore disabled Auth, then pause the disposable.
  Signup, other providers, hooks and delivery remain disabled. No password reset,
  user creation, direct Auth-row cleanup or contact with other projects is allowed.
  Expected Auth timestamps/audit/session deltas must be reported, not called
  zero residue. Existing access JWTs may survive logout until expiry.

## Latest Storage recovery — 4 October 2026

### Approved continuation PASSED

- Resumed only disposable `wtnonpldqvzipqmwgbru` and independently reconciled
  exactly one empty private class-logos bucket; no objects or unexpected policies.
  Reused that bucket without recreating it. Created the empty private video bucket
  with the expressly approved 52,428,800-byte limit (source: 2,147,483,648 bytes).
  Source backup/plan metadata was not modified; this deviation is disposable-only.
- Restored exactly six logo files, 3,412,943 bytes, with upsert disabled. Verified
  all six downloaded byte counts/SHA-256 hashes while private and again through
  public URLs after making only class-logos public. No existing files overwritten.
- Anonymous downloads of all six existing objects were denied while private.
  Anonymous listing returned empty or denied for both buckets, and the guarded
  no-upsert insert probe was denied by authorization/RLS. Bucket privacy, limits,
  MIME restrictions, null ownership, object MIME/cache metadata and unchanged RLS
  were verified. No policies were created or broadened. The source video bucket
  is empty; protection of an existing video object was not tested or claimed.
- Fresh preflight and independent postflight database verification PASSED:
  copied data, catalog, ledger, sequence, managed-object and security assertions.
  Final target status ACTIVE_HEALTHY and isolation verified: Auth providers/hooks
  disabled, no Edge Functions/secrets or delivery workers. Failure pause was not
  needed on this successful continuation. No other project/database/provider was
  contacted; no application deployment, commit or push occurred.
- Verified result recorded at 2026-10-03T23:36:06.677Z (4 October in Sydney):
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-restore-1791070301947\result.json`.
  Access results and independent SQL evidence are retained beside it. Original
  failed-attempt journal is unchanged; the approved continuation has a separate
  write-once attempt-02 journal. Original encrypted backup fingerprint matched.
- All 21 local helper tests passed, including immutable target-only limit
  adjustment and strict partial-state rejection. Full hosted Auth login/refresh/
  logout recovery acceptance remains OPEN; no account/password/provider changes
  or successful Auth login are implied by this Storage success. Earlier failed
  attempt notes below are historical and superseded by this approved continuation.

### Live attempt stopped; disposable target confirmed paused

- Ran the approved no-overwrite Storage recovery against disposable
  `wtnonpldqvzipqmwgbru` only. Fresh full database verification PASSED before
  Storage changes, including copied data, catalog, ledger and security assertions.
  Auth isolation preflight passed; providers/hooks were not enabled.
- `class-logos` was created PRIVATE. The next bucket creation failed before the
  upload loop; no logo files were uploaded. Creation of the video bucket was not
  acknowledged and must be reconciled after any separately approved resume.
  No existing files were overwritten and no delete/cleanup was attempted.
- Failure handling paused the disposable project. Independent management
  inventory subsequently confirmed INACTIVE. No production/staging/retired
  database or delivery provider was contacted.
- Read-only management configuration shows a 52,428,800-byte global file-size
  limit; the source empty video bucket specifies 2,147,483,648 bytes. This is an
  incompatible restore setting. The first runner did not retain the exact failed
  HTTP response, so that response's status/body is not claimed as verified.
- Protected evidence and exclusive attempt journal are retained:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-restore-1791069349580`.
  Added local preflight size-limit validation and protected HTTP diagnostics for
  future attempts; five Storage helper tests pass. No retry was run.
- Next needs a decision/approval: resume this disposable project, read-only
  reconcile partial Storage state, then either use an explicitly documented
  50 MiB limit on its empty video bucket or defer that bucket. Do not silently
  alter source metadata, upgrade billing, bypass the journal or overwrite objects.
  Storage live hash/access/postflight acceptance remains OPEN.

- Offline Storage preparation PASSED: authenticated source/archive hashes and
  all six file SHA-256 hashes verified; total 3,412,943 bytes. Manifest identities
  and metadata match the selected dump's Storage records. No network contact,
  upload, bucket creation, Auth change or database mutation occurred this step.
- Source layout: public `class-logos` contains all six files; private
  `repository-video-originals` is empty with a 2 GiB limit and captured video MIME
  allowlist. No object/bucket owners or Storage policies are recorded. The restore
  must preserve these facts rather than invent grants, owners or MIME restrictions.
- Corrected the offline pg_restore selection to use a separate Storage schema
  filter and strict unqualified table names. The earlier selection produced no
  COPY blocks and stopped safely. Four Storage helper tests pass.
- Protected verified plan:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\storage-preparation-1791068719153\storage-plan.json`.
  Original encrypted evidence and failed-preparation scratch remain preserved;
  extracted plaintext is retained under owner-only protected ACLs.
- Hosted upload/download and Auth recovery acceptance remain OPEN. Prepared a
  target-only execution plan: create private initially, upload without overwrite,
  hash-check, then restore public access only for class-logos. Do not enable Auth
  providers or send delivery messages as part of the Storage operation.

## Latest recovery preflight — 3 October 2026

### Corrected persistent disposable restore PASSED

- Executed exactly one separately approved corrected attempt on disposable
  `wtnonpldqvzipqmwgbru`. Fresh read-only reconciliation first matched the empty
  baseline. A separate write-once `persistent-restore-attempt-02.json` records
  this attempt; the original failed-attempt journal remains unchanged.
- Import exited 0, all transaction assertions passed, and COMMIT was acknowledged.
  A fresh database connection independently verified all 383 copied rows across
  70 tables, 15 application catalog comparisons, exact 51-row migration ledger
  006–056, all six sequence values, Auth triggers/default privileges and the
  repository database-security assertions. This is a verified persistent database
  restore, not only a rollback rehearsal.
- All 18 managed catalog datasets (excluding the intended application changes),
  six Auth constraints, 19 Auth indexes and unrelated authenticator settings
  matched the preserved target baseline. No cron.job, subscriptions, foreign
  servers, Storage buckets or Storage objects were introduced.
- Final platform isolation verification PASSED at 2026-10-03T10:52:48Z:
  Auth providers/hooks remain disabled; zero Edge Functions/secrets. The runner
  completed with exit 0, so failure quarantine was not invoked. Target remains
  active and isolated; it is NOT a production project.
- Protected success evidence:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\persistent-restore-1791024441642\result.json`
  with `commit-outcome.json`, independent verification SQL/output, and a separate
  protected platform-postflight record. The original encrypted backup SHA-256
  still matches its recorded fingerprint; failed-attempt evidence is retained.
- Local validation: 14 helper tests pass, including literal SQL insertion and
  corrected-attempt target/outcome/freshness guards; Node syntax and PowerShell
  parsing pass. No production, staging or retired database, or external delivery
  provider, was contacted. No application deployment, commit or push occurred.
- Remaining recovery work: Storage-byte restoration and hosted Auth/Storage API
  acceptance. Neither is claimed complete by this database-only result. Earlier
  failure/quarantine and rollback-only notes below are historical milestones.

### Approved resume and read-only reconciliation PASSED

- Resumed only disposable `wtnonpldqvzipqmwgbru`; management inventory confirmed
  ACTIVE_HEALTHY. No import was retried, and the existing attempt journal is
  byte-for-byte unchanged. The target remains active with isolation intact.
- A fresh client-TLS-verified, repeatable-read READ ONLY transaction compared
  all 18 catalog datasets and the complete saved Auth/session/Storage counts,
  ledger-schema absence, Auth triggers and authenticator role settings. Its
  fingerprint exactly matches the pre-import baseline:
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
  Independent zero-residue reconciliation PASSED; no changed catalog sections.
- Also matched the saved Auth constraints/indexes; confirmed zero public tables,
  Auth users/identities/sessions/refresh tokens and Storage buckets/objects, no
  application ledger, cron.job, subscriptions or foreign servers.
- Auth signup/providers/hooks remain disabled, with zero Edge Functions/secrets,
  verified before and after database reconciliation. Initial isolation checks
  stopped before database access because the local PowerShell helper counted an
  empty API array as a pipeline item. Assigning responses before counting fixed
  that false positive; no remote settings were changed.
- Protected results:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\read-only-reconciliation-1791021907586\result.json`.
  Source evidence and failed-attempt journal are preserved. No staging, retired
  or production database, or outbound delivery provider, was contacted.
- This closes reconciliation of the failed attempt only. A new persistent import
  is NOT authorized by this read-only approval and was NOT performed. Persistent
  restore and hosted Auth/Storage recovery acceptance remain open.

### Persistent attempt stopped; disposable target quarantined

- The first persistent attempt stopped with a SQL syntax error before the
  transaction-assertions marker or commit acknowledgement (psql exit 3).
  Independent verification also failed on a missing relation. This is NOT a
  successful persistent restore or a fresh complete zero-residue verification.
- Protected attempt evidence remains in
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\persistent-restore-1791019323683`.
  The exclusive attempt journal and encrypted source evidence were retained;
  no automatic retry or journal removal occurred.
- The guard requested quarantine. A subsequent read-only management inventory
  confirmed disposable `wtnonpldqvzipqmwgbru` is INACTIVE. Staging remains
  ACTIVE_HEALTHY and the retired project remains INACTIVE; their databases were
  not contacted. No production/provider operation occurred.
- Root cause: String.replace interpreted a dollar-sign replacement token in a
  captured Auth index definition, corrupting the generated assertion SQL.
  Workspace recovery tooling now inserts checks via a literal callback and
  rejects missing/duplicate markers. All 12 local helper tests pass, including
  replacement-token regressions for both commit and verification SQL. Node
  syntax checking also passes. The fixed generator has NOT been run remotely.
- Next requires approval to resume only this quarantined disposable project and
  perform read-only full-baseline reconciliation. Do not replay the import or
  bypass the existing attempt journal. Persistent restore, Storage-byte recovery
  and hosted Auth/Storage acceptance remain open. Prior rollback results below
  are historical successes, not evidence that this persistent attempt passed.

### Rollback-only managed restore passed

- Expanded data-integrity follow-up also PASSED: exact semantic equality for all
  383 copied rows across the exact 70-table set (67 public tables, auth.users,
  auth.identities and the migration ledger). Expected rows were loaded into
  pg_temp-qualified tables without triggers/defaults; both directions used
  EXCEPT ALL, preserving duplicate-row sensitivity. Only copied columns were
  compared; this is semantic SQL/JSONB equality, not byte-for-byte serialization.
  No row values were exposed in console output.
- Expanded protected result:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\rollback-rehearsal-1791018511840\result.json`.
  All 15 catalog comparisons, six sequence-value checks, exact ledger, Auth
  triggers/default ACLs and security assertions passed again. The independent
  before/after fingerprint remained
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
  No import was committed and temporary expected tables disappeared on rollback.
- Eight local helper tests pass: malformed/duplicate/unexpected COPY tables and
  columns, quoted reserved columns, escapes, nulls, duplicate rows, empty tables,
  terminators and TOC descriptor handling. Initial quoted-column parser rejection
  occurred during offline preparation before any database attempt. Persistent
  restore needs its own post-commit reconciliation path, fresh isolation checks,
  Storage bytes and hosted API acceptance; do not merely replace ROLLBACK with
  COMMIT in this runner. These remaining gates are not claimed complete.

- The selected staging backup was loaded inside one transaction on disposable
  `wtnonpldqvzipqmwgbru`, verified, then rolled back. This is an executed rehearsal,
  not a persistent restore. Staging, production and the paused old database were
  not contacted. Auth providers/hooks stayed disabled; no outbound provider ran.
- Passed 15 application catalog comparisons, exact 51-row migration ledger
  006–056, all six sequence values, 57 Auth users and identities, the three custom
  Auth triggers, final default ACLs and the repository database-security verifier.
  An independent connection compared all 18 catalog datasets, Auth/session and
  Storage counts, Auth triggers and authenticator settings before/after rollback.
  The hashes match exactly:
  `566c81dda74befb0ed2f37728dc1f2c87e728af3a966207ea5fa6912ae263e94`.
- Successful protected evidence directory:
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\rollback-rehearsal-1791016739453`.
  Final public table/Auth user/identity counts are zero; application ledger absent.
- Earlier bounded attempts timed out or stopped on comparison errors and independently
  verified the same zero-residue baseline. Schema-only batching fixed round-trip
  latency without changing statement order or accepting failed assertions.
- Two owner-only sequences required four explicit SELECT/UPDATE grants to postgres
  to match the source catalog; no browser/service role access was broadened. Six
  bigint sequence maximums in the source JSON were rounded by JavaScript numeric
  serialization; exact 9223372036854775807 limits were independently verified from
  the authenticated SQL dump's bigint/NO MAXVALUE definitions. Original encrypted
  backup/catalog evidence was preserved. Future catalog export should preserve
  int8 values losslessly; the bounded correction is disclosed in rehearsal results.
- At the initial rehearsal, per-table data equality remained open; the expanded
  follow-up above closes that rehearsal check. Persistent managed restore, Storage
  bytes and Auth/Storage API recovery acceptance remain OPEN. No production readiness gate
  is closed solely by this rollback rehearsal. Helpers remain local; no push or
  deployment occurred.

### Selective SQL and connection follow-up

- Read-only management metadata and a client probe target only disposable
  `wtnonpldqvzipqmwgbru`. The API-provided Singapore transaction-pooler endpoint
  was verified without guessing a connection host. The client connects with
  `sslmode=verify-full` and explicit psql TLS evidence. Its observed pooler-to-DB
  `pg_stat_ssl` value is false; this is recorded separately, not misrepresented as
  end-to-end TLS. The probe uses an explicit read-only transaction.
- The empty baseline remains zero public tables, Auth users/identities and Storage
  objects. The recovery role can create public objects and insert Auth users and
  identities; required `extensions.digest(bytea,text)` and
  `extensions.gen_random_bytes(integer)` functions exist and are executable.
- Source/target Auth column names, types and generated flags match exactly for
  35 users columns and nine identities columns. Six target Auth constraints and
  19 indexes were captured for subsequent comparison; matching columns alone is
  not full Auth compatibility or login proof.
- Generated a protected offline schema-only proposal containing 1,240 entries;
  three platform-owned public default ACL entries are excluded for comparison
  rather than overwrite. SQL SHA-256:
  `a9a185850f52cbe28a4f3cda91302303bb55149f7a8581aa6028c7a2399ac734`.
  Static egress-pattern scanning found no flagged objects, but is not a complete
  executable-SQL safety audit. No restore SQL has been executed.
- Parallel repository review identified migration 047's separate authenticator
  `pgrst.db_pre_request=public.enforce_active_account_request` setting. A public
  schema restore alone omits it. Exact role-setting restoration/readback, sequence
  state, current grants, Auth triggers and platform-owned objects must be accounted
  for before managed acceptance. Global roles must not be imported wholesale.
- Recovery API tests must remain target-only: restored avatar URLs can still point
  to staging. Do not open a restored UI or rewrite source facts to conceal this.
- Four classifier regression tests and the SQL-preparation JavaScript syntax check
  pass. Helpers and protected evidence are local; no commit, deployment,
  production/retired access, staging mutation or provider call occurred. Managed
  import and acceptance remain open; freshly recheck isolation before import.

- The disposable Singapore recovery project `wtnonpldqvzipqmwgbru` passed an
  empty-target inspection: no public application relations/routines, Auth users or
  identities, Storage buckets/objects, application ledger, cron table, database
  webhook triggers, subscriptions or foreign servers. PostgreSQL is 17.11.
- Signup, email/phone/anonymous providers were disabled and read back; the Site URL
  is `https://recovery.invalid` with an empty redirect allowlist. Other providers,
  Auth hooks and mail notifications were already disabled. There are no deployed
  Edge Functions or Edge secrets. This is pre-import isolation only: no SMTP sink
  was configured, and invite/reset/admin-email routes must not be invoked.
- Initial isolation attempts received HTTP 402 when unnecessary disabled premium
  hook/notification fields were included. The successful patch changes only basic
  settings after checking those unused features were disabled; no paid upgrade was
  requested. Isolation was independently read back; no email was sent.
- Authenticated decryption of the approved 2 October staging backup passed GCM,
  ciphertext/plaintext SHA-256 and byte-length checks. Selected tar entries were
  verified as safe regular-file paths. Protected inspection scratch contains the
  dump, schema-only SQL and metadata; it is retained under current-user-only ACLs
  at `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\inspection-20261003`.
  Only the temporary decrypted verification tar was removed. Encrypted source
  evidence remains unchanged; retained scratch is not a public release artifact.
- Offline classification covers all 1,866 TOC entries (106 TABLE DATA entries).
  The classifier initially rejected one standard DEFAULT entry; a regression test
  was added and all four synthetic tests now pass. The protected classification
  remains a review proposal, not an executable restore list or authorization.
  Application proposals comprise 303 pre-data, 73 data and 935 post-data entries;
  two core Auth data entries are separated from managed objects and old sessions.
- All three expected custom Auth triggers are present in the source catalog:
  `jwg_profile_on_auth_user_created`, `jwg_class_request_on_email_verified`, and
  `jwg_profile_email_on_auth_email_changed`. They require separate definition and
  post-import checks and must not fire during Auth/profile loading. Ledger table,
  data and primary-key entries are identified for explicit review.
- Read-only target compatibility evidence captures 344 managed Auth/Storage column
  records and seven managed triggers. Available extensions include Supabase Vault
  0.3.1, resolving the earlier local cluster's missing-extension prerequisite but
  not proving restore compatibility or recovery acceptance.
- No database import or data mutation occurred. Next: review exact selected SQL,
  dependencies, ownership/grants and managed-schema column compatibility; construct
  the guarded staged import; restore Storage bytes without overwrite; run exact
  ledger/catalog/Auth/Storage/security checks; then quarantine the disposable target.
  Managed recovery remains OPEN. Physical Safari and production operational gates
  remain separate. No production, retired database, Mux, Resend, push provider,
  deployment or domain was contacted or changed by this milestone.
- Parallel independent review produced an execution checklist and identified why
  the old wholesale restore script must not be retargeted. Helpers/checklist are
  retained in this task's local `staging-readiness` directory. These documentation
  updates are local/uncommitted; no new CI or deployment success is claimed.

## Current release checkpoint — 1 October 2026

- Branch `release/v1-readiness-20260918` remains the active release candidate. The
  latest staging application deployment is exact commit `8caa3e9`, and its Preview contains only the
  four protected `MUX_*` additions required by this activation; their values remain
  outside Git.
- Ready Preview `dpl_AZK7CPjTCcbeQCytugpwyEtbgFBv` serves only
  `jingwuguanseibukan-staging.vercel.app`. It passes 11/11 host/security-header probes,
  12/12 role-security checks and 18/18 read-only WebKit checks across desktop, tablet
  and mobile.
- Staging `eomubndonbetszdbhsrj` has the exact remote migration ledger 006–056.
  Migration 056 is applied only there; database lint, strict database verification and
  the independent migration-056 security/zero-residue postflight pass.
- Guarded live Mux acceptance created one disposable asset and linked Repository Draft,
  verified a short-lived RS256 playback token plus signed HLS, restored the row to
  Draft and deleted the exact row and asset. Provider asset 404, application playback
  404 and database baselines prove no live asset or application fixture remains.
- Mux's current regional OCI Direct Upload URL shape is now accepted through a narrow
  HTTPS host/path allowlist. Lookalike hosts, traversal paths, credentials, custom
  ports and fragments remain rejected. Failure logs expose only bounded categories.
- Final local evidence passes 346/346 application tests, 22/22 desktop uploader tests,
  ESLint, TypeScript and the optimized 51-route production build.
- Protected database/Auth/Storage metadata, role and Storage-object source evidence is
  captured. A disposable local PostgreSQL 17 restore proves the exact ledger, critical
  counts, roles, grants, RLS and all catalog objects except the managed Vault extension.
  Sanitized results are recorded in
  `release-evidence/local-recovery-rehearsal-20260930.md`.
- Production remains blocked on a new Singapore Supabase project, managed-platform
  restore/cutover proof, real email scheduler/delivery, dedicated-inbox Auth workflows,
  targeted push and physical Safari/iOS evidence, removal of weak staging test accounts,
  production-only secrets/DNS/redirect configuration and an approved release/rollback
  window. Mux activation is complete and verified on staging; it has not been configured
  or deployed to production.
- Production and the retired Supabase project were not contacted by this checkpoint.

## Desktop installer and retired-target guardrail checkpoint — 1 October 2026

- The desktop uploader now accepts the same narrow regional Mux Direct Upload URL
  shape proved by staging while retaining the legacy Google Storage form. Host/path
  lookalikes, credentials, custom ports, fragments and malformed identifiers fail
  closed. The uploader suite passes 22/22.
- A new staging-only NSIS installer was built and inspected. Its ASAR contains the
  approved staging public configuration, current regional and legacy Mux guards,
  bundled FFmpeg/license files, and no protected credentials, environment files or
  test fixtures. SHA-256 is
  `1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`.
- Read-only staging role acceptance passes for Member, Admin and Super Admin, and a
  synthetic MP4 processes and decodes with the two current watermarks. The package
  remains staging-pinned, x64 and unsigned. GUI automation could not be completed in
  the restricted Windows runner, so ordinary interactive launch/uninstall remains a
  user-host acceptance item rather than a claimed pass.
- Release scripts no longer label retired project `pkmllhaavadhaozmwapz` as
  production. Security probes and dummy cleanup reject it in every mode; any future
  production read-only probe requires an exact separately supplied active project ref.

## Staging Mux activation checkpoint — 1 October 2026

- Only the four `MUX_*` secrets were added to the branch-scoped Vercel Preview; no
  Production environment variable was changed.
- Migration 056 was applied only after the staging URL guard and exact 006–055 ledger
  check. The final ledger is exactly 006–056 with no database-lint findings.
- The live acceptance uses the protected Super Admin staging account and a 5,044-byte
  disposable MP4. It creates at most one asset and one Draft, validates server-side
  ownership/finalization, signed token claims, unsigned playback denial and signed HLS,
  then removes the captured database row and provider asset.
- Earlier pre-upload failures created no asset or Draft. Their marker-matched waiting
  Direct Upload sessions were cancelled with provider 200 responses. The successful
  run verified provider 404 for its deleted asset and application 404 for its deleted
  content.
- Exact deployment, database, browser and security results are recorded in milestone
  170 of `TODO_PROGRESS.md`. Production and `pkmllhaavadhaozmwapz` were not contacted.

## Email scheduler feasibility checkpoint — 30 September 2026

- The committed worker/provider suite passes 28/28 focused tests, including wrong-
  secret denial before database/provider access, durable rate-limit failure behavior,
  empty and 20-message batches, retry persistence, acknowledgement failure, queue
  health normalization and memorial-processor observability.
- A current read-only Supabase project inventory still shows both available projects
  active, so the approved disposable managed-restore rehearsal remains blocked by the
  missing free project slot. Neither existing project was paused, deleted or changed.
- Current Vercel documentation confirms that Cron targets the project's production
  deployment with `GET`; Hobby runs at most daily, while one-minute execution requires
  Pro or Enterprise. It also does not retry failures and may overlap/duplicate runs.
  Therefore no Vercel Cron entry was added to this Preview-only staging release.
- Staging still needs a separately authorized one-minute external `POST` scheduler,
  monitored real Resend delivery to a dedicated staging inbox and the complete retry/
  exhaustion acceptance record. Production still needs an independently reviewed
  scheduler choice and must not inherit a staging Preview assumption.
- Production, the retired project, provider settings and the deferred Mux/uploader
  working tree were not contacted or changed.

## Privileged worker secret hardening — 30 September 2026

- The email-worker and push-delivery routes now use one server-only constant-time
  comparison helper. Both supplied and configured values are SHA-256 digested before
  `timingSafeEqual`, so a wrong-length header follows the same fixed-length comparison
  boundary while a missing or empty configured secret continues to fail closed.
- Regression coverage proves exact-match acceptance, missing/empty/wrong-value denial,
  fixed 32-byte digest comparison for different-length input and rejection before any
  database or provider work. The complete local application suite passes 315/315,
  TypeScript passes, targeted ESLint passes and the intended diff is whitespace-clean.
- No secret value changed, no environment variable was exposed and no live worker was
  invoked. Staging, production, the historical project and external providers were not
  contacted; deferred Mux/uploader changes remain outside this milestone.

## Parallel external-gate hardening — 30 September 2026

- Parallel read-only audits covered the email scheduler/Resend gate, dedicated-inbox
  Auth flows and Web Push/Safari readiness. No audit contacted a live system.
- Registration, account-email replacement and `/auth/confirm` now share one exact
  configured-origin validator. Registration no longer derives its callback from the
  browser host, and confirmation success/error redirects no longer inherit an
  untrusted request host or unrelated query parameters. HTTPS is required except for
  explicit localhost/loopback development origins.
- Email-worker responses now retain migration 033's existing sanitized backlog
  telemetry: total queued messages, due messages and oldest-ready age. This closes the
  local monitoring gap for growing-queue alerts without changing the database.
- Modules that access the Supabase service key, VAPID private key or durable rate-limit
  secret are explicitly `server-only`. The service worker now treats JSON `null`,
  arrays and primitive push payloads as safe empty payloads and uses notification
  fallbacks instead of throwing.
- Real inbox delivery, external scheduler monitoring, the intentionally hidden push
  settings UI/PWA installation tranche and physical Safari/iOS delivery remain open.
  Production, staging, the historical project, providers and deferred Mux/uploader
  files were not contacted or changed.

## Fixed staging alias and guarded WebKit gate verified (28/09/2026)

The fixed staging alias `https://jingwuguanseibukan-staging.vercel.app` was reassigned
only to Ready Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP`, built from the
release implementation commit `3a118f7` on `release/v1-readiness-20260918`. A
post-change Vercel inspection resolved the fixed alias back to that exact deployment,
and the deployment dashboard listed the fixed alias alongside the release-branch and
immutable Preview URLs.

The staging-only host gate then passed 11/11 read-only probes covering public pages,
static assets, protected route shells, method guards and security headers. The guarded
WebKit suite passed 18/18 checks with one worker: six checks each on desktop, tablet
and mobile for anonymous registration and confirmation recovery, Member access,
scoped Admin boundaries, Super Admin read-only pages and certificate not-found
handling. No application records were mutated. Production was not contacted, and the
deferred Mux/uploader working tree was not changed.

## Release commit, CI and Preview gate verified (27/09/2026)

The implementation release checkpoint on `release/v1-readiness-20260918` is commit
`3a118f7`; subsequent commits contain release evidence and recovery metadata only.
GitHub CI passed all five release checks: the common
checks job plus Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS. The
locale-safe finance assertion was also rerun locally in Playwright WebKit, passing
114/114 checks with zero skips, unexpected results or flakes.

Vercel Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP` is Ready and available
through both its release-branch Preview alias and the deliberately reassigned fixed
staging alias. The earlier project-scoped-token alias API failure is superseded by the
verified CLI reassignment recorded above. Production was not contacted or modified.

Migration 054 remains persisted only on staging `eomubndonbetszdbhsrj`. Its independent
postflight again passed the exact 006–054 ledger, zero-residue and security contract,
and all 12 authenticated Member, scoped Admin and Super Admin role-security checks
passed. Guarded read-only browser verification of the new release through the fixed
staging alias now passes 18/18 WebKit checks.

## Member contact self-service browser workflows verified (27/09/2026)

The real Member profile now has isolated browser coverage for phone and optional
Instagram updates plus the verified email-change request. The successful workflow
proves phone/Instagram normalization is reflected in the interface, Member ID/name
remain intact, the current email remains active while confirmation is pending, and
the same-origin request carries the Member session bearer token. The rejection
workflow proves both contact and duplicate-email errors remain visible and retryable
without losing the entered form values.

The production build generated all 50 routes. The finalized browser matrix passes
186/186 checks across Chromium and WebKit desktop, tablet and mobile; the two new
contact workflows pass 12/12 profile executions. Type-check plus unit/security tests
pass 279/279 and lint passes. The browser fixture is network-disabled, so no staging
Member, Auth provider, email inbox or production system was read or changed. A real
provider confirmation round trip remains an external staging gate.

## Deceased-member memorial interface verified (27/09/2026)

The real Super Admin memorial panel now has isolated browser coverage for opening the
settings, marking Deceased, entering Date of Passing, selecting multiple recipient
classes, enabling and writing Remembrance Day and Heavenly Birthday messages, saving
the complete draft, manually publishing the Initial Memorial, and clearing Deceased.
The reversal check proves the date is cleared and all memorial publication controls
become disabled. The interface explicitly preserves Member ID, grades, certificates,
attendance and records, and states that Deceased is separate from Terminated.

The first automated accessibility scan found two low-contrast explanatory labels in
the production panel. Both were corrected from neutral-500 to neutral-400. The final
browser matrix passes 174/174 checks across Chromium and WebKit desktop, tablet and
mobile; the two memorial workflows pass 12/12 profile executions. This UI proof
complements the existing API authorization/Auth-ban unit tests and persisted,
rollback-contained staging memorial SQL acceptance. It does not claim live Auth
ban/unban or publication: no staging or production record was changed.

## Certificate QR verification browser states verified (27/09/2026)

The real server-rendered public verification page now has isolated end-to-end browser
coverage through an exact loopback-only service-role RPC stub. Issued, Pending, Void
and unknown UUIDs render their distinct database-backed states; the page shows the
expected member, promoted rank and certificate number, remains responsive, passes the
automated accessibility scan, and exposes no link or certificate download.

The expanded finalized browser matrix passes 162/162 checks across Chromium and
WebKit desktop, tablet and mobile; six executions cover all four verification states.
The stub accepts only the fixed local test service credential and rejects every other
endpoint. No staging certificate, member, provider or production system was read or
changed. A deployed staging random/unknown UUID check already passes; a real deployed
valid-certificate scan remains unnecessary unless dedicated disposable certificate
history is deliberately created.

## Bulk-assessment browser workflow verified (27/09/2026)

The real Super Admin assessment page now has an isolated, network-disabled browser
fixture covering scoped roster loading, required Mudansha and Yudansha assessors,
three-candidate roster preparation, Pending certificates, one combined Pass/Fail
review and one atomic submission. The final fixture state proves two passing members
were promoted, the failed member remained unchanged, Pass certificates became Issued,
the failed certificate became Void, and the class/dojo announcement payload remained
ordered from the highest successful destination grade to the lower grade.

The finalized production-build suite passes 156/156 checks across Chromium and
WebKit desktop, tablet and mobile; six of those checks are this complete assessment
workflow. Type-check plus unit/security tests pass 279/279, and lint passes. This UI
evidence complements the existing persisted rollback-contained staging SQL proof. It
does not claim that a deployed browser changed staging: no member, grade, certificate,
announcement, provider or production record was mutated.

## Regular-schedule browser mutation workflow verified (27/09/2026)

The real Admin schedule page now has an isolated, network-disabled browser mutation
fixture covering scoped catalog loading, instructor selection, create, edit,
deactivate, server-error presentation and no-row-on-failure behavior. The finalized
suite passes 125/125 checks across Chromium desktop/mobile and WebKit
desktop/tablet/mobile; ten of those checks are the two new schedule workflows across
five responsive profiles. The first synchronization attempt exposed only a fixture
wait issue and was corrected by waiting for the actual RPC-provided options.

This UI evidence complements the existing rollback-contained staging database proof
for schedule authorization, audit and scope semantics. It does not claim that a
deployed browser committed a staging schedule: no Supabase row, provider or production
system was changed.

## Managed Supabase default-privilege gate resolved (27/09/2026)

The former strict-verifier blocker is closed without weakening application-object
checks. A fresh read-only staging catalog proves all 77 public relations, 214 public
routines and 87 public types are owned by `postgres`; zero public objects are owned
by `supabase_admin`; and `postgres` is not a member of that managed role. The only
remaining browser-role defaults owned by `supabase_admin` are hosted-platform
defaults which the application role cannot alter and which do not apply to the
`postgres`-owned migration objects.

The verifier now keeps unsafe global/public defaults owned by `postgres` as a hard
failure. It accepts the managed defaults only while `postgres` cannot inherit
`supabase_admin` and that role owns no public relation, sequence or routine; either
condition changing reopens the release gate. The pinned read-only verifier then
passed against staging `eomubndonbetszdbhsrj`. This matches Supabase's documentation
that `supabase_admin` is an internal administrative role and its default grants are
part of the managed Data API permission model. Production was not contacted.

## JS Video Uploader — Stage G provider-ready candidate (27/09/2026)

The existing Stage B login preview was advanced locally to desktop v0.8.1. The
Windows app now loads exact `get_my_repository_upload_scopes` authority instead of
mistaking ordinary Admin scope for upload permission; an unappointed Member and
unappointed Admin are denied, while Super Admin receives all five staging classes.
It provides database-driven class/rank/tier choices, local video selection, current
organization/class logo retrieval, bundled FFmpeg dual-watermark processing, Google
desktop OAuth with PKCE and exact-channel verification, resumable YouTube upload,
privacy choice with Unlisted recommended, cancellation/progress and guarded Draft
creation through `create_repository_content`. JS and Google tokens remain memory-only;
video bytes never route through Vercel or Supabase Storage.

Verification completed without contacting production or uploading a real video:

- TypeScript/build plus 21/21 desktop security, authentication, configuration and
  local-file tests pass; dependency audit reports zero vulnerabilities.
- Read-only staging role acceptance passes: Member denied, unappointed Admin denied,
  Super Admin receives Aikido, Karate, Kungfu Kids, Taiji and Xingyi.
- Development and packaged Electron UI smoke tests pass renderer isolation, blocked
  renderer networking, password clearing, exact role scope, sign-out and responsive
  minimum-width behavior.
- Local FFmpeg successfully processed and decoded a synthetic two-watermark video.
- Package inspection confirms only staging public configuration, the external
  FFmpeg binary/license/readme and no protected credentials, env files or fixtures.
- The NSIS installer completed a silent install, installed-app smoke test and silent
  uninstall with exit code zero and no remaining install directory.

The candidate is not yet a live uploader release. The protected staging environment
does not contain the public installed-app Google OAuth client ID or the expected
organization YouTube channel ID, and Google may force uploads from a new unaudited
API project to Private. A read-only audit proves 3/5 class logos use current approved
origins: Aikido references retired Supabase origin `pkmllhaavadhaozmwapz`, Kungfu
Kids has no logo, and Karate, Taiji and Xingyi are current. The processing smoke
refused to contact the retired origin. Re-upload/add the affected class logos in staging,
project, configure the two public Google/YouTube identifiers, obtain any required
Google API audit, then run a guarded
real Unlisted upload/Draft-save acceptance. The installer remains unsigned and uses
the default Electron icon; those are distribution/polish gates, not hidden successes.

The v0.8.1 hardening tests the resumable upload metadata, exact Google upload-session
origin/path/ID, returned YouTube video-ID shape and concurrent test isolation. It fixes
an address-validation suffix weakness that could otherwise accept a deceptive hostname.

## Staging migrations 048–052 accepted (26/09/2026)

With explicit staging-only approval, migrations 048 through 052 were applied in
order to Sydney staging `eomubndonbetszdbhsrj`. Postflight confirms the exact
migration ledger is 006–052, the explicit-project dry run is empty and Supabase
database lint reports no errors. The guarded Member/scoped Admin/Super Admin
security suite passes 12/12.

The hardened combined rollback-contained acceptance suite passed the
regular-schedule, Member-contact, exact Member-directory eligible-set,
finance-presentation wrapper/ACL and Repository-Uploader database boundaries. It
reached its deliberate rollback success marker, and an independent postflight
connection confirmed zero synthetic residue, forced RLS/private-table ACLs and the
exact 006–052 ledger. Staging did not contain finance rows suitable for a positive
late-payment example; the positive late/on-time semantics remain verified by the
disposable local database fixture rather than being overstated as live-data proof.

The branch-aware Vercel Preview for release commit `bda9bf9` is Ready, and the fixed
staging alias now points to that deployment. The guarded deployed WebKit matrix passes
18/18 read-only checks across desktop, iPad Mini and iPhone 13. Two earlier 16/18
attempts failed in different authenticated checks because three device projects were
signing the same protected role accounts in concurrently. Serial execution then passed
18/18 twice, including the official guarded command, so the staging harness now uses
one worker to keep the shared-account proof deterministic.

The local production-build browser matrix passed all 69 Chromium and all 69 WebKit
desktop/tablet/mobile checks (138 application checks total). The 23 Firefox checks
could not start because this Windows host returns `spawn UNKNOWN`; the dedicated
host preflight reproduces that limitation before opening an application page, so
Firefox application coverage remains assigned to the isolated Linux CI gate rather
than being reported as an application failure.

Production was not contacted. Migration 053 was reviewed, dry-run as the only
pending change, applied to staging and verified as an idempotency repair for repeated
Repository-Uploader appointments. Its rollback-contained active-retry and
revoke/reactivate acceptance reached the deliberate success marker; independent
postflight confirmed zero marker residue, the exact 006–053 ledger and the intended
RPC/private-table ACLs. Database lint remains clean and the authenticated role-security
suite still passes 12/12.

## Repository Uploader appointments — historical local milestone verified (26/09/2026)

Migration 052 separates repository publishing authority from ordinary Admin scope.
Only an active Super Admin can appoint or revoke an active Member as a Repository
Uploader, and each appointment is limited to one active class. Appointed ordinary
Members may create, update, delete and read drafts only for their appointed classes;
an unappointed Admin receives no implicit publishing authority. Super Admin retains
global authority. Assignment tables are private, forced-RLS and audited, while all
browser mutations remain RPC-only.

The shared `/repository/upload` UI now loads exact RPC-provided class scopes, maps
the returned `class_id`/`class_name` fields explicitly, and appears in navigation
only when the signed-in user has an active upload scope. The Super Admin appointment
screen prevents stale-member mutations while options are loading. The legacy
`/admin/content/manage` URL delegates to the same scoped uploader page, and the Admin
dashboard no longer advertises duplicate or unscoped content controls.

Verification:

- Disposable PostgreSQL 18.3/PGlite apply and semantic acceptance passed Super-only
  appointment/revocation, active-class enforcement, exact-class Member CRUD,
  cross-class denial, unappointed-Admin denial, Super global access, direct-write
  denial, draft RLS isolation, two-row appointment/revocation audit, immediate
  revocation, cleanup and function/table ACLs.
- The independent UI review found and closed the RPC field mismatch, stale selection
  race, unconditional navigation, legacy dashboard links and Admin-only wording.
- Focused migration 052 contract tests pass 5/5. The full local gate passes TypeScript
  and 274/274 Node tests, ESLint, the 50-route production build and `git diff --check`.
- The immutable local migration contract is exactly 006–052 with SHA-256
  `1bf1fc36b17d67ea91b049339efdcd695f15a733adf6ae68eae4356cecf49cd5`.

At this local milestone, migration 052 had **not** been applied to staging and the
verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above; production was not contacted.

## Finance late-payment presentation — historical local milestone verified (26/09/2026)

Migration 051 adds read-only settlement-detail wrappers that retain the existing
cash-received settlement eligibility, duplicate exclusion, share, currency and
lifecycle rules while exposing each charge's billing month and a display-only
late-payment flag. Admin payment confirmations and settlement details/exports now
show the charge month and mark payment in a later calendar month as `LATE PAYMENT`.
No accounting row, settlement amount or financial transaction rule is changed.

Verification:

- Disposable PostgreSQL/PGlite semantic acceptance proved a January charge paid in
  February is late, a February charge paid in February is on time, and the original
  payment/share/currency projections remain unchanged.
- Anonymous execution is denied; authenticated and service-role execution retain the
  intended guarded wrapper access.
- Focused migration 051 contract tests pass 4/4, and the full local release gate
  listed above includes the finance UI and SQL-security assertions.

At this local milestone, migration 051 had **not** been applied to staging. This was
superseded by the staging acceptance recorded above. No staging or production system
was contacted for the local milestone.

## Member directory privacy — historical local milestone verified (26/09/2026)

The third remaining frozen V1 feature is now implemented locally as migration 050.
The new Member Directory is available to Member, scoped Admin and Super Admin roles,
but every caller receives entries only for classes in which that caller has a current
active/Break membership. A same-class Member is visible across all dojos. Eligible
record-only profiles are not required to have an Auth row and may appear when their
profile and membership remain current.

The database RPC returns exactly six fields: class name, profile photo URL, name,
current official rank, home dojo and optional Instagram username. It does not return
email, phone, birth date, Member/Registration ID, membership status, attendance,
payments, notes or administrative data. Inactive/terminated memberships, deceased
profiles, disabled profiles and cross-class members are excluded at the database
boundary rather than fetched and hidden in the browser.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: caller-only
  class scope, cross-dojo visibility, current-rank formatting, record-only inclusion,
  cross-class/inactive/deceased exclusion, disabled-caller denial and RPC ACL checks.
- `npm test`: 265/265 passed, including four directory privacy/UI contract tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 48-route Next.js production build, including
  `/directory`.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–050 with SHA-256
  `86f0cbd215f7f06364284f0f28fe9209e052c2b26873e4fb98ba55f01b63640d`.

At this local milestone, migration 050 had **not** been applied to staging. This was
superseded by the staging acceptance recorded above. No staging or production system
was contacted or changed for the local milestone.

## Member contact self-service — historical local milestone verified (26/09/2026)

The second remaining frozen V1 feature is now implemented locally as migration 049.
Active Members can update only their own phone and optional Instagram username from
the existing profile page. Phone values are validated and normalized; Instagram is
stored in lowercase without a leading `@`, displayed with `@`, and omitted from the
read-only display when absent. No name, birth date, Member ID, Aikikai ID, role,
membership or other identity field became member-editable.

Email replacement uses an authenticated, same-origin, durable-rate-limited server
route and the Member's own Supabase Auth session. It checks the normalized profile
email index for duplicates, requests Supabase's verified email-change flow with the
exact `/auth/confirm` callback, and leaves the current profile email unchanged while
verification is pending. A fixed-path Auth trigger synchronizes the profile only
after `auth.users.email` actually changes, so Auth and profile remain consistent.

Migration 049 also adds a private, forced-RLS, append-only contact audit. Completed
phone and Instagram changes record the authenticated Member as actor; completed Auth
email replacements record the affected Member and explicit confirmation source.
Browser roles cannot read or write audit rows, cannot update `profiles` directly,
and receive only the caller-bound `update_my_contact_details` RPC.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: phone and
  Instagram normalization, two-field audit, invalid-value rejection, disabled-user
  denial, verified Auth email sync, duplicate-email rollback and browser ACL denial.
- `npm test`: 261/261 passed, including route behavior, same-origin denial,
  durable rate limiting, duplicate protection, audit/ACL and migration tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 47-route Next.js production build, including
  `/api/account/change-email` and the updated `/profile` page.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–049 with SHA-256
  `5e2c2661178f30dc12fb3094aac55928a9fc228c21e7ca671e54f0b180a14f4d`.

At this local milestone, migrations 048 and 049 had **not** been applied to staging
and the verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above. Supabase Auth provider behavior and real email delivery
for the email replacement flow remain guarded acceptance work. No staging or
production system was contacted or changed for the local milestone. The unrelated
uncommitted Windows uploader work remains preserved.

## Regular schedules — historical local milestone verified (26/09/2026)

The first remaining frozen V1 feature is now implemented locally as migration 048.
It adds one audited, database-driven weekly timetable source for Member browsing by
dojo or class and for scoped Admin/Super Admin maintenance. Each row records the
dojo/class offering, weekday, start/finish time, an optional existing active class
member as instructor, optional venue/room and notes, and active/inactive state.

The write boundary reuses `is_class_admin(class_id, dojo_id, user_id)`: scoped
Admins can create or update rows only inside their exact active dojo/class assignment,
while Super Admin can maintain all active offerings. Moving an existing schedule
requires authority over both its old and new scopes. Direct browser table access is
denied; member-safe reads and all maintenance use explicit SECURITY DEFINER RPCs
with fixed search paths, active-account checks, narrow fields and private append-only
audit rows. Deceased/disabled profiles are not offered or displayed as instructors.

The feature is information-only. Migration 048 contains no event, attendance,
announcement, notification, email, vote or teaching-hours writes. Member navigation
now includes **Schedules**; Admin navigation and the Admin dashboard include
**Manage Schedules**. The responsive pages support active timetable browsing grouped
by dojo or class, plus create/edit/deactivate/reactivate management.

Verification:

- Disposable local PostgreSQL 17 apply and semantic acceptance passed: scoped create
  and update, out-of-scope denial, Member read-only access, inactive-row visibility,
  active-class instructor choices, audit creation and direct-table ACL denial.
- `npm test`: 252/252 passed, including migration 048 security and schedule UI tests.
- `npm run lint`: passed without warnings or errors.
- `npm run build`: passed the 46-route Next.js production build, including
  `/schedules` and `/admin/schedules`.
- `git diff --check`: passed with informational future CRLF notices only.
- The immutable repository migration contract is now exactly 006–048 with SHA-256
  `f0c76d21763b5c014896d5646640c87478e6371a4129067e59dc7641e8daf135`.

At this local milestone, migration 048 had **not** been applied to staging and the
verified staging ledger remained 006–047. This was superseded by the staging
acceptance recorded above. No production database/project was contacted or changed
for the local milestone. The existing uncommitted Windows uploader work was
preserved and was not advanced because the V1 scope freeze keeps it post-launch.

## JS Video Uploader — Stage B verified (25/09/2026)

The user approved continuation after Stage A. Desktop v0.2.0 now signs in using
existing JS Supabase email/password authentication, shows the verified name/role
and active classes the account can manage, rejects ordinary members, and signs out.
The preview is explicitly bound to staging project `eomubndonbetszdbhsrj`.

Authentication and all Supabase calls stay in Electron's main process. Sessions
are memory-only; passwords/tokens are not persisted or returned to the renderer.
Explicit sign-out uses local session scope. Authorization checks `getUser`, profile
state, `is_active_app_user`, `is_super_admin` and `can_manage_class` with the user's
token. It denies inactive/deceased/password-change-required accounts. Permission
checks repeat every minute and on focus and fail closed. Future write operations
must independently enforce current permissions through existing database RPCs.
No auto-refresh/remember-me: an expired session requires sign-in again.

The sandboxed renderer remains unable to make network requests. Each of the four
preload operations checks the exact main-frame sender. Only the staging public
URL/key are packaged. Build validation rejects secret/service-role keys and other
project URLs. Video selection, FFmpeg, Google OAuth and uploads are not implemented.

Verification:

- Desktop TypeScript/build and 17/17 security/auth tests pass, including revoked
  access, denied account states, database failure and a late login after sign-out.
- Live read-only staging acceptance: Member denied, Admin limited to Aikido,
  Super Admin receives all five classes; refresh and local sign-out pass.
- Development and packaged Electron UI tests pass: member denial, Aikido-only
  Admin display, password field clearing, sign-out, renderer isolation/network
  blocking and layout at default/minimum sizes. An initial development UI attempt
  timed out; the diagnostic rerun and packaged run passed without code changes
  to authentication. Screenshot reviewed.
- Package inspection confirms no protected credentials, environment files or
  test fixtures. Dependency install audit reported zero vulnerabilities.
- Windows x64 NSIS installer: 112,870,299 bytes, Authenticode NotSigned.
- SHA-256: `B5222308127000AC9DE63440F826F93EC442CFBB4524F0D99D3AB32A32F12FAE`.
- Packaged executable tested; complete install/uninstall and a second physical
  device are not tested. Root web code/build configuration was not changed in B;
  prior Stage A root verification remains 245/245 tests plus typecheck/lint/build.

Changed files in B: desktop `package.json`/lockfile, `src/auth.ts`, `src/config.ts`,
`src/contracts.ts`, `src/main.ts`, `src/preload.ts`, renderer TSX/CSS,
`scripts/build.mjs`, `build-staging.mjs`, `staging-acceptance.mjs`, `smoke.mjs`,
`verify-package.mjs`, `tests/auth.test.mjs`, `tests/load-auth.mjs`, desktop README,
and this checkpoint. No migration, database data change, deployment or production
call. Only staging auth sessions and read-only permission queries were used.

Stage B ends here. Next stage is C: database-driven video form.

## JS Video Uploader — Stage A verified (historical, 25/09/2026)

The user approved the inspection report and Stage A only. The Windows desktop
shell now lives in `desktop/js-video-uploader/` inside this repository, with its
own package/lockfile, React/TypeScript renderer, Electron main/preload processes,
build script, security tests, launch smoke test and Windows x64 NSIS configuration.
It is a clearly labelled preview: sign-in is disabled and no processing or upload
functions exist yet. Authentication is the next stage and has not been started.

The desktop renderer uses sandboxing, context isolation and no Node integration.
The only IPC method returns application version/stage information and verifies
the exact main-frame sender. Navigation, popups, webviews, network requests and
permission requests are blocked. No Supabase service key or Google credentials are
bundled. Root TypeScript/ESLint and Vercel inputs exclude the desktop directory;
the web package dependencies and lockfile were not changed.

The earlier uncommitted cloud-upload proposal was withdrawn by reverse-applying
its verified patch, including its Storage upload UI/API, worker, proposed migration
048 and related test changes. The migration chain remains 006–047. No applied
migration or database object was removed or changed. The earlier unrelated
`classes.active` fix was part of that withdrawn patch; a future repository-form
stage should use the verified `classes.is_active` column.

Verification:

- Desktop TypeScript/build and 2/2 security unit tests pass.
- Electron development and packaged Windows launch tests pass: rendered title,
  preload bridge, disabled sign-in, no renderer Node access, blocked network,
  and no horizontal overflow at default and minimum window sizes.
- Preview screenshot visually reviewed.
- NSIS installer built: `JS-Video-Uploader-Setup.exe` (112,083,689 bytes).
- SHA-256: `49EF5E9478FAC361C5995B4CA6F96981980468FA420800BB3A3064D985502073`.
- Installer Authenticode status is NotSigned; default Electron installer icon is
  still used. Packaged executable launch was tested; a complete install/uninstall
  cycle has not been tested. Do not present this artifact as a signed release.
- Packaged application inventory contains no environment files, Supabase
  configuration or cloud worker. Desktop production dependency audit: zero findings.
- Root TypeScript, ESLint and 245/245 existing tests pass. The isolated web
  production build passes with dummy public Supabase configuration.

Changed files: `.gitignore`, `.vercelignore`, `tsconfig.json`,
`eslint.config.mjs`, this checkpoint, and the new `desktop/js-video-uploader/`
package (source, configuration, lockfile, README and tests). Generated dependencies,
build output, installer and screenshots are ignored by Git. Deliverables are also
copied to this task's outputs folder.

No database migration, production data change, deployment, source publication or
live provider call was performed for Stage A. FFmpeg bundling belongs to Stage D.
Stop here; obtain approval for Stage B before implementing JS login/authorization.

## Source and database state

- The release candidate implementation on `release/v1-readiness-20260918` is commit
  `3a118f7`; later commits contain release evidence and recovery metadata only.
- Migrations 048 through 054 were applied only to staging
  `eomubndonbetszdbhsrj`. The verified staging migration ledger is now exactly
  006–054. Migration 054 passed rollback-contained full/partial/duplicate-payment
  acceptance, independent zero-residue/security postflight and Supabase database lint.
- Migrations 040 through 054 were applied in order to staging
  `eomubndonbetszdbhsrj` only. The repository's local Supabase metadata remains
  linked to production, so it was not used or changed.
- The staging database password was rotated, stored only in the protected staging
  environment and successfully used for an explicit staging connection.
- Migration 044, optional Aikikai-number capture plus automatic JS Member ID
  assignment on initial approval, is persisted and accepted on staging. It has not
  been applied to production.
- Migration 043 repaired the two runtime catalog mismatches found by live acceptance:
  unsupported `min(uuid)` in memorial publishing and the prepared-assessment lookup
  of `profiles.member_id` instead of `profiles.registration_number`.
- Vercel Preview deployment `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP` is Ready through its
  release-branch Preview alias and was built from release commit `3a118f7`. The fixed
  alias `https://jingwuguanseibukan-staging.vercel.app` now points to that exact Ready
  deployment. The earlier project-scoped-token API attempt failed safely and was
  superseded by the verified CLI reassignment. The Preview uses the 13 approved
  staging-only variables. Only
  the exact fixed alias is a Deployment Protection exception; generated Preview URLs
  remain protected. The unused `Staging Release` deploy hook was removed and a
  follow-up listing returned no project deploy hooks. The four temporary Codex Vercel
  token used for the final alias operation was deleted and its local temporary copy
  was removed. Three earlier staging-preview token records are expired and no longer
  authorize access, but remain visible in Vercel history because the dashboard did
  not complete their deletion. Production was not contacted or modified.

## Actual feature inventory

| Feature | Existing implementation | Missing or unverified work | Relevant files / database objects |
| --- | --- | --- | --- |
| Member management and statuses | Existing member, membership, class/dojo, approval, Break, transfer, grading and retained-history flows. Migration 047's active/disabled/deceased request gate passed rollback-contained staging acceptance. | Physical Safari/iOS and remaining mutation workflows still require guarded coverage. | `app/admin/members/page.tsx`; `profiles`; `memberships`; `admin_visible_members`; migration 047 |
| Aikikai and JS Member IDs | Registration accepts the applicant's optional Aikikai Registration Number and stores it separately. Persisted migration 044 assigns the next permanent numeric JS Member ID atomically only when a Super Admin approves the initial application. Supplied/blank Aikikai values, ID assignment, rejection, legacy preservation, role denial, queue atomicity and zero residue passed live staging acceptance. | Exercise both blank and supplied Aikikai registration paths through the deployed browser workflow. | migration 044; `profiles.aikikai_registration_number`; `profiles.registration_number`; `js_member_id_seq`; both `review_class_request*` RPCs; registration and Applications pages |
| Last training session | Migrations 045–046 are persisted on staging. The implementation stores the latest date per class membership, appends the effective Jakarta date to a private audit, enforces scoped Admin/Super Admin writes and exposes Member-own reads. Rollback-contained live tests passed mark-today, correction/audit, idempotency, Member denial, Admin scope, Super Admin scope, inactive/pre-join/deceased rejection and ACL checks. The real Admin and Member interfaces now pass isolated mark-today, correction, rejection/retry, recent/older-date display and unavailable-state workflows across Chromium/WebKit desktop, tablet and mobile. The browser gate also repaired a processing lock that previously remained set after training mutations. | Complete the deliberate deployed mutation workflow on a disposable membership and physical Safari/iOS. | migrations 045–046; `class_memberships.last_training_session_date`; `membership_training_session_audit`; `mark_membership_trained_today`; `set_membership_last_training_session`; `get_my_last_training_sessions`; Admin member page; Member profile; `tests/browser/last-training-session.spec.ts` |
| Ordinary birthday announcements | Date of birth is retained. No ordinary birthday announcement scheduler was found in source or retained evidence. | If added later, it must exclude `date_of_passing is not null`; do not claim that migration 040 replaces an existing birthday job. | `profiles.date_of_birth` |
| Announcements and notifications | Existing published text announcements, class scoping, in-app notification creation and durable email outbox integration are present. The staging queue-health probe currently passes with no queued, due, overdue, stuck, exhausted or duplicate rows. | Announcement comments and image attachments were not found. External email-worker scheduling, sender-domain ownership and real delivery remain operational gates. The push delivery route is per-recipient and is not a scheduler worker. | `announcements`; `notifications`; `email_outbox`; `/api/system/email-worker`; `/api/push/send`; migration 034; migration 040 recipient extensions |
| Events | Existing create/delete/list/export paths and bounded queued event-email notifications are present. | Event voting, voting deadlines and vote correction were not found. | `app/admin/events`; `events`; event notification functions |
| Deceased member and memorials | Migrations 040 and 043 are on staging. The persisted state transition, initial memorial, annual Remembrance Day and Heavenly Birthday, class recipients, idempotency and Member/Admin denials passed rollback-contained acceptance. The real memorial panel now passes mark/save/publish/reversal and accessibility workflows across Chromium/WebKit desktop, tablet and mobile. | Live Auth ban/unban and real scheduled delivery still require dedicated disposable accounts/provider execution. | migrations 040 and 043; deceased UI/API; memorial tables and RPCs; `tests/browser/admin-memorial.spec.ts` |
| Bulk assessment and promotion | Migrations 041–043 are on staging. A persisted three-person rollback suite prepared all certificates as Pending, submitted two Pass and one Fail atomically, promoted only passes, created the results announcement and rolled everything back. The real page now also passes an isolated Chromium/WebKit desktop, tablet and mobile workflow for preparation, Pending status, mixed results and one atomic submission. | A password-authenticated deployed staging mutation remains deliberately unperformed because it would create immutable grading/audit history; use dedicated disposable records if this final live proof is required. | migrations 041–043; `app/admin/assessments/page.tsx`; private assessment tables and guarded RPCs; `tests/browser/admin-assessments.spec.ts` |
| Certificate barcode verification | Pending QR payloads and final Issued/Void database statuses passed persisted service-role verification; browser roles were denied direct verification/table access. The real server-rendered public page now passes Issued, Pending, Void and unknown-record browser checks across Chromium/WebKit desktop, tablet and mobile with no download exposure. | Physical Safari/iOS remains open. A deployed valid-record scan would require deliberately creating disposable immutable certificate history; deployed random/unknown verification already passes. | `verify_prepared_assessment_certificate(uuid)`; public verification page; certificate PDF components; `tests/browser/certificate-verification.spec.ts` |
| Regular schedules | Migration 048 is persisted and passed rollback-contained scoped-write, Member-read, audit and ACL acceptance. The current schedule routes load in the deployed release matrix. | Guarded authenticated schedule mutations and physical Safari/iOS remain open. | migration 048; `/schedules`; `/admin/schedules`; schedule RPCs and private audit |
| Member contact self-service | Migration 049 is persisted and passed rollback-contained normalization, audit, disabled-user, duplicate-email and ACL acceptance. The real profile contact and email-change workflows pass 12/12 isolated Chromium/WebKit desktop, tablet and mobile executions, including failure recovery. | Guarded real Auth email-confirmation/provider delivery and physical Safari/iOS remain open. | migration 049; `/profile`; `/api/account/change-email`; `update_my_contact_details`; `tests/browser/profile-contact.spec.ts` |
| Member directory privacy | Migration 050 is persisted and passed caller-class isolation, record-only inclusion, excluded-account and ACL acceptance. Scoped Admin membership visibility passes in the deployed role matrix. | Guarded directory-related mutations are not applicable; physical Safari/iOS remains open. | migration 050; `/directory`; Member-directory RPC |
| Finance and full-payment-only workflow | Migrations 051 and 054 are persisted on staging. Migration 054 passed rollback-contained partial/full/duplicate-payment semantics, exact 006–054 ledger, zero residue, enabled-trigger, fixed-search-path, helper-ACL, database-lint and 12-check role-security verification. Network-disabled real-page browser coverage verifies fixed full Admin payment, payment-confirmation approval/rejection, settlement late/on-time details, real Excel detail export, Super Admin approval/rejection, preserved retry input and success feedback, accessibility and responsive Chromium/WebKit behavior. The deployed read-only WebKit matrix also loads scoped Admin payments and Super Admin settlements without mutation. Release commit `3a118f7` is Ready on the fixed staging alias and passed all five CI checks plus 114/114 local WebKit checks. | A deliberate disposable-record end-to-end payment mutation, positive deployed settlement-detail example and physical Safari/iOS coverage remain open. | migrations 051 and 054; Admin/Member subscriptions and Admin payments/settlements; `tests/browser/finance-workflows.spec.ts`; `tests/sql/054_staging_acceptance.sql`; `tests/sql/054_staging_postflight.sql`; settlement-detail wrappers |
| Repository Uploader appointments | Migration 052 is persisted and passed Super-only appointment, exact-class CRUD, revocation/audit, RLS and ACL acceptance. The current uploader controls are present in the deployed release. | Guarded appointment and scoped CRUD browser mutations plus physical Safari/iOS remain open. | migration 052; `/repository/upload`; `/admin/repository-uploaders`; uploader RPCs and audit |

## Memorial design in the local candidate

Migration 040 adds `profiles.date_of_passing` without rewriting membership state or
deleting identity/history. Memorial configuration, recipients, publication ledger and
audit records are private tables behind guarded routines. Announcement visibility for
multi-class recipients uses a fixed-search-path helper rather than an RLS-hidden
`NOT EXISTS` fallback. Active-account request enforcement protects already-issued
PostgREST JWTs, while the server API coordinates future-sign-in ban/unban through the
Supabase Auth Admin boundary.

The initial memorial is an explicit Super Admin publication. Annual generation is
service-role-only, idempotent, uses Jakarta business dates, and defines 29 February
anniversaries as 28 February in non-leap years. The protected email-worker invocation
reports memorial processor failure separately instead of disguising it as successful.

## Bulk-assessment design in the local candidate

Migration 041 validates every submitted decision before applying any effect, takes a
transaction-scoped idempotency lock, locks membership rows deterministically, and
pins the expected target rank/level to reject a stale roster. Existing assessor rules
still apply. Pass rows delegate to the established promotion routine; Fail rows only
create immutable assessment evidence and do not alter grade, level or membership.

One published class announcement is created only if the batch has passes. Migration
042 reserves certificate records and numbers before assessment day for certificate-
eligible candidates and renders them into one multi-page PDF while their database
status is Pending. A single complete-roster finalization issues Pass certificates and
voids Fail certificates in the same transaction. Printing or retrying the PDF does
not submit results. The PDF carries a QR barcode with the requested certificate facts
and a database-verification URL. The scan endpoint uses a service-role-only routine;
browser roles cannot query the private preparation tables or verification routine.

For a selected dojo, the announcement remains limited to that prepared dojo roster
and names it in the title. For an all-dojo batch, lines are grouped by dojo. Each dojo
group is ordered by destination rank and sub-rank from highest to lowest, with member
name as a deterministic tie-breaker.

## Verification completed locally

- Migration 045/046 focused source/security suites, the migration-047 repair and the
  migration 048–052 contract suites pass. The current full local gate passes
  TypeScript plus 274/274 Node tests, ESLint, the 50-route production build and
  `git diff --check`.
- Migrations 048–052 are persisted on staging. Their combined rollback-contained
  acceptance reached its deliberate success marker; independent postflight proved
  zero fixture residue, exact ledger 006–052, an empty dry run and database lint with
  no errors. The authenticated role-security suite passes 12/12.
- Migration 053 is persisted on staging. Its separate rollback-contained
  idempotency/role/audit acceptance and independent zero-residue/ACL postflight pass;
  the staging ledger is exactly 006–053, database lint has no errors and the same
  role-security suite remains 12/12.
- The migration-045 review preserves the existing `admin_visible_members` column
  order and appends its two new fields, preventing an unsafe/incompatible view
  replacement. Migration 045 is now persisted on staging; production was not
  contacted.
- The migration-046 staging dry run is non-mutating and lists exactly
  `046_repair_last_training_audit_insert.sql`, with no seeds or roles.
- Persisted migration 046 passed the rollback-contained last-training semantic,
  audit, idempotency, role-boundary and ACL suite. Independent snapshots proved zero
  residue, database lint reports no errors, the ledger is exactly 006–046, the
  post-apply dry run is up to date and the authenticated role suite passes 12/12.
- Deployment-readiness review found and closed one fail-closed configuration gap:
  `DURABLE_RATE_LIMIT_SECRET` is now required by the offline provider validator,
  covered by regression tests and present as a distinct generated value only in the
  protected staging environment. The offline staging provider check passes without
  exposing values. The existing `js1-ccd7/jingwuguanseibukan` project is linked
  locally and the reviewed 13-variable runtime allowlist was uploaded only to the
  release branch's Preview scope. Database URLs/passwords, backup paths,
  `SECURITY_TEST_*` and legacy duplicate key aliases were excluded. The resulting
  Preview build is Ready on the fixed staging alias. Current-Preview host acceptance
  passes 11/11 and guarded read-only WebKit acceptance passes 18/18; no Production
  environment value or deployment was changed.
- GitHub Actions runs `36096335398` and `36096832757` passed checks plus
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS for the migration-047
  candidate and its evidence-only checkpoint.
- Migration 047 passed isolated apply, exact-ledger, up-to-date dry-run, database
  lint, anonymous catalog, helper-denial, sensitive-relation-denial, service-role,
  rollback-contained active/disabled/deceased semantics, 12/12 role-security and
  independent zero-residue checks on staging.
- The strict SQL verifier previously stopped on hosted `supabase_admin` defaults.
  The 27 September ownership audit and narrow managed-platform exception above close
  that blocker while retaining hard failures for application-owned defaults and
  any actual managed-role public object.
- The exact staging alias is publicly reachable through the approved single-domain
  Vercel exception and resolves to Ready deployment
  `dpl_F4XyZHYKcFdgjeqmtmjxnL2DD8XP`. All 11 host probes pass against that current
  Preview, including public pages, assets, method guards and security headers.
  Generated Preview URLs remain protected.
- Supabase staging now has the exact staging Site URL and `/auth/confirm` redirect,
  email/password login, confirmation, a ten-character mixed-case-and-digit policy,
  custom Resend SMTP and the reviewed token-hash confirmation template.
- Guarded deployed browser checks against the current Preview pass 18/18 in WebKit
  across desktop, tablet and mobile. They cover public registration catalog loading,
  generic invalid-confirmation handling, Member login and Admin denial, scoped Admin
  login and Aikido-only member visibility, Super Admin Applications/Assessments access
  and unknown-certificate handling. Test sessions were signed out and no member
  record was changed.

- `npm test`: passed TypeScript plus 223/223 Node tests after adding migration 044,
  optional Aikikai and automatic JS Member ID coverage, Super-Admin-only
  approval/assessment routing and
  provider-origin binding.
- `npm run lint`: passed with no reported warnings or errors.
- `npm run build`: passed the direct 44-route optimized Next.js production build,
  including the assessment and dynamic certificate-verification routes. After the
  later contrast fix, a fresh physical isolated copy passed the same 44-route build
  and was removed; the source `.next/trace-build` remained locked by browser tooling.
- `git diff --check`: passed; only informational future CRLF notices were printed.
- Static migration, API, UI, navigation, worker, certificate, barcode-verification,
  SQL-security and guarded security-account rotation regressions for 040–044 passed
  inside the 223-test suite.
- A fresh local PostgreSQL 17 fixture installed migration 044 and proved atomic
  JS-ID approval assignment, optional Aikikai value/NULL retention, review visibility,
  existing-ID preservation, rejection behavior, legacy-RPC delegation, `9999` to
  `10000` growth without truncation, scoped-Admin denial and private sequence ACLs.
  It was removed after the passing run; this is not a staging apply.
- Persisted staging migration 044 passed supplied/blank Aikikai, pre-approval JS-ID
  absence, automatic approval assignment, scoped-Admin denial, Super Admin approval,
  rejection, existing-ID preservation, routed-email/membership atomicity, sequence
  restoration, zero-residue, exact 006–044 ledger and private-sequence checks.
- The post-044 authenticated staging security suite passed all 12 Member, scoped
  Admin and Super Admin checks. Database lint reports no schema errors and the
  explicit-project dry run reports no pending migrations.
- The registration/browser assertions now exit cleanly: Chromium desktop passes
  23/23 and WebKit desktop/tablet/mobile passes 69/69. The restricted Windows runner
  denied Playwright's `taskkill` process-tree cleanup after otherwise passing runs;
  loopback-only test-server teardown now closes both servers before that fallback.
  A WebKit mobile native-select contrast failure found during the clean-exit rerun
  was corrected on both registration selectors. Firefox still cannot launch on this
  Windows host (`spawn UNKNOWN`).
- Provider configuration and 50/50 focused worker tests pass. A read-only staging
  probe reports queue-health `PASS`, with stuck, exhausted, overdue, queued, due and
  duplicate counts all zero. Invalid-secret probes against both the deployed email
  worker and push route returned the expected HTTP 401 without sending anything.
  Staging has neither `pg_cron` nor `pg_net`, so no database scheduler is installed.
  The protected Resend key's domain-inventory request returned HTTP 401; this is
  consistent with a restricted send-only key but does not verify sender-domain
  ownership or live delivery.
- Before migrations 048–052, a guarded read-only Playwright staging harness covered
  the public registration, invalid-confirmation, role-boundary and certificate-not-
  found paths in WebKit desktop, iPad Mini and iPhone 13 and passed 18/18. The interim
  login failures were a harness-only Next hydration race; the
  harness now waits for network idle and verifies controlled input values before
  submitting. Its allowlist adds exactly two legitimate read-only Member-profile
  RPCs, and redundant sign-out was removed because every test has an isolated browser
  context. This is automated WebKit evidence; physical Safari/iOS and guarded
  mutation workflows remain open.
- Release deployment `dpl_DocKgDVEB2EjtMt6i2sh4owYdhVj` serves commit `bda9bf9`
  through the fixed staging alias. The current guarded read-only WebKit matrix passes
  18/18 across desktop, iPad Mini and iPhone 13. The configuration uses one worker
  because its three device projects intentionally share the same protected Member,
  Admin and Super Admin accounts; this prevents concurrent logins from invalidating
  one another's sessions. No member record was changed.
- Recovery tooling now passes 14/14 focused tests. Manifest v2 binds a rehearsal to
  exact staging, the immutable repository 006–054 fingerprint, matching sanitized
  source/restored ledger fingerprints and measured RPO/RTO timestamps; it also
  represents the absence of a production project without a fake reference. The
  retained restore itself still reaches only ledger 006–026 and excludes managed
  Auth/Storage and other platform resources, so it is not current recovery evidence.
  The live `email_outbox` table and its core queue/claim/acknowledgement RPCs also
  predate the checked-in migration chain: migrations 006–054 validate but do not
  recreate those baseline definitions, so they require explicit protected-backup and
  disposable-restore evidence.
- `npm audit --audit-level=high --omit=dev` reports zero vulnerabilities.
- A fresh local PostgreSQL 17 cluster installed migration 029 then 041 and passed the
  14-check semantic suite, including active/non-deceased assessor enforcement,
  pass-only mutation, idempotency, ACLs and owner-side private-table auditing. The
  temporary cluster was removed afterward.
- The combined rollback-contained staging suite passed with candidate migration 043
  applied only inside the transaction: memorial, assessment, certificate/QR and
  Member/Admin boundaries all passed. An independent connection confirmed zero
  residue and an exact 006–042 ledger.
- After migration 043 was applied, the same suite passed against the persisted
  functions without a temporary repair. Independent postflight confirmed zero
  residue, intended RPC ACLs and the exact 006–043 ledger.
- A second fresh local PostgreSQL 17 cluster installed migrations 029, 041 and 042;
  its rollback-contained prepared-certificate suite passed 9/9 and the temporary
  cluster was removed.

## Live verification still required

1. Exercise a real disposable registration plus confirmation delivery, optional
   Aikikai input and automatic JS Member ID approval using an authorized staging
   recipient. No dedicated deliverable test mailbox is currently configured.
2. Exercise deceased-member Supabase Auth ban/unban and the protected annual worker
   with dedicated disposable staging accounts; the isolated memorial UI workflow is
   now covered across Chromium and WebKit. Verify no live member data is mutated.
3. Complete the remaining authenticated mutation workflows in deployed staging;
   the regular-schedule browser mutation path is now covered locally across Chromium
   and WebKit, as is the complete bulk-assessment preparation/finalization path. The
   deployed Repository Draft create/edit/delete path now has guarded zero-residue
   WebKit evidence. Repeat the other relevant guarded WebKit coverage and run physical
   Safari/iOS.
4. Configure and monitor an external **email** worker scheduler, then verify real
   test-recipient delivery. Push remains an explicitly targeted per-user operation,
   not a scheduled queue worker; verify it separately with a dedicated test device.
5. Rehearse a complete 006–055 managed-platform restore into a disposable isolated
   target, including Auth, Storage, roles/grants and post-restore security evidence.

The three reusable staging dummy identities exist and their protected passwords were
rotated through password-only Auth Admin updates. The exact-account audit, 12/12 API
role suite and password-authenticated deployed Member/scoped Admin/Super Admin checks
pass. No profile, membership or live member record was changed. The offline provider
configuration check passes and now proves that the expected origin matches normalized
`NEXT_PUBLIC_SITE_URL`; it does not replace live delivery tests.

The targeted rotation command is audit-only by default, is hard-limited to staging,
requires the exact three existing member numbers and resolved roles, and sends only
password updates. Its remote audit and explicitly approved apply both passed. Staging
email/password login is now enabled and the protected dummy accounts authenticate;
the API role suite still uses short-lived sessions and confirms their cleanup.

The assessment page and navigation are now explicitly Super-Admin-only. Scoped
Admins no longer see the entry, and direct non-Super-Admin access is redirected.

Production was not contacted. No production connection, deployment or merge is
claimed by this checkpoint. Migration 053 was applied to staging only and its guarded
acceptance completed; production remains unchanged.

## Repository Draft mutation checkpoint — 28 September 2026

- The deployed fixed staging alias completed one guarded Super Admin Repository Draft
  lifecycle in WebKit: create as Draft, edit the same captured content UUID, and delete
  it through the application UI.
- The browser request gate allowed exactly one `create_repository_content`, one
  `update_repository_content` and one `delete_repository_content` call in that order.
  It rejected publishing, provider traffic, direct table writes, duplicate or
  out-of-order mutations, and any update/delete not bound to the captured UUID.
- The Supabase server credential remained in the parent cleanup process and was not
  passed to Playwright. The parent verified the exact staging project, Super Admin
  0001, fixture creator and fields, no video-pipeline row, an unchanged Repository
  Uploader assignment-audit count, and an empty reserved-marker inventory afterward.
- The guarded WebKit test passed 1/1. No Repository Uploader appointment, published
  content, provider, production endpoint or deferred Mux/uploader file was touched.
  Afterward, the fixed-host probes passed 11/11 and the isolated read-only WebKit
  regression matrix passed 18/18 across desktop, tablet and mobile. The standard
  read-only config now explicitly excludes mutation-only specs.

## Contact compare-and-swap candidate — 28 September 2026

- Migration 055 is prepared locally, not applied. It adds a backward-compatible,
  fixed-search-path `update_my_contact_details_if_unchanged` RPC that locks the
  authenticated active Member's profile and rejects stale edit baselines atomically
  with SQLSTATE `40001` before profile or audit writes.
- The Member profile UI now captures the exact phone and nullable Instagram values
  when editing starts, sends them with the proposed values, refreshes on a conflict
  while keeping the editor open, and reports a true no-op separately from a change.
- A guarded Member 0101 no-op browser harness and rollback-contained SQL acceptance
  are prepared. They have not run against staging because migration 055 requires
  explicit staging approval and must be applied before the UI is deployed.
- Security review stopped and removed the first disposable-registration harness. It
  could have queued applicant and administrator email to persistent outbox rows and
  did not prove complete cleanup across all dependent history. No registration or
  confirmation email was sent.
- Local verification passes: TypeScript plus 302/302 Node tests, repository-wide
  ESLint, the 51-route optimized production build, exact 006–055 recovery fingerprint,
  workflow YAML parsing and whitespace validation. The immutable GitHub Action pin
  refresh is prepared but uncommitted.
- Current remote staging remains on exact migrations 006–054. Production, providers,
  Vercel configuration and deferred Mux/uploader files were not contacted or changed.
- A subsequent read-only CLI guard found the checkout still linked to retired project
  `pkmllhaavadhaozmwapz`, not staging. `migration list --linked` listed only that
  retired ledger and performed no write, but it did contact the retired project. Its
  result is not staging evidence. No further linked command is permitted until the
  checkout is explicitly relinked and verified as staging `eomubndonbetszdbhsrj`.

## Contact compare-and-swap staging checkpoint — 28 September 2026

- The checkout is now linked to exact staging project `eomubndonbetszdbhsrj`.
  Migration 055 was the sole pending migration after the exact 006–054 preflight and
  was applied only to staging. Rollback-contained semantic acceptance, independent
  zero-residue/ACL/search-path postflight, exact 006–055 ledger verification,
  warning-level database lint and the repository security verifier all pass.
- Clean release commit `c639e0d` is deployed as Ready Preview
  `dpl_otHaqRmeREfKMAeT653D4CN7Tugd` behind only
  `jingwuguanseibukan-staging.vercel.app`. A first Preview inherited a retired backend
  setting, but the browser target guard blocked it before network I/O and the alias was
  immediately restored before the corrected deployment. Production and the retired
  backend received no guarded browser request.
- The Member 0101 contact CAS no-op passes 1/1 in Chromium and WebKit. The parent
  postflight independently proves the complete profile record and contact-audit
  history are unchanged; only expected Auth sign-in/session metadata is outside that
  guarantee. The authenticated Member/scoped Admin/Super Admin security suite passes
  12/12.
- The fixed host passes 11/11 current route/method/security-header probes. Live
  staging WebKit application acceptance passes 18/18 across desktop, tablet and
  mobile. The Windows Schannel/WebKit certificate path failed locally despite the
  same Vercel certificate being independently authorized by Node TLS; therefore the
  successful WebKit application runs used a temporary Playwright transport bypass.
  Both repository configs were restored to `ignoreHTTPSErrors: false`, so this is not
  recorded as a native Windows WebKit TLS pass.
- The isolated profile-contact browser fixture now models the four-argument CAS RPC
  and its `40001` conflict boundary. Local Chromium passes 38/38. Final GitHub Actions
  run `36411271185` at implementation/test commit `5dc869f` passes common checks,
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS. Deferred Mux/uploader
  work was not staged, committed, deployed or otherwise modified by this rollout.

## Pre-migration recovery baseline checkpoint — 29 September 2026

- A read-only staging catalog audit confirms that the checked-in 006–055 chain assumes
  an older base schema. `email_outbox`, its normalization trigger and its four queue
  worker RPCs exist and are hardened, but foundational definitions such as
  `normalize_email_outbox()` and `clean_text()` predate the repository migrations.
  Creating only an `email_outbox` migration would therefore give false restore
  confidence and was deliberately rejected.
- Recovery manifest version 3 now requires matching source/restored schema-catalog
  SHA-256 values and positive object counts, an explicit verified pre-migration
  baseline component, and a `preMigrationBaselineVerified` check in addition to the
  exact 006–055 migration-ledger proof.
- `scripts/recovery-catalog-fingerprint.mjs` fingerprints exactly 18 schema-only
  public/storage catalog exports without printing their definitions. It rejects
  missing, unexpected, malformed or empty JSON and normalizes cross-platform line
  endings, object keys and row order.
- The focused recovery contract passes 18/18 tests; targeted lint and TypeScript pass.
  The template remains intentionally not ready until a protected source backup is
  restored into a disposable isolated target and the two catalog fingerprints match.
  No application row, database object, production endpoint, provider or deferred Mux
  file was changed.

## Guarded regular-schedule staging checkpoint — 29 September 2026

- A dedicated WebKit harness completed one Admin 0002 schedule create and one
  captured-UUID edit/deactivation through the fixed staging application. It passed
  1/1 in 13.2 seconds and is not part of the read-only staging matrix.
- The browser gate allows only the exact collision-checked dojo/day/time, null
  instructor, reserved marker fields and create-then-update state transition. The
  browser receives neither the server key nor the database-owner URL.
- Parent cleanup accepts only the exact created fixture with one audit row or the
  exact updated fixture with two audit rows. It locks the captured UUID, deletes only
  those audit rows and that schedule inside one transaction, and then requires zero
  reserved-marker residue. Any ambiguity or field drift stops cleanup for manual
  review. No test-only cleanup RPC was added to the application schema.
- Parent postflight verified the exact inactive fixture and two audit rows, then
  removed only those rows transactionally and confirmed an empty reserved-marker
  inventory. Expected Auth sign-in/session metadata is outside this zero-residue
  guarantee.
- Local request-guard tests pass 3/3; targeted ESLint, TypeScript and whitespace
  validation pass. GitHub run `36473581644` at recovery-gate head `b0e8bcb` passes
  checks plus Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS.
  Production, the retired Supabase project and deferred Mux/uploader files were not
  contacted or changed.

## Guarded last-training staging checkpoint — 29 September 2026

- A dedicated WebKit harness completed scoped Admin 0002 correcting and then
  mark trained today on the exact active Member 0101 membership visible in the
  deployed staging member-management page. The corrected run passed 1/1 in 10.8
  seconds.
- The browser allows only the captured membership's exact correction-date RPC
  followed by its mark-today RPC. Different identities, targets, dates, order,
  origins, direct-table writes and provider requests are denied before network I/O.
- The parent snapshots the complete membership and audit baselines. Cleanup accepts
  only the exact newly appended audit transition(s), deletes those captured UUIDs,
  restores the original date, and requires every business membership field plus the
  full audit baseline to match. The trigger-managed `updated_at` timestamp is an
  explicit metadata exception. Credentials remain outside Playwright and no
  test-only database function is added.
- The first attempt completed both approved writes but failed a button-text locator;
  postflight then refused its overly strict full-row comparison because the existing
  membership trigger advanced `updated_at`. A staging-only forensic read identified
  the exact two audit UUIDs and transitions. Cleanup removed only those rows and
  restored the original null date before the corrected rerun.
- Parent and independent final checks confirm the original null date, exact business
  fields and zero training-audit rows. Only trigger-managed `updated_at` and expected
  Auth metadata are excluded. Local guard tests pass 3/3; syntax, targeted ESLint,
  TypeScript and whitespace validation pass.

## Protected staging recovery-source checkpoint — 29 September 2026

- The exact staging project guard accepted only `eomubndonbetszdbhsrj`. A free-plan
  disposable-project creation was attempted only after explicit approval, but the
  Supabase control plane rejected it because the account already has two active free
  projects. No project, payment, upgrade or existing-project change occurred.
- A protected staging logical backup now captures the application database, Auth and
  Storage metadata plus global role definitions with role passwords excluded. The
  database package is encrypted with AES-256-CBC/PBKDF2 (600,000 iterations), passed
  a decrypt-and-list verification and has SHA-256
  `5c3ebb6079fbc8f1e0c8544bb78fca4b9e1b418c3020283dab6d40cb5d3d1ef2`.
  Its temporary plaintext dump, globals file and tar archive were removed after
  verification; the protected encryption key is outside Git.
- The source migration ledger is exactly 006–055 (50 migrations) with digest
  `e76ad2f14c8a7723d335d6b57a7517cad01fa969358ca415355fd1b7bbc94ce4`.
  The 18-file schema catalog contains 4,146 objects and has digest
  `91dddeeadfb43b1d710dfa5574cb9d860a588ffbd103015aae01ffab27be2bd7`.
- Source inventory records 57 Auth users, 57 identities, two Storage buckets and one
  1,580,749-byte Storage object. That object was downloaded from staging, size- and
  SHA-256-verified, encrypted separately and passed decrypt-and-list verification;
  its encrypted archive digest is
  `ba7eecbd60e12ec9af6c25d7f6d99eefdd08506226df1066809a6299682b65f7`.
  Temporary plaintext object bytes were removed. No `cron` schema/job table exists
  in the staging database, so any worker schedule remains an external-platform item.
- Recovery source evidence is under the access-restricted
  `C:\protected\jingwuguan-recovery-source-20260929` directory and is not tracked by
  Git. The source side is complete, but no restore is claimed: a disposable Supabase
  target remains unavailable until a free project slot is released or a paid project
  is separately authorized. PostgreSQL 17 local-cluster tools are present and can
  provide interim database/ledger/catalog/RLS proof if that narrower target is
  approved; it cannot prove managed Auth, Storage API or platform configuration.
- Production, the retired project, providers and deferred Mux/uploader files were not
  contacted or changed.

## Local PostgreSQL recovery rehearsal — 30 September 2026

- The protected staging database package was decrypted only into the restricted local
  recovery workspace and restored into a disposable PostgreSQL 17.11 cluster bound to
  `127.0.0.1:59827`. The cluster used a separate bootstrap owner so the restored
  `postgres` role could retain its captured non-superuser attributes. All 16 captured
  Supabase roles and 22 captured role memberships were restored; the local bootstrap
  role has no direct memberships.
- The custom-format restore completed with exactly eight expected errors and no
  unexpected errors. Every error is caused by the managed `supabase_vault` 0.3.1
  extension being unavailable in standalone PostgreSQL. The restored counts are 67
  public tables, 57 Auth users, 57 identities, two Storage buckets, one Storage object
  metadata row and 50 migrations.
- The restored 006–055 ledger is semantically exact. Canonical comparison matches 17
  of 18 catalog files and 4,145 of 4,146 catalog objects; the only missing object is
  the managed `supabase_vault` extension. Explicit owner ACLs on two sequences and one
  rate-limit table were normalized to the captured source before the final comparison.
- `scripts/verify-database-security.sql` passes in a read-only transaction. Independent
  checks confirm 75 RLS relations, 11 forced-RLS relations, 69 policies, expected denial
  for both `anon` and `authenticated` on a sensitive view, no subscriptions, replication
  slots, foreign servers or cron schema, and loopback-only networking.
- Supabase CLI 2.118.0 reached the local database for linting but could not enable
  `plpgsql_check`, which is not installed in this standalone distribution. Therefore a
  new local CLI-lint success is not claimed; the repository security verifier and exact
  catalog comparison are the applicable local evidence.
- The cluster was fast-stopped and quarantined. Its PID file, listener and PostgreSQL
  processes are absent. Sanitized evidence is retained under the restricted local
  recovery workspace, while the protected encrypted source evidence remains unchanged.
  A managed Supabase restore is still required to prove Auth API, Storage object/API,
  managed extensions and platform configuration end to end.
- Production, the retired project, remote staging, providers and deferred Mux/uploader
  files were not contacted or changed during this local rehearsal.

## Normalized organization, class and dojo logos — 30 September 2026

- Ten user-supplied JPEG logos were converted from their original pixels into square
  1024 × 1024 PNG assets. Each image is centered and aspect-fit on white without
  cropping or stretching, giving video watermarks, certificates and responsive UI a
  consistent rendering contract.
- The assets are organized under `public/logos`: one organization logo, five class
  logos (Taiji/Taijiquan, Karate, Xingyi/Xingyiquan, Aikido and Kungfu Kids), and four
  dojo/affiliate logos (Chushin & Zhongxin, Kagami, UAC and Hayashitane). The app,
  service worker, certificate routes, video watermark overlay and desktop uploader now
  reference `/logos/organization/logo-js.png`; the old JPEG remains only as an
  unreferenced compatibility asset.
- Staging `eomubndonbetszdbhsrj` received exactly the five active class PNGs at
  `class-logos/{class-id}/logo.png`. Their five `classes.logo_url` values now point to
  that staging project. This repairs Aikido's retired-project URL and supplies the
  previously missing Kungfu Kids logo. Read-only postflight downloaded all five
  objects and confirmed exact byte matches, PNG signatures and 1024 × 1024 dimensions.
- Existing target objects and database URLs were captured before mutation under the
  protected local logo-upload evidence directory. The current schema has no dojo-logo
  column or workflow, so the four dojo logos remain versioned static assets rather
  than being written into an unrelated field.
- Verified: ESLint passes, TypeScript passes, application tests pass 312/312, desktop
  uploader tests pass 21/21, whitespace/stale-reference checks pass, and the 51-route
  production build succeeds. No deployment was performed and production was not
  contacted.

## Isolated browser callback-origin repair — 30 September 2026

- GitHub Actions run `36675538878` passed common checks and failed Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS in their browser steps. Public logs do
  not expose the individual assertion, but the retained artifacts and identical job
  boundary show a shared harness failure rather than a Firefox-only release defect.
- Source inspection found that the isolated browser environment removed inherited
  external target URLs without assigning `NEXT_PUBLIC_SITE_URL`. The canonical
  callback-origin boundary therefore failed closed during the valid registration
  submission exercised by every browser project.
- The fixture now binds `NEXT_PUBLIC_SITE_URL` to its fixed loopback `APP_ORIGIN`, and
  direct browser runs reject any replacement. Regression tests prove inherited
  external origins are discarded. The focused suite passes 7/7.
- A clean archive of exact commit `41b1deb` with only the two-file harness correction
  completed the production browser build and passed Chromium desktop 38/38. This
  Windows host cannot launch Playwright Firefox; replacement GitHub Actions run
  `36677366204` at exact commit `9eb570a` passes common checks, Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS.
- No live target was contacted. Production, staging, the historical project, providers
  and deferred Mux/uploader work remain unchanged.

## Worker monitoring, push logging and password-reset hardening — 30 September 2026

- Parallel audits found that malformed queue-health counters were silently converted
  to zero. The email worker now requires every migration-033 counter, the nullable
  oldest-ready age and a valid monitoring timestamp. Invalid queue data follows the
  existing sanitized HTTP 500 path; malformed memorial results make the worker
  unhealthy instead of reporting zero created announcements.
- Push delivery no longer logs raw provider or database errors. Only a generic category
  and bounded numeric provider status are retained, protecting subscription endpoint
  tokens and provider response contents. The service worker awaits client navigation
  before focus for reliable Safari-compatible notification clicks.
- A new six-test stateful suite exercises the privileged Admin password-reset apply
  route: caller/scope denial, strong temporary-password secrecy, queue payload and
  dedupe contract, existing-email idempotency, lost-response recovery and mark-failure
  retry. No generated password is returned or logged.
- Focused worker/push coverage passes 27/27; password-reset coverage passes 6/6. All
  tests are hermetic and use fictional data.
- External scheduler ownership/cadence/dead-man alerts, real Resend and dedicated-inbox
  evidence, push endpoint policy/PWA shipping and physical Safari/iOS remain open. No
  live target was contacted; deferred Mux/uploader work remains untouched.

## Push recipient lifecycle enforcement — 30 September 2026

- The service-role push route now verifies the target with a narrow server-only profile
  query requiring active status and no Date of Passing before subscription access or
  provider delivery. Disabled and deceased accounts cannot receive push through stale
  active subscription rows.
- Eligibility lookup errors fail closed and expose no database detail. Focused push and
  service-worker tests pass 12/12. No schema change was introduced and no live system
  was contacted.

## Mux uploader checkpoint — 27 September 2026

- Local release work now uses Mux Direct Uploads for all new JS Video Uploader videos.
  Existing YouTube content remains readable as legacy content; it was not migrated or
  deleted.
- The desktop preserves the two baked-in JS/class logo watermarks, contains no Mux
  secret, uploads directly to Mux with a one-time URL, and creates only a Draft after
  server-side provider/owner verification.
- Member playback is protected by repository RLS plus a server-issued RS256 Mux token.
  Mux Data tracking/cookies are disabled and no viewer name, member number or email is
  included in the token or player metadata.
- The Mux migration and its rollback-contained acceptance/postflight SQL are preserved
  under deferred paths. They have no active migration number and have **not** been
  applied to staging or production.
- Verified locally: Super App 288/288 tests, desktop uploader 21/21 tests, lint, exact
  006–054 recovery fingerprint, whitespace validation, and the 51-route production
  build all pass; both production-dependency audits report zero vulnerabilities.
- Still required before a usable Mux staging installer: create/configure the Mux API
  token and URL-signing key in protected staging/Vercel settings; assign and approve the
  next available Mux migration; deploy the release candidate; run the guarded SQL/security suite;
  perform one disposable real upload and signed Member playback; then rebuild, inspect,
  install, smoke-test and uninstall the Windows installer. Production remains untouched.

## Normalized logo staging deployment — 30 September 2026

- Release commits `c0e7310`, `9ab548b` and `2d939d1` are pushed to
  `release/v1-readiness-20260918`. GitHub Actions run `36632559544` at exact head
  `2d939d1` passes common checks, Chromium/Linux, Firefox/Linux, WebKit/Linux and
  WebKit/macOS.
- Deployment input came from a clean archive of `2d939d1`; no uncommitted deferred
  Mux/uploader file was present. An initial manual Preview inherited the retired
  Supabase public URL. The browser request guard blocked every attempted retired-host
  request before network I/O, and the staging alias was immediately restored.
- The corrected build received the 13 protected staging values at build and runtime.
  Ready Preview `dpl_D5FDeemduJDLfd86SGZ9Vmjg6Xcz` now owns only
  `jingwuguanseibukan-staging.vercel.app`; its deployment metadata names exact commit
  `2d939d1` and branch `release/v1-readiness-20260918`.
- The host probe now validates the organization logo as `image/png`. All 11 staging
  route/method/security-header probes pass, followed by 18/18 guarded read-only WebKit
  tests across desktop, tablet and mobile. Member 0101, scoped Admin 0002 and Super
  Admin 0001 remained within the approved staging backend.
- All ten deployed static logo assets return HTTP 200 `image/png`, have exact
  1024 × 1024 dimensions, and SHA-256-match their committed files. Production was not
  deployed or contacted; the retired project received no guarded browser request.

## Dormant Web Push endpoint and subscription-state hardening — 1 October 2026

- Subscription create/delete now accepts only HTTPS endpoints on the reviewed browser
  push services: Google FCM, Mozilla Push Service, and Apple Web Push. Credentials,
  custom ports, fragments, root/double-slash paths, deceptive hostnames, control
  characters, oversized values, arbitrary domains, IP addresses, and localhost are
  rejected before any database RPC.
- Stored subscription endpoints are independently revalidated immediately before a
  provider request, so historical or externally inserted invalid rows fail closed
  without network access.
- Browser enable/reset flows now preserve consistency across the browser and database:
  a failed create removes only a newly created browser subscription, while a failed
  delete retains the existing browser subscription. Reset does not proceed after a
  persistence failure.
- Focused route, endpoint and client-state coverage passes 29/29. The complete
  application suite passes 336/336; ESLint, TypeScript, whitespace validation, and the
  optimized 51-route production build pass.
- Push/PWA settings remain deliberately hidden. No live database, deployment, push
  service, staging, production, retired project, or other provider was contacted.
  Physical Safari/iOS delivery, real provider failure behavior, and the product
  decision to expose push remain external gates.

## Production-target, email-runtime and installer acceptance hardening — 1 October 2026

- A new offline production-target gate binds the future exact 20-character project
  reference to Singapore (`ap-southeast-1`), its HTTPS Supabase origin, and either its
  direct database host or Singapore session pooler on port 5432 with
  `sslmode=require`. It rejects staging, the retired project, wrong/mismatched regions
  and projects, the transaction pooler, unsupported connection options, and never
  prints the database URL or password. Dashboard ownership and region still require an
  independent operator check before the first read-only connection.
- The email worker now has a default 45-second invocation budget and 10-second Resend
  request timeout. Both accept only bounded overrides. It stops claiming new messages
  once the budget is exhausted and returns monitored HTTP 503 rather than overlapping
  the next scheduler tick silently. Existing idempotency and retry handling remain in
  force.
- Privileged deceased-member and memorial API failures now log only bounded failure
  categories. Database/Auth error objects, identifiers, hints, and provider detail are
  excluded from both responses and server logs.
- The Windows uploader now includes a guided acceptance runner that verifies the exact
  installer hash, refuses to overwrite an existing per-user installation, requires a
  visible installed application window, invokes only the captured product uninstaller,
  verifies registry/install-directory removal, and writes JSON evidence even on
  failure. Preflight passes for the current 156,411,382-byte staging installer at the
  approved SHA-256; full interactive install/launch/uninstall remains a real-desktop
  user acceptance step, and the package remains unsigned.
- Combined verification passes 346/346 application tests, 22/22 uploader tests,
  50/50 focused release tests, ESLint, TypeScript, whitespace validation, and the
  optimized 51-route production build. No staging, production, retired project,
  deployment, database, scheduler, inbox, or provider was contacted.

## Production configuration, restore evidence and release-window gates — 1 October 2026

- Production provider validation now binds the future exact production Supabase URL
  and project reference to role-correct publishable/secret credentials. It accepts the
  reviewed modern key formats or legacy JWTs with exact role/project claims, and
  rejects aliases, placeholders, control characters, staging/test residue and any
  non-production Vercel environment. Values remain redacted.
- The recovery manifest is now version 4 and cryptographically identifies the exact
  protected backup payload by source project, capture time, format, byte count and
  SHA-256. Placeholder provenance, stale evidence, incomplete Auth/Storage recovery,
  ledger drift and production mutation fail closed.
- A two-pass offline staging Auth/email acceptance preflight now requires the exact
  staging target, dedicated inbox, three protected security-test identities, isolated
  class/dojo UUIDs, strong disposable passwords, current catalog evidence and a
  reviewed cleanup plan covering Auth users and identities, profiles, class requests,
  password-reset requests and email outbox rows. Its second-pass authorization token
  is an HMAC over non-secret scope. The live registration/confirmation/delivery test
  remains intentionally unrun until current catalog and cleanup evidence are supplied.
- A release-window validator now binds the release and rollback SHAs, deployment IDs,
  Sydney time window, named owners, independent commit verification, a recovery point
  captured within 24 hours, tested rollback, external approvals and explicit stop
  conditions. The checked-in template is deliberately incomplete and cannot authorize
  a release.
- Combined verification passes 367/367 application tests and 42/42 focused gate tests,
  ESLint, TypeScript, whitespace validation, and the optimized 51-route production
  build. No staging, production, retired project, deployment, database, inbox,
  scheduler or provider was contacted.

## External-gate evidence and installer trust hardening — 1 October 2026

- Staging Auth/email preflight now requires two distinct, non-empty protected evidence
  files outside the repository and verifies their real SHA-256 values before issuing
  the HMAC review token. Invalid credentials or any other blocker also prevents token
  issuance. A live run still needs a dedicated deliverable inbox, reviewed staging
  class/dojo UUIDs, current catalog evidence, an independently reviewed cleanup plan,
  disposable passwords and the second-pass token.
- Complete recovery can no longer be claimed from the local PostgreSQL drill. The v4
  gate requires a disposable managed Supabase target, a SHA-256/size-bound finalized
  sanitized evidence bundle, explicit-offset timestamps, in-window component evidence,
  and protected proof that the disposable target was deleted or quarantined.
- Full physical JS Video Uploader acceptance now requires the independently approved
  installer SHA-256 before launch, an interactive Windows x64 session and JSON-only
  evidence output. It refuses an existing exact installation and never silently
  removes a partial installation after failure. Non-installing preflight still passes
  for the 156,411,382-byte unsigned candidate at SHA-256
  `1B4C760EB6FEF6A36B819DDFBA6877D66466B77C5004E8EA7F0A820578F67464`.
- A new secret-free scheduler manifest gate requires the exact worker POST endpoint,
  60-second cadence, single non-overlapping execution, bounded timeouts, protected
  header injection, retained failures, queue-health monitoring, approvals and an
  empty-queue acceptance with zero provider requests. Its template intentionally
  fails until an external scheduler and plan are selected and verified.
- Verification passes 378/378 application tests, 37/37 combined focused gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace validation and the optimized
  51-route production build. No software was installed, launched or uninstalled and
  no live host, database, inbox, provider, production or retired project was contacted.

## Release evidence binding and dependency security — 1 October 2026

- A current dependency audit found the installed Next.js 16.3.4 line affected by the
  published authorization-bypass advisory. Next.js and `eslint-config-next` are now
  pinned to 16.3.8; transitive `brace-expansion` copies are updated to 1.1.21 and
  5.0.12. Full and production-only application audits and the JS Video Uploader audit
  each report zero known vulnerabilities.
- Added a physical-Safari evidence gate for one real Mac, iPhone and iPad. Every
  session must be read-only, use dedicated non-personal accounts, meet independently
  supplied minimum OS/Safari versions, and bind its protected evidence hashes to the
  exact release commit and staging deployment. WebKit, simulators and emulators do
  not count. Unknown fields and sensitive field names cannot be echoed.
- Added a production identity-inventory gate. Separate Auth and read-only database
  captures must be fresh, complete and count-consistent, use three distinct non-PII
  actor fingerprints, and carry canonical project/policy/query-bound provenance and
  review-attestation hashes. Dummy, security-test, unreviewed, missing, orphaned or
  duplicate identities remain hard blockers.
- Added a strict monitoring/incident/rollback evidence gate bound to the exact release
  commit and deployment. It requires an exact sanitized schema, all-non-success email
  worker alerting, application/Auth/database/Mux coverage, tested escalation and
  rollback, and either hidden Web Push or complete push failure monitoring and alert
  acceptance.
- The final release-window gate now requires three distinct SHA-256 manifest digests
  for physical Safari, production monitoring and production identity evidence. Their
  commit, deployment, project and policy bindings must agree with the release record;
  bare approval booleans can no longer certify these gates.
- Verification passes 408/408 application tests, 35/35 focused readiness tests,
  ESLint, TypeScript, whitespace validation, JSON-template parsing, dependency-tree
  verification, and the optimized 51-route Next.js 16.3.8 production build. No live
  host, database, account, deployment, inbox, provider, production or retired project
  was contacted or changed.
- Production remains blocked on operator-controlled evidence: creation and independent
  verification of the Singapore production project, managed Supabase restore,
  dedicated-inbox Auth/email delivery, external scheduler and live monitoring,
  physical Safari devices, interactive signed-installer acceptance, removal of any
  production test identities, and a separately approved release window.

## Final production bootstrap, signed-installer and CI evidence gates — 1 October 2026

- Added a fail-closed production bootstrap validator and deliberately incomplete
  manifest. It requires an exact new empty Singapore Supabase target, read-only
  inventory evidence, the protected pre-006 baseline, the immutable 006–056 migration
  contract, matching source ledger, import/recovery evidence and independent review.
  It explicitly rejects using migrations 006–056 as an empty-database bootstrap and
  performs no production mutation.
- Added a signed Windows uploader release validator and evidence template. It binds the
  exact installer SHA-256 and size to the release commit, requires a valid Authenticode
  signature and trusted timestamp, a current clean malware scan, secret-free packaged
  configuration, and physical Windows x64 install/launch/staging-sign-in/local-video/
  uninstall evidence. The acceptance boundary prohibits Mux upload, Repository Draft
  creation and provider or production contact.
- Expanded the final release-window validator from three to eleven distinct evidence
  digests. Rollback, recovery, physical Safari, monitoring, production identity,
  managed restore, production target/bootstrap, production secrets, provider delivery,
  scheduler and signed installer evidence must all pass and agree on the exact release,
  deployment and production project. Bare approvals cannot substitute for evidence.
- Strengthened GitHub CI so its common release job now runs full and production-only
  dependency audits, lint, all tests, the optimized production build, and the complete
  JS Video Uploader build/test/audit suite. Regression tests keep the workflow
  secret-free and prevent it from authorizing deployment.
- Local verification passes 432/432 application tests, 30/30 focused gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace validation, JSON-template
  parsing, the optimized 51-route production build, and all three dependency audits
  with zero reported vulnerabilities. No live host, database, deployment, account,
  inbox, scheduler, provider, production or retired project was contacted.

## Production secrets, provider delivery and evidence-packet closure — 1 October 2026

- Added an offline production-secrets gate that composes the existing provider check
  and binds the complete 19-value environment to the exact Singapore project, release
  commit, production deployment and Vercel Production environment. It enforces modern
  role-correct Supabase credentials, strong distinct worker/push/rate-limit secrets,
  matching VAPID keys, valid Resend/Mux configuration, ten explicit ownership/access/
  rotation records, fresh independent review, and zero staging or test residue.
- Added a provider-delivery evidence gate covering dedicated non-role inbox policy,
  Resend sender/domain/SMTP evidence, Auth confirmation and reset, Member/event/worker
  delivery, retry/backoff/exhaustion, and guarded staging Mux upload/signed-playback/
  cleanup. Keyed HMAC fingerprints bind every recipient without storing reversible
  mailbox hashes; canonical review binds every accepted outcome and timestamp.
- Strengthened the production scheduler and monitoring gates with exact project,
  release, deployment and endpoint binding; one-minute single-flight scheduling,
  bounded timeouts, protected header handling, retained failures, complete queue
  telemetry, live alert acceptance, 24-hour freshness and normalized independent
  reviewer checks. Monitoring evidence is now also project-bound in the release window.
- Added a release evidence-packet verifier. It independently loads the protected
  release-window file and all eleven evidence files, rejects repository/network paths,
  links, malformed or duplicate files and release/evidence reuse, and verifies exact
  raw-byte SHA-256 agreement. It does not replace any semantic child validator.
- Independent reviews fixed ambient-environment override of the protected production
  env file, incomplete provider attestation coverage, guessable recipient hashes,
  evidence-file reuse, forward-slash UNC paths and case/whitespace reviewer aliases.
- Verification passes 473/473 application tests, 67/67 focused combined gate tests,
  27/27 uploader tests, ESLint, TypeScript, whitespace and template checks, the
  optimized 51-route build, and full/production/uploader audits with zero reported
  vulnerabilities. No staging, production, retired project, database, deployment,
  inbox, scheduler or provider was contacted.

## Semantic rollback evidence gate — 1 October 2026

- Added `rollback-readiness.mjs`, a protected template and operator guide. The gate
  binds the exact release and known-good commits/deployments to a non-production
  application rollback rehearsal and replacement-target managed database recovery.
- It requires staging auth/authorization/host probes, restoration of the candidate,
  exact ledger `006-056`, catalog/lint/grants/RLS/role checks, decision deadline and
  RTO compliance, distinct evidence digests, zero production/provider contact and
  deletion or quarantine of the disposable target.
- The CLI enforces protected regular files outside the repository and provides a safe
  digest-generation pass. Canonical review covers every accepted evidence field;
  impossible dates, understated durations and substituted Vercel deployment IDs fail.
- The release evidence packet now semantically validates rollback evidence using the
  release-window identities and cross-checks `decisionDeadlineMinutes`. A valid hash
  cannot substitute invalid or self-bound rollback JSON.
- Verification passes 488/488 application tests, 33/33 focused tests, 27/27 uploader
  tests, ESLint, TypeScript, whitespace validation, the optimized 51-route build and
  all three dependency audits with zero reported vulnerabilities. No live system was
  contacted.

## Production cutover evidence gate — 1 October 2026

- Added an offline, fail-closed production-cutover validator and deliberately
  incomplete protected manifest template. It binds the exact immutable release and
  deployment to an independently supplied Singapore production project, dashboard
  ownership/region evidence, exact migration ledger 006–056, catalog, database lint,
  strict security verification, grants and RLS.
- The gate requires the managed-platform future-object default ACL to be resolved or
  covered by the single documented narrow exception with independent security review
  and an expiry within 30 days. It also requires fresh read-only Member, scoped Admin
  and Super Admin acceptance with reviewed existing accounts, expected Auth-session
  writes and no attempted application mutation.
- Production DNS/TLS, exact Site URL and `/auth/confirm` redirect, public Supabase
  binding, all 11 host probes, browser auth, redirects, security headers, zero server
  errors, zero application/domain acceptance writes and rollback reachability are mandatory. Staging,
  retired-project, provider, test-account and member-record contact all fail closed.
- The release-window gate now requires the production-cutover approval and sanitized
  passing summary. The final evidence packet expands to twelve distinct protected
  files and semantically reruns both rollback and cutover validators against
  independently supplied identities; matching hashes cannot make placeholders or
  self-bound records pass.
- Verification passes 507/507 application tests, 40/40 focused cutover/window/packet
  tests, 27/27 uploader tests, ESLint, TypeScript, whitespace validation, the optimized
  51-route production build, and full/production/uploader dependency audits with zero
  reported vulnerabilities. No live host, database, deployment, account, inbox,
  provider, production or retired project was contacted.
- Production readiness remains approximately 9.5/10. Remaining work is execution of
  the operator-controlled gates and separate production authorization: create and
  verify the Singapore project, managed restore, production secrets and delivery,
  scheduler/monitoring, physical Safari, signed installer, identity cleanup, approved
  cutover, then the final protected release-window and twelve-file evidence packet.

## Milestone 181 — email or JS Member ID login — 2 October 2026

- Implemented locally after explicit approval. The web login accepts email or exact
  `profiles.registration_number` plus password, preserving leading zeros. Aikikai
  numbers and usernames are not aliases. Pending applicants continue using email;
  existing post-login approval/role routing and desktop uploader email login remain.
- The server resolves the ID privately through the profile UUID and authoritative
  Auth email. Ambiguous IDs, unconfirmed users, identity mismatch, disabled/deceased
  profiles, missing profiles and backend failures cannot issue browser cookies.
  Failed post-auth validation revokes the newly issued session best-effort. Successful
  replacement clears only the current project's stale session cookie chunks.
- Exact configured-origin checks, an 8 KiB streamed body limit, durable global/client/
  identifier limits, generic errors, no credential logging and a one-second rejection
  floor are included. The floor reduces simple timing probes, but network timing can
  still vary. Live validation must confirm the existing rate-limit secret and grants.
- Local checks: `npm test` passes 529/529 including TypeScript; ESLint passes; the
  optimized production build passes (52 generated pages) with synthetic configuration.
  Focused login, frontend, public-form and staging-guard tests pass 49/49. The local
  Chromium-desktop and WebKit-desktop browser suite passes 78/78. Its initial run
  passed 77/78; the new WebKit JS-ID test was corrected to wait for hydration and
  verify the entered value before submission, then both projects passed on rerun.
  No migration was needed. No staging/production database or provider was contacted,
  and this milestone is not committed, pushed, deployed or live-verified yet.

### Approved staging release follow-up — 2 October 2026

- Committed the 19 intended login, test and documentation files as `ed15327` and
  pushed to `release/v1-readiness-20260918`. Existing `supabase/.temp` changes were
  excluded and preserved. Added exact JS-ID role checks for Member 0101, Admin 0002
  and Super Admin 0001 on all three guarded WebKit device projects (27 total cases).
- TypeScript and 24 focused login/target-guard tests passed again before the commit.
  GitHub Actions run `36971234524` passed all five jobs: common checks, Chromium/Linux,
  Firefox/Linux, WebKit/Linux and WebKit/macOS.
- After the user restored Vercel sign-in, exact commit `ed15327` was built as Ready
  Preview `dpl_5tjVrPaXs7yuyywmwUkefoNfEtVx` (53-second build). Existing CLI access
  assigned only `jingwuguanseibukan-staging.vercel.app` to
  `jingwuguanseibukan-e1vrid5dg-js1-ccd7.vercel.app`; no production promotion occurred.
- All 11 staging host probes and required security headers passed. The new login
  label is deployed. The login bundle no longer includes the Supabase client, so
  backend binding was verified from registration bundles: only
  `eomubndonbetszdbhsrj.supabase.co` was present.
- `npm run test:browser:staging:read-only` passed 27/27 in 4.0 minutes: desktop,
  tablet and mobile WebKit each verified registration catalog, invalid confirmation,
  email login for all three roles, Member/Admin denied routes, Super Admin readers,
  unknown-certificate handling, and exact JS-ID login for 0101, 0002 and 0001.
  The request guard reported no application mutation, unapproved RPC or off-origin
  browser request. This is not a separate database-wide zero-residue audit or a
  substitute for physical Safari/iOS testing.
- No production, retired project or outbound delivery/video provider was contacted.
  No database migration or business-record mutation was performed. Authentication
  sessions and HMAC-keyed login rate-limit counters are expected operational writes.

## Approved web-first release scope — 2 October 2026

- The user approved updating V1 to a web-first launch after confirming that no
  Windows code-signing certificate is available. The Windows uploader is deferred
  and withheld from production distribution, not marked tested or released.
- Release-window and evidence-packet validators now require explicit `release.scope`:
  `web-only` or `web-and-windows-uploader`. Web-only requires confirmation of
  `approvals.windowsUploaderWithheld`, excludes installer evidence rather than
  treating it as passed, and requires eleven distinct final evidence files (ten
  pre-cutover). Combined releases retain twelve final files and the existing signed
  installer requirements. Missing/unknown scopes fail closed.
- Updated both release templates, deployment runbook, evidence-packet instructions,
  installer deferral notice and current TODO scope. Existing protected manifests
  must be deliberately updated with scope; no protected evidence was changed or
  fabricated. All web recovery, security, identity, provider/Mux delivery, scheduler,
  monitoring, physical Safari, production target/secrets and cutover gates remain.
- Verified locally: `npm test` passes TypeScript and 537/537 tests; the focused
  release-window/packet suite passes 34/34; `npm run lint`, `git diff --check` and
  parsing of both updated JSON templates pass. Eight new regression tests cover
  scope validation, distribution withholding, evidence counts, retained web gates,
  and missing/unsigned/misbound installer rejection for combined releases.
- No application UI, database migration, credential, uploader binary or standalone
  installer validator was changed. No build/browser/live provider tests were rerun
  for this offline release-policy change. No live systems were contacted. Changes
  were prepared on top of `34e43c4`; pre-existing Supabase temporary
  metadata changes were preserved. Production creation, import and deployment still
  require separate explicit authorization.
- Follow-up local commit review reran all 34 focused release-window/packet tests and
  whitespace validation successfully. Only the eleven intended scope-change files
  are included in the local commit; Supabase temporary metadata is excluded. No
  push, deployment or remote CI run is part of this follow-up. The next publication
  step requires approval to push the commit and run GitHub CI; managed recovery,
  physical Safari and the separately approved production setup remain open.

### Web-first remote CI verification — 2 October 2026

- Pushed only reviewed commit `7471c44d85c5c5dda14e64e73cef1050fa04f76b` to
  `release/v1-readiness-20260918`. GitHub Actions run `37002672716` completed
  successfully at that exact SHA. All five jobs passed: common checks,
  Chromium/Linux, Firefox/Linux, WebKit/Linux and WebKit/macOS.
- The common job passed dependency audits, lint, TypeScript/application tests,
  production-mode build and desktop uploader tests/audit. Browser jobs used isolated
  synthetic fixtures; automated WebKit is not physical Safari acceptance.
- No staging alias was reassigned, no production or retired project was contacted,
  and no database, provider or member record was changed. A new Vercel Preview's
  existence/readiness was not verified; GitHub CI success is not deployment evidence.
- Remaining execution gates include physical Safari, managed-platform restore,
  production target/bootstrap, secrets/provider delivery, scheduler/monitoring,
  identity cleanup, rollback and separately approved cutover. Windows installer
  distribution remains deferred under the approved web-only scope.
- This verification entry is a local documentation update; it is not included in
  the remotely tested commit and has not been pushed.

## Approved staging backup refresh — 2 October 2026

- With explicit user approval, captured only staging `eomubndonbetszdbhsrj` through
  its exact project-bound Sydney session-pooler identity with verified TLS and
  read-only transactions. A shared repeatable-read snapshot binds the custom-format
  database dump, ledger, catalog and Storage metadata. Global roles were captured
  separately with role passwords excluded; no managed restore was performed.
- New current-user-only backup folder:
  `C:\protected\jingwuguan-recovery-source-20261002-b23c1337`.
  The package contains database/Auth/Storage metadata, roles, the exact 51-entry
  006–056 ledger, 18 catalog files (4,151 objects), and all six Storage objects
  totaling 3,412,943 bytes. Counts include 57 Auth users, 57 identities, two buckets
  and 67 public tables. Storage metadata and ledger were unchanged on the final
  source check; Storage bytes are a separate service capture, not an atomic database
  snapshot. Role globals likewise are not snapshot-bound.
- Source-ledger SHA-256:
  `4e5c16b7bd06b98c814054c10da5337ec916f9a8a984a83a84fdcf2902ed2c4a`.
  Catalog SHA-256:
  `fbce4bc17f17cccd723c01b508798991c3d4e37cf75a22ff7da0e2fc1077be5f`.
  The immutable repository 006–056 migration contract passed independently.
- The new archive uses AES-256-GCM with a fresh random key and nonce. Its protected
  `encryption.json` records format, nonce and authentication tag; the separate
  `recovery-backup.key` remains in the restricted folder and must never enter Git.
  Archive SHA-256 is
  `082c1adcb3435c8052570fadf21a04f960442cf2c3a1b31aac0518d533facfc2`.
  Authenticated decryption, byte-length/SHA-256 comparison and tar listing passed;
  the custom dump's local `pg_restore --list` check also passed. This is not a
  database restore or validation of managed Auth/Storage API recovery.
- Temporary plaintext dump, SQL, catalog, ledger, object bytes and tar verification
  files were removed only after successful verification. An independent follow-up
  confirmed the new ciphertext hash, exactly four retained protected files, no
  plaintext directories, and unchanged hashes for both September encrypted archives.
  Existing and new backups are retained pending a separately approved retention
  decision. No source data was deleted or changed.
- No production/retired project, Resend, Mux or push provider was contacted; no
  project, paid resource, deployment or migration was created. Hosted Auth settings,
  provider secret custody, scheduler settings and managed restore/recovery acceptance
  remain unverified by this package. The disposable project capacity limit was not
  rechecked. Physical Safari remains a separate open gate.
- Backup scripts are retained in the local task's `staging-readiness` directory;
  only sanitized evidence is recorded here. Documentation updates are local and
  uncommitted; no additional remote CI or deployment is claimed.

## Approved old-project pause and disposable recovery target — 2 October 2026

- The user explicitly authorized disabling the old project to free a slot for the
  new restore-test project. This narrowly supersedes the prior no-contact restriction
  for the old project's management-plane pause only; it does not authorize old
  database access, deletion, migration, production deployment or domain cutover.
- Verified organization `uqbibabcmufzxetfoqqw` was Free and exact old project
  `pkmllhaavadhaozmwapz` was named `js-repository`. Submitted one pause request,
  observed `PAUSING`, then independently verified `INACTIVE`. The old project was
  not deleted; anything relying on that old backend is now unavailable while paused.
- Created exactly one project `js-recovery-rehearsal-20261002`, reference
  `wtnonpldqvzipqmwgbru`, in Singapore (`ap-southeast-1`) on the existing Free
  organization. Independent account inventory confirmed `ACTIVE_HEALTHY`, old
  project `INACTIVE`, staging `eomubndonbetszdbhsrj` still `ACTIVE_HEALTHY`, and
  organization plan still Free. No paid add-on or upgrade was requested.
- Generated a fresh database password and saved it only in current-user-only
  `C:\protected\jwg-database-access-06ca13cacc0b4a649c11a5e41476da26\managed-recovery.env`.
  No credential value was printed or committed. This is a disposable recovery
  target, not the future production project, and neither source credentials nor
  website/deployment aliases were repointed to it.
- No backup import, database query, schema mutation or managed restore acceptance
  was run against the new target. Outbound isolation must be configured and verified
  before any restore; no such isolation is claimed yet. The next step is guarded
  isolation/preflight of this exact empty target, followed by the approved staging
  backup rehearsal and recovery/security checks. Physical Safari remains open.
- Updated documentation remains local/uncommitted. No app deployment occurred.

# Finance 059–060 rehearsal plan — 8 October 2026

Latest, 14 October 17:31 Sydney: approved corrected POST-COMMIT acceptance PASSED
on staging only. Exact Z0590 rollback, independent aborted-transaction/backend-gone
proof, 67-table/six-sequence zero residue, exact 006–060 ledger and three preserved
actors verified. No migration reapplied. The postcommit-acceptance-02 journal is
consumed successfully and must not be reused; previous failed journals remain
historical. Active migration/recovery-contract synchronization is now the next
local task. See finance-postcommit-acceptance-review-20261014.json.

Latest, 14 October 17:28 Sydney: the connection gate is resolved. Local reproduction
identified the missing flush for small interactive writes; corrected staging READ
ONLY two-backend probe passed, readers closed cleanly, zero witness sessions remain.
An additional UTC/local DateTime diagnostic bug was fixed in a new read-only probe,
preserving the failed source/evidence. Corrected -02 acceptance runner is prepared
but NOT run; its journal is absent. New approval is required for the one corrected
rollback-contained acceptance attempt. See finance-observer-flush-review-20261014.json.

Latest, 14 October 09:14 Sydney: the new full 006–060 post-commit READ ONLY
preflight passed, but its concurrent observer timed out before the mutation client
was invoked. No rollback fixture ran and no migration was reapplied. The consumed
postcommit-acceptance-01 claim/evidence must not be retried or reused. A separate
read-only connection diagnostic confirms zero remaining acceptance sessions; the
observer timeout cause remains unverified. Typecheck +858 unit tests and local PG17
finance/concurrency tests pass. See finance-postcommit-review-20261014.json.

Current status: one approved rollback rehearsal VERIFIED on 14 October 2026;
subsequently approved 059 then 060 application committed once on staging only.
The exact saved ledger is 006–060. In-transaction savepoint acceptance passed.
Corrected independent READ ONLY reconciliation passed at 08:57 Sydney on 14 October;
committed transaction, full catalog/data/sequence/actor baseline and exact ledger
were verified. Post-commit rollback acceptance has not run. Preserve the earlier
pooled-backend stop and stalled capture as history; DO NOT reapply migrations. See
finance-staging-reconciliation-review-20261014.json and the historical
finance-staging-application-review-20261014.json. The original rehearsal plan and
historical approval boundaries below remain historical, not new execution authority.
Target: staging `eomubndonbetszdbhsrj` only. No production, retired/disposable project,
delivery provider, external monitor or browser login is part of this rehearsal.

## Verified live rehearsal — 14 October 2026

See finance-staging-rehearsal-review-20261014.json. Seven fresh read-only inputs,
one rollback-contained mutation connection, four independent read-only after-checks.
The positive guard/account recheck, 059/060 bodies and three-account assertions all
passed and reached Z0590. Closure proves xid aborted and mutation backend absent.
Full public baseline (67 tables, 6 sequences), exact ledger 006–058 and actor
digests match before/after; all required different-backend gates passed unchanged.
Fixed journal C:\protected\jwg-finance-059-060-staging-rehearsal records verified-rollback
at 2026-10-13T21:17:09.834Z. It is consumed and must not be cleared or reused.

Local preparation stopped before connections because the existing encrypted
credential has createdUtc. Reader now supports that exact writer shape with strict
UTC validation and rejects unknown fields; credential bytes/ACL/target unchanged.
Only the verified empty unclaimed folders were resumed after local tests. No remote
retry. Typecheck +845 tests and focused lint/syntax checks pass.

Next requires separate explicit permanent-application approval for staging 059,
then 060 and guarded post-application acceptance. No production/other project,
delivery provider, account reset, commit, push or deployment occurred. Do not reuse
expired evidence or interpret this rehearsal as permanent application authority.

## Approved live read-only refresh — 13 October 2026

Completed seven fixed-query staging-only captures at 08:05:30–08:05:47 UTC;
offline verification passed at 08:05:49 UTC. Private directory:
C:\protected\jwg-finance-readonly-a823c8874a05448db72f977a3e684fee.
See finance-readonly-evidence-review-20261013.json for receipts and limitations.
Verified TLS/read-only state, capabilities, prerequisites, exact 53 migrations
(006–058), 67 public tables/6 sequences and three independently bound test actors.
Protected loader and complete offline assembly passed; no SQL bundle executed.

One backend served all sequential read-only connections. This does not prove
independent mutation closure or reconciliation. Keep those gates unchanged.
The five-minute evidence window is NOT extended by this report. A separately
approved rollback rehearsal must capture fresh inputs immediately before execution,
then independently reconcile and preserve all outcomes. No automatic refresh/retry
or write authorization is implied by this completed read-only batch. 059–060 remain
unapplied, with permanent application and deployment separately gated.

## Reviewed protected preparation boundary — 13 October 2026

Use prepareReviewedFinanceStagingRehearsal (finance-reviewed-staging-preparation.mjs)
as the future restricted entry point, not the low-level arbitrary-bundle factories.
It accepts target, nonce, protected evidenceFiles and pinned credential/client/CA
resource paths/hashes only. It loads/validates private captures, assembles exact
reviewed SQL, and wires the existing fixed protected controller. No dispatch,
credential decryption, resource execution or journal claim occurs in preparation.
An immutable hash-only receipt is returned; no raw SQL or account data is exposed.

runApproved is separate and requires the exact receipt project/nonce/bundleSha256
and operation rollback-contained-059-060-staging-rehearsal. An acknowledgement
proves only intent to run those bytes, not authorization: obtain explicit human
permission for a rollback-contained staging write rehearsal before invoking it.
No CLI added. Existing controller rechecks fresh evidence before claiming the
one-use fixed journal and performs independent closure/baseline/ledger/actor checks.

Verification: typecheck +843 tests pass (zero failures/skips), including thirteen
protected-loader/preparation and four assembler tests; focused lint/whitespace pass.
Local synthetic integration tests validate preparation and reject mismatched
acknowledgements; NEVER execute a matching acknowledgement using synthetic evidence.
The unmodified guard intentionally rejects loopback; a successful complete live
path is still unverified. Do not add a local bypass or label simulated tickets as
live guard evidence. Next external gate is separately approved read-only capture
of fresh baseline/capability/ledger/actor-binding evidence. That approval does not
permit the write rehearsal or persistent migration application. Preserve historical
and failed evidence; no remote retries or cleanup writes are implicitly authorized.

## Pinned offline assembly — 13 October 2026

scripts/finance-staging-rehearsal-bundle.mjs now reads the exact four pinned source
files (059, 060, separate staging fixture and assertions); it does not accept SQL or
paths from callers. Guard validation snapshots evidence before asynchronous work.
Fixed framing is BEGIN READ WRITE, statement/lock/idle timeouts 15s/3s/15s and
plpgsql.check_asserts=on. The server/account guard precedes the first result row
(xid8 identity), then 059, 060, fixture/assertions and the exact nonce Z0590 sentinel.
No COMMIT is present. completeBundle=true means assembled, NOT execution approved;
readyToExecute=false remains mandatory. No credentials or protected journal touched.

Ten focused tests cover byte tampering, order, immutable evidence and override
rejection. npm test passes typecheck +840 tests; focused lint passes. Final actual
PG17 run rejects the unmodified bundle on loopback before work and passes existing
rollback/fixture/concurrency checks; js-fee-test-Ub8hiK stopped (earlier oK3sdJ too).
This proves rejection only, not positive TLS/guard execution or live provenance.
Before live approval: complete positive integration and restricted executor wiring.
The future runner must enforce ON_ERROR_STOP, client closure, independent aborted
transaction observation and complete catalog/data/sequence reconciliation; the
sentinel alone cannot establish zero residue. No live capture or migration performed.

## Separate fixture component — 13 October 2026

New files are separate from the unchanged loopback fixture/negative controls:

- tests/sql/059_060_staging_fixture.sql: SHA256 66d9cb9f3ce6c0836e3c67bf0a6cdc9ee3560145dafb3c2f5d2c6ca3c152aaea.
- tests/sql/059_060_staging_fixture_assertions.sql: SHA256 1859df0eea2b855a42306eaf9ba7cfe244abd3b2fad68c9b850482c9d8e14066.

These are components, NOT standalone release commands. The eventual pinned
assembler must ensure the pre-work server/account guard runs before migration and
fixture work. That guard emits a transaction-local project/nonce/bindings ticket;
the fixture requires matching application_name, postgres owner, read-write mode,
enabled assertions and exact JS0101/0002/0001 eligible profiles, then consumes the
ticket. A caller-set ticket is not security authority or target verification.

All fixture inserts use captured random UUIDs in a temporary ID manifest. Existing
profiles, memberships and assignments are never modified. Owner-only baselines
remain private; authenticated gets only fixture IDs. Three-account assertions cover
waiver, pending versus paid status, preserved skipped debt, scoped confirmation,
Member/Admin/Super Admin and missing-claim reads, denied direct charge writes,
exact five in-app fixture alerts and unchanged original records/audit/outbox/
identity sequences. No fourth account, monthly generator, Auth write or COMMIT.

Local PG17 body integration explicitly SIMULATES the ordering ticket and adds JS
IDs only to disposable synthetic schema. It does not bypass or alter the staging
guard and does not claim positive TLS guard coverage. Missing/wrong ticket,
duplicate actors and original-profile mutation are rejected; independent complete
public catalog/data/sequence baselines remain unchanged after every rollback.
Full local finance rollback and eleven races pass; js-fee-test-s2AGKM stopped.
Final npm test passes typecheck and all 836 tests, zero failures/skips; focused
ESLint and whitespace checks pass. Branch/HEAD remain 319fb20 on the release branch.

Remaining: pinned semantic assembler, positive guard/assembly integration and final
review, then explicit approval for fresh live evidence and any write rehearsal.

## Pre-work guard component — 13 October 2026

prepareFinanceStagingRehearsalGuard is an offline component, not an executor or
complete bundle. Exact target, nonce, protected baseline and complete release
evidence are mandatory. It copies buffers and validates freshness/content/server
identity before generating transaction-local application_name/search_path/timezone
and a DO guard. Before any account SELECT or future migration work it checks the
expected server address/port/cluster, postgres database/user/current role, TLS,
read-write transaction, nonce and evidence freshness. The unchanged SELECT from
the fully pinned v2 actor query then recomputes the three actors and requires exact
JSONB equality with the verified capture, including profile/membership/scope hashes.

The final assembler must frame BEGIN, bounded timeouts, this guard, transaction
identity, reviewed migration bodies/fixture/assertions and exact rollback sentinel
in a reviewed order. This component supplies none of that remaining assembly and
grants no live authority. Its embedded account evidence is private; do not log SQL.
Current preparation flags explicitly remain completeBundle/readyToExecute false.

Three offline tests pass. The unmodified guard was executed against disposable
loopback PG17 and rejects wrong-server/non-TLS/read-only contexts before subsequent
work. Positive staging/TLS/account comparison is NOT yet execution-tested. Existing
local-only fixture guards and fourth-actor/sequence-negative tests were preserved.

Full PG17 regression initially failed a test-only client/server clock-ordering
assertion. The retained-client model now witnesses release on the server clock;
actual clientFinishedAt checks are unchanged. Rerun passed rollback and all eleven
races. Both synthetic clusters stopped, no backup/real data accessed.
Final application regression passes typecheck and all 833 tests, zero failures/skips;
focused ESLint and whitespace checks pass.

## Version-2 preflight capture integration — 13 October 2026

New exclusive CaptureReleaseLedger and CaptureReleaseActors modes reuse the bounded
protected preflight transport. Both require ConfirmReadOnlyStaging and
ConfirmSessionPooler, private EvidenceDirectory and pinned Node/client/CA resources.
The actor mode additionally requires ActorBindingsPath and ActorBindingsSha256;
the bytes must be owner-private, bounded, independently sourced and hash-matching.
Do not derive bindings from the returned accounts or copy identity into old captures.

The planner accepts only ledger/actors, loads the already pinned version-2 queries
and accepts no caller SQL. It validates actor bindings before any query. Captures
are reserved create-once under ledger-v2-capture.json or actors-v2-capture.json.
Actual response envelopes include original and extended query hashes and observed
server identity. Save occurs before verification so failed content is preserved.
Verification checks freshness/TLS/server identity and repository-exact ledger or
eligible bound accounts; the complete loader subsequently checks same-server identity
across baseline, capabilities, ledger and accounts. Public receipts expose no rows.

Seven new focused synthetic tests pass, including a full protected preflight
inventory/baseline/capability/ledger/actor sequence and successful private-loader
verification. Historical v1 files are unchanged, same-path reuse is blocked, and
bounded failure/timeout cleanup is tested without a network-capable client.
Final full regression: typecheck and all 830 tests pass, zero failures/skips;
focused ESLint and whitespace checks pass. Branch/HEAD remain at 319fb20.

Remaining: separately reviewed staging fixture and semantic SQL assembler, final
integration review, then explicit live read-only authorization. This implementation
does not establish live provenance/rollback, grant write authority, or apply 059–060.

## Protected capability transport — 13 October 2026

CapturePoolerCapabilities is now an exclusive protected-preflight mode. Like the
public-baseline modes it requires ConfirmReadOnlyStaging, ConfirmSessionPooler,
an owner-private EvidenceDirectory and pinned Node/client/CA files. Actor/inventory
inputs and all other capture switches are rejected. The bridge accepts only
plan-capabilities and exact verify-capabilities requests; the query is the existing
fixed repeatable-read/read-only capability probe, with no caller-supplied SQL.

The capture reserves capabilities-capture.json before starting any query child,
uses bounded UTF-8 streaming and the clean read-only/TLS client environment, saves
the schema-1 envelope privately, then verifies it. Failed semantics retain the
actual private result; malformed/oversized/failed/timed-out client responses leave
an empty reservation. Existing paths refuse reuse. Preserve evidence and stop;
do not remove reservations or retry automatically. Public receipts do not contain
the snapshot, credential, SQL or raw errors, and keep readyForWriteRehearsal false.

Fifteen focused tests pass using only synthetic DPAPI credentials and inert clients
with no network implementation. Timeout cleanup uses exact executable identity.
Final full regression passes typecheck and all 823 tests, zero failures/skips;
focused ESLint and whitespace checks pass. No SQL or migration hashes changed.
This is not live capture verification, independent server-closure evidence, or
authorization to contact staging. Fresh explicit read-only permission is needed.
Version-2 ledger/actor preflight integration and reviewed staging SQL assembly are
still outstanding; historical v1 captures cannot be upgraded by copying metadata.

## Protected local evidence loading — 13 October 2026

The new loadProtectedFinanceEvidence accepts exactly directory and five receipt
hashes (baseline, ledger, actors, capabilities, bindings). Directory and files must
be owned by the current Windows user with no other ACL entries; the directory must
have protected inheritance and owner-only inheritable FullControl. Reparse points
and ancestors are refused. Reads hold FileShare.Read, check size before hashing,
reject invalid UTF-8/BOM/NUL, verify hashes, and recheck private ACLs before output.
Private IPC is bounded and errors are sanitized. Never print returned buffers.

Fixed inputs in that directory:

- baseline: public-baseline-capture.json, up to 700000 bytes.
- ledger: ledger-v2-capture.json, up to 700000 bytes.
- actors: actors-v2-capture.json, up to 700000 bytes.
- capabilities: capabilities-capture.json, up to 65536 bytes.
- bindings: bindings-capture.json, up to 8192 bytes.

The narrower file cap fits the bounded child-output budget; larger evidence fails
closed, never truncates. Any future increase needs a reviewed transport change.
Historical v1 captures are not renamed/upgraded. No capture writer is enabled by
this addition; fresh v2 capture integration remains outstanding.

prepareFixedProtectedStagingPoolerRollbackFromFiles validates the exact target,
copies mutable inputs, loads/verifies these files and prepares the fixed controller.
It does not execute it, touch the fixed journal, decrypt credentials, open a database
client, or contact a server. It remains an internal helper, not the final reviewed
SQL assembler. Protected files and consistent receipts are not live provenance.

Verified locally: ten new synthetic Windows tests and the complete typecheck/818
test suite pass, zero skipped; focused lint passes. SQL/candidate hashes unchanged.
Next: protected preflight capture integration and separate reviewed staging assembly.
No live permission, migration application, commit/push or deployment implied.

## Server-bound capture contract — 13 October 2026

Release ledger/actor envelopes now require schemaVersion 2, kind ledger/actors,
clientsExitedCleanly true, exact staging transport, the original sourceQuerySha256,
and the new querySha256. Actor envelopes retain the exact independent binding hash.
Both snapshots must include address, port and clusterId matching capability evidence
and the public baseline. After-run captures enforce the same identity before content
comparison; another capture is still attempted if one fails.

Pinned extended query hashes:

- Ledger: 0d043880139e262695f90551031ba179c2fd3a7d5870fc98e5943328f8653635
- Actors: cb31b392ecdb8d293803ec19e659efe405fa0d94bc00cf0cfa79d3aec662182d

The original read-only SQL files, historical version-1 captures, migration candidates
and local-only fixture guards are unchanged. Old envelopes are intentionally rejected
for rehearsal use; obtain fresh version-2 evidence only through the forthcoming
reviewed protected capture boundary with explicit approval. Do not fabricate an
upgrade by copying baseline identity into old JSON. No live capture authorized here.

Next: protected preflight capture/evidence loading, then separate staged fixture/SQL
assembly. Actual extended SQL and full finance regression passed on local PG17;
js-fee-test-6EW7nC stopped. Live pooler behavior and provenance remain unverified.

Final local suite: typecheck +808 tests pass, none skipped; lint/whitespace pass.
The initial Windows PID-probe failure was corrected in test tooling using exact
executable identity, with a running-child negative test, then the full suite reran.

## Mandatory capability content gate — 12 October 2026

The releaseEvidence input now also requires a pinned capabilities capture. Its
schema-1 finance-pooler-capabilities envelope binds the exact session-pooler target,
fixed query digest and clean-client completion. The verifier requires fresh TLS,
read-only database identity, pg_control_system/pg_xact_status/pg_current_xact_id
privileges, activity/SSL view access and full statistics visibility. Self activity
must be visible and active. The probe calls pg_xact_status only for bootstrap xid 1
(a null result is valid for old transaction history) and reads the current xid only
with pg_current_xact_id_if_assigned; the result must be null. No xid is allocated.

Before claiming, capability server/address/port/database/user must match the verified
public baseline. Caller mutation of evidence after preparation cannot change the
copy being checked. This is a mandatory content gate, not proof of live provenance,
live Supavisor behavior or rollback. Actual SQL passed on disposable loopback PG17;
the staging verifier rejects loopback/non-TLS evidence.

No remote capability-capture CLI has been enabled. Next implement the protected
capture/evidence-loading boundary, then the reviewed staging-only fixture/assembler.
Existing ledger/actor SQL still lacks server-address/cluster metadata. Preserve the
local-only fixture and negative-control guards; no live permission is implied.

Verified: typecheck +804 tests, focused lint/whitespace and actual local PG17
capability/finance/rollback/eleven concurrency cases pass. Synthetic cluster
js-fee-test-2Lgmvu stopped. Test-only VAPID scalar fixtures were made deterministic
after reproducing an intermittent export-length failure; provider validation unchanged.

## Ledger and actor gate follow-up — 12 October 2026

Fixed pooler factories now require integrity-bound ledger and actor envelopes plus
independent identity bindings. They revalidate freshness/eligibility and all 53
006–058 repository migration bodies before claiming an attempt. Protected ledger
and actor captures use unchanged pinned read-only queries and private create-once
phase files. Both post-run captures are attempted even after an earlier failure;
either comparison failing prevents journal success. Outcomes record both booleans
without raw SQL, UUIDs or private errors. Low-level transport-only tests retain their
explicitly narrower mode; the fixed pooler factories cannot omit these checks.

Local verification: typecheck +798 tests pass, none skipped, including real Windows
ACL/DPAPI and five-phase inert-client integration. Focused lint/whitespace pass.
The inert client explicitly emits UTF-8 to preserve non-ASCII migration text.

Still not ready to execute: mandatory pooler capability/capture-provenance gate and
separate reviewed staging fixture/assembler are outstanding. Existing ledger/actor
queries lack server-address/cluster fields; fixed transport and independently
reviewed capture provenance remain essential. No live rehearsal, real credential
access or migration is authorized by this local implementation.

## Final-bundle review correction — 12 October 2026

See FINANCE_FINAL_BUNDLE_REVIEW_20261012.md. Protected mutation diagnostics now use
verbose output so the exact SQLSTATE/nonce sentinel can be verified. Actual local
psql confirmed terse omits SQLSTATE and fails; verbose passes. Read-only evidence
remains terse and all raw diagnostics remain private. Typecheck +792 tests, focused
lint/whitespace, full local PG17 rollback/eleven races pass; js-fee-test-uTNxyP stopped.

Protected transport integration is NOT a complete release gate. Current factory
accepts a caller-supplied SQL digest and public baseline but does not require fresh
ledger/actor/capability evidence or independently compare the non-public migration
ledger after rollback. These must be mandatory outer-orchestrator checks before a
live rehearsal can be proposed. Existing local fixture guards, synthetic setup,
fourth-actor assertions and sequence-negative controls must not be repurposed by
removing their guards. A separate reviewed staging fixture/assembler is still needed.
No live services, real credentials, migrations, journal claims or deployments.

## Protected controller/evidence integration — 12 October 2026

The fixed protected factory now assembles the tested controller and protected
transport adapters. Preparation reads no credential and creates no claim. The
private bridge checks the existing unfinished schema-2 staging journal before any
process dispatch, and reserves an exact phase capture with CreateNew before
credential loading. Existing/empty/partial files are never erased or reused.
Mutation digest must match the claimed bundle; phase output is saved privately,
flushed and read back. Only phase/hash receipts cross bridge stdout. The adapter
validates receipts and envelope bindings, and builds after-baseline evidence from
the original inventory source plus the independently captured baseline result.

All wiring tests use newly generated fake DPAPI credentials and a no-network
simulator that checks claim/reservation existence and exact SQL input hashes. The
real fixed staging journal is never invoked. Positive rollback/retained-backend and
negative sentinel/transaction/catalog/reuse/resource cases pass, with closed child
process checks. Five focused integration tests and final typecheck +792 tests pass,
none skipped; focused lint/whitespace pass. A new test typo was fixed before reruns.

This completes local protected wiring, not remote authorization or proof. Keep the
primitive and bridge internal; they are not alternatives to fixed-factory review.
Final migration/fixture SQL bundle review, fresh exact ledger/actors/baseline,
capabilities, real pooler closure/visibility evidence and explicit live approval
remain gates. No real credential or service accessed; 059–060 remain unapplied.

## Protected transport library — 12 October 2026

finance-protected-pooler-process.ps1 now supplies the internal credential and
process primitive. It is NOT an approved live-run CLI, a SQL semantic validator,
or a substitute for the fixed journal/controller. The caller must enforce those
boundaries and keep successful raw output private. A Node/controller bridge and
private evidence capture integration are still pending.

DPAPI load requires exact encrypted-record digest, bounded size, owner-only ACLs,
Windows SID, purpose and staging binding. Executable/CA hashes are rechecked and
read-sharing handles held until process cleanup. Fixed psql arguments and allowlisted
environment match the offline plans; password goes only into the child environment,
never SQL, command arguments or evidence. Parent copies are removed and SecureString
disposed, without claiming guaranteed erasure of managed plaintext memory.

Input is exact digest-bound strict UTF-8; I/O is bounded with 5s input, 30s completion
and 5s termination deadlines. Error categories are fixed and partial output discarded;
exit 3 must still pass the controller's sentinel/closure/baseline checks. No retries.
Seven synthetic DPAPI/inert-executable tests pass, including timeout cleanup;
typecheck +787 tests, focused lint and whitespace pass. No real secret, remote
connection, staging journal claim or migration; 059–060 remain unapplied.

## Offline launch resource layer — 12 October 2026

prepareFinancePoolerLaunchPlan now prepares two exact modes: rollback-rehearsal
(default_transaction_read_only=off) and read-only-evidence (on). Neither mode grants
authority, opens a connection or supplies a password. Target, executable/CA hashes,
startup/TLS settings, 30-second process timeout and bounded output are fixed.
Ambient secrets and connection overrides are excluded. Windows UNC/device/alternate
stream paths are rejected before resource reads; links and wrong hashes also fail.
Snapshots prevent asynchronous caller mutation; frozen plans require revalidation
of resources at actual dispatch. Hash approval/trusted binaries and certificate
provenance remain caller review requirements, not claims made by the planner.

Inert compiled Windows test client verified exact transport input and environment
for both modes without any network code. Typecheck +780 tests, nine focused tests,
focused lint and whitespace pass. Protected DPAPI loading, final dispatch/journal
wiring and fresh capabilities/evidence still required; no live rehearsal authorized
or run. No staging journal claim, real credential access or 059–060 application.

## Local controller/journal integration — 12 October 2026

The separate prepareFixedStagingPoolerRollback factory now assembles exact target,
SQL hash, protected baseline, one-attempt journal, closure verifier and fixed
baseline comparator. It cannot override the existing staging journal directory or
private ACL validator. No transport is supplied and no claim is made on preparation.
Mock adapters exercise the complete control path only; they do not grant authority
or establish remote provenance. The existing direct factory remains direct-only.

Pooler journal schema 2 explicitly records transaction-scope closure and physical
backend absence separately. Legacy sessionClosed results are rejected. Baseline
captures must be independent of each other and the mutation backend; closure must
bind an aborted transaction to an independent read-only observer after confirmed
client completion. All post-dispatch errors still attempt baseline reconciliation;
no reused claim or journal-persistence failure permits another dispatch.

Verified locally: typecheck +775 tests, 21 focused controller/journal tests, focused
lint/whitespace and full disposable PG17 finance/rollback/eleven races. Cluster
js-fee-test-2v6UVW stopped. No real credentials, live services or staging journal
claims. 059–060 remain unapplied. Protected launcher/adapters, fresh capabilities,
real-pooler evidence, fixture/bundle review and separate live approval remain gates.
This completes the controller/journal assembly proposed below, not the live path.

## Pooler option approved for local preparation — 12 October 2026

Supersedes the unresolved transport choice below ONLY for code/local-test work.
finance-pooler-rehearsal.mjs prepares the exact previously verified session endpoint
and user; it is not a live executor. Existing direct target/journal guards still
reject poolers, so no hidden automatic fallback is possible.

Proposed pooler closure semantics: capture full xid8 inside the mutation transaction
before work; after confirmed frontend-client completion use a separate fresh READ
ONLY observer on the same server/cluster to require pg_xact_status='aborted'. If the
physical backend remains, require same backend start, state='idle', null xact_start
and backend_xid, and absence of the original SET LOCAL application marker. Require
a different observer PID. Reject committed/running/unknown outcomes, changed PID
incarnation, retained marker, any open/active transaction or ambiguous visibility.

Do not label retained-backend success physical session termination. New result
fields explicitly separate rehearsalScopeClosed and physicalBackendGone; independent
full baseline reconciliation is still mandatory. A future journal/controller adapter
must preserve these semantics instead of silently coercing them into direct closure.
XID allocation is global/nontransactional and expected, not an application sequence
counter; this does not permit nextval on application sequences or ledger changes.

Actual local PG17 backend-retention model passed positive rollback/idle and negative
open/committed/reused-open cases. It is not live Supavisor reset/visibility evidence.
Fresh pg_xact_status EXECUTE/statistics visibility, real pooler behavior, protected
transport/journal/fixture integration and scoped live approval remain required.
No live operations; local finance/rollback and eleven races pass; js-fee-test-9S9Nye
stopped. 059–060 remain unapplied and fixed staging journal remains unclaimed.
Final typecheck +771 tests pass, none skipped, with focused lint and whitespace
checks passing. No new build/browser/deployment acceptance is claimed.

## Blocking transport choice — 12 October 2026

Local-only route inspection confirms no usable IPv6 address/default route. The
previously diagnosed direct endpoint was IPv6-only; no remote/DNS recheck today.
The write target guard remains direct-only. Session-pooler read success is not
permission to enable writes or replace the direct target automatically.

Before further staging write-launcher integration, obtain the user's choice of an
IPv6-capable execution connection/host or explicit session-pooler-path preparation.
For the latter, review physical backend reuse and equivalent transaction/session
identity/closure evidence before proposing any guard change. Preparation must not
execute writes. Fresh evidence, one live rehearsal and persistent migration approval
remain separate steps. No transport/fixture guard or protected credentials changed.

## Bounded process adapter — local proof, 12 October 2026

finance-bounded-process.mjs is now exercised by the disposable PG17 rehearsal.
It accepts an explicit executable/arguments/environment and exact input Buffer;
there is no shell, CLI, credential lookup, retry or logging. Stdout/stderr and elapsed
time are bounded; failure kills/waits for the child and never reports uncertain
closure as success. Client closure still requires separate server-session evidence.
The local harness checks input hash against its flushed journal before accepting
the result, then independently verifies closure and baseline equality.

The process primitive does NOT validate staging identity, executable/CA pinning,
private credentials or write approval. A protected caller must enforce those gates;
Node/Windows may add standard OS environment entries, so do not assume a minimal
environment without explicit protected-launcher validation. No remote caller is
enabled by this change; direct-only target and local-only fixture guards remain.

Seven inert process tests and actual local finance/rollback/eleven-race tests pass;
js-fee-test-HuJU7Z stopped. No live service or real secrets accessed, and the fixed
staging attempt journal has not been created/claimed. 059–060 remain unapplied.
Final typecheck +765 tests pass, none skipped; focused lint and whitespace checks pass.

## Fixed journal and immutable SQL input — local preparation, 12 October 2026

Use prepareFixedStagingJournaledRollback for the eventual protected staging caller.
It fixes the journal location to C:\protected\jwg-finance-059-060-staging-rehearsal,
uses the real Windows private-directory ACL validator, and rejects path/mode/ACL
overrides. No such directory or claim has been created by this milestone. Creation
and invocation remain subject to the future explicitly approved rehearsal scope.
Never change the path or remove prior records to bypass an uncertain attempt.

The underlying controller now copies and hashes the exact SQL Buffer before any
journal claim, compares the reviewed digest, validates lossless UTF-8 and passes
frozen SQL/hash/nonce/target to executeOnce(payload). Its caller must actually send
payload.sql unchanged and separately verify the reviewed migration/fixture/evidence
bundle. This is a transport-input contract, not proof that an adapter executed it.
No remote adapter is provided; direct-only target and fixture loopback guards stay.

Tests use only mock transport and disposable local journals. They prove changes to
caller input/callback cannot change the prepared bundle; journal flush still precedes
dispatch; errors reconcile, retain outcome and block reuse. No live use or migration.
Final local typecheck +758 tests pass (none skipped), with focused lint/syntax and
whitespace checks passing. This controller-only change did not rerun PG/browser/build.

## Prerequisite capture result — 11 October 2026, supersedes prepared-only status below

One approved staging catalog-only capture completed at 08:34:57Z. Initial wrapper
exit was nonzero due to PostgreSQL IPv6 inet text with /128; no reconnection/retry.
After a tested offline verifier correction, the original unchanged capture passed
receipt/query/target/freshness checks at 08:37:31Z. Both outcomes are retained in
finance-prerequisites-review-20261011.json; the capture remains owner-only/private.

67 public tables/six sequences are selectable by the audited postgres role; all
tables have RLS (11 forced), and this audit role bypasses RLS. pg_control_system
EXECUTE permission exists; the function was NOT invoked. All inspected output/cast
functions are executable pg_catalog routines; noncatalog types are public enums.
No detected blockers in this narrow query. No member rows or sequence values read.
Unknown row estimates on 53 relations prevent treating estimated size as assurance.

Cross-schema/inheritance/dependency/resource review and protected executor/journal/
fixture integration remain. This does not enable baseline reads, remote writes or
application-role security acceptance. 059–060 remain unapplied. Local typecheck and
754 tests pass, none skipped; no deployment/commit/push or other-project contact.

## Next gate: catalog-only baseline prerequisites — 11 October 2026

Prepared (NOT run live) CaptureBaselinePrerequisites in finance-protected-preflight.ps1.
Requires ConfirmReadOnlyStaging, ConfirmSessionPooler, pinned Node/psql/CA, existing
owner-only staging DPAPI credential and a fresh owner-only EvidenceDirectory.
Do not combine it with any other capture mode or provide inventory/actor input.
It reserves public-prerequisites-capture.json before any child starts and preserves
failed/partial captures. No retry, arbitrary SQL, row reads or sequence-value reads.

Fixed SQL inspects public relations/columns and recursively referenced types,
output/JSON-cast function metadata and hashes, relation SELECT/role/RLS permissions,
and pg_control_system EXECUTE privilege WITHOUT executing pg_control_system.
No automatic safety conclusion is possible from this catalog snapshot: review
cross-schema partition dependencies, custom routines and resource estimates before
any full row baseline; further scoped evidence may be required. An empty blocker
list is not baseline/write approval and this capture lacks cluster identity proof.

Typecheck +753 tests pass; Windows synthetic protected capture and real local PG17
SQL tests pass, including a custom JSON cast that would throw if invoked. Local
finance/rollback and eleven concurrency checks pass; js-fee-test-9q3CaC stopped.
Next requires explicit permission for ONE staging-only catalog capture and private
evidence creation. No production/other-project/provider contact or migration.

## Independent closure and journal — local integration, 11 October 2026

finance-session-closure.mjs prepares identity capture inside the mutation transaction
before its work, and a separate read-only observer query after client completion.
It requires same database/server/cluster and a distinct observer PID, fresh ordered
timestamps, correct nonce/app marker and empty activity results for both target PID
and application name. Any surviving or reused PID is uncertainty; no polling/retry,
termination, cancellation or weakened identity is permitted to manufacture success.
Zero process exit alone is never a server closure result.

The actual disposable PG17 runner now proves the open-transaction negative control,
then closure, and uses the same verifier for its 059–060 rollback rehearsal. It also
creates an owner-only synthetic journal and flushes a claim before execution,
records the exact SQL bundle hash and verified outcome afterward, and proves that
the recorded claim blocks reuse. This does not configure a real remote journal or
authorize a remote executor. Local fixture and direct-only write-target guards remain.

Final typecheck +749 tests pass, none skipped; local finance/rollback and eleven
race cases pass; js-fee-test-hf4qJp stopped. The remote wrapper must still bind this
identity/closure evidence to the actual protected target and fixed journal path,
fresh catalog/ledger/actor/baseline evidence, and separately approved staging-only
fixture/role scope. Managed pg_control_system permissions and pooler reuse behavior
must not be bypassed. No staging baseline/write operation ran in this milestone.

## Protected capture transport — current local status, 11 October 2026

CapturePublicInventory / CapturePublicBaseline now integrate the prepared adapter
into finance-protected-preflight.ps1. New modes are exclusive, read-only, fixed to
the same staging session-pooler and require private output plus pinned Node/psql/CA.
Baseline mode additionally requires owner-only InventoryCapturePath and its receipt
SHA256. The fixed credential-free Node bridge validates inventory and generates the
query; it cannot accept arbitrary SQL. This is not a write adapter or approval.

Private output names are public-inventory-capture.json and public-baseline-capture.json.
CreateNew reserves before child startup. Bounded async UTF-8 pipes, timeout cleanup,
raw-error suppression and preserved failed reservations prevent a failed attempt
from being silently retried. Semantic-mismatch JSON is saved before rejection.
The baseline embeds original inventory bytes as text and their hash; verification
requires exact source/query/identity/freshness/coverage agreement. Do not substitute
a newly captured source or regenerate expected identities after a failed comparison.

Nine added tests bring the final typecheck/unit total to 743, none skipped. Windows
tests use synthetic DPAPI/ACL files and inert NO-NETWORK clients, including UTF-8,
inherited environment isolation, output limits and timeout cleanup. SQL and existing
finance/rollback/eleven-race checks pass on local PG17; js-fee-test-tujgGC stopped.
No remote inventory or baseline run has occurred. Both new modes remain subject to
separate live approval and dependency/type/resource/permission review. In particular,
public full-row hashing, catalog function/type behavior, concurrent DDL and
pg_control_system permissions must be reviewed before a real baseline. Keep the
quiet-window and non-MVCC sequence limitations; do not weaken guards to get a pass.
Fixed attempt-journal and independent mutation-session closure integration remains.

## Public baseline adapter — current local preparation, 11 October 2026

finance-baseline-core.mjs shares the previously tested public row/catalog/sequence
coverage. Local guards are unchanged. finance-staging-baseline.mjs prepares the
exact read-only session-pooler inventory and baseline SQL offline, checks receipt
and generated-query hashes, freshness/TLS/server identity, complete inventory, and
strict distinct-backend comparisons. Protected read-only transport was subsequently
added as described above; it still has no write API or execution authority.
row_security=off prevents accepting a silently RLS-filtered table fingerprint.

Generated SQL passed on synthetic PG17, with actual local/non-TLS results explicitly
rejected by staging verification. Final typecheck +734 tests, focused lint and
existing finance/rollback/eleven-race checks pass; js-fee-test-Quj6J1 stopped. One
static DDL-hook source-file test was updated to inspect generated SQL after the
shared-module extraction; its security assertions remain unchanged.

Still required: protected inventory/baseline transport; fresh live type/dependency,
permission and query-resource review; complete ledger/actor binding; fixed attempt
journal and independent mutation-session closure adapter. pg_control_system access
has not been verified remotely; do not silently drop cluster binding if unavailable.
Only public table rows/sequences are fingerprinted; this is not complete managed
schema coverage. No remote baseline has run. No write target, fixture local guard,
retry policy or approval boundary was widened. 059–060 remain unapplied.

## Distinct-backend diagnostic design — 11 October 2026

Local proof now exists for overlapping read-only connections: hold one primary
transaction open, let the observer verify its exact nonce/PID/backend-start/xact-start
and idle-in-transaction state, require a distinct observer PID, then close the primary.
finance-session-witness.mjs rejects mismatched or stale evidence; existing comparison
guards are unchanged. Actual PG17 loopback integration passed with bounded timeouts
and clean closure. Typecheck +720 tests and all finance races pass; cluster stopped.

Update: the protected diagnostic was implemented and its once-only staging run
passed on 11 October; see finance-session-witness-review-20261011.json. Exact target,
verify-full TLS, private evidence and clean client exits were checked. No independent
post-close server probe was run. This diagnostic alone does not establish independent before/after rollback snapshots
or authorize holding a baseline transaction across writes. Separate fresh capture and
mutation-session closure evidence remain required. Do not retry a live diagnostic
or relax PID checks just to obtain success. Remote baseline/journal remains incomplete.

## Real identity binding verified — 11 October 2026

Approved identity/actor reads completed. See finance-identity-actor-review-20261011.json
for exact private evidence path and hashes. Identity lookup used fixed independent
test mailboxes/JS IDs and validated Auth/profile uniqueness, active/living state and
resolved role before writing the private binding. One separate actor capture then
passed offline integrity/freshness/eligibility checks against that binding. No
password/token fields, unrelated Auth users, account changes or login calls.

Both reads were server READ ONLY with verify-full TLS. Two client processes received
the same backend PID; therefore this does not clear the distinct-backend rollback
reconciliation requirement. Initial extra PID gate failed; diagnosis was offline,
no remote retries. Do not modify comparison guards merely to turn this into a pass.
Bindings/evidence must be revalidated for later operations, not treated as perpetually
fresh. Full catalog/remote baseline/journal work and separate write approval remain.
715 local tests plus synthetic PG17 suite passed; no 059–060 application.

## Baseline coverage update — 11 October 2026

The synthetic baseline now explicitly captures view definitions (pg_rules omits
internal _RETURN rules), relation options/partition metadata, default privileges,
database-role settings, inheritance and role connection limits/expiry. Fixed
pg_catalog search path and UTC/ISO formatting reduce ambient-session differences.
Actual loopback PG17 tests detect five catalog-only changes: view body, view
security option, default ACL, role connection limit and database-role setting.
Existing finance/rollback/role/sequence checks and eleven races pass; cluster
js-fee-test-HHhT5U stopped. Typecheck +711 tests and focused lint pass.

This remains local-only coverage, not a completed remote adapter or full managed
schema audit. No remote guard was relaxed. The saved September account audit shows
earlier successful checks but supplies no usable independent UUID binding. Do not
derive expected actor IDs from the snapshot being tested. Real actor binding,
fresh catalog evidence, remote baseline and fixed journal integration remain open.

## Actor binding preparation — 11 October 2026

Integration update: the protected preflight now accepts exclusive -CaptureActors
plus -ActorBindingsPath, with the existing explicit read-only/session/output gates.
Binding JSON must be private, schemaVersion 1, projectRef eomubndonbetszdbhsrj,
and bindings containing exactly member/admin/superAdmin distinct lowercase UUIDs.
Obtain those UUIDs independently from verified dedicated identities; never derive
expected identities from the capture being checked. The switches do not constitute
user authorization. No real binding document has been prepared in this milestone.

The wrapper hashes exact binding bytes into the envelope, checks returned JS-ID/UUID
pairs, and saves actors-capture.json without overwriting ledger evidence. Follow
immediately with verifyFinanceActorCapture using the protected capture bytes,
receipt SHA256 and exact binding bytes. Caller must verify private ACLs before file
reads and retain trusted execution provenance separately. A successful saved capture
is not yet an eligibility comparison, Auth login, live RLS test or write approval.

Typecheck +710 tests and focused lint pass. Windows end-to-end tests use a compiled
inert client with no networking and synthetic DPAPI/ACL fixtures; this does NOT
verify a live connection. Actual actor SQL remains unchanged and no staging actor
capture occurred. Current capture implementation buffers client output before its
size check; do not describe it as a bounded streaming implementation.

Prepared tests/sql/059_060_actors_readonly.sql (SHA256
723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80).
The query fixes JS IDs 0101/0002/0001, returns minimal identity/state fields and
profile/membership/assignment digests, and never reads Auth or returns contact
details. It has only run in a synthetic loopback database. Protected remote capture
integration and specific live-read approval remain required.

Offline finance-actor-evidence.mjs requires independently verified UUID bindings;
never derive its expected binding from its own candidate snapshot. Exact JS IDs,
active/non-deceased profiles, correct Super Admin flags and Member/Admin eligibility
are required. Counts do not establish full dojo scope, Auth validity or live RLS
correctness. Independent captures detect full-row digest drift and reject reuse of
the same session. There is no execution or cleanup API and no write authorization.

Typecheck +703 tests and focused lint pass; exact query tested locally with positive
and negative identity/state/drift controls. Existing local-only fixture guard and
fourth synthetic actor remain unchanged. Do not substitute this new query for fresh
catalog/ledger binding or complete independent residue verification.

## Full-ledger evidence preparation — 11 October 2026

Latest verified update: one approved staging-only capture completed successfully
at 2026-10-11T01:43:40.195295Z. TLS/backend SSL/server READ ONLY passed. Immediate
offline hash/envelope/repository-contract comparison passed all 53 versions, names
and SQL bodies (006–058). See finance-full-ledger-review-20261011.json for the private
evidence path and sanitized hashes. No database changes or retry. This capture
supersedes the "not run" statuses below but does not make the rehearsal executable:
full catalog/actor/baseline/journal integration and separate write approval remain.
Freshness must be checked again before any later action; do not present historical
evidence as a fresh preflight. 059–060 remain unapplied.

Update: protected capture wrapper is locally implemented and tested, but has NOT
run on staging. Explicit -CaptureFullLedger requires -ConfirmReadOnlyStaging,
-ConfirmSessionPooler and an already private -EvidenceDirectory. CreateNew reserves
ledger-capture.json before client start; existing/partial evidence prevents reuse.
Windows ACLs are verified before reservation and save; receipt contains hashes and
flags only, with ledgerContentsCompared=false. Current fixed query includes backend
SSL evidence and has SHA256
2c80c6b732c80ff9ad3ad645ef672a31a3dcccd5804ab675a62dcd7405eed3e9.
This supersedes the historical query digest below. Typecheck +696 tests, focused
lint and synthetic PG17 checks/eleven races pass; js-fee-test-LWccYS stopped.
Next capture requires specific read-only approval, a fresh private evidence path,
existing protected staging credential and pinned client/CA. Preserve failures;
no automatic retries. Offline full-body comparison remains a separate required
step immediately after capture (five-minute freshness window). JSON alone is not
authenticated provenance. No migration/write rehearsal authorized by this tooling.

Current status: connectivity/password gate passed; live ledger versions only.
New fixed query tests/sql/059_060_ledger_readonly.sql has SHA256
a6e90e60a8288280e68b69a1a13f25f3cb593621498f5c0be2f83a7ed1783a93.
It captures complete stored SQL bodies and ledger-table metadata digest under
repeatable-read READ ONLY with explicit search path/timeouts. It must be saved
privately: do not print raw statement bodies or allow arbitrary caller SQL.

Offline verifier requires exact repository contract, versions/names/bodies and
fresh captures (five minutes, 30-second future skew). Different backend PIDs and
ordered timestamps are mandatory for comparisons; any statement-storage or ledger
metadata drift blocks equality. JSON does not authenticate the database. The
trusted future wrapper must separately establish exact staging target and TLS.
This verifier neither implements full-schema residue checking nor authorizes SQL.

Seven tests added; typecheck +690 tests and focused lint pass. Query executed only
in synthetic loopback PG17; content/catalog negative controls and eleven existing
finance races pass, cluster stopped. No remote query/credential access this step.
Remaining: protected remote capture integration, fresh full catalog/actor binding,
complete independent baseline adapter and fixed journal path. 059–060 pending;
separate write-rehearsal/application approvals remain mandatory.

## Read-only session transport verified — 11 October 2026

Approved new owner-only DPAPI record created from existing staging-bound
STAGING_DB_URL, preserving source and old record. Use the exact non-secret path
in finance-session-preflight-success-20261011.json for subsequent approved probes;
the old August credential failed authentication and must not be selected silently.
One retry succeeded with verify-full TLS, postgres database/session user, server
READ ONLY and exact ledger versions 006–058. No write SQL or migration application.

This closes the connectivity/password gate only. Full ledger bodies, current
catalog/actor binding, fixed private attempt journal and complete independent
remote baseline/reconciliation remain required. Do not relax direct-only mutation
guards or repurpose the read-only probe as a write executor. Separate approvals
are needed before rollback-contained writes and before persistent 059–060 changes.

## Session probe reached endpoint, authentication blocked — 11 October 2026

Exact staging pooler host/user/database retrieved via GET; API lists transaction
port 6543. Selected documented session port 5432 on that same host, explicitly,
without fallback. ConfirmSessionPooler in the read-only probe pins this identity
and retains verify-full. Do not use it as authorization or transport for writes.
Other direct-only guards remain unchanged.

One attempt returned AUTHENTICATION_FAILED. Local comparison shows the old DPAPI
record differs from staging-bound STAGING_DB_URL. Neither value was exposed or
changed; the latter remains untested against the server. Obtain approval to create
a new owner-only DPAPI record from the environment password, preserving the old,
then run one read-only session probe. Do not reset the server password. Receipt:
finance-session-preflight-20261011.json. 059–060 remain pending; no ledger refresh.

## Diagnosis: direct IPv6 unavailable locally — 10 October 2026

Approved GET confirms healthy staging and exact advertised direct hostname. DNS
returns AAAA only; local machine has no usable IPv6 address or default route, and
Windows resolver returns HostNotFound. Receipt: finance-staging-dns-diagnosis-20261010.json.
No SQL/login was attempted during diagnosis. Direct-only guards remain unchanged.

Propose an explicitly approved session-pooler read-only preflight, not an automatic
fallback. First retrieve the exact staging pooler metadata (never guess region/index),
bind project-qualified user/host/session port, preserve verify-full TLS and verify
appropriate CA trust. Then test one read-only connection. No write rehearsal or
migration application is authorized by this diagnostic work.

## Approved retry blocked by DNS — 10 October 2026

One revised probe was explicitly approved and executed; DNS_FAILED before database
login. Separate receipt: finance-readonly-probe-retry-20261010.json. No further
retries or fallback. TLS, password acceptance and ledger are still unverified.
Do not treat this as an authentication failure. Next proposed read-only diagnosis
is staging project status/advertised hostname and DNS/network configuration;
obtain approval for that scope. No write rehearsal or application may proceed.

## Live read-only preflight failed — 10 October 2026

One approved fixed probe exited 1 with only a generic sanitized failure. Evidence:
finance-readonly-probe-attempt-20261010.json. Do not treat local prerequisite success
as live TLS/login/ledger success; all remote checks remain unverified. No automatic
retry, credential reset, alternate target or writes occurred.

The local probe now emits fixed failure-stage and client-error category codes;
synthetic tests pass, but revised diagnostics have not been used live. Obtain
approval for one diagnostic read-only retry before proceeding. Do not proceed to
rehearsal while this gate is unresolved. 059–060 remain unapplied.

## Actual local inputs located — 10 October 2026

See finance-connection-prerequisites-20261010.json for exact non-secret paths and
observed hashes. Existing staging DPAPI credential passed local ACL, decryption and
metadata checks. Existing psql 17.11 and saved CA passed offline resource/path/hash
checks; CA self-signature and validity dates pass. No live handshake or credential
acceptance was tested, and local hashing is not independent vendor provenance.

Next approval is the fixed read-only staging probe only. It must recheck resource
hashes and credential permissions, use verify-full and fail without fallback on
connection/TLS/password/ledger mismatch. Do not reset passwords or change routing
automatically. This is NOT authority for a rollback write attempt or persistent
application. The full remote rehearsal runner remains incomplete; 059–060 pending.

## Protected credential probe — local verification, 9 October 2026

scripts/finance-protected-preflight.ps1 validates an owner-only Windows DPAPI
CLIXML credential bound to the exact staging project and current SID. Explicit
ValidateCredentialOnly mode never starts a client. ConfirmReadOnlyStaging mode
requires separately approved live access and reviewed client/CA SHA256 values;
the switch records intent, not proof of user authorization. It uses fixed direct
staging routing, verify-full TLS, isolated environment, child-only password
injection, fixed read-only SQL and timeouts. No automatic retry or pooler fallback.
Only sanitized success/failure is emitted; ledger verification is versions only.

Five new tests use synthetic encrypted credentials and temporary ACLs, never real
secrets. Typecheck +680 tests and focused lint pass. The live mode has NOT run:
actual executable/CA, TLS handshake, credentials and current remote ledger remain
unverified. This script is not yet wired into the Node plan/journal/rollback path.
Review and configure actual inputs before requesting a live read-only check;
finish complete independent baselines and actor binding before requesting a
separate rollback-only write rehearsal. Neither 059 nor 060 is applied.

## Windows permissions and offline connection planning — 9 October 2026

finance-private-directory.ps1/.mjs now supplies a real Windows private-directory
adapter. It only inspects ACLs/paths: current-user owner and sole full-control ACE,
protected inheritance, object/container inheritance, no propagation exceptions or
reparse ancestors. Positive/negative/drift tests use actual ACLs on temporary test
directories and the persistent journal. Existing protected evidence remains untouched.

finance-psql-plan.mjs verifies supplied client/CA bytes against reviewed hashes and
produces an immutable read-only launch plan, not a process. It pins the direct staging
target, verify-full SSL, GSS encryption disabled, no psql startup files/password
prompts and bounded timeouts. Only Windows runtime/temp variables are inherited;
all ambient PG/service/proxy/startup/app-secret values are excluded. No credential is
loaded and password arguments are absent. Tests use inert byte fixtures: certificate
validity/trust, real TLS, client binary and credential injection are NOT verified.

Typecheck +675 tests and focused lint pass. No remote contact. Remaining integration:
review actual binary/CA, inject protected credential only into bounded child context,
verify fresh server/project identity and all evidence, bind one private journal path,
and connect complete reconciliation. Do not use the read-only plan for a mutation
attempt or weaken TLS if the direct endpoint is unavailable. Request direction for
an alternative transport rather than silently selecting a pooler. Readiness stays false.

## Persistent journal and target gate — local preparation, 9 October 2026

finance-attempt-journal.mjs persists an exclusive claim before dispatch and a separate
exclusive outcome afterward. Flush/readback failures, existing/corrupt/incomplete
claims and orphan outcomes fail closed. Completion never releases the claim; there
is no delete/reset API. A cross-process race allows only one claimant for the same
directory. Links/junctions are rejected; production use requires a real owner-only
Windows ACL verifier, not the mocked test callback. Pin one directory permanently
for this attempt: selecting another directory is not permitted recovery.

finance-rehearsal-target.mjs accepts only the exact staging direct hostname,
5432/postgres/postgres and verify-full; all unknown connection fields/fallbacks fail.
finance-journaled-rollback.mjs assembles claim -> one attempt/reconciliation ->
outcome. Failed outcome persistence prevents success and retry. Tests use mock
transport and synthetic temporary files, even when metadata names the staging ref.
Sixteen new tests, full typecheck +668 tests and focused lint pass; no live contact.

This is not a ready remote command. Connect/review the real TLS/credential adapter,
private-folder ACL adapter, reviewed bundle digest and fresh server/ledger/catalog/
actor evidence plus full remote baselines. The journal is a local accident guard,
not tamper-proof storage or a substitute for database isolation. File sync cannot
guarantee every power-loss case; absence/ambiguity must not authorize a retry.
Keep readyToExecute and remote runnerImplemented false until end-to-end review and
separate write-rehearsal approval. No migration application is authorized here.

## Single-attempt control flow — local implementation, 9 October 2026

scripts/finance-rollback-attempt.mjs coordinates one mutation attempt, independent
session-closure verification and independent reconciliation. Any execution exception,
unexpected outcome, closure uncertainty or failed/different baseline prevents
verification. Reconciliation is still attempted after execution/closure failures.
No automatic retries, raw-error disclosure or cleanup writes. Concurrent/repeated
calls to the same instance cannot dispatch again; the baseline is copied at creation.
The local runner identifies its mutation session by nonce-bound application_name
and checks pg_stat_activity in another READ ONLY connection before comparison.

Nine controller tests and real local PG17 integration pass; full typecheck +652
tests and focused lint pass. Local cluster stopped, no remote contact. This module
does not contain a remote client or grant authority. Its latch is in-memory and
per instance; it does NOT prevent a new process from starting another attempt.
A durable private attempt journal and stop-on-uncertainty recovery path are still
required before remote use, alongside target/TLS, fresh evidence, actor binding,
complete remote baselines and separate write-rehearsal approval. Keep
runnerImplemented/readyToExecute false until the entire remote path is reviewed.

## Approved index metadata capture — 9 October 2026, 18:49 Sydney

The user specifically approved this read-only audit; it has now executed on staging
only. See finance-index-dependency-review-20261009.json for query/evidence hashes and
private receipt location. Ten scoped tables, 33 valid/ready/live ordinary btree
indexes, no expression indexes, three simple partial predicates. Five dependency
helper definitions unchanged from prior protected captures. All tables have RLS,
postgres owner, no partitions or FORCE RLS. Exact versions 006–058 verified, not a
new ledger statement-content comparison. Offline validation and six tests pass.

This closes the missing index capture/review gate for these tables at capture time.
No new index function path was found. It does not complete the remote executor,
authorize rehearsal writes, bind test actors or replace fresh comprehensive evidence.
No member/Auth rows, application function invocation, writes, delivery, settings,
scheduler or other-project contact. Candidates remain unapplied.

## Prepared query local validation — 9 October 2026

The exact index/dependency SQL now passed a READ ONLY transaction in a separate
synthetic metadata database within the loopback cluster. Five intentionally throwing
helpers attached through index expressions/predicates, defaults, checks and policies
were captured without invocation. All ten table names and twelve local indexes found.
The ledger is fabricated 006–058 for syntax/shape testing, not live ledger evidence.
scripts/finance-index-capture.mjs checks structure and produces only sanitized counts;
it does not bind an actual target/receipt, prove transitive safety or authorize SQL.
Six negative/positive unit tests plus full typecheck +643 tests and lint pass; PG17
rollback/race suite passes and clusters are stopped. No remote execution occurred.
Separate explicit read-only staging approval is still needed for actual metadata.

## Notification-path review update — 9 October 2026

See FINANCE_FIXTURE_PATH_REVIEW.md. Exact captured create_notification and two
name-normalization triggers now run inside the local fixture transactions, with
five exact recipient/reference/content checks and preserved pre-existing baselines.
The original failure-injection notification stub is confined to separate synthetic
tranches. Setup assignment and setting UUIDs are now in the fixture manifest.
Typecheck +637 tests, focused lint, PG17 rollback/RLS/notification controls and eleven
races pass; cluster stopped. No remote access or migration application occurred.

Additional capture gap identified: ordinary index definitions/predicates and their
dependencies were not included in saved metadata. A unique-constraint inventory
cannot exclude an expression-index call. Prepared
tests/sql/059_060_rehearsal_indexes_readonly.sql targets only the ten written tables
and catalog metadata. It is not executed/runtime-validated and requires separate
read-only approval. Inspect results manually, including any uncaptured nested calls;
pg_depend does not prove a complete PL/pgSQL/dynamic-SQL call graph. This remains a
blocked safety gate, not grounds to assume rollback is sufficient or bypass checks.

## Local coverage update — 9 October 2026

The local runner installs two exact captured general DDL hooks and observes pgrst
using a distinct persistent LISTEN connection. Committed CREATE/DROP controls each
deliver; the combined candidate rollback delivers none; a final committed control
proves the observer remains functional. Fingerprints now include event-trigger
metadata and definitions. The four extension-only hooks are outside the candidate
command set and not installed. This is not live staging notification evidence.

059_captured_rls_local.sql installs nine exact captured SELECT policies and three
captured reader helpers against synthetic tables. Bodies/expressions compared with
protected 8 October metadata; pinned regression hashes prevent silent drift.
Direct role-read tests cover own/private Member data, assigned Admin scope,
Super Admin, missing claims, and a fourth LOCAL-ONLY unassigned synthetic actor.
The fourth actor MUST NOT be used or inferred for staging. Guards refuse non-loopback
execution. SELECT grants are synthetic harness grants, not exact live ACL evidence.
Fixed fixture enum and helper dependency order; no policy expression weakened.

Typecheck +634 tests, focused lint, local rollback/fingerprints and eleven races
pass. Clusters stopped. No remote access or writes. Full reachable trigger/default/
RLS call-chain review and remote hash-bound executor remain incomplete; the plan's
readyToExecute/runnerImplemented flags remain false. Any later approved rehearsal
needs fresh identity, ledger, candidate hashes, actor bindings and complete baselines.

## Evidence and stop conditions

Use `finance-rehearsal-preparation-20261008.json`, produced offline from the verified
11:26 UTC staging capture. It binds the snapshot, ledger and both draft hashes.
`readyToExecute` is deliberately false and `runnerImplemented` false. A successful
preparation command means a plan was produced, NOT that the rehearsal is safe to run.
Recheck the live target, exact ledger, catalog and candidate hashes immediately
before any later approved rehearsal; stop on drift. Never infer permission from
the old CLI link or from a generic continue message after this plan.

The separately approved read-only follow-up ran at 11:39:57 UTC on 8 October.
See finance-dependency-review-20261008.json. All 13 previously missing bodies plus
five additional helpers are captured (223 public/trigger functions, 23 triggers in
total). Exact versions remain 006–058; no public foreign tables or rewrite rules.
Raw bodies are owner-only private evidence, not repository content. The executed
query remains hash-pinned; its PREPARED ONLY header records its original status.
The older preparation JSON remains historical evidence and is not overwritten.
Offline command: node scripts/review-finance-dependencies.mjs <protected directory>.
This verifies bytes/receipt/project/read-only/ledger and never authorizes execution.

Manual review found membership_status_history.id and notification_outbox.id are
identity columns. on_membership_status_change writes both on a status transition;
the legacy outbox bridge calls queue_email before suppressing its row. The identity
may already have advanced before the BEFORE INSERT trigger runs. Never treat an
empty post-rollback outbox as proof of no sequence changes; never use setval to
restore a shared sequence. Added membership_status_history to the baseline inventory.
Fixture setup/tests must avoid these paths or use separately approved isolated testing.

create_notification writes notifications (no captured public triggers on that table).
queue_email writes email_outbox through its normalization trigger; those reviewed
bodies contain no direct delivery call. notify_dojo_admins can target existing assigned
admins and must not be exercised on an ordinary dojo. This is limited manual review,
not complete transitive/RLS/fixture safety verification. Auth.uid/role definitions and
Auth/profile fixture prerequisites still need resolution where used. No Auth rows
have been read or changed, and no provider, worker or job has been invoked.

Before writes, review the complete transitive call chain, defaults, policies,
triggers and extension calls. Look for HTTP/network, external connections, sequences,
advisory/session locks and other effects not reversed by transaction rollback.
Do not rely on a string scan as proof. Do not call any worker/system generator that
could iterate ordinary memberships. No trigger disabling, replication-role bypass,
production-like flag changes, scheduler changes or notification-sink replacement.
If safe isolation cannot be proved on staging, stop and request a separate isolated
test environment; do not create/resume one without approval.

## Fixture boundary to finalize before approval

The captured profiles.id FK references auth.users.id. Local fixture preparation on
9 October therefore reuses three actors rather than attempting profile/Auth inserts.
Proposed staging actors are exactly dedicated Member 0101, Admin 0002 and Super Admin
0001, subject to fresh binding/eligibility verification and explicit approval of
temporary test memberships/assignment. Their profiles/passwords/existing memberships
must not change. No live identity lookup was performed during local preparation.

tests/sql/059_rehearsal_fixture.sql currently refuses non-loopback execution and
requires synthetic-local-only context. It creates new UUID-bound fixture classes,
dojos, memberships, assignment, rates and four bills in one transaction. Its companion
assertions exercise actual authenticated role calls, owner-only postcondition checks,
pending/receipt/waiver/skipped-debt boundaries and unchanged actor profiles. Local
runner rolls the tranche back and verifies fixture row counts/schema disappearance.
It uses the real 030 resolver and 037 assignment validator but remains simplified
synthetic schema, not complete-schema/independent-session residue evidence.

059_rehearsal_sequence_negative.sql deliberately consumes local identities inside
a rolled-back subtransaction and proves the identity assertion can detect that risk.
It is loopback-guarded and MUST NEVER be included in a remote rehearsal. No setval,
trigger bypass or sequence restoration is permissible. Normal fixture path leaves
both legacy identity sequences uncalled. Current enum metadata still needs fresh
verification; local legacy 'break' is based on the historical captured enum and 037.

Do not copy or update real profiles, memberships, charges, rates, payments,
attendance or audit history. Bind actual actor UUIDs privately only after approval;
do not hardcode account IDs inferred from their displayed Member IDs.
Validate that fixture records cannot notify ordinary dojo admins or members.
Every inserted UUID must be captured in a temporary fixture manifest; collisions
abort. No cleanup DELETE as a fallback: rollback is the only mutation exit.

## Intended transaction and acceptance

Local implementation milestone (9 October): scripts/finance-rehearsal-transaction.mjs
hash-pins the actual 059/060 source bytes before removing only their reviewed outer
transaction wrappers. The disposable PG runner executes both draft bodies plus
fixtures/assertions in one bounded transaction, forces deferred constraints and
raises a nonce-specific Z0590 exception. Requires exact psql exit 3 and one matching
verbose ERROR; independent read-only fingerprints must also match. An unexpected
result still triggers independent comparison and fails, never automatic retry.
This combined DDL/fixture local test passes. No remote executor is implemented.

Fixture assertions now preserve nonempty baseline rows and compare last_value plus
is_called instead of requiring unused sequences. Existing notifications must hash
identically and new recipients must be only the bound Member/Admin. Local schema
seeds unrelated records to demonstrate those checks. The sequence negative control
remains local-only and is excluded from the combined candidate rehearsal itself.

One pinned staging connection; one bounded transaction with statement/lock timeouts.
Apply reviewed 059 then 060 DDL only inside that transaction, stripping exactly their
outer BEGIN/COMMIT after validating hashes. Do not write the migration ledger.
Force all deferred constraints before the final success sentinel. A unique explicit
exception rolls back DDL, synthetic rows, notification/outbox records and audits.
An error other than the exact sentinel is failure, never success. No automatic retry
after a timeout, lost response or uncertain outcome. Independent reconciliation first.

Assertions to prepare and validate locally before requesting execution:

- Member report stays Pending; only authorized receipt makes selected months Paid.
- Nonconsecutive selection leaves omitted months and their histories unchanged.
- Waiver/repricing requires scope, reason and expected amount; paid/pending is locked.
- Member, assigned Admin, wrong-dojo Admin, Super Admin, anonymous and disabled access.
- Group review atomicity and legacy single-month split rejection at constraint time.
- Actual rate histories/override expiry, stale quote, mixed currency and duplicates.
- Existing finance readers and reports keep waiver totals separate from receipts.
- New dojo policy grants no writes and exposes only permitted inactive dojos.
- Notifications/outbox remain uncommitted, no ordinary recipients or external calls.

Do not translate existing owner-claim synthetic tests into alleged RLS coverage.
Execute browser-reachable calls under the actual authenticated/anon database roles.
Do not claim this sequential rehearsal replaces the existing multi-session race
tests; repeat races on staging only under a separately reviewed fixture/cleanup plan.

## Independent rollback verification

Local implementation exists in scripts/local-finance-baseline.mjs, exercised by the
disposable PG17 runner. Each capture uses a fresh psql process and repeatable-read,
read-only transaction. It checks target/cluster identity, inventory completeness,
public table SHA256/counts, catalog/ACL/role/Auth-helper hashes and sequence state.
The normal fixture compares equal across independent sessions; an aborted nextval
on a separately created local probe sequence is correctly detected afterward.
No sequence reset is used. This probe is LOCAL ONLY and excluded from any future
remote test. All synthetic clusters stop after the test, including failure paths.

This is not the remote wrapper: the local schema has no real Supabase ledger and
does not reconstruct all managed schemas. Snapshot isolation covers table/catalog
reads but sequence state is not MVCC; concurrency remains a stop/uncertainty case.
Never translate a local equal fingerprint into staging acceptance or apply approval.

The remaining metadata follow-up was approved and executed on 9 October at 17:26
Sydney; see finance-remaining-metadata-review-20261009.json. Its prepared-header SQL
is preserved unchanged for its hash. Auth uid/role/jwt bodies only read request claim
settings; reviewed local copies now drive synthetic tests. Current enum confirms
legacy break and current break_1/break_2. Four public owned sequence mappings captured.
Six DDL event triggers: four gated to CREATE/DROP EXTENSION (not in these drafts),
and pgrst_ddl_watch/pgrst_drop_watch reading event metadata and issuing NOTIFY pgrst.
No trigger was invoked by the audit. No data/sequence values were read or changed.

Future wrapper must pin/recheck full event-trigger definitions, enabled state and
tags as well as Auth helpers. No extension operations or trigger disabling may be
introduced. A read-only audit cannot prove rollback behavior of actual staging DDL;
the wrapper must keep all draft/fixture operations in one rollback-only transaction
and verify independently afterward. Complete remaining candidate/fixture/RLS call
chains before requesting that execution. No rehearsal approval is implied here.

Capture before/after in separate read-only sessions: exact migration names/statements,
relevant catalog/ACL/policy/trigger hashes, all fixture UUID absence, and hashes/counts
of relevant data/audit/outbox tables (no raw member data in reports). Include tables
discovered through dependencies, not only the initial finance allowlist. Compare
sequence state where reachable: rollback does not undo sequence increments.
Concurrent legitimate changes can invalidate comparisons; treat mismatch as failure
to verify, never delete rows to make the baseline match. Report uncertainty and stop.

## Separate approvals

Approved diagnostic executed once on 11 October at 18:36 Sydney (07:36 UTC).
The staging session-pooler returned two distinct simultaneous read-only backends;
live-primary metadata and nonce matched, both clients exited cleanly, and private
capture/query/receipt hashes and freshness passed offline. See
finance-session-witness-review-20261011.json. No writes, retry, fresh ledger/catalog
capture or other-project/provider access occurred. Earlier same-PID evidence stays
unchanged. This witness is not an independent post-close server probe, future
rollback-baseline evidence, or permission to run a write rehearsal/application.

Local-only update, 11 October: the protected preflight now has an exclusive
CaptureSessionWitness diagnostic mode. It reserves session-witness-capture.json
in a new owner-only directory, holds one READ ONLY session while another observes
it, closes both clients and saves a nonce/query-hash-bound private envelope. It
does not retry or accept arbitrary SQL. Capture exit-zero is not semantic success:
verifyFinanceSessionWitnessCapture must separately validate the receipt hash,
fixed transport/query metadata and fresh overlapping/distinct-backend evidence.
Client exit is not independent proof of server closure. Neither this diagnostic
nor its offline verifier authorizes writes or replaces rollback reconciliation.

This wrapper passed inert no-network Windows DPAPI/ACL/timeout/cleanup tests and
exact SQL matching against the builder tested on local PostgreSQL. No live witness
capture has run. Obtain explicit permission for one read-only staging diagnostic
and protected evidence creation before using this mode. Preserve all failed or
partial captures and stop; no remote retry or guard relaxation is authorized.

1. Read-only dependency-definition audit: no data mutations or function invocation.
2. After isolation/fixtures/assertions are reviewed, one rollback-contained rehearsal
   plus independent ledger/catalog/residue comparison, staging only.
3. Only after passing: explicit permission to apply 059–060 persistently, run guarded
   acceptance and deploy matching staging UI. This plan grants none of those actions.

Month-end automatic billing remains unimplemented and disabled. This rehearsal
does not enable billing, cron, Cloudflare workers, email, push or any delivery jobs.

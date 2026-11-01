# Finance 059–060 final-bundle gap review — 12 October 2026

Originally an offline source/assembly review; dated follow-ups record later scopes.
One explicitly approved staging rollback rehearsal is now verified (14 October).
Permanent migration application is NOT approved. Migration candidates and loopback
fixture guards remain unchanged. This is not a new full application security audit.

## Verified complete live path — 14 October 2026

The approved complete bundle succeeded on staging only and rolled back. Actual
guard/account checks, migrations 059/060, fixture and assertions reached Z0590.
Independent transaction closure and unchanged public catalog/data/sequences,
ledger and three-actor digests all passed; different-backend requirements satisfied.
The fixed journal durably records verified-rollback with zero failures. See
finance-staging-rehearsal-review-20261014.json for scope and evidence locations.

Initial local preparation failure was a known credential-writer metadata mismatch,
not database failure. Added strictly validated createdUtc compatibility, tested
without changing any credential values; resumed only empty/unclaimed folders.
Typecheck +845 tests pass, zero failures/skips. Exactly one actual mutation attempt;
no retries, provider/messages/production contact, permanent application or deployment.
This closes the earlier positive-path uncertainty, not permanent staging-application
or production gates. Preserve the consumed fixed journal; obtain new explicit
approval before applying 059 then 060 persistently to staging.

## Live evidence follow-up — 13 October 2026

The opening statement describes the original offline review. A separately approved
read-only refresh has now completed: seven staging-only queries, verified TLS,
exact ledger 006–058, required capabilities, 67-table/6-sequence public baseline,
and independent three-account bindings/eligibility. Eight new private files were
saved without overwriting history; protected loader and offline assembly passed
at 08:05:49 UTC. See finance-readonly-evidence-review-20261013.json.
Seven focused tests and one-off syntax checks pass; prior 843-test result retained.

No database writes or bundle execution. Sequential connections reused one backend,
so no post-mutation independence or rollback/security acceptance is claimed. The
complete positive guard/fixture/rollback path still requires separately approved
staging rehearsal with fresh inputs and independent post-run reconciliation.
Read-only success does not approve rehearsal, migration application or production.

## Latest follow-up — 13 October 2026: restricted protected entry point

Restricted preparation now connects protected-file validation to the pinned
assembler and fixed protected controller. Caller-provided SQL, evidence buffers,
adapters, journal paths, framing and timeout overrides are refused. Immutable
receipts bind the bundle and component hashes; inputs are copied across async work.
No implicit invocation or CLI. runApproved requires an exact receipt/operation
acknowledgement, which does not replace explicit human write-rehearsal approval.

Thirteen loader/preparation and four assembler tests plus focused ESLint pass.
Full npm test passes typecheck +843 tests with zero failures/skips; whitespace
checks and unchanged 059/060 source hashes verified.
Only synthetic private captures were read; nonexistent protected resources remain
unopened, source bytes unchanged, and acknowledgement negatives never dispatch.
Low-level factories remain internal primitives, not approved arbitrary-SQL entry
points. Positive live guard/assembly acceptance remains unverified; local rejection
is intentional and must not be bypassed. Obtain separately approved fresh read-only
staging evidence before any proposal to execute the rollback-contained rehearsal.
No remote contact, real secrets/backups, migration, commit/push or deployment.

## Latest follow-up — 13 October 2026: pinned assembler

The complete offline SQL assembler now exists, using only four fixed SHA256-pinned
sources and the existing exact guard/evidence validation. Order is fixed framing,
guard, xid8 identity, 059, 060, separate three-account fixture/assertions, abort
sentinel; no COMMIT or caller SQL/path/timeout/bypass input. Output is immutable and
not connected to execution. completeBundle=true is not readiness or authorization.

Typecheck +840 tests pass; ten focused tests and ESLint rerun pass after timeout
alignment to the existing launch plan. Actual local PG17 rejects the unmodified
bundle before identity/migrations; finance rollback, simulated-ticket fixture and
eleven concurrency cases pass. Final cluster js-fee-test-Ub8hiK stopped; no secrets,
backups or remote targets accessed. Positive TLS guard/complete assembly execution,
restricted protected executor integration and fresh authorized live evidence remain
open. These findings supersede older statements below that no assembler exists;
they do not close the remaining live provenance/security/zero-residue gates.

## Follow-up — 13 October 2026: server-bound ledger/account evidence

The current release gate now requires version-2 ledger and actor captures, including
address, port and PostgreSQL cluster ID. Both preclaim and post-run evidence must
match the capability/public-baseline server. The query builder retains the two
historical source files and their hashes, adds only fixed server metadata, and pins
the complete resulting SQL separately. The protected after-capture bridge accepts
only these new hashes. Version-1 evidence remains historical and cannot authorize a
rehearsal; never upgrade it by editing metadata or copying identity from a baseline.

This closes the missing server-identity fields described in older sections below.
The protected preflight capture/evidence-loading boundary and reviewed staging
fixture/assembler are still outstanding. Content consistency and hash integrity
are not independent proof of live provenance. No fresh remote capture was made.

Actual new SQL, legacy content comparisons, rollback and eleven concurrency cases
passed on disposable local PG17; js-fee-test-6EW7nC stopped. No source backups read.

Final follow-up verification: typecheck +808 tests pass, none skipped; focused lint
and whitespace pass. Fixed a test-only Windows PID identity ambiguity (EPERM after
exit) using the exact temporary executable instead; running-child negative coverage
passes and protected clientClosed assertions remain unchanged. No live operation.

Latest follow-up: mandatory capability content checks are now wired into the fixed
pooler release gate. A fresh integrity-bound capture must confirm transaction-status,
transaction-identity and control-system function privileges, statistics visibility,
self activity, TLS/read-only state and the same server/cluster as the public baseline.
The actual read-only query was exercised on disposable local PG17, without assigning
an xid. Remote capture provenance/loader and reviewed staging SQL assembly remain
outstanding; no live capability assertion has been made.

Latest verification: typecheck +804 tests pass, none skipped; focused lint/whitespace
pass. Actual local PG17 capability SQL, full finance rollback and eleven concurrency
cases pass; js-fee-test-2Lgmvu stopped. The first suite run found a random VAPID
test-key export-length flake; fixed only synthetic fixtures and added explicit
shortened-key rejection coverage, then reran the entire suite successfully.

Follow-up: the fixed pooler factories now require pinned ledger/actor captures and
independent identity bindings. Their freshness/content checks run before claiming
an attempt. Protected post-run ledger/actor phases and outcome checks are wired.
This closes the content-gating portion of items 4–5, NOT the capability/provenance
gate or reviewed SQL assembly. The existing pinned ledger/actor queries do not
include server-address/cluster identifiers; their fixed-target transport provenance
still needs the reviewed outer capture/assembly boundary. Do not infer live readiness.

Follow-up verification: typecheck +798 tests pass, none skipped; focused lint and
whitespace pass. Five-phase inert Windows integration passes with exact migration
text preserved as UTF-8. No SQL source changed or live operation occurred.

## Verified defect and correction

The protected mutation path used psql VERBOSITY=terse. The exact rollback verifier
requires `ERROR:  Z0590: JWG_FINANCE_ROLLBACK_<nonce>`, but actual PostgreSQL 17 psql
terse output omits SQLSTATE. The inert simulator supplied the expected line itself,
so its prior success did not catch this real-client mismatch.

Mutation plans and the protected PowerShell helper now use VERBOSITY=verbose.
Read-only evidence remains terse. Verbose stderr stays in private phase evidence;
only the existing small phase/hash receipt crosses the bridge stdout. No raw error
details are added to public journal outcomes or user-facing reports.

`test-finance-sentinel-local.mjs` uses the actual pinned local psql executable,
extracts the diagnostic option from the offline mutation plan, and connects ONLY
through the disposable loopback harness. It proves terse fails and verbose passes
the exact nonce/SQLSTATE check. This establishes actual diagnostic behavior, not
remote TLS, pooler visibility, or live rollback success.

## Source inventory

Raw SHA256 values (including existing line endings):

| Component | SHA256 | Assessment |
| --- | --- | --- |
| 059 candidate | `e2e4defb705cf9216dac32946ca61c029477a9062bf92b7f0ba777d4d070f406` | Unchanged; pinned outer transaction extraction exists |
| 060 candidate | `482ad4c3de6126123fac4250978f81c32c368ed50940287ba3a6b03b0a588b5d` | Unchanged; follows 059 in local rehearsal |
| 059 rehearsal fixture | `6d8aa3ed9bcce8120e2b247f85cb83100c0657dceaaa2b76d48bc33a45d93b8a` | Explicit loopback/context guard; not remote-ready |
| 059 fixture assertions | `f0751c674cb276bf60f2abd2bf631620a8bffc4595a8934718c6424a866dc46c` | Contains separate local fourth-actor section and guard |
| Local fixture schema | `1b1aa0f58d8bfd526d0c4e5cc5114cd4fdd10d65474ad233172712ffa361767b` | Synthetic setup only; exclude from staging bundle |
| Sequence negative control | `c688a4411135eb16f4a730101c8eb8d2d4353e398153410dca59a0e1913892d3` | Deliberate nontransactional sequence advance; NEVER remote |

## Assembly gaps that must block live invocation

1. **There is no reviewed staging fixture yet.** The existing fixture requires
   `127.0.0.1` and `synthetic-local-only`. Do not string-replace or delete these
   guards. Prepare a separate three-account fixture with independently verified
   UUID bindings and fresh eligibility checks, preserving original profiles and
   memberships. Reuse reviewed business assertions, not the fourth synthetic actor.
2. **The local harness is not a remote bundle.** Its fixtureSetup creates synthetic
   schema/functions/triggers/RLS/rates, and its negative sequence probe deliberately
   consumes identity values. None belongs in staging. The session-level nonce
   application_name SET in the local harness is also inappropriate for the pooler
   closure contract: remote framing must use only the transaction-local marker.
3. **Digest binding does not prove SQL safety.** The protected fixed factory accepts
   caller-supplied bundle bytes and digest. It is an internal transport/controller,
   not a semantic allowlist or release command. A separate assembler must pin all
   reviewed source components, frame one bounded transaction, place identity before
   work, order 059 then 060, and end with the exact rollback exception. No commit,
   ledger insert, generator, scheduler, provider or unrelated record mutation.
4. **The capture-provenance boundary remains outstanding.** The fixed pooler
   factories now require fresh exact ledger, bound actors and capability evidence
   before any journal claim. Capability server/cluster must match the public
   baseline. Version-2 ledger/actor queries now include matching address/cluster
   metadata. JSON/hash consistency still does not authenticate live provenance;
   a reviewed outer protected evidence loader/capture integration remains necessary.
5. **Ledger/actor outcome integration is locally implemented.** Protected flow now
   captures baseline, ledger and actors independently after the attempted mutation.
   Both extra comparisons must pass before journal success, with timestamp, TLS,
   eligibility, exact ledger content and independent backend checks. Failure of one
   capture does not skip the other. This is synthetic/inert verification, not a live
   staging reconciliation or proof that every release prerequisite is complete.
6. **Actual pooler capability/behavior remains unverified.** Fresh READ ONLY checks
   must establish pg_xact_status access, required statistics visibility and identity
   permissions. Local retained-backend tests are not live Supavisor proof. A live
   rehearsal requires separate explicit staging-only approval after local gates.

## Verification this milestone

- Typecheck and all 792 tests pass, none skipped; focused lint and whitespace pass.
- Actual local PG17 diagnostic regression, full finance rollback and all eleven
  concurrency cases pass; cluster `js-fee-test-uTNxyP` stopped.
- No live service, real credential, source backup, actual staging journal claim,
  migration, deployment, commit or push. 059–060 remain unapplied.

Next safe implementation: complete the protected capture/provenance boundary and
separate staged fixture/assembler, then test locally before proposing fresh live
evidence capture or any separately approved write rehearsal.

## Follow-up — protected local file loading, 13 October 2026

The local file-loader portion of item 4 is now implemented: fixed capture filenames,
owner-only Windows ACLs, no reparse ancestors, held read handles, bounded reads before
hashing, strict encoding, receipt verification and full offline evidence validation.
An additive FromFiles factory prepares but never invokes the protected controller.
Ten new synthetic tests pass; full typecheck and 818 tests pass, none skipped;
focused ESLint passes. No SQL changed or live service/credential accessed.

Item 4 is NOT fully resolved: protected preflight capture integration is still
required; file privacy/integrity does not authenticate remote origin. The separate
staging fixture and semantic SQL assembler in items 2–3 also remain outstanding.
No new live authorization, actual journal claim, migration or release occurred.

## Follow-up — capability capture transport, 13 October 2026

The capability portion of protected preflight integration now uses the existing
bounded child transport with fixed query planning, explicit staging/session flags,
pinned resources and private create-once evidence. It verifies saved envelopes and
preserves failures without same-path reuse or raw output. Fifteen focused synthetic
capture tests pass, including timeout/closure checks; no live service was contacted.
Final regression: typecheck and all 823 tests passed, zero failures/skips; focused
ESLint and git diff --check passed. Branch/HEAD remain at release/v1-readiness-20260918
/ 319fb20, with no commit or push.

Item 4 remains partially open: version-2 ledger/actor preflight integration and
fresh authenticated capture evidence are still needed. Staging fixtures and the
semantic SQL assembler are also outstanding. Nothing here authorizes a live probe,
write rehearsal, persistent migration, commit, push or deployment.

## Follow-up — version-2 preflight integration, 13 October 2026

Added protected fixed-query release-ledger and account captures, including pinned
independent account bindings, private create-once v2 files and post-save content
verification. Historical v1 modes/files and pinned SQL are unchanged. Seven new
focused synthetic tests pass, including all required preflight captures followed
by the private evidence loader. No live project or real credential was accessed.
Final full regression passes typecheck and all 830 tests, zero failures/skips;
focused ESLint and whitespace checks pass. No SQL hashes changed.

The capture/loader implementation portions of item 4 are locally integrated; live
authenticated evidence is still absent and the final integration review remains.
Items 2–3 (staging fixture and semantic SQL assembler) remain outstanding. No live
read/write authorization, migration, commit, push or deployment is implied.

## Follow-up — pre-work guard, 13 October 2026

An offline staging guard component now binds verified target/nonce/baseline and
release evidence, rechecks server/TLS/user/time constraints, then compares the
observed three-account snapshot against pinned evidence before any planned work.
It is not the semantic assembler and cannot be treated as a complete bundle.
Local PG17 proves compilation and rejection only; the positive staging/TLS/account
comparison execution remains unverified. Items 1–3 therefore remain open.

Original migration and local fixture hashes remain unchanged. Three offline tests
and the full local PG17 rerun pass, including eleven races; both disposable clusters
stopped. A test-only retained-client clock witness was corrected without changing
production timing checks. No live services, credentials, migrations or deployment.
Final full suite passes typecheck and all 833 tests, zero failures/skips; focused
ESLint and whitespace checks pass.

## Follow-up — separate staging fixture, 13 October 2026

Separate three-account fixture/assertion components are implemented, with no changes
to the historical local-only fixture or fourth-actor/sequence-negative controls.
The guard now emits a transaction-local nonce/account ordering ticket after its
checks; the fixture consumes it. This is not a standalone target/authorization gate.
Owner-only baseline and assertions preserve original profiles/memberships/assignments,
audit/outbox/sequences while checking scoped finance actions and exact notifications.

Six focused tests pass and actual local PG17 body integration passes using an
explicitly simulated ticket, including missing/wrong ticket, duplicate actor and
profile-mutation negatives with independent rollback baselines. Full local finance
regression and eleven races pass; disposable cluster stopped. No live access.
Final full regression passes typecheck and all 836 tests, zero failures/skips;
focused ESLint and whitespace checks pass.

Item 1 has locally tested separate source components; final semantic review and
positive guard integration remain. Items 2–3 still require the pinned complete
assembler. Neither these SQL files nor the ticket authorizes remote execution.

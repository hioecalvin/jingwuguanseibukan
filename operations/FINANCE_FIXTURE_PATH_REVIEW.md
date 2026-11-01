# Finance fixture path review — 9 October 2026

Scope: the rollback-only 059–060 fixture, not all application functions. Offline
review of saved 8/9 October staging metadata; no live access this milestone.
This document does not authorize execution or establish current remote state.

## Evidence

- Dependency capture SHA256: `e87a66ae63aeaed68872f9327706a3647bf7245af1b7d9e80d3c204b89a25ba6`.
- Remaining metadata SHA256: `fb7d9837290aa4dd3542c15c27aebf2588a18f0abd5e3e0ac5a4dd36ec531fc1`.
- Exact draft hashes remain pinned by `scripts/finance-rehearsal-transaction.mjs`.
- Copied writer bodies are pinned by `scripts/finance-captured-writers.test.mjs`;
  Auth, SELECT-policy helpers and general DDL hooks have separate hash tests.
- Captured SQL definitions were inspected before copying; no credentials are copied.

## Reviewed mutation paths

| Entry/path | Reads or writes | Isolation assessment |
| --- | --- | --- |
| Fixture inserts classes/dojos | Two existing name-normalization triggers alter NEW.name only | Exact captured bodies now run locally; no nested application helper, identity or delivery call |
| Fixture inserts memberships | Existing profile/class/dojo FKs; status-change trigger is BEFORE UPDATE only | No profile/Auth insert and no membership UPDATE; fixture UUIDs are new |
| Fixture inserts Admin assignment | Validator reads dojo/class and active/Break class membership | Membership inserted first; only dedicated fixture Admin assigned to new dojo |
| Fixture rate/bill inserts | Saved defaults are UUID, date/time, enum/text, numeric, Boolean or JSON literals | No identity/default sequence path among these ten written tables; ordinary indexes still need review |
| Quote/rate resolution | Membership, profile, rates, overrides, existing bills/receipts/reports | Reads only; resolver calls Auth.uid, no provider or nested mutation |
| Member reports payment | New pending confirmations; captured full-balance trigger; assigns group ID | Calls create_notification directly for active assignments in the new dojo, not notify_dojo_admins |
| Admin confirms group | Existing review function writes receipts, confirmation status and bill status | Full-balance and new deferred group triggers apply; member-only receipt notifications |
| Admin waives one bill | New fee-history row and target bill amount/status | One member notification, reason/actor attribution; status Waived, not Paid |
| Direct read-policy tests | Nine captured SELECT policies and three helpers | Read-only profile/assignment/membership/finance paths; local grants are synthetic, not claimed exact live ACLs |

The ten written tables are classes, dojos, class_memberships,
dojo_admin_assignments, dojo_subscription_settings, membership_subscription_charges,
membership_payment_confirmations, membership_payments,
membership_fee_adjustment_history and notifications. Saved constraints for these
tables use native value checks, uniqueness, primary keys and FKs. No parent deletion
or key update is in the fixture, so ON DELETE cascades are not exercised. Null
optional rank/sub-rank references do not require real rank changes. This is review
of saved definitions, not a full reconstruction of live constraints or privileges.

Setup now records assignment and rate-setting UUIDs as well as classes, dojos,
memberships and bills. Runtime assertions verify two Admin pending alerts, two
Member receipt alerts and one Member waiver alert with correct references/content.
Pre-existing notifications remain unchanged. Normal fixture leaves identity-backed
status history and legacy outbox rows/sequence values unchanged. The local negative
sequence test is deliberately separate and MUST NOT be copied into a remote run.

## Paths explicitly excluded

- Membership status UPDATE would reach identity-backed status history and legacy
  outbox; its bridge can enqueue email. Neither update nor bridge is exercised.
- notify_dojo_admins writes the legacy outbox; it is not called by the reviewed
  payment-report path and must not be substituted for create_notification.
- Monthly notification/system generation functions are replaced as DDL by the
  candidates but are not invoked by the proposed remote fixture. No ordinary dojo
  iteration, worker, scheduler, SMTP, push, Mux or external monitor is permitted.
- Four extension-only event hooks cannot be reached by current candidate commands;
  no extension CREATE/DROP is permitted. General schema-watch NOTIFY effects are
  transaction-contained and tested locally with independent committed controls.
- The fourth actor and failure-injection helpers exist only in synthetic local
  tests. Remote scope remains exactly the three dedicated accounts after binding.

## Remaining gates — not cleared

Update, 9 October 18:49 Sydney: gate 1 below and its scoped index review were
completed under explicit read-only staging approval. See
finance-index-dependency-review-20261009.json: 33 ordinary btree indexes, no
expression indexes, three simple partial predicates and five unchanged helper
definitions. No new index dependency path identified. Original gap wording below
is retained as review history; remote executor, actor binding, fresh complete
baselines and separately approved rehearsal remain outstanding.

Local query validation completed after this review: the prepared SQL executes under
server READ ONLY and finds expression/predicate/default/check/policy dependencies
without invoking deliberately throwing test helpers. Synthetic metadata and ledger
only; this does not clear the fresh staging capture or manual-review gates below.

1. Saved captures omit ordinary index expressions/predicates and their function
   dependencies. Unique constraints alone do not describe every index. Obtain a
   narrowly scoped read-only metadata capture before declaring transitive review
   complete; an expression index can execute code during a write.
2. Review captured index/dependency bodies, plus any newly discovered object paths;
   reject missing, unsupported or changed objects. No keyword scan proves safety.
3. Complete the remote wrapper: verified target/TLS, exact ledger/candidate/catalog,
   three actor bindings, bounded single rollback transaction and independent complete
   baselines even on timeout/error. Do not reuse local guards as remote authority.
4. Fresh evidence and explicit approval for one staging-only rollback rehearsal;
   persistent application/deployment require later separate approval.

No live acceptance, migration application, browser run or production readiness is
claimed. Month-end automatic billing is still unimplemented/disabled.

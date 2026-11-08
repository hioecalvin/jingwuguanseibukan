# Staging finance UI acceptance plan — 14 October 2026

Prepared locally, not executed or deployed. The accepted database already has
006–060; do NOT reapply 059 or 060. Prior SQL/security/zero-residue evidence is
recorded in `../operations/finance-postcommit-acceptance-review-20261014.json`.

## Release preparation

- Review only the intended finance/UI/migration/gate changes against the current
  `release/v1-readiness-20260918` branch; preserve unrelated files, Supabase CLI
  metadata and protected evidence. Record an exact candidate commit before any push.
- Obtain approval to commit/push the reviewed candidate and deploy to the existing
  Vercel Preview. Assign ONLY `jingwuguanseibukan-staging.vercel.app` after READY.
  Preserve the previous staging deployment identity for application rollback.
- Confirm the deployed public configuration targets `eomubndonbetszdbhsrj` and
  obtain fresh read-only exact-ledger/catalog/lint evidence. Never weaken a guard
  or change a target because historical scripts still require 058.

## Guarded browser scope (approval required)

- Run the existing 11 staging host probes; never POST to worker endpoints.
- Use only protected Member 0101, Admin 0002 and Super Admin 0001 credentials.
  Password login/logout can change Auth session records, but not application data.
  No account creation, reset, email, push, Mux, monitor or scheduler calls.
- Run the existing guarded WebKit desktop/tablet/mobile role checks. Verify the
  finance pages render without errors and retain compact responsive layout.
  Offline collection now finds 36 cases: the prior 27 plus Member/Admin/Super
  Admin finance inspection on each of the three device projects. Collection is
  not live acceptance. The finance cases do not request a quote or submit money.
- Member: selected-month fields, amounts and outstanding/paid status are legible;
  reports clearly await receipt confirmation. No report submission in read-only tests.
- Admin: only authorized dojo finance is visible; receipt and fee-adjustment UI
  respects scope. Do not confirm, waive or reprice a real charge during this pass.
- Super Admin: expected complete finance visibility and controls, without writes.
- Any additional browser mutation test needs explicit fixture/cleanup approval;
  the prior rollback-contained SQL acceptance is not browser mutation evidence.

## Read-only guard review

The new page-load allowlist entries are `get_my_payment_confirmations`,
`get_dojo_receiving_account`, `get_dojo_monthly_payment_summary` and
`get_pending_advance_payment_groups`. Their SELECT-only STABLE bodies were
reviewed in migration 007, migration 009, the saved 8 October routine capture,
and migration 059 respectively. This is offline source review, not fresh remote
catalog verification. These RPCs must remain read-only in the deployment baseline.

RPC allowlisting now precedes the generic GET/HEAD branch, so changing an HTTP
method cannot bypass it. Quote, payment/report/review, fee adjustment and unknown
RPCs remain blocked. Existing fixed staging hosts, three-account restrictions,
off-origin blocking and artifact/credential safeguards remain in force.

## Exit criteria

Record exact commit/deployment IDs, ledger, commands, pass/failure counts and
limitations. Stop on drift, unexpected requests or role leakage. Never claim this
plan, local mocks or old browser evidence verify a new live deployment. Fresh
006–060 backup/recovery and remaining production gates are separate requirements.
Production, retired/disposable projects and external delivery providers stay out
of scope.

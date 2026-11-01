# Production handoff — 16 October 2026

This is a remaining-work checklist, not release approval or a passing evidence manifest.
The user requested autonomous completion of routine work. Existing restrictions on
production, messages and consequential changes remain in force.

## Verified release identities

- Branch: `release/v1-readiness-20260918`; local HEAD inspected: `d5785c6`.
- Recorded staging runtime: `ea004d36d8fd9e65bda981b6e131f6b739392690`.
- Recorded staging deployment: `dpl_7MyaSqrhiQCMXNyfm5SwKVjpHM7y`.
- Current migration contract: 006–060, exactly 55 migrations. Historical 056/058
  evidence is retained but must not be relabelled as current.
- Staging host/browser evidence: `staging-release-060-acceptance-20261015.json`.
  Its 11 host probes and 36 browser results are historical, not recaptured today.
- Recovery results and latest limitations: see the newest section of
  `../PROJECT_CHECKPOINT.md` and its linked receipts.

## Remaining launch gates

1. Restored-account Auth acceptance is complete: three roles pass login/refresh/
   logout, independent snapshot/config comparison passes, and the disposable target
   is independently confirmed paused with Auth disabled. Retain
   `recovery-060-auth-success-20261016.json` and its protected evidence.
2. Perform the application rollback rehearsal with pinned candidate/known-good
   immutable deployments, then restore the candidate. Do not switch production.
   The retained `319fb20` Preview is not an approved fallback: it predates current
   waived-status UI and dependency patches. See `rollback-preflight-20261016.json`.
   Preserve current `ea004d3` as a potential known-good baseline for a reviewed newer
   candidate; do not infer compatibility merely from Vercel Ready status.
3. Obtain physical Safari evidence for iPhone, iPad and Mac against the exact
   release: public navigation, login/logout, all three roles' read-only workflows,
   certificate verification, responsive layout, VoiceOver, input navigation, zoom,
   focus/errors, reduced motion and contrast. Playwright WebKit cannot satisfy this
   physical-device gate. Use `release/physical-safari-manifest.template.json` outside
   the checkout; never turn deferred checks into passing assertions.
4. Reconcile release-bound Mux, email delivery/retry/exhaustion, scheduler cadence,
   monitoring and backup-failure alert evidence. Do not send acceptance messages or
   enable schedulers without an approved target, recipient and execution window.
5. Identify and authorize the exact new Singapore production target and import plan.
   The migration chain starts at 006 and cannot initialize an empty database alone.
   Preserve the pre-006 baseline; do not run a blind `supabase db push`.
6. Prepare production-specific secrets, approved real role roster, domain/TLS/Auth
   URLs, known-good rollback deployment and named release/rollback/monitoring owners.
   Never copy staging test users or credentials into production.
7. During an explicitly approved cutover window, execute the scoped import and
   deployment, verify exact ledger/catalog/RLS and read-only role/host acceptance,
   and validate the complete protected release evidence packet. Stop on a blocker.

The current scope is web-only. The Windows uploader is withheld, not passed.
The development-dependency advisory exception expires on 19 October 2026 at
11:09:49 UTC; dependency acceptance must be rechecked before release.

Use the existing bootstrap, rollback, provider, monitoring, cutover and evidence
packet runbooks. Their offline validators check consistency; they do not perform
the external work or authorize a production release.

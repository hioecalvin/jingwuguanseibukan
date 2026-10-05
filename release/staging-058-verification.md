# Staging 057–058 verification — 5 October 2026

## Deployed target

- Release commit: `8143a204360c00b9abdeab72a68c886af85f4947`.
- Branch: `release/v1-readiness-20260918`; no merge.
- Supabase: `eomubndonbetszdbhsrj` only, exact ledger 006–058 (53 versions).
- Vercel Preview: `dpl_9SmayAxT3GgDyHLP68EGtssLSzcP`, verified READY.
- Only reassigned alias: `jingwuguanseibukan-staging.vercel.app`.
- Public registration bundle: 11 same-origin scripts, only expected staging
  Supabase host found. This is not a server-secret attestation.

## Completed checks

- `npm run typecheck`; `npm test`: 548 tests passed.
- `npm run lint`: passed.
- `npm run test:browser -- --project=webkit-mobile --project=webkit-desktop
  --project=webkit-tablet --project=chromium-mobile`: isolated production build
  and 232 browser tests passed.
- Workspace `Invoke-057058Staging.ps1 -Mode Rehearse`, then `Apply`, then `Test`:
  approved migrations applied atomically after rehearsal; persisted acceptance
  rolled back, followed by independent comparison of 13 data/audit/outbox tables,
  unchanged old directory function and exact migration ledger.
- `scripts/run-staging-database-verifier.ps1`: strict staging verifier passed.
- `scripts/security-smoke.mjs`, explicitly pinned staging with protected existing
  accounts: all 12 role/privacy checks passed. Password login and local logout;
  no password resets, user creation or outbound delivery.
- Staging-pinned Supabase CLI `db lint --level warning`: no schema errors.
- `scripts/probe-staging-host.ps1`: all 11 host/security-header probes passed.
  Worker routes were checked with GET only, never triggered.
- `npm audit --omit=dev --audit-level=high`: zero production dependency findings.

## Browser acceptance

All 27 guarded live WebKit desktop/tablet/mobile cases have passing evidence:
24 passed in the first complete run; the three Member cases passed on focused
rerun (46.6 seconds) after correcting a test selector. The initial directory
assertion incorrectly included Next.js's empty route-announcer alert outside main.
The selector now checks directory errors inside main; application logic and
security guards were not relaxed. The runner blocks unapproved mutations and
off-origin/provider traffic and removes credential-bearing temporary artifacts.

The focused runner initially matched no tests because its anchored grep did not
account for Playwright's project/file prefix. The corrected fixed-title filter
selected exactly the intended three cases; no tests were skipped or disabled.
The follow-up test/evidence commit does not change the deployed application.

## CI limitation — not green

GitHub run [37299562571](https://github.com/hioecalvin/jingwuguanseibukan/actions/runs/37299562571)
stopped at the full dependency audit. It did not run the remaining remote test
jobs. The affected path is development-only:
`eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces@3.0.3`.
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
reports deeply nested brace-pattern stack exhaustion and no patched version.
Npm reports five high findings along this dependency chain. Its forced fix would
downgrade eslint-config-next to 14.2.35; that breaking downgrade was not performed.
No audit exceptions, gate suppression, or CI success claims were made.

## Boundaries and follow-up

Production, retired and disposable projects were not contacted. No schedulers,
email/push workers, provider delivery or video operations ran. Unrelated
`recovery/README.md` and `supabase/.temp` edits were left uncommitted and intact.

Production still requires resolving the CI advisory gate and refreshing recovery
evidence for 006–058; historical 006–056 restore proof is not new-chain proof.
This milestone verifies the requested directory and tier/assessment boundaries,
not all legacy class-management endpoints or complete production readiness.

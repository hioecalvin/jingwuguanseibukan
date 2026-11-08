# Bounded no-send scheduler acceptance

This document describes the no-send candidate; it is not deployment evidence or
approval to provision credentials, enable cron, send monitoring pings or change
provider settings. A disabled staging deployment requires separate verification.

## Safety boundary

`POST /api/system/staging-scheduler-probe` returns a small, explicit `no_send_probe`
receipt. It imports only a server-only config guard, constant-time secret matcher,
and Next response helper. It cannot call Supabase, Resend, the queue, memorials or
the ordinary email-worker route; request content is deliberately never consumed.
It is not an empty-queue run and cannot establish ordinary-worker acceptance.

The route is disabled (404/no-store) unless explicitly enabled on the exact staging
Preview release branch, Supabase/site URL, full commit and short UTC window. Enabled
requests require the exact origin/path (no query), independent acceptance secret,
trial UUID and full commit headers. Unauthorized requests return 403/no-store.
The secret must be 48–128 base64url characters, distinct from worker/push secrets.
No secret is returned or logged. No live credentials were created for this candidate.

## Matching configuration, only after separate approval

The Cloudflare scaffold remains in the workspace's `staging-readiness/email-scheduler`.
It requires explicit `EXECUTION_MODE=acceptance`; missing/unknown modes never fall
through to the normal worker. Checked-in `ENABLED=false`, zero cron triggers and
disabled public URLs remain. Acceptance is pinned to the new probe URL, not a
configurable target, and does not send the ordinary worker credential.

Both services must receive the same:

- `SCHEDULER_ACCEPTANCE_ID`: v4 UUID.
- `SCHEDULER_ACCEPTANCE_COMMIT`: full lower-case release SHA.
- `SCHEDULER_ACCEPTANCE_START` and `SCHEDULER_ACCEPTANCE_END`: canonical UTC ISO
  timestamps including milliseconds, at most ten minutes apart.
- `SCHEDULER_ACCEPTANCE_SECRET`: independently generated protected secret.

The app additionally requires `SCHEDULER_ACCEPTANCE_ENABLED=true` and its existing
staging/Preview/release identity bindings. The scheduler additionally requires
`SCHEDULER_ACCEPTANCE_MAX_ATTEMPTS` exactly `1`, `2` or `3`, staging project binding,
and the existing protected Healthchecks URL. Approval must cover those monitoring
pings/possible failure alerts. The old provisioning wrapper is not authorization
or a ready-made acceptance deployment procedure; review it and credential scope
before any future upload. Do not reuse expired deployment credentials silently.

## Bounded execution

The existing singleton Durable Object atomically stores an `acceptance` record
alongside its existing lock/last-slot state. It pins trial ID/window/commit/cap and
counts a claim before any HTTP call. Duplicate slots do not spend additional claims.
Expiry during storage work consumes a claimed allowance conservatively and retains
the lock; no network call follows. Persisted state and counts survive restarts.
Changing the UUID, bounds, commit, cap or mode cannot silently reset that state.
No reset endpoint, object renaming or cleanup mechanism is added.

Before claiming, inside the transaction and immediately before probe egress, a full
55-second request plus 5-second heartbeat allowance must fit before expiry. After
the probe, heartbeat egress has its own expiry check. Network uncertainty, unhealthy
response or failed/unconfirmed heartbeat retains the trial lock. No HTTP retries.
Only an exact release/window/trial-bound `no_send_probe` receipt is accepted; an
ordinary-worker success body is rejected. Sanitized history uses `probe_healthy`,
not `healthy`, so it cannot be relabelled as normal-worker acceptance.

Expiry prevents new calls; it cannot revoke a request already accepted by a remote
service, nor remove Cloudflare cron configuration. A future trial must still finish
by disabling/removing cron and pausing its monitor, with independent verification.
The no-send endpoint prevents any queue/provider/member effects even during races.

## What remains unverified

Initial local verification passed 588 application tests/typecheck, focused lint,
an isolated optimized build and disabled-route checks. Record the actual deployment
ID, release SHA and host results separately after any approved disabled deployment;
these local checks are not live acceptance evidence.
Historical scheduler deployment hashes are preserved; local core/config differ. The
existing ordinary-worker source was not changed. Actual cadence, remote secret and
deployment bindings, ordinary-worker producer isolation, and real worker delivery
remain separate gates. A later recurring-mode approval must explicitly reconcile
the retained trial record; never clear it merely to get another attempt.

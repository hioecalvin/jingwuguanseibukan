# Monitoring, incident and rollback readiness

The release-window manifest says that monitoring is approved. This separate gate
records what is actually covered and whether the alert and rollback paths were
tested. It is deliberately offline: it does not query Vercel, Supabase, Resend,
Mux or any production system.

Copy `monitoring-readiness-manifest.template.json` to protected evidence storage,
complete it from independently reviewed monitoring evidence, then run:

```powershell
node scripts/monitoring-readiness.mjs `
  --manifest=C:\protected\evidence\monitoring-readiness.json `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment=<exact-deployment-id>
```

The checked-in template must fail. A pass requires:

- application HTTP status, route/method, deployment, latency, error-rate and
  missing-telemetry coverage;
- failed-login, privileged authorization and password-reset abuse signals;
- database availability, saturation, ledger drift, RLS/grant regression,
  privileged audit and backup-failure signals;
- one-minute email-worker liveness, alerts for every non-success response including
  401/429/500/502/503, complete sanitized queue health, stale claims, exhausted
  attempts and queue growth;
- an explicit hidden Web Push disposition, or complete provider, persistence,
  delivery, alert-acceptance and release-stop coverage before push is enabled;
- Mux API, credentials, processing, signed-playback and orphan-asset coverage;
- independent primary and backup alert paths, a tested escalation, named owners,
  a tested known-good application rollback and database recovery point;
- release-stop signals that match the production release gate; and
- explicit redaction of authorization headers, sessions, secrets, recipients,
  message bodies, provider identifiers and raw database errors.

The manifest is bound to the independently supplied release commit and deployment,
and every object uses an exact field allow-list. Never put alert credentials,
database URLs, session values, personal information,
email bodies, recipient addresses, provider IDs or raw errors in this manifest.
Store detailed evidence outside the repository and include only a sanitized
protected-evidence reference. The validator rejects undocumented fields, common
secret-bearing fields and credential shapes, but that guard is not a substitute for
evidence review.

A passing offline manifest is not evidence that a live alert is still configured.
Re-verify it within 30 days and again immediately before the release window. Keep
monitoring active throughout rollback. Any required signal that cannot be observed,
any failed alert delivery, or any lost rollback access is a release stop condition.

## Incident response boundary

During a release window, stop immediately on an authentication or authorization
regression, an RLS/grant or ledger mismatch, email-worker persistence/delivery
failure, Mux upload/playback failure, server-error threshold breach, or loss of
rollback access. The monitoring owner records the first observed timestamp,
deployment ID, sanitized signal category and affected route. The incident commander
chooses containment; the rollback owner alone executes an approved rollback.

Do not copy tokens, email addresses, message content, database errors or provider
identifiers into chat or the incident timeline. Preserve protected evidence and
compare the active deployment with the independently recorded known-good deployment.
Application rollback must not be treated as database rollback. If a database change
may be involved, stop writes where safely supported and use the separately tested
recovery procedure; never reverse a migration ad hoc during the incident.

After containment, verify application health, Auth boundaries, database security,
email queue health and Mux playback independently. Continue monitoring through the
whole recovery window. Do not resume the release until the original stop signal has
cleared, alert delivery is working, zero unintended mutation is established where
applicable, and the incident commander records a new explicit go/no-go decision.

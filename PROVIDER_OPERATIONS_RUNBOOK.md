# Provider operations and acceptance

This runbook covers release gates that source tests cannot prove: Resend delivery,
the email-worker scheduler, Supabase Auth redirects/templates, Web Push/VAPID, and
the organization-owned YouTube channel. Production remains out of scope until the
staging record is complete and a separate production change is approved.

Never place API keys, worker secrets, VAPID private keys, full push subscriptions,
personal email addresses, or authentication links in source, screenshots, logs, or
release evidence.

## Offline configuration gate

```powershell
node scripts/provider-config-readiness.mjs `
  --environment=staging `
  --expected-origin=https://STAGING-APP-HOST `
  --expected-supabase-host=eomubndonbetszdbhsrj.supabase.co `
  --env-file=C:\protected\jingwuguan-staging.env
```

This validates browser/server separation, the deployment origin, expected Supabase
host, sender syntax, independent high-entropy worker secrets, and a matching P-256
VAPID key pair. It does not prove that hosted resources exist or delivery works.

Run `npm test` before promotion. The local provider-operation tests also verify
the two-minute email-health contract, server-only health RPC access, local-only
push click targets, and the hardened YouTube iframe attributes. These are source
checks, not live provider evidence.

## Supabase Auth redirects and templates

1. Set the staging Site URL and `/auth/confirm` redirect to the exact HTTPS staging
   host. Do not add wildcard, HTTP, production, or arbitrary preview origins.
2. Keep email confirmation enabled and verify the hosted password policy.
3. With a dedicated staging mailbox, test success, expired/reused/tampered links,
   wrong-host redirects, registration reapplication, and password reset.
4. Confirm final URLs and logs do not retain token hashes, codes, or credentials.

## Resend and email-worker scheduler

1. Verify the staging sending domain, sender, SPF, DKIM, and DMARC.
2. Schedule `POST /api/system/email-worker` once per minute with
   `x-worker-secret` stored only in the host secret store.
3. Apply migration 033 to staging through the guarded migration process before
   relying on the worker's two-minute delay signal. Do not edit already-applied
   migrations 006–032.
4. Alert on non-execution, HTTP 401/429/500/502/503, an `overdueReadyEmails`
   count above zero, exhausted attempts, stale processing claims, and a growing
   queue. A 502 can still include successfully delivered rows; use the counters.
   A 503 means the delivery loop completed but queue health is failing.
5. Store each invocation timestamp, HTTP status, `processed`, `sent`, `failed`,
   and the sanitized `queueHealth` object. Never store the worker secret, message
   bodies, recipients, provider IDs, or raw database errors in monitoring.
6. Prove empty queue, one message, a 20-message batch, backlog drain, overlapping
   invocations, rejection, acknowledgement failure, claim recovery, and exhaustion.
7. For retry timing, verify attempt 1 is not reclaimed before five minutes and is
   reclaimed after it is due. Confirm the health check does not flag an intentional
   future backoff, then flags it if it remains ready for more than two minutes.
8. Verify registration decisions, password reset, events, settlements, and
   subscription notices with test-only recipients.

## Web Push and VAPID

1. Use a staging VAPID pair; keep the private key and `PUSH_API_SECRET` server-only
   and distinct.
2. Test subscribe/resubscribe/unsubscribe, denial, multiple devices, stale 404/410
   endpoints, temporary failure, and persistence-failure monitoring.
3. Confirm every notification click target remains on the deployed application
   origin. Test `//host`, backslash, control-character, absolute-URL and malformed
   payloads; all must be rejected or fall back to `/notifications`.
4. Test real Chromium/Android and Safari on iOS/iPadOS. Desktop emulation is not
   proof of iOS Web Push or Home Screen behavior.
5. Keep notification targets on local application paths.

## YouTube Unlisted video

1. Use an organization-owned channel protected by two-factor authentication and
   reviewed recovery contacts.
2. Set each repository video to **Unlisted** and allow embedding. Do not use Public
   for member-only material; Private normally prevents ordinary member embeds.
3. Enter the URL in Admin → Content and verify the privacy-enhanced preview.
   Confirm both Admin preview and Member playback load from
   `youtube-nocookie.com`, retain the iframe sandbox/referrer policy, and do not
   redirect the top-level application.
4. Verify repository authorization separately as Member, scoped Admin, and Super
   Admin; the unlisted link itself is shareable and is not an authorization layer.
5. Confirm both client-side logos appear for every class on mobile, tablet, desktop,
   and actual Safari. Verify replacement organization/class logos after deployment.
6. Audit channel ownership, visibility, removed videos, copyright status, and broken
   embeds on a defined schedule.

No YouTube API credential is required for embeds. The logos are deterrent branding,
not DRM or burned-in forensic watermarks; screen recording and local overlay removal
remain possible.

## Promotion evidence

Every gate needs an owner, UTC timestamp, PASS result, and protected evidence
reference with no production mutation. Review hosted redirects, DNS, scheduler,
channel custody, and secret custody with a second authorized operator. Local tests,
a successful build, or a staging pass alone are not production approval.

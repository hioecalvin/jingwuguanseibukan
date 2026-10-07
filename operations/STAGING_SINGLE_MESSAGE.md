# Staging single-message acceptance guard

Status: implemented and tested locally; disabled by default. This document does
not authorize deployment, fixture creation, sending, cleanup or scheduler activation.

## Boundary

`POST /api/system/staging-email-test` is separate from the ordinary email worker.
It accepts no body and sends only fixed synthetic content to one operator-bound
recipient. It does not run memorial publication, claim the ordinary queue, create
an account/event, or reset/requeue a failed message. The ordinary worker is unchanged.
No new migration is needed: the guard uses existing `email_outbox` fields and
`mark_email_sent`. The recorded active migration inventory remains 006–058.

Bodyless POSTs may arrive as either a null body or a closed empty stream. After
authentication, the handler accepts immediate end-of-stream, rejects any chunk
(even a zero-length chunk), cancels/releases the reader, and rejects read/lock/
cancellation errors without logging caller content. It never buffers/parses a
request body or trusts Content-Length to establish emptiness. After asynchronous
stream validation it rechecks the approved time window before database work.
This compatibility correction is locally verified, not yet deployed or live-send
verified. It does not explain the earlier unauthenticated disabled-gate response.

The gate requires all of the following, with no enabling defaults:

- `STAGING_EMAIL_TEST_ENABLED=true`, `NODE_ENV=production`, `VERCEL_ENV=preview`.
  NODE_ENV means an optimized runtime, not authorization to use production.
- `VERCEL_GIT_COMMIT_REF=release/v1-readiness-20260918`.
- `STAGING_EMAIL_TEST_COMMIT`: exact lowercase 40-character release commit, matching
  Vercel's `VERCEL_GIT_COMMIT_SHA`. Do not fabricate Vercel system variables.
- `STAGING_PROJECT_REF=eomubndonbetszdbhsrj` and its exact HTTPS Supabase URL in
  `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SITE_URL=https://jingwuguanseibukan-staging.vercel.app` and that
  exact request origin/path, without query parameters.
- `STAGING_EMAIL_TEST_ID`: one fresh lowercase v4 UUID, also provided in the
  `x-staging-email-id` request header.
- `STAGING_EMAIL_TEST_SECRET`: a freshly generated independent random base64url
  secret, 43–128 characters, also provided in `x-staging-email-secret`. Never put
  secrets in URLs, source control, screenshots or operator logs.
- `STAGING_EMAIL_TEST_RECIPIENT` and `STAGING_EMAIL_TEST_RECIPIENT_CONFIRMATION`:
  the same approved, lowercase, owned mailbox. This equality is a configuration
  check, not proof of mailbox ownership. Sender, role/reserved addresses and
  configured security-test identities are excluded.
- `STAGING_EMAIL_TEST_START` and `STAGING_EMAIL_TEST_END`: explicit timestamps
  with timezone, bounding at most 15 minutes. The current time must fall within
  this window before inventory, before claim and after claim.
- Verified staging-only Supabase server credentials, domain-scoped sending-only
  `RESEND_API_KEY`, and a verified mailbox in `EMAIL_FROM_ADDRESS`.

The handler checks profiles and Auth users for the recipient before claiming.
Any error or a full 1,000-user first page fails closed. This inventory is not a
transactional lock against simultaneous registration; operators must independently
confirm recipient ownership and prevent the acceptance mailbox from being enrolled
during the test window. Host checks supplement, not replace, secret authentication.

## Fixture contract (requires separate approval)

An owner must separately prepare exactly one synthetic `email_outbox` record.
Do not reuse a member message, ordinary pending row or earlier attempted UUID.

| Field | Required value |
| --- | --- |
| id, reference_id | The configured UUID |
| recipient_email | The configured approved mailbox |
| status | cancelled |
| attempts / max_attempts | 0 / 1 |
| email_type | class_event_notification |
| reference_type | staging_single_message_v1 |
| dedupe_key | staging-single-message/ followed by the UUID |
| subject / template_data | Exact exported STAGING_EMAIL_SUBJECT / STAGING_EMAIL_TEMPLATE in lib/email/staging-single-message.ts |
| recipient_user_id, created_by | null |
| sent_at, failed_at, last_attempt_at, next_attempt_at | null |
| provider_message_id, last_error | null |

The fixed template identifies the content as STAGING TEST, not a real class/event.
The existing renderer is reused; no real event or member record is needed.

All listed fields participate in the atomic conditional update. A successful
claim changes status to processing and attempts to 1. Only that claimant may call
Resend; subsequent calls cannot reclaim the row. Existing worker SQL excludes a
cancelled row and cannot retry an exhausted row with attempts=max_attempts=1.

Resend is pinned to `https://api.resend.com`, with redirects rejected, a timeout
of at most 10 seconds, and idempotency key `email-outbox/<UUID>`. The installed SDK
is tested with mocked fetch for no automatic retry. A provider error, timeout or
lost acknowledgement does not release the database latch.

## Approval and evidence sequence

1. Review/commit the intended change separately. Deploy to staging only with the
   guard disabled; prove the exact Preview commit, alias and server configuration.
2. Before enabling, independently verify staging ledger/catalog, current claim
   and acknowledgement SQL, grants/RLS, sender/provider ownership, recipient
   isolation and protected credentials. Keep scheduler and normal worker inactive.
3. Separately approve fixture creation and one test message to the named inbox.
   Capture row/table baselines and exact fixture identity in protected evidence.
   Choose a test window that accommodates deployment; if it expires, stop.
4. Invoke once with a bodyless POST and protected headers. Never automatically
   retry, reset attempts, replace the UUID or switch to the ordinary worker.
5. `provider_accepted` is NOT inbox delivery. Verify the exact provider event and
   received message independently, plus the exact outbox row and unchanged
   unrelated baselines. Any uncertain result requires read-only reconciliation.
6. Disable/remove the temporary gate configuration and secret. Preserve provider
   and database evidence. Cleanup, if approved, must target the captured fixture
   and exact associated audit records only; never erase historical queue rows.

On a timeout, expiry after claim, provider rejection or acknowledgement error,
the fixture intentionally remains consumed. Do not delete it or rearm it before
reconciliation. Provider idempotency is a secondary safeguard, not permission to
retry after its retention expires. A normal worker may mark an old processing
fixture failed, but must not resend it because its attempt budget is exhausted.

## Verification boundary

Local tests exercise the real handler with explicit dependency fakes, including
an in-memory atomic-claim model and eight simultaneous requests. SDK tests mock
all fetch calls. These do not prove live PostgREST JSON equality, actual database
locking/grants, Vercel request-origin handling, deployed secret identity or inbox
delivery. Guarded staging acceptance remains required before any live success claim.
This narrow route does not certify the normal scheduler, bulk queue worker,
password-reset delivery, monitoring alerts or production readiness.

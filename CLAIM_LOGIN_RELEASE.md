# Registered member account claims

Members claim their existing imported profile with its registered email address and date of birth. A verification link goes only to that registered address. After identity approval by an assigned Dojo Admin (or Super Admin), a separate email lets the member choose a password. Existing memberships and JS IDs remain unchanged. Missing/incorrect contact details require Dojo Admin correction.

## Release and operations

- Apply 066_registered_email_dob_claim.sql then 067_claim_only_email_delivery.sql. Production database verification on 1 November 2026 passed through exact ledger 006–067, preserving every member/activity table baseline.
- Enable MEMBER_CLAIMS_ENABLED and MEMBER_CLAIM_EMAIL_DELIVERY_ENABLED only for the intended production deployment after release checks. Both flags are required for delivery. Preview/staging must retain their own configuration.
- Request responses do not disclose whether a member matches. Request/email limits apply. Verification and setup proofs remain in URL fragments; do not log or paste links.
- Only request-triggered verification and scoped approved-claim setup emails are delivered. The general email worker/scheduler stays disabled. No ordinary announcements, birthday jobs or bulk invitations are enabled by this change.
- A repeated eligible request can retry due verification mail. An authorized Admin can select Retry setup email on a specific approved claim; refreshing the review list never sends mail. Current reviewer scope and the original approver's authority are rechecked. Retries respect database backoff, attempt ceilings and a 23-hour outbox-age cutoff. Already-sent emails are not resent. Provider calls use the unchanged outbox ID as idempotency key. Ambiguous provider/database results are never immediately resent.
- If delivery remains unresolved, inspect protected queue/provider evidence. Do not reset member passwords, send unrelated queue entries or enable the general scheduler to clear the queue. Expired claims can be restarted through the guarded claim flow.

## Verified evidence

996 repository tests, typecheck, scoped lint and isolated production build passed. Full exported-schema local acceptance passed 541 checks with 33 behavior and 20 conversion assertions; the exact migration envelope passed 542 checks. Local tests used synthetic records and no delivery providers. Production migrations independently passed exact-ledger, service-only ACL and row-preservation checks. Live email receipt and completed production account-claim acceptance are not asserted by this document.

# No-send staging email diagnostic

POST `/api/system/staging-email-diagnostic` is a temporary, authenticated, pure
runtime-configuration probe. It never opens a database/provider client, changes
environment variables, claims a fixture or sends email. The existing send gate is
unchanged. Returned fields are fixed labels and booleans only, with no-store.

The diagnostic requires the exact staging project/database/site bindings, Preview
environment, `STAGING_EMAIL_DIAGNOSTIC_ENABLED=true` and explicit START/END values
under that prefix bounding at most 15 minutes. It refuses requests if
`STAGING_EMAIL_TEST_ENABLED=true`. Authenticate with the existing protected staging
`EMAIL_WORKER_SECRET` in `x-worker-secret`, never a URL or request body. Supply the
expected 40-character release SHA in `x-staging-diagnostic-commit`.

The report shows stable runtime guard checks. `simulatedConfigAccepted` invokes
the existing pure guard with synthetic in-memory fixture/recipient/secret/window
values; it neither activates nor exercises the sending handler. This is not
provider validity, database access, fixture eligibility or delivery evidence.
`actualSendConfigAccepted` must be false. URL and direct-versus-dynamic NODE_ENV
checks help distinguish runtime configuration from alias/compiler behavior.

Deploy only to the existing release-branch staging Preview under approval. Keep
all send-enabling variables absent, confirm the send route remains 404/disabled,
then remove the three diagnostic settings and restore the prior disabled alias.
Preserve evidence. Immutable Preview configuration expires at its original END;
removing project settings alone does not erase it. Do not send/rearm the existing
fixture or extend the diagnostic window without separate authorization.

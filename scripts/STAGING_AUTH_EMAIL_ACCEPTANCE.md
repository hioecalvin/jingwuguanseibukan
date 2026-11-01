# Staging Auth and email acceptance preflight

`staging-auth-email-readiness.mjs` is an offline, fail-closed prerequisite for a
future registration, email-confirmation, password-reset, and forced-password-change
acceptance run. It does not contact the application, Supabase, Resend, Vercel, an
inbox, or any other provider.

The earlier disposable-registration design was unsafe because deleting an Auth user
alone does not prove cleanup of the related profile, initial class request,
password-reset request, email outbox rows, or other catalog-discovered dependencies.
The preflight therefore requires a current read-only catalog digest and the digest of
an independently reviewed cleanup plan before it can report `ready: true`.

## Protected inputs

Keep these values in an absolute protected environment file, never in Git or command
arguments:

- `STAGING_AUTH_ACCEPTANCE_INBOX` and an exact repeat in
  `STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION`;
- `STAGING_AUTH_ACCEPTANCE_RUN_ID`, using
  `JWG-AUTH-YYYYMMDD-XXXXXXXXXXXX`;
- the isolated staging class and dojo UUIDs;
- distinct strong registration and replacement passwords;
- `STAGING_AUTH_ACCEPTANCE_CATALOG_FILE` and
  `STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256`, identifying the current read-only
  catalog evidence;
- `STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE` and
  `STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256`, identifying the independently
  reviewed cleanup plan;
- the complete cleanup-scope list, including at least the scopes printed by the tool;
- the review token issued by the first offline preflight.

The normal exact staging URL, project ref, Supabase keys, sender address, and existing
role-security account addresses must also be present. Results contain variable names,
fixed target metadata, and a derived review token only. They do not print the inbox,
passwords, Supabase keys, or protected evidence paths. The two evidence files must be
non-empty regular files outside the repository, no larger than 32 MiB, distinct from
each other, and must match their recorded digests exactly.

## Two-pass review

Run from the repository root:

```powershell
npm run auth-email:staging:preflight -- --env-file=C:\protected\jingwuguan-staging.env
```

The first pass intentionally fails while issuing an HMAC review token bound to the exact
staging target, inbox, run ID, class, dojo, catalog digest, cleanup digest, and cleanup
scopes. The existing protected worker secret keys the HMAC so the displayed token does
not act as an offline digest of the dedicated inbox. After an independent review, place that token in
`STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN` and run the same offline command again. Any
change to the reviewed scope invalidates the token.

## Live-run boundary

Do not treat a passing preflight as live evidence. A later, separately approved live
runner must still:

1. confirm the fixed staging alias resolves to the intended release;
2. repeat a read-only catalog and fixture inventory immediately before mutation;
3. create exactly one captured Auth user using the dedicated inbox;
4. prove confirmation redirects to the fixed `/auth/confirm` route;
5. scope any password-reset request and outbox delivery to captured UUIDs;
6. prevent an email-worker invocation from consuming unrelated due messages;
7. delete only objects matching the captured UUIDs and marker;
8. independently prove the database/Auth baselines and marker inventory are restored.

Inbox messages and provider delivery logs are retained acceptance evidence and cannot
honestly be called zero residue. “Zero residue” for this workflow must be limited to
the application database and disposable Auth account, with those external records
listed explicitly as exceptions.

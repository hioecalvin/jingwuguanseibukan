# Production cutover evidence

This gate validates a sanitized record of an already approved production cutover
and its guarded read-only acceptance. It never connects to Supabase, Vercel, DNS,
email, push or Mux; it cannot perform or authorize a migration, deployment, provider
change or traffic switch.

## Evidence boundary

Copy `release/production-cutover-evidence.template.json` to protected storage outside
the repository. Record no member details, email addresses, credentials, tokens,
cookies, database URLs, screenshots or raw logs. Store those in separately protected
evidence bundles and put only their distinct SHA-256 digests in this manifest.

The record must bind:

- the exact `release/v1-readiness-20260918` commit and immutable production
  deployment;
- the independently observed Singapore production project and Supabase origin;
- fresh exact migration history 006–056, catalog, database lint, strict security
  verifier, grants and RLS evidence;
- either a resolved managed-platform future-object default ACL or the narrowly scoped
  exception shown in the template, independently reviewed and expiring within 30
  days;
- reviewed existing Member, scoped Admin and Super Admin accounts selected from a
  separately protected, independently approved account/role roster; no dummy or
  security-test identity may be created or retained;
- the exact production domain, valid TLS, Site URL, `/auth/confirm` redirect and
  public Supabase project binding, with no staging or retired-project residue;
- all 11 host probes, guarded read-only browser acceptance, redirects, security
  headers, zero server errors and zero application/domain acceptance writes;
- no member mutation, new test account, outbound-provider, staging or retired-project
  contact, plus a reachable known-good rollback deployment.

All timed database, default-ACL, role, domain and probe evidence must be at most 24 hours old.
The independent review must follow every capture.

## Validate

While `attestation.reviewDigest` still contains its placeholder, calculate the
canonical digest after every other field is complete:

```powershell
npm.cmd run production:cutover:check -- `
  --manifest=C:\protected\evidence\production-cutover.json `
  --expected-commit=<40-character-reviewed-commit> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --expected-production-project-ref=<exact-20-character-production-ref> `
  --expected-window-starts-at=<approved-window-start-with-offset> `
  --expected-window-ends-at=<approved-window-end-with-offset> `
  --print-review-digest
```

Save the single printed digest as `attestation.reviewDigest`, then rerun without
`--print-review-digest`. Stop on every blocker. After it passes, hash the exact file,
copy its sanitized summary and digest into the protected release-window record, and
include its absolute path in the protected release-evidence index.

`allFindingsDispositioned` means every finding is either resolved or covered by the
single permitted, approved, time-bounded ACL exception; it does not claim that an
accepted exception has been remediated.

## Reproducible read-only acceptance

Complete these checks during the approved window and retain a sanitized JSON result
plus raw protected evidence. The 11 host probes are: `/login`, `/register` and
`/auth/error` return 200; `/`, `/repository` and `/admin` return either a 307 to
`/login` or the reviewed Next.js encoded login redirect; GET requests to
`/api/system/email-worker`, `/api/push/send` and `/api/subscribe` return 405;
`/sw.js` returns non-empty JavaScript; and
`/logos/organization/logo-js.png` returns a non-empty PNG. The `/login` response must
carry the documented CSP, HSTS, Referrer-Policy, Permissions-Policy,
X-Content-Type-Options and X-Frame-Options controls and omit X-Powered-By.

For browser acceptance, use only existing production Member, scoped Admin and Super
Admin accounts selected from a separately protected account/role roster that
underpins the sanitized aggregate identity evidence. For each role, record login,
authorized landing/navigation, one representative authorized read, one representative
out-of-scope denial, and logout. Apart from the login form, do not submit a form, invoke a mutating RPC, create an
account, publish content, upload media, send a provider message or alter a member.
Capture application/domain audit and write counters immediately before and after and
require no change attributable to acceptance. Login, token refresh and logout may
create expected Supabase Auth session, refresh-token, last-sign-in or Auth-audit
records. Login also updates HMAC-keyed counters in `public.api_rate_limit_buckets`;
retain and review the login-only limiter counters separately as operational evidence.
These expected Auth and login limiter writes are excluded from business/application
acceptance-write counts. No profile, membership, finance, content, notification or other public-schema
business row may change. Hash the exact protected HTTP, browser and
before/after database records; those hashes populate `probes.evidenceSha256` and
`roleSecurity.evidenceSha256`. Booleans without those retained records are not
acceptable evidence.

The checked-in template must fail. A passing offline result proves only that the
record is internally complete and bound to the independently supplied identities.

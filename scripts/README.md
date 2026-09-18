# Project scripts

## Isolated browser gates

`npm.cmd run test:browser` builds and tests only against fixed loopback fixtures;
it strips inherited credentials and provider targets. Explicit project runs now
preflight the requested browser engine first, so an unavailable host browser is
reported once before any application test is counted as failed.

```powershell
npm.cmd run test:browser -- --project=firefox-desktop
npm.cmd run test:browser -- --project=webkit-desktop --project=webkit-tablet --project=webkit-mobile
```

The GitHub workflow runs Chromium, Firefox and WebKit as separate Linux gates and
also runs the three WebKit profiles on macOS. Playwright WebKit is not release
Safari, and its iPhone/iPad profiles are emulations rather than physical devices;
final release approval still requires current Safari on real macOS and iOS hardware.

## Recovery readiness gate

`recovery-readiness.mjs` validates a sanitized recovery manifest without contacting
Supabase or any external provider. It fails closed until database, managed Auth,
Storage metadata and object bytes, roles/grants, protected configuration, schedules,
provider resources and post-restore security checks are all verified. See
`recovery/README.md`; never store dumps, object bytes, personal data or secret values
in the repository manifest.

Run it with:

```powershell
npm.cmd run recovery:check -- C:\protected\evidence\recovery-manifest.json
```

The checked-in template is intentionally incomplete and must fail validation.

## Dummy test accounts

This seed creates 56 temporary accounts for local/staging testing.

## Accounts

- `0001` — Test Super Admin
- `0002` — Test Aikido Admin
- `0003` — Test Karate Admin
- `0004` — Test Kungfu Kids Admin
- `0005` — Test Taiji Admin
- `0006` — Test Xingyi Admin
- `0101-0110` — 10 Aikido Members
- `0201-0210` — 10 Karate Members
- `0301-0310` — 10 Kungfu Kids Members
- `0401-0410` — 10 Taiji Members
- `0501-0510` — 10 Xingyi Members

The staging-only test password is defined by `TEST_PASSWORD` in
`DUMMY_ACCOUNT_PASSWORD` in the protected staging environment. It must be at
least 16 characters with uppercase, lowercase, a number and a symbol. Do not
reuse it for production or document it in release evidence.

Profiles also receive `username = Member ID`, so they are suitable for testing a Member-ID login flow.

## Setup

Your `.env.local` needs:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DUMMY_ACCOUNT_PASSWORD=use-a-protected-staging-only-value
```

Never prefix the service-role key with `NEXT_PUBLIC_`.

Create a `scripts` folder in the project root and put the two `.mjs` files there.

Run:

```powershell
node .\scripts\seed-dummy-users.mjs --environment=staging --expected-project-ref=YOUR_STAGING_REF
```

## Delete before production

The cleanup tool is audit-only unless `--delete` is supplied. It requires the
exact target project ref, refuses to disguise the recorded production project as
staging, and selects an account only when both the test email domain and the
`dummy_account: true` Auth metadata marker match.

First run an audit against the intended target:

```powershell
node .\scripts\delete-dummy-users.mjs --environment=staging --expected-project-ref=YOUR_STAGING_REF
```

Review the count, then repeat with `--delete` and the candidate-set token printed
by that exact audit. A changed candidate set invalidates the token. Production
also requires `--environment=production --allow-production` and separate explicit
operator approval. The script re-lists Auth users after deletion and fails unless
zero marked accounts remain.

Do not delete staging test accounts until all provider-backed and authenticated
acceptance tests are complete. Never assume profile/membership rows cascaded merely
because Auth deletion succeeded; include orphan checks in the final database gate.

## Notes

- Super Admin `0001` also receives an Aikido membership so Member-facing screens can be tested.
- Each class receives one Admin.
- Where a class has active dojos, the seed assigns a dojo automatically.
- Aikido requires at least one active dojo.
- The 10 Aikido Members are distributed across active Aikido dojos.
- All seed memberships start Active, Mudansha, and unranked.
- The seed is rerunnable: existing dummy Auth users are updated and membership/profile rows are reused where possible.

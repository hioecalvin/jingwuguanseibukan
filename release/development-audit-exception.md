# Temporary development audit exception

Owner approval: explicit user approval on 5 October 2026, following review of
GHSA-vfj7-8cjw-p6xm and the unavailable compatible published fix.

- Starts: 2026-10-05 11:09:49 UTC.
- Expires automatically: **2026-10-19 11:09:49 UTC** (14 days).
- Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
- Scope: only the exact development-only chain
  `eslint-config-next@16.3.8 > @next/eslint-plugin-next@16.3.8 > fast-glob@3.3.1 > micromatch@4.0.8 > braces@3.0.3`.
- This is acceptance of a known stack-exhaustion risk, **not a vulnerability fix**.

## Enforcement

`npm run audit:dependencies` obtains fresh npm audit JSON and checks it against
the installed release lockfile. The policy follows the advisory chain rather
than blindly ignoring five package names. Every excepted package must have its
exact approved version and single expected lockfile location with `dev: true`.
An additional advisory, changed dependency chain/version, nested affected copy,
production/shared package, critical severity, or elapsed expiry blocks the
exception. Malformed, incomplete, failed or timed-out audits fail closed.

Other high/critical vulnerabilities still block. Low/moderate handling is
unchanged from the former `--audit-level=high` policy. The production audit
(`npm audit --omit=dev --audit-level=high`) and desktop uploader's full audit
remain unmodified and have no exception. CI prints the exception and expiry
whenever used; no `continue-on-error` or blanket audit skipping is introduced.

## Exposure and removal

The reviewed installed Next.js plugin invokes the affected glob chain only for
explicit `settings.next.rootDir` glob configuration; this repository does not
configure that setting. This lowers exposure through that specific path but
does not establish universal unreachability. Avoid adding untrusted root globs.
Production dependency audit was clean at approval time.

Remove the exception when a compatible fixed dependency chain is available:
update and verify dependencies, run strict full and production audits, restore
the workflow's strict full audit command, and remove/update the policy tests and
this record together. Do not extend the expiry without renewed owner approval.
No reminder or scheduled job is created by this policy; expiry is checked on
each audit run. A clean audit can pass after expiry without using the exception.

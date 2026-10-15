# Member contact self-service browser evidence — 27/09/2026

## Scope

- Real production page: `app/(member)/profile/page.tsx`.
- Network-disabled browser fixture; no staging, provider or production request.
- Existing API and SQL tests retain coverage for origin/authentication checks,
  duplicate detection, normalization, audit, disabled users, RLS and RPC ACLs.

## Browser workflows

1. Load the real profile with the existing Member identity fields.
2. Edit phone and optional Instagram and submit the exact RPC arguments.
3. Verify normalized phone/Instagram display while Member ID and name remain intact.
4. Request an email replacement with the Member bearer session.
5. Verify the old email remains current while confirmation is pending.
6. Reject contact and duplicate-email attempts, retain form values, then retry both
   successfully.
7. Confirm no horizontal overflow in every responsive profile.

## Harness correction

The first Chromium execution exposed an unstable router test double. It returned a
new object on every render, unlike Next.js, so the real profile's loading effect was
restarted continuously after interaction. The shared double now returns one stable
router object; the clean full-suite result confirms the correction did not regress
other navigation fixtures.

## Final results

- Production build: 50 routes.
- Full browser matrix: 186/186 across Chromium and WebKit desktop, tablet and mobile.
- Member contact workflows: 12/12 profile executions.
- `npm test`: 279/279, including TypeScript and API/database contract tests.
- `npm run lint`: passed.

No real contact detail, Auth email, confirmation message, staging row, provider or
production system was read or changed. Real guarded provider confirmation and
physical Safari/iOS remain external release checks.

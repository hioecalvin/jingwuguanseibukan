# Bulk assessment browser mutation evidence — 27/09/2026

## Scope

- Real page under test: `app/admin/assessments/page.tsx`.
- Isolated exact-contract Supabase fixture; browser CSP has `connect-src 'none'`.
- No staging or production database, provider, member, grade, certificate or
  announcement mutation.

## Verified workflow

1. Load the Super Admin class/dojo scope and three eligible candidates.
2. Include the complete roster and supply the internal Mudansha assessor plus the
   external Yudansha assessor.
3. Prepare the assessment and all three certificates with Pending status.
4. Record two Pass results and one Fail result.
5. Review all results and confirm one atomic submission.
6. Verify only the two passing memberships are promoted, the failed membership is
   unchanged, certificates transition to two Issued and one Void, and the scoped
   announcement list is highest successful destination grade first.

## Commands and results

- `npm test`: 279/279 passed, including TypeScript.
- `npm run lint`: passed.
- `npm run test:browser -- --project=chromium-desktop`: production build completed
  with 50 routes; finalized rerun passed 26/26.
- `npm run test:browser -- --skip-build --project=chromium-mobile --project=webkit-desktop --project=webkit-tablet --project=webkit-mobile`:
  104/104 passed.
- `npm run test:browser -- --skip-build --project=chromium-tablet`: 26/26 passed.
- Final matrix: 156/156 checks across Chromium and WebKit desktop, tablet and mobile;
  the assessment workflow passed 6/6 profile executions.

The initial Chromium attempt used an ambiguous label locator and did not reach a
mutation. The locator was scoped to the appropriate labelled regions; the finalized
runs above are green. Existing rollback-contained staging evidence remains the proof
of persisted SQL authorization, transaction behavior and zero residue.

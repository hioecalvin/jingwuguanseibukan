# Deceased-member memorial browser evidence — 27/09/2026

## Scope

- Real production component: `app/admin/members/DeceasedMemorialPanel.tsx`.
- Network-disabled browser fixture; no staging, provider or production request.
- Existing API unit tests cover active Super Admin authorization, database-first
  persistence, Auth ban/unban ordering, partial failure and Initial Memorial RPCs.
- Existing rollback-contained staging SQL covers persisted settings, annual
  generation, idempotency, recipient classes, role denial and zero residue.

## Browser workflows

1. Open memorial settings and confirm preservation/non-Terminated guidance.
2. Mark Deceased and set Date of Passing.
3. Select two recipient classes.
4. Enable and write Remembrance Day and Heavenly Birthday reminders.
5. Save the complete settings and manually publish the Initial Memorial content.
6. Clear Deceased and verify date/reminder enablement is cleared and all publication
   controls are disabled.

## Defect corrected

The first WCAG scan identified two 12px neutral-500 explanatory labels at contrast
ratios 4.15:1 and 4.13:1. Both now use neutral-400 and the final scan passes.

## Final results

- Production build: 50 routes.
- Chromium desktop: 29/29.
- Chromium tablet/mobile plus WebKit desktop/tablet/mobile: 145/145.
- Full matrix: 174/174; memorial workflows: 12/12 profile executions.
- `npm test`: 279/279, including TypeScript and API/database contract tests.
- `npm run lint`: passed.

No live Auth ban/unban, memorial publication, email, staging mutation or production
contact is claimed.

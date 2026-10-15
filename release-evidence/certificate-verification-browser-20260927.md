# Certificate verification browser evidence — 27/09/2026

## Scope

- Real server-rendered route: `app/certificate/verify/[certificateId]/page.tsx`.
- Exact loopback-only RPC: `verify_prepared_assessment_certificate`.
- Fixed fictional service credential; all other mock endpoints and credentials fail.
- No staging/production access and no certificate, member or provider mutation.

## Verified states

- Issued: `ISSUED - VALID` with member, rank and certificate number.
- Pending: `PENDING - NOT YET VALID` with the prepared record details.
- Voided: `VOID - NOT VALID` with the voided record details.
- Unknown: `Certificate not found`.
- Every state contains no link or document download; the unknown view passes the
  automated WCAG A/AA scan and all views fit their responsive viewport.

## Final results

- Chromium desktop: 27/27.
- Chromium tablet/mobile plus WebKit desktop/tablet/mobile: 135/135.
- Complete browser matrix: 162/162 across six profiles.
- Certificate state workflow: 6/6 profile executions.
- The existing 50-route isolated production build remained current because no
  application runtime source changed; only the test server and browser spec changed.

The initial run reached the correct Issued record but used a title assertion without
the layout-provided site suffix. It was corrected to match the actual production
metadata before every final profile passed.

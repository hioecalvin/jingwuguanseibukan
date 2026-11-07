# Aikido registration and historical assessment grades — 6 November 2026

Aikikai Registration now belongs to Aikido on signup, application review, member records, certificates, archive searches, PDFs and class exports. Mixed-class exports leave other-class cells empty. Switching away from Aikido clears the optional signup value. The database enforces the same scope while preserving legitimate person-level values and existing Aikido Yudansha editing eligibility.

Historical grades derive Rank Before from the immediately preceding rank in the same class ladder. The first configured rank uses Ungraded. Notes identify the value as derived. Live assessment snapshots and lost/skipped outcomes retain their recorded meaning. The source records, dates, JS IDs, existing assessment numbers and current memberships are preserved.

Migrations 083 and 084 applied to production after an encrypted backup and a synthetic rollback rehearsal. Independent read-only checks verified exact ledger 006–084, all 766 historical records, 718 historical grades (146 first-grade entries), unchanged table fingerprints and all 229 principal scopes. The optional hosted database-lint extension remains unavailable.

Verification passed TypeScript, 1,020 application tests, ESLint, production fixture build and 108 focused Chromium/WebKit browser tests. An earlier candidate exposed undersized JS ID link targets and an ambiguous training status selector, both now fixed and covered by the browser suite.

The website cutover remains pending exact-commit remote CI, candidate probes and production verification. No test emails were sent.
# Seven-day development-only risk acceptance

The user explicitly approved a seven-day renewal on 20 October 2026 Sydney.
Effective: 20 October 2026 05:38:42 AEDT.
Expires: 27 October 2026 05:38:42 AEDT (2026-10-26T18:38:42Z).

Only the existing exact lint dependency chain is excepted:
eslint-config-next 16.3.8 → @next/eslint-plugin-next 16.3.8 → fast-glob 3.3.1
→ micromatch 4.0.8 → braces 3.0.3, all development-only.

Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
The advisory and fresh npm metadata report no published braces patch. Even the
latest Next lint plugin still depends on fast-glob 3.3.1. No forced upgrade,
dependency removal, broad exception, or audit suppression was performed.

Production dependency auditing remains strict. Other advisories, critical
severity, changed versions, extra installed copies, and production dependency
classification fail closed. Expiry is enforced by code and regression tests.
This is accepted development-tool risk, not remediation or launch approval.
Original approval and expired-window records remain preserved in Git/history.

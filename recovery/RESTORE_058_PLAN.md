# Clean-target recovery plan — 6 October 2026 (Sydney)

Execution update, 6 October 2026: execution was approved after this plan was
prepared. Exactly one new free Singapore target, `xiqvkarqcvhbiexuzglo`, was
created and isolated. The rollback rehearsal and one committed database restore
have passed independent data/catalog/ledger/security verification. Storage restore
(two buckets/six logos), private/public file hashes, access checks, standalone lint
and read-only role checks also passed. The approved 50 MiB limit applies only to
the empty private video bucket. A separate inspection confirmed INACTIVE and Auth
disabled at 2026-10-06T06:08:35.4911437Z. Hosted original-password login remains
unverified. A separately approved Auth test subsequently passed all three password
hash/identity checks but stopped on the first Member password-grant failure. The
HTTP cause was not retained in that first attempt. One separately approved diagnostic
retry captured HTTP 422 `email_provider_disabled` despite the management setting
reporting enabled. It stopped, disabled Auth, passed no-change post-failure checks,
and paused. Independent inspection reconfirmed INACTIVE/Auth disabled at
2026-10-06T06:48:57.2084782Z. A further readiness-gated attempt was subsequently
approved and PASSED for all three original-password login/refresh/logout flows,
including server-side identity checks and post-logout refresh denial. Effective
Auth settings were observed enabled twice before login and disabled twice after.
Independent application/catalog/ledger/Storage comparisons passed; only three
permitted auth.users timestamp updates remained, with zero sessions, refresh
records or added Auth audit rows. Final independent inspection confirmed INACTIVE,
Auth disabled, no SMTP/functions/secrets at 2026-10-06T07:21:54.4847118Z.
New protected evidence: auth-service-ready-1791270788205 under the target private
directory. Twenty evidence files retained their hashes after explicit owner-only
directory ACL hardening. Twenty-two local recovery-helper tests passed.
See PROJECT_CHECKPOINT.md for hashes and remaining separate release gates.
All original source and failed-attempt evidence is preserved; extracted plaintext
is quarantined in protected current-user-only scratch.

The original planning text below is retained as the approved boundary. It does
not authorize erasing the older disposable or replaying a persistent import.

## Source and preserved baseline

- Source: `C:\protected\jingwuguan-recovery-source-20261006-99bcd14c`.
- Ciphertext SHA-256:
  `80fe758ac52908e209a80c2b96e9545f205f1d20ee905ed36c0f74ab51eec285`.
- Authenticated payload SHA-256:
  `0427de398e136c93931510795018875b74311fb1fcff9a75f4cf107064879a77`.
- Ledger: exact 006–058, 53 versions; 4,159 captured catalog objects;
  57 Auth users/identities; two buckets and six objects, 3,412,943 bytes.
- Local authenticated streaming verification passed again, with no plaintext
  written and no remote requests. All four original source files remain intact.
- Existing disposable `wtnonpldqvzipqmwgbru` contains the valid older 006–056
  restore. Last verified INACTIVE with Auth disabled. Its 103 table fingerprints
  and 21 catalog sections matched the historical baseline on 6 October.
  Leave it paused; do not delete/reset/reuse it under this plan.

## Recommended target and authorization boundary

Create exactly one new **free-plan**, empty disposable recovery project in
Singapore after execution approval. Save newly generated credentials in a new
current-user-only directory under `C:\protected`. Never reuse source credentials
as destination credentials. Pin the returned project reference, organization,
region and database endpoint before any SQL or Storage request.

Free capacity has NOT been checked remotely in this planning turn. If no free
slot exists, stop and ask; do not enable billing, upgrade, pause/delete another
project, or replace the existing disposable. If creation returns an uncertain
response, reconcile the inventory instead of creating a second project.

No staging, production, retired-project, existing-disposable, or delivery-provider
requests are needed for execution. Source data comes only from the protected
local archive. Management inventory may be read solely to resolve the new target
and capacity; it does not authorize operations on other projects.

## Required execution gates

1. Before import, disable signup and all Auth providers/hooks/notifications; use
   `https://recovery.invalid` with no allowed redirects. Require no SMTP/provider
   configuration, Edge Functions/secrets, scheduled jobs, webhooks or outbound
   queues. Read back isolation, and stop if it cannot be established.
2. Verify target application schema, Auth users/identities, migration ledger,
   Storage buckets/objects and queues are empty. Record managed-schema versions,
   role settings, grants and platform baseline. Do not treat a populated target
   as compatible or clear it automatically.
3. Authenticate/decrypt the pinned archive in fresh private scratch. Validate
   archive paths and manifest hashes before extraction. Derive import allowlists
   and acceptance expectations from THIS 006–058 package, not old 006–056 files.
4. Review every selected SQL/TOC entry and compatibility delta. Preserve managed
   schemas/platform roles; exclude active sessions, refresh tokens, cron/net/vault
   contents and delivery secrets. Restore application schema/data, reviewed Auth
   users/identities, exact ledger, sequence values, RLS, ACLs and custom Auth
   triggers in dependency-safe order. No `--clean`, blanket grants, upsert or
   automatic replay. Record one exclusive attempt journal before mutation.
5. First rehearse database import in a rollback-contained transaction; compare
   the target's independent post-rollback baseline. Commit only the exact reviewed
   and successfully rehearsed plan. On uncertain commit acknowledgement, perform
   read-only reconciliation; never blindly retry the import.
6. Independently verify persisted data equality, exact ledger contents/fingerprint,
   catalog/security definitions, grants/default privileges, RLS, custom Auth
   triggers, database lint, sequences and role boundaries. Scope role tests to
   reviewed rollback-contained SQL; do not invoke staging-pinned Auth test tools.
7. Restore two buckets and the six captured logo files through destination-only
   Storage APIs, without overwriting. Create logo bucket private first; verify
   bytes/hashes, ownership, MIME and access controls before restoring source public
   visibility. Keep the empty video bucket private. Check the current source
   limits and destination capacity first. A 50 MiB video-bucket deviation requires
   explicit execution approval and must be recorded; otherwise stop on mismatch.
8. Recheck isolation and data/catalog/ledger after Storage. Pause the new target
   on success or failure and independently confirm INACTIVE. Preserve source,
   attempt journals and failed evidence. Remove only tracked scratch plaintext
   after retained evidence is verified; quarantine it privately if cleanup is unsafe.

## Tooling and acceptance limits

The old `Run-PersistentRecovery.mjs` is pinned to the previous target, backup,
rehearsal hashes and 51-version expectations. Do not invoke it for this package
or edit historical evidence to make it pass. A separately reviewed 058 runner,
fresh target binding, source-derived expectations and tests are required first.
The 12 selected persistent-plan/Auth-guard unit tests passed locally; they validate
existing helpers, NOT a new runner, hosted restore or login acceptance.

Keep Auth disabled throughout this proposed database/Storage phase. Restoring
password hashes does not prove login works. Original-password login/refresh/logout
for the three restored test accounts remains a separate, explicitly authorized
phase. Never reset passwords or use magic links to claim password recovery.

No production readiness percentage or deployment approval follows from this plan.

## Proposed execution approval

"I approve creating one new free disposable Supabase project in Singapore for
the protected 006–058 backup, configuring isolation, preparing and testing the
new target-bound restore runner, then performing one guarded database and Storage
restore with independent ledger, data, catalog, RLS/grant, database-lint, role and
file-hash/access verification. Keep Auth disabled. A 50 MiB limit is allowed only
for the empty private video bucket if required by the free target. Pause the new
project afterward, including on failure. Preserve all backups, evidence and the
existing paused disposable. Stop if free capacity is unavailable or any prerequisite
fails. Do not contact staging, production, the retired project or delivery providers;
do not reset accounts, overwrite existing objects or enable billing."

# Storage provisioning

`image-storage.sql` is the reviewed one-shot Storage configuration installed on
production on 20 October 2026. It is intentionally separate from application
migration 061, which remains pending. Never include it in a broad database push.

Create empty `avatars` and `class-logos` buckets through the Storage API first:
public, 5,242,880-byte cap, allowed MIME types image/jpeg, image/png, image/webp.
Existing buckets or policies require review; never make existing content public
or overwrite it automatically. Public image bytes can be read by URL.

The SQL grants authenticated SELECT/INSERT/UPDATE only for the caller's avatar,
or existing class logos for an active Super Admin who has completed password
setup. Disabled/deceased accounts and password-change-required accounts fail
closed. There is no DELETE policy or general bucket-management grant.

Production installation used an exact-target, TLS-verified, hash-pinned executor,
fresh baseline, rollback rehearsal and independent verification. All 78 original
data fingerprints and the 55-row application ledger remained unchanged; catalog
comparison allowed only this helper and six reviewed policy additions. No files
were uploaded. Synthetic PG17 tests passed 531 assertions; hosted byte upload and
browser acceptance remain separate gates. Preserve private evidence/backups.

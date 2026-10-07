# Legacy database drafts

This directory is retained as immutable design evidence. It is not an executable
migration source and must never be passed to Supabase CLI, a reset
script, or a deployment job.

The only active ordered migration chain is `supabase/migrations`, currently
versions 006 through 045. The database baseline predates version 006 and must
come from an authorised, reviewed backup or future consolidated baseline—not by
replaying these drafts.

The three retained files cannot form an ordered chain:

- `004_finance_module.sql` and `004_subscription_module.sql` share version 004
  and define overlapping tables and functions.
- `005_settlement_module.sql` depends on finance objects whose authoritative
  live definitions subsequently diverged.
- migrations 011–045 repair, harden, and extend definitions from the restored baseline;
  replaying the drafts would overwrite those reviewed definitions.

Integrity fingerprints (SHA-256):

| File | SHA-256 |
| --- | --- |
| `004_finance_module.sql` | `8B5CB74B92388660A036378B40D6EA9A0A2A07093BBCD4558DE86166C4FB0F1E` |
| `004_subscription_module.sql` | `A16B218DC1C1D2D4B3DDF5494DEAEBD6A197775B1856E1583B03628656EED609` |
| `005_settlement_module.sql` | `C5E5979C24DDDB2DFED4B110DBA9775F913030B44F5C61C6D66E24D4BB56C3C0` |

Do not edit or renumber these files. A future clean-room baseline should be
generated from an authorised schema dump, reviewed for secrets and ownership,
restored into a disposable target, and validated before it replaces this legacy
evidence.

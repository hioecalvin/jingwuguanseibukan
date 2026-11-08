# Staging managed default-privilege acceptance — 27 September 2026

Target: `eomubndonbetszdbhsrj` (staging only)

## Read-only evidence

- Current/session role: `supabase_read_only_user`.
- `postgres` can manage `supabase_admin` defaults: false.
- Public relations: 77, all owned by `postgres`.
- Public routines: 214, all owned by `postgres`.
- Public types: 87, all owned by `postgres`.
- Public relations/routines owned by `supabase_admin`: zero.
- Unsafe `postgres` global/public application defaults: none.
- Hosted `supabase_admin` public defaults remain managed by the platform.
- The revised strict verifier passed through the read-only Supabase database-query
  endpoint. No SQL mutation, migration, production connection or application-data
  access was performed.

## Acceptance boundary

The verifier does not broadly ignore managed defaults. It fails if:

1. `postgres` has unsafe global or public-schema defaults;
2. `postgres` becomes a member of `supabase_admin`; or
3. any public relation, sequence or routine is owned by `supabase_admin` while its
   browser-role defaults remain permissive.

This records a managed-platform exception, not an application permission exception.
Actual table/function ACL, RLS, owner, SECURITY DEFINER and role-boundary checks remain
in the strict verifier.

## Authoritative platform context

- Supabase identifies `supabase_admin` as an internal role used for administrative
  tasks: <https://supabase.com/docs/guides/database/postgres/roles>
- Supabase documents its platform default privileges and notes that the internal
  role cannot authenticate through the Data API:
  <https://supabase.com/docs/guides/api/securing-your-api#default-privileges>

-- Reviewed schema-only helpers captured from staging on 9 October 2026.
-- LOCAL synthetic harness only; no Auth users, credentials or login API involved.
-- Keep claim precedence/fallback identical to the captured SQL bodies.
create or replace function auth.uid() returns uuid language sql stable as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;
create or replace function auth.role() returns text language sql stable as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$;
create or replace function auth.jwt() returns jsonb language sql stable as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$function$;

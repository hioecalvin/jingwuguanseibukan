-- Independent read-only ledger, residue and security postflight for migration 056.
do $postflight$
declare
  versions text[];
  pair_definition text;
  routine_definition text;
begin
  select array_agg(version order by version)
  into versions
  from supabase_migrations.schema_migrations;

  if versions is distinct from array(
    select lpad(value::text, 3, '0')
    from generate_series(6, 56) as value
  ) then
    raise exception 'Migration ledger is not exactly 006 through 056';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '056'
      and name = 'mux_repository_video'
  ) then
    raise exception 'Migration 056 ledger name is incorrect';
  end if;

  if exists (
    select 1
    from public.content
    where title in (
      '__MUX_056_DENIED__',
      '__MUX_056_NON_UPLOADER_DENIED__',
      '__MUX_056_ROLLBACK__',
      '__MUX_056_ROLLBACK_RETRY__',
      '__MUX_056_MUTATION_DENIED__',
      '__MUX_056_METADATA_UPDATE__',
      '__YOUTUBE_056_ROLLBACK__',
      '__MUX_056_INCOMPLETE__'
    )
  ) then
    raise exception 'Migration 056 acceptance left content residue';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content'
      and column_name = 'video_asset_id'
      and data_type = 'text'
  ) then
    raise exception 'Mux asset column is missing or has the wrong type';
  end if;

  select pg_catalog.pg_get_constraintdef(constraint_data.oid)
  into pair_definition
  from pg_catalog.pg_constraint as constraint_data
  where constraint_data.conrelid = 'public.content'::pg_catalog.regclass
    and constraint_data.conname = 'content_video_provider_pair_check'
    and constraint_data.contype = 'c'
    and constraint_data.convalidated;

  if pair_definition is null
     or pair_definition not ilike '%video_provider = ''youtube''%'
     or pair_definition not ilike '%video_provider = ''mux''%'
     or pair_definition not ilike '%video_asset_id%'
  then
    raise exception 'Validated Mux/YouTube provider-pair constraint is absent';
  end if;

  routine_definition := pg_catalog.pg_get_functiondef(
    'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)'::pg_catalog.regprocedure
  );

  if routine_definition not ilike '%security definer%'
     or routine_definition not ilike '%is_repository_uploader%'
     or routine_definition not ilike '%auth.role()%service_role%'
     or routine_definition not ilike '%on conflict (video_asset_id)%'
     or routine_definition not ilike '%''draft''::public.content_status%'
  then
    raise exception 'Mux Draft RPC security contract is absent';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'create_repository_mux_content'
      and routine.prosecdef
      and routine.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'Mux Draft RPC search_path is unsafe';
  end if;

  if pg_catalog.pg_get_functiondef(
       'public.update_repository_content(uuid,text,text,text,text,text,integer)'::pg_catalog.regprocedure
     ) not ilike '%Mux provider identifiers are server-managed%'
  then
    raise exception 'Mux provider identity is mutable through the browser update RPC';
  end if;

  if has_function_privilege(
       'anon',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
  then
    raise exception 'Mux Draft RPC ACL is unsafe';
  end if;

  raise notice 'POSTFLIGHT PASS: exact 006-056 ledger, zero Mux residue and signed-video security contract';
end
$postflight$;

-- Local candidate only. Reviewed source conversion; never an exposed RPC.
begin;
do $$ begin
 if inet_server_addr() is distinct from '127.0.0.1'::inet
  or current_setting('jwg.claim_local',true) is distinct from 'on' then
  raise exception 'Disposable local conversion rehearsal required'; end if;
end $$;
-- The reviewed configuration mapping belongs to the immutable source batch.
-- Labels are canonical source aliases, not database display names.
create table member_import_private.conversion_class_map(
 source_sha256 text not null references member_import_private.batches(source_sha256) on delete restrict,
 source_index smallint not null check(source_index between 0 and 5),
 source_name text not null,
 class_id uuid not null references public.classes(id) on delete restrict,
 primary key(source_sha256,source_index), unique(source_sha256,class_id),
 check(source_name=(array['Aikido','Taijiquan','Xingyiquan','Karate','Kungfu Kids','Bagua'])[source_index+1])
);
create table member_import_private.conversion_dojo_map(
 source_sha256 text not null, source_index smallint not null,
 source_label text not null check(source_label=lower(btrim(source_label)) and source_label<>''),
 dojo_id uuid not null references public.dojos(id) on delete restrict,
 primary key(source_sha256,source_index,source_label),
 foreign key(source_sha256,source_index) references member_import_private.conversion_class_map(source_sha256,source_index) on delete restrict
);
create table member_import_private.conversion_rank_map(
 source_sha256 text not null, source_index smallint not null,
 source_label text not null check(source_label=lower(btrim(source_label)) and source_label not in ('','unranked')),
 rank_id uuid not null references public.ranks(id) on delete restrict,
 primary key(source_sha256,source_index,source_label),
 foreign key(source_sha256,source_index) references member_import_private.conversion_class_map(source_sha256,source_index) on delete restrict
);
alter table member_import_private.conversion_class_map enable row level security;
alter table member_import_private.conversion_class_map force row level security;
alter table member_import_private.conversion_dojo_map enable row level security;
alter table member_import_private.conversion_dojo_map force row level security;
alter table member_import_private.conversion_rank_map enable row level security;
alter table member_import_private.conversion_rank_map force row level security;
revoke all on member_import_private.conversion_class_map,member_import_private.conversion_dojo_map,
 member_import_private.conversion_rank_map from public,anon,authenticated,service_role;

create function member_import_private.source_text(cells jsonb, cell_index integer)
returns text language plpgsql immutable set search_path=pg_catalog as $$
declare cell jsonb:=cells->cell_index;
begin
 if jsonb_typeof(cell) is distinct from 'object' or jsonb_typeof(cell->'type') is distinct from 'string' or not(cell ?& array['type','value'])
  or (cell-array['type','value'])<>'{}'::jsonb then
  raise exception using errcode='23514',message='Invalid typed source cell'; end if;
 if cell->'value'='null'::jsonb then
  if cell->>'type' not in ('n','s','inlineStr','date') then
   raise exception using errcode='23514',message='Unexpected empty source cell type'; end if;
  return null;
 end if;
 if cell->>'type' not in ('s','inlineStr') or jsonb_typeof(cell->'value')<>'string' then
  raise exception using errcode='23514',message='Source text must be stored as text'; end if;
 return nullif(btrim(cell->>'value'),'');
end $$;
create function member_import_private.source_date(cells jsonb, cell_index integer)
returns date language plpgsql immutable set search_path=pg_catalog as $$
declare cell jsonb:=cells->cell_index; value text;
begin
 if jsonb_typeof(cell) is distinct from 'object' or jsonb_typeof(cell->'type') is distinct from 'string' or not(cell ?& array['type','value'])
  or (cell-array['type','value'])<>'{}'::jsonb then
  raise exception using errcode='23514',message='Invalid typed date cell'; end if;
 if cell->'value'='null'::jsonb then
  if cell->>'type' not in ('n','s','inlineStr','date') then
   raise exception using errcode='23514',message='Unexpected empty date type'; end if;
  return null;
 end if;
 value:=btrim(cell->>'value');
 if cell->>'type' in ('s','inlineStr') and jsonb_typeof(cell->'value')='string' and value='' then return null; end if;
 if jsonb_typeof(cell->'value')<>'string'
  or not((cell->>'type'='date' and value ~ '^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?)?$')
    or (cell->>'type' in ('s','inlineStr') and value ~ '^\d{4}-\d{2}-\d{2}$')) then
  raise exception using errcode='23514',message='Source date requires explicit ISO date'; end if;
 return value::timestamp::date;
end $$;
revoke all on function member_import_private.source_text(jsonb,integer),member_import_private.source_date(jsonb,integer)
 from public,anon,authenticated,service_role;

create function member_import_private.derive_member_plan(source_hash text,cells jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare profile jsonb; memberships jsonb:='[]'; c integer; start_at integer;
 class_uuid uuid; dojo_uuid uuid; rank_uuid uuid;
 dojo_label text; grade_label text; status_label text; termination text; inactive_since date;
begin
 if jsonb_typeof(cells) is distinct from 'array' or jsonb_array_length(cells)<>31 then
  raise exception using errcode='23514',message='Expected 31 typed source cells'; end if;
 termination:=lower(coalesce(member_import_private.source_text(cells,5),''));
 if termination not in ('','yes','no') then
  raise exception using errcode='23514',message='Unexpected termination flag'; end if;
 profile:=jsonb_build_object(
  'registration_number',member_import_private.source_text(cells,0),
  'full_name',initcap(regexp_replace(member_import_private.source_text(cells,1),'\s+',' ','g')),
  'email',lower(member_import_private.source_text(cells,3)),
  'phone',regexp_replace(member_import_private.source_text(cells,4),'\s+',' ','g'),
  'date_of_birth',member_import_private.source_date(cells,2),
  'account_status',case termination when 'yes' then 'disabled' else 'active' end);
 for c in 0..5 loop
  start_at:=6+4*c;
  dojo_label:=lower(member_import_private.source_text(cells,start_at));
  grade_label:=lower(regexp_replace(member_import_private.source_text(cells,start_at+1),'^(Kyu|Dan)[ -]+(\d+)$','\1 \2','i'));
  status_label:=lower(member_import_private.source_text(cells,start_at+2));
  inactive_since:=member_import_private.source_date(cells,start_at+3);
  if dojo_label is null and grade_label is null and status_label is null and inactive_since is null then continue; end if;
  if dojo_label is null or grade_label is null or status_label is null
    or status_label not in ('active','inactive','break_1','break_2') then
   raise exception using errcode='23514',message='Source membership needs explicit dojo, grade and status'; end if;
  select m.class_id into class_uuid from member_import_private.conversion_class_map m
   where m.source_sha256=source_hash and m.source_index=c;
  if not found then raise exception using errcode='23514',message='Source class mapping missing'; end if;
  select m.dojo_id into dojo_uuid from member_import_private.conversion_dojo_map m
   where m.source_sha256=source_hash and m.source_index=c and m.source_label=dojo_label;
  if not found then raise exception using errcode='23514',message='Source dojo mapping missing'; end if;
  rank_uuid:=null;
  if grade_label<>'unranked' then
   select m.rank_id into rank_uuid from member_import_private.conversion_rank_map m
    where m.source_sha256=source_hash and m.source_index=c and m.source_label=grade_label;
   if not found then raise exception using errcode='23514',message='Source approved grade mapping missing'; end if;
  end if;
  memberships:=memberships||jsonb_build_array(jsonb_build_object('class_id',class_uuid,'dojo_id',dojo_uuid,
   'rank_id',rank_uuid,'status',status_label,'joined_date',null,'inactive_since',inactive_since));
 end loop;
 return jsonb_build_object('profile',profile,'memberships',memberships);
end $$;
revoke all on function member_import_private.derive_member_plan(text,jsonb) from public,anon,authenticated,service_role;

create table member_import_private.conversions (
 source_sha256 text not null,
 sheet_name text not null default 'MEMBER DATA' check(sheet_name='MEMBER DATA'),
 row_number integer not null,
 row_sha256 text not null,
 reviewed_plan jsonb not null,
 profile_id uuid not null unique references public.profiles(id) on delete restrict,
 membership_ids uuid[] not null,
 converted_at timestamptz not null default now(),
 converted_by name not null default current_user,
 primary key(source_sha256,sheet_name,row_number),
 foreign key(source_sha256,sheet_name,row_number)
  references member_import_private.source_rows(source_sha256,sheet_name,row_number) on delete restrict
);
alter table member_import_private.conversions enable row level security;
alter table member_import_private.conversions force row level security;
revoke all on member_import_private.conversions from public,anon,authenticated,service_role;

create function member_import_private.convert_reviewed_member(
 source_hash text, source_row integer, expected_row_hash text, reviewed_plan jsonb
) returns uuid language plpgsql security invoker set search_path=pg_catalog as $$
declare
 source member_import_private.source_rows%rowtype;
 receipt member_import_private.conversions%rowtype;
 profile jsonb; membership jsonb; profile_uuid uuid; member_uuid uuid; expected_plan jsonb; field_name text;
 created_memberships uuid[]:='{}'; seen_classes uuid[]:='{}';
 class_uuid uuid; dojo_uuid uuid; rank_uuid uuid; membership_level public.membership_level;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Reviewed owner conversion only'; end if;
 -- Serialize imports and ordinary profile/Auth writes. Never merge a collision.
 perform pg_advisory_xact_lock(620251026);
 lock table auth.users in share row exclusive mode;
 lock table public.profiles in share row exclusive mode;
 lock table member_import_private.conversion_class_map,member_import_private.conversion_dojo_map,
  member_import_private.conversion_rank_map in share mode;
 select * into source from member_import_private.source_rows s
 where s.source_sha256=source_hash and s.sheet_name='MEMBER DATA' and s.row_number=source_row for update;
 if not found or source.disposition<>'pending_member_conversion'
  or source.row_sha256 is distinct from expected_row_hash
  or source.row_sha256<>encode(sha256(convert_to(source.source_json,'UTF8')),'hex') then
  raise exception using errcode='23514',message='Source is not an eligible verified row'; end if;
 select * into receipt from member_import_private.conversions c
 where c.source_sha256=source_hash and c.sheet_name='MEMBER DATA' and c.row_number=source_row;
 if found then
  if receipt.reviewed_plan is distinct from reviewed_plan or receipt.row_sha256<>expected_row_hash then
   raise exception using errcode='23514',message='Converted source plan differs; do not overwrite'; end if;
  return receipt.profile_id;
 end if;
 if jsonb_typeof(reviewed_plan) is distinct from 'object'
  or (reviewed_plan-array['profile','memberships'])<>'{}'::jsonb
  or jsonb_typeof(reviewed_plan->'profile') is distinct from 'object'
  or jsonb_typeof(reviewed_plan->'memberships') is distinct from 'array'
  or jsonb_array_length(reviewed_plan->'memberships') not between 1 and 6 then
  raise exception using errcode='23514',message='Explicit reviewed profile and memberships required'; end if;
 profile:=reviewed_plan->'profile';
 if (profile-array['registration_number','full_name','email','phone','date_of_birth','account_status'])<>'{}'::jsonb
  or not(profile ?& array['registration_number','full_name','email','phone','date_of_birth','account_status'])
  or nullif(btrim(profile->>'registration_number'),'') is null
  or nullif(btrim(profile->>'full_name'),'') is null
  or (profile->>'account_status') not in ('active','disabled') then
  raise exception using errcode='23514',message='Invalid reviewed profile fields'; end if;
 foreach field_name in array array['registration_number','full_name','email','phone','date_of_birth','account_status'] loop
  if jsonb_typeof(profile->field_name) not in ('string','null') then
   raise exception using errcode='23514',message='Reviewed scalar has unexpected JSON type'; end if;
 end loop;
 -- Use exactly the application's existing name/contact normalization before
 -- reserving the tuple. The receipt retains the original reviewed values.
 profile:=profile||jsonb_build_object(
  'full_name',initcap(regexp_replace(btrim(profile->>'full_name'),'\s+',' ','g')),
  'email',lower(btrim(profile->>'email')),
  'phone',nullif(regexp_replace(btrim(profile->>'phone'),'\s+',' ','g'),''));
 expected_plan:=member_import_private.derive_member_plan(source_hash,source.source_json::jsonb);
 if jsonb_set(reviewed_plan,'{profile}',profile) is distinct from expected_plan then
  raise exception using errcode='23514',message='Reviewed plan differs from original source row and reference mappings'; end if;
 if (profile->>'date_of_birth')::date>current_date then
  raise exception using errcode='23514',message='Future birth date is invalid'; end if;
 -- Owner identities can never be recreated from the historic workbook.
 if upper(profile->>'registration_number') in ('JS-0103','SUPERADMIN')
  or exists(select 1 from public.profiles p where lower(p.registration_number)=lower(profile->>'registration_number')
    or (profile->>'email' is not null and lower(p.email)=lower(profile->>'email')))
  or exists(select 1 from auth.users u where profile->>'email' is not null and lower(u.email)=lower(profile->>'email')) then
  raise exception using errcode='23505',message='Existing identity must be reconciled, not overwritten'; end if;
 profile_uuid:=gen_random_uuid();
 insert into same_id_import_private.reservations(profile_id,source_hash,source_row,expected_profile)
 values(profile_uuid,source_hash,source_row,profile);
 insert into public.profiles(id,member_origin,registration_number,full_name,email,phone,date_of_birth,account_status)
 values(profile_uuid,'import',profile->>'registration_number',profile->>'full_name',profile->>'email',
  profile->>'phone',(profile->>'date_of_birth')::date,(profile->>'account_status')::public.account_status);
 for membership in select value from jsonb_array_elements(reviewed_plan->'memberships') order by value->>'class_id' loop
  if jsonb_typeof(membership)<>'object'
   or (membership-array['class_id','dojo_id','rank_id','status','joined_date','inactive_since'])<>'{}'::jsonb
   or not(membership ?& array['class_id','dojo_id','rank_id','status','joined_date','inactive_since'])
   or (membership->>'status') not in ('active','inactive','break_1','break_2')
   or membership->>'status' is null then
   raise exception using errcode='23514',message='Invalid reviewed membership fields'; end if;
  class_uuid:=(membership->>'class_id')::uuid;dojo_uuid:=(membership->>'dojo_id')::uuid;rank_uuid:=(membership->>'rank_id')::uuid;
  if class_uuid is null or dojo_uuid is null or class_uuid=any(seen_classes) then
   raise exception using errcode='23514',message='One membership per explicit class required'; end if;
  seen_classes:=array_append(seen_classes,class_uuid);
  perform 1 from public.classes c where c.id=class_uuid and (c.is_active or membership->>'status'='inactive') for share;
  if not found then raise exception using errcode='23514',message='Class missing or inactive for requested status'; end if;
  perform 1 from public.dojos d where d.id=dojo_uuid and d.class_id=class_uuid for share;
  if not found then raise exception using errcode='23514',message='Dojo/class mismatch'; end if;
  membership_level:='mudansha';
  if rank_uuid is not null then
   select r.level into membership_level from public.ranks r where r.id=rank_uuid and r.class_id=class_uuid for share;
   if not found or membership_level is null then raise exception using errcode='23514',message='Grade/class mismatch or classification missing'; end if;
  end if;
  if (membership->>'joined_date')::date>current_date
   or (membership->>'inactive_since')::date>current_date
   or ((membership->>'inactive_since') is not null and membership->>'status'<>'inactive')
   or (membership->>'inactive_since')::date<(membership->>'joined_date')::date then
   raise exception using errcode='23514',message='Invalid historical dates'; end if;
  member_uuid:=gen_random_uuid();
  insert into public.class_memberships(id,user_id,class_id,dojo_id,rank_id,level,role,status,joined_date,break_count)
  values(member_uuid,profile_uuid,class_uuid,dojo_uuid,rank_uuid,membership_level,'user',
   (membership->>'status')::public.membership_status,(membership->>'joined_date')::date,
   case membership->>'status' when 'break_1' then 1 when 'break_2' then 2 else 0 end);
  created_memberships:=array_append(created_memberships,member_uuid);
 end loop;
 -- Keep source bytes/dispositions unchanged. The receipt preserves historical
 -- inactive-since values without inventing a status transition or assessment.
 insert into member_import_private.conversions(source_sha256,row_number,row_sha256,reviewed_plan,profile_id,membership_ids)
 values(source_hash,source_row,expected_row_hash,reviewed_plan,profile_uuid,created_memberships);
 return profile_uuid;
end $$;
revoke all on function member_import_private.convert_reviewed_member(text,integer,text,jsonb)
 from public,anon,authenticated,service_role;
commit;

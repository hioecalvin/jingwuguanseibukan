do $test$
declare tai uuid:=(select id from public.classes where name='Taijiquan');
        kids uuid:=(select id from public.classes where name='Kungfu Kids'); next_rank uuid; other_rank uuid;
begin
  if (select count(*) from public.ranks where name like 'Zhong%' and level='mudansha')<>9 then raise exception 'Middle grades'; end if;
  if exists(select from public.class_memberships m join public.ranks r on r.id=m.rank_id where m.level is distinct from r.level) then raise exception 'Enrollment sync'; end if;
  if exists(select from public.classes where name='Bagua' and is_active) then raise exception 'Bagua activated'; end if;
  if exists(select from public.ranks where name='Dan' and level is distinct from 'yudansha') then raise exception 'Japanese grade changed'; end if;
  if exists(select from public.class_memberships where joined_date is not null or status<>'active' or role<>'user') then raise exception 'Membership changed'; end if;
  if exists(select from public.membership_status_history) or exists(select from public.notification_outbox) then raise exception 'Side effect'; end if;
  insert into public.ranks(class_id,name,sort_order) values(tai,'Next grade',10) returning id into next_rank;
  if (select level from public.ranks where id=next_rank) is distinct from 'yudansha' then raise exception 'Admin rank insertion'; end if;
  update public.ranks set level='mudansha' where id=next_rank;
  if (select level from public.ranks where id=next_rank) is distinct from 'yudansha' then raise exception 'Rank level override'; end if;
  update public.ranks set sort_order=11 where class_id=tai and name='Gaoyi';
  if exists(select from public.ranks where class_id=tai and sort_order<11 and level is distinct from 'mudansha') then raise exception 'Moved Gaoyi cutoff'; end if;
  update public.ranks set sort_order=7 where class_id=tai and name='Gaoyi';
  update public.class_memberships set level='yudansha' where class_id=tai and rank_id in (select id from public.ranks where name='Zhongyi');
  if exists(select from public.class_memberships m join public.ranks r on r.id=m.rank_id where m.level is distinct from r.level) then raise exception 'Ranked membership override'; end if;
  select id into other_rank from public.ranks where class_id=kids limit 1;
  begin
    update public.class_memberships set rank_id=other_rank where class_id=tai;
    raise exception 'Cross-class rank accepted';
  exception when no_data_found then null; end;
  begin
    update public.class_memberships set role='admin' where class_id=tai;
    raise exception 'Imported member admin elevation';
  exception when check_violation then null; end;
  insert into public.ranks(class_id,name,sort_order) values(kids,'Gaoyi',7),(kids,'Future grade',8);
  if exists(select from public.ranks where class_id=kids and sort_order>=7 and level is distinct from 'yudansha') then raise exception 'Kids Gaoyi progression'; end if;
  if exists(select from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(r.name,'grading_private','USAGE')) then raise exception 'Unexpected grading schema access'; end if;
  if exists(select from pg_proc p cross join (values('anon'),('authenticated'),('service_role')) r(name)
    where p.pronamespace='grading_private'::regnamespace and has_function_privilege(r.name,p.oid,'execute')) then raise exception 'Unexpected direct execution'; end if;
  if pg_get_functiondef('public.get_official_member_record(uuid)'::regprocedure) not like '%grading_private.chinese_discipline(c.name)%' then raise exception 'Official record category'; end if;
end $test$;
select 'GRADE089_PASS';

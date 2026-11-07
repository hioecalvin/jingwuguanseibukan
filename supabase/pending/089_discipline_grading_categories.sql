-- The two existing keys remain compatible with assessment, import and enrollment RPCs.
begin;
lock table public.ranks, public.class_memberships, public.prepared_assessment_candidates
  in share row exclusive mode;

create schema grading_private;
revoke all on schema grading_private from public, anon, authenticated, service_role;

create function grading_private.chinese_discipline(class_name text)
returns boolean language sql immutable strict set search_path=pg_catalog as $$
  select regexp_replace(lower(class_name), '[[:space:]]+', '', 'g')
    in ('taijiquan','xingyiquan','kungfukids','bagua','baguazhang');
$$;

create function grading_private.category(rank_name text, rank_order integer, gaoyi_order integer)
returns public.membership_level language sql immutable set search_path=pg_catalog as $$
  select case when lower(btrim(rank_name))='gaoyi'
    or rank_order >= gaoyi_order
    or (gaoyi_order is null and lower(btrim(rank_name)) in ('gaoer','gaosan'))
    then 'yudansha'::public.membership_level else 'mudansha'::public.membership_level end;
$$;

-- Grading draws its next category from the destination rank. Retain submitted
-- records as awarded, and fail if a pending assessment already captured an old category.
do $pending$
begin
  if exists (
    select from public.prepared_assessment_candidates p
    join public.prepared_assessments a on a.id=p.prepared_assessment_id
    join public.ranks r on r.id=p.rank_to_id
    join public.classes c on c.id=r.class_id
    left join public.ranks boundary on boundary.class_id=c.id and lower(btrim(boundary.name))='gaoyi'
    where a.status='pending' and grading_private.chinese_discipline(c.name)
      and p.level_to is distinct from grading_private.category(r.name,r.sort_order,boundary.sort_order)::text
  ) then raise exception 'Review pending assessments with an outdated grade category'; end if;
end $pending$;

create function grading_private.sync_class(target_class uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare cutoff integer;
begin
  if not exists(select from public.classes c where c.id=target_class
    and grading_private.chinese_discipline(c.name)) then return; end if;
  select r.sort_order into cutoff from public.ranks r
    where r.class_id=target_class and lower(btrim(r.name))='gaoyi';
  update public.ranks r set level=grading_private.category(r.name,r.sort_order,cutoff)
    where r.class_id=target_class and r.level is distinct from grading_private.category(r.name,r.sort_order,cutoff);
  update public.class_memberships m set level=r.level from public.ranks r
    where m.class_id=target_class and r.class_id=m.class_id and r.id=m.rank_id
      and m.level is distinct from r.level;
end $$;

select grading_private.sync_class(c.id) from public.classes c where grading_private.chinese_discipline(c.name);

create function grading_private.rank_before_write()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare cutoff integer; previous_class uuid; next_class uuid;
begin
  if tg_op <> 'INSERT' then previous_class:=old.class_id; end if;
  if tg_op <> 'DELETE' then next_class:=new.class_id; end if;
  -- Serialize class catalog changes, including two concurrent inserts around Gaoyi.
  perform c.id from public.classes c where c.id in (previous_class,next_class)
    and grading_private.chinese_discipline(c.name) order by c.id for update;
  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' and previous_class is distinct from next_class and exists(
    select from public.class_memberships m where m.rank_id=new.id and m.class_id<>next_class
  ) and exists(select from public.classes c where c.id in(previous_class,next_class)
    and grading_private.chinese_discipline(c.name)) then
    raise exception 'A rank assigned to members must stay in their class';
  end if;
  if exists(select from public.classes c where c.id=next_class and grading_private.chinese_discipline(c.name)) then
    select r.sort_order into cutoff from public.ranks r where r.class_id=next_class
      and lower(btrim(r.name))='gaoyi' and r.id<>new.id;
    new.level:=grading_private.category(new.name,new.sort_order,cutoff);
  end if;
  return new;
end $$;

create function grading_private.rank_after_write()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_op='DELETE' then perform grading_private.sync_class(old.class_id); return null; end if;
  if tg_op='UPDATE' and new.class_id is distinct from old.class_id then
    perform grading_private.sync_class(old.class_id);
  end if;
  perform grading_private.sync_class(new.class_id);
  return null;
end $$;

-- A category-only correction inside sync_class cannot recursively run rank_after_write.
create trigger zz_grade_category_before before insert or delete or update of class_id,name,sort_order,level
  on public.ranks for each row execute function grading_private.rank_before_write();
create trigger zz_grade_category_after after insert or delete or update of class_id,name,sort_order
  on public.ranks for each row execute function grading_private.rank_after_write();

create function grading_private.membership_before_write()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if new.rank_id is not null and exists(select from public.classes c where c.id=new.class_id
    and grading_private.chinese_discipline(c.name)) then
    select r.level into strict new.level from public.ranks r
      where r.id=new.rank_id and r.class_id=new.class_id for share;
  end if;
  return new;
end $$;
create trigger zz_grade_membership_category before insert or update of class_id,rank_id,level
  on public.class_memberships for each row execute function grading_private.membership_before_write();
revoke all on all functions in schema grading_private from public, anon, authenticated, service_role;

-- Retain the report's existing authorization and payload. Change the one
-- category expression returned to both the member view and official PDF.
do $report$
declare
  definition text:=pg_get_functiondef('public.get_official_member_record(uuid)'::regprocedure);
  marker text:=$re$case\s+when\s+m\.level\s*=\s*'yudansha'\s+then\s+'Yudansha \(Dan\)'\s+else\s+'Mudansha \(Kyu\)'\s+end$re$;
  replacement text:=$new$case
    when grading_private.chinese_discipline(c.name) then case when m.level='yudansha' then 'Shiwei' else 'Shengwei' end
    when lower(btrim(c.name)) in ('aikido','karate') then case when m.level='yudansha' then 'Yudansha (Dan)' else 'Mudansha (Kyu)' end
    else case when m.level='yudansha' then 'Higher' else 'Lower' end end$new$;
begin
  if regexp_count(definition,marker,1,'i')<>1 then raise exception 'Official record category expression changed'; end if;
  execute regexp_replace(definition,marker,replacement,'i');
end $report$;
notify pgrst,'reload schema';
commit;

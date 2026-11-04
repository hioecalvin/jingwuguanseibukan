-- Members progress by rank. Legacy tier values and historical snapshots are retained,
-- but no longer control progression or published repository access.
begin;
-- Never invalidate certificates already prepared under the former tier targets.
lock table public.prepared_assessments, public.prepared_assessment_candidates,
 public.class_memberships, public.ranks in share row exclusive mode;
do $guard$ begin
 if exists(select 1 from public.prepared_assessments a join public.prepared_assessment_candidates c on c.prepared_assessment_id=a.id where a.status='pending' and (c.sub_rank_to_id is not null or not c.is_rank_promotion)) then
  raise exception 'Pending tier-target assessments require review before rank-only progression';
 end if;
end;$guard$;
create or replace function public._calculate_membership_promotion(target_membership_id uuid)
returns table(next_rank_id uuid,next_rank_name text,next_sub_rank_id uuid,next_sub_rank_name text,next_level text,is_rank_promotion boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare m public.class_memberships%rowtype; current_rank public.ranks%rowtype; destination public.ranks%rowtype;
begin
 perform public.assert_membership_progression_scope(target_membership_id);
 select * into strict m from public.class_memberships where id=target_membership_id;
 if m.rank_id is not null then
  select * into current_rank from public.ranks where id=m.rank_id and class_id=m.class_id;
  if not found then raise exception 'Current rank configuration not found'; end if;
 end if;
 select * into destination from public.ranks r where r.class_id=m.class_id
 and (m.rank_id is null or r.sort_order>current_rank.sort_order)
 order by r.sort_order,r.name,r.id limit 1;
 if not found then
  if m.rank_id is null then raise exception 'No ranks configured for this class'; end if;
  raise exception 'Member has reached the highest configured rank';
 end if;
 return query select destination.id,destination.name,null::uuid,null::text,destination.level::text,true;
end;$$;
revoke all on function public._calculate_membership_promotion(uuid) from public,anon,authenticated,service_role;

-- Only the authenticated viewer is evaluated. Private helper owns the data lookup;
-- existing manager/uploader policies remain separate and unchanged.
create function public.has_repository_rank_access(target_class uuid,target_rank uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and public.is_active_app_user(auth.uid())
 and exists (
  select 1 from public.class_memberships m
  join public.ranks held on held.id=m.rank_id and held.class_id=m.class_id
  join public.ranks requested on requested.id=target_rank and requested.class_id=m.class_id
  where m.user_id=auth.uid() and m.class_id=target_class
  and m.status::text in ('active','break','break_1','break_2')
  and requested.sort_order<=held.sort_order
 );
$$;
alter function public.has_repository_rank_access(uuid,uuid) owner to postgres;
revoke all on function public.has_repository_rank_access(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.has_repository_rank_access(uuid,uuid) to authenticated;
-- Rank metadata remains available for enrollment and assessment selection. Only
-- published material is grade restricted; all tiers of an eligible rank qualify.
alter policy "published content for members" on public.content
using (status='published'::public.content_status and public.has_repository_rank_access(class_id,rank_id));
notify pgrst,'reload schema';
commit;

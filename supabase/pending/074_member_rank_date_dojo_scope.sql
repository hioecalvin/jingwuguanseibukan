-- Forward-only correction: an unassigned dojo is not a class-wide admin scope.
do $scope$
declare
 routine_oid oid := 'public.get_membership_current_rank_date(uuid)'::regprocedure;
 old_definition text;
 old_acl aclitem[];
 old_owner oid;
 needle text := 'or public.is_class_admin(m.class_id,m.dojo_id,caller))';
 replacement text := 'or (m.dojo_id is not null and public.is_class_admin(m.class_id,m.dojo_id,caller)))';
begin
 select pg_get_functiondef(p.oid),p.proacl,p.proowner into old_definition,old_acl,old_owner
 from pg_proc p where p.oid=routine_oid and p.prosecdef and p.provolatile='s'
   and p.proconfig @> array['search_path=pg_catalog'];
 if old_definition is null or position(needle in old_definition)=0
   or (length(old_definition)-length(replace(old_definition,needle,'')))/length(needle)<>1 then
   raise exception 'Current-rank date reader differs; review before scope correction';
 end if;
 execute replace(old_definition,needle,replacement);
 if not exists(select 1 from pg_proc p where p.oid=routine_oid
   and p.proacl is not distinct from old_acl and p.proowner=old_owner
   and p.prosecdef and p.provolatile='s' and p.proconfig @> array['search_path=pg_catalog']) then
   raise exception 'Current-rank date reader privileges changed';
 end if;
end $scope$;

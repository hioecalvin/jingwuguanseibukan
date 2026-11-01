-- Synthetic schema extensions ONLY. Not a catalog restore or Supabase migration.
-- The reusable fixture's inserts use current captured required columns. Auth.users
-- is deliberately absent: the fixture must reuse actors, never insert profiles.
create table public.classes(id uuid primary key,name text not null unique);
insert into public.classes values('40000000-0000-4000-8000-000000000001','Existing synthetic class');
alter table public.profiles add column email text;
-- Captured account enum is required by the unmodified SELECT policy expression.
create type public.account_status as enum ('active','disabled');
alter table public.profiles alter column account_status drop default;
alter table public.profiles alter column account_status type public.account_status
 using account_status::public.account_status;
alter table public.profiles alter column account_status set default 'active'::public.account_status;
alter table public.dojos add column class_id uuid references public.classes(id);
alter table public.class_memberships add column updated_at timestamptz default now();
alter table public.class_memberships add foreign key(user_id) references public.profiles(id);
alter table public.class_memberships add foreign key(class_id) references public.classes(id);
alter table public.class_memberships add foreign key(dojo_id) references public.dojos(id);
alter table public.class_memberships add unique(user_id,class_id);
alter table public.dojo_admin_assignments add column id uuid default gen_random_uuid();
alter table public.dojo_admin_assignments add column class_id uuid references public.classes(id);
alter table public.dojo_admin_assignments add column assigned_by uuid references public.profiles(id);
alter table public.dojo_admin_assignments add foreign key(user_id) references public.profiles(id);
alter table public.dojo_admin_assignments add foreign key(dojo_id) references public.dojos(id);
create table public.membership_status_history(id bigint generated always as identity primary key,
 membership_id uuid,old_status text,new_status text,changed_by uuid);
create table public.notification_outbox(id bigint generated always as identity primary key,
 user_id uuid,recipient_email text,event_type text,subject text,payload jsonb);
-- Pre-existing synthetic history and unrelated notification prove nonempty baselines
-- are preserved; these rows and their new sequences exist only in this transaction.
insert into public.membership_status_history(membership_id,old_status,new_status,changed_by)
values('30000000-0000-4000-8000-000000000001','active','active','10000000-0000-4000-8000-000000000002');
insert into public.notification_outbox(user_id,recipient_email,event_type,subject,payload)
values('10000000-0000-4000-8000-000000000004','unrelated@example.invalid','fixture','Existing fixture outbox','{}');
insert into public.notifications(id,user_id,notification_type,title)
values(gen_random_uuid(),'10000000-0000-4000-8000-000000000004','fixture','Existing fixture notification');

-- Reviewed captured 058-era trigger body, retained in this synthetic tranche so
-- accidental membership status updates consume identities and fail assertions.
create function public.on_membership_status_change() returns trigger language plpgsql
security definer set search_path to public,pg_temp as $function$
declare p public.profiles; c public.classes;
begin
 if old.status is distinct from new.status then
   insert into public.membership_status_history(membership_id,old_status,new_status,changed_by) values(new.id,old.status,new.status,auth.uid());
   select * into p from public.profiles where id=new.user_id; select * into c from public.classes where id=new.class_id;
   insert into public.notification_outbox(user_id,recipient_email,event_type,subject,payload)
   values(new.user_id,p.email,'membership_status_changed','Your '||c.name||' membership status changed',
     jsonb_build_object('class',c.name,'old_status',old.status,'new_status',new.status));
 end if;
 new.updated_at=now(); return new;
end $function$;
create trigger membership_status_change before update on public.class_memberships
for each row execute function public.on_membership_status_change();
-- The runner installs the unmodified assignment validator from migration 037.

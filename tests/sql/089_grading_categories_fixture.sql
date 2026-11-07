create role anon;
create role authenticated;
create role service_role;
create type public.membership_level as enum ('mudansha','yudansha');
create table public.classes(id uuid primary key default gen_random_uuid(),name text unique,is_active boolean default true);
create table public.profiles(id uuid primary key default gen_random_uuid(),member_origin text,auth_user_id uuid,email text);
create table public.ranks(id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes,name text not null,sort_order int not null,level public.membership_level,unique(class_id,name));
create table public.class_memberships(id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes,rank_id uuid references public.ranks,user_id uuid references public.profiles,
 level public.membership_level,joined_date date,role text default 'user',status text default 'active',updated_at timestamptz);
create table public.prepared_assessments(id uuid primary key default gen_random_uuid(),status text);
create table public.prepared_assessment_candidates(prepared_assessment_id uuid references public.prepared_assessments,rank_to_id uuid references public.ranks,level_to text);
create table public.notification_outbox(user_id uuid,recipient_email text,event_type text,subject text,payload jsonb);
create table public.membership_status_history(membership_id uuid,old_status text,new_status text,changed_by uuid);
insert into public.classes(name,is_active) values ('Aikido',true),('Karate',true),('Taijiquan',true),('Xingyiquan',true),('Bagua',false),('Kungfu Kids',true);
insert into public.ranks(class_id,name,sort_order,level)
select c.id,g.name,g.position,g.old_level::public.membership_level from public.classes c cross join
(values ('Chuyi',1,'mudansha'),('Zhongyi',4,'yudansha'),('Zhonger',5,'yudansha'),('Zhongsan',6,'yudansha'),('Gaoyi',7,'yudansha'),('Gaoer',8,'yudansha'),('Gaosan',9,'yudansha')) g(name,position,old_level)
where c.name in ('Taijiquan','Xingyiquan','Bagua');
insert into public.ranks(class_id,name,sort_order,level) select id,'Xiaoyi',1,'mudansha' from public.classes where name='Kungfu Kids';
insert into public.ranks(class_id,name,sort_order,level) select id,'Kyu',1,'mudansha' from public.classes where name in ('Aikido','Karate');
insert into public.ranks(class_id,name,sort_order,level) select id,'Dan',2,'yudansha' from public.classes where name in ('Aikido','Karate');
insert into public.profiles(member_origin) values ('import');
insert into public.class_memberships(class_id,rank_id,user_id,level) select r.class_id,r.id,p.id,r.level from public.ranks r cross join public.profiles p;

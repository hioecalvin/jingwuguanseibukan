create table member_import_private.membership_title_source_imports (
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_filename text not null,
  source_sheet text not null check (source_sheet = 'Lisensi'),
  source_row integer not null check (source_row > 0),
  source_cell text not null,
  membership_id uuid not null references public.class_memberships(id),
  title_history_id uuid not null unique references public.membership_title_history(id),
  member_id_snapshot text not null,
  source_title_label text not null,
  title_level integer not null check (title_level between 1 and 3),
  effective_date date not null,
  imported_at timestamptz not null default now(),
  database_actor text not null default current_user,
  primary key(source_sha256, source_sheet, source_cell, membership_id)
);
alter table member_import_private.membership_title_source_imports enable row level security;
alter table member_import_private.membership_title_source_imports force row level security;
revoke all on member_import_private.membership_title_source_imports from public,anon,authenticated,service_role;
create function member_import_private.reject_title_source_import_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $immutable$
begin raise exception 'Historical title source evidence is immutable'; end;
$immutable$;
revoke all on function member_import_private.reject_title_source_import_mutation() from public,anon,authenticated,service_role;
create trigger title_source_import_immutable before update or delete on member_import_private.membership_title_source_imports
for each row execute function member_import_private.reject_title_source_import_mutation();

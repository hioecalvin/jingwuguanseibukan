-- ============================================================
-- 012 PROFILE IDENTITY CONSTRAINTS
-- ============================================================
--
-- Member ID and email are identity fields. Enforce canonical values in the
-- database so browser validation cannot be bypassed and concurrent requests
-- cannot create case/whitespace variants of the same identity.
-- ============================================================

begin;


-- Fail before taking unique-index locks if legacy identity data already
-- contains collisions after normalisation. Resolve reported values manually;
-- never auto-merge profiles or Member IDs.

do $$
declare
  duplicate_registration_number text;
  duplicate_email text;
begin
  select upper(regexp_replace(btrim(registration_number), '\s+', '', 'g'))
  into duplicate_registration_number
  from public.profiles
  where registration_number is not null
  group by upper(regexp_replace(btrim(registration_number), '\s+', '', 'g'))
  having count(*) > 1
  limit 1;

  if duplicate_registration_number is not null then
    raise exception
      'Duplicate normalised Member ID must be resolved before migration 012: %',
      duplicate_registration_number;
  end if;

  select lower(btrim(email))
  into duplicate_email
  from public.profiles
  where email is not null
  group by lower(btrim(email))
  having count(*) > 1
  limit 1;

  if duplicate_email is not null then
    raise exception
      'Duplicate normalised profile email must be resolved before migration 012: %',
      duplicate_email;
  end if;
end
$$;


-- Canonicalise legacy rows after the collision preflight. The WHERE clause
-- avoids touching already-canonical profiles (and therefore avoids needless
-- updated_at/audit churn from any existing profile triggers).

update public.profiles as profile
set
  registration_number =
    nullif(
      upper(
        regexp_replace(
          btrim(profile.registration_number),
          '\s+',
          '',
          'g'
        )
      ),
      ''
    ),
  email =
    nullif(
      lower(
        btrim(profile.email)
      ),
      ''
    ),
  full_name =
    nullif(
      regexp_replace(
        btrim(profile.full_name),
        '\s+',
        ' ',
        'g'
      ),
      ''
    ),
  phone =
    nullif(
      regexp_replace(
        btrim(profile.phone),
        '\s+',
        ' ',
        'g'
      ),
      ''
    )
where
  profile.registration_number is distinct from
    nullif(
      upper(
        regexp_replace(
          btrim(profile.registration_number),
          '\s+',
          '',
          'g'
        )
      ),
      ''
    )
  or profile.email is distinct from
    nullif(
      lower(
        btrim(profile.email)
      ),
      ''
    )
  or profile.full_name is distinct from
    nullif(
      regexp_replace(
        btrim(profile.full_name),
        '\s+',
        ' ',
        'g'
      ),
      ''
    )
  or profile.phone is distinct from
    nullif(
      regexp_replace(
        btrim(profile.phone),
        '\s+',
        ' ',
        'g'
      ),
      ''
    );


create unique index if not exists
profiles_registration_number_normalized_uidx
on public.profiles (
  upper(
    regexp_replace(
      btrim(registration_number),
      '\s+',
      '',
      'g'
    )
  )
)
where registration_number is not null;


create unique index if not exists
profiles_email_normalized_uidx
on public.profiles (
  lower(
    btrim(email)
  )
)
where email is not null;


create or replace function public.normalise_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.registration_number :=
    nullif(
      upper(
        regexp_replace(
          btrim(new.registration_number),
          '\s+',
          '',
          'g'
        )
      ),
      ''
    );

  new.email :=
    nullif(
      lower(
        btrim(new.email)
      ),
      ''
    );

  new.full_name :=
    nullif(
      regexp_replace(
        btrim(new.full_name),
        '\s+',
        ' ',
        'g'
      ),
      ''
    );

  new.phone :=
    nullif(
      regexp_replace(
        btrim(new.phone),
        '\s+',
        ' ',
        'g'
      ),
      ''
    );

  if
    tg_op = 'UPDATE'
    and old.registration_number is not null
    and new.registration_number is distinct from
      nullif(
        upper(
          regexp_replace(
            btrim(old.registration_number),
            '\s+',
            '',
            'g'
          )
        ),
        ''
      )
    and auth.uid() is not null
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.is_super_admin(auth.uid())
  then
    raise exception
      'Only Super Admin can change an assigned Member ID';
  end if;

  return new;
end;
$$;


revoke all
on function public.normalise_profile_identity()
from public, anon, authenticated;


drop trigger if exists
normalise_profile_identity_before_write
on public.profiles;


create trigger
normalise_profile_identity_before_write
before insert or update of
  registration_number,
  email,
  full_name,
  phone
on public.profiles
for each row
execute function public.normalise_profile_identity();


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_registration_number_not_blank'
  ) then
    alter table public.profiles
      add constraint profiles_registration_number_not_blank
      check (
        registration_number is null
        or btrim(registration_number) <> ''
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_email_not_blank'
  ) then
    alter table public.profiles
      add constraint profiles_email_not_blank
      check (
        email is null
        or btrim(email) <> ''
      )
      not valid;
  end if;
end
$$;


alter table public.profiles
validate constraint profiles_registration_number_not_blank;

alter table public.profiles
validate constraint profiles_email_not_blank;


notify pgrst, 'reload schema';

commit;

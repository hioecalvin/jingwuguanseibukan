-- LOCAL ONLY: reviewed 8 October captured normalizers and notification writer.
-- Loaded inside fixture transactions only; no provider or legacy-outbox helper.
do $$ begin if inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'Local only';end if;end $$;
alter table public.notifications rename column body to message;
alter table public.notifications rename column entity_type to reference_type;
alter table public.notifications rename column entity_id to reference_id;
CREATE OR REPLACE FUNCTION public.normalize_class_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin

  if new.name is not null then
    new.name :=
      initcap(
        regexp_replace(
          trim(new.name),
          '\s+',
          ' ',
          'g'
        )
      );
  end if;

  return new;

end;
$function$
;
CREATE OR REPLACE FUNCTION public.normalize_dojo_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin

  if new.name is not null then
    new.name :=
      initcap(
        regexp_replace(
          trim(new.name),
          '\s+',
          ' ',
          'g'
        )
      );
  end if;

  return new;

end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_notification(target_user_id uuid, notification_type_value text, notification_title text, notification_message text DEFAULT NULL::text, reference_type_value text DEFAULT NULL::text, reference_id_value uuid DEFAULT NULL::uuid, metadata_value jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  new_notification_id uuid;
begin

  if target_user_id is null then
    raise exception
      'Notification user is required';
  end if;


  insert into public.notifications (
    user_id,
    notification_type,
    title,
    message,
    reference_type,
    reference_id,
    metadata
  )
  values (
    target_user_id,
    notification_type_value,
    notification_title,
    nullif(
      trim(
        notification_message
      ),
      ''
    ),
    reference_type_value,
    reference_id_value,
    coalesce(
      metadata_value,
      '{}'::jsonb
    )
  )
  returning id
  into new_notification_id;


  return new_notification_id;

end;
$function$
;
-- Harness ACL: internal writer is called only through owner-run security definers.
revoke all on function public.create_notification(uuid,text,text,text,text,uuid,jsonb) from public,anon,authenticated,service_role;
CREATE TRIGGER normalize_class_fields_trigger BEFORE INSERT OR UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.normalize_class_fields();
CREATE TRIGGER normalize_dojo_fields_trigger BEFORE INSERT OR UPDATE ON public.dojos FOR EACH ROW EXECUTE FUNCTION public.normalize_dojo_fields();


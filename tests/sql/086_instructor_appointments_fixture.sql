ALTER TABLE public.profiles ADD COLUMN registration_number text;
ALTER TABLE public.class_memberships ADD COLUMN rank_id uuid;
ALTER TABLE public.class_memberships ADD COLUMN joined_date date;
ALTER TABLE public.class_memberships ADD COLUMN last_training_session_date date;
CREATE TABLE public.ranks(id uuid PRIMARY KEY,name text);
CREATE TABLE public.membership_grade_history(id uuid PRIMARY KEY,membership_id uuid,rank_id uuid,effective_date date,created_at timestamptz,revoked_at timestamptz);
CREATE SCHEMA exam_import_private;
CREATE TABLE exam_import_private.records(member_user_id uuid,class_id uuid,rank_id uuid,entry_kind text,date_precision text,assessment_date date);
CREATE FUNCTION public.is_active_super_admin(uid uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT public.is_active_app_user(uid) AND uid='00000000-0000-0000-0000-000000000001'::uuid $$;
CREATE FUNCTION public.set_membership_last_training_session(target_membership_id uuid,new_training_date date)
RETURNS TABLE(membership_id uuid,training_date date,days_ago integer)
LANGUAGE sql AS $$ SELECT target_membership_id,new_training_date,0 $$;
GRANT USAGE ON SCHEMA auth TO authenticated;

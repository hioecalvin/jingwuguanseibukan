CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_status text DEFAULT 'active',
 date_of_passing date,is_super_admin boolean DEFAULT false,auth_user_id uuid,full_name text);
CREATE TABLE public.classes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,is_active boolean DEFAULT true);
CREATE TABLE public.dojos(id uuid PRIMARY KEY,class_id uuid REFERENCES public.classes,name text,active boolean DEFAULT true,
 requires_superadmin_share boolean DEFAULT false,superadmin_share_percent numeric(5,2) DEFAULT 0);
CREATE TABLE public.dojo_admin_assignments(user_id uuid,dojo_id uuid,active boolean);
CREATE TABLE public.dojo_receiving_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dojo_id uuid,
 bank_name text,account_holder_name text,account_number text,instructions text,active boolean DEFAULT true,
 created_by uuid,created_at timestamptz DEFAULT now(),updated_by uuid,updated_at timestamptz);
CREATE TABLE public.membership_subscription_charges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),billing_month date);
CREATE TABLE public.membership_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),charge_id uuid,
 membership_id uuid,dojo_id uuid,amount numeric,currency text,payment_method text,payment_reference text,payment_date date);
CREATE TABLE public.dojo_settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dojo_id uuid,class_id uuid,
 settlement_month date,share_percent numeric,gross_amount numeric,share_amount numeric,currency text,status text,notes text,
 created_by uuid,created_at timestamptz,updated_at timestamptz,transfer_amount numeric,transfer_date date,
 transfer_method text,transfer_note text,transfer_recorded_by uuid,transfer_recorded_at timestamptz);
CREATE TABLE public.dojo_settlement_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),settlement_id uuid,
 payment_id uuid,membership_id uuid,payment_amount numeric,share_percent numeric,share_amount numeric,currency text,
 created_at timestamptz,released_at timestamptz,released_by uuid);
CREATE TABLE public.dojo_settlement_config_history(id uuid DEFAULT gen_random_uuid(),dojo_id uuid,old_requires_share boolean,
 new_requires_share boolean,old_share_percent numeric,new_share_percent numeric,changed_by uuid,changed_at timestamptz DEFAULT now());
CREATE FUNCTION public.get_settlement_eligible_payments(target_dojo_id uuid,target_month date)
RETURNS TABLE(payment_id uuid,membership_id uuid,member_name text,member_id text,payment_date date,
 payment_amount numeric,currency text,payment_method text,payment_reference text,suggested_share numeric)
LANGUAGE sql STABLE AS $$ SELECT p.id,p.membership_id,'Fixture member'::text,'JS-TEST'::text,p.payment_date,p.amount,
 p.currency,p.payment_method,p.payment_reference,round(p.amount*d.superadmin_share_percent/100,2)
 FROM public.membership_payments p JOIN public.dojos d ON d.id=p.dojo_id WHERE d.id=target_dojo_id $$;
INSERT INTO public.classes(name) VALUES('Aikido'),('Karate'),('Taijiquan'),('Xingyiquan'),('Kungfu Kids'),('Bagua');
INSERT INTO public.dojos(id,class_id,name,active)
SELECT v.id::uuid,c.id,v.dojo,v.active FROM (VALUES
('849e3573-dc96-4a9a-9ea2-5d5051aef7e1','Aikido','Chushin Dojo',true),
('9e5f895c-4f2c-40df-ab64-0ce3fab226a0','Karate','Chushin',true),
('5efc11aa-dbf9-417f-aaaa-6c9799efb57e','Taijiquan','Zhongxin',true),
('881025c4-13d1-4ae8-9345-046a5d468cda','Xingyiquan','Zhongxin',true),
('6660e2bd-bcbf-4cca-9d30-f45475a1aeca','Kungfu Kids','Zhongxin',true),
('6662df61-5d54-47d6-9e9a-d1eeec8060c8','Aikido','Kagami Dojo',true),
('f2a2c754-2d0b-4f63-a6da-994e935e26e2','Aikido','Hayashitane Dojo',true),
('2eea0a4e-fafe-4020-a59b-37985fe52919','Aikido','UBM Aikido Club',true),
('5d2155d0-07f6-4c6b-a3af-9ab78278d023','Bagua','Zhongxin',false)
)v(id,class_name,dojo,active) JOIN public.classes c ON c.name=v.class_name;
INSERT INTO public.profiles(id,auth_user_id,is_super_admin)
VALUES('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true),
 ('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',false),
 ('10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003',false);
INSERT INTO public.dojo_admin_assignments VALUES
('10000000-0000-0000-0000-000000000002','849e3573-dc96-4a9a-9ea2-5d5051aef7e1',true);

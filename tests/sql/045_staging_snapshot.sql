-- Read-only before/after snapshot for the rollback-contained migration 045
-- staging acceptance suite. The registration numbers are dedicated staging
-- security-test identities, not production members.
select
  profile.registration_number,
  membership.id as membership_id,
  membership.last_training_session_date,
  profile.date_of_passing,
  membership.status::text as membership_status,
  membership.joined_date,
  (
    select count(*)
    from public.membership_training_session_audit as audit
    where audit.membership_id = membership.id
  ) as audit_count
from public.profiles as profile
join public.class_memberships as membership
  on membership.user_id = profile.id
where profile.registration_number in ('0001', '0101')
  and membership.status::text = 'active'
order by profile.registration_number, membership.id;

-- ============================================================
-- 015 LIVE RUNTIME FUNCTION REPAIRS
-- ============================================================
-- Generated from the read-only 2026-08-30 live catalog export.
-- Each replacement above is count-asserted by the generator.
-- Repairs the errors/warnings reported by supabase db lint.
-- ============================================================

begin;


-- create_repository_content

CREATE OR REPLACE FUNCTION public.create_repository_content(target_class uuid, target_rank uuid, target_sub_rank uuid, content_title text, content_description text, provider text, provider_video_id text, content_status text, content_sort_order integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  new_content_id uuid;
begin

  if not public.can_manage_class(target_class) then
    raise exception 'Not authorised to manage this class';
  end if;

  if not exists (
    select 1
    from public.ranks r
    where r.id = target_rank
      and r.class_id = target_class
  ) then
    raise exception 'Rank does not belong to selected class';
  end if;

  if not exists (
    select 1
    from public.sub_ranks sr
    where sr.id = target_sub_rank
      and sr.rank_id = target_rank
  ) then
    raise exception 'Tier does not belong to selected rank';
  end if;

  insert into public.content (
    class_id,
    rank_id,
    sub_rank_id,
    title,
    description,
    video_provider,
    video_id,
    status,
    sort_order,
    created_by
  )
  values (
    target_class,
    target_rank,
    target_sub_rank,
    trim(content_title),
    nullif(trim(content_description), ''),
    nullif(trim(provider), ''),
    nullif(trim(provider_video_id), ''),
    content_status::public.content_status,
    content_sort_order,
    auth.uid()
  )
  returning id into new_content_id;

  return new_content_id;
end;
$function$
;

-- update_repository_content

CREATE OR REPLACE FUNCTION public.update_repository_content(target_content uuid, content_title text, content_description text, provider text, provider_video_id text, content_status text, content_sort_order integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  content_row public.content;
begin

  select *
  into content_row
  from public.content
  where id = target_content;

  if not found then
    raise exception 'Content not found';
  end if;

  if not public.can_manage_class(content_row.class_id) then
    raise exception 'Not authorised to manage this class';
  end if;

  update public.content
  set
    title = trim(content_title),
    description = nullif(trim(content_description), ''),
    video_provider = nullif(trim(provider), ''),
    video_id = nullif(trim(provider_video_id), ''),
    status = content_status::public.content_status,
    sort_order = content_sort_order,
    updated_at = now()
  where id = target_content;
end;
$function$
;

-- promote_membership

CREATE OR REPLACE FUNCTION public.promote_membership(target_membership_id uuid, promotion_effective_date date, assessor_member_id uuid DEFAULT NULL::uuid, external_assessor_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  membership_row public.class_memberships%rowtype;

  promotion record;

  new_history_id uuid;

  assessor_display_name text;
  resolved_assessor_type text;
begin

  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   */

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  /*
   * ============================================================
   * VALIDATE EFFECTIVE DATE
   * ============================================================
   */

  if promotion_effective_date is null then
    raise exception 'Promotion date is required';
  end if;


  /*
   * ============================================================
   * LOAD MEMBERSHIP
   * ============================================================
   */

  select cm.*
  into membership_row
  from public.class_memberships cm
  where cm.id = target_membership_id;


  if not found then
    raise exception 'Membership not found';
  end if;


  /*
   * ============================================================
   * PERMISSION
   * ============================================================
   */

  if not public.can_manage_class(
    membership_row.class_id,
    auth.uid()
  ) then
    raise exception 'Not authorised to manage this class';
  end if;


  /*
   * ============================================================
   * CALCULATE NEXT PROMOTION
   *
   * next_sub_rank_id may legitimately be NULL when the
   * destination rank does not use tiers.
   * ============================================================
   */

  select *
  into promotion
  from public.get_next_membership_promotion(
    target_membership_id
  );


  if promotion.next_rank_id is null then
    raise exception 'No next promotion is available';
  end if;


  /*
   * ============================================================
   * ASSESSOR RULES
   *
   * MUDANSHA
   *   -> active internal Grading Assessor required
   *
   * YUDANSHA
   *   -> external assessor name required
   * ============================================================
   */


  /*
   * ------------------------------------------------------------
   * YUDANSHA
   * ------------------------------------------------------------
   */

  if promotion.next_level = 'yudansha' then

    resolved_assessor_type := 'external';


    if external_assessor_name is null
       or trim(external_assessor_name) = ''
    then
      raise exception
        'External assessor name is required for Yudansha grading';
    end if;


    if assessor_member_id is not null then
      raise exception
        'Yudansha grading must use an external assessor';
    end if;


    assessor_display_name :=
      regexp_replace(
        trim(external_assessor_name),
        '\s+',
        ' ',
        'g'
      );


  /*
   * ------------------------------------------------------------
   * MUDANSHA
   * ------------------------------------------------------------
   */

  else

    resolved_assessor_type := 'member';


    if assessor_member_id is null then
      raise exception
        'Member assessor is required for Mudansha grading';
    end if;


    /*
     * The assessor must actually be an active
     * Grading Assessor.
     */

    select
      regexp_replace(
        trim(p.full_name),
        '\s+',
        ' ',
        'g'
      )
    into assessor_display_name
    from public.profiles p
    where p.id = assessor_member_id
      and p.is_grading_assessor = true;


    if not found then
      raise exception
        'Selected Member is not an active Grading Assessor';
    end if;


    if assessor_display_name is null
       or assessor_display_name = ''
    then
      raise exception
        'Selected assessor does not have a valid name';
    end if;


    if external_assessor_name is not null
       and trim(external_assessor_name) <> ''
    then
      raise exception
        'Mudansha grading must use a Member assessor';
    end if;

  end if;


  /*
   * ============================================================
   * UPDATE CURRENT MEMBERSHIP
   *
   * sub_rank_id is intentionally allowed to become NULL
   * for ranks that do not use tiers.
   * ============================================================
   */

  update public.class_memberships cm
  set
    rank_id = promotion.next_rank_id,

    sub_rank_id = promotion.next_sub_rank_id,

    level =
      case
        when promotion.next_level = 'yudansha'
          then 'yudansha'::public.membership_level
        else 'mudansha'::public.membership_level
      end

  where cm.id = target_membership_id;


  if not found then
    raise exception 'Membership could not be updated';
  end if;


  /*
   * ============================================================
   * PERMANENT GRADING HISTORY
   *
   * The assessor name is stored as a snapshot.
   *
   * This means changing the assessor's profile name later
   * will NOT rewrite historical grading records.
   *
   * sub_rank_id may be NULL for tierless ranks.
   * ============================================================
   */

  insert into public.membership_grade_history (
    membership_id,
    rank_id,
    sub_rank_id,
    effective_date,
    created_by,
    assessor_type,
    assessor_member_id,
    assessor_name_snapshot
  )
  values (
    target_membership_id,
    promotion.next_rank_id,
    promotion.next_sub_rank_id,
    promotion_effective_date,
    auth.uid(),
    resolved_assessor_type,

    case
      when resolved_assessor_type = 'member'
        then assessor_member_id
      else null
    end,

    assessor_display_name
  )
  returning id
  into new_history_id;


  /*
   * ============================================================
   * RETURN GRADING HISTORY ID
   * ============================================================
   */

  return new_history_id;

end;
$function$
;

-- review_dojo_settlement

CREATE OR REPLACE FUNCTION public.review_dojo_settlement(target_settlement_id uuid, decision text, rejection_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$

declare

  settlement_record
    public.dojo_settlements%rowtype;

  archive_id_value uuid;

  archive_reference_value text;

  recalculated_gross
    numeric(14,2) := 0;

  recalculated_share
    numeric(14,2) := 0;

  active_item_count integer := 0;

begin

  /*
   * =====================================================
   * AUTH
   * =====================================================
   */

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  /*
   * =====================================================
   * SUPER ADMIN ONLY
   * =====================================================
   */

  if not public.is_super_admin() then
    raise exception
      'Super Admin access required';
  end if;


  /*
   * =====================================================
   * DECISION
   * =====================================================
   */

  decision :=
    lower(
      trim(
        coalesce(decision, '')
      )
    );


  if decision not in (
    'approved',
    'rejected'
  ) then

    raise exception
      'Decision must be approved or rejected';

  end if;


  if decision = 'rejected'
     and nullif(
       trim(rejection_note),
       ''
     ) is null
  then

    raise exception
      'Rejection reason is required';

  end if;


  /*
   * =====================================================
   * LOAD + LOCK SETTLEMENT
   * =====================================================
   */

  select *
  into settlement_record

  from public.dojo_settlements

  where id =
    target_settlement_id

  for update;


  if not found then
    raise exception
      'Settlement not found';
  end if;


  /*
   * =====================================================
   * ONLY SUBMITTED SETTLEMENTS CAN BE REVIEWED
   * =====================================================
   */

  if settlement_record.status <>
     'submitted'
  then

    raise exception
      'Only submitted settlements can be reviewed';

  end if;


  /*
   * =====================================================
   * REJECTION
   * =====================================================
   *
   * Rejection does not need to pass the approval
   * integrity checks.
   *
   * This is intentional:
   *
   * If something is wrong with the transfer or
   * settlement, Super Admin must still be able to
   * reject it.
   * =====================================================
   */

  if decision = 'rejected' then

    update public.dojo_settlements

    set

      status =
        'rejected',

      reviewed_by =
        auth.uid(),

      reviewed_at =
        now(),

      rejection_reason =
        trim(rejection_note),

      approved_at =
        null,

      updated_at =
        now()

    where id =
      target_settlement_id;


    return target_settlement_id;

  end if;


  /*
   * =====================================================
   * FROM HERE DOWN:
   * APPROVAL INTEGRITY CHECKS
   * =====================================================
   */


  /*
   * =====================================================
   * ACTIVE ITEMS
   * =====================================================
   */

  select count(*)

  into active_item_count

  from public.dojo_settlement_items dsi

  where
    dsi.settlement_id =
      target_settlement_id

    and dsi.released_at
      is null;


  if active_item_count = 0 then

    raise exception
      'Settlement contains no active payment items';

  end if;


  /*
   * =====================================================
   * RECHECK OFFICIAL PAYMENTS
   * =====================================================
   */

  if exists (

    select 1

    from public.dojo_settlement_items dsi

    left join public.membership_payments mp
      on mp.id =
        dsi.payment_id

    where

      dsi.settlement_id =
        target_settlement_id

      and dsi.released_at
        is null

      and (

        mp.id is null

        or mp.dojo_id
           is distinct from
           settlement_record.dojo_id

        or mp.membership_id
           is distinct from
           dsi.membership_id

        or mp.amount
           is distinct from
           dsi.payment_amount

        or mp.currency
           is distinct from
           dsi.currency

        or mp.payment_date <
           settlement_record.settlement_month

        or mp.payment_date >=
           (
             settlement_record.settlement_month
             +
             interval '1 month'
           )

      )

  ) then

    raise exception
      'Settlement payment records no longer match official payments';

  end if;


  /*
   * =====================================================
   * RECHECK SHARE CALCULATIONS
   * =====================================================
   */

  if exists (

    select 1

    from public.dojo_settlement_items dsi

    where

      dsi.settlement_id =
        target_settlement_id

      and dsi.released_at
        is null

      and (

        dsi.share_percent
          is distinct from
          settlement_record.share_percent

        or

        dsi.share_amount
          is distinct from

          round(
            (
              dsi.payment_amount
              *
              settlement_record.share_percent
              /
              100
            )::numeric,
            2
          )

      )

  ) then

    raise exception
      'Settlement share calculations are invalid';

  end if;


  /*
   * =====================================================
   * RECALCULATE TOTALS
   * =====================================================
   */

  select

    coalesce(
      sum(dsi.payment_amount),
      0
    ),

    coalesce(
      sum(dsi.share_amount),
      0
    )

  into

    recalculated_gross,
    recalculated_share

  from public.dojo_settlement_items dsi

  where

    dsi.settlement_id =
      target_settlement_id

    and dsi.released_at
      is null;


  if recalculated_gross <= 0 then

    raise exception
      'Settlement gross amount is invalid';

  end if;


  if recalculated_share <= 0 then

    raise exception
      'Settlement share amount is invalid';

  end if;


  /*
   * =====================================================
   * SETTLEMENT SNAPSHOT MUST MATCH
   * =====================================================
   */

  if settlement_record.gross_amount
     is distinct from
     recalculated_gross
  then

    raise exception
      'Settlement gross amount no longer matches its payment items';

  end if;


  if settlement_record.share_amount
     is distinct from
     recalculated_share
  then

    raise exception
      'Settlement share amount no longer matches its payment items';

  end if;


  /*
   * =====================================================
   * TRANSFER DETAILS REQUIRED
   * =====================================================
   */

  if settlement_record.transfer_date
     is null
  then

    raise exception
      'Settlement transfer date is missing';

  end if;


  if settlement_record.transfer_date >
     current_date
  then

    raise exception
      'Settlement transfer date cannot be in the future';

  end if;


  if nullif(
    trim(
      settlement_record.transfer_method
    ),
    ''
  ) is null
  then

    raise exception
      'Settlement transfer method is missing';

  end if;


  if settlement_record.transfer_recorded_by
     is null
  then

    raise exception
      'Settlement transfer recorder is missing';

  end if;


  if settlement_record.transfer_recorded_at
     is null
  then

    raise exception
      'Settlement transfer timestamp is missing';

  end if;


  /*
   * =====================================================
   * TRANSFER AMOUNT MUST EXACTLY MATCH SHARE
   * =====================================================
   */

  if settlement_record.transfer_amount
     is distinct from
     recalculated_share
  then

    raise exception
      'Transferred amount does not match the Super Admin share';

  end if;


  /*
   * =====================================================
   * APPROVE
   * =====================================================
   */

  update public.dojo_settlements

  set

    status =
      'approved',

    reviewed_by =
      auth.uid(),

    reviewed_at =
      now(),

    rejection_reason =
      null,

    approved_at =
      now(),

    updated_at =
      now()

  where id =
    target_settlement_id;


  /*
   * =====================================================
   * ARCHIVE REFERENCE
   * =====================================================
   */

  archive_reference_value :=

    'JS-SET-'
    ||
    to_char(
      settlement_record.settlement_month,
      'YYYYMM'
    )
    ||
    '-'
    ||
    upper(
      substr(
        replace(
          target_settlement_id::text,
          '-',
          ''
        ),
        1,
        8
      )
    );


  /*
   * =====================================================
   * EXISTING ARCHIVE
   * =====================================================
   */

  select ad.id

  into archive_id_value

  from public.archived_documents ad

  where
    ad.source_type =
      'dojo_settlement'

    and ad.source_id =
      target_settlement_id

  limit 1;


  /*
   * =====================================================
   * CREATE ARCHIVE IF MISSING
   * =====================================================
   */

  if archive_id_value is null then

    insert into public.archived_documents (

      document_group,

      document_type,

      document_reference,

      class_id,

      dojo_id,

      effective_date,

      source_type,

      source_id,

      metadata,

      generated_by,

      created_at

    )

    values (

      'finance',

      'dojo_settlement',

      archive_reference_value,

      settlement_record.class_id,

      settlement_record.dojo_id,

      settlement_record.settlement_month,

      'dojo_settlement',

      target_settlement_id,

      jsonb_build_object(

        /*
         * SETTLEMENT
         */

        'gross_amount',
          recalculated_gross,

        'share_percent',
          settlement_record.share_percent,

        'share_amount',
          recalculated_share,

        'admin_retained_amount',
          recalculated_gross
          -
          recalculated_share,

        'currency',
          settlement_record.currency,

        /*
         * TRANSFER
         */

        'transfer_amount',
          settlement_record.transfer_amount,

        'transfer_date',
          settlement_record.transfer_date,

        'transfer_method',
          settlement_record.transfer_method,

        'transfer_note',
          settlement_record.transfer_note,

        'transfer_recorded_by',
          settlement_record.transfer_recorded_by,

        'transfer_recorded_at',
          settlement_record.transfer_recorded_at,

        /*
         * SUBMISSION / APPROVAL
         */

        'submitted_by',
          settlement_record.submitted_by,

        'submitted_at',
          settlement_record.submitted_at,

        'approved_by',
          auth.uid(),

        'approved_at',
          now(),

        /*
         * OTHER
         */

        'item_count',
          active_item_count,

        'notes',
          settlement_record.notes

      ),

      auth.uid(),

      now()

    )

    returning id
    into archive_id_value;

  end if;


  return target_settlement_id;

end;

$function$
;

-- get_latest_valid_title_appointment

CREATE OR REPLACE FUNCTION public.get_latest_valid_title_appointment(target_membership_id uuid)
 RETURNS TABLE(title_history_id uuid, membership_id uuid, user_id uuid, member_id text, full_name text, class_id uuid, class_name text, class_logo_url text, dojo_name text, title_level integer, title_name text, effective_date date, granted_by uuid, granted_by_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  membership_class_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select
    membership.class_id
  into
    membership_class_id
  from public.class_memberships as membership
  where membership.id =
    target_membership_id;


  if membership_class_id is null then
    raise exception
      'Membership not found';
  end if;


  if not public.is_super_admin() then
    raise exception
      'Only Super Admin can access title certificate records';
  end if;


  return query

  select
    h.id,

    m.id,
    p.id,

    p.registration_number,
    p.full_name,

    c.id,
    c.name,
    c.logo_url,

    d.name,

    h.title_level,

    public.get_membership_title_name(
      c.id,
      h.title_level
    ),

    h.effective_date,

    h.granted_by,
    grantor.full_name

  from public.membership_title_history h

  join public.class_memberships m
    on m.id =
      h.membership_id

  join public.profiles p
    on p.id =
      m.user_id

  join public.classes c
    on c.id =
      m.class_id

  left join public.dojos d
    on d.id =
      m.dojo_id

  left join public.profiles grantor
    on grantor.id =
      h.granted_by

  where
    h.membership_id =
      target_membership_id

    and h.revoked_at is null

  order by
    h.effective_date desc,
    h.created_at desc

  limit 1;

end;
$function$
;

-- create_member_invitation

CREATE OR REPLACE FUNCTION public.create_member_invitation(target_class_id uuid, target_dojo_id uuid, target_date_joined date, target_starting_level text DEFAULT NULL::text, target_starting_rank_id uuid DEFAULT NULL::uuid, target_starting_sub_rank_id uuid DEFAULT NULL::uuid, target_invitation_type text DEFAULT 'new_member'::text, target_admin_note text DEFAULT NULL::text, expiry_days integer DEFAULT 14)
 RETURNS TABLE(invitation_id uuid, invitation_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  raw_token text;

  token_hash_value text;

  expiration_time timestamptz;

  new_invitation_id uuid;

  dojo_class_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  /*
   * Admin must be allowed to manage this class.
   */

  if not public.can_manage_class(
    target_class_id,
    auth.uid()
  ) then
    raise exception
      'You are not authorised to create invitations for this class';
  end if;


  /*
   * Verify dojo belongs to selected class.
   */

  if target_dojo_id is not null then

    select
      d.class_id

    into
      dojo_class_id

    from public.dojos d

    where d.id =
      target_dojo_id;


    if not found then
      raise exception
        'Dojo not found';
    end if;


    if dojo_class_id
       is distinct from
       target_class_id
    then
      raise exception
        'Selected dojo does not belong to selected class';
    end if;

  end if;


  if target_date_joined is null then
    raise exception
      'Date joined is required';
  end if;


  if target_invitation_type not in (
    'new_member',
    'transferred_member'
  ) then
    raise exception
      'Invalid invitation type';
  end if;


  if expiry_days is null
     or expiry_days < 1
     or expiry_days > 60
  then
    raise exception
      'Invitation expiry must be between 1 and 60 days';
  end if;


  /*
   * 256-bit random token.
   */

  raw_token :=
    encode(
      extensions.gen_random_bytes(32),
      'hex'
    );


  token_hash_value :=
    encode(
      digest(
        raw_token,
        'sha256'
      ),
      'hex'
    );


  expiration_time :=
    now()
    +
    make_interval(
      days => expiry_days
    );


  insert into public.member_invitations (
    token_hash,

    class_id,
    dojo_id,

    date_joined,

    starting_level,

    starting_rank_id,
    starting_sub_rank_id,

    invitation_type,

    admin_note,

    created_by,

    expires_at
  )
  values (
    token_hash_value,

    target_class_id,
    target_dojo_id,

    target_date_joined,

    nullif(
      trim(
        target_starting_level
      ),
      ''
    ),

    target_starting_rank_id,
    target_starting_sub_rank_id,

    target_invitation_type,

    public.clean_text(
      target_admin_note
    ),

    auth.uid(),

    expiration_time
  )

  returning id
  into new_invitation_id;


  return query

  select
    new_invitation_id,
    raw_token,
    expiration_time;

end;
$function$
;

-- return_membership_active

CREATE OR REPLACE FUNCTION public.return_membership_active(membership_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  m public.class_memberships%rowtype;

  cancelled_request_count integer := 0;
begin

  /*
   * AUTHENTICATION
   */
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  /*
   * LOAD + LOCK MEMBERSHIP
   */
  select cm.*
  into m
  from public.class_memberships cm
  where cm.id = membership_id
  for update;


  if not found then
    raise exception 'Membership not found';
  end if;


  /*
   * ADMIN / SUPER ADMIN PERMISSION
   */
  if not (
    public.is_super_admin()
    or public.is_class_admin(
      m.class_id,
      m.dojo_id
    )
  ) then
    raise exception 'Not authorised';
  end if;


  /*
   * ==========================================================
   * CANCEL ANY BREAK THAT HAS NOT YET TAKEN EFFECT
   * ==========================================================
   *
   * This covers:
   *
   * Pending request
   * Approved next-month request
   *
   * It does NOT delete history.
   */

  update public.membership_break_requests br
  set
    status = 'cancelled',
    reviewed_by = coalesce(
      br.reviewed_by,
      auth.uid()
    ),
    reviewed_at = coalesce(
      br.reviewed_at,
      now()
    ),
    applied_at = coalesce(
      br.applied_at,
      case
        when br.status = 'approved'
          then now()
        else null
      end
    ),
    updated_at = now()
  where br.membership_id = $1
    and br.applied_at is null
    and br.status in (
      'pending',
      'approved'
    );


  get diagnostics
    cancelled_request_count = row_count;


  /*
   * ==========================================================
   * ALREADY ACTIVE
   *
   * This is allowed when we just cancelled a future Break.
   * ==========================================================
   */

  if m.status = 'active'::public.membership_status then

    if cancelled_request_count = 0 then
      raise exception
        'Membership is already Active and has no scheduled Break';
    end if;


    update public.class_memberships cm
    set
      break_count = 0,
      break_last_processed_month = null,
      updated_at = now()
    where cm.id = membership_id;


    return;

  end if;


  /*
   * ==========================================================
   * BREAK / INACTIVE -> ACTIVE
   * ==========================================================
   */

  update public.class_memberships cm
  set
    status = 'active'::public.membership_status,
    break_count = 0,
    break_last_processed_month = null,
    updated_at = now()
  where cm.id = membership_id;


  /*
   * STATUS HISTORY
   */
  insert into public.membership_status_history (
    membership_id,
    old_status,
    new_status,
    changed_by
  )
  values (
    membership_id,
    m.status,
    'active'::public.membership_status,
    auth.uid()
  );

end;
$function$
;

-- request_class_enrollment

CREATE OR REPLACE FUNCTION public.request_class_enrollment(target_class_id uuid, target_dojo_id uuid DEFAULT NULL::uuid, request_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  new_request_id uuid;

  target_dojo_class_id uuid;

  class_name_value text;
  dojo_name_value text;

  member_name_value text;
  member_id_value text;

  class_has_active_dojos boolean;

  admin_record record;
begin

  /*
   * =====================================================
   * AUTHENTICATION
   * =====================================================
   */

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  /*
   * =====================================================
   * ACTIVE CLASS REQUIRED
   * =====================================================
   */

  select
    c.name::text
  into
    class_name_value
  from public.classes c
  where c.id = target_class_id
    and c.is_active = true;


  if not found then
    raise exception
      'Class not found or inactive';
  end if;


  /*
   * =====================================================
   * EXISTING MEMBERSHIP
   * =====================================================
   */

  if exists (
    select 1
    from public.class_memberships cm
    where cm.user_id = auth.uid()
      and cm.class_id = target_class_id
  ) then
    raise exception
      'You are already enrolled in this class';
  end if;


  /*
   * =====================================================
   * EXISTING PENDING REQUEST
   * =====================================================
   */

  if exists (
    select 1
    from public.class_enrollment_requests r
    where r.user_id = auth.uid()
      and r.class_id = target_class_id
      and r.status = 'pending'
  ) then
    raise exception
      'You already have a pending enrollment request for this class';
  end if;


  /*
   * =====================================================
   * DETERMINE WHETHER CLASS USES DOJOS
   * =====================================================
   */

  select exists (
    select 1
    from public.dojos d
    where d.class_id = target_class_id
      and d.active = true
  )
  into class_has_active_dojos;


  /*
   * =====================================================
   * DOJO REQUIRED WHEN ACTIVE DOJOS EXIST
   * =====================================================
   */

  if class_has_active_dojos
     and target_dojo_id is null
  then
    raise exception
      'Please select a dojo for this class';
  end if;


  /*
   * =====================================================
   * NO DOJO ALLOWED WHEN CLASS HAS NO ACTIVE DOJOS
   * =====================================================
   */

  if not class_has_active_dojos
     and target_dojo_id is not null
  then
    raise exception
      'This class does not currently have an active dojo';
  end if;


  /*
   * =====================================================
   * SELECTED DOJO VALIDATION
   * =====================================================
   */

  if target_dojo_id is not null then

    select
      d.class_id,
      d.name::text
    into
      target_dojo_class_id,
      dojo_name_value
    from public.dojos d
    where d.id = target_dojo_id
      and d.active = true;


    if not found then
      raise exception
        'Dojo not found or inactive';
    end if;


    if target_dojo_class_id
       is distinct from
       target_class_id
    then
      raise exception
        'Selected dojo does not belong to the selected class';
    end if;

  end if;


  /*
   * =====================================================
   * MEMBER DISPLAY INFORMATION
   * =====================================================
   */

  select
    p.full_name::text,
    p.registration_number::text
  into
    member_name_value,
    member_id_value
  from public.profiles p
  where p.id = auth.uid();


  /*
   * =====================================================
   * CREATE REQUEST
   * =====================================================
   */

  insert into public.class_enrollment_requests (
    user_id,
    class_id,
    dojo_id,
    status,
    member_note,
    requested_at,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    target_class_id,
    target_dojo_id,
    'pending',
    nullif(
      trim(request_note),
      ''
    ),
    now(),
    now(),
    now()
  )
  returning id
  into new_request_id;


  /*
   * =====================================================
   * NOTIFY RELEVANT ADMINS
   * =====================================================
   */

  for admin_record in

    select
      recipient.user_id

    from (

      /*
       * ASSIGNED ADMINS
       */

      select distinct
        daa.user_id

      from public.dojo_admin_assignments daa

      where daa.active = true
        and daa.class_id = target_class_id

        and (
          target_dojo_id is null
          or daa.dojo_id = target_dojo_id
        )


      union


      /*
       * SUPER ADMINS
       */

      select
        p.id as user_id

      from public.profiles p

      where p.is_super_admin = true

    ) recipient

    where recipient.user_id
      is distinct from auth.uid()

  loop

    perform public.create_notification(
      admin_record.user_id,

      'class_enrollment_requested',

      'New Class Enrollment Request',

      coalesce(
        member_name_value,
        'A Member'
      )
      ||
      ' requested enrollment in '
      ||
      coalesce(
        class_name_value,
        'a class'
      )
      ||
      case
        when dojo_name_value is not null
        then
          ' at '
          ||
          dojo_name_value
        else
          ''
      end
      ||
      '.',

      'class_enrollment_request',

      new_request_id,

      jsonb_build_object(
        'request_id',
          new_request_id,

        'user_id',
          auth.uid(),

        'member_name',
          member_name_value,

        'member_id',
          member_id_value,

        'class_id',
          target_class_id,

        'class_name',
          class_name_value,

        'dojo_id',
          target_dojo_id,

        'dojo_name',
          dojo_name_value,

        'member_note',
          nullif(
            trim(request_note),
            ''
          )
      )
    );

  end loop;


  /*
   * =====================================================
   * RESULT
   * =====================================================
   */

  return new_request_id;

end;
$function$
;

-- get_latest_valid_rank_promotion

CREATE OR REPLACE FUNCTION public.get_latest_valid_rank_promotion(target_membership_id uuid)
 RETURNS TABLE(promotion_history_id uuid, membership_id uuid, user_id uuid, member_id text, aikikai_registration_number text, full_name text, class_id uuid, class_name text, class_logo_url text, dojo_name text, rank_id uuid, rank_name text, effective_date date, promoted_by uuid, promoted_by_name text, assessor_type text, assessor_member_id uuid, assessor_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  membership_class_id uuid;
begin

  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   */

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  /*
   * ============================================================
   * LOAD MEMBERSHIP CLASS
   * ============================================================
   */

  select
    cm.class_id
  into
    membership_class_id
  from public.class_memberships cm
  where cm.id =
    target_membership_id;


  if membership_class_id is null then
    raise exception
      'Membership not found';
  end if;


  /*
   * ============================================================
   * PERMISSION
   * ============================================================
   */

  if not public.can_manage_class(
    membership_class_id,
    auth.uid()
  ) then
    raise exception
      'Only an Administrator or Super Administrator can access certificate records';
  end if;


  /*
   * ============================================================
   * LATEST VALID RANK PROMOTION
   * ============================================================
   */

  return query

  with valid_history as (

    select
      h.*,

      lag(
        h.rank_id
      ) over (
        partition by
          h.membership_id

        order by
          h.effective_date asc,
          h.created_at asc
      ) as previous_rank_id

    from public.membership_grade_history h

    where h.membership_id =
        target_membership_id

      and h.revoked_at is null
  ),


  rank_promotions as (

    select *
    from valid_history

    where valid_history.previous_rank_id
      is distinct from valid_history.rank_id
  )


  select
    h.id
      as promotion_history_id,

    m.id
      as membership_id,

    p.id
      as user_id,

    p.registration_number::text
      as member_id,

    p.aikikai_registration_number::text
      as aikikai_registration_number,

    p.full_name::text
      as full_name,

    c.id
      as class_id,

    c.name::text
      as class_name,

    c.logo_url::text
      as class_logo_url,

    d.name::text
      as dojo_name,

    h.rank_id,

    r.name::text
      as rank_name,

    h.effective_date,

    h.created_by
      as promoted_by,

    admin_profile.full_name::text
      as promoted_by_name,

    /*
     * ========================================================
     * HISTORICAL ASSESSOR SNAPSHOT
     * ========================================================
     */

    h.assessor_type::text
      as assessor_type,

    h.assessor_member_id
      as assessor_member_id,

    h.assessor_name_snapshot::text
      as assessor_name

  from rank_promotions h

  join public.class_memberships m
    on m.id =
      h.membership_id

  join public.profiles p
    on p.id =
      m.user_id

  join public.classes c
    on c.id =
      m.class_id

  left join public.dojos d
    on d.id =
      m.dojo_id

  join public.ranks r
    on r.id =
      h.rank_id

  left join public.profiles admin_profile
    on admin_profile.id =
      h.created_by

  order by
    h.effective_date desc,
    h.created_at desc

  limit 1;

end;
$function$
;

-- get_my_charge_receiving_account

CREATE OR REPLACE FUNCTION public.get_my_charge_receiving_account(target_charge_id uuid)
 RETURNS TABLE(bank_name text, account_holder_name text, account_number text, instructions text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
target_user_id uuid;
  target_dojo_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select
    cm.user_id,
    c.dojo_id
  into
    target_user_id,
    target_dojo_id
  from public.membership_subscription_charges c
  join public.class_memberships cm
    on cm.id = c.membership_id
  where c.id = target_charge_id;


  if not found then
    raise exception
      'Subscription charge not found';
  end if;


  if target_user_id <> auth.uid() then
    raise exception
      'You cannot access this payment instruction';
  end if;


  return query

  select
    a.bank_name,
    a.account_holder_name,
    a.account_number,
    a.instructions

  from public.dojo_receiving_accounts a

  where a.dojo_id = target_dojo_id
    and a.active = true

  limit 1;

end;
$function$
;

-- apply_membership_fee_adjustment

CREATE OR REPLACE FUNCTION public.apply_membership_fee_adjustment(target_membership_id uuid, new_amount numeric, adjustment_mode text, adjustment_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  membership_record
    public.class_memberships%rowtype;

  charge_record
    public.membership_subscription_charges%rowtype;

  member_user_id uuid;

  current_month date;
  next_month date;

  payment_count integer := 0;
  pending_confirmation_count integer := 0;

  current_charge_locked boolean := false;

  old_charge_amount numeric;
  old_future_rate numeric;
  rate_currency text;

notification_title text;
  notification_message text;

  normalized_mode text;
begin

  /*
   * =====================================================
   * AUTH
   * =====================================================
   */

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  /*
   * =====================================================
   * VALIDATE
   * =====================================================
   */

  if new_amount is null
     or new_amount < 0
  then
    raise exception
      'Fee must be zero or greater';
  end if;


  normalized_mode :=
    lower(
      trim(
        coalesce(
          adjustment_mode,
          ''
        )
      )
    );


  if normalized_mode not in (
    'this_month_only',
    'this_month_onward',
    'next_month_onward'
  ) then
    raise exception
      'Invalid fee adjustment mode';
  end if;


  /*
   * =====================================================
   * MEMBERSHIP
   * =====================================================
   */

  select *
  into membership_record

  from public.class_memberships

  where id =
    target_membership_id

  for update;


  if not found then
    raise exception 'Membership not found';
  end if;


  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;


  if not public.can_access_dojo_finance(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  member_user_id :=
    membership_record.user_id;


  current_month :=
    date_trunc(
      'month',
      current_date
    )::date;


  next_month :=
    (
      current_month
      + interval '1 month'
    )::date;


  /*
   * =====================================================
   * CURRENT MONTH CHARGE
   * =====================================================
   */

  select *
  into charge_record

  from public.membership_subscription_charges

  where membership_id =
    target_membership_id

    and billing_month =
      current_month

  for update;


  if found then

    old_charge_amount :=
      charge_record.amount;


    select count(*)
    into payment_count
    from public.membership_payments p
    where p.charge_id =
      charge_record.id;


    select count(*)
    into pending_confirmation_count
    from public.membership_payment_confirmations pc
    where pc.charge_id =
      charge_record.id
      and pc.status = 'pending';


    current_charge_locked :=
      payment_count > 0
      or pending_confirmation_count > 0
      or charge_record.status in (
        'paid',
        'partially_paid',
        'waived',
        'cancelled'
      );

  else

    old_charge_amount := null;
    current_charge_locked := false;

  end if;


  /*
   * =====================================================
   * THIS MONTH ONLY
   * =====================================================
   */

  if normalized_mode =
     'this_month_only'
  then

    if charge_record.id is null then
      raise exception
        'No subscription charge exists for the current month';
    end if;


    if current_charge_locked then
      raise exception
        'The current month is locked because payment activity already exists or the charge is closed';
    end if;


    update public.membership_subscription_charges
    set
      amount =
        new_amount,

      status =
        case
          when new_amount = 0
            then 'paid'
          else 'unpaid'
        end

    where id =
      charge_record.id;


    insert into public.membership_fee_adjustment_history (
      membership_id,
      charge_id,
      dojo_id,
      class_id,

      adjustment_type,

      effective_from,
      effective_until,

      old_amount,
      new_amount,

      currency,

      reason,

      changed_by,
      changed_at
    )
    values (
      target_membership_id,
      charge_record.id,
      membership_record.dojo_id,
      membership_record.class_id,

      'this_month_only',

      current_month,
      (
        current_month
        + interval '1 month'
        - interval '1 day'
      )::date,

      old_charge_amount,
      new_amount,

      charge_record.currency,

      nullif(
        trim(adjustment_reason),
        ''
      ),

      auth.uid(),
      now()
    );


    notification_title :=
      'Subscription fee adjusted';


    notification_message :=
      'Your '
      ||
      trim(
        to_char(
          current_month,
          'FMMonth YYYY'
        )
      )
      ||
      ' subscription fee has been adjusted from '
      ||
      old_charge_amount
      ||
      ' to '
      ||
      new_amount
      ||
      '. This adjustment applies to this month only.';


    perform public.create_notification(
      member_user_id,

      'subscription_fee_adjusted',

      notification_title,

      notification_message,

      'membership_subscription_charge',

      charge_record.id,

      jsonb_build_object(
        'membership_id',
          target_membership_id,

        'charge_id',
          charge_record.id,

        'adjustment_mode',
          normalized_mode,

        'old_amount',
          old_charge_amount,

        'new_amount',
          new_amount,

        'currency',
          charge_record.currency,

        'effective_from',
          current_month,

        'effective_until',
          (
            current_month
            + interval '1 month'
            - interval '1 day'
          )::date,

        'reason',
          nullif(
            trim(adjustment_reason),
            ''
          )
      )
    );


    return jsonb_build_object(
      'success', true,
      'mode', normalized_mode,
      'current_month_adjusted', true,
      'future_rate_changed', false,
      'effective_from', current_month,
      'old_amount', old_charge_amount,
      'new_amount', new_amount
    );

  end if;


  /*
   * =====================================================
   * THIS MONTH ONWARD
   * =====================================================
   */

  if normalized_mode =
     'this_month_onward'
  then

    /*
     * If current month is locked, automatically move the
     * permanent change to next month.
     */

    if current_charge_locked then

      normalized_mode :=
        'next_month_onward';

    else

      /*
       * A current charge must exist if we are going to
       * change this month's bill.
       */

      if charge_record.id is null then
        raise exception
          'No subscription charge exists for the current month';
      end if;


      update public.membership_subscription_charges
      set
        amount =
          new_amount,

        rate_source =
          'member_special',

        status =
          case
            when new_amount = 0
              then 'paid'
            else 'unpaid'
          end

      where id =
        charge_record.id;


select
        r.amount,
        r.currency
      into
        old_future_rate,
        rate_currency
      from public.get_membership_subscription_rate(
        target_membership_id,
        current_month
      ) r;


      perform public.set_member_subscription_rate(
        target_membership_id,
        new_amount,
        current_month,
        null,
        adjustment_reason,
        coalesce(
          rate_currency,
          charge_record.currency,
          'IDR'
        )
      );


      insert into public.membership_fee_adjustment_history (
        membership_id,
        charge_id,
        dojo_id,
        class_id,

        adjustment_type,

        effective_from,
        effective_until,

        old_amount,
        new_amount,

        currency,

        reason,

        changed_by,
        changed_at
      )
      values (
        target_membership_id,
        charge_record.id,
        membership_record.dojo_id,
        membership_record.class_id,

        'this_month_onward',

        current_month,
        null,

        coalesce(
          old_future_rate,
          old_charge_amount
        ),

        new_amount,

        coalesce(
          rate_currency,
          charge_record.currency,
          'IDR'
        ),

        nullif(
          trim(adjustment_reason),
          ''
        ),

        auth.uid(),
        now()
      );


      perform public.create_notification(
        member_user_id,

        'subscription_rate_updated',

        'Subscription rate updated',

        'Your subscription fee has been changed to '
        ||
        new_amount
        ||
        ' starting '
        ||
        trim(
          to_char(
            current_month,
            'FMMonth YYYY'
          )
        )
        ||
        '. This rate will apply to future subscriptions until it is changed again.',

        'class_membership',

        target_membership_id,

        jsonb_build_object(
          'membership_id',
            target_membership_id,

          'charge_id',
            charge_record.id,

          'adjustment_mode',
            'this_month_onward',

          'old_amount',
            coalesce(
              old_future_rate,
              old_charge_amount
            ),

          'new_amount',
            new_amount,

          'currency',
            coalesce(
              rate_currency,
              charge_record.currency,
              'IDR'
            ),

          'effective_from',
            current_month,

          'reason',
            nullif(
              trim(adjustment_reason),
              ''
            )
        )
      );


      return jsonb_build_object(
        'success', true,
        'mode', 'this_month_onward',
        'current_month_adjusted', true,
        'future_rate_changed', true,
        'effective_from', current_month,
        'new_amount', new_amount
      );

    end if;

  end if;


  /*
   * =====================================================
   * NEXT MONTH ONWARD
   * =====================================================
   *
   * This is also where this_month_onward automatically
   * lands if the current month has payment activity.
   * =====================================================
   */

select
    r.amount,
    r.currency

  into
    old_future_rate,
    rate_currency

  from public.get_membership_subscription_rate(
    target_membership_id,
    next_month
  ) r;


  perform public.set_member_subscription_rate(
    target_membership_id,
    new_amount,
    next_month,
    null,
    adjustment_reason,
    coalesce(
      rate_currency,
      charge_record.currency,
      'IDR'
    )
  );


  insert into public.membership_fee_adjustment_history (
    membership_id,
    charge_id,
    dojo_id,
    class_id,

    adjustment_type,

    effective_from,
    effective_until,

    old_amount,
    new_amount,

    currency,

    reason,

    changed_by,
    changed_at
  )
  values (
    target_membership_id,
    null,
    membership_record.dojo_id,
    membership_record.class_id,

    'next_month_onward',

    next_month,
    null,

    old_future_rate,
    new_amount,

    coalesce(
      rate_currency,
      charge_record.currency,
      'IDR'
    ),

    nullif(
      trim(adjustment_reason),
      ''
    ),

    auth.uid(),
    now()
  );


  perform public.create_notification(
    member_user_id,

    'subscription_rate_updated',

    'Subscription rate updated',

    'Your subscription fee will change to '
    ||
    new_amount
    ||
    ' starting '
    ||
    trim(
      to_char(
        next_month,
        'FMMonth YYYY'
      )
    )
    ||
    '. Your current month is unchanged.',

    'class_membership',

    target_membership_id,

    jsonb_build_object(
      'membership_id',
        target_membership_id,

      'adjustment_mode',
        'next_month_onward',

      'old_amount',
        old_future_rate,

      'new_amount',
        new_amount,

      'currency',
        coalesce(
          rate_currency,
          charge_record.currency,
          'IDR'
        ),

      'effective_from',
        next_month,

      'reason',
        nullif(
          trim(adjustment_reason),
          ''
        )
    )
  );


  return jsonb_build_object(
    'success', true,
    'mode', 'next_month_onward',
    'current_month_adjusted', false,
    'future_rate_changed', true,
    'effective_from', next_month,
    'old_amount', old_future_rate,
    'new_amount', new_amount
  );

end;
$function$
;

notify pgrst, 'reload schema';

commit;

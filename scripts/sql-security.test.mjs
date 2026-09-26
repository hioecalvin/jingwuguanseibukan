import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { functionDeclarations, hasFixedPublicSearchPath } from "./sql-function-attributes.mjs";


function sqlFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(directory, entry.name));
}


function migration(name) {
  return fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", name),
    "utf8"
  );
}


function fullFunctionDefinitions(sql) {
  const pattern = /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\([\s\S]*?\)\s*[\s\S]*?\bas\s+(\$[a-z0-9_]*\$)([\s\S]*?)\2/gi;
  return [...sql.matchAll(pattern)].map((match) => ({
    name: match[1].toLowerCase(),
    definition: match[0],
  }));
}


test("every checked-in SECURITY DEFINER function fixes search_path", () => {
  const files = [
    ...sqlFiles(path.join(process.cwd(), "migrations")),
    ...sqlFiles(path.join(process.cwd(), "supabase", "migrations")),
  ];
  const failures = [];

  for (const file of files) {
    for (const declaration of functionDeclarations(fs.readFileSync(file, "utf8"))) {
      if (/\bsecurity\s+definer\b/i.test(declaration) && !hasFixedPublicSearchPath(declaration)) {
        failures.push(`${path.basename(file)}: ${declaration.slice(0, 100)}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});


test("browser-executable SECURITY DEFINER mutators authorize before writing", () => {
  const legacyFiles = sqlFiles(path.join(process.cwd(), "migrations")).sort();
  const migrationFiles = sqlFiles(path.join(process.cwd(), "supabase", "migrations")).sort();
  const latestDeclarations = new Map();

  for (const file of [...legacyFiles, ...migrationFiles]) {
    for (const { name, definition } of fullFunctionDefinitions(fs.readFileSync(file, "utf8"))) {
      latestDeclarations.set(name, definition);
    }
  }

  const acl = migration("018_explicit_browser_acl_allowlist.sql");
  const allowlistBody = acl.match(
    /browser_routines constant text\[\] := array\[(?<body>[\s\S]*?)\];/i,
  )?.groups?.body;
  assert.ok(allowlistBody);
  const browserRoutines = new Set([
    ...[...allowlistBody.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1]),
    "review_class_request_with_level",
  ]);
  const mutationPattern = /\b(?:insert\s+into|update\s+public\.|delete\s+from|truncate\s+)/i;
  const authorizationPattern = /auth\.uid\(\)|public\.(?:is_super_admin|is_class_admin|can_manage_class|can_manage_dojo|can_access_dojo_finance)\s*\(/i;
  const failures = [];
  let checked = 0;

  for (const [name, declaration] of latestDeclarations) {
    if (!browserRoutines.has(name) || !/\bsecurity\s+definer\b/i.test(declaration)) continue;
    const firstMutation = declaration.search(mutationPattern);
    if (firstMutation < 0) continue;
    checked += 1;
    if (!authorizationPattern.test(declaration.slice(0, firstMutation))) failures.push(name);
  }

  assert.ok(checked >= 19, `Unexpectedly small mutator inventory: ${checked}`);
  assert.deepEqual(failures, []);
});


test("profile identity migration preflights, canonicalises, and validates", () => {
  const sql = migration("012_profile_identity_constraints.sql");

  assert.match(sql, /having count\(\*\) > 1/gi);
  assert.match(sql, /update public\.profiles as profile/i);
  assert.match(sql, /validate constraint profiles_registration_number_not_blank/i);
  assert.match(sql, /validate constraint profiles_email_not_blank/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.profiles/i);
});


test("payment tables are RPC-only for browser roles", () => {
  const sql = migration("013_payment_confirmation_rls_hardening.sql");

  for (const table of [
    "dojo_receiving_accounts",
    "membership_payment_confirmations",
  ]) {
    assert.match(
      sql,
      new RegExp(`alter table if exists public\\.${table}\\s+enable row level security`, "i")
    );
    assert.match(
      sql,
      new RegExp(`revoke all\\s+on table public\\.${table}\\s+from public, anon, authenticated`, "i")
    );
  }
});


test("view hardening tolerates recorded notification-function drift", () => {
  const sql = migration("011_security_view_hardening.sql");

  for (const signature of [
    "public.notify_announcement_published(uuid)",
    "public.notify_event_created(uuid)",
    "public.notify_event_updated(uuid)",
    "public.handle_announcement_notification()",
    "public.handle_event_notification()",
  ]) {
    assert.ok(sql.includes(`'${signature}'`));
  }
  assert.match(sql, /if to_regprocedure\(function_signature\) is not null/i);
  assert.match(sql, /revoke execute on function %s from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /on function public\.notify_announcement_published\(uuid\)/i);
});


test("SECURITY DEFINER hardening binds callers and removes unsafe defaults", () => {
  const sql = migration("014_security_definer_caller_hardening.sql");

  assert.match(sql, /target_user_id = auth\.uid\(\)/i);
  assert.match(sql, /uid = auth\.uid\(\)/i);
  assert.match(sql, /procedure_data\.prosecdef/i);
  assert.match(
    sql,
    /alter default privileges for role postgres\s+revoke execute on functions from public, anon, authenticated/i
  );
  assert.match(sql, /in schema public\s+revoke execute on functions from public, anon, authenticated/i);
  assert.match(sql, /alter function %I\.%I\(%s\) set search_path = public, pg_temp/i);
  assert.match(sql, /procedure_data\.prorettype = 'trigger'::regtype/i);
});


test("live runtime repair migration contains every lint fix", () => {
  const sql = migration("015_live_runtime_function_repairs.sql");
  const functionCount = (
    sql.match(/create or replace function public\./gi) ?? []
  ).length;

  assert.equal(functionCount, 11);
  for (const declaration of functionDeclarations(sql)) {
    assert.match(declaration, /set search_path to public, pg_temp/i);
  }
  assert.match(sql, /content_status::public\.content_status/gi);
  assert.match(sql, /'yudansha'::public\.membership_level/i);
  assert.match(sql, /document_reference,/i);
  assert.match(sql, /generated_by,/i);
  assert.match(sql, /extensions\.gen_random_bytes\(32\)/i);
  assert.match(sql, /where br\.membership_id = \$1/i);
  assert.match(sql, /p\.registration_number::text/i);
  assert.match(sql, /valid_history\.previous_rank_id/i);
  assert.doesNotMatch(sql, /p\.member_id::text/i);
});

test("subscription repair restores scoped, serialized RPCs without replaying history", () => {
  const sql = migration("016_restore_subscription_notification_rpcs.sql");
  const declarations = functionDeclarations(sql);
  assert.equal(declarations.length, 3);
  for (const name of ["notify_monthly_subscription_charges", "notify_unpaid_subscription_reminders", "generate_and_notify_monthly_subscriptions"]) {
    assert.ok(declarations.some(declaration => declaration.includes(`public.${name}(`)));
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\(uuid, date\\) from public, anon`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\(uuid, date\\) to authenticated`, "i"));
  }
  assert.equal((sql.match(/pg_advisory_xact_lock/g) ?? []).length, 3);
  assert.equal((sql.match(/if not public\.can_access_dojo_finance/g) ?? []).length, 3);
  assert.equal((sql.match(/if target_dojo_id is null or target_month is null/g) ?? []).length, 3);
  assert.equal((sql.match(/set search_path = public, pg_temp/g) ?? []).length, 3);
  assert.match(sql, /outstanding_amount <=\s+0/);
  assert.match(sql, /':unpaid_reminder:'/);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("subscription locks and daily dedupe keys are independent of DateStyle", () => {
  const sql = migration("016_restore_subscription_notification_rpcs.sql");
  assert.equal((sql.match(/to_char\(date_trunc\('month', target_month\)::date, 'YYYY-MM-DD'\)/g) ?? []).length, 3);
  assert.match(sql, /to_char\(current_date, 'YYYY-MM-DD'\)/);
  assert.doesNotMatch(sql, /date_trunc\('month', target_month\)::date::text|current_date::text/);
});

test("member invitation digest repair keeps the hardened search path", () => {
  const sql = migration("017_qualify_member_invitation_digest.sql");
  const declarations = functionDeclarations(sql);

  assert.equal(declarations.length, 1);
  assert.match(declarations[0], /public\.create_member_invitation\(/i);
  assert.match(declarations[0], /security definer/i);
  assert.match(declarations[0], /set search_path to public, pg_temp/i);
  assert.match(sql, /extensions\.gen_random_bytes\(32\)/i);
  assert.match(sql, /extensions\.digest\(raw_token, 'sha256'\)/i);
  assert.doesNotMatch(sql, /(?<!\.)\bdigest\s*\(/i);
});

test("browser ACL migration is explicit, policy-backed, and covers application RPCs", () => {
  const sql = migration("018_explicit_browser_acl_allowlist.sql");

  assert.match(sql, /revoke all privileges\s+on all tables in schema public\s+from public, anon, authenticated/i);
  assert.match(sql, /revoke all privileges\s+on all sequences in schema public\s+from public, anon, authenticated/i);
  assert.match(sql, /revoke execute\s+on all functions in schema public\s+from public, anon, authenticated/i);
  assert.match(sql, /on table public\.classes, public\.dojos\s+to anon/i);
  assert.match(sql, /create policy "grade history own or scoped admin"/i);
  assert.doesNotMatch(sql, /grant\s+(?:truncate|references|trigger|maintain)\b/i);

  const allowlist = sql.match(/browser_routines constant text\[\] := array\[(?<body>[\s\S]*?)\];/i);
  assert.ok(allowlist?.groups?.body);
  const allowedNames = new Set(
    [...allowlist.groups.body.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1])
  );
  // Browser RPCs added after the destructive migration-018 reset must be
  // granted explicitly by their own immutable follow-up migration.
  const laterAllowedNames = new Set([
    "finalize_prepared_bulk_assessment",
    "get_bulk_assessment_candidates",
    "get_manageable_schedule_scopes",
    "get_my_member_directory",
    "get_my_repository_upload_scopes",
    "get_member_memorial_settings",
    "get_repository_uploader_candidates",
    "get_repository_uploader_options",
    "get_prepared_bulk_assessment",
    "get_prepared_bulk_assessments",
    "get_regular_class_schedules",
    "get_schedule_instructor_options",
    "update_my_contact_details",
    "prepare_bulk_assessment",
    "publish_initial_memorial",
    "record_prepared_assessment_certificate_print",
    "review_class_request_with_level",
    "get_my_last_training_sessions",
    "mark_membership_trained_today",
    "set_membership_last_training_session",
    "set_member_deceased",
    "submit_bulk_assessment",
    "upsert_regular_class_schedule",
    "assign_repository_uploader",
    "is_repository_uploader",
    "revoke_repository_uploader",
    "get_dojo_settlement_item_details",
    "get_settlement_eligible_payment_details",
  ]);
  const serverOnly = new Set([
    "activate_repository_video_asset",
    "claim_next_email",
    "consume_api_rate_limit",
    "email_backend_health_check",
    "mark_email_failed",
    "mark_email_sent",
    "mark_password_changed",
    "mark_password_reset_applied",
    "process_memorial_anniversaries",
    "queue_email",
    "record_repository_video_event",
    "verify_prepared_assessment_certificate",
  ]);
  const roots = ["app", "components", "lib"];
  const referenced = new Set();

  for (const root of roots) {
    for (const file of sqlFilesRecursive(path.join(process.cwd(), root))) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/\.rpc\(\s*["']([a-zA-Z0-9_]+)["']/g)) {
        referenced.add(match[1]);
      }
    }
  }

  for (const name of referenced) {
    if (!serverOnly.has(name)) {
      assert.ok(
        allowedNames.has(name) || laterAllowedNames.has(name),
        `Missing browser RPC from ACL allowlist: ${name}`
      );
    }
  }
  for (const name of serverOnly) {
    assert.equal(allowedNames.has(name), false, `Server-only RPC is browser-executable: ${name}`);
  }
});

test("admin transfer batch compatibility RPC delegates to the atomic implementation", () => {
  const sql = migration("020_enforce_admin_transfer_batch_atomicity.sql");
  const declarations = functionDeclarations(sql);

  assert.equal(declarations.length, 1);
  assert.match(declarations[0], /public\.request_admin_dojo_transfer_batch\(/i);
  assert.match(declarations[0], /security definer/i);
  assert.match(declarations[0], /set search_path to public, pg_temp/i);
  assert.match(sql, /return public\.request_bulk_dojo_transfer\(/i);
  assert.match(sql, /coalesce\(transfer_effective_date, current_date\)/i);
  assert.match(sql, /select procedure_data\.prosecdef[\s\S]*procedure_data\.proname = 'request_bulk_dojo_transfer'/i);
  assert.match(sql, /revoke execute on function public\.request_admin_dojo_transfer_batch\([\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.request_admin_dojo_transfer_batch\([\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("initial registration approval and level assignment are atomic", () => {
  const sql = migration("027_atomic_registration_approval.sql");
  const app = fs.readFileSync("app/admin/applications/page.tsx", "utf8");

  assert.match(sql, /create or replace function public\.review_class_request_with_level\(/i);
  assert.match(sql, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /where id = target_request_id[\s\S]*for update/i);
  assert.match(sql, /public\.is_super_admin\(\)[\s\S]*public\.is_class_admin\(/i);
  assert.match(sql, /on conflict \(user_id, class_id\) do update[\s\S]*level = excluded\.level/i);
  assert.match(sql, /insert into public\.notification_outbox/i);
  assert.match(sql, /revoke all on function public\.review_class_request_with_level\([\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.review_class_request_with_level\([\s\S]*to authenticated, service_role/i);
  assert.match(app, /\.rpc\(\s*"review_class_request_with_level"/);
  assert.doesNotMatch(app, /\.rpc\(\s*"set_membership_level"/);
});

test("grading promotions serialize progression and preserve chronological history", () => {
  const sql = migration("029_serialize_membership_promotions.sql");
  const declarations = fullFunctionDefinitions(sql);

  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "promote_membership");
  assert.match(sql, /security definer[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /where cm\.id = target_membership_id\s+for update/i);
  const definition = declarations[0].definition;
  assert.ok(
    definition.search(/for update/i) < definition.search(/get_next_membership_promotion/i),
    "Membership lock must precede next-grade calculation",
  );
  assert.match(
    sql,
    /max\(history\.effective_date\)[\s\S]*history\.revoked_at is null/i,
  );
  assert.match(sql, /promotion_effective_date < latest_effective_date/i);
  assert.match(
    sql,
    /revoke all on function public\.promote_membership\(uuid, date, uuid, text\)[\s\S]*from public, anon/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.promote_membership\(uuid, date, uuid, text\)[\s\S]*to authenticated, service_role/i,
  );
});

test("payment completion repair rejects overpayment and restores Member result notifications", () => {
  const sql = migration("021_harden_payment_completion_and_notifications.sql");
  const declarations = functionDeclarations(sql);

  assert.equal(declarations.length, 2);
  for (const declaration of declarations) {
    assert.match(declaration, /security definer/i);
    assert.match(declaration, /set search_path to public, pg_temp/i);
  }
  assert.match(sql, /public\.record_membership_payment\(/i);
  assert.match(sql, /charge_record\.status in \('waived', 'cancelled'\)/i);
  assert.match(sql, /charge_record\.status = 'paid' or remaining_balance <= 0/i);
  assert.match(sql, /payment_amount > remaining_balance/i);
  assert.match(sql, /when final_paid > 0 then 'partially_paid'/i);
  assert.match(sql, /public\.review_membership_payment_confirmation\(/i);
  assert.match(sql, /confirmation_id,[\s\S]*confirmation_record\.id/i);
  assert.match(sql, /membership_payment_confirmation_rejected/i);
  assert.match(sql, /membership_payment_confirmation_approved/i);
  assert.match(sql, /membership_payments_confirmation_unique_idx/i);
  assert.match(sql, /revoke execute on function public\.record_membership_payment\([\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.review_membership_payment_confirmation\([\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("settlement transfer overload repair preserves the browser RPC without ambiguity", () => {
  const sql = migration("022_remove_ambiguous_settlement_transfer_overload.sql");

  assert.match(sql, /to_regprocedure\('public\.set_dojo_settlement_transfer\(uuid,date,text,text\)'\)/i);
  assert.match(sql, /pronargdefaults[\s\S]*is distinct from 2/i);
  assert.match(sql, /drop function public\.set_dojo_settlement_transfer\(uuid, date, text, text, text\)/i);
  assert.match(sql, /alter function public\.set_dojo_settlement_transfer\(uuid, date, text, text\)[\s\S]*set search_path to public, pg_temp/i);
  assert.match(sql, /revoke all privileges[\s\S]*set_dojo_settlement_transfer\(uuid, date, text, text\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant execute[\s\S]*set_dojo_settlement_transfer\(uuid, date, text, text\)[\s\S]*to authenticated, service_role/i);
  assert.match(sql, /to_regprocedure\('public\.set_dojo_settlement_transfer\(uuid,date,text,text,text\)'\) is not null/i);
  assert.doesNotMatch(sql, /drop function\s+public\.set_dojo_settlement_transfer\(uuid, date, text, text\)\s*;/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("legacy notification writers atomically route into the durable email queue", () => {
  const sql = migration("023_route_legacy_notifications_to_email_outbox.sql");
  const declarations = functionDeclarations(sql);

  assert.equal(declarations.length, 1);
  assert.match(declarations[0], /public\.route_legacy_notification_to_email_outbox\(\)/i);
  assert.match(declarations[0], /security definer/i);
  assert.match(declarations[0], /set search_path = public, pg_temp/i);
  assert.match(sql, /before insert on public\.notification_outbox/i);
  assert.match(sql, /public\.queue_email\s*\(/i);
  assert.match(sql, /target_dedupe_key\s*=>\s*'notification-outbox\/'\s*\|\|\s*new\.id::text/i);
  assert.match(sql, /return null/i);
  assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+public\.notification_outbox/i);
});

test("repository video pipeline keeps provider and diagnostic data server-only", () => {
  const sql = migration("024_repository_video_pipeline.sql");

  assert.match(sql, /create table public\.repository_watermark_profiles/i);
  assert.match(sql, /create table public\.repository_video_sources/i);
  assert.match(sql, /content_id uuid not null unique references public\.content\(id\) on delete restrict/i);
  assert.match(sql, /create table public\.repository_video_assets/i);
  assert.match(sql, /create table public\.repository_video_events/i);
  assert.match(sql, /'uploading'[\s\S]*'uploaded'[\s\S]*'queued'[\s\S]*'processing'[\s\S]*'ready'[\s\S]*'failed'/i);
  assert.match(sql, /original_storage_key text not null unique/i);
  assert.match(sql, /original_sha256 text check/i);
  assert.match(sql, /sha256_verified_at timestamptz/i);
  assert.match(sql, /upload_state text not null default 'awaiting_upload'/i);
  assert.match(sql, /'repository-video-originals'[\s\S]*public,[\s\S]*false/i);
  assert.match(sql, /unique \(source_id, watermark_profile_id\)/i);
  assert.match(sql, /create unique index repository_video_one_active_asset_idx[\s\S]*where is_active/i);
  assert.match(sql, /check \(not is_active or state = 'ready'\)/i);
  assert.match(sql, /create or replace function public\.activate_repository_video_asset/i);
  assert.match(sql, /create or replace function public\.record_repository_video_event/i);
  assert.match(sql, /current_asset\.state in \('deleting', 'deleted'\)[\s\S]*select current_asset\.id, false/);
  assert.match(sql, /on conflict on constraint repository_video_event_dedupe do nothing/i);
  assert.match(sql, /if inserted_event_id is null then[\s\S]*false/i);
  assert.match(sql, /target_provider_event_at <=[\s\S]*current_asset\.last_provider_event_at/i);
  assert.match(sql, /if target_next_state = 'ready'[\s\S]*if not exists[\s\S]*is_active = true/i);
  assert.match(sql, /where asset\.id = target_asset_id[\s\S]*and asset\.state = 'ready'[\s\S]*for update/i);
  assert.match(sql, /unique \(provider, provider_asset_id\)/i);
  assert.match(sql, /unique \(video_asset_id, provider_event_id\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant all privileges[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete)[\s\S]*to\s+(?:anon|authenticated)/i);
});

test("repository content permits no legacy embed without accepting partial pairs", () => {
  const sql = migration("025_allow_repository_content_without_legacy_embed.sql");

  assert.match(sql, /lock table public\.content in share row exclusive mode/i);
  assert.match(sql, /existing content has an invalid legacy video pairing/i);
  assert.match(sql, /alter column video_provider drop not null/i);
  assert.match(sql, /alter column video_provider drop default/i);
  assert.match(sql, /alter column video_id drop not null/i);
  assert.match(sql, /drop constraint if exists content_video_provider_check/i);
  assert.match(sql, /add constraint content_legacy_video_pair_check/i);
  assert.match(sql, /video_provider is null[\s\S]*video_id is null/i);
  assert.match(sql, /video_provider is not null[\s\S]*video_id is not null/i);
  assert.match(sql, /video_provider in \('youtube', 'vimeo'\)/i);
  assert.match(sql, /nullif\(btrim\(video_id\), ''\) is not null/i);
  assert.match(sql, /validate constraint content_legacy_video_pair_check/i);
  assert.match(sql, /pair_constraint_validated is distinct from true/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+public\.content/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("repository access includes supported break states and managers can read drafts", () => {
  const sql = migration("034_repair_repository_access_scope.sql");

  assert.match(sql, /membership\.status\s+in\s*\([\s\S]*'active'[\s\S]*'break'[\s\S]*'break_1'[\s\S]*'break_2'[\s\S]*\)/i);
  assert.match(sql, /uid\s*=\s*auth\.uid\(\)[\s\S]*auth\.role\(\)[\s\S]*service_role/i);
  assert.match(sql, /create policy "repository managers read all content"[\s\S]*for select[\s\S]*to authenticated[\s\S]*can_manage_class\(class_id, auth\.uid\(\)\)/i);
  assert.match(sql, /revoke execute on function public\.has_repository_access\(uuid, uuid\)[\s\S]*from public, anon/i);
  assert.match(sql, /has_table_privilege\('authenticated', 'public\.content', 'INSERT'\)[\s\S]*'UPDATE'[\s\S]*'DELETE'[\s\S]*'SELECT'/i);
  assert.match(sql, /create or replace function public\.notify_event_created\(target_event_id uuid\)/i);
  assert.match(sql, /create or replace function public\.notify_event_updated\(target_event_id uuid\)/i);
  assert.match(sql, /create or replace function public\.notify_announcement_published\([\s\S]*target_announcement_id uuid/i);
  assert.match(sql, /membership\.status in \('active','break','break_1','break_2'\)/i);
  assert.match(sql, /revoke execute on function public\.notify_event_created\(uuid\) from public, anon, authenticated/i);
  assert.match(sql, /create trigger event_in_app_notification_trigger[\s\S]*execute function public\.handle_event_notification\(\)/i);
  assert.match(sql, /create trigger announcement_in_app_notification_trigger[\s\S]*execute function public\.handle_announcement_notification\(\)/i);
});

test("automated Break processors rely on the status trigger for one audit row", () => {
  const sql = migration("035_deduplicate_automated_break_history.sql");

  assert.match(sql, /membership_status_change[\s\S]*missing or disabled/i);
  assert.match(sql, /create or replace function public\.apply_due_membership_breaks\(/i);
  assert.match(sql, /create or replace function public\.process_monthly_membership_breaks\(/i);
  assert.match(sql, /process Break 2 first[\s\S]*status = 'inactive'[\s\S]*status = 'break_2'/i);
  assert.match(sql, /membership_status_change is the sole history writer/gi);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.membership_status_history/i);
  assert.match(sql, /revoke execute on function public\.apply_due_membership_breaks\(date\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /revoke execute on function public\.process_monthly_membership_breaks\(date\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.apply_due_membership_breaks\(date\)[\s\S]*to service_role/i);
  assert.match(sql, /grant execute on function public\.process_monthly_membership_breaks\(date\)[\s\S]*to service_role/i);
});

test("registration restores one profile and one email-verification Auth trigger", () => {
  const sql = migration("036_restore_auth_registration_triggers.sql");

  assert.match(sql, /to_regclass\('auth\.users'\)/i);
  assert.match(sql, /tgfoid\s*=\s*'public\.handle_new_user\(\)'::regprocedure/i);
  assert.match(sql, /tgfoid\s*=\s*'public\.handle_email_verified\(\)'::regprocedure/i);
  assert.match(sql, /create trigger jwg_profile_on_auth_user_created[\s\S]*after insert on auth\.users/i);
  assert.match(sql, /create trigger jwg_class_request_on_email_verified[\s\S]*after update of email_confirmed_at on auth\.users/i);
  assert.match(sql, /exactly one enabled signup profile trigger is required/i);
  assert.match(sql, /exactly one enabled email verification trigger is required/i);
  assert.match(sql, /revoke execute on function public\.handle_new_user\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /revoke execute on function public\.handle_email_verified\(\)[\s\S]*from public, anon, authenticated/i);
});

test("database verifier rejects dangerous relation and server-worker grants", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "scripts", "verify-database-security.sql"),
    "utf8"
  );

  assert.match(sql, /array\['011','012','013','014','015','016','017','018','040','041','042','043','044','045','046','047'\]/i);
  assert.match(sql, /to_regprocedure\('public\.is_active_app_user\(uuid\)'\)/i);
  assert.match(sql, /to_regprocedure\('public\.enforce_active_account_request\(\)'\)/i);
  assert.match(sql, /routine\.prosecdef[\s\S]*routine\.proconfig @> array\['search_path=public, pg_temp'\]/i);
  assert.match(sql, /has_function_privilege\([\s\S]*?'anon'[\s\S]*?'public\.is_active_app_user\(uuid\)'[\s\S]*?'EXECUTE'/i);
  assert.match(sql, /has_function_privilege\([\s\S]*?'authenticated'[\s\S]*?'public\.enforce_active_account_request\(\)'[\s\S]*?'EXECUTE'/i);
  assert.match(sql, /pgrst\.db_pre_request=public\.enforce_active_account_request/i);
  assert.match(sql, /membership_training_session_audit/i);
  assert.match(sql, /public\.get_my_last_training_sessions\(\)/i);
  assert.match(sql, /public\.mark_membership_trained_today\(uuid\)/i);
  assert.match(sql, /public\.set_membership_last_training_session\(uuid,date\)/i);
  assert.match(sql, /privilege\.privilege_type in \('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'\)/i);
  assert.match(sql, /acldefault\('S', sequence_data\.relowner\)/i);
  for (const signature of [
    "public.claim_next_email()",
    "public.mark_email_failed(uuid,text)",
    "public.mark_email_sent(uuid,text)",
    "public.mark_password_changed(uuid)",
    "public.mark_password_reset_applied(uuid)",
    "public.process_memorial_anniversaries(date)",
    "public.publish_memorial_announcement(uuid,text,date,text,text,uuid)",
    "public.queue_email(text,text,text,jsonb,uuid,text,uuid,text)",
    "public.verify_prepared_assessment_certificate(uuid)",
  ]) {
    assert.ok(sql.includes(`'${signature}'`));
  }
  assert.match(sql, /Unsafe postgres\/supabase_admin global or public-schema defaults remain/);
});

function sqlFilesRecursive(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sqlFilesRecursive(item));
    } else if (/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) {
      files.push(item);
    }
  }
  return files;
}

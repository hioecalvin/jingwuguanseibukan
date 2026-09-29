import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import { readRotationConfiguration } from './security-test-account-rotation.mjs';
import { PROTECTED_STAGING_ENV_FILE, STAGING_PROJECT_REF } from './staging-browser-target.mjs';
import {
  STAGING_LAST_TRAINING_CONFIRMATION,
  lastTrainingFixture,
  stagingLastTrainingEnvironment,
  validateStagingLastTrainingInvocation,
} from './staging-last-training-target.mjs';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
if (argv.length !== 1 || argv[0] !== STAGING_LAST_TRAINING_CONFIRMATION) {
  throw new Error(`Run only with the exact ${STAGING_LAST_TRAINING_CONFIRMATION} confirmation flag.`);
}

const protectedFile = process.env.JINGWUGUAN_STAGING_ENV_FILE?.trim() || PROTECTED_STAGING_ENV_FILE;
const pgModuleDirectory = process.env.JINGWUGUAN_PG_MODULE_DIR?.trim() || '';
if (!isAbsolute(protectedFile) || !existsSync(protectedFile)) {
  throw new Error('The protected staging environment file is missing or is not an absolute path.');
}
if (!isAbsolute(pgModuleDirectory)) {
  throw new Error('JINGWUGUAN_PG_MODULE_DIR must be an absolute audited pg runtime directory.');
}
const pgEntry = join(pgModuleDirectory, 'pg', 'lib', 'index.js');
if (!existsSync(pgEntry)) throw new Error('The audited pg runtime is missing pg/lib/index.js.');

for (const name of [
  'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'STAGING_PROJECT_REF', 'STAGING_DB_URL', 'SUPABASE_SECRET_KEY',
  'SECURITY_TEST_MEMBER_EMAIL', 'SECURITY_TEST_MEMBER_PASSWORD',
  'SECURITY_TEST_ADMIN_EMAIL', 'SECURITY_TEST_ADMIN_PASSWORD',
  'SECURITY_TEST_SUPER_EMAIL', 'SECURITY_TEST_SUPER_PASSWORD',
]) delete process.env[name];
try {
  loadEnvFile(protectedFile);
} catch {
  throw new Error('The protected staging environment file could not be loaded.');
}

validateStagingLastTrainingInvocation(argv, process.env);
const rotation = readRotationConfiguration(process.env);
const memberAccount = rotation.accounts.find(({ key }) => key === 'MEMBER');
const adminAccount = rotation.accounts.find(({ key }) => key === 'ADMIN');
if (!memberAccount || !adminAccount) throw new Error('The protected Member/Admin identities are missing.');
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
if (!publishableKey.startsWith('sb_publishable_') && !publishableKey.startsWith('eyJ')) {
  throw new Error('The protected staging publishable key is missing or invalid.');
}

function validatedDatabaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('STAGING_DB_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !/\.pooler\.supabase\.com$/i.test(parsed.hostname) ||
      !parsed.hostname.includes('ap-southeast-2') ||
      decodeURIComponent(parsed.username) !== `postgres.${STAGING_PROJECT_REF}` ||
      !parsed.password || parsed.pathname !== '/postgres') {
    throw new Error('STAGING_DB_URL is not pinned to the approved Sydney staging pooler target.');
  }
  return parsed.toString();
}

const databaseUrl = validatedDatabaseUrl(process.env.STAGING_DB_URL?.trim() || '');
const pgModule = await import(pathToFileURL(pgEntry).href);
const PgClient = pgModule.Client ?? pgModule.default?.Client;
if (typeof PgClient !== 'function') throw new Error('The audited pg runtime does not expose Client.');
const service = createClient(rotation.url, rotation.secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, current]) => [key, stableValue(current)]));
  }
  return value;
}

async function authUserId(account, label) {
  const matches = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to resolve staging ${label}.`);
    matches.push(...data.users.filter(({ email }) => email?.toLowerCase() === account.email));
    if (data.users.length < perPage) break;
  }
  if (matches.length !== 1) throw new Error(`Staging ${label} is not unique.`);
  return matches[0].id;
}

async function validateIdentities() {
  const [memberUserId, adminUserId] = await Promise.all([
    authUserId(memberAccount, 'Member 0101'),
    authUserId(adminAccount, 'Admin 0002'),
  ]);
  const { data: profiles, error } = await service
    .from('profiles')
    .select('id,registration_number,account_status,date_of_passing,is_super_admin')
    .in('id', [memberUserId, adminUserId]);
  if (error || profiles?.length !== 2) throw new Error('Unable to validate the two staging profiles.');
  const member = profiles.find(({ id }) => id === memberUserId);
  const admin = profiles.find(({ id }) => id === adminUserId);
  if (!member || member.registration_number !== '0101' || member.account_status !== 'active' ||
      member.date_of_passing != null || member.is_super_admin === true ||
      !admin || admin.registration_number !== '0002' || admin.account_status !== 'active' ||
      admin.date_of_passing != null || admin.is_super_admin === true) {
    throw new Error('The staging Member/Admin profiles do not match the approved identities.');
  }
  const { count, error: assignmentError } = await service
    .from('dojo_admin_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', adminUserId)
    .eq('active', true);
  if (assignmentError || !count) throw new Error('Admin 0002 has no active staging dojo assignment.');
  return { memberUserId, adminUserId };
}

async function adminVisibleMembership(memberUserId) {
  const browserClient = createClient(rotation.url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await browserClient.auth.signInWithPassword({
    email: adminAccount.email,
    password: adminAccount.password,
  });
  if (signInError) throw new Error('Unable to authenticate Admin 0002 for last-training preflight.');
  try {
    const { data, error } = await browserClient
      .from('admin_visible_members')
      .select('membership_id,user_id,registration_number,membership_status,joined_date,date_of_passing')
      .eq('user_id', memberUserId)
      .eq('registration_number', '0101')
      .eq('membership_status', 'active');
    if (error || data?.length !== 1 || data[0].date_of_passing != null) {
      throw new Error('Member 0101 does not resolve to exactly one active Admin 0002-visible membership.');
    }
    return data[0];
  } finally {
    await browserClient.auth.signOut({ scope: 'local' });
  }
}

async function auditRows(membershipId) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await service
      .from('membership_training_session_audit')
      .select('*')
      .eq('membership_id', membershipId)
      .order('recorded_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error('Unable to capture the complete last-training audit history.');
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return stableValue(rows);
}

async function captureMembership(membershipId) {
  const { data, error } = await service
    .from('class_memberships')
    .select('*')
    .eq('id', membershipId)
    .single();
  if (error || !data) throw new Error('Unable to capture the target membership.');
  return stableValue(data);
}

function isoDaysBefore(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function businessToday() {
  const database = new PgClient({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'jwg-guarded-last-training-preflight',
  });
  await database.connect();
  try {
    const result = await database.query(
      "select to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD') as business_today",
    );
    return result.rows[0].business_today;
  } finally {
    await database.end();
  }
}

function chooseCorrectionDate(today, joinedDate, baselineDate) {
  for (let days = 1; days <= 30; days += 1) {
    const candidate = isoDaysBefore(today, days);
    if (candidate !== baselineDate && (!joinedDate || candidate >= joinedDate)) return candidate;
  }
  throw new Error('No safe past correction date is available for Member 0101.');
}

function readState(stateFile) {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    throw new Error('The last-training browser state artifact is invalid.');
  }
}

function assertNewAuditRows(rows, baselineDate, fixture, adminUserId) {
  if (rows.length < 1 || rows.length > 2 || rows.some(row =>
    row.membership_id !== fixture.membershipId || row.recorded_by !== adminUserId
  )) throw new Error('Last-training cleanup refused because the new audit set is not exact.');
  const correction = rows.find(row =>
    row.previous_training_date === baselineDate && row.new_training_date === fixture.correctionDate
  );
  if (!correction) throw new Error('The exact correction audit row is missing.');
  if (rows.length === 2 && !rows.find(row =>
    row.previous_training_date === fixture.correctionDate &&
    row.new_training_date === fixture.businessToday
  )) throw new Error('The exact trained-today audit row is missing.');
  return rows.length === 2 ? 'today' : 'corrected';
}

async function cleanupAndVerify({ baselineMembership, baselineAudit, fixture, adminUserId, stateFile }) {
  const currentMembership = await captureMembership(fixture.membershipId);
  const currentAudit = await auditRows(fixture.membershipId);
  const baselineIds = new Set(baselineAudit.map(row => row.id));
  const retainedBaseline = currentAudit.filter(row => baselineIds.has(row.id));
  if (!isDeepStrictEqual(retainedBaseline, baselineAudit)) {
    throw new Error('The pre-existing last-training audit history changed during the guarded run.');
  }
  const newRows = currentAudit.filter(row => !baselineIds.has(row.id));
  if (newRows.length === 0) {
    if (!isDeepStrictEqual(currentMembership, baselineMembership) ||
        !isDeepStrictEqual(currentAudit, baselineAudit)) {
      throw new Error('Member 0101 changed without the exact last-training audit rows.');
    }
    return;
  }
  const phase = assertNewAuditRows(
    newRows,
    baselineMembership.last_training_session_date,
    fixture,
    adminUserId,
  );
  const expectedDate = phase === 'today' ? fixture.businessToday : fixture.correctionDate;
  const expectedMembership = { ...baselineMembership, last_training_session_date: expectedDate };
  if (!isDeepStrictEqual(currentMembership, expectedMembership)) {
    throw new Error('Last-training cleanup refused because another membership field changed.');
  }
  const browserState = readState(stateFile);
  if (browserState && (browserState.membershipId !== fixture.membershipId || browserState.phase !== phase)) {
    throw new Error('Last-training cleanup refused because browser state does not match database state.');
  }

  const database = new PgClient({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'jwg-guarded-last-training-cleanup',
  });
  await database.connect();
  try {
    await database.query('begin');
    const locked = await database.query(
      'select last_training_session_date::text as training_date from public.class_memberships where id = $1 for update',
      [fixture.membershipId],
    );
    if (locked.rowCount !== 1 || locked.rows[0].training_date !== expectedDate) {
      throw new Error('Database-owner cleanup refused because the training date changed.');
    }
    const auditIds = newRows.map(row => row.id);
    const lockedAudit = await database.query(
      'select id::text from public.membership_training_session_audit where id = any($1::uuid[]) for update',
      [auditIds],
    );
    if (lockedAudit.rowCount !== auditIds.length) {
      throw new Error('Database-owner cleanup could not lock every exact audit UUID.');
    }
    const deletedAudit = await database.query(
      'delete from public.membership_training_session_audit where id = any($1::uuid[]) and membership_id = $2 and recorded_by = $3 returning id::text',
      [auditIds, fixture.membershipId, adminUserId],
    );
    if (deletedAudit.rowCount !== auditIds.length) {
      throw new Error('Database-owner cleanup did not delete the exact audit UUID set.');
    }
    const restored = await database.query(
      'update public.class_memberships set last_training_session_date = $1::date where id = $2 and last_training_session_date is not distinct from $3::date returning id::text',
      [baselineMembership.last_training_session_date, fixture.membershipId, expectedDate],
    );
    if (restored.rowCount !== 1) {
      throw new Error('Database-owner cleanup did not restore the exact membership date.');
    }
    await database.query('commit');
  } catch (error) {
    await database.query('rollback');
    throw error;
  } finally {
    await database.end();
  }

  const finalMembership = await captureMembership(fixture.membershipId);
  const finalAudit = await auditRows(fixture.membershipId);
  if (!isDeepStrictEqual(finalMembership, baselineMembership) ||
      !isDeepStrictEqual(finalAudit, baselineAudit)) {
    throw new Error('Last-training zero-residue verification failed after cleanup.');
  }
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'jwg-staging-last-training-'));
const resolvedOutput = resolve(outputDirectory);
const resolvedTemp = resolve(tmpdir());
if (!resolvedOutput.startsWith(`${resolvedTemp}${sep}`) ||
    !basename(resolvedOutput).startsWith('jwg-staging-last-training-')) {
  throw new Error('Refusing to use a last-training artifact directory outside the OS temporary directory.');
}
const stateFile = join(outputDirectory, 'last-training-state.json');

let childCode = 1;
let interrupted = false;
let cleanupContext;
try {
  const { memberUserId, adminUserId } = await validateIdentities();
  const visibleMembership = await adminVisibleMembership(memberUserId);
  const baselineMembership = await captureMembership(visibleMembership.membership_id);
  const baselineAudit = await auditRows(visibleMembership.membership_id);
  const today = await businessToday();
  if (baselineMembership.last_training_session_date &&
      baselineMembership.last_training_session_date > today) {
    throw new Error('Member 0101 has a future last-training baseline; refusing the guarded mutation.');
  }
  const correctionDate = chooseCorrectionDate(
    today,
    baselineMembership.joined_date,
    baselineMembership.last_training_session_date,
  );
  const fixture = lastTrainingFixture({
    membershipId: visibleMembership.membership_id,
    correctionDate,
    businessToday: today,
  });
  cleanupContext = { baselineMembership, baselineAudit, fixture, adminUserId, stateFile };
  const environment = stagingLastTrainingEnvironment(process.env, fixture);
  environment.STAGING_BROWSER_OUTPUT_DIR = outputDirectory;
  environment.STAGING_LAST_TRAINING_STATE_FILE = stateFile;

  const child = spawn(process.execPath, [
    require.resolve('@playwright/test/cli'),
    'test', 'tests/staging-browser/last-training.spec.ts',
    '--config=playwright.staging.last-training.config.ts',
  ], { cwd: process.cwd(), env: environment, stdio: 'inherit', windowsHide: true });
  let forceTimer;
  const stopChild = () => {
    interrupted = true;
    child.kill('SIGTERM');
    forceTimer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    forceTimer.unref();
  };
  process.once('SIGINT', stopChild);
  process.once('SIGTERM', stopChild);
  try {
    childCode = await new Promise((resolveExit, reject) => {
      child.once('error', () => reject(new Error('Unable to start the guarded last-training suite.')));
      child.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
    });
  } finally {
    process.removeListener('SIGINT', stopChild);
    process.removeListener('SIGTERM', stopChild);
    if (forceTimer) clearTimeout(forceTimer);
  }
} finally {
  try {
    if (cleanupContext) await cleanupAndVerify(cleanupContext);
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (interrupted || childCode !== 0) process.exitCode = 1;
else {
  console.log(
    'PASS: Member 0101 membership and complete last-training audit history match their exact baselines. ' +
    'Expected Auth sign-in/session metadata is outside this zero-residue guarantee.',
  );
}

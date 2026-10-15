import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import { readRotationConfiguration } from './security-test-account-rotation.mjs';
import { PROTECTED_STAGING_ENV_FILE, STAGING_PROJECT_REF } from './staging-browser-target.mjs';
import {
  STAGING_REGULAR_SCHEDULE_CONFIRMATION,
  regularScheduleFixture,
  stagingRegularScheduleEnvironment,
  validateStagingRegularScheduleInvocation,
} from './staging-regular-schedule-target.mjs';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
if (argv.length !== 1 || argv[0] !== STAGING_REGULAR_SCHEDULE_CONFIRMATION) {
  throw new Error(`Run only with the exact ${STAGING_REGULAR_SCHEDULE_CONFIRMATION} confirmation flag.`);
}

const protectedFile = process.env.JINGWUGUAN_STAGING_ENV_FILE?.trim() || PROTECTED_STAGING_ENV_FILE;
const pgModuleDirectory = process.env.JINGWUGUAN_PG_MODULE_DIR?.trim() || '';
if (!isAbsolute(protectedFile) || !existsSync(protectedFile)) {
  throw new Error('The protected staging environment file is missing or is not an absolute path.');
}
if (!isAbsolute(pgModuleDirectory)) {
  throw new Error('JINGWUGUAN_PG_MODULE_DIR must be an absolute directory containing the audited pg runtime.');
}
const pgEntry = join(pgModuleDirectory, 'pg', 'lib', 'index.js');
if (!existsSync(pgEntry)) {
  throw new Error('The audited pg runtime is missing pg/lib/index.js.');
}

for (const name of [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'STAGING_PROJECT_REF',
  'STAGING_DB_URL',
  'SUPABASE_SECRET_KEY',
  'SECURITY_TEST_MEMBER_EMAIL',
  'SECURITY_TEST_MEMBER_PASSWORD',
  'SECURITY_TEST_ADMIN_EMAIL',
  'SECURITY_TEST_ADMIN_PASSWORD',
  'SECURITY_TEST_SUPER_EMAIL',
  'SECURITY_TEST_SUPER_PASSWORD',
]) delete process.env[name];
try {
  loadEnvFile(protectedFile);
} catch {
  throw new Error('The protected staging environment file could not be loaded.');
}

validateStagingRegularScheduleInvocation(argv, process.env);
const rotation = readRotationConfiguration(process.env);
const adminAccount = rotation.accounts.find(({ key }) => key === 'ADMIN');
if (!adminAccount) throw new Error('The protected scoped Admin test identity is missing.');
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
  const expectedUser = `postgres.${STAGING_PROJECT_REF}`;
  const safeHost = /\.pooler\.supabase\.com$/i.test(parsed.hostname) &&
    parsed.hostname.includes('ap-southeast-2');
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !safeHost ||
      decodeURIComponent(parsed.username) !== expectedUser || !parsed.password ||
      parsed.pathname !== '/postgres') {
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

async function findAdminUserId() {
  const matches = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('Unable to resolve the staging scoped Admin test identity.');
    matches.push(...data.users.filter(({ email }) => email?.toLowerCase() === adminAccount.email));
    if (data.users.length < perPage) break;
  }
  if (matches.length !== 1) throw new Error('The staging scoped Admin test identity is not unique.');
  const userId = matches[0].id;
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id,registration_number,account_status,date_of_passing,is_super_admin')
    .eq('id', userId)
    .single();
  if (profileError || !profile || profile.registration_number !== '0002' ||
      profile.account_status !== 'active' || profile.date_of_passing != null ||
      profile.is_super_admin === true) {
    throw new Error('The scoped Admin profile does not match approved staging Admin 0002.');
  }
  const { count, error: assignmentError } = await service
    .from('dojo_admin_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true);
  if (assignmentError || !count) {
    throw new Error('Admin 0002 has no active staging dojo assignment.');
  }
  return userId;
}

async function manageableScopes() {
  const browserClient = createClient(rotation.url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await browserClient.auth.signInWithPassword({
    email: adminAccount.email,
    password: adminAccount.password,
  });
  if (signInError) throw new Error('Unable to authenticate staging Admin 0002 for scope preflight.');
  try {
    const { data, error } = await browserClient.rpc('get_manageable_schedule_scopes');
    if (error) throw new Error('Unable to load Admin 0002 schedule scopes.');
    return data ?? [];
  } finally {
    await browserClient.auth.signOut({ scope: 'local' });
  }
}

async function markerRows() {
  const { data, error } = await service
    .from('regular_class_schedules')
    .select('*')
    .like('venue', 'JWG-STAGING-SCHEDULE-%');
  if (error) throw new Error('Unable to inventory staging regular-schedule fixtures.');
  return data ?? [];
}

async function chooseFixture(scope) {
  const { data, error } = await service
    .from('regular_class_schedules')
    .select('day_of_week,start_time,finish_time')
    .eq('dojo_id', scope.dojo_id);
  if (error) throw new Error('Unable to inventory existing regular schedules for the selected scope.');
  const used = new Set((data ?? []).map(row =>
    `${row.day_of_week}|${String(row.start_time).slice(0, 5)}|${String(row.finish_time).slice(0, 5)}`,
  ));
  const candidates = [
    [6, '22:15', '22:45'], [6, '21:35', '22:05'], [0, '22:10', '22:40'],
    [0, '21:30', '22:00'], [5, '22:20', '22:50'], [5, '21:40', '22:10'],
  ];
  const slot = candidates.find(([day, start, finish]) => !used.has(`${day}|${start}|${finish}`));
  if (!slot) throw new Error('No reserved collision-free staging schedule slot is available.');
  return regularScheduleFixture({
    marker: `JWG-STAGING-SCHEDULE-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(6).toString('hex')}`,
    dojoId: scope.dojo_id,
    dayOfWeek: slot[0],
    startTime: slot[1],
    finishTime: slot[2],
  });
}

function readState(stateFile) {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    throw new Error('The regular-schedule browser state artifact is invalid.');
  }
}

function exactFixtureState(row, fixture, adminUserId) {
  const base = row.dojo_id === fixture.dojoId && row.day_of_week === fixture.dayOfWeek &&
    String(row.start_time).slice(0, 5) === fixture.startTime &&
    String(row.finish_time).slice(0, 5) === fixture.finishTime &&
    row.instructor_id == null && row.notes === fixture.notes &&
    row.created_by === adminUserId && row.updated_by === adminUserId;
  if (!base) return null;
  if (row.venue === fixture.initialVenue && row.is_active === true) return 'created';
  if (row.venue === fixture.updatedVenue && row.is_active === false) return 'updated';
  return null;
}

async function cleanupAndVerify(fixture, adminUserId, stateFile) {
  const matching = (await markerRows()).filter(row =>
    row.venue === fixture.initialVenue || row.venue === fixture.updatedVenue,
  );
  if (matching.length > 1) {
    throw new Error(`Ambiguous regular-schedule cleanup for ${fixture.marker}; manual staging review is required.`);
  }
  if (matching.length === 1) {
    const row = matching[0];
    const state = readState(stateFile);
    if (state && (state.createdId !== row.id || state.dojoId !== fixture.dojoId ||
        state.marker !== fixture.marker)) {
      throw new Error('Regular-schedule cleanup refused because the browser artifact does not match the row.');
    }
    const phase = exactFixtureState(row, fixture, adminUserId);
    if (!phase) {
      throw new Error(`Regular-schedule cleanup refused for ${row.id}; fields do not match the exact fixture.`);
    }
    const { data: auditRows, error: auditError } = await service
      .from('regular_class_schedule_audit')
      .select('*')
      .eq('schedule_id', row.id)
      .order('recorded_at', { ascending: true })
      .order('id', { ascending: true });
    if (auditError) throw new Error('Unable to validate the regular-schedule audit fixture.');
    const expectedActions = phase === 'updated' ? ['created', 'updated'] : ['created'];
    if (JSON.stringify((auditRows ?? []).map(item => item.action)) !== JSON.stringify(expectedActions) ||
        (auditRows ?? []).some(item => item.actor_user_id !== adminUserId)) {
      throw new Error('Regular-schedule cleanup refused because the audit trail is not the exact fixture.');
    }

    const database = new PgClient({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      application_name: 'jwg-guarded-staging-schedule-cleanup',
    });
    await database.connect();
    try {
      await database.query('begin');
      const locked = await database.query(
        'select * from public.regular_class_schedules where id = $1 for update',
        [row.id],
      );
      if (locked.rowCount !== 1 || !exactFixtureState(locked.rows[0], fixture, adminUserId)) {
        throw new Error('Database-owner cleanup refused because the locked fixture changed.');
      }
      const deletedAudit = await database.query(
        'delete from public.regular_class_schedule_audit where schedule_id = $1 and actor_user_id = $2 returning action',
        [row.id, adminUserId],
      );
      if (deletedAudit.rowCount !== expectedActions.length) {
        throw new Error('Database-owner cleanup did not delete the exact expected audit rows.');
      }
      const deletedSchedule = await database.query(
        'delete from public.regular_class_schedules where id = $1 and created_by = $2 and updated_by = $2 returning id',
        [row.id, adminUserId],
      );
      if (deletedSchedule.rowCount !== 1 || deletedSchedule.rows[0].id !== row.id) {
        throw new Error('Database-owner cleanup did not delete the exact schedule fixture.');
      }
      await database.query('commit');
    } catch (error) {
      await database.query('rollback');
      throw error;
    } finally {
      await database.end();
    }
  }
  if ((await markerRows()).length !== 0) {
    throw new Error('The staging regular-schedule fixture inventory is not empty after cleanup.');
  }
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'jwg-staging-regular-schedule-'));
const resolvedOutput = resolve(outputDirectory);
const resolvedTemp = resolve(tmpdir());
if (!resolvedOutput.startsWith(`${resolvedTemp}${sep}`) ||
    !basename(resolvedOutput).startsWith('jwg-staging-regular-schedule-')) {
  throw new Error('Refusing to use a regular-schedule artifact directory outside the OS temporary directory.');
}
const stateFile = join(outputDirectory, 'regular-schedule-state.json');

let childCode = 1;
let interrupted = false;
let adminUserId;
let fixture;
try {
  const staleRows = await markerRows();
  if (staleRows.length !== 0) {
    throw new Error(`Found ${staleRows.length} stale regular-schedule fixture(s); manual staging review is required before mutation.`);
  }
  adminUserId = await findAdminUserId();
  const scopes = await manageableScopes();
  if (scopes.length === 0 || !scopes[0]?.dojo_id) {
    throw new Error('Admin 0002 has no manageable staging schedule scope.');
  }
  fixture = await chooseFixture(scopes[0]);
  const environment = stagingRegularScheduleEnvironment(process.env, fixture);
  environment.STAGING_BROWSER_OUTPUT_DIR = outputDirectory;
  environment.STAGING_REGULAR_SCHEDULE_STATE_FILE = stateFile;

  const child = spawn(process.execPath, [
    require.resolve('@playwright/test/cli'),
    'test',
    'tests/staging-browser/regular-schedule.spec.ts',
    '--config=playwright.staging.regular-schedule.config.ts',
  ], {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });

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
      child.once('error', () => reject(new Error('Unable to start the guarded staging regular-schedule suite.')));
      child.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
    });
  } finally {
    process.removeListener('SIGINT', stopChild);
    process.removeListener('SIGTERM', stopChild);
    if (forceTimer) clearTimeout(forceTimer);
  }
} finally {
  try {
    if (adminUserId && fixture) {
      await cleanupAndVerify(fixture, adminUserId, stateFile);
    }
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (interrupted || childCode !== 0) process.exitCode = 1;
else {
  console.log(
    'PASS: the exact staging regular-schedule row and its audit rows were removed; reserved marker inventory is empty. ' +
    'Expected Auth sign-in/session metadata is outside this zero-residue guarantee.',
  );
}

import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { readRotationConfiguration } from './security-test-account-rotation.mjs';
import { PROTECTED_STAGING_ENV_FILE } from './staging-browser-target.mjs';
import {
  STAGING_REPOSITORY_DRAFT_CONFIRMATION,
  repositoryDraftFixture,
  stagingRepositoryDraftEnvironment,
  validateStagingRepositoryDraftInvocation,
} from './staging-repository-draft-target.mjs';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);

if (argv.length !== 1 || argv[0] !== STAGING_REPOSITORY_DRAFT_CONFIRMATION) {
  throw new Error(`Run only with the exact ${STAGING_REPOSITORY_DRAFT_CONFIRMATION} confirmation flag.`);
}
const protectedFile = process.env.JINGWUGUAN_STAGING_ENV_FILE?.trim() || PROTECTED_STAGING_ENV_FILE;
if (!isAbsolute(protectedFile) || !existsSync(protectedFile)) {
  throw new Error('The protected staging environment file is missing or is not an absolute path.');
}

for (const name of [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'STAGING_PROJECT_REF',
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

validateStagingRepositoryDraftInvocation(argv, process.env);
const rotation = readRotationConfiguration(process.env);
const superAccount = rotation.accounts.find(({ key }) => key === 'SUPER');
if (!superAccount) throw new Error('The protected Super Admin test identity is missing.');

const marker = `JWG-STAGING-DRAFT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(6).toString('hex')}`;
const fixture = repositoryDraftFixture(marker);
const outputDirectory = mkdtempSync(join(tmpdir(), 'jwg-staging-repository-draft-'));
const resolvedOutput = resolve(outputDirectory);
const resolvedTemp = resolve(tmpdir());
if (!resolvedOutput.startsWith(`${resolvedTemp}${sep}`) || !basename(resolvedOutput).startsWith('jwg-staging-repository-draft-')) {
  throw new Error('Refusing to use a Repository Draft artifact directory outside the OS temporary directory.');
}
const stateFile = join(outputDirectory, 'repository-draft-state.json');
const environment = stagingRepositoryDraftEnvironment(process.env, marker);
environment.STAGING_BROWSER_OUTPUT_DIR = outputDirectory;
environment.STAGING_REPOSITORY_DRAFT_STATE_FILE = stateFile;

const service = createClient(rotation.url, rotation.secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function markerRows() {
  const { data, error } = await service
    .from('content')
    .select('id,class_id,rank_id,sub_rank_id,title,description,video_provider,video_id,status,sort_order,created_by')
    .like('title', 'JWG-STAGING-DRAFT-%');
  if (error) throw new Error('Unable to inventory Repository Draft staging fixtures.');
  return data ?? [];
}

async function uploaderAuditCount() {
  const { count, error } = await service
    .from('repository_uploader_assignment_audit')
    .select('id', { count: 'exact', head: true });
  if (error || count == null) throw new Error('Unable to fingerprint Repository Uploader assignment audit history.');
  return count;
}

async function findSuperUserId() {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('Unable to resolve the staging Super Admin test identity.');
  const matches = data.users.filter(({ email }) => email?.toLowerCase() === superAccount.email);
  if (matches.length !== 1) throw new Error('The staging Super Admin test identity is not unique.');
  return matches[0].id;
}

function readState() {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    throw new Error('The Repository Draft browser state artifact is invalid.');
  }
}

async function cleanupAndVerify(superUserId, auditBaseline) {
  const rows = (await markerRows()).filter(({ title }) =>
    title === fixture.marker || title === fixture.updatedMarker,
  );
  if (rows.length > 1) {
    throw new Error(`Ambiguous Repository Draft cleanup for marker ${marker}; manual staging review is required.`);
  }
  if (rows.length === 1) {
    const row = rows[0];
    const state = readState();
    const initial = row.title === fixture.marker;
    const valid = row.created_by === superUserId && row.status === 'draft' &&
      row.video_provider == null && row.video_id == null &&
      row.description === (initial ? fixture.description : fixture.updatedDescription) &&
      row.sort_order === (initial ? fixture.initialSortOrder : fixture.updatedSortOrder) &&
      (!state || (
        state.createdId === row.id && state.classId === row.class_id &&
        state.rankId === row.rank_id && state.tierId === row.sub_rank_id
      ));
    if (!valid) {
      throw new Error(`Repository Draft cleanup refused for marker ${marker}; the persisted row does not match the exact fixture.`);
    }
    const { count: videoCount, error: videoError } = await service
      .from('repository_video_assets')
      .select('content_id', { count: 'exact', head: true })
      .eq('content_id', row.id);
    if (videoError || videoCount !== 0) {
      throw new Error(`Repository Draft cleanup refused for ${row.id}; unexpected video pipeline residue exists.`);
    }
    const { error: deleteError } = await service.from('content').delete().eq('id', row.id);
    if (deleteError) throw new Error(`Unable to remove the exact Repository Draft fixture ${row.id}.`);
  }
  const remaining = await markerRows();
  if (remaining.length !== 0) {
    throw new Error('Repository Draft staging prefix inventory is not empty after cleanup.');
  }
  if (await uploaderAuditCount() !== auditBaseline) {
    throw new Error('Repository Uploader assignment audit history changed during the Draft test.');
  }
}

let childCode = 1;
let interrupted = false;
let superUserId;
let auditBaseline;
try {
  const staleRows = await markerRows();
  if (staleRows.length !== 0) {
    throw new Error(`Found ${staleRows.length} stale Repository Draft staging fixture(s); manual staging review is required before mutation.`);
  }
  superUserId = await findSuperUserId();
  auditBaseline = await uploaderAuditCount();

  const child = spawn(process.execPath, [
    require.resolve('@playwright/test/cli'),
    'test',
    'tests/staging-browser/repository-draft.spec.ts',
    '--config=playwright.staging.repository-draft.config.ts',
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
      child.once('error', () => reject(new Error('Unable to start the guarded staging Repository Draft suite.')));
      child.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
    });
  } finally {
    process.removeListener('SIGINT', stopChild);
    process.removeListener('SIGTERM', stopChild);
    if (forceTimer) clearTimeout(forceTimer);
  }
} finally {
  try {
    if (superUserId && auditBaseline != null) {
      await cleanupAndVerify(superUserId, auditBaseline);
    }
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (interrupted || childCode !== 0) process.exitCode = 1;

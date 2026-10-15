import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import { readRotationConfiguration } from './security-test-account-rotation.mjs';
import { PROTECTED_STAGING_ENV_FILE } from './staging-browser-target.mjs';
import {
  STAGING_CONTACT_NOOP_CONFIRMATION,
  canonicalContactBaseline,
  stagingContactNoopEnvironment,
  validateStagingContactNoopInvocation,
} from './staging-contact-noop-target.mjs';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);

if (argv.length !== 1 || argv[0] !== STAGING_CONTACT_NOOP_CONFIRMATION) {
  throw new Error(`Run only with the exact ${STAGING_CONTACT_NOOP_CONFIRMATION} confirmation flag.`);
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

validateStagingContactNoopInvocation(argv, process.env);
const rotation = readRotationConfiguration(process.env);
const memberAccount = rotation.accounts.find(({ key }) => key === 'MEMBER');
if (!memberAccount) throw new Error('The protected Member test identity is missing.');

const service = createClient(rotation.url, rotation.secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
        .map(([key, current]) => [key, stableValue(current)]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

async function findMemberUserId() {
  const matches = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('Unable to resolve the staging Member test identity.');
    matches.push(...data.users.filter(({ email }) => email?.toLowerCase() === memberAccount.email));
    if (data.users.length < perPage) break;
  }
  if (matches.length !== 1) throw new Error('The staging Member test identity is not unique.');
  return matches[0].id;
}

async function completeAuditRows(profileId) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await service
      .from('profile_contact_change_audit')
      .select('*')
      .eq('profile_id', profileId)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error('Unable to fingerprint the complete Member contact audit history.');
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function captureMemberState(profileId) {
  const { data: profile, error } = await service
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error || !profile) throw new Error('Unable to capture the staging Member profile.');
  if (profile.registration_number !== '0101' ||
      profile.email?.toLowerCase() !== memberAccount.email ||
      profile.account_status !== 'active' || profile.date_of_passing != null ||
      profile.is_super_admin === true) {
    throw new Error('The staging Member profile does not match the approved active test identity.');
  }
  const { data: adminAssignments, error: adminAssignmentError } = await service
    .from('dojo_admin_assignments')
    .select('id')
    .eq('user_id', profileId)
    .eq('active', true)
    .limit(1);
  if (adminAssignmentError) {
    throw new Error('Unable to verify the staging Member role boundary.');
  }
  if ((adminAssignments ?? []).length !== 0) {
    throw new Error('The staging Member test identity unexpectedly has an active Admin assignment.');
  }
  const baseline = canonicalContactBaseline(profile.phone, profile.instagram_username);
  const auditRows = await completeAuditRows(profileId);
  return {
    profile: stableValue(profile),
    profileFingerprint: fingerprint(profile),
    auditCount: auditRows.length,
    auditFingerprint: fingerprint(auditRows),
    baseline,
  };
}

function assertUnchanged(before, after) {
  if (before.profileFingerprint !== after.profileFingerprint ||
      !isDeepStrictEqual(before.profile, after.profile)) {
    throw new Error('The Member profile changed during the contact no-op test.');
  }
  if (before.auditCount !== after.auditCount ||
      before.auditFingerprint !== after.auditFingerprint) {
    throw new Error('The Member contact audit history changed during the no-op test.');
  }
}

const outputDirectory = mkdtempSync(join(tmpdir(), 'jwg-staging-contact-noop-'));
const resolvedOutput = resolve(outputDirectory);
const resolvedTemp = resolve(tmpdir());
if (!resolvedOutput.startsWith(`${resolvedTemp}${sep}`) ||
    !basename(resolvedOutput).startsWith('jwg-staging-contact-noop-')) {
  throw new Error('Refusing to use a contact no-op artifact directory outside the OS temporary directory.');
}

let childCode = 1;
let interrupted = false;
let memberUserId;
let baselineState;
try {
  memberUserId = await findMemberUserId();
  baselineState = await captureMemberState(memberUserId);
  const environment = stagingContactNoopEnvironment(process.env, baselineState.baseline);
  environment.STAGING_BROWSER_OUTPUT_DIR = outputDirectory;

  const child = spawn(process.execPath, [
    require.resolve('@playwright/test/cli'),
    'test',
    'tests/staging-browser/contact-noop.spec.ts',
    '--config=playwright.staging.contact-noop.config.ts',
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
      child.once('error', () => reject(new Error('Unable to start the guarded staging contact no-op suite.')));
      child.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
    });
  } finally {
    process.removeListener('SIGINT', stopChild);
    process.removeListener('SIGTERM', stopChild);
    if (forceTimer) clearTimeout(forceTimer);
  }
} finally {
  try {
    if (memberUserId && baselineState) {
      const finalState = await captureMemberState(memberUserId);
      assertUnchanged(baselineState, finalState);
    }
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (interrupted || childCode !== 0) process.exitCode = 1;
else {
  console.log(
    'PASS: Member contact/profile state and contact audit history are unchanged. ' +
    'The expected staging Auth sign-in/session metadata is outside this no-op guarantee.',
  );
}

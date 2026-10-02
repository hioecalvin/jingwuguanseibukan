/**
 * Audits or deletes only accounts bearing both seed markers. Audit is the
 * default. Deletion requires the token printed by a separate audit run.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import {
  classifyDummyUsers,
  cleanupConfirmationToken,
  validateCleanupTarget,
} from './dummy-account-cleanup.mjs';

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function listAllUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to list Auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function main() {
  loadDotEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const environment = option('environment');
  const expectedProjectRef = option('expected-project-ref');
  const deletionRequested = process.argv.includes('--delete');

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and a server-only Supabase secret key are required.');
  }
  const projectRef = validateCleanupTarget({ url, environment, expectedProjectRef });
  if (deletionRequested && environment === 'production' && !process.argv.includes('--allow-production')) {
    throw new Error('Production deletion requires --allow-production and separate operator approval.');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { candidates, suspicious } = classifyDummyUsers(await listAllUsers(supabase));

  console.log(`Target: ${environment} ${projectRef}`);
  console.log(`Verified dummy candidates: ${candidates.length}`);
  console.log(`Suspicious domain-only accounts: ${suspicious.length}`);
  if (suspicious.length > 0) {
    throw new Error('Domain-matching accounts without the dummy_account marker require manual review.');
  }

  const token = cleanupConfirmationToken(projectRef, candidates);
  if (!deletionRequested) {
    console.log(`Audit only. Re-run with --delete --confirmation-token=${token} after review.`);
    return;
  }
  if (option('confirmation-token') !== token) {
    throw new Error('Deletion confirmation token is missing or does not match the current candidate set.');
  }

  for (const user of candidates) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Failed to delete a verified dummy account: ${error.message}`);
  }

  const remaining = classifyDummyUsers(await listAllUsers(supabase));
  if (remaining.candidates.length !== 0 || remaining.suspicious.length !== 0) {
    throw new Error('Post-deletion verification found remaining marked accounts.');
  }
  console.log(`Deleted and independently verified ${candidates.length} dummy account(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Dummy-account cleanup failed.');
  process.exitCode = 1;
});

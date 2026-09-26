import { createHash } from 'node:crypto';

export const DUMMY_EMAIL_DOMAIN = 'dummy.jingwuguan.test';
export const KNOWN_PRODUCTION_PROJECT_REF = 'pkmllhaavadhaozmwapz';

export function projectRefFromUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Supabase URL is invalid.');
  }

  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
  if (url.protocol !== 'https:' || !match || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Supabase URL must be an exact hosted project origin.');
  }
  return match[1].toLowerCase();
}

export function validateCleanupTarget({ url, environment, expectedProjectRef }) {
  if (!['staging', 'production'].includes(environment)) {
    throw new Error('Environment must be staging or production.');
  }
  if (!/^[a-z0-9]+$/i.test(expectedProjectRef ?? '')) {
    throw new Error('An exact expected project ref is required.');
  }
  const projectRef = projectRefFromUrl(url);
  if (projectRef !== expectedProjectRef.toLowerCase()) {
    throw new Error('Supabase URL does not match the expected project ref.');
  }
  if (projectRef === KNOWN_PRODUCTION_PROJECT_REF && environment !== 'production') {
    throw new Error('The known production project cannot be declared staging.');
  }
  if (environment === 'production' && projectRef !== KNOWN_PRODUCTION_PROJECT_REF) {
    throw new Error('Production cleanup is limited to the recorded production project.');
  }
  return projectRef;
}

export function classifyDummyUsers(users) {
  const candidates = [];
  const suspicious = [];
  for (const user of users) {
    const markedDomain = user.email?.toLowerCase().endsWith(`@${DUMMY_EMAIL_DOMAIN}`);
    if (!markedDomain) continue;
    if (user.user_metadata?.dummy_account === true) candidates.push(user);
    else suspicious.push(user);
  }
  return { candidates, suspicious };
}

export function cleanupConfirmationToken(projectRef, users) {
  const userIds = users.map((user) => user.id).sort();
  return createHash('sha256')
    .update(['dummy-cleanup-v1', projectRef, ...userIds].join('\n'))
    .digest('hex').slice(0, 20).toUpperCase();
}

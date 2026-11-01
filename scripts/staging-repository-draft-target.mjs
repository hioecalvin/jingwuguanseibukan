import {
  STAGING_APP_ORIGIN,
  STAGING_BROWSER_CONFIRMATION,
  STAGING_PROJECT_REF,
  STAGING_SUPABASE_ORIGIN,
  classifyStagingBrowserRequest,
  stagingBrowserEnvironment,
  validateStagingBrowserInvocation,
} from './staging-browser-target.mjs';

export const STAGING_REPOSITORY_DRAFT_CONFIRMATION = '--confirm-staging-repository-draft';
export const STAGING_REPOSITORY_DRAFT_MODE = 'deployed-staging-repository-draft';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MUTATION_RPCS = new Set([
  'create_repository_content',
  'delete_repository_content',
  'update_repository_content',
]);

function value(environment, name) {
  return typeof environment[name] === 'string' ? environment[name].trim() : '';
}

function deny(reason) {
  return { allowed: false, reason };
}

function exactKeys(body, names) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return JSON.stringify(Object.keys(body).sort()) === JSON.stringify([...names].sort());
}

export function repositoryDraftFixture(marker) {
  if (!/^JWG-STAGING-DRAFT-[A-Za-z0-9-]{12,}$/.test(marker ?? '')) {
    throw new Error('A unique staging Repository Draft marker is required.');
  }
  return Object.freeze({
    marker,
    updatedMarker: `${marker}-UPDATED`,
    description: `Guarded staging Repository Draft acceptance fixture: ${marker}.`,
    updatedDescription: `Updated guarded staging Repository Draft acceptance fixture: ${marker}.`,
    initialSortOrder: 997,
    updatedSortOrder: 998,
  });
}

export function validateStagingRepositoryDraftInvocation(argv, environment) {
  if (argv.length !== 1 || argv[0] !== STAGING_REPOSITORY_DRAFT_CONFIRMATION) {
    throw new Error(`Run only with the exact ${STAGING_REPOSITORY_DRAFT_CONFIRMATION} confirmation flag.`);
  }
  validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment);
  return { appOrigin: STAGING_APP_ORIGIN, supabaseOrigin: STAGING_SUPABASE_ORIGIN };
}

export function stagingRepositoryDraftEnvironment(environment, marker) {
  validateStagingRepositoryDraftInvocation([STAGING_REPOSITORY_DRAFT_CONFIRMATION], environment);
  repositoryDraftFixture(marker);
  return {
    ...stagingBrowserEnvironment(environment),
    STAGING_BROWSER_MODE: STAGING_REPOSITORY_DRAFT_MODE,
    STAGING_REPOSITORY_DRAFT_MARKER: marker,
  };
}

export function assertStagingRepositoryDraftRuntime(environment = process.env) {
  if (value(environment, 'STAGING_BROWSER_MODE') !== STAGING_REPOSITORY_DRAFT_MODE) {
    throw new Error('Refusing a direct or unconfirmed staging Repository Draft run.');
  }
  validateStagingRepositoryDraftInvocation(
    [STAGING_REPOSITORY_DRAFT_CONFIRMATION],
    environment,
  );
  repositoryDraftFixture(value(environment, 'STAGING_REPOSITORY_DRAFT_MARKER'));
}

export function classifyStagingRepositoryDraftRequest(method, rawUrl, body, state) {
  const ordinary = classifyStagingBrowserRequest(method, rawUrl);
  if (ordinary.allowed) return ordinary;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return ordinary;
  }
  if (method.toUpperCase() !== 'POST' || url.origin !== STAGING_SUPABASE_ORIGIN) {
    return ordinary;
  }
  const prefix = '/rest/v1/rpc/';
  if (!url.pathname.startsWith(prefix)) return ordinary;
  let rpcName = '';
  try {
    rpcName = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return ordinary;
  }
  if (!MUTATION_RPCS.has(rpcName)) return ordinary;

  let fixture;
  try {
    fixture = repositoryDraftFixture(state?.marker);
  } catch {
    return deny('invalid Repository Draft fixture state');
  }

  if (rpcName === 'create_repository_content') {
    const keys = [
      'content_description', 'content_sort_order', 'content_status', 'content_title',
      'provider', 'provider_video_id', 'target_class', 'target_rank', 'target_sub_rank',
    ];
    const valid = state?.phase === 'new' && state?.inFlight !== true && !state?.createdId && exactKeys(body, keys) &&
      UUID.test(body.target_class) && UUID.test(body.target_rank) && UUID.test(body.target_sub_rank) &&
      body.content_title === fixture.marker && body.content_description === fixture.description &&
      body.provider === '' && body.provider_video_id === '' && body.content_status === 'draft' &&
      body.content_sort_order === fixture.initialSortOrder;
    return valid
      ? { allowed: true, mutation: 'create', reason: 'exact Repository Draft create fixture' }
      : deny('Repository Draft create payload does not match the exact fixture');
  }

  if (!UUID.test(state?.createdId ?? '') || state?.inFlight === true) {
    return deny('Repository Draft mutation is missing its captured content UUID');
  }
  if (rpcName === 'update_repository_content') {
    const keys = [
      'content_description', 'content_sort_order', 'content_status', 'content_title',
      'provider', 'provider_video_id', 'target_content',
    ];
    const valid = state?.phase === 'created' && exactKeys(body, keys) && body.target_content === state.createdId &&
      body.content_title === fixture.updatedMarker && body.content_description === fixture.updatedDescription &&
      body.provider === '' && body.provider_video_id === '' && body.content_status === 'draft' &&
      body.content_sort_order === fixture.updatedSortOrder;
    return valid
      ? { allowed: true, mutation: 'update', reason: 'exact Repository Draft update fixture' }
      : deny('Repository Draft update payload does not match the captured fixture');
  }

  const valid = state?.phase === 'updated' && exactKeys(body, ['target_content']) &&
    body.target_content === state.createdId;
  return valid
    ? { allowed: true, mutation: 'delete', reason: 'exact Repository Draft delete fixture' }
    : deny('Repository Draft delete payload does not match the captured fixture');
}

export function assertStagingRepositoryDraftTarget(environment = process.env) {
  assertStagingRepositoryDraftRuntime(environment);
  if (value(environment, 'STAGING_PROJECT_REF') !== STAGING_PROJECT_REF ||
      value(environment, 'NEXT_PUBLIC_SUPABASE_URL') !== STAGING_SUPABASE_ORIGIN ||
      value(environment, 'NEXT_PUBLIC_SITE_URL') !== STAGING_APP_ORIGIN) {
    throw new Error('The Repository Draft run is not pinned to the approved staging targets.');
  }
}

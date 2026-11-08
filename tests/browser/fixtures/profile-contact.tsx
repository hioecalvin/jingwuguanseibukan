import { createRoot } from 'react-dom/client';

import ProfilePage from '../../../app/(member)/profile/page';
import { fixtureState } from './profile-contact-supabase';

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const inputUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(inputUrl, window.location.origin);
  if (url.pathname !== '/api/account/change-email' || init?.method !== 'POST') {
    throw new Error(`Unexpected fixture request: ${init?.method ?? 'GET'} ${url.pathname}`);
  }

  const headers = new Headers(init.headers);
  const body = JSON.parse(String(init.body ?? '{}')) as { newEmail?: string };
  fixtureState.emailCalls.push({
    authorization: headers.get('Authorization'),
    body,
  });

  if (fixtureState.failNextEmail) {
    fixtureState.failNextEmail = false;
    return new Response(JSON.stringify({ error: 'That email address is already in use.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Verification was sent to the new email address.',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

window.addEventListener('pagehide', () => {
  window.fetch = originalFetch;
});

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<ProfilePage />);

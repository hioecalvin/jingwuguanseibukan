// The fixture cannot authenticate, read data or pretend a logout succeeded.
import { waitForFixtureRequest } from './request-gate';

export function createClient() {
  return { auth: { signOut: async () => {
    // Pending-state tests explicitly release this after checking disabled/focus.
    // No timer races or Auth service requests.
    await waitForFixtureRequest('sign-out');
    return { error: new Error('Fixture authentication is disabled') };
  } } };
}

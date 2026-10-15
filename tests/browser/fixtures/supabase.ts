// The fixture cannot authenticate, read data or pretend a logout succeeded.
export function createClient() {
  return { auth: { signOut: async () => {
    // Exercise the disabled, focused button before failure, not just a
    // synchronously resolved promise. This never contacts an Auth service.
    await new Promise(resolve => setTimeout(resolve, 300));
    return { error: new Error('Fixture authentication is disabled') };
  } } };
}

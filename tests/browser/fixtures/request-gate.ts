// Test-bundle-only synchronization. Never imported by application source.
export type FixtureRequestName = 'sign-out' | 'assessment-history';
declare global {
  interface Window {
    __jwgFixtureRequests?: Partial<Record<FixtureRequestName, {
      wait: Promise<void>;
      release: () => void;
      started: boolean;
    }>>;
  }
}

export async function waitForFixtureRequest(name: FixtureRequestName, required = false) {
  const gate = window.__jwgFixtureRequests?.[name];
  if (!gate) {
    if (required) throw new Error(`Missing synthetic request gate: ${name}`);
    return;
  }
  gate.started = true;
  await gate.wait;
}

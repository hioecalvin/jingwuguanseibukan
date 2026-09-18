import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import AppShell from '../../../components/app-shell';
import type { AppRole } from '../../../lib/navigation';

const requestedRole = new URLSearchParams(window.location.search).get('role');
const role: AppRole = requestedRole === 'admin' || requestedRole === 'super_admin' ? requestedRole : 'member';
function NavigationFixture() {
  const [activated, setActivated] = useState(false);
  return (
  <AppShell role={role} memberName="Fixture Member" memberId="FIXTURE-001">
    <h1 className="text-2xl font-semibold">Navigation component fixture</h1>
    <p className="mt-4 text-neutral-300">Fictional presentation only. No authentication or database access.</p>
    <button type="button" onClick={() => setActivated(true)} className="mt-4 rounded-lg border border-neutral-600 px-4 py-3">Content action</button>
    {activated && <p role="status">Content action activated</p>}
  </AppShell>
  );
}
createRoot(document.getElementById('fixture-root')!).render(<NavigationFixture />);

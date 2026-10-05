import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import AppShell from '../../../components/app-shell';
import CompactRecord from '../../../components/compact-record';
import type { AppRole } from '../../../lib/navigation';

const requestedRole = new URLSearchParams(window.location.search).get('role');
const role: AppRole = requestedRole === 'admin' || requestedRole === 'super_admin' ? requestedRole : 'member';
function NavigationFixture() {
  const [activated, setActivated] = useState(false);
  return (
  <AppShell role={role} memberName="Fixture Member" memberId="FIXTURE-001">
    {/* Exercise account-menu hit testing above positioned page content. */}
    <div className="relative z-10 min-h-64">
    <h1 className="text-2xl font-semibold">Navigation component fixture</h1>
    <p className="mt-4 text-neutral-300">Fictional presentation only. No authentication or database access.</p>
    <button type="button" onClick={() => setActivated(true)} className="mt-4 rounded-lg border border-neutral-600 px-4 py-3">Content action</button>
    {activated && <p role="status">Content action activated</p>}
    </div>
    {new URLSearchParams(window.location.search).has('compact') && (
      <form onSubmit={event => { event.preventDefault(); setActivated(true); }} className="mt-8 space-y-4">
        <CompactRecord summary="Fixture Member with a long display name" detail="Aikido · 1st Kyu · Central Dojo" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2>Member details</h2>
          <label className="block" htmlFor="compact-notes">Notes</label>
          <input id="compact-notes" required className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2" />
          <p className="mt-4 text-sm text-neutral-400">Details remain mounted when this record is closed.</p>
        </CompactRecord>
        <CompactRecord summary="September payment" detail="Rp 100.000 · Unpaid" className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2>Payment details</h2>
          <p>Full-payment workflow; no financial action in this fixture.</p>
        </CompactRecord>
        <button type="submit" className="rounded-lg border border-neutral-700 px-3 py-2">Validate fixture</button>
      </form>
    )}
  </AppShell>
  );
}
createRoot(document.getElementById('fixture-root')!).render(<NavigationFixture />);

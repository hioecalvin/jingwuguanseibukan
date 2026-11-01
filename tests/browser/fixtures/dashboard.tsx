import { createRoot } from 'react-dom/client';
import HomePage from '../../../app/(member)/page';
import AdminDashboardPage from '../../../app/admin/page';

const role = new URLSearchParams(window.location.search).get('role') ?? 'member';
createRoot(document.getElementById('fixture-root')!).render(
  <div className="app-compact p-4">
    {role === 'member' ? <HomePage /> : <AdminDashboardPage />}
  </div>,
);

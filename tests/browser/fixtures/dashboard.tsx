import { createRoot } from 'react-dom/client';
import HomePage from '../../../app/(member)/page';
import AdminDashboardPage from '../../../app/admin/page';
import CalendarPage from '../../../app/(member)/calendar/page';

const role = new URLSearchParams(window.location.search).get('role') ?? 'member';
createRoot(document.getElementById('fixture-root')!).render(
  <div className="app-compact p-4">
    {new URLSearchParams(window.location.search).has('calendar') ? <CalendarPage /> : role === 'member' || new URLSearchParams(window.location.search).has('member-view') ? <HomePage /> : <AdminDashboardPage />}
  </div>,
);

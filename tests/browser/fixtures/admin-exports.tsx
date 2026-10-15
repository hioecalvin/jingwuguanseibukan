import { createRoot } from 'react-dom/client';

import DocumentArchivePage from '../../../app/admin/archive/page';
import CertificateHistoryPage from '../../../app/admin/certificates/page';
import OfficialReportHistoryPage from '../../../app/admin/reports/page';

function Fixture() {
  if (window.location.pathname === '/admin-certificates') return <CertificateHistoryPage />;
  if (window.location.pathname === '/admin-reports') return <OfficialReportHistoryPage />;
  return <DocumentArchivePage />;
}

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<Fixture />);

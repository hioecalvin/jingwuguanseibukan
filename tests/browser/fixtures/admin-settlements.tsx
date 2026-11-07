import { createRoot } from 'react-dom/client';

import AdminSettlementsPage from '../../../app/admin/settlements/page';

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<AdminSettlementsPage />);

import { createRoot } from 'react-dom/client';

import AdminPaymentsPage from '../../../app/admin/payments/page';

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<AdminPaymentsPage />);

import { createRoot } from 'react-dom/client';

import SubscriptionPage from '../../../app/admin/subscriptions/page';

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<SubscriptionPage />);

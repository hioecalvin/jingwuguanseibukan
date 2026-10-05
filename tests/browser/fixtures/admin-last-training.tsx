import { createRoot } from 'react-dom/client';

import MemberManagementPage from '../../../app/admin/members/page';

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<div className="app-compact"><MemberManagementPage /></div>);

import { createRoot } from 'react-dom/client';
import MemberDirectoryPage from '../../../app/(member)/directory/page';

createRoot(document.getElementById('fixture-root')!).render(
  <div className="app-compact p-4"><MemberDirectoryPage /></div>,
);

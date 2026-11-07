import { createRoot } from 'react-dom/client';
import DojosPage from '../../../app/(member)/dojos/page';
import DojoContactDetails from '../../../components/dojo-contact-details';
const root = document.getElementById('fixture-root');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(new URLSearchParams(location.search).has('admin-card') ? <DojoContactDetails dojoId="dojo-a" /> : <DojosPage />);

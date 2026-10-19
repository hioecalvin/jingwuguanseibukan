import { createRoot } from 'react-dom/client';
// Fictional presentation only; this does not enable the server release switch.
import History from '../../../app/(member)/assessment-history/assessment-history-client';
const root=document.getElementById('fixture-root');
if(!root) throw Error('Missing fixture root');
createRoot(root).render(<main className="min-h-screen bg-neutral-950 p-4 text-white"><History/></main>);

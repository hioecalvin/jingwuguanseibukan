import { createRoot } from 'react-dom/client';
import TrainingSessionsPage from '../../../app/admin/training-sessions/page';
const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root missing');
createRoot(root).render(<TrainingSessionsPage />);

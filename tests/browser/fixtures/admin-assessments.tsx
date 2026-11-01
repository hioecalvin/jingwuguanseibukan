import { createRoot } from 'react-dom/client';

import BulkAssessmentsPage from '../../../app/admin/assessments/page';

function Fixture() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <BulkAssessmentsPage />
    </main>
  );
}

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<Fixture />);

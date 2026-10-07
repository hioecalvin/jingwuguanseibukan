import { createRoot } from 'react-dom/client';
import ClassEnrollmentPanel from '../../../components/class-enrollment-panel';

function EnrollmentFixture() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Pending approval workflow fixture</h1>
        <p className="mt-2 text-neutral-400">Synthetic Member data; no provider or database access.</p>
        <ClassEnrollmentPanel />
      </div>
    </main>
  );
}

createRoot(document.getElementById('fixture-root')!).render(<EnrollmentFixture />);

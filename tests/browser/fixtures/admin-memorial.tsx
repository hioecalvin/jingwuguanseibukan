import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import DeceasedMemorialPanel, {
  type MemorialDraft,
} from '../../../app/admin/members/DeceasedMemorialPanel';

const initialDraft: MemorialDraft = {
  isDeceased: false,
  dateOfPassing: '',
  recipientClassIds: ['class-aikido'],
  remembranceEnabled: false,
  remembranceMessage: '',
  heavenlyBirthdayEnabled: false,
  heavenlyBirthdayMessage: '',
  initialMemorialTitle: 'Fixture Member — In Memoriam',
  initialMemorialMessage: '',
};

let latestDraft = initialDraft;
let savedDraft: MemorialDraft | null = null;
let publishedDraft: MemorialDraft | null = null;

Object.defineProperty(window, '__memorialFixture', {
  get: () => ({
    draft: { ...latestDraft, recipientClassIds: [...latestDraft.recipientClassIds] },
    savedDraft: savedDraft && { ...savedDraft, recipientClassIds: [...savedDraft.recipientClassIds] },
    publishedDraft: publishedDraft && { ...publishedDraft, recipientClassIds: [...publishedDraft.recipientClassIds] },
  }),
});

function Fixture() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <h1 className="text-2xl font-bold">Fixture Member</h1>
      <DeceasedMemorialPanel
        fullName="Fixture Member"
        classes={[
          { id: 'class-aikido', name: 'Aikido' },
          { id: 'class-karate', name: 'Karate' },
          { id: 'class-taiji', name: 'Taiji' },
        ]}
        draft={draft}
        open={open}
        loading={false}
        saving={false}
        publishing={false}
        onToggleOpen={() => setOpen(current => !current)}
        onChange={(nextDraft) => {
          latestDraft = nextDraft;
          setDraft(nextDraft);
        }}
        onSave={() => { savedDraft = { ...draft, recipientClassIds: [...draft.recipientClassIds] }; }}
        onPublishInitialMemorial={() => { publishedDraft = { ...draft, recipientClassIds: [...draft.recipientClassIds] }; }}
      />
    </main>
  );
}

const root = document.getElementById('fixture-root');
if (!root) throw new Error('Fixture root is missing');
createRoot(root).render(<Fixture />);

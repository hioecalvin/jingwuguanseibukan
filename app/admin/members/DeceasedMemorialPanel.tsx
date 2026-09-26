"use client";

export type MemorialClassOption = { id: string; name: string };

export type MemorialDraft = {
  isDeceased: boolean;
  dateOfPassing: string;
  recipientClassIds: string[];
  remembranceEnabled: boolean;
  remembranceMessage: string;
  heavenlyBirthdayEnabled: boolean;
  heavenlyBirthdayMessage: string;
  initialMemorialTitle: string;
  initialMemorialMessage: string;
};

type Props = {
  fullName: string;
  classes: MemorialClassOption[];
  draft: MemorialDraft;
  open: boolean;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  onToggleOpen: () => void;
  onChange: (draft: MemorialDraft) => void;
  onSave: () => void;
  onPublishInitialMemorial: () => void;
};

export default function DeceasedMemorialPanel({
  fullName,
  classes,
  draft,
  open,
  loading,
  saving,
  publishing,
  onToggleOpen,
  onChange,
  onSave,
  onPublishInitialMemorial,
}: Props) {
  const busy = loading || saving || publishing;
  const update = (patch: Partial<MemorialDraft>) => onChange({ ...draft, ...patch });

  function toggleRecipient(classId: string) {
    update({
      recipientClassIds: draft.recipientClassIds.includes(classId)
        ? draft.recipientClassIds.filter((id) => id !== classId)
        : [...draft.recipientClassIds, classId],
    });
  }

  return (
    <section
      aria-label={`Deceased member and memorial settings for ${fullName}`}
      className="mt-6 border-t border-neutral-800 pt-5"
    >
      <div className="rounded-xl border border-violet-900 bg-violet-950/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
              Deceased Member &amp; Memorials
            </h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-neutral-400">
              Records, grades, certificates, attendance and Member ID are preserved.
              Deceased is separate from Inactive or Terminated.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={open}
            disabled={busy}
            onClick={onToggleOpen}
            className="self-start rounded-lg border border-violet-800 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-950/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : open ? "Close Memorial Settings" : "Manage Memorial Settings"}
          </button>
        </div>

        {open && !loading && (
          <div className="mt-5 space-y-6 border-t border-violet-950 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <input
                  type="checkbox"
                  checked={draft.isDeceased}
                  disabled={busy}
                  onChange={(event) =>
                    update({
                      isDeceased: event.target.checked,
                      dateOfPassing: event.target.checked ? draft.dateOfPassing : "",
                      remembranceEnabled: event.target.checked ? draft.remembranceEnabled : false,
                      heavenlyBirthdayEnabled: event.target.checked
                        ? draft.heavenlyBirthdayEnabled
                        : false,
                    })
                  }
                  className="h-4 w-4 accent-violet-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">Deceased</span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    Disables online access and ordinary birthday announcements when saved.
                  </span>
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-200">
                  Date of Passing
                </span>
                <input
                  type="date"
                  required={draft.isDeceased}
                  disabled={!draft.isDeceased || busy}
                  value={draft.dateOfPassing}
                  onChange={(event) => update({ dateOfPassing: event.target.value })}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>

            <fieldset disabled={!draft.isDeceased || busy}>
              <legend className="text-sm font-semibold text-neutral-200">Recipient classes</legend>
              <p className="mt-1 text-xs text-neutral-500">
                These classes receive the Initial Memorial and enabled annual reminders.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((classOption) => (
                  <label
                    key={classOption.id}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={draft.recipientClassIds.includes(classOption.id)}
                      onChange={() => toggleRecipient(classOption.id)}
                      className="h-4 w-4 accent-violet-500"
                    />
                    <span>{classOption.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 xl:grid-cols-2">
              <fieldset
                disabled={!draft.isDeceased || busy}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
              >
                <legend className="px-1 text-sm font-semibold text-neutral-200">
                  Remembrance Day
                </legend>
                <label className="mt-1 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.remembranceEnabled}
                    onChange={(event) => update({ remembranceEnabled: event.target.checked })}
                    className="h-4 w-4 accent-violet-500"
                  />
                  Publish annually on the passing anniversary
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-medium text-neutral-400">Message</span>
                  <textarea
                    rows={4}
                    value={draft.remembranceMessage}
                    onChange={(event) => update({ remembranceMessage: event.target.value })}
                    placeholder={`Today we remember ${fullName}.`}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white placeholder:text-neutral-600"
                  />
                </label>
              </fieldset>

              <fieldset
                disabled={!draft.isDeceased || busy}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
              >
                <legend className="px-1 text-sm font-semibold text-neutral-200">
                  Heavenly Birthday
                </legend>
                <label className="mt-1 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.heavenlyBirthdayEnabled}
                    onChange={(event) => update({ heavenlyBirthdayEnabled: event.target.checked })}
                    className="h-4 w-4 accent-violet-500"
                  />
                  Replace the ordinary birthday announcement each year
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-medium text-neutral-400">Message</span>
                  <textarea
                    rows={4}
                    value={draft.heavenlyBirthdayMessage}
                    onChange={(event) => update({ heavenlyBirthdayMessage: event.target.value })}
                    placeholder={`Remembering ${fullName} on their heavenly birthday.`}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white placeholder:text-neutral-600"
                  />
                </label>
              </fieldset>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Deceased & Memorial Settings"}
            </button>

            <fieldset
              disabled={!draft.isDeceased || busy}
              className="rounded-xl border border-amber-900 bg-amber-950/10 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-amber-200">Initial Memorial</legend>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                This is manually written and published once. Publishing may notify members of the
                selected recipient classes immediately.
              </p>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-neutral-400">Title</span>
                  <input
                    type="text"
                    value={draft.initialMemorialTitle}
                    onChange={(event) => update({ initialMemorialTitle: event.target.value })}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-neutral-400">Message</span>
                  <textarea
                    rows={5}
                    value={draft.initialMemorialMessage}
                    onChange={(event) => update({ initialMemorialMessage: event.target.value })}
                    placeholder="Write the memorial announcement..."
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-white placeholder:text-neutral-600"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onPublishInitialMemorial}
                  className="rounded-lg border border-amber-700 px-5 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishing ? "Publishing..." : "Publish Initial Memorial"}
                </button>
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </section>
  );
}

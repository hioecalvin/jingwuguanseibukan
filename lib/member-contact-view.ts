type SearchableMember = {
  full_name: string;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
};

export function filterMemberProfiles<T extends SearchableMember>(
  profiles: readonly T[],
  search: string,
): T[] {
  const query = search.trim().toLowerCase();
  return profiles.filter((profile) =>
    !query || [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.registration_number,
    ].some((value) => value?.toLowerCase().includes(query)),
  );
}

export type ContactBaseline = {
  phone: string | null;
  instagramUsername: string | null;
};

export function createContactEditorState(contact: {
  phone: string | null;
  instagram_username: string | null;
}) {
  return {
    phoneInput: contact.phone ?? "",
    instagramInput: contact.instagram_username ?? "",
    // Empty controls are a presentation detail. The optimistic-lock baseline
    // must retain the exact database values, including NULL versus empty text.
    baseline: {
      phone: contact.phone,
      instagramUsername: contact.instagram_username,
    } satisfies ContactBaseline,
  };
}

export type DirectoryEnrollment = {
  class_name: string;
  home_dojo: string | null;
  current_rank: string | null;
};

export type DirectoryMember = {
  full_name: string;
  avatar_url: string | null;
  enrollments: DirectoryEnrollment[];
  instagram_username: string | null;
};

export type DirectorySort = "name" | "class" | "dojo";

const compare = (left: string, right: string) =>
  left.localeCompare(right, "en", { sensitivity: "base", numeric: true });

export function instagramProfile(username: string | null) {
  const handle = username?.trim().replace(/^@/, "") ?? "";
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null;
  return { handle, href: `https://www.instagram.com/${encodeURIComponent(handle)}/` };
}

export function directoryRows(
  members: DirectoryMember[], className: string, dojo: string, sort: DirectorySort,
) {
  // Match both filters against the SAME enrolment, not two unrelated classes.
  const matches = (entry: DirectoryEnrollment) =>
    (!className || entry.class_name === className) && (!dojo || entry.home_dojo === dojo);
  const compareEnrollment = (a: DirectoryEnrollment, b: DirectoryEnrollment) =>
    (sort === "dojo" ? compare(a.home_dojo ?? "\uffff", b.home_dojo ?? "\uffff") : 0) ||
    compare(a.class_name, b.class_name) || compare(a.home_dojo ?? "\uffff", b.home_dojo ?? "\uffff");
  return members.map((member, index) => ({
    member, index,
    matching: member.enrollments.filter(matches).sort(compareEnrollment),
    // Keep every enrolment visible together, even when a filter matches just one.
    enrollments: [...member.enrollments].sort(compareEnrollment),
  })).filter((row) => row.matching.length > 0).sort((a, b) =>
    (sort === "name" ? 0 : compareEnrollment(a.matching[0], b.matching[0])) ||
    compare(a.member.full_name, b.member.full_name) || a.index - b.index,
  );
}

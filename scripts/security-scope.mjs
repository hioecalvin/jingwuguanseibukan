export function assignmentCoversMember(assignment, member) {
  const hasClassScope = Boolean(assignment.class_id);
  const hasDojoScope = Boolean(assignment.dojo_id);

  if (!hasClassScope && !hasDojoScope) {
    return false;
  }

  return (
    (!hasClassScope || member.class_id === assignment.class_id) &&
    (!hasDojoScope || member.dojo_id === assignment.dojo_id)
  );
}

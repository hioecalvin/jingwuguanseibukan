export type MemberExamRecord = {
  result_id: string;
  class_id: string;
  assessment_number: string | null;
  assessment_date: string | null;
  rank_before: string | null;
  rank_assessed: string;
  outcome: string;
  assessor_name: string | null;
  dojo_name: string | null;
  notes: string | null;
};

export type MemberTransferRecord = {
  id: string;
  date: string;
  dateLabel: "Effective" | "Requested";
  fromDojo: string;
  toDojo: string;
  status: string;
};

export type AdminTransferSource = {
  request_id: string;
  membership_id: string;
  class_id: string;
  effective_date: string;
  from_dojo_name: string | null;
  to_dojo_name: string | null;
  execution_state: string | null;
  status: string;
};

export type MemberTransferSource = {
  id: string;
  user_id: string;
  class_id: string;
  created_at: string;
  status: string;
  from_dojo: { name: string } | null;
  to_dojo: { name: string } | null;
};

/** Keep the existing server/RLS authorization and additionally bind each PDF to its membership. */
export function prepareOfficialMemberHistory(
  scope: { membershipId: string; userId: string; classId: string },
  exams: MemberExamRecord[],
  adminTransfers: AdminTransferSource[],
  memberTransfers: MemberTransferSource[],
) {
  return {
    assessment_history: exams.filter(item => item.class_id === scope.classId)
      .sort((a, b) => (a.assessment_date ?? "9999").localeCompare(b.assessment_date ?? "9999") || a.result_id.localeCompare(b.result_id)),
    transfer_history: [
      ...adminTransfers.filter(item => item.membership_id === scope.membershipId && item.class_id === scope.classId).map(item => ({
        id: `admin:${item.request_id}`, date: item.effective_date, dateLabel: "Effective" as const,
        fromDojo: item.from_dojo_name ?? "Unknown", toDojo: item.to_dojo_name ?? "Unknown",
        status: item.execution_state ?? item.status,
      })),
      ...memberTransfers.filter(item => item.user_id === scope.userId && item.class_id === scope.classId).map(item => ({
        id: `member:${item.id}`, date: item.created_at, dateLabel: "Requested" as const,
        fromDojo: item.from_dojo?.name ?? "Unknown", toDojo: item.to_dojo?.name ?? "Unknown", status: item.status,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
  };
}

export function assessmentOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "pass": return "Pass";
    case "fail": return "Fail";
    case "recorded_grade": return "Historical grade";
    case "lost_record": return "Record lost";
    case "skipped_rank": return "Rank skipped";
    default: return "Unknown";
  }
}

type AssessmentNumberDetails = {
  assessment_number: string | null;
  member_id: string | null;
  outcome: string;
  assessment_date: string | null;
};

export function assessmentNumberLabel(result: AssessmentNumberDetails): string {
  if (result.assessment_number) return result.assessment_number;
  if (!result.member_id) return "Not numbered — member not matched";
  if (result.outcome === "lost_record") return "Not numbered — record lost";
  if (result.outcome === "skipped_rank") return "Not numbered — rank skipped";
  if (!result.assessment_date) return "Not numbered — date incomplete";
  return "Not numbered — needs review";
}

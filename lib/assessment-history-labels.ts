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

export function assessmentPreparationError(message: string): string {
  if (message.includes("cannot be prepared in the past")) return "This server does not yet support past-dated assessments. Keep the original assessment date and try again after the update.";
  if (/roster is stale|not eligible|target grade|target rank/i.test(message)) return "A selected member's eligibility or target grade has changed. Reload the roster and review the selected grades.";
  if (/assessor/i.test(message)) return "Select an active appointed grading assessor, then prepare the roster again.";
  if (/Not authenticated|active Super Admin|not authorised/i.test(message)) return "Your session cannot prepare this assessment. Sign in with an active Super Admin account and try again.";
  if (/Preparation key was already used/i.test(message)) return "This selection has already been prepared differently. Reload the roster before preparing again.";
  if (/assessment date|finite date/i.test(message)) return "Enter a valid assessment date and reload the roster.";
  return "The roster and pending certificates were not prepared. Your selections are kept. Retry once; if it continues, contact Super Admin.";
}

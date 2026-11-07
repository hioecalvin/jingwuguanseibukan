import "server-only";

// Release switch only, not a permission or an automatic schema check. Operators
// may enable this only after migration 061 and its acceptance tests are verified
// on the deployment's exact database. Missing/malformed values fail closed.
export function assessmentHistoryEnabled(): boolean {
  return process.env.ASSESSMENT_HISTORY_ENABLED === "true";
}

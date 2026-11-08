import "server-only";

// Leave off until the complete migration, Auth-provider integration and guarded
// acceptance are verified on the exact deployment target. Not authorization.
export function memberClaimsEnabled(): boolean {
  return process.env.MEMBER_CLAIMS_ENABLED === "true";
}

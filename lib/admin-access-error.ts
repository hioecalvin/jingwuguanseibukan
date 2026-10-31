/** Supabase RPC failures are often plain objects rather than Error instances. */
export function adminAccessErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return fallback;
  }

  const message = typeof error.message === "string" ? error.message.trim() : "";
  if (!message) return fallback;

  if (message === "Offline member cannot receive an appointment") {
    return "This member does not have a linked login account yet. Activate and link their account before granting dojo Admin access.";
  }

  return message;
}

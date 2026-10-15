import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";


export function createAuthenticatedClient(
  accessToken: string,
) {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const publicKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !publicKey
  ) {
    throw new Error(
      "Supabase public environment configuration is missing.",
    );
  }

  return createClient(
    supabaseUrl,
    publicKey,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

import {
  createClient,
} from "@supabase/supabase-js";


export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;


  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing"
    );
  }


  if (!supabaseSecret) {
    throw new Error(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }


  return createClient(
    supabaseUrl,
    supabaseSecret,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
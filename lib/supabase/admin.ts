import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error(
      "[CalendarAI] SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your .env.local file. Find it in your Supabase project settings."
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Export as createClient for compatibility with webhook handler
export function createClient() {
  return createAdminClient();
}
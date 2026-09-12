import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://bagenddjwtyriuztrhop.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vvGXcCs_Wc1r1YndWGqXSQ_txy1eAXh";

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export function hasSupabaseConfig() { return true; }

// lib/supabase.js — Supabase client setup
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Unauthenticated client (public data only)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getSupabaseWithAuth(clerkToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } },
  });
}

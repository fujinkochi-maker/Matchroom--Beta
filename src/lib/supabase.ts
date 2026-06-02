import { createClient } from "@supabase/supabase-js";

function getEnv() {
  try {
    if (typeof process !== "undefined" && process.env) return process.env;
  } catch {
    // no process (Workers)
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) return import.meta.env;
  } catch {
    // no import.meta.env
  }
  return {};
}

const _env = getEnv();
const supabaseUrl = _env.VITE_SUPABASE_URL;
const supabaseAnonKey = _env.VITE_SUPABASE_ANON_KEY;

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

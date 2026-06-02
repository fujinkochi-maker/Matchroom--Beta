import { createClient } from "@supabase/supabase-js";

let _customUrl: string | undefined;
let _customAnonKey: string | undefined;

export function setSupabaseEnv(url: string, key: string) {
  _customUrl = url;
  _customAnonKey = key;
}

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

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  const url = _customUrl ?? _env.VITE_SUPABASE_URL;
  const key = _customAnonKey ?? _env.VITE_SUPABASE_ANON_KEY;
  if (!client) {
    client = createClient(url, key);
  }
  return client;
}

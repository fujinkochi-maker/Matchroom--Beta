import process from "node:process";

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

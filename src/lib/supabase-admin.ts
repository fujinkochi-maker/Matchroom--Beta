import { createClient } from "@supabase/supabase-js";
import { getServerConfig } from "./config.server";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminSupabase(): any {
  if (!adminClient) {
    const cfg = getServerConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_KEY is not set");
    }
    adminClient = createClient(cfg.supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

import { setSupabaseEnv } from "./lib/supabase";
import { DiscordGatewayDO_v2 } from "./durable-object";

// Re-export old name for migration compatibility
class DiscordGatewayDO extends DiscordGatewayDO_v2 {}

export { DiscordGatewayDO, DiscordGatewayDO_v2 };

async function wakeupGateway(env: Record<string, any>) {
  try {
    const doId = env.DISCORD_GATEWAY.idFromName("discord-gateway");
    const stub = env.DISCORD_GATEWAY.get(doId);
    await stub.fetch("https://do/wakeup");
  } catch (err) {
    console.error("[Wakeup] DO not available yet:", err);
  }
}

export default {
  async scheduled(
    _event: any,
    env: Record<string, any>,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ) {
    ctx.waitUntil(wakeupGateway(env));
  },

  async fetch(
    request: Request,
    env: Record<string, any>,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/discord") {
      return Response.redirect("https://discord.gg/PB8vesEaTs", 302);
    }

    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    setSupabaseEnv(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

    const { loadDataFromSupabase } = await import("./data/fighters");
    const { createHandler } = await import("./lib/discord-bot");
    const handler = createHandler(env, (p) => ctx.waitUntil(p));

    ctx.waitUntil(
      loadDataFromSupabase()
        .then(() => console.log("Fighter cache loaded"))
        .catch((err) => console.error("Cache load failed:", err)),
    );
    ctx.waitUntil(
      handler.registerCommands().catch((err) => console.error("Command registration failed:", err)),
    );

    // Wake up Gateway DO on each interaction to keep it alive
    ctx.waitUntil(wakeupGateway(env));

    const response = await handler.handleDiscordInteraction(request);
    return response ?? new Response("OK", { status: 200 });
  },
};

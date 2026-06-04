import { setSupabaseEnv } from "./lib/supabase";
import { DiscordGatewayDO_v2 } from "./durable-object";

// Re-export old name for migration compatibility
class DiscordGatewayDO extends DiscordGatewayDO_v2 {}

export { DiscordGatewayDO, DiscordGatewayDO_v2 };

async function wakeupGateway(env: Record<string, any>) {
  try {
    const doId = env.DISCORD_GATEWAY.idFromName("discord-gateway");
    const stub = env.DISCORD_GATEWAY.get(doId);
    await stub.fetch(`https://do/wakeup?token=${encodeURIComponent(env.DISCORD_BOT_TOKEN || "")}`);
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

    // Debug endpoint — check DO status
    if (request.method === "GET" && url.pathname === "/debug") {
      try {
        const doId = env.DISCORD_GATEWAY.idFromName("discord-gateway");
        const stub = env.DISCORD_GATEWAY.get(doId);
        const status = await stub.fetch("https://do/status");
        const info = await status.json();
        return new Response(JSON.stringify(info, null, 2), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // Manual wakeup — force DO reconnect with fresh token
    if (request.method === "GET" && url.pathname === "/wakeup") {
      console.log("[Worker] Token present:", !!env.DISCORD_BOT_TOKEN);
      ctx.waitUntil(wakeupGateway(env));
      return new Response("Wakeup triggered", { status: 200 });
    }

    // Check worker env
    if (request.method === "GET" && url.pathname === "/envcheck") {
      return new Response(
        JSON.stringify({
          hasBotToken: !!env.DISCORD_BOT_TOKEN,
          tokenPrefix: env.DISCORD_BOT_TOKEN ? env.DISCORD_BOT_TOKEN.slice(0, 15) + "..." : null,
          hasAppId: !!env.DISCORD_APPLICATION_ID,
          hasPublicKey: !!env.DISCORD_PUBLIC_KEY,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

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

    const response = await handler.handleDiscordInteraction(request);
    return response ?? new Response("OK", { status: 200 });
  },
};

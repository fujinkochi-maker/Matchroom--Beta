import { loadDataFromSupabase } from "./data/fighters";

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/discord") {
      return Response.redirect("https://discord.gg/PB8vesEaTs", 302);
    }

    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const { createHandler } = await import("./lib/discord-bot");
    const handler = createHandler(env);

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

import { Client, ActivityType } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

let handleDiscordInteraction: (req: Request) => Promise<Response | null>;

async function main() {
  // Lazy-import the Discord interaction handler (once, no cold start)
  const mod = await import("./src/lib/discord-bot");
  handleDiscordInteraction = mod.handleDiscordInteraction;

  // Start gateway connection (discord.js keeps the bot online)
  const client = new Client({ intents: [] });
  client.once("ready", () => {
    console.log(`✅ Bot online as ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: "Matchroom Boxing Beta", type: ActivityType.Playing }],
      status: "online",
    });
  });
  client.on("error", (err) => console.error("❌ Client error:", err));
  client.login(token).catch((err) => console.error("❌ Login failed:", err));

  // HTTP server: health check (GET) + Discord interactions (POST)
  Bun.serve({
    port: 7860,
    async fetch(request) {
      if (request.method === "POST") {
        const response = await handleDiscordInteraction(request);
        if (response) return response;
      }
      return new Response("OK", { status: 200 });
    },
  });
  console.log("✅ Worker ready on :7860");
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});

import { Client, GatewayIntentBits, ActivityType } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

// HF Spaces requires the container to listen on port 7860
Bun.serve({
  port: 7860,
  fetch() {
    return new Response("OK");
  },
});
console.log("✅ Health server listening on :7860");

const client = new Client({ intents: [] });

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user?.tag}`);
  client.user?.setPresence({
    activities: [{ name: "Matchroom Boxing Beta", type: ActivityType.Playing }],
    status: "online",
  });
});

client.on("error", (err) => {
  console.error("❌ Client error:", err);
});

async function main() {
  try {
    await client.login(token);
  } catch (err) {
    console.error("❌ Login failed:", err);
    process.exit(1);
  }
}

main();

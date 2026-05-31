import { Client, GatewayIntentBits, ActivityType } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

const client = new Client({ intents: [] });

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user?.tag}`);
  client.user?.setPresence({
    activities: [{ name: "Matchroom Boxing Beta", type: ActivityType.Playing }],
    status: "online",
  });
});

client.login(token);

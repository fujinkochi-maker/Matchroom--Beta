import http from "http";
import { Client, ActivityType } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

let handleDiscordInteraction: (req: Request) => Promise<Response | null>;

async function registerCommands() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) {
    console.error("Cannot register commands: DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN not set");
    return;
  }
  const commands = [
    {
      name: "register",
      description: "Register as a fighter in Matchroom Boxing Beta",
      type: 1,
      contexts: [0, 1, 2],
    },
    {
      name: "stats",
      description: "View your fighter stats",
      type: 1,
      contexts: [0, 1, 2],
    },
    {
      name: "rankings",
      description: "Show top fighters in a division",
      type: 1,
      contexts: [0, 1, 2],
      options: [
        {
          type: 3,
          name: "division",
          description: "Choose a weight division",
          required: true,
          choices: [
            { name: "Flyweight", value: "Flyweight" },
            { name: "Bantamweight", value: "Bantamweight" },
            { name: "Featherweight", value: "Featherweight" },
            { name: "Lightweight", value: "Lightweight" },
            { name: "Welterweight", value: "Welterweight" },
            { name: "Middleweight", value: "Middleweight" },
            { name: "Light Heavyweight", value: "Light Heavyweight" },
            { name: "Cruiserweight", value: "Cruiserweight" },
            { name: "Heavyweight", value: "Heavyweight" },
          ],
        },
      ],
    },
    {
      name: "champions",
      description: "List all current division champions",
      type: 1,
      contexts: [0, 1, 2],
    },
    {
      name: "fighter",
      description: "Look up a fighter's profile and stats",
      type: 1,
      contexts: [0, 1, 2],
      options: [
        {
          type: 3,
          name: "username",
          description: "The fighter's username (e.g. iron_mike)",
          required: true,
        },
      ],
    },
    {
      name: "unregister",
      description: "Delete your fighter permanently",
      type: 1,
      contexts: [0, 1, 2],
    },
  ];

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const body = JSON.stringify(commands);
      const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body,
      });
      const data = await res.json().catch(() => []);
      if (res.ok) {
        console.log("Registered " + (Array.isArray(data) ? data.length : 0) + " slash commands");
        return;
      }
      console.error("Command registration failed:", res.status, JSON.stringify(data));
      return;
    } catch (err) {
      const isLast = attempt === maxRetries;
      console.log(
        `[Retry] registerCommands attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : err}${isLast ? "" : ", retrying in " + 1000 * 2 ** (attempt - 1) + "ms"}`,
      );
      if (isLast) {
        console.error("Command registration error:", err);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

async function main() {
  // Preload the fighter cache so read commands are instant
  try {
    const { loadDataFromSupabase } = await import("./src/data/fighters");
    await loadDataFromSupabase();
    console.log("Fighter cache loaded");
  } catch (err) {
    console.error("Failed to load fighter cache:", err);
  }

  const mod = await import("./src/lib/discord-bot");
  handleDiscordInteraction = mod.handleDiscordInteraction;

  const isHfSpace = !!process.env.SPACE_ID;

  if (!isHfSpace) {
    const client = new Client({ intents: [] });
    client.once("ready", () => {
      console.log("Bot online as " + client.user?.tag);
      client.user?.setPresence({
        activities: [{ name: "Matchroom Boxing Beta", type: ActivityType.Playing }],
        status: "online",
      });
    });
    client.on("error", (err) => console.error("Client error:", err));
    client.login(token).catch((err) => console.error("Login failed:", err));
  } else {
    console.log("Gateway skipped (HF Spaces -- HTTP-only mode)");
  }

  // HTTP server using Node.js http module (Bun.serve not available in Node.js)
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      const request = new Request("http://localhost" + req.url, {
        method: req.method,
        headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
        body: body || undefined,
      });
      const response = await handleDiscordInteraction(request);
      if (response) {
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        res.end(await response.text());
        return;
      }
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  });

  server.listen(7860, () => {
    console.log("Worker ready on :7860");
  });

  registerCommands();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

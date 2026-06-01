import https from "https";
import http from "http";
import { Client, ActivityType } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

let handleDiscordInteraction: (req: Request) => Promise<Response | null>;

function discordFetch(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: options.method,
        headers: options.headers,
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve(
            new Response(data, {
              status: res.statusCode,
              statusText: res.statusMessage,
            }),
          ),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

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

  try {
    const body = JSON.stringify(commands);
    const resObj = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "discord.com",
          path: `/api/v10/applications/${appId}/commands`,
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });

    if (resObj.statusCode >= 200 && resObj.statusCode < 300) {
      const data = JSON.parse(resObj.body || "[]");
      console.log("Registered " + data.length + " slash commands");
    } else {
      console.error("Command registration failed:", resObj.statusCode, resObj.body);
    }
  } catch (err) {
    console.error("Command registration error:", err);
  }
}

async function main() {
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

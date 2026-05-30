const DIVISIONS = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Cruiserweight",
  "Heavyweight",
];

type Command = {
  name: string;
  description: string;
  type: 1; // CHAT_INPUT
  integration_types?: [0, 1];
  contexts?: [0, 1, 2];
  options?: {
    type: number;
    name: string;
    description: string;
    required?: boolean;
    choices?: { name: string; value: string }[];
  }[];
};

const commands: Command[] = [
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
];

async function main() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    console.error("Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in .env");
    process.exit(1);
  }

  for (const cmd of commands) {
    const url = `https://discord.com/api/v10/applications/${appId}/commands`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Registered /${cmd.name} (id: ${data.id})`);
    } else {
      const text = await res.text();
      console.error(`Failed to register /${cmd.name}: ${res.status} ${text}`);
    }
  }
}

main().catch(console.error);

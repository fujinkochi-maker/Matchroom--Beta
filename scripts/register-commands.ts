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

const DIVISION_CHOICES = DIVISIONS.map((d) => ({ name: d, value: d }));

/* eslint-disable @typescript-eslint/no-explicit-any */

type Command = {
  name: string;
  description: string;
  type: 1;
  integration_types?: [0, 1];
  contexts?: [0, 1, 2];
  options?: any[];
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
  {
    name: "rankings",
    description: "Show top fighters in a division",
    type: 1,
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "division",
        description: "Choose a weight division",
        required: true,
        choices: DIVISION_CHOICES,
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
        type: 3, // STRING
        name: "username",
        description: "The fighter's username (e.g. iron_mike)",
        required: true,
      },
    ],
  },
];

async function main() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    console.error("Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in .env");
    process.exit(1);
  }

  // Bulk overwrite all commands using PUT (removes any commands not in the array)
  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (res.ok) {
    const data = await res.json();
    for (const cmd of data) {
      console.log(`Registered /${cmd.name} (id: ${cmd.id})`);
    }
  } else {
    const text = await res.text();
    console.error(`Failed to register commands: ${res.status} ${text}`);
  }
}

main().catch(console.error);

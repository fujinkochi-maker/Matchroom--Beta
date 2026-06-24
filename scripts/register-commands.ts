const DIVISIONS = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
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
  default_member_permissions?: string;
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
        type: 6, // USER
        name: "user",
        description: "Discord user to look up (optional)",
        required: false,
      },
      {
        type: 3,
        name: "username",
        description: "Fighter name to look up (optional)",
        required: false,
      },
    ],
  },
  {
    name: "unregister",
    description: "Delete your fighter permanently",
    type: 1,
    contexts: [0, 1, 2],
  },
  {
    name: "signup",
    description: "Post a signup embed with ticket button for an event",
    type: 1,
    default_member_permissions: "8",
    contexts: [0],
    options: [
      {
        type: 3,
        name: "slug",
        description: "Event slug (e.g. fight-night-1)",
        required: true,
      },
    ],
  },
  {
    name: "help",
    description: "Show available commands and how to use them",
    type: 1,
    contexts: [0, 1, 2],
  },
  {
    name: "divisionrankings",
    description: "Show top 10 division rankings as an image",
    type: 1,
    default_member_permissions: "8",
    contexts: [0],
    options: [
      {
        type: 3,
        name: "division",
        description: "Choose a weight division",
        required: true,
        choices: DIVISION_CHOICES,
      },
    ],
  },
  {
    name: "p4prankings",
    description: "Show pound-for-pound rankings as an image",
    type: 1,
    default_member_permissions: "8",
    contexts: [0],
  },
  {
    name: "emojistealbulk",
    description: "Bulk-steal custom emojis from other servers by pasting emoji references",
    type: 1,
    contexts: [0],
    options: [
      {
        type: 3,
        name: "emojis",
        description: "Paste emoji references, e.g. <:name:123> <a:name:456>",
        required: true,
      },
    ],
  },
  {
    name: "news",
    description: "Post the latest news articles with images to this channel",
    type: 1,
    default_member_permissions: "8",
    contexts: [0],
  },
  {
    name: "event",
    description: "Post event details with fight card and poster to this channel",
    type: 1,
    default_member_permissions: "8",
    contexts: [0],
    options: [
      {
        type: 3,
        name: "slug",
        description: "Event slug (optional — defaults to next upcoming event)",
        required: false,
      },
    ],
  },
  {
    name: "achievement",
    description: "View a fighter's earned achievements and milestones",
    type: 1,
    contexts: [0, 1, 2],
    options: [
      {
        type: 6,
        name: "user",
        description: "Discord user to look up (optional)",
        required: false,
      },
      {
        type: 3,
        name: "username",
        description: "Fighter name to look up (optional)",
        required: false,
      },
    ],
  },
  {
    name: "predict",
    description: "Predict who will win in an upcoming event",
    type: 1,
    contexts: [0, 1, 2],
    options: [
      {
        type: 3,
        name: "slug",
        description: "Event slug (e.g. fight-night-1)",
        required: true,
      },
      {
        type: 3,
        name: "fighter",
        description: "Fighter username you predict will win",
        required: true,
      },
    ],
  },
  {
    name: "predictions",
    description: "View prediction breakdown for an event",
    type: 1,
    contexts: [0, 1, 2],
    options: [
      {
        type: 3,
        name: "slug",
        description: "Event slug (e.g. fight-night-1)",
        required: true,
      },
    ],
  },
  {
    name: "video",
    description: "Watch a video from the library",
    type: 1,
    contexts: [0, 1, 2],
    options: [
      {
        type: 3,
        name: "id",
        description: "Video ID (slug) to watch",
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

/**
 * One-time script to register slash commands with Discord.
 *
 * Usage:
 *   npm run register
 *   (requires DISCORD_TOKEN and DISCORD_APPLICATION_ID in .dev.vars or env)
 */

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const TOKEN          = process.env["DISCORD_TOKEN"];

if (!APPLICATION_ID || !TOKEN) {
  console.error("Missing DISCORD_APPLICATION_ID or DISCORD_TOKEN env vars.");
  process.exit(1);
}

const commands = [
  {
    name: "crop",
    description: "Look up info about a Stardew Valley crop.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "name",
        description: "Crop name (e.g. Parsnip, Blueberry, Pumpkin)",
        required: true,
      },
    ],
  },
  {
    name: "gift",
    description: "Look up a villager's gift preferences.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "villager",
        description: "Villager name (e.g. Abigail, Harvey, Emily)",
        required: true,
      },
    ],
  },
  {
    name: "season",
    description: "List all crops harvestable in a given season.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "season",
        description: "Season name (Spring, Summer, Fall, or Winter)",
        required: true,
        choices: [
          { name: "Spring", value: "Spring" },
          { name: "Summer", value: "Summer" },
          { name: "Fall",   value: "Fall"   },
          { name: "Winter", value: "Winter" },
        ],
      },
    ],
  },
  {
    name: "fruit-tree",
    description: "Look up info about a Stardew Valley fruit tree.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "name",
        description: "Tree or fruit name (e.g. Apricot, Cherry, Peach)",
        required: true,
      },
    ],
  },
  {
    name: "bundle",
    description: "Look up the items required for a Community Center bundle.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 3, // STRING
        name: "name",
        description: "Bundle name (e.g. Spring Foraging, Construction, Artisan)",
        required: true,
      },
    ],
  },
  {
    name: "info",
    description: "Show the bot's data freshness and record counts.",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];

const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

const resp = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!resp.ok) {
  const text = await resp.text();
  console.error(`Failed to register commands (HTTP ${resp.status}):`, text);
  process.exit(1);
}

const registered = await resp.json() as Array<{ id: string; name: string }>;
console.log("Registered commands:");
for (const cmd of registered) {
  console.log(`  /${cmd.name} (id: ${cmd.id})`);
}

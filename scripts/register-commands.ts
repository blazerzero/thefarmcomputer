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
    name: "status",
    description: "Show the bot's data freshness and record counts.",
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

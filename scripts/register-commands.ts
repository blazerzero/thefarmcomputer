/**
 * One-time script to register slash commands with Discord.
 *
 * Usage:
 *   npm run register
 *   (requires DISCORD_TOKEN and DISCORD_APPLICATION_ID in .dev.vars or env)
 */

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const TOKEN = process.env["DISCORD_TOKEN"];

if (!APPLICATION_ID || !TOKEN) {
	console.error("Missing DISCORD_APPLICATION_ID or DISCORD_TOKEN env vars.");
	process.exit(1);
}

const commands = [
	{
		name: "book",
		description: "Look up a Stardew Valley book.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Book name (e.g. Price Catalogue, Animal Catalogue)",
				required: true,
			},
		],
	},
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
			{
				type: 3, // STRING
				name: "tier",
				description: "Filter to a specific gift tier",
				required: false,
				choices: [
					{ name: "❤️ Loved", value: "loved" },
					{ name: "😊 Liked", value: "liked" },
					{ name: "😐 Neutral", value: "neutral" },
					{ name: "😒 Disliked", value: "disliked" },
					{ name: "😡 Hated", value: "hated" },
				],
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
					{ name: "Fall", value: "Fall" },
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
		name: "fish",
		description: "Look up info about a Stardew Valley fish.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Fish name (e.g. Tuna, Salmon, Legend)",
				required: true,
			},
		],
	},
	{
		name: "forage",
		description: "Look up info about a forageable item in Stardew Valley.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Item name (e.g. Daffodil, Nautilus Shell, Red Mushroom)",
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
				description:
					"Bundle name (e.g. Spring Foraging, Construction, Artisan)",
				required: true,
			},
		],
	},
	{
		name: "mineral",
		description: "Look up info about a Stardew Valley mineral.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Mineral name (e.g. Quartz, Emerald, Frozen Geode)",
				required: true,
			},
		],
	},
	{
		name: "craft",
		description: "Look up a crafted item in Stardew Valley.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Item name (e.g. Chest, Furnace, Sprinkler, Scarecrow)",
				required: true,
			},
		],
	},
	{
		name: "ingredient",
		description: "Find all crafting recipes that use an item as an ingredient.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description:
					"Ingredient name (e.g. Wood, Stone, Iron Bar, Battery Pack)",
				required: true,
			},
		],
	},
	{
		name: "schedule",
		description: "Look up a villager's schedule.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "villager",
				description: "Villager name (e.g. Maru, Abigail, Harvey)",
				required: true,
			},
			{
				type: 3, // STRING
				name: "day",
				description:
					"Filter by occasion or day (e.g. Rain, Monday, Regular, Festival)",
				required: false,
			},
			{
				type: 3, // STRING
				name: "season",
				description:
					"Season group (defaults to Default for villagers without season-specific schedules)",
				required: false,
				choices: [
					{ name: "Default", value: "Default" },
					{ name: "Spring", value: "Spring" },
					{ name: "Summer", value: "Summer" },
					{ name: "Fall", value: "Fall" },
					{ name: "Winter", value: "Winter" },
					{ name: "Marriage", value: "Marriage" },
				],
			},
		],
	},
	{
		name: "monster",
		description: "Look up info about a Stardew Valley monster.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Monster name (e.g. Shadow Brute, Frost Bat, Green Slime)",
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
	{
		name: "ring",
		description: "Look up info about a Stardew Valley ring.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Ring name (e.g. Lucky Ring, Iridium Band, Glow Ring)",
				required: true,
			},
		],
	},
	{
		name: "weapon",
		description: "Look up info about a Stardew Valley weapon.",
		integration_types: [0, 1],
		contexts: [0, 1, 2],
		options: [
			{
				type: 3, // STRING
				name: "name",
				description: "Weapon name (e.g. Infinity Blade, Wood Club, Elf Blade)",
				required: true,
			},
		],
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

const registered = (await resp.json()) as Array<{ id: string; name: string }>;
console.log("Registered commands:");
for (const cmd of registered) {
	console.log(`  /${cmd.name} (id: ${cmd.id})`);
}

export {};

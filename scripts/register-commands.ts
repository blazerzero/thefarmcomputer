/**
 * One-time script to register slash commands with Discord.
 *
 * Usage:
 *   npm run register
 *   (requires DISCORD_TOKEN and DISCORD_APPLICATION_ID in .dev.vars or env)
 */

import { COMMAND_DESCRIPTIONS } from "@/constants.js";
import {
	COMMAND_CONTEXTS,
	COMMAND_INTEGRATION_TYPES,
	Command,
	OptionType,
} from "@/types.js";

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const TOKEN = process.env["DISCORD_TOKEN"];

if (!APPLICATION_ID || !TOKEN) {
	console.error("Missing DISCORD_APPLICATION_ID or DISCORD_TOKEN env vars.");
	process.exit(1);
}

const commands = [
	{
		name: Command.ARTISAN,
		description: COMMAND_DESCRIPTIONS[Command.ARTISAN],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description:
					"Artisan good name (e.g. Wine, Pickles, Truffle Oil)",
				required: true,
			},
		],
	},
	{
		name: Command.BOOK,
		description: COMMAND_DESCRIPTIONS[Command.BOOK],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Book name (e.g. Price Catalogue, Animal Catalogue)",
				required: true,
			},
		],
	},
	{
		name: Command.CROP,
		description: COMMAND_DESCRIPTIONS[Command.CROP],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Crop name (e.g. Parsnip, Blueberry, Pumpkin)",
				required: true,
			},
		],
	},
	{
		name: Command.GIFT,
		description: COMMAND_DESCRIPTIONS[Command.GIFT],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "villager",
				description: "Villager name (e.g. Abigail, Harvey, Emily)",
				required: true,
			},
			{
				type: OptionType.STRING,
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
		name: Command.SEASON,
		description: COMMAND_DESCRIPTIONS[Command.SEASON],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
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
		name: Command.FRUIT_TREE,
		description: COMMAND_DESCRIPTIONS[Command.FRUIT_TREE],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Tree or fruit name (e.g. Apricot, Cherry, Peach)",
				required: true,
			},
		],
	},
	{
		name: Command.FISH,
		description: COMMAND_DESCRIPTIONS[Command.FISH],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Fish name (e.g. Tuna, Salmon, Legend)",
				required: true,
			},
		],
	},
	{
		name: Command.FORAGE,
		description: COMMAND_DESCRIPTIONS[Command.FORAGE],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Item name (e.g. Daffodil, Nautilus Shell, Red Mushroom)",
				required: true,
			},
		],
	},
	{
		name: Command.BUNDLE,
		description: COMMAND_DESCRIPTIONS[Command.BUNDLE],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description:
					"Bundle name (e.g. Spring Foraging, Construction, Artisan)",
				required: true,
			},
		],
	},
	{
		name: Command.MINERAL,
		description: COMMAND_DESCRIPTIONS[Command.MINERAL],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Mineral name (e.g. Quartz, Emerald, Frozen Geode)",
				required: true,
			},
		],
	},
	{
		name: Command.CRAFT,
		description: COMMAND_DESCRIPTIONS[Command.CRAFT],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Item name (e.g. Chest, Furnace, Sprinkler, Scarecrow)",
				required: true,
			},
		],
	},
	{
		name: Command.INGREDIENT,
		description: COMMAND_DESCRIPTIONS[Command.INGREDIENT],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description:
					"Ingredient name (e.g. Wood, Stone, Iron Bar, Battery Pack)",
				required: true,
			},
		],
	},
	{
		name: Command.SCHEDULE,
		description: COMMAND_DESCRIPTIONS[Command.SCHEDULE],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "villager",
				description: "Villager name (e.g. Maru, Abigail, Harvey)",
				required: true,
			},
			{
				type: OptionType.STRING,
				name: "day",
				description:
					"Filter by occasion or day (e.g. Rain, Monday, Regular, Festival)",
				required: false,
			},
			{
				type: OptionType.STRING,
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
		name: Command.MONSTER,
		description: COMMAND_DESCRIPTIONS[Command.MONSTER],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Monster name (e.g. Shadow Brute, Frost Bat, Green Slime)",
				required: true,
			},
		],
	},
	{
		name: Command.FOOTWEAR,
		description: COMMAND_DESCRIPTIONS[Command.FOOTWEAR],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description:
					"Footwear name (e.g. Sneakers, Genie Shoes, Emily's Magic Boots)",
				required: true,
			},
		],
	},
	{
		name: Command.INFO,
		description: COMMAND_DESCRIPTIONS[Command.INFO],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
	},
	{
		name: Command.RECIPE,
		description: COMMAND_DESCRIPTIONS[Command.RECIPE],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Recipe name (e.g. Fried Egg, Salad, Chowder)",
				required: true,
			},
		],
	},
	{
		name: Command.RING,
		description: COMMAND_DESCRIPTIONS[Command.RING],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
				name: "name",
				description: "Ring name (e.g. Lucky Ring, Iridium Band, Glow Ring)",
				required: true,
			},
		],
	},
	{
		name: Command.WEAPON,
		description: COMMAND_DESCRIPTIONS[Command.WEAPON],
		integration_types: COMMAND_INTEGRATION_TYPES,
		contexts: COMMAND_CONTEXTS,
		options: [
			{
				type: OptionType.STRING,
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

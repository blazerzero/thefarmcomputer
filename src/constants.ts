import { Command } from "./types.js";

export const COMMAND_DESCRIPTIONS: Record<Command, string> = {
	[Command.ARTIFACT]: "Look up an artifact.",
	[Command.ARTISAN]: "Look up an artisan good.",
	[Command.BOOK]: "Look up a book.",
	[Command.BUNDLE]: "Look up the items required for a Community Center bundle.",
	[Command.CRAFT]: "Look up a crafted item.",
	[Command.CRYSTALARIUM]:
		"Look up a mineral's Crystalarium processing time and gold-per-day rate.",
	[Command.DECONSTRUCT]: "Look up what a Deconstructor yields from an item.",
	[Command.CROP]: "Look up info about a crop.",
	[Command.FISH]: "Look up info about a fish.",
	[Command.FOOTWEAR]: "Look up info about a piece of footwear.",
	[Command.FORAGE]: "Look up info about a forageable item.",
	[Command.FRUIT]: "Look up info about a fruit item.",
	[Command.FRUIT_TREE]: "Look up info about a fruit tree.",
	[Command.GIFT]: "Look up a villager's gift preferences.",
	[Command.INFO]: "Show the bot's data freshness and record counts.",
	[Command.INGREDIENT]:
		"Find all crafting recipes that use the given item as an ingredient.",
	[Command.MINERAL]: "Look up info about a mineral.",
	[Command.MONSTER]: "Look up info about a monster.",
	[Command.RECIPE]: "Look up a cooked food recipe.",
	[Command.RING]: "Look up info about a ring.",
	[Command.SCHEDULE]: "Look up a villager's schedule.",
	[Command.SEASON]: "List all crops harvestable in a given season.",
	[Command.TOOL]: "Look up info about a tool.",
	[Command.WEAPON]: "Look up info about a weapon.",
};

export const SEASONS: readonly string[] = [
	"Spring",
	"Summer",
	"Fall",
	"Winter",
];
export type Season = "Spring" | "Summer" | "Fall" | "Winter";

export const SEASON_COLORS: Record<string, number> = {
	Spring: 0x78b84a,
	Summer: 0xe8c13a,
	Fall: 0xd2691e,
	Winter: 0x89cff0,
};

export const DEFAULT_COLOR = 0x5b8a3c;

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

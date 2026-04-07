/** A crop row as stored in D1. */
export interface CropRow {
	id?: number;
	name: string;
	description: string | null;
	seasons: string; // JSON array string, e.g. '["Spring"]'
	growth_days: number | null;
	regrowth_days: number | null;
	sell_price: number | null;
	sell_price_silver: number | null;
	sell_price_gold: number | null;
	sell_price_iridium: number | null;
	buy_price: number | null;
	is_trellis: number; // 0 or 1
	energy: number | null;
	energy_silver: number | null;
	energy_gold: number | null;
	energy_iridium: number | null;
	health: number | null;
	health_silver: number | null;
	health_gold: number | null;
	health_iridium: number | null;
	used_in: string; // JSON array of item/recipe names
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A crop row with seasons and used_in already decoded. */
export interface Crop extends Omit<CropRow, "seasons" | "used_in"> {
	seasons: string[];
	used_in: string[];
}

/** A single time+location entry in a villager's schedule. */
export interface ScheduleEntry {
	time: string;
	location: string;
}

/** A villager row as stored in D1. */
export interface VillagerRow {
	id?: number;
	name: string;
	birthday: string;
	loved_gifts: string; // JSON array string
	liked_gifts: string;
	neutral_gifts: string;
	disliked_gifts: string;
	hated_gifts: string;
	schedule: string; // JSON: Record<season, Record<occasion, ScheduleEntry[]>>
	wiki_url: string;
	image_url: string;
	last_updated: string;
}

/** A villager row with gift lists already decoded. */
export interface Villager
	extends Omit<
		VillagerRow,
		| "loved_gifts"
		| "liked_gifts"
		| "neutral_gifts"
		| "disliked_gifts"
		| "hated_gifts"
	> {
	loved_gifts: string[];
	liked_gifts: string[];
	neutral_gifts: string[];
	disliked_gifts: string[];
	hated_gifts: string[];
}

/** A fruit tree row as stored in D1. */
export interface FruitTreeRow {
	id?: number;
	name: string; // e.g. "Apricot Tree"
	season: string; // "Spring" | "Summer" | "Fall" | "Winter"
	growth_days: number | null;
	sapling_price: number | null; // Pierre's price
	fruit_name: string | null; // e.g. "Apricot"
	sell_price: number | null;
	sell_price_silver: number | null;
	sell_price_gold: number | null;
	sell_price_iridium: number | null;
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A fruit tree row (no JSON fields to decode). */
export interface FruitTree extends FruitTreeRow {}

/** A fish row as stored in D1. */
export interface FishRow {
	id?: number;
	name: string;
	category: string; // "Fishing Pole" | "Night Market" | "Legendary" | "Legendary II" | "Crab Pot"
	description: string | null;
	sell_price: number | null;
	sell_price_silver: number | null;
	sell_price_gold: number | null;
	sell_price_iridium: number | null;
	location: string | null;
	time: string | null; // "Anytime" or e.g. "6am – 7pm"
	seasons: string; // JSON array string, e.g. '["Summer","Fall"]'
	weather: string | null; // "Any" | "Sun" | "Rain" etc.
	min_size: number | null;
	max_size: number | null;
	difficulty: number | null;
	behavior: string | null; // "dart" | "mixed" | "smooth" | "sinker" | "floater"
	base_xp: number | null;
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A single item required by a Community Center bundle. */
export interface BundleItem {
	name: string;
	quantity: number;
	quality?: "Silver" | "Gold";
}

/** A bundle row as stored in D1. */
export interface BundleRow {
	id?: number;
	name: string;
	room: string;
	items: string; // JSON array of BundleItem
	items_required: number; // may be less than items.length for choice bundles
	reward: string;
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A fish row with seasons already decoded. */
export interface Fish extends Omit<FishRow, "seasons"> {
	seasons: string[];
}

/** A bundle row with items already decoded. */
export interface Bundle extends Omit<BundleRow, "items"> {
	items: BundleItem[];
}

/** A forageable item row as stored in D1. */
export interface ForageableRow {
	id?: number;
	name: string;
	seasons: string; // JSON array, e.g. '["Spring"]' or '[]' for always available
	locations: string; // JSON array, e.g. '["Secret Woods (78%)"]' or '["The Beach"]'
	sell_price: number | null;
	sell_price_silver: number | null;
	sell_price_gold: number | null;
	sell_price_iridium: number | null;
	energy: number | null; // can be negative (e.g. Red Mushroom = -50)
	energy_silver: number | null;
	energy_gold: number | null;
	energy_iridium: number | null;
	health: number | null; // can be negative
	health_silver: number | null;
	health_gold: number | null;
	health_iridium: number | null;
	used_in: string; // JSON array of item/recipe names
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A forageable item row with seasons, locations, and used_in already decoded. */
export interface Forageable
	extends Omit<ForageableRow, "seasons" | "locations" | "used_in"> {
	seasons: string[];
	locations: string[];
	used_in: string[];
}

/** A fruit item row as stored in D1. */
export interface FruitRow {
	id?: number;
	name: string;
	source: string; // JSON array, e.g. ["Farming"], ["Fruit Tree"]
	seasons: string; // JSON array
	sell_price: number | null;
	sell_price_silver: number | null;
	sell_price_gold: number | null;
	sell_price_iridium: number | null;
	energy: number | null; // null for Farming/Foraging sources (tracked elsewhere)
	energy_silver: number | null;
	energy_gold: number | null;
	energy_iridium: number | null;
	health: number | null;
	health_silver: number | null;
	health_gold: number | null;
	health_iridium: number | null;
	tiller_boost: number; // 1 if fruit benefits from Tiller profession
	bears_knowledge_boost: number; // 1 if fruit benefits from Bear's Knowledge
	artisan_prices: string; // JSON object: { "tier_type": price_in_gold }
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A fruit item row with seasons, source, and used_in already decoded. */
export interface Fruit
	extends Omit<
		FruitRow,
		| "source"
		| "seasons"
		| "tiller_boost"
		| "bears_knowledge_boost"
		| "artisan_prices"
	> {
	source: string[];
	seasons: string[];
	tiller_boost: boolean;
	bears_knowledge_boost: boolean;
	artisan_prices: Record<string, number>;
}

/** A mineral row as stored in SQLite. */
export interface MineralRow {
	id?: number;
	name: string;
	category: string; // "Foraged Mineral" | "Gem" | "Geode"
	description: string | null;
	sell_price: number | null;
	sell_price_gemologist: number | null; // null for Geodes (no Gemologist bonus)
	source: string; // JSON array of source locations
	used_in: string; // JSON array of item/recipe names
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A mineral row with source and used_in already decoded. */
export interface Mineral extends Omit<MineralRow, "source" | "used_in"> {
	source: string[];
	used_in: string[];
}

/** A single ingredient in a crafting recipe. */
export interface CraftIngredient {
	name: string;
	quantity: number;
}

/** A crafted item row as stored in SQLite. */
export interface CraftedItemRow {
	id?: number;
	name: string;
	description: string | null;
	duration_days: number | null; // null if item has no duration (e.g. consumables)
	duration_seasons: string | null; // e.g. "Any" or "Spring, Summer, Fall, Winter"
	radius: number | null; // e.g. 3 for Quality Sprinkler
	ingredients: string; // JSON array of CraftIngredient
	energy: number | null;
	health: number | null;
	recipe_source: string | null; // e.g. "Crafting (Level 6)" or "Robin (6 hearts)"
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A crafted item row with ingredients already decoded. */
export interface CraftedItem extends Omit<CraftedItemRow, "ingredients"> {
	ingredients: CraftIngredient[];
}

/** A monster or monster variation row as stored in SQLite. */
export interface MonsterRow {
	id?: number;
	name: string;
	location: string | null; // e.g. "The Mines (Floors 1-29), Secret Woods"
	hp: string | null; // TEXT because can be "3 × original slime"
	damage: string | null;
	defense: string | null;
	speed: string | null;
	xp: string | null;
	drops: string; // JSON array of drop strings
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A monster row with drops already decoded. */
export interface Monster extends Omit<MonsterRow, "drops"> {
	drops: string[];
}

/** A book row as stored in SQLite. */
export interface BookRow {
	id?: number;
	name: string;
	description: string | null;
	subsequent_reading: string | null; // null when no subsequent reading effect
	location: string; // JSON array of location strings
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A book row with location already decoded. */
export interface Book extends Omit<BookRow, "location"> {
	location: string[];
}

/** A weapon row as stored in SQLite. */
export interface WeaponRow {
	id?: number;
	name: string;
	category: string; // "Sword" | "Dagger" | "Club" | etc.
	min_damage: number | null;
	max_damage: number | null;
	speed: number | null;
	defense: number | null;
	weight: number | null;
	crit_chance: number | null; // 0–100 scale (e.g. 2.0 for 2%)
	crit_power: number | null;
	level: number | null;
	sell_price: number | null;
	purchase_price: number | null;
	location: string | null;
	description: string | null;
	extra_stats: string | null; // JSON: Array<{name: string, value: string}>
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A weapon row (no JSON fields to decode). */
export interface Weapon extends WeaponRow {}

/** A cooked food recipe row as stored in SQLite. */
export interface RecipeRow {
	id?: number;
	name: string;
	description: string | null;
	ingredients: string; // JSON array of CraftIngredient
	energy: number | null;
	health: number | null;
	buffs: string | null; // plain text, e.g. "Farming +2, Mining +1"
	buff_duration: string | null; // JSON: string[], e.g. ["7m 41s", "3m 30s"]
	recipe_source: string | null; // e.g. "Queen of Sauce (Spring 28, Year 1)"
	sell_price: number | null;
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A footwear row as stored in SQLite. */
export interface FootwearRow {
	id?: number;
	name: string;
	stats: string | null; // JSON: string[], e.g. ["Defense +4", "Immunity +2"]
	description: string | null;
	purchase_price: number | null;
	sell_price: number | null;
	source: string | null; // JSON: string[]
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A cooked food recipe row with ingredients and buff_duration already decoded. */
export interface Recipe
	extends Omit<RecipeRow, "ingredients" | "buff_duration"> {
	ingredients: CraftIngredient[];
	buff_duration: string[];
}

/** A ring row as stored in SQLite. */
export interface RingRow {
	id?: number;
	name: string;
	description: string | null;
	sell_price: number | null;
	effects: string | null;
	where_to_find: string; // JSON array of source strings
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A footwear row with stats and source decoded to string[]. */
export interface Footwear extends Omit<FootwearRow, "stats" | "source"> {
	stats: string[];
	source: string[];
}

/** A ring row with where_to_find already decoded. */
export interface Ring extends Omit<RingRow, "where_to_find"> {
	where_to_find: string[];
}

/** An artifact row as stored in SQLite. */
export interface ArtifactRow {
	id?: number;
	name: string;
	description: string | null;
	sell_price: number | null;
	location: string; // JSON array of location strings
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** An artifact row with location already decoded. */
export interface Artifact extends Omit<ArtifactRow, "location"> {
	location: string[];
}

/** An artisan good row as stored in SQLite. */
export interface ArtisanGoodRow {
	id?: number;
	name: string;
	machine: string | null;
	description: string | null;
	ingredients: string | null; // plain text, not JSON
	processing_time: string | null;
	sell_price: string | null;
	energy: string | null;
	health: string | null;
	buffs: string | null;
	cask_days_to_silver: number | null;
	cask_days_to_gold: number | null;
	cask_days_to_iridium: number | null;
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** An artisan good row (no JSON fields to decode). */
export interface ArtisanGood
	extends Omit<ArtisanGoodRow, "ingredients" | "buffs"> {
	ingredients: string[];
	buffs: string[];
}

/** A deconstructor item row as stored in SQLite. */
export interface DeconstructorItemRow {
	id?: number;
	name: string;
	sell_price: string | null;
	deconstructed_items: string | null; // JSON: [{name, quantity}]
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A deconstructor item row with deconstructed_items decoded. */
export interface DeconstructorItem
	extends Omit<DeconstructorItemRow, "deconstructed_items"> {
	deconstructed_items: Array<{ name: string; quantity: number }>;
}

/** Energy and health values for an item, including quality-tiered values if applicable. */
export type EnergyHealthStats = {
	energy: number | null;
	energy_silver: number | null;
	energy_gold: number | null;
	energy_iridium: number | null;
	health: number | null;
	health_silver: number | null;
	health_gold: number | null;
	health_iridium: number | null;
};

/** A tool row as stored in SQLite. */
export interface ToolRow {
	id?: number;
	name: string;
	category: string | null; // "Hoe" | "Pickaxe" | "Watering Can" | "Axe" | "Fishing Rod" | "Pan" | "Scythe"
	description: string | null;
	cost: string | null; // plain text purchase/upgrade cost, e.g. "2,000g" or "5 Copper Bar (2,000g)"
	ingredients: string | null; // plain text upgrade materials
	improvements: string | null; // plain text: what this tier unlocks/improves
	location: string | null; // where to obtain
	requirements: string | null; // special requirements to obtain
	image_url: string | null;
	wiki_url: string;
	last_updated: string;
}

/** A tool row (no JSON fields to decode). */
export interface Tool
	extends Omit<
		ToolRow,
		"ingredients" | "improvements" | "location" | "requirements"
	> {
	ingredients: string[];
	improvements: string[];
	location: string[];
	requirements: string[];
}

/** Discord slash command names. */
export enum Command {
	ARTIFACT = "artifact",
	ARTISAN = "artisan",
	BOOK = "book",
	BUNDLE = "bundle",
	CRAFT = "craft",
	DECONSTRUCT = "deconstruct",
	CROP = "crop",
	FISH = "fish",
	FOOTWEAR = "footwear",
	FORAGE = "forage",
	FRUIT = "fruit",
	FRUIT_TREE = "fruit-tree",
	GIFT = "gift",
	INFO = "info",
	INGREDIENT = "ingredient",
	MINERAL = "mineral",
	MONSTER = "monster",
	RECIPE = "recipe",
	RING = "ring",
	SCHEDULE = "schedule",
	SEASON = "season",
	TOOL = "tool",
	WEAPON = "weapon",
}

/** Discord interaction types. */
export enum InteractionType {
	PING = 1,
	APPLICATION_COMMAND = 2,
}

/** Discord interaction response types. */
export enum InteractionResponseType {
	PONG = 1,
	CHANNEL_MESSAGE_WITH_SOURCE = 4,
}

/** Where a command can be installed (application-level integration_types). */
export enum IntegrationType {
	GUILD_INSTALL = 0,
	USER_INSTALL = 1,
}

/** Surfaces where a command can be used (application-level contexts). */
export enum InteractionContext {
	GUILD = 0,
	BOT_DM = 1,
	PRIVATE_DM = 2,
}

/** Discord application command option types. */
export enum OptionType {
	STRING = 3,
}

/** Standard integration_types value for all bot commands: guild + user install. */
export const COMMAND_INTEGRATION_TYPES = [
	IntegrationType.GUILD_INSTALL,
	IntegrationType.USER_INSTALL,
] as const;

/** Standard contexts value for all bot commands: guild, bot DM, and private DM. */
export const COMMAND_CONTEXTS = [
	InteractionContext.GUILD,
	InteractionContext.BOT_DM,
	InteractionContext.PRIVATE_DM,
] as const;

/** Cloudflare Worker environment bindings. */
export interface Env {
  ASSETS: Fetcher;
  STARDEW_DO: DurableObjectNamespace;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  BOT_OWNER_TOKEN: string;
  OVERRIDE_DISCORD_AUTH?: string;  // For testing: if set to true, skip signature verification and auth checks.
}

/** A crop row as stored in D1. */
export interface CropRow {
  id?: number;
  name: string;
  seasons: string;       // JSON array string, e.g. '["Spring"]'
  growth_days: number | null;
  regrowth_days: number | null;
  sell_price: number | null;
  sell_price_silver: number | null;
  sell_price_gold: number | null;
  sell_price_iridium: number | null;
  buy_price: number | null;
  is_trellis: number;    // 0 or 1
  image_url: string | null;
  wiki_url: string;
  last_updated: string;
}

/** A crop row with seasons already decoded. */
export interface Crop extends Omit<CropRow, "seasons"> {
  seasons: string[];
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
  loved_gifts: string;     // JSON array string
  liked_gifts: string;
  neutral_gifts: string;
  disliked_gifts: string;
  hated_gifts: string;
  schedule: string;        // JSON: Record<season, Record<occasion, ScheduleEntry[]>>
  wiki_url: string;
  image_url: string;
  last_updated: string;
}

/** A villager row with gift lists already decoded. */
export interface Villager extends Omit<VillagerRow,
  "loved_gifts" | "liked_gifts" | "neutral_gifts" | "disliked_gifts" | "hated_gifts"
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
  name: string;                    // e.g. "Apricot Tree"
  season: string;                  // "Spring" | "Summer" | "Fall" | "Winter"
  growth_days: number | null;
  sapling_price: number | null;    // Pierre's price
  fruit_name: string | null;       // e.g. "Apricot"
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
  category: string;             // "Fishing Pole" | "Night Market" | "Legendary" | "Legendary II" | "Crab Pot"
  description: string | null;
  sell_price: number | null;
  sell_price_silver: number | null;
  sell_price_gold: number | null;
  sell_price_iridium: number | null;
  location: string | null;
  time: string | null;          // "Anytime" or e.g. "6am – 7pm"
  seasons: string;              // JSON array string, e.g. '["Summer","Fall"]'
  weather: string | null;       // "Any" | "Sun" | "Rain" etc.
  min_size: number | null;
  max_size: number | null;
  difficulty: number | null;
  behavior: string | null;      // "dart" | "mixed" | "smooth" | "sinker" | "floater"
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
  items: string;          // JSON array of BundleItem
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
  seasons: string;        // JSON array, e.g. '["Spring"]' or '[]' for always available
  locations: string;      // JSON array, e.g. '["Secret Woods (78%)"]' or '["The Beach"]'
  sell_price: number | null;
  sell_price_silver: number | null;
  sell_price_gold: number | null;
  sell_price_iridium: number | null;
  energy: number | null;  // can be negative (e.g. Red Mushroom = -50)
  health: number | null;  // can be negative
  used_in: string;        // JSON array of item/recipe names
  image_url: string | null;
  wiki_url: string;
  last_updated: string;
}

/** A forageable item row with seasons, locations, and used_in already decoded. */
export interface Forageable extends Omit<ForageableRow, "seasons" | "locations" | "used_in"> {
  seasons: string[];
  locations: string[];
  used_in: string[];
}

/** A mineral row as stored in SQLite. */
export interface MineralRow {
  id?: number;
  name: string;
  category: string;                    // "Foraged Mineral" | "Gem" | "Geode"
  description: string | null;
  sell_price: number | null;
  sell_price_gemologist: number | null; // null for Geodes (no Gemologist bonus)
  source: string;                       // JSON array of source locations
  used_in: string;                      // JSON array of item/recipe names
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
  duration_days: number | null;     // null if item has no duration (e.g. consumables)
  duration_seasons: string | null;  // e.g. "Any" or "Spring, Summer, Fall, Winter"
  radius: number | null;            // e.g. 3 for Quality Sprinkler
  ingredients: string;              // JSON array of CraftIngredient
  energy: number | null;
  health: number | null;
  recipe_source: string | null;     // e.g. "Crafting (Level 6)" or "Robin (6 hearts)"
  image_url: string | null;
  wiki_url: string;
  last_updated: string;
}

/** A crafted item row with ingredients already decoded. */
export interface CraftedItem extends Omit<CraftedItemRow, "ingredients"> {
  ingredients: CraftIngredient[];
}

/** Discord interaction types. */
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

/** Discord interaction response types. */
export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

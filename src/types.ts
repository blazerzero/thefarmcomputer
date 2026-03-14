/** Cloudflare Worker environment bindings. */
export interface Env {
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
  wiki_url: string;
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

/** A bundle row with items already decoded. */
export interface Bundle extends Omit<BundleRow, "items"> {
  items: BundleItem[];
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

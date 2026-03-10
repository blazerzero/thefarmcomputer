/** Cloudflare Worker environment bindings. */
export interface Env {
  STARDEW_DO: DurableObjectNamespace;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  BOT_OWNER_TOKEN: string;
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

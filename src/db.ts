import type { Crop, CropRow, Villager, VillagerRow } from "./types.js";

const now = () => new Date().toISOString();

// ── Crops ─────────────────────────────────────────────────────────────────────

export async function getCrop(db: D1Database, name: string): Promise<Crop | null> {
  const row = await db
    .prepare("SELECT * FROM crops WHERE name LIKE ? LIMIT 1")
    .bind(`%${name}%`)
    .first<CropRow>();

  if (!row) return null;
  return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
}

export async function upsertCrop(db: D1Database, data: Omit<CropRow, "id" | "last_updated">): Promise<void> {
  await db
    .prepare(`
      INSERT INTO crops (name, seasons, growth_days, regrowth_days, sell_price,
                         buy_price, is_trellis, wiki_url, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        seasons       = excluded.seasons,
        growth_days   = excluded.growth_days,
        regrowth_days = excluded.regrowth_days,
        sell_price    = excluded.sell_price,
        buy_price     = excluded.buy_price,
        is_trellis    = excluded.is_trellis,
        wiki_url      = excluded.wiki_url,
        last_updated  = excluded.last_updated
    `)
    .bind(
      data.name, data.seasons, data.growth_days, data.regrowth_days,
      data.sell_price, data.buy_price, data.is_trellis, data.wiki_url, now(),
    )
    .run();
}

// ── Villagers ─────────────────────────────────────────────────────────────────

export async function getVillager(db: D1Database, name: string): Promise<Villager | null> {
  const row = await db
    .prepare("SELECT * FROM villagers WHERE name LIKE ? LIMIT 1")
    .bind(`%${name}%`)
    .first<VillagerRow>();

  if (!row) return null;
  return {
    ...row,
    loved_gifts:    JSON.parse(row.loved_gifts    || "[]") as string[],
    liked_gifts:    JSON.parse(row.liked_gifts    || "[]") as string[],
    neutral_gifts:  JSON.parse(row.neutral_gifts  || "[]") as string[],
    disliked_gifts: JSON.parse(row.disliked_gifts || "[]") as string[],
    hated_gifts:    JSON.parse(row.hated_gifts    || "[]") as string[],
  };
}

export async function upsertVillager(
  db: D1Database,
  data: Omit<VillagerRow, "id" | "last_updated">,
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO villagers (name, birthday, loved_gifts, liked_gifts, neutral_gifts,
                             disliked_gifts, hated_gifts, wiki_url, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        birthday       = excluded.birthday,
        loved_gifts    = excluded.loved_gifts,
        liked_gifts    = excluded.liked_gifts,
        neutral_gifts  = excluded.neutral_gifts,
        disliked_gifts = excluded.disliked_gifts,
        hated_gifts    = excluded.hated_gifts,
        wiki_url       = excluded.wiki_url,
        last_updated   = excluded.last_updated
    `)
    .bind(
      data.name, data.birthday,
      data.loved_gifts, data.liked_gifts, data.neutral_gifts,
      data.disliked_gifts, data.hated_gifts,
      data.wiki_url, now(),
    )
    .run();
}

export async function countCrops(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) as n FROM crops").first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countVillagers(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) as n FROM villagers").first<{ n: number }>();
  return row?.n ?? 0;
}

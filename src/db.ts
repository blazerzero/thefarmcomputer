import type { Crop, CropRow, Villager, VillagerRow } from "./types.js";

const now = () => new Date().toISOString();

// ── Schema ────────────────────────────────────────────────────────────────────

export function initDb(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS crops (
      id            INTEGER PRIMARY KEY,
      name          TEXT UNIQUE NOT NULL,
      seasons       TEXT,
      growth_days   INTEGER,
      regrowth_days INTEGER,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      buy_price          INTEGER,
      is_trellis    INTEGER,
      wiki_url      TEXT,
      last_updated  TEXT
    )
  `);
  // Add quality price columns to existing instances that predate this schema change.
  // ALTER TABLE throws if the column already exists; swallow that error.
  for (const col of ["sell_price_silver", "sell_price_gold", "sell_price_iridium"]) {
    try { sql.exec(`ALTER TABLE crops ADD COLUMN ${col} INTEGER`); } catch { /* already exists */ }
  }

  sql.exec(`
    CREATE TABLE IF NOT EXISTS villagers (
      id             INTEGER PRIMARY KEY,
      name           TEXT UNIQUE NOT NULL,
      birthday       TEXT,
      loved_gifts    TEXT,
      liked_gifts    TEXT,
      neutral_gifts  TEXT,
      disliked_gifts TEXT,
      hated_gifts    TEXT,
      wiki_url       TEXT,
      last_updated   TEXT
    )
  `);
}

// ── Crops ─────────────────────────────────────────────────────────────────────

export function getCrop(sql: SqlStorage, name: string): Crop | null {
  // SqlStorageCursor.one() returns Record<string, SqlStorageValue> — cast to our type
  const row = sql
    .exec("SELECT * FROM crops WHERE name LIKE ? LIMIT 1", `%${name}%`)
    .one() as unknown as CropRow | null;
  if (!row) return null;
  return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
}

export function upsertCrop(sql: SqlStorage, data: Omit<CropRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO crops
       (name, seasons, growth_days, regrowth_days,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        buy_price, is_trellis, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       seasons            = excluded.seasons,
       growth_days        = excluded.growth_days,
       regrowth_days      = excluded.regrowth_days,
       sell_price         = excluded.sell_price,
       sell_price_silver  = excluded.sell_price_silver,
       sell_price_gold    = excluded.sell_price_gold,
       sell_price_iridium = excluded.sell_price_iridium,
       buy_price          = excluded.buy_price,
       is_trellis         = excluded.is_trellis,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
    data.name, data.seasons, data.growth_days, data.regrowth_days,
    data.sell_price, data.sell_price_silver, data.sell_price_gold, data.sell_price_iridium,
    data.buy_price, data.is_trellis, data.wiki_url, now(),
  );
}

// ── Villagers ─────────────────────────────────────────────────────────────────

export function getVillager(sql: SqlStorage, name: string): Villager | null {
  const row = sql
    .exec("SELECT * FROM villagers WHERE name LIKE ? LIMIT 1", `%${name}%`)
    .one() as unknown as VillagerRow | null;
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

export function upsertVillager(
  sql: SqlStorage,
  data: Omit<VillagerRow, "id" | "last_updated">,
): void {
  sql.exec(
    `INSERT INTO villagers
       (name, birthday, loved_gifts, liked_gifts, neutral_gifts,
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
       last_updated   = excluded.last_updated`,
    data.name, data.birthday,
    data.loved_gifts, data.liked_gifts, data.neutral_gifts,
    data.disliked_gifts, data.hated_gifts,
    data.wiki_url, now(),
  );
}

// ── Counts ────────────────────────────────────────────────────────────────────

export function countCrops(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM crops").one() as { n: number } | null)?.n ?? 0;
}

export function countVillagers(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM villagers").one() as { n: number } | null)?.n ?? 0;
}

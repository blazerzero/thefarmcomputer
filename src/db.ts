import type { Bundle, BundleItem, BundleRow, Crop, CropRow, Forageable, ForageableRow, Fish, FishRow, FruitTree, FruitTreeRow, Mineral, MineralRow, Villager, VillagerRow } from "./types";

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
      image_url     TEXT,
      wiki_url      TEXT,
      last_updated  TEXT
    )
  `);
  // Add quality price columns to existing instances that predate this schema change.
  // ALTER TABLE throws if the column already exists; swallow that error.
  for (const col of ["sell_price_silver", "sell_price_gold", "sell_price_iridium", "image_url"]) {
    try { sql.exec(`ALTER TABLE crops ADD COLUMN ${col} ${col === "image_url" ? "TEXT" : "INTEGER"}`); } catch { /* already exists */ }
  }

  sql.exec(`
    CREATE TABLE IF NOT EXISTS fruit_trees (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      season             TEXT,
      growth_days        INTEGER,
      sapling_price      INTEGER,
      fruit_name         TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS fish (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      category           TEXT,
      description        TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      location           TEXT,
      time               TEXT,
      seasons            TEXT,
      weather            TEXT,
      min_size           INTEGER,
      max_size           INTEGER,
      difficulty         INTEGER,
      behavior           TEXT,
      base_xp            INTEGER,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      id             INTEGER PRIMARY KEY,
      name           TEXT UNIQUE NOT NULL,
      room           TEXT NOT NULL,
      items          TEXT NOT NULL,
      items_required INTEGER NOT NULL,
      reward         TEXT NOT NULL,
      image_url      TEXT,
      wiki_url       TEXT,
      last_updated   TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS forageables (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      seasons            TEXT,
      locations          TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      energy             INTEGER,
      health             INTEGER,
      used_in            TEXT,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS minerals (
      id                    INTEGER PRIMARY KEY,
      name                  TEXT UNIQUE NOT NULL,
      category              TEXT,
      description           TEXT,
      sell_price            INTEGER,
      sell_price_gemologist INTEGER,
      source                TEXT,
      used_in               TEXT,
      image_url             TEXT,
      wiki_url              TEXT,
      last_updated          TEXT
    )
  `);

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

export function getCropsBySeason(sql: SqlStorage, season: string): Crop[] {
  try {
    const rows = sql
      .exec("SELECT * FROM crops WHERE seasons LIKE ? ORDER BY name ASC", `%${season}%`)
      .toArray() as unknown as CropRow[];
    return rows.map((row) => ({ ...row, seasons: JSON.parse(row.seasons || "[]") as string[] }));
  } catch (err) {
    console.error("DB error in getCropsBySeason:", err);
    return [];
  }
}

export function getCrop(sql: SqlStorage, name: string): Crop | null {
  // SqlStorageCursor.one() returns Record<string, SqlStorageValue> — cast to our type
  try {
    const row = sql
      .exec("SELECT * FROM crops WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as CropRow | null;
    if (!row) return null;
    return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
  } catch (err) {
    console.error("DB error in getCrop:", err);
    return null;
  }
}

export function upsertCrop(sql: SqlStorage, data: Omit<CropRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO crops
       (name, seasons, growth_days, regrowth_days,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        buy_price, is_trellis, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
    data.name, data.seasons, data.growth_days, data.regrowth_days,
    data.sell_price, data.sell_price_silver, data.sell_price_gold, data.sell_price_iridium,
    data.buy_price, data.is_trellis, data.image_url, data.wiki_url, now(),
  );
}

// ── Fruit Trees ───────────────────────────────────────────────────────────────

export function getFruitTree(sql: SqlStorage, name: string): FruitTree | null {
  try {
    const row = sql
      .exec("SELECT * FROM fruit_trees WHERE name LIKE ? OR fruit_name LIKE ? LIMIT 1", `%${name}%`, `%${name}%`)
      .one() as unknown as FruitTreeRow | null;
    if (!row) return null;
    return { ...row };
  } catch (err) {
    console.error("DB error in getFruitTree:", err);
    return null;
  }
}

export function upsertFruitTree(sql: SqlStorage, data: Omit<FruitTreeRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO fruit_trees
       (name, season, growth_days, sapling_price, fruit_name,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       season             = excluded.season,
       growth_days        = excluded.growth_days,
       sapling_price      = excluded.sapling_price,
       fruit_name         = excluded.fruit_name,
       sell_price         = excluded.sell_price,
       sell_price_silver  = excluded.sell_price_silver,
       sell_price_gold    = excluded.sell_price_gold,
       sell_price_iridium = excluded.sell_price_iridium,
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
    data.name, data.season, data.growth_days, data.sapling_price, data.fruit_name,
    data.sell_price, data.sell_price_silver, data.sell_price_gold, data.sell_price_iridium,
    data.image_url, data.wiki_url, now(),
  );
}

export function countFruitTrees(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM fruit_trees").one() as { n: number } | null)?.n ?? 0;
}

// ── Villagers ─────────────────────────────────────────────────────────────────

export function getVillager(sql: SqlStorage, name: string): Villager | null {
  try {
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
  } catch (err) {
    console.error("DB error in getVillager:", err);
    return null;
  }
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

// ── Fish ──────────────────────────────────────────────────────────────────────

export function getFish(sql: SqlStorage, name: string): Fish | null {
  try {
    const row = sql
      .exec("SELECT * FROM fish WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as FishRow | null;
    if (!row) return null;
    return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
  } catch (err) {
    console.error("DB error in getFish:", err);
    return null;
  }
}

// ── Bundles ───────────────────────────────────────────────────────────────────

export function getBundle(sql: SqlStorage, name: string): Bundle | null {
  try {
    const row = sql
      .exec("SELECT * FROM bundles WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as BundleRow | null;
    if (!row) return null;
    return { ...row, items: JSON.parse(row.items || "[]") as BundleItem[] };
  } catch (err) {
    console.error("DB error in getBundle:", err);
    return null;
  }
}

export function upsertFish(sql: SqlStorage, data: Omit<FishRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO fish
       (name, category, description,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        location, time, seasons, weather,
        min_size, max_size, difficulty, behavior, base_xp,
        image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       category           = excluded.category,
       description        = excluded.description,
       sell_price         = excluded.sell_price,
       sell_price_silver  = excluded.sell_price_silver,
       sell_price_gold    = excluded.sell_price_gold,
       sell_price_iridium = excluded.sell_price_iridium,
       location           = excluded.location,
       time               = excluded.time,
       seasons            = excluded.seasons,
       weather            = excluded.weather,
       min_size           = excluded.min_size,
       max_size           = excluded.max_size,
       difficulty         = excluded.difficulty,
       behavior           = excluded.behavior,
       base_xp            = excluded.base_xp,
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
    data.name, data.category, data.description,
    data.sell_price, data.sell_price_silver, data.sell_price_gold, data.sell_price_iridium,
    data.location, data.time, data.seasons, data.weather,
    data.min_size, data.max_size, data.difficulty, data.behavior, data.base_xp,
    data.image_url, data.wiki_url, now(),
  );
}

export function upsertBundle(sql: SqlStorage, data: Omit<BundleRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO bundles
       (name, room, items, items_required, reward, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       room           = excluded.room,
       items          = excluded.items,
       items_required = excluded.items_required,
       reward         = excluded.reward,
       image_url      = excluded.image_url,
       wiki_url       = excluded.wiki_url,
       last_updated   = excluded.last_updated`,
    data.name, data.room, data.items, data.items_required,
    data.reward, data.image_url, data.wiki_url, now(),
  );
}

export function countBundles(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM bundles").one() as { n: number } | null)?.n ?? 0;
}

// ── Forageables ───────────────────────────────────────────────────────────────

export function getForageable(sql: SqlStorage, name: string): Forageable | null {
  try {
    const row = sql
      .exec("SELECT * FROM forageables WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as ForageableRow | null;
    if (!row) return null;
    return {
      ...row,
      seasons:   JSON.parse(row.seasons   || "[]") as string[],
      locations: JSON.parse(row.locations || "[]") as string[],
      used_in:   JSON.parse(row.used_in   || "[]") as string[],
    };
  } catch (err) {
    console.error("DB error in getForageable:", err);
    return null;
  }
}

export function upsertForageable(sql: SqlStorage, data: Omit<ForageableRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO forageables
       (name, seasons, locations,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        energy, health, used_in, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       seasons            = excluded.seasons,
       locations          = excluded.locations,
       sell_price         = excluded.sell_price,
       sell_price_silver  = excluded.sell_price_silver,
       sell_price_gold    = excluded.sell_price_gold,
       sell_price_iridium = excluded.sell_price_iridium,
       energy             = excluded.energy,
       health             = excluded.health,
       used_in            = excluded.used_in,
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
    data.name, data.seasons, data.locations,
    data.sell_price, data.sell_price_silver, data.sell_price_gold, data.sell_price_iridium,
    data.energy, data.health, data.used_in, data.image_url, data.wiki_url, now(),
  );
}

export function countForageables(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM forageables").one() as { n: number } | null)?.n ?? 0;
}

// ── Minerals ──────────────────────────────────────────────────────────────────

export function getMineral(sql: SqlStorage, name: string): Mineral | null {
  try {
    const row = sql
      .exec("SELECT * FROM minerals WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as MineralRow | null;
    if (!row) return null;
    return {
      ...row,
      source:  JSON.parse(row.source  || "[]") as string[],
      used_in: JSON.parse(row.used_in || "[]") as string[],
    };
  } catch (err) {
    console.error("DB error in getMineral:", err);
    return null;
  }
}

export function upsertMineral(sql: SqlStorage, data: Omit<MineralRow, "id" | "last_updated">): void {
  sql.exec(
    `INSERT INTO minerals
       (name, category, description, sell_price, sell_price_gemologist,
        source, used_in, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       category              = excluded.category,
       description           = excluded.description,
       sell_price            = excluded.sell_price,
       sell_price_gemologist = excluded.sell_price_gemologist,
       source                = excluded.source,
       used_in               = excluded.used_in,
       image_url             = excluded.image_url,
       wiki_url              = excluded.wiki_url,
       last_updated          = excluded.last_updated`,
    data.name, data.category, data.description, data.sell_price, data.sell_price_gemologist,
    data.source, data.used_in, data.image_url, data.wiki_url, now(),
  );
}

// ── Counts ────────────────────────────────────────────────────────────────────

export function countCrops(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM crops").one() as { n: number } | null)?.n ?? 0;
}

export function countVillagers(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM villagers").one() as { n: number } | null)?.n ?? 0;
}

export function countFish(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM fish").one() as { n: number } | null)?.n ?? 0;
}

export function countMinerals(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM minerals").one() as { n: number } | null)?.n ?? 0;
}

// ── Status ─────────────────────────────────────────────────────────────────────

export function getStatus(sql: SqlStorage): {
  cropCount: number;
  villagerCount: number;
  fruitTreeCount: number;
  fishCount: number;
  bundleCount: number;
  forageableCount: number;
  mineralCount: number;
  cropsLastUpdated: string | null;
  villagersLastUpdated: string | null;
  fruitTreesLastUpdated: string | null;
  fishLastUpdated: string | null;
  bundlesLastUpdated: string | null;
  forageablesLastUpdated: string | null;
  mineralsLastUpdated: string | null;
} {
  const cropRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM crops")
    .one() as { n: number; last_updated: string | null } | null;
  const villagerRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM villagers")
    .one() as { n: number; last_updated: string | null } | null;
  const fruitTreeRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM fruit_trees")
    .one() as { n: number; last_updated: string | null } | null;
  const fishRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM fish")
    .one() as { n: number; last_updated: string | null } | null;
  const bundleRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM bundles")
    .one() as { n: number; last_updated: string | null } | null;
  const forageableRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM forageables")
    .one() as { n: number; last_updated: string | null } | null;
  const mineralRow = sql
    .exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM minerals")
    .one() as { n: number; last_updated: string | null } | null;
  return {
    cropCount: cropRow?.n ?? 0,
    villagerCount: villagerRow?.n ?? 0,
    fruitTreeCount: fruitTreeRow?.n ?? 0,
    fishCount: fishRow?.n ?? 0,
    bundleCount: bundleRow?.n ?? 0,
    forageableCount: forageableRow?.n ?? 0,
    mineralCount: mineralRow?.n ?? 0,
    cropsLastUpdated: cropRow?.last_updated ?? null,
    villagersLastUpdated: villagerRow?.last_updated ?? null,
    fruitTreesLastUpdated: fruitTreeRow?.last_updated ?? null,
    fishLastUpdated: fishRow?.last_updated ?? null,
    bundlesLastUpdated: bundleRow?.last_updated ?? null,
    forageablesLastUpdated: forageableRow?.last_updated ?? null,
    mineralsLastUpdated: mineralRow?.last_updated ?? null,
  };
}

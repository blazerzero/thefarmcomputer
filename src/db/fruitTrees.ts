import type { FruitTree, FruitTreeRow } from "../types";

const now = () => new Date().toISOString();

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

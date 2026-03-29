import type { Fish, FishRow } from "@/types";

const now = () => new Date().toISOString();

export function getFish(sql: SqlStorage, name: string): Fish | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM fish WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as FishRow | null;
		if (!row) return null;
		return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
	} catch (err) {
		console.error("DB error in getFish:", err);
		return null;
	}
}

export function upsertFish(
	sql: SqlStorage,
	data: Omit<FishRow, "id" | "last_updated">,
): void {
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
		data.name,
		data.category,
		data.description,
		data.sell_price,
		data.sell_price_silver,
		data.sell_price_gold,
		data.sell_price_iridium,
		data.location,
		data.time,
		data.seasons,
		data.weather,
		data.min_size,
		data.max_size,
		data.difficulty,
		data.behavior,
		data.base_xp,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countFish(sql: SqlStorage): number {
	return (
		(sql.exec("SELECT COUNT(*) AS n FROM fish").one() as { n: number } | null)
			?.n ?? 0
	);
}

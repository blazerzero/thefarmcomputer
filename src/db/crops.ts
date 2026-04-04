import type { Crop, CropRow } from "@/types";

const now = () => new Date().toISOString();

export function getCropsBySeason(sql: SqlStorage, season: string): Crop[] {
	try {
		const rows = sql
			.exec(
				"SELECT * FROM crops WHERE seasons LIKE ? ORDER BY name ASC",
				`%${season}%`,
			)
			.toArray() as unknown as CropRow[];
		return rows.map((row) => ({
			...row,
			seasons: JSON.parse(row.seasons || "[]") as string[],
		}));
	} catch (err) {
		console.error("DB error in getCropsBySeason:", err);
		return [];
	}
}

export function getCrop(sql: SqlStorage, name: string): Crop | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM crops WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as CropRow | null;
		if (!row) return null;
		return { ...row, seasons: JSON.parse(row.seasons || "[]") as string[] };
	} catch (err) {
		console.error("DB error in getCrop:", err);
		return null;
	}
}

export function upsertCrop(
	sql: SqlStorage,
	data: Omit<CropRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO crops
       (name, description, seasons, growth_days, regrowth_days,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        buy_price, is_trellis, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description        = excluded.description,
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
		data.name,
		data.description,
		data.seasons,
		data.growth_days,
		data.regrowth_days,
		data.sell_price,
		data.sell_price_silver,
		data.sell_price_gold,
		data.sell_price_iridium,
		data.buy_price,
		data.is_trellis,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countCrops(sql: SqlStorage): number {
	return (
		(sql.exec("SELECT COUNT(*) AS n FROM crops").one() as { n: number } | null)
			?.n ?? 0
	);
}

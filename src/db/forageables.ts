import type { Forageable, ForageableRow } from "../types";

const now = () => new Date().toISOString();

export function getForageable(
	sql: SqlStorage,
	name: string,
): Forageable | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM forageables WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as ForageableRow | null;
		if (!row) return null;
		return {
			...row,
			seasons: JSON.parse(row.seasons || "[]") as string[],
			locations: JSON.parse(row.locations || "[]") as string[],
			used_in: JSON.parse(row.used_in || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getForageable:", err);
		return null;
	}
}

export function upsertForageable(
	sql: SqlStorage,
	data: Omit<ForageableRow, "id" | "last_updated">,
): void {
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
		data.name,
		data.seasons,
		data.locations,
		data.sell_price,
		data.sell_price_silver,
		data.sell_price_gold,
		data.sell_price_iridium,
		data.energy,
		data.health,
		data.used_in,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countForageables(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM forageables").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

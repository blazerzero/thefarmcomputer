import type { ArtisanGoodRow } from "@/types";

const now = () => new Date().toISOString();

export function getArtisanGood(
	sql: SqlStorage,
	name: string,
): ArtisanGoodRow | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM artisan_goods WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as ArtisanGoodRow | null;
		return row ?? null;
	} catch (err) {
		console.error("DB error in getArtisanGood:", err);
		return null;
	}
}

export function upsertArtisanGood(
	sql: SqlStorage,
	data: Omit<ArtisanGoodRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO artisan_goods
       (name, machine, description, ingredients,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        energy, health,
        cask_days_to_silver, cask_days_to_gold, cask_days_to_iridium,
        image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       machine              = excluded.machine,
       description          = excluded.description,
       ingredients          = excluded.ingredients,
       sell_price           = excluded.sell_price,
       sell_price_silver    = excluded.sell_price_silver,
       sell_price_gold      = excluded.sell_price_gold,
       sell_price_iridium   = excluded.sell_price_iridium,
       energy               = excluded.energy,
       health               = excluded.health,
       cask_days_to_silver  = excluded.cask_days_to_silver,
       cask_days_to_gold    = excluded.cask_days_to_gold,
       cask_days_to_iridium = excluded.cask_days_to_iridium,
       image_url            = excluded.image_url,
       wiki_url             = excluded.wiki_url,
       last_updated         = excluded.last_updated`,
		data.name,
		data.machine,
		data.description,
		data.ingredients,
		data.sell_price,
		data.sell_price_silver,
		data.sell_price_gold,
		data.sell_price_iridium,
		data.energy,
		data.health,
		data.cask_days_to_silver,
		data.cask_days_to_gold,
		data.cask_days_to_iridium,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countArtisanGoods(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM artisan_goods").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

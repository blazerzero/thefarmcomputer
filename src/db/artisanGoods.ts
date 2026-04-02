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
       (name, machine, description, ingredients, processing_time,
        sell_price, energy, health, buffs,
        cask_days_to_silver, cask_days_to_gold, cask_days_to_iridium,
        image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       machine              = excluded.machine,
       description          = excluded.description,
       ingredients          = excluded.ingredients,
	   processing_time	  	= excluded.processing_time,
       sell_price           = excluded.sell_price,
       energy               = excluded.energy,
       health               = excluded.health,
	   buffs                = excluded.buffs,
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
		data.processing_time,
		data.sell_price,
		data.energy,
		data.health,
		data.buffs,
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

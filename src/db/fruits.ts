import type { Fruit, FruitRow } from "@/types";

const now = () => new Date().toISOString();

export function getFruit(sql: SqlStorage, name: string): Fruit | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM fruits WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as FruitRow | null;
		if (!row) return null;
		return {
			...row,
			seasons: JSON.parse(row.seasons || "[]") as string[],
			used_in: JSON.parse(row.used_in || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getFruit:", err);
		return null;
	}
}

export function upsertFruit(
	sql: SqlStorage,
	data: Omit<FruitRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO fruits
       (name, source, seasons,
        sell_price, sell_price_silver, sell_price_gold, sell_price_iridium,
        energy, energy_silver, energy_gold, energy_iridium,
        health, health_silver, health_gold, health_iridium,
        used_in, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       source             = excluded.source,
       seasons            = excluded.seasons,
       sell_price         = excluded.sell_price,
       sell_price_silver  = excluded.sell_price_silver,
       sell_price_gold    = excluded.sell_price_gold,
       sell_price_iridium = excluded.sell_price_iridium,
       energy             = excluded.energy,
       energy_silver      = excluded.energy_silver,
       energy_gold        = excluded.energy_gold,
       energy_iridium     = excluded.energy_iridium,
       health             = excluded.health,
       health_silver      = excluded.health_silver,
       health_gold        = excluded.health_gold,
       health_iridium     = excluded.health_iridium,
       used_in            = excluded.used_in,
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
		data.name,
		data.source,
		data.seasons,
		data.sell_price,
		data.sell_price_silver,
		data.sell_price_gold,
		data.sell_price_iridium,
		data.energy,
		data.energy_silver,
		data.energy_gold,
		data.energy_iridium,
		data.health,
		data.health_silver,
		data.health_gold,
		data.health_iridium,
		data.used_in,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countFruits(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM fruits").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

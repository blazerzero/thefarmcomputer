import type { Footwear, FootwearRow } from "../types";

const now = () => new Date().toISOString();

export function getFootwear(sql: SqlStorage, name: string): Footwear | null {
	try {
		const row = sql
			.exec(
				"SELECT * FROM footwear WHERE name LIKE ? LIMIT 1",
				`%${name}%`,
			)
			.one() as unknown as FootwearRow | null;
		if (!row) return null;
		return {
			...row,
			source: JSON.parse(row.source || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getFootwear:", err);
		return null;
	}
}

export function upsertFootwear(
	sql: SqlStorage,
	data: Omit<FootwearRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO footwear
       (name, defense, immunity, crit_chance, crit_power, weight,
        description, sell_price, source, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       defense      = excluded.defense,
       immunity     = excluded.immunity,
       crit_chance  = excluded.crit_chance,
       crit_power   = excluded.crit_power,
       weight       = excluded.weight,
       description  = excluded.description,
       sell_price   = excluded.sell_price,
       source       = excluded.source,
       image_url    = excluded.image_url,
       wiki_url     = excluded.wiki_url,
       last_updated = excluded.last_updated`,
		data.name,
		data.defense,
		data.immunity,
		data.crit_chance,
		data.crit_power,
		data.weight,
		data.description,
		data.sell_price,
		data.source,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countFootwear(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM footwear").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

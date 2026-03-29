import type { Footwear, FootwearRow } from "../types";

const now = () => new Date().toISOString();

export function getFootwear(sql: SqlStorage, name: string): Footwear | null {
	try {
		const row = sql
			.exec("SELECT * FROM footwear WHERE name LIKE ? LIMIT 1", `%${name}%`)
			.one() as unknown as FootwearRow | null;
		if (!row) return null;
		return {
			...row,
			stats: JSON.parse(row.stats || "[]") as string[],
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
       (name, stats, description, purchase_price, sell_price, source, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       stats        	= excluded.stats,
       description  	= excluded.description,
       purchase_price 	= excluded.purchase_price,
       sell_price   	= excluded.sell_price,
       source       	= excluded.source,
       image_url    	= excluded.image_url,
       wiki_url     	= excluded.wiki_url,
       last_updated 	= excluded.last_updated`,
		data.name,
		data.stats,
		data.description,
		data.purchase_price,
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

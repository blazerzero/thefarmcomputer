import type { Mineral, MineralRow } from "@/types";

const now = () => new Date().toISOString();

export function getMineral(sql: SqlStorage, name: string): Mineral | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM minerals WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as MineralRow | null;
		if (!row) return null;
		return {
			...row,
			source: JSON.parse(row.source || "[]") as string[],
			used_in: JSON.parse(row.used_in || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getMineral:", err);
		return null;
	}
}

export function upsertMineral(
	sql: SqlStorage,
	data: Omit<MineralRow, "id" | "last_updated">,
): void {
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
		data.name,
		data.category,
		data.description,
		data.sell_price,
		data.sell_price_gemologist,
		data.source,
		data.used_in,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countMinerals(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM minerals").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

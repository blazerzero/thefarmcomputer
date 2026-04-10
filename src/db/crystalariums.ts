import type { Crystalarium, CrystalariumRow } from "@/types";

const now = () => new Date().toISOString();

export function getCrystalarium(
	sql: SqlStorage,
	name: string,
): Crystalarium | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM crystalariums WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as CrystalariumRow | null;
		if (!row) return null;
		return { ...row };
	} catch (err) {
		console.error("DB error in getCrystalarium:", err);
		return null;
	}
}

export function upsertCrystalarium(
	sql: SqlStorage,
	data: Omit<CrystalariumRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO crystalariums
       (name, sell_price, processing_time, gold_per_day, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       sell_price      = excluded.sell_price,
       processing_time = excluded.processing_time,
       gold_per_day    = excluded.gold_per_day,
       image_url       = excluded.image_url,
       wiki_url        = excluded.wiki_url,
       last_updated    = excluded.last_updated`,
		data.name,
		data.sell_price,
		data.processing_time,
		data.gold_per_day,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countCrystalariums(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM crystalariums").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

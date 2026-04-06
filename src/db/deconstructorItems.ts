import type { DeconstructorItem, DeconstructorItemRow } from "@/types";

const now = () => new Date().toISOString();

export function getDeconstructorItem(
	sql: SqlStorage,
	name: string,
): DeconstructorItem | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM deconstructor_items WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as DeconstructorItemRow | null;
		if (!row) return null;
		return {
			...row,
			deconstructed_items: JSON.parse(row.deconstructed_items || "[]"),
		};
	} catch (err) {
		console.error("DB error in getDeconstructorItem:", err);
		return null;
	}
}

export function upsertDeconstructorItem(
	sql: SqlStorage,
	data: Omit<DeconstructorItemRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO deconstructor_items
       (name, sell_price, deconstructed_items, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       sell_price          = excluded.sell_price,
       deconstructed_items = excluded.deconstructed_items,
       image_url           = excluded.image_url,
       wiki_url            = excluded.wiki_url,
       last_updated        = excluded.last_updated`,
		data.name,
		data.sell_price,
		data.deconstructed_items,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countDeconstructorItems(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM deconstructor_items").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

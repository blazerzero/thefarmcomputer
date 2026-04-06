import type { DeconstructItem, DeconstructItemRow } from "@/types";

const now = () => new Date().toISOString();

export function getDeconstructItem(
	sql: SqlStorage,
	name: string,
): DeconstructItem | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM deconstruct_items WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as DeconstructItemRow | null;
		if (!row) return null;
		return {
			...row,
			deconstructed_items: JSON.parse(
				row.deconstructed_items || "[]",
			) as Array<{ name: string; quantity: number }>,
		};
	} catch (err) {
		console.error("DB error in getDeconstructItem:", err);
		return null;
	}
}

export function upsertDeconstructItem(
	sql: SqlStorage,
	data: Omit<DeconstructItemRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO deconstruct_items
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

export function countDeconstructItems(sql: SqlStorage): number {
	return (
		(
			sql
				.exec("SELECT COUNT(*) AS n FROM deconstruct_items")
				.one() as { n: number } | null
		)?.n ?? 0
	);
}

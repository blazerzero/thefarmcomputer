import type { Bait, BaitRow, CraftIngredient } from "@/types";

const now = () => new Date().toISOString();

export function getBait(sql: SqlStorage, name: string): Bait | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM bait WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as BaitRow | null;
		if (!row) return null;
		return {
			...row,
			ingredients: JSON.parse(row.ingredients || "[]") as CraftIngredient[],
		};
	} catch (err) {
		console.error("DB error in getBait:", err);
		return null;
	}
}

export function upsertBait(
	sql: SqlStorage,
	data: Omit<BaitRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO bait
       (name, description, notes, purchase, ingredients, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description  = excluded.description,
       notes        = excluded.notes,
       purchase     = excluded.purchase,
       ingredients  = excluded.ingredients,
       image_url    = excluded.image_url,
       wiki_url     = excluded.wiki_url,
       last_updated = excluded.last_updated`,
		data.name,
		data.description,
		data.notes,
		data.purchase,
		data.ingredients,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countBait(sql: SqlStorage): number {
	return (
		(sql.exec("SELECT COUNT(*) AS n FROM bait").one() as { n: number } | null)
			?.n ?? 0
	);
}

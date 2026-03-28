import type { CraftedItem, CraftedItemRow } from "../types";

const now = () => new Date().toISOString();

export function getCraftedItem(
	sql: SqlStorage,
	name: string,
): CraftedItem | null {
	try {
		const row = sql
			.exec(
				"SELECT * FROM crafted_items WHERE name LIKE ? LIMIT 1",
				`%${name}%`,
			)
			.one() as unknown as CraftedItemRow | null;
		if (!row) return null;
		return {
			...row,
			ingredients: JSON.parse(
				row.ingredients || "[]",
			) as CraftedItem["ingredients"],
		};
	} catch (err) {
		console.error("DB error in getCraftedItem:", err);
		return null;
	}
}

export function getCraftedItemsByIngredient(
	sql: SqlStorage,
	ingredientName: string,
): CraftedItem[] {
	try {
		const rows = sql
			.exec(
				`SELECT * FROM crafted_items WHERE ingredients LIKE ? ORDER BY name ASC`,
				`%"name":"${ingredientName}"%`,
			)
			.toArray() as unknown as CraftedItemRow[];
		return rows.map((row) => ({
			...row,
			ingredients: JSON.parse(
				row.ingredients || "[]",
			) as CraftedItem["ingredients"],
		}));
	} catch (err) {
		console.error("DB error in getCraftedItemsByIngredient:", err);
		return [];
	}
}

export function upsertCraftedItem(
	sql: SqlStorage,
	data: Omit<CraftedItemRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO crafted_items
       (name, description, duration_days, duration_seasons, radius,
        ingredients, energy, health, recipe_source, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description      = excluded.description,
       duration_days    = excluded.duration_days,
       duration_seasons = excluded.duration_seasons,
       radius           = excluded.radius,
       ingredients      = excluded.ingredients,
       energy           = excluded.energy,
       health           = excluded.health,
       recipe_source    = excluded.recipe_source,
       image_url        = excluded.image_url,
       wiki_url         = excluded.wiki_url,
       last_updated     = excluded.last_updated`,
		data.name,
		data.description,
		data.duration_days,
		data.duration_seasons,
		data.radius,
		data.ingredients,
		data.energy,
		data.health,
		data.recipe_source,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countCraftedItems(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM crafted_items").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

import type { Recipe, RecipeRow } from "../types";

const now = () => new Date().toISOString();

export function getRecipe(sql: SqlStorage, name: string): Recipe | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM recipes WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as RecipeRow | null;
		if (!row) return null;
		return {
			...row,
			ingredients: JSON.parse(row.ingredients || "[]") as Recipe["ingredients"],
			buff_duration: JSON.parse(row.buff_duration || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getRecipe:", err);
		return null;
	}
}

export function upsertRecipe(
	sql: SqlStorage,
	data: Omit<RecipeRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO recipes
       (name, description, ingredients, energy, health, buffs, buff_duration,
        recipe_source, sell_price, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description   = excluded.description,
       ingredients   = excluded.ingredients,
       energy        = excluded.energy,
       health        = excluded.health,
       buffs         = excluded.buffs,
       buff_duration = excluded.buff_duration,
       recipe_source = excluded.recipe_source,
       sell_price    = excluded.sell_price,
       image_url     = excluded.image_url,
       wiki_url      = excluded.wiki_url,
       last_updated  = excluded.last_updated`,
		data.name,
		data.description,
		data.ingredients,
		data.energy,
		data.health,
		data.buffs,
		data.buff_duration,
		data.recipe_source,
		data.sell_price,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countRecipes(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM recipes").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

import type { Tool, ToolRow } from "@/types";

const now = () => new Date().toISOString();

export function getTool(sql: SqlStorage, name: string): Tool | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM tools WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as ToolRow | null;
		if (!row) return null;
		return row;
	} catch (err) {
		console.error("DB error in getTool:", err);
		return null;
	}
}

export function upsertTool(
	sql: SqlStorage,
	data: Omit<ToolRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO tools
       (name, category, description, cost, ingredients, improvements,
        location, requirements, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       category     = excluded.category,
       description  = excluded.description,
       cost         = excluded.cost,
       ingredients  = excluded.ingredients,
       improvements = excluded.improvements,
       location     = excluded.location,
       requirements = excluded.requirements,
       image_url    = excluded.image_url,
       wiki_url     = excluded.wiki_url,
       last_updated = excluded.last_updated`,
		data.name,
		data.category,
		data.description,
		data.cost,
		data.ingredients,
		data.improvements,
		data.location,
		data.requirements,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countTools(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM tools").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

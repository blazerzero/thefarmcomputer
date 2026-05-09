import type { FarmBuilding, FarmBuildingRow } from "@/types";
import type { CraftIngredient } from "@/types";

const now = () => new Date().toISOString();

export function getFarmBuilding(
	sql: SqlStorage,
	name: string,
): FarmBuilding | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM farm_buildings WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as FarmBuildingRow | null;
		if (!row) return null;
		return {
			...row,
			materials: JSON.parse(row.materials || "[]") as CraftIngredient[],
		};
	} catch (err) {
		console.error("DB error in getFarmBuilding:", err);
		return null;
	}
}

export function upsertFarmBuilding(
	sql: SqlStorage,
	data: Omit<FarmBuildingRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO farm_buildings
       (name, description, animals_housed, cost, materials, size, construction_time, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description       = excluded.description,
       animals_housed    = excluded.animals_housed,
       cost              = excluded.cost,
       materials         = excluded.materials,
       size              = excluded.size,
       construction_time = excluded.construction_time,
       image_url         = excluded.image_url,
       wiki_url          = excluded.wiki_url,
       last_updated      = excluded.last_updated`,
		data.name,
		data.description,
		data.animals_housed,
		data.cost,
		data.materials,
		data.size,
		data.construction_time,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countFarmBuildings(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM farm_buildings").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

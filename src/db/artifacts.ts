import type { Artifact, ArtifactRow } from "@/types";

const now = () => new Date().toISOString();

export function getArtifact(sql: SqlStorage, name: string): Artifact | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM artifacts WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as ArtifactRow | null;
		if (!row) return null;
		return {
			...row,
			location: JSON.parse(row.location || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getArtifact:", err);
		return null;
	}
}

export function upsertArtifact(
	sql: SqlStorage,
	data: Omit<ArtifactRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO artifacts
       (name, description, sell_price, location, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description  = excluded.description,
       sell_price   = excluded.sell_price,
       location     = excluded.location,
       image_url    = excluded.image_url,
       wiki_url     = excluded.wiki_url,
       last_updated = excluded.last_updated`,
		data.name,
		data.description,
		data.sell_price,
		data.location,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countArtifacts(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM artifacts").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

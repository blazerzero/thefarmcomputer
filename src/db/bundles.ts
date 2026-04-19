import type { Bundle, BundleItem, BundleRow } from "@/types";

const now = () => new Date().toISOString();

export function getBundle(sql: SqlStorage, name: string): Bundle | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM bundles WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as BundleRow | null;
		if (!row) return null;
		return { ...row, items: JSON.parse(row.items || "[]") as BundleItem[] };
	} catch (err) {
		console.error("DB error in getBundle:", err);
		return null;
	}
}

export function upsertBundle(
	sql: SqlStorage,
	data: Omit<BundleRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO bundles
       (name, room, items, items_required, reward, description, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       room           = excluded.room,
       items          = excluded.items,
       items_required = excluded.items_required,
       reward         = excluded.reward,
       description    = excluded.description,
       image_url      = excluded.image_url,
       wiki_url       = excluded.wiki_url,
       last_updated   = excluded.last_updated`,
		data.name,
		data.room,
		data.items,
		data.items_required,
		data.reward,
		data.description,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countBundles(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM bundles").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

import type { Ring, RingRow } from "../types";

const now = () => new Date().toISOString();

export function getRing(sql: SqlStorage, name: string): Ring | null {
	try {
		const row = sql
			.exec("SELECT * FROM rings WHERE name LIKE ? LIMIT 1", `%${name}%`)
			.one() as unknown as RingRow | null;
		if (!row) return null;
		return {
			...row,
			where_to_find: JSON.parse(row.where_to_find || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getRing:", err);
		return null;
	}
}

export function upsertRing(
	sql: SqlStorage,
	data: Omit<RingRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO rings
       (name, description, sell_price, effects, where_to_find, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description   = excluded.description,
       sell_price    = excluded.sell_price,
       effects       = excluded.effects,
       where_to_find = excluded.where_to_find,
       image_url     = excluded.image_url,
       wiki_url      = excluded.wiki_url,
       last_updated  = excluded.last_updated`,
		data.name,
		data.description,
		data.sell_price,
		data.effects,
		data.where_to_find,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countRings(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM rings").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

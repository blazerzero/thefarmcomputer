import type { Tackle, TackleRow } from "@/types";

const now = () => new Date().toISOString();

export function getTackle(sql: SqlStorage, name: string): Tackle | null {
	try {
		const row = sql
			.exec("SELECT * FROM tackle WHERE name LIKE ? LIMIT 1", `%${name}%`)
			.one() as unknown as TackleRow | null;
		if (!row) return null;
		return {
			...row,
			crafting: JSON.parse(row.crafting || "[]") as string[],
			notes: JSON.parse(row.notes || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getTackle:", err);
		return null;
	}
}

export function upsertTackle(
	sql: SqlStorage,
	data: Omit<TackleRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO tackle
       (name, description, notes, purchase_price, crafting, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description    = excluded.description,
       notes          = excluded.notes,
       purchase_price = excluded.purchase_price,
       crafting       = excluded.crafting,
       image_url      = excluded.image_url,
       wiki_url       = excluded.wiki_url,
       last_updated   = excluded.last_updated`,
		data.name,
		data.description,
		data.notes,
		data.purchase_price,
		data.crafting,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countTackle(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM tackle").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

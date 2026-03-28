import type { Book, BookRow } from "../types";

const now = () => new Date().toISOString();

export function getBook(sql: SqlStorage, name: string): Book | null {
	try {
		const row = sql
			.exec("SELECT * FROM books WHERE name LIKE ? LIMIT 1", `%${name}%`)
			.one() as unknown as BookRow | null;
		if (!row) return null;
		return {
			...row,
			location: JSON.parse(row.location || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getBook:", err);
		return null;
	}
}

export function upsertBook(
	sql: SqlStorage,
	data: Omit<BookRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO books
       (name, description, subsequent_reading, location, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description        = excluded.description,
       subsequent_reading = excluded.subsequent_reading,
       location           = excluded.location,
       image_url          = excluded.image_url,
       wiki_url           = excluded.wiki_url,
       last_updated       = excluded.last_updated`,
		data.name,
		data.description,
		data.subsequent_reading,
		data.location,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countBooks(sql: SqlStorage): number {
	return (
		(sql.exec("SELECT COUNT(*) AS n FROM books").one() as { n: number } | null)
			?.n ?? 0
	);
}

import type { Monster, MonsterRow } from "@/types";

const now = () => new Date().toISOString();

export function getMonster(sql: SqlStorage, name: string): Monster | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM monsters WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as MonsterRow | null;
		if (!row) return null;
		return {
			...row,
			drops: JSON.parse(row.drops || "[]") as string[],
		};
	} catch (err) {
		console.error("DB error in getMonster:", err);
		return null;
	}
}

export function upsertMonster(
	sql: SqlStorage,
	data: Omit<MonsterRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO monsters
       (name, location, hp, damage, defense, speed, xp, drops, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       location     = excluded.location,
       hp           = excluded.hp,
       damage       = excluded.damage,
       defense      = excluded.defense,
       speed        = excluded.speed,
       xp           = excluded.xp,
       drops        = excluded.drops,
       image_url    = excluded.image_url,
       wiki_url     = excluded.wiki_url,
       last_updated = excluded.last_updated`,
		data.name,
		data.location,
		data.hp,
		data.damage,
		data.defense,
		data.speed,
		data.xp,
		data.drops,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countMonsters(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM monsters").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

import type { Weapon, WeaponRow } from "@/types";

const now = () => new Date().toISOString();

export function getWeapon(sql: SqlStorage, name: string): Weapon | null {
	try {
		const row = sql
			.exec(
				`SELECT * FROM weapons WHERE name LIKE ?
         ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE length(name) END
         LIMIT 1`,
				`%${name}%`,
				name,
			)
			.one() as unknown as WeaponRow | null;
		if (!row) return null;
		return row;
	} catch (err) {
		console.error("DB error in getWeapon:", err);
		return null;
	}
}

export function upsertWeapon(
	sql: SqlStorage,
	data: Omit<WeaponRow, "id" | "last_updated">,
): void {
	sql.exec(
		`INSERT INTO weapons
       (name, category, min_damage, max_damage, speed, defense, weight,
        crit_chance, crit_power, level, sell_price, purchase_price, location,
        description, extra_stats, image_url, wiki_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       category       = excluded.category,
       min_damage     = excluded.min_damage,
       max_damage     = excluded.max_damage,
       speed          = excluded.speed,
       defense        = excluded.defense,
       weight         = excluded.weight,
       crit_chance    = excluded.crit_chance,
       crit_power     = excluded.crit_power,
       level          = excluded.level,
       sell_price     = excluded.sell_price,
       purchase_price = excluded.purchase_price,
       location       = excluded.location,
       description    = excluded.description,
       extra_stats    = excluded.extra_stats,
       image_url      = excluded.image_url,
       wiki_url       = excluded.wiki_url,
       last_updated   = excluded.last_updated`,
		data.name,
		data.category,
		data.min_damage,
		data.max_damage,
		data.speed,
		data.defense,
		data.weight,
		data.crit_chance,
		data.crit_power,
		data.level,
		data.sell_price,
		data.purchase_price,
		data.location,
		data.description,
		data.extra_stats,
		data.image_url,
		data.wiki_url,
		now(),
	);
}

export function countWeapons(sql: SqlStorage): number {
	return (
		(
			sql.exec("SELECT COUNT(*) AS n FROM weapons").one() as {
				n: number;
			} | null
		)?.n ?? 0
	);
}

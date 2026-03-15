import type { Villager, VillagerRow } from "../types";

const now = () => new Date().toISOString();

export function getVillager(sql: SqlStorage, name: string): Villager | null {
  try {
    const row = sql
      .exec("SELECT * FROM villagers WHERE name LIKE ? LIMIT 1", `%${name}%`)
      .one() as unknown as VillagerRow | null;
    if (!row) return null;
    return {
      ...row,
      loved_gifts:    JSON.parse(row.loved_gifts    || "[]") as string[],
      liked_gifts:    JSON.parse(row.liked_gifts    || "[]") as string[],
      neutral_gifts:  JSON.parse(row.neutral_gifts  || "[]") as string[],
      disliked_gifts: JSON.parse(row.disliked_gifts || "[]") as string[],
      hated_gifts:    JSON.parse(row.hated_gifts    || "[]") as string[],
    };
  } catch (err) {
    console.error("DB error in getVillager:", err);
    return null;
  }
}

export function upsertVillager(
  sql: SqlStorage,
  data: Omit<VillagerRow, "id" | "last_updated">,
): void {
  sql.exec(
    `INSERT INTO villagers
       (name, birthday, loved_gifts, liked_gifts, neutral_gifts,
        disliked_gifts, hated_gifts, wiki_url, image_url, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       birthday       = excluded.birthday,
       loved_gifts    = excluded.loved_gifts,
       liked_gifts    = excluded.liked_gifts,
       neutral_gifts  = excluded.neutral_gifts,
       disliked_gifts = excluded.disliked_gifts,
       hated_gifts    = excluded.hated_gifts,
       wiki_url       = excluded.wiki_url,
       image_url      = excluded.image_url,
       last_updated   = excluded.last_updated`,
    data.name, data.birthday,
    data.loved_gifts, data.liked_gifts, data.neutral_gifts,
    data.disliked_gifts, data.hated_gifts,
    data.wiki_url, data.image_url, now(),
  );
}

export function countVillagers(sql: SqlStorage): number {
  return (sql.exec("SELECT COUNT(*) AS n FROM villagers").one() as { n: number } | null)?.n ?? 0;
}

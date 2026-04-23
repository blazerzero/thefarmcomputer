export interface FishCaughtRow {
	fish_id: number;
	user_id: string;
	marked_by: string;
	marked_at: string;
}

export async function markFishCaught(
	db: D1Database,
	farmId: string,
	userId: string,
	fishId: number,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR IGNORE INTO farm_fish_caught (id, farm_id, user_id, fish_id) VALUES (?, ?, ?, ?)",
		)
		.bind(crypto.randomUUID(), farmId, userId, fishId)
		.run();
}

export async function unmarkFishCaught(
	db: D1Database,
	farmId: string,
	userId: string,
	fishId: number,
): Promise<void> {
	await db
		.prepare(
			"DELETE FROM farm_fish_caught WHERE farm_id = ? AND user_id = ? AND fish_id = ?",
		)
		.bind(farmId, userId, fishId)
		.run();
}

export async function getFarmFishProgress(
	db: D1Database,
	farmId: string,
): Promise<FishCaughtRow[]> {
	const result = await db
		.prepare(
			`SELECT ffc.fish_id, ffc.user_id, u.username AS marked_by, ffc.marked_at
			 FROM farm_fish_caught ffc
			 JOIN users u ON u.id = ffc.user_id
			 WHERE ffc.farm_id = ?
			 ORDER BY ffc.fish_id, ffc.marked_at`,
		)
		.bind(farmId)
		.all<FishCaughtRow>();
	return result.results;
}

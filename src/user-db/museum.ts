export interface MuseumDonationRow {
	item_type: "artifact" | "mineral";
	item_id: number;
	marked_by: string;
	marked_at: string;
}

export async function markDonation(
	db: D1Database,
	farmId: string,
	userId: string,
	itemType: "artifact" | "mineral",
	itemId: number,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR IGNORE INTO farm_museum_donations (id, farm_id, user_id, item_type, item_id) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(crypto.randomUUID(), farmId, userId, itemType, itemId)
		.run();
}

export async function unmarkDonation(
	db: D1Database,
	farmId: string,
	itemType: "artifact" | "mineral",
	itemId: number,
): Promise<void> {
	await db
		.prepare(
			"DELETE FROM farm_museum_donations WHERE farm_id = ? AND item_type = ? AND item_id = ?",
		)
		.bind(farmId, itemType, itemId)
		.run();
}

export async function getFarmMuseumProgress(
	db: D1Database,
	farmId: string,
): Promise<MuseumDonationRow[]> {
	const result = await db
		.prepare(
			`SELECT fmd.item_type, fmd.item_id, u.username AS marked_by, fmd.marked_at
			 FROM farm_museum_donations fmd
			 JOIN users u ON u.id = fmd.user_id
			 WHERE fmd.farm_id = ?
			 ORDER BY fmd.item_type, fmd.marked_at`,
		)
		.bind(farmId)
		.all<MuseumDonationRow>();
	return result.results;
}

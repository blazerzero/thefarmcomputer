export interface BundleProgressRow {
	bundle_id: number;
	item_index: number;
	marked_by: string;
	marked_at: string;
}

export async function markBundleItem(
	db: D1Database,
	farmId: string,
	userId: string,
	bundleId: number,
	itemIndex: number,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR IGNORE INTO farm_bundle_items (id, farm_id, user_id, bundle_id, item_index) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(crypto.randomUUID(), farmId, userId, bundleId, itemIndex)
		.run();
}

export async function unmarkBundleItem(
	db: D1Database,
	farmId: string,
	bundleId: number,
	itemIndex: number,
): Promise<void> {
	await db
		.prepare(
			"DELETE FROM farm_bundle_items WHERE farm_id = ? AND bundle_id = ? AND item_index = ?",
		)
		.bind(farmId, bundleId, itemIndex)
		.run();
}

export async function getFarmBundleProgress(
	db: D1Database,
	farmId: string,
): Promise<BundleProgressRow[]> {
	const result = await db
		.prepare(
			`SELECT fbi.bundle_id, fbi.item_index, u.username AS marked_by, fbi.marked_at
			 FROM farm_bundle_items fbi
			 JOIN users u ON u.id = fbi.user_id
			 WHERE fbi.farm_id = ?
			 ORDER BY fbi.bundle_id, fbi.marked_at`,
		)
		.bind(farmId)
		.all<BundleProgressRow>();
	return result.results;
}

export interface FarmRow {
	id: string;
	name: string;
	emoji: string | null;
	owner_id: string;
	created_at: string;
	updated_at: string;
}

export interface FarmWithRole extends FarmRow {
	role: string;
}

export interface MemberRow {
	user_id: string;
	username: string;
	avatar_url: string | null;
	role: string;
	joined_at: string;
}

export async function createFarm(
	db: D1Database,
	ownerId: string,
	name: string,
	emoji: string | null,
): Promise<string> {
	const farmId = crypto.randomUUID();
	await db.batch([
		db
			.prepare(
				"INSERT INTO farms (id, name, emoji, owner_id) VALUES (?, ?, ?, ?)",
			)
			.bind(farmId, name, emoji, ownerId),
		db
			.prepare(
				"INSERT INTO farm_members (farm_id, user_id, role) VALUES (?, ?, 'owner')",
			)
			.bind(farmId, ownerId),
	]);
	return farmId;
}

export async function listFarmsForUser(
	db: D1Database,
	userId: string,
): Promise<FarmWithRole[]> {
	const result = await db
		.prepare(
			`SELECT f.id, f.name, f.emoji, f.owner_id, f.created_at, f.updated_at, fm.role
			 FROM farm_members fm
			 JOIN farms f ON f.id = fm.farm_id
			 WHERE fm.user_id = ?
			 ORDER BY f.created_at ASC`,
		)
		.bind(userId)
		.all<FarmWithRole>();
	return result.results;
}

export async function getFarm(
	db: D1Database,
	farmId: string,
): Promise<FarmRow | null> {
	return db
		.prepare("SELECT * FROM farms WHERE id = ?")
		.bind(farmId)
		.first<FarmRow>();
}

export async function isFarmMember(
	db: D1Database,
	farmId: string,
	userId: string,
): Promise<boolean> {
	const row = await db
		.prepare("SELECT 1 FROM farm_members WHERE farm_id = ? AND user_id = ?")
		.bind(farmId, userId)
		.first();
	return row !== null;
}

export async function isFarmOwner(
	db: D1Database,
	farmId: string,
	userId: string,
): Promise<boolean> {
	const row = await db
		.prepare(
			"SELECT 1 FROM farm_members WHERE farm_id = ? AND user_id = ? AND role = 'owner'",
		)
		.bind(farmId, userId)
		.first();
	return row !== null;
}

export async function updateFarm(
	db: D1Database,
	farmId: string,
	name: string,
	emoji: string | null,
): Promise<void> {
	await db
		.prepare(
			"UPDATE farms SET name = ?, emoji = ?, updated_at = datetime('now') WHERE id = ?",
		)
		.bind(name, emoji, farmId)
		.run();
}

export async function deleteFarm(
	db: D1Database,
	farmId: string,
): Promise<void> {
	await db.prepare("DELETE FROM farms WHERE id = ?").bind(farmId).run();
}

export async function listMembers(
	db: D1Database,
	farmId: string,
): Promise<MemberRow[]> {
	const result = await db
		.prepare(
			`SELECT fm.user_id, u.username, u.avatar_url, fm.role, fm.joined_at
			 FROM farm_members fm
			 JOIN users u ON u.id = fm.user_id
			 WHERE fm.farm_id = ?
			 ORDER BY fm.joined_at ASC`,
		)
		.bind(farmId)
		.all<MemberRow>();
	return result.results;
}

export async function removeMember(
	db: D1Database,
	farmId: string,
	userId: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM farm_members WHERE farm_id = ? AND user_id = ?")
		.bind(farmId, userId)
		.run();
}

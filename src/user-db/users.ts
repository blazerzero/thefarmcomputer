export {
	BLOCKED_USERNAMES,
	isReservedUsername,
	isValidUsername,
} from "@/shared/username";

export interface UserRow {
	id: string;
	email: string | null;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	created_at: string;
	updated_at: string;
}

export async function upsertOAuthUser(
	db: D1Database,
	provider: "google" | "apple",
	providerId: string,
	email: string | null,
	name: string | null,
	avatarUrl: string | null,
): Promise<{ userId: string; isNewUser: boolean }> {
	// Returning user?
	const existing = await db
		.prepare(
			"SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?",
		)
		.bind(provider, providerId)
		.first<{ user_id: string }>();

	if (existing) {
		await db
			.prepare(
				"UPDATE users SET email = COALESCE(?, email), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?",
			)
			.bind(email, avatarUrl, existing.user_id)
			.run();
		return { userId: existing.user_id, isNewUser: false };
	}

	// Check if email already belongs to another user (account linking)
	if (email) {
		const byEmail = await db
			.prepare("SELECT id FROM users WHERE email = ?")
			.bind(email)
			.first<{ id: string }>();
		if (byEmail) {
			await db
				.prepare(
					"INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email) VALUES (?, ?, ?, ?, ?)",
				)
				.bind(crypto.randomUUID(), byEmail.id, provider, providerId, email)
				.run();
			return { userId: byEmail.id, isNewUser: false };
		}
	}

	// Brand new user
	const userId = crypto.randomUUID();
	const pendingUsername = `_pending_${userId}`;
	await db.batch([
		db
			.prepare(
				"INSERT INTO users (id, email, username, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(userId, email, pendingUsername, name, avatarUrl),
		db
			.prepare(
				"INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(crypto.randomUUID(), userId, provider, providerId, email),
	]);
	return { userId, isNewUser: true };
}

export async function setUsername(
	db: D1Database,
	userId: string,
	username: string,
): Promise<{ ok: boolean; conflict: boolean }> {
	try {
		const result = await db
			.prepare(
				"UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?",
			)
			.bind(username, userId)
			.run();
		if (!result.success || result.meta.changes === 0)
			return { ok: false, conflict: false };
		return { ok: true, conflict: false };
	} catch (e: unknown) {
		if (String(e).includes("UNIQUE")) return { ok: false, conflict: true };
		throw e;
	}
}

export async function getUser(
	db: D1Database,
	userId: string,
): Promise<UserRow | null> {
	return db
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(userId)
		.first<UserRow>();
}

export async function getUserByUsername(
	db: D1Database,
	username: string,
): Promise<UserRow | null> {
	return db
		.prepare("SELECT * FROM users WHERE username = ?")
		.bind(username)
		.first<UserRow>();
}

export async function searchUsers(
	db: D1Database,
	query: string,
	limit = 10,
): Promise<Array<{ id: string; username: string; avatar_url: string | null }>> {
	const result = await db
		.prepare(
			"SELECT id, username, avatar_url FROM users WHERE username LIKE ? AND username NOT LIKE '_pending_%' LIMIT ?",
		)
		.bind(`${query}%`, limit)
		.all<{ id: string; username: string; avatar_url: string | null }>();
	return result.results;
}

export async function deleteUser(
	db: D1Database,
	userId: string,
): Promise<void> {
	await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
}

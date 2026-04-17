export interface InvitationRow {
	id: string;
	farm_id: string;
	invited_by: string;
	invited_user_id: string | null;
	invited_email: string | null;
	status: string;
	created_at: string;
	expires_at: string;
}

export interface InvitationWithDetails extends InvitationRow {
	farm_name: string;
	farm_emoji: string | null;
	inviter_username: string;
	invitee_username: string | null;
}

export async function createInvitation(
	db: D1Database,
	farmId: string,
	invitedBy: string,
	target: { userId: string } | { email: string },
): Promise<string> {
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

	if ("userId" in target) {
		await db
			.prepare(
				"INSERT INTO farm_invitations (id, farm_id, invited_by, invited_user_id, expires_at) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(id, farmId, invitedBy, target.userId, expiresAt)
			.run();
	} else {
		await db
			.prepare(
				"INSERT INTO farm_invitations (id, farm_id, invited_by, invited_email, expires_at) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(id, farmId, invitedBy, target.email, expiresAt)
			.run();
	}
	return id;
}

export async function getInvitation(
	db: D1Database,
	id: string,
): Promise<InvitationWithDetails | null> {
	return db
		.prepare(
			`SELECT fi.*, f.name AS farm_name, f.emoji AS farm_emoji,
			        u_by.username AS inviter_username,
			        u_inv.username AS invitee_username
			 FROM farm_invitations fi
			 JOIN farms f ON f.id = fi.farm_id
			 JOIN users u_by ON u_by.id = fi.invited_by
			 LEFT JOIN users u_inv ON u_inv.id = fi.invited_user_id
			 WHERE fi.id = ?`,
		)
		.bind(id)
		.first<InvitationWithDetails>();
}

export async function listFarmInvitations(
	db: D1Database,
	farmId: string,
): Promise<InvitationWithDetails[]> {
	const result = await db
		.prepare(
			`SELECT fi.*, f.name AS farm_name, f.emoji AS farm_emoji,
			        u_by.username AS inviter_username,
			        u_inv.username AS invitee_username
			 FROM farm_invitations fi
			 JOIN farms f ON f.id = fi.farm_id
			 JOIN users u_by ON u_by.id = fi.invited_by
			 LEFT JOIN users u_inv ON u_inv.id = fi.invited_user_id
			 WHERE fi.farm_id = ? AND fi.status = 'pending'
			 ORDER BY fi.created_at DESC`,
		)
		.bind(farmId)
		.all<InvitationWithDetails>();
	return result.results;
}

export async function listPendingInvitationsForUser(
	db: D1Database,
	userId: string,
	email: string | null,
): Promise<InvitationWithDetails[]> {
	if (email) {
		const result = await db
			.prepare(
				`SELECT fi.*, f.name AS farm_name, f.emoji AS farm_emoji,
				        u_by.username AS inviter_username,
				        u_inv.username AS invitee_username
				 FROM farm_invitations fi
				 JOIN farms f ON f.id = fi.farm_id
				 JOIN users u_by ON u_by.id = fi.invited_by
				 LEFT JOIN users u_inv ON u_inv.id = fi.invited_user_id
				 WHERE fi.status = 'pending'
				   AND fi.expires_at > datetime('now')
				   AND (fi.invited_user_id = ? OR fi.invited_email = ?)
				 ORDER BY fi.created_at DESC`,
			)
			.bind(userId, email)
			.all<InvitationWithDetails>();
		return result.results;
	}
	const result = await db
		.prepare(
			`SELECT fi.*, f.name AS farm_name, f.emoji AS farm_emoji,
			        u_by.username AS inviter_username,
			        u_inv.username AS invitee_username
			 FROM farm_invitations fi
			 JOIN farms f ON f.id = fi.farm_id
			 JOIN users u_by ON u_by.id = fi.invited_by
			 LEFT JOIN users u_inv ON u_inv.id = fi.invited_user_id
			 WHERE fi.status = 'pending'
			   AND fi.expires_at > datetime('now')
			   AND fi.invited_user_id = ?
			 ORDER BY fi.created_at DESC`,
		)
		.bind(userId)
		.all<InvitationWithDetails>();
	return result.results;
}

export async function updateInvitationStatus(
	db: D1Database,
	id: string,
	status: "accepted" | "declined" | "expired",
): Promise<void> {
	await db
		.prepare("UPDATE farm_invitations SET status = ? WHERE id = ?")
		.bind(status, id)
		.run();
}

export async function acceptInvitation(
	db: D1Database,
	invitation: InvitationRow,
	acceptingUserId: string,
): Promise<{ ok: boolean; error?: string }> {
	if (invitation.status !== "pending")
		return { ok: false, error: "not_pending" };
	if (invitation.expires_at < new Date().toISOString()) {
		await updateInvitationStatus(db, invitation.id, "expired");
		return { ok: false, error: "expired" };
	}

	await db.batch([
		db
			.prepare(
				"INSERT OR IGNORE INTO farm_members (farm_id, user_id, role) VALUES (?, ?, 'member')",
			)
			.bind(invitation.farm_id, acceptingUserId),
		db
			.prepare("UPDATE farm_invitations SET status = 'accepted' WHERE id = ?")
			.bind(invitation.id),
	]);

	return { ok: true };
}

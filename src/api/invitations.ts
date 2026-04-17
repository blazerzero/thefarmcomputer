import type { Env } from "@/env";
import { requireAuth, isPendingUsername } from "@/auth/session";
import { isFarmMember, isFarmOwner, getFarm } from "@/user-db/farms";
import {
	createInvitation,
	getInvitation as dbGetInvitation,
	listFarmInvitations,
	listPendingInvitationsForUser,
	updateInvitationStatus,
	acceptInvitation as dbAcceptInvitation,
} from "@/user-db/invitations";
import { getUserByUsername, getUser } from "@/user-db/users";
import { sendInvitationEmail } from "@/email/invitations";

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function checkSetup(
	request: Request,
	env: Env,
): Promise<{ userId: string; session: { username: string } } | Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	if (isPendingUsername(auth.session.username))
		return json({ error: "username_required" }, 403);
	return { userId: auth.session.userId, session: auth.session };
}

export async function handleCreateInvitation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	if (!owner) return json({ error: "forbidden" }, 403);

	const farm = await getFarm(env.USER_DB, farmId);
	if (!farm) return json({ error: "not_found" }, 404);

	let body: { username?: string; email?: string };
	try {
		body = (await request.json()) as { username?: string; email?: string };
	} catch {
		return json({ error: "invalid_json" }, 400);
	}

	const { username, email } = body;
	if (!username && !email)
		return json({ error: "provide_username_or_email" }, 400);

	let invitationId: string;

	if (username) {
		// Invite by username
		const targetUser = await getUserByUsername(env.USER_DB, username);
		if (!targetUser) return json({ error: "user_not_found" }, 404);
		if (targetUser.id === user.userId)
			return json({ error: "cannot_invite_self" }, 400);

		const alreadyMember = await isFarmMember(
			env.USER_DB,
			farmId,
			targetUser.id,
		);
		if (alreadyMember) return json({ error: "already_member" }, 409);

		invitationId = await createInvitation(env.USER_DB, farmId, user.userId, {
			userId: targetUser.id,
		});

		// Send email notification if the invited user has an email on file
		if (targetUser.email) {
			try {
				await sendInvitationEmail({
					toEmail: targetUser.email,
					inviterUsername: user.session.username,
					farmName: farm.name,
					farmEmoji: farm.emoji,
					invitationId,
					deployUrl: env.DEPLOY_URL,
					resendApiKey: env.RESEND_API_KEY,
					resendFromEmail: env.RESEND_FROM_EMAIL,
					isNewUserInvite: false,
				});
			} catch {
				// Non-fatal: invitation was created, email failed silently
			}
		}
	} else if (email) {
		// Invite by email — check if the email belongs to an existing user
		const existingUser = await env.USER_DB.prepare(
			"SELECT id, email FROM users WHERE email = ? AND username NOT LIKE '_pending_%'",
		)
			.bind(email)
			.first<{ id: string; email: string }>();

		if (existingUser) {
			if (existingUser.id === user.userId)
				return json({ error: "cannot_invite_self" }, 400);
			const alreadyMember = await isFarmMember(
				env.USER_DB,
				farmId,
				existingUser.id,
			);
			if (alreadyMember) return json({ error: "already_member" }, 409);
			invitationId = await createInvitation(env.USER_DB, farmId, user.userId, {
				userId: existingUser.id,
			});
		} else {
			invitationId = await createInvitation(env.USER_DB, farmId, user.userId, {
				email,
			});
		}

		try {
			await sendInvitationEmail({
				toEmail: email,
				inviterUsername: user.session.username,
				farmName: farm.name,
				farmEmoji: farm.emoji,
				invitationId,
				deployUrl: env.DEPLOY_URL,
				resendApiKey: env.RESEND_API_KEY,
				isNewUserInvite: !existingUser,
			});
		} catch {
			// Non-fatal
		}
	} else {
		return json({ error: "provide_username_or_email" }, 400);
	}

	return json({ ok: true, invitation_id: invitationId }, 201);
}

export async function handleListInvitations(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	if (!owner) return json({ error: "forbidden" }, 403);

	const invitations = await listFarmInvitations(env.USER_DB, farmId);
	return json({ invitations });
}

export async function handleCancelInvitation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, id } = params;
	if (!farmId || !id) return json({ error: "missing_params" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	if (!owner) return json({ error: "forbidden" }, 403);

	await updateInvitationStatus(env.USER_DB, id, "expired");
	return json({ ok: true });
}

export async function handleGetPendingInvitations(
	request: Request,
	env: Env,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const currentUser = await getUser(env.USER_DB, user.userId);
	const invitations = await listPendingInvitationsForUser(
		env.USER_DB,
		user.userId,
		currentUser?.email ?? null,
	);
	return json({ invitations });
}

export async function handleGetInvitation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const { id } = params;
	if (!id) return json({ error: "missing_id" }, 400);

	const invitation = await dbGetInvitation(env.USER_DB, id);
	if (!invitation) return json({ error: "not_found" }, 404);

	// Return safe public info (don't expose invited_email to anyone but the owner)
	return json({
		id: invitation.id,
		farm_id: invitation.farm_id,
		farm_name: invitation.farm_name,
		farm_emoji: invitation.farm_emoji,
		inviter_username: invitation.inviter_username,
		status: invitation.status,
		expires_at: invitation.expires_at,
	});
}

export async function handleAcceptInvitation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	// Allow accepting even if username is pending (edge case: invited before setting username)

	const { id } = params;
	if (!id) return json({ error: "missing_id" }, 400);

	const invitation = await dbGetInvitation(env.USER_DB, id);
	if (!invitation) return json({ error: "not_found" }, 404);

	// Verify the accepting user is the invited party
	const currentUser = await getUser(env.USER_DB, auth.session.userId);
	const isTargetUser = invitation.invited_user_id === auth.session.userId;
	const isTargetEmail =
		invitation.invited_email !== null &&
		currentUser?.email === invitation.invited_email;
	if (!isTargetUser && !isTargetEmail) return json({ error: "forbidden" }, 403);

	// If invited by email and we have a user_id now, update the row to link them
	if (!invitation.invited_user_id && isTargetEmail) {
		await env.USER_DB.prepare(
			"UPDATE farm_invitations SET invited_user_id = ? WHERE id = ?",
		)
			.bind(auth.session.userId, id)
			.run();
		invitation.invited_user_id = auth.session.userId;
	}

	const result = await dbAcceptInvitation(
		env.USER_DB,
		invitation,
		auth.session.userId,
	);
	if (!result.ok) return json({ error: result.error }, 400);

	return json({ ok: true, farm_id: invitation.farm_id });
}

export async function handleDeclineInvitation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;

	const { id } = params;
	if (!id) return json({ error: "missing_id" }, 400);

	const invitation = await dbGetInvitation(env.USER_DB, id);
	if (!invitation) return json({ error: "not_found" }, 404);

	const currentUser = await getUser(env.USER_DB, auth.session.userId);
	const isTargetUser = invitation.invited_user_id === auth.session.userId;
	const isTargetEmail =
		invitation.invited_email !== null &&
		currentUser?.email === invitation.invited_email;
	if (!isTargetUser && !isTargetEmail) return json({ error: "forbidden" }, 403);

	await updateInvitationStatus(env.USER_DB, id, "declined");
	return json({ ok: true });
}

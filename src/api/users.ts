import type { Env } from "@/env";
import {
	requireAuth,
	createSessionToken,
	buildSessionCookie,
	isSecure,
	isPendingUsername,
} from "@/auth/session";
import {
	getUser,
	setUsername,
	deleteUser,
	searchUsers as dbSearchUsers,
	isValidUsername,
} from "@/user-db/users";
import { listFarmsForUser } from "@/user-db/farms";

export async function handleGetMe(
	request: Request,
	env: Env,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	const { session } = auth;

	const user = await getUser(env.USER_DB, session.userId);
	if (!user) return json({ error: "not_found" }, 404);

	return json({
		id: user.id,
		email: user.email,
		username: user.username,
		display_name: user.display_name,
		avatar_url: user.avatar_url,
		setup_required: isPendingUsername(user.username),
	});
}

export async function handleSetUsername(
	request: Request,
	env: Env,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	const { session } = auth;

	let body: { username?: string };
	try {
		body = (await request.json()) as { username?: string };
	} catch {
		return json({ error: "invalid_json" }, 400);
	}

	const { username } = body;
	if (!username) return json({ error: "missing_username" }, 400);
	if (!isValidUsername(username))
		return json(
			{
				error: "invalid_format",
				message:
					"Username must be 3–24 characters: lowercase letters, numbers, underscores only.",
			},
			422,
		);

	const result = await setUsername(env.USER_DB, session.userId, username);
	if (result.conflict) return json({ ok: false, error: "taken" }, 409);
	if (!result.ok) return json({ ok: false, error: "unknown" }, 500);

	// Re-issue session cookie with new username
	const now = Math.floor(Date.now() / 1000);
	const newToken = await createSessionToken(
		{ userId: session.userId, username, iat: now, exp: now + 604800 },
		env.JWT_SECRET,
	);
	return new Response(JSON.stringify({ ok: true, username }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": buildSessionCookie(newToken, isSecure(env)),
		},
	});
}

export async function handleDeleteAccount(
	request: Request,
	env: Env,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	const { session } = auth;

	// Guard: if user owns farms with other members, refuse
	const farms = await listFarmsForUser(env.USER_DB, session.userId);
	for (const farm of farms) {
		if (farm.role === "owner") {
			const members = await env.USER_DB.prepare(
				"SELECT COUNT(*) as cnt FROM farm_members WHERE farm_id = ?",
			)
				.bind(farm.id)
				.first<{ cnt: number }>();
			if (members && members.cnt > 1) {
				return json(
					{
						error: "transfer_ownership_first",
						farm_id: farm.id,
						farm_name: farm.name,
					},
					409,
				);
			}
		}
	}

	await deleteUser(env.USER_DB, session.userId);
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isSecure(env) ? "; Secure" : ""}`,
		},
	});
}

export async function handleSearchUsers(
	request: Request,
	env: Env,
): Promise<Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;

	const url = new URL(request.url);
	const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
	if (!q || q.length < 1) return json({ users: [] });

	const users = await dbSearchUsers(env.USER_DB, q, 10);
	return json({ users });
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

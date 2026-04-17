import type { Env } from "@/env";
import { buildStateParam, verifyStateParam } from "@/auth/oauth";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "@/auth/google";
import { upsertOAuthUser } from "@/user-db/users";
import {
	createSessionToken,
	buildSessionCookie,
	clearSessionCookie,
	isSecure,
	getSession,
} from "@/auth/session";
import { badRequest, serverError } from "@/api/response";

function googleRedirectUri(env: Env): string {
	return `${env.DEPLOY_URL}/auth/google/callback`;
}

export async function handleGoogleStart(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const redirectTo = url.searchParams.get("redirect") ?? "/dashboard";
	const state = await buildStateParam(
		{ nonce: crypto.randomUUID(), redirectTo },
		env.JWT_SECRET,
	);
	const authUrl = buildGoogleAuthUrl(
		env.GOOGLE_CLIENT_ID,
		googleRedirectUri(env),
		state,
	);
	return Response.redirect(authUrl, 302);
}

export async function handleGoogleCallback(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const stateParam = url.searchParams.get("state");

	if (!code || !stateParam) return badRequest("Missing code or state");

	const state = await verifyStateParam(stateParam, env.JWT_SECRET);
	if (!state) return badRequest("Invalid state param");

	let claims: Awaited<ReturnType<typeof exchangeGoogleCode>>;
	try {
		claims = await exchangeGoogleCode(
			code,
			googleRedirectUri(env),
			env.GOOGLE_CLIENT_ID,
			env.GOOGLE_CLIENT_SECRET,
		);
	} catch (e) {
		return serverError(String(e));
	}

	const { userId, isNewUser } = await upsertOAuthUser(
		env.USER_DB,
		"google",
		claims.sub,
		claims.email ?? null,
		claims.name ?? null,
		claims.picture ?? null,
	);

	const now = Math.floor(Date.now() / 1000);
	const token = await createSessionToken(
		{
			userId,
			username: isNewUser
				? `_pending_${userId}`
				: await getUsernameForSession(env.USER_DB, userId),
			iat: now,
			exp: now + 604800,
		},
		env.JWT_SECRET,
	);

	const dest = isNewUser ? "/username-setup" : state.redirectTo;
	return new Response(null, {
		status: 302,
		headers: {
			Location: dest,
			"Set-Cookie": buildSessionCookie(token, isSecure(env)),
		},
	});
}

export async function handleLogout(
	request: Request,
	env: Env,
): Promise<Response> {
	const session = await getSession(request, env.JWT_SECRET);
	if (!session)
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": clearSessionCookie(isSecure(env)),
		},
	});
}

async function getUsernameForSession(
	db: D1Database,
	userId: string,
): Promise<string> {
	const row = await db
		.prepare("SELECT username FROM users WHERE id = ?")
		.bind(userId)
		.first<{ username: string }>();
	return row?.username ?? `_pending_${userId}`;
}

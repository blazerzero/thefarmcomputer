import type { Env } from "@/env";
import { buildStateParam, verifyStateParam } from "@/auth/oauth";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "@/auth/google";
import {
	buildAppleAuthUrl,
	exchangeAppleCode,
	generateAppleClientSecret,
	parseAppleCallback,
} from "@/auth/apple";
import { upsertOAuthUser } from "@/user-db/users";
import {
	createSessionToken,
	buildSessionCookie,
	clearSessionCookie,
	isSecure,
	getSession,
} from "@/auth/session";

function googleRedirectUri(env: Env): string {
	return `${env.DEPLOY_URL}/auth/google/callback`;
}

function appleRedirectUri(env: Env): string {
	return `${env.DEPLOY_URL}/auth/apple/callback`;
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

export async function handleAppleStart(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const redirectTo = url.searchParams.get("redirect") ?? "/dashboard";
	const state = await buildStateParam(
		{ nonce: crypto.randomUUID(), redirectTo },
		env.JWT_SECRET,
	);
	const authUrl = buildAppleAuthUrl(
		env.APPLE_CLIENT_ID,
		appleRedirectUri(env),
		state,
	);
	return Response.redirect(authUrl, 302);
}

export async function handleAppleCallback(
	request: Request,
	env: Env,
): Promise<Response> {
	const data = await parseAppleCallback(request);
	if (!data) return badRequest("Invalid Apple callback");

	const state = await verifyStateParam(data.state, env.JWT_SECRET);
	if (!state) return badRequest("Invalid state param");

	let clientSecret: string;
	try {
		clientSecret = await generateAppleClientSecret(env);
	} catch (e) {
		return serverError(`Apple client_secret error: ${String(e)}`);
	}

	let claims: Awaited<ReturnType<typeof exchangeAppleCode>>;
	try {
		claims = await exchangeAppleCode(
			data.code,
			appleRedirectUri(env),
			env.APPLE_CLIENT_ID,
			clientSecret,
		);
	} catch (e) {
		return serverError(String(e));
	}

	// Apple only sends name on first login — use it if present
	const name = data.user
		? [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") ||
			null
		: null;
	const email = data.user?.email ?? claims.email ?? null;

	const { userId, isNewUser } = await upsertOAuthUser(
		env.USER_DB,
		"apple",
		claims.sub,
		email,
		name,
		null, // Apple doesn't provide an avatar
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

function badRequest(msg: string): Response {
	return new Response(JSON.stringify({ error: msg }), {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});
}

function serverError(msg: string): Response {
	return new Response(JSON.stringify({ error: msg }), {
		status: 500,
		headers: { "Content-Type": "application/json" },
	});
}

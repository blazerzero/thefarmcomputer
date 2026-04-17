import type { Env } from "@/env";
import { base64urlEncode, base64urlDecode } from "@/auth/encoding";

export interface SessionPayload {
	userId: string;
	username: string;
	iat: number;
	exp: number;
}

// ── JWT helpers (HMAC-SHA256, no external library) ────────────────────────────

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function createSessionToken(
	payload: SessionPayload,
	secret: string,
): Promise<string> {
	const header = base64urlEncode(
		new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
			.buffer as ArrayBuffer,
	);
	const body = base64urlEncode(
		new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer,
	);
	const signingInput = `${header}.${body}`;
	const key = await hmacKey(secret);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(signingInput),
	);
	return `${signingInput}.${base64urlEncode(sig)}`;
}

export async function verifySessionToken(
	token: string,
	secret: string,
): Promise<SessionPayload | null> {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [header, body, sigB64] = parts as [string, string, string];
	const signingInput = `${header}.${body}`;
	const key = await hmacKey(secret);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		base64urlDecode(sigB64).buffer as ArrayBuffer,
		new TextEncoder().encode(signingInput).buffer as ArrayBuffer,
	);
	if (!valid) return null;
	try {
		const payload = JSON.parse(
			new TextDecoder().decode(base64urlDecode(body)),
		) as SessionPayload;
		if (payload.exp < Math.floor(Date.now() / 1000)) return null;
		return payload;
	} catch {
		return null;
	}
}

export function buildSessionCookie(token: string, secure: boolean): string {
	return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean): string {
	return `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function getSession(
	request: Request,
	secret: string,
): Promise<SessionPayload | null> {
	const cookie = request.headers.get("Cookie") ?? "";
	const match = /(?:^|;\s*)session=([^\s;]+)/.exec(cookie);
	if (!match || !match[1]) return null;
	return verifySessionToken(match[1], secret);
}

export async function requireAuth(
	request: Request,
	env: Env,
): Promise<{ session: SessionPayload } | Response> {
	const session = await getSession(request, env.JWT_SECRET);
	if (!session)
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	return { session };
}

export function isPendingUsername(username: string): boolean {
	return username.startsWith("_pending_");
}

export function isSecure(env: Env): boolean {
	return env.DEPLOY_URL.startsWith("https://");
}

/** Re-issues a refreshed cookie if the session expires within 24 hours. */
export async function maybeRefreshCookie(
	session: SessionPayload,
	env: Env,
): Promise<string | null> {
	const oneDayFromNow = Math.floor(Date.now() / 1000) + 86400;
	if (session.exp > oneDayFromNow) return null;
	const newToken = await createSessionToken(
		{
			userId: session.userId,
			username: session.username,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 604800,
		},
		env.JWT_SECRET,
	);
	return buildSessionCookie(newToken, isSecure(env));
}

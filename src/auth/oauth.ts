import { base64urlEncode } from "@/auth/encoding";

export interface OAuthState {
	nonce: string;
	redirectTo: string;
}

export interface OIDCTokenClaims {
	sub: string;
	email?: string;
	name?: string;
	picture?: string;
}

// ── State param CSRF protection ───────────────────────────────────────────────

async function hmacSign(data: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(data),
	);
	return base64urlEncode(sig);
}

export async function buildStateParam(
	state: OAuthState,
	secret: string,
): Promise<string> {
	const json = base64urlEncode(
		new TextEncoder().encode(JSON.stringify(state)).buffer as ArrayBuffer,
	);
	const sig = await hmacSign(json, secret);
	return `${json}.${sig}`;
}

export async function verifyStateParam(
	param: string,
	secret: string,
): Promise<OAuthState | null> {
	const dot = param.lastIndexOf(".");
	if (dot === -1) return null;
	const json = param.slice(0, dot);
	const sig = param.slice(dot + 1);
	const expected = await hmacSign(json, secret);
	if (sig !== expected) return null;
	try {
		return JSON.parse(
			atob(json.replace(/-/g, "+").replace(/_/g, "/")),
		) as OAuthState;
	} catch {
		return null;
	}
}

// ── OIDC id_token decoder (no signature verification — token arrived over TLS) ─

export function decodeOIDCToken(idToken: string): OIDCTokenClaims {
	const parts = idToken.split(".");
	if (parts.length < 2 || !parts[1]) throw new Error("Invalid id_token");
	const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
	return JSON.parse(atob(padded)) as OIDCTokenClaims;
}

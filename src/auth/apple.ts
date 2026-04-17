import type { OIDCTokenClaims } from "@/auth/oauth";
import { decodeOIDCToken } from "@/auth/oauth";

interface AppleEnv {
	APPLE_PRIVATE_KEY: string;
	APPLE_KEY_ID: string;
	APPLE_TEAM_ID: string;
	APPLE_CLIENT_ID: string;
}

function base64urlEncode(buf: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generates a short-lived JWT signed with your Apple .p8 private key (ES256).
 * Apple requires this as the client_secret in token exchange requests.
 */
export async function generateAppleClientSecret(
	env: AppleEnv,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = base64urlEncode(
		new TextEncoder().encode(
			JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID }),
		).buffer as ArrayBuffer,
	);
	const payload = base64urlEncode(
		new TextEncoder().encode(
			JSON.stringify({
				iss: env.APPLE_TEAM_ID,
				iat: now,
				exp: now + 3600,
				aud: "https://appleid.apple.com",
				sub: env.APPLE_CLIENT_ID,
			}),
		).buffer as ArrayBuffer,
	);
	const signingInput = `${header}.${payload}`;

	// Strip PEM header/footer and decode base64
	const pem = env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
	const pemBody = pem
		.replace(/-----BEGIN PRIVATE KEY-----/, "")
		.replace(/-----END PRIVATE KEY-----/, "")
		.replace(/\s/g, "");
	const pkcs8 = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

	const key = await crypto.subtle.importKey(
		"pkcs8",
		pkcs8,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);

	// ECDSA with SHA-256 produces a DER-encoded signature; Apple expects raw r||s (64 bytes)
	const derSig = await crypto.subtle.sign(
		{ name: "ECDSA", hash: "SHA-256" },
		key,
		new TextEncoder().encode(signingInput),
	);
	const rawSig = derToRaw(new Uint8Array(derSig));
	return `${signingInput}.${base64urlEncode(rawSig)}`;
}

/** Converts DER-encoded ECDSA signature to raw r||s format (32+32 bytes for P-256). */
function derToRaw(der: Uint8Array): ArrayBuffer {
	let offset = 2; // skip sequence tag + length
	if (der[1] === 0x81) offset = 3; // long form length
	offset++; // skip integer tag for r
	const rLen = der[offset++] as number;
	const r = der.slice(offset, offset + rLen);
	offset += rLen;
	offset++; // skip integer tag for s
	const sLen = der[offset++] as number;
	const s = der.slice(offset, offset + sLen);
	// Pad to 32 bytes each
	const result = new Uint8Array(64);
	result.set(r.slice(-32), 32 - Math.min(r.length, 32));
	result.set(s.slice(-32), 64 - Math.min(s.length, 32));
	return result.buffer;
}

export function buildAppleAuthUrl(
	clientId: string,
	redirectUri: string,
	state: string,
): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code id_token",
		scope: "name email",
		response_mode: "form_post",
		state,
	});
	return `https://appleid.apple.com/auth/authorize?${params}`;
}

export interface AppleUserInfo {
	firstName?: string;
	lastName?: string;
	email?: string;
}

export interface AppleCallbackData {
	code: string;
	state: string;
	idToken: string;
	user?: AppleUserInfo;
}

/** Parses Apple's POST callback body (application/x-www-form-urlencoded). */
export async function parseAppleCallback(
	request: Request,
): Promise<AppleCallbackData | null> {
	try {
		const body = await request.formData();
		const code = body.get("code") as string | null;
		const state = body.get("state") as string | null;
		const idToken = body.get("id_token") as string | null;
		if (!code || !state || !idToken) return null;
		const userStr = body.get("user") as string | null;
		let user: AppleUserInfo | undefined;
		if (userStr) {
			const parsed = JSON.parse(userStr) as {
				name?: { firstName?: string; lastName?: string };
				email?: string;
			};
			user = {
				firstName: parsed.name?.firstName,
				lastName: parsed.name?.lastName,
				email: parsed.email,
			};
		}
		return { code, state, idToken, user };
	} catch {
		return null;
	}
}

export async function exchangeAppleCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string,
): Promise<OIDCTokenClaims> {
	const res = await fetch("https://appleid.apple.com/auth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "authorization_code",
		}),
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Apple token exchange failed: ${res.status} ${err}`);
	}
	const data = (await res.json()) as { id_token?: string };
	if (!data.id_token) throw new Error("No id_token in Apple response");
	return decodeOIDCToken(data.id_token);
}

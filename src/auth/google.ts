import type { OIDCTokenClaims } from "@/auth/oauth";
import { decodeOIDCToken } from "@/auth/oauth";

export function buildGoogleAuthUrl(
	clientId: string,
	redirectUri: string,
	state: string,
): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "openid email profile",
		state,
		prompt: "select_account",
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string,
): Promise<OIDCTokenClaims> {
	const res = await fetch("https://oauth2.googleapis.com/token", {
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
		throw new Error(`Google token exchange failed: ${res.status} ${err}`);
	}
	const data = (await res.json()) as { id_token?: string };
	if (!data.id_token) throw new Error("No id_token in Google response");
	return decodeOIDCToken(data.id_token);
}

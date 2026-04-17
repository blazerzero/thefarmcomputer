/** Cloudflare Worker environment bindings. */
export interface Env {
	ASSETS: Fetcher;
	STARDEW_DO: DurableObjectNamespace;
	DISCORD_APPLICATION_ID: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_TOKEN: string;
	BOT_OWNER_TOKEN: string;
	DEPLOY_URL: string;
	OG_IMAGE_URL: string;
	OVERRIDE_DISCORD_AUTH?: string; // For testing: if set to true, skip signature verification and auth checks.

	// User account system
	USER_DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	JWT_SECRET: string; // 32+ byte random hex for HMAC-SHA256
	RESEND_API_KEY: string;
}

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
	APPLE_CLIENT_ID: string; // Services ID, e.g. "dev.thefarmcomputer.signin"
	APPLE_TEAM_ID: string; // 10-char Apple Developer Team ID
	APPLE_KEY_ID: string; // Key ID from Apple Developer portal
	APPLE_PRIVATE_KEY: string; // Full PEM content of .p8 key (newlines as \n)
	JWT_SECRET: string; // 32+ byte random hex for HMAC-SHA256
	RESEND_API_KEY: string;
}

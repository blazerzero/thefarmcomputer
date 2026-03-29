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
}

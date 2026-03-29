// biome-ignore-all lint/correctness/noUnusedVariables: This is how Vite specifies to declare this
interface ViteTypeOptions {
	// By adding this line, you can make the type of ImportMetaEnv strict
	// to disallow unknown keys.
	// strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
	readonly VITE_DEPLOY_URL: string;
	readonly VITE_OG_IMAGE_URL: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

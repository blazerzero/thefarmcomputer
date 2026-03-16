/** Build a minimal SqlStorage mock that returns the given rows for every exec() call. */
export function makeSql(rows: Record<string, unknown>[] = []): SqlStorage {
	const cursor = {
		toArray: () => rows,
		one: () => rows[0] ?? null,
	};
	return { exec: () => cursor } as unknown as SqlStorage;
}

/** Shape of a Discord embed field. */
export interface EmbedField {
	name: string;
	value: string;
	inline: boolean;
}

/** Shape of a Discord embed as returned by command handlers. */
export interface Embed {
	title?: string;
	url?: string;
	color?: number;
	description?: string;
	thumbnail?: { url: string };
	fields?: EmbedField[];
	footer?: { text: string };
}

/** Full Discord interaction response. */
export interface DiscordResponse {
	type: number;
	data: {
		embeds?: Embed[];
		content?: string;
		flags?: number;
	};
}

/** Response from /api/query. */
export interface WebApiResponse {
	embed?: Embed;
	error?: string;
}

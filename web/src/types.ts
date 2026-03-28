export interface EmbedField {
	name: string;
	value: string;
	inline: boolean;
}

export interface DiscordEmbed {
	title?: string;
	url?: string;
	color?: number;
	description?: string;
	thumbnail?: { url: string };
	fields?: EmbedField[];
	footer?: { text: string };
}

export interface QueryResult {
	embed?: DiscordEmbed;
	error?: string;
}

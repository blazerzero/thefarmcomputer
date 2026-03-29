import { DEFAULT_COLOR, SEASON_COLORS } from "../constants";
import { InteractionResponseType } from "../types";

/** Extract a named option value from a Discord interaction's option list. */
export function getOption(
	interaction: Record<string, unknown>,
	name: string,
): string {
	const options = (interaction.data as Record<string, unknown>)?.options as
		| Array<{ name: string; value: string }>
		| undefined;
	return options?.find((o) => o.name === name)?.value ?? "";
}

/** Build an ephemeral "not found" response. */
export function notFoundResponse(content: string): Response {
	return Response.json({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 },
	});
}

/** Build a response containing a single embed. */
export function embedResponse(embed: Record<string, unknown>): Response {
	return Response.json({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { embeds: [embed] },
	});
}

/** Pick an embed color based on the first recognized season in the list. */
export function seasonColor(seasons: string[]): number {
	for (const s of seasons) {
		if (s in SEASON_COLORS) return SEASON_COLORS[s]!;
	}
	return DEFAULT_COLOR;
}

/** Format standard quality price tiers (Normal/Silver/Gold/Iridium) into a display string. */
export function formatPriceTiers(
	sell_price: number | null,
	sell_price_silver: number | null,
	sell_price_gold: number | null,
	sell_price_iridium: number | null,
): string {
	return (
		(
			[
				["Normal", sell_price],
				["Silver", sell_price_silver],
				["Gold", sell_price_gold],
				["Iridium", sell_price_iridium],
			] as [string, number | null][]
		)
			.filter(([, price]) => price != null)
			.map(
				([label, price]) => `${label}: ${(price as number).toLocaleString()}g`,
			)
			.join("\n") || "—"
	);
}

export const renderDotForListContent = (count: number): string =>
	count > 1 ? "• " : "";

/** Prepend bullet dots to each item and join into a Discord embed field value (max 1024 chars).
 * Items that follow a conditional header (a line ending in ":") are indented one level with "- ". */
export const renderDotList = (items: string[]): string => {
	const n = items.length;
	let afterHeader = false;
	return items
		.map((s) => {
			const isHeader = s.trimEnd().endsWith(":");
			if (isHeader) {
				afterHeader = true;
				return `${renderDotForListContent(n)}${s}`;
			}
			if (afterHeader) return `  - ${s}`;
			return `${renderDotForListContent(n)}${s}`;
		})
		.join("\n")
		.slice(0, 1024);
};

/** Format a number with an explicit sign: +3, -2, +0. */
export const sign = (n: number): string => (n >= 0 ? `+${n}` : String(n));

export const unbulletList = (list: string[]): string[] => {
	const bullet = "• ";
	return list.reduce((acc, item) => {
		if (item.startsWith(bullet)) acc.push(item.replace(bullet, ""));
		else acc.push(item);
		return acc;
	}, [] as string[]);
};

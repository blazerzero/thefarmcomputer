import { formatDate } from "../constants";
import { getRing } from "../db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

export function handleRing(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const ring = getRing(sql, name);

	if (!ring) {
		return notFoundResponse(
			`No ring named **${name}** found. Check the spelling (e.g. \`Lucky Ring\`, \`Iridium Band\`, \`Glow Ring\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [
		{
			name: "Sells For",
			value: ring.sell_price !== null ? `${ring.sell_price}g` : "N/A",
			inline: true,
		},
		{
			name: "Effects",
			value: ring.effects ?? "N/A",
			inline: true,
		},
		{
			name: "Where to Find",
			value: renderDotList(ring.where_to_find),
			inline: false,
		},
	];

	return embedResponse({
		title: ring.name,
		url: ring.wiki_url,
		color: 0xc89b3c,
		description: ring.description ?? undefined,
		thumbnail: ring.image_url ? { url: ring.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(ring.last_updated)}`,
		},
	});
}

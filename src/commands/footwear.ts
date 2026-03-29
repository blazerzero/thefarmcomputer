import { DEFAULT_COLOR, formatDate } from "../constants";
import { getFootwear } from "../db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

export function handleFootwear(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getFootwear(sql, name);

	if (!item) {
		return notFoundResponse(
			`No footwear named **${name}** found. Check the spelling (e.g. \`Sneakers\`, \`Genie Shoes\`, \`Space Boots\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	fields.push({
		name: "Stats",
		value: item.stats.length > 0 ? renderDotList(item.stats) : "N/A",
		inline: true,
	});

	fields.push({
		name: "Source",
		value: item.source.length > 0 ? renderDotList(item.source) : "N/A",
		inline: true,
	});

	fields.push({
		name: "Purchase Price",
		value: item.purchase_price != null ? `${item.purchase_price}g` : "N/A",
		inline: true,
	});

	fields.push({
		name: "Sells For",
		value: item.sell_price != null ? `${item.sell_price}g` : "N/A",
		inline: true,
	});

	return embedResponse({
		title: item.name,
		description: item.description ?? undefined,
		url: item.wiki_url,
		color: DEFAULT_COLOR,
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
		},
	});
}

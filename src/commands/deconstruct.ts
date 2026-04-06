import { formatDate } from "@/constants";
import { getDeconstructItem } from "@/db";
import { embedResponse, getOption, notFoundResponse } from "./utils";

const DECONSTRUCT_COLOR = 0x607d8b;

export function handleDeconstruct(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getDeconstructItem(sql, name);

	if (!item) {
		return notFoundResponse(
			`No item named **${name}** found in the Deconstructor table. Check the spelling (e.g. \`Sprinkler\`, \`Crab Pot\`, \`Staircase\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	fields.push({
		name: "Sells For",
		value: item.sell_price != null ? `${item.sell_price}g` : "N/A",
		inline: true,
	});

	const outputLines =
		item.deconstructed_items.length > 0
			? item.deconstructed_items.map(
					(d) => `• ${d.quantity}× ${d.name}`,
				)
			: ["N/A"];
	fields.push({
		name: "Deconstructed Into",
		value: outputLines.join("\n"),
		inline: false,
	});

	return embedResponse({
		title: item.name,
		url: item.wiki_url,
		color: DECONSTRUCT_COLOR,
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
		},
	});
}

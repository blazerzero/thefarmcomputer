import { formatDate } from "@/constants";
import { getDeconstructorItem } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

const DECONSTRUCT_COLOR = 0x607d8b;

export function handleDeconstruct(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getDeconstructorItem(sql, name);

	if (!item) {
		return notFoundResponse(
			`No item named **${name}** found in the Deconstructor table. Check the spelling (e.g. \`Sprinkler\`, \`Crab Pot\`, \`Staircase\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	fields.push({
		name: "Deconstructs Into",
		value: renderDotList(
			item.deconstructed_items.map((i) => `${i.quantity}× ${i.name}`),
		),
		inline: true,
	});

	fields.push({
		name: "Deconstructed Material Value",
		value: item.sell_price ?? "N/A",
		inline: true,
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

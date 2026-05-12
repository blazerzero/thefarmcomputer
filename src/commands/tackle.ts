import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getTackle } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

export function handleTackle(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getTackle(sql, name);

	if (!item) {
		return notFoundResponse(
			`No tackle named **${name}** found. Check the spelling (e.g. \`Spinner\`, \`Trap Bobber\`, \`Barbed Hook\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	fields.push({
		name: "Notes",
		value: item.notes ?? "N/A",
		inline: false,
	});

	fields.push({
		name: "Purchase Price",
		value: item.purchase_price != null ? `${item.purchase_price}g` : "N/A",
		inline: true,
	});

	fields.push({
		name: "Crafting",
		value: item.crafting.length > 0 ? renderDotList(item.crafting) : "N/A",
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

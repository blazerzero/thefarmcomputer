import { formatDate } from "@/constants";
import { getFruit } from "@/db";
import {
	embedResponse,
	formatPriceTiers,
	getEnergyHealthValue,
	getOption,
	notFoundResponse,
	renderDotList,
	seasonColor,
} from "./utils";

export function handleFruit(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getFruit(sql, name);

	if (!item) {
		return notFoundResponse(
			`No fruit named **${name}** found. Check the spelling (e.g. \`Apple\`, \`Blueberry\`, \`Cranberry\`).`,
		);
	}

	const seasonsValue =
		item.seasons.length === 0 ? "All Seasons" : item.seasons.join(", ");

	return embedResponse({
		title: item.name,
		url: item.wiki_url,
		color: seasonColor(item.seasons),
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields: [
			{ name: "Source", value: item.source ?? "—", inline: true },
			{ name: "Seasons", value: seasonsValue, inline: true },
			{
				name: "Sells For",
				value: formatPriceTiers(
					item.sell_price,
					item.sell_price_silver,
					item.sell_price_gold,
					item.sell_price_iridium,
				),
				inline: true,
			},
			{ name: "Energy / Health", value: getEnergyHealthValue(item), inline: true },
			...(item.used_in.length > 0
				? [
						{
							name: "Used In",
							value: renderDotList(item.used_in),
							inline: false,
						},
					]
				: []),
		],
		footer: item.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
				}
			: undefined,
	});
}

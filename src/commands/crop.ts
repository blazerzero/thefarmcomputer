import { formatDate } from "@/constants";
import { getCrop } from "@/db";
import {
	embedResponse,
	formatPriceTiers,
	getEnergyHealthValues,
	getOption,
	notFoundResponse,
	renderDotList,
	seasonColor,
} from "./utils";

export function handleCrop(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const crop = getCrop(sql, name);

	if (!crop) {
		return notFoundResponse(
			`No crop named **${name}** found. Check the spelling (e.g. \`Parsnip\`, \`Blueberry\`).`,
		);
	}

	return embedResponse({
		title: crop.name,
		description: crop.description ?? undefined,
		url: crop.wiki_url,
		color: seasonColor(crop.seasons),
		thumbnail: crop.image_url ? { url: crop.image_url } : undefined,
		fields: [
			{
				name: "Seasons",
				value: crop.seasons.length ? crop.seasons.join(", ") : "—",
				inline: true,
			},
			{
				name: "Growth Time",
				value: crop.growth_days != null ? `${crop.growth_days} days` : "—",
				inline: true,
			},
			{
				name: "Regrowth",
				value:
					crop.regrowth_days != null
						? `${crop.regrowth_days} days`
						: "Single harvest",
				inline: true,
			},
			{
				name: "Seed Price",
				value:
					crop.buy_price != null ? `${crop.buy_price.toLocaleString()}g` : "—",
				inline: true,
			},
			{
				name: "Sells For",
				value: formatPriceTiers(
					crop.sell_price,
					crop.sell_price_silver,
					crop.sell_price_gold,
					crop.sell_price_iridium,
				),
				inline: true,
			},
			{
				name: "Energy / Health",
				value: getEnergyHealthValues(crop),
				inline: true,
			},
			{
				name: "Trellis",
				value: crop.is_trellis ? "Yes" : "No",
				inline: true,
			},
			...(crop.used_in.length > 0
				? [
						{
							name: "Used In",
							value: renderDotList(crop.used_in),
							inline: true,
						},
					]
				: []),
		],
		footer: crop.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(crop.last_updated)}`,
				}
			: undefined,
	});
}

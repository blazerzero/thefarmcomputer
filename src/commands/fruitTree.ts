import { DEFAULT_COLOR, SEASON_COLORS, formatDate } from "../constants";
import { getFruitTree } from "../db";
import {
	embedResponse,
	formatPriceTiers,
	getOption,
	notFoundResponse,
} from "./utils";

export function handleFruitTree(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const tree = getFruitTree(sql, name);

	if (!tree) {
		return notFoundResponse(
			`No fruit tree named **${name}** found. Check the spelling (e.g. \`Apricot\`, \`Cherry\`, \`Peach\`).`,
		);
	}

	const color =
		tree.season && tree.season in SEASON_COLORS
			? SEASON_COLORS[tree.season]!
			: DEFAULT_COLOR;

	return embedResponse({
		title: tree.name,
		url: tree.wiki_url,
		color,
		thumbnail: tree.image_url ? { url: tree.image_url } : undefined,
		fields: [
			{
				name: "Harvest Season",
				value: tree.season || "—",
				inline: true,
			},
			{
				name: "Growth Time",
				value: tree.growth_days != null ? `${tree.growth_days} days` : "—",
				inline: true,
			},
			{
				name: "Sapling Price",
				value:
					tree.sapling_price != null
						? `${tree.sapling_price.toLocaleString()}g`
						: "—",
				inline: true,
			},
			{
				name: "Fruit",
				value: tree.fruit_name ?? "—",
				inline: true,
			},
			{
				name: "Fruit Sells For",
				value: formatPriceTiers(
					tree.sell_price,
					tree.sell_price_silver,
					tree.sell_price_gold,
					tree.sell_price_iridium,
				),
				inline: true,
			},
		],
		footer: tree.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(tree.last_updated)}`,
				}
			: undefined,
	});
}

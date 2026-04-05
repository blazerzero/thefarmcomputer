import { formatDate } from "@/constants";
import { getFruit } from "@/db";
import {
	embedResponse,
	formatPriceTiers,
	getEnergyHealthValues,
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

	const seasons = item.seasons.length === 0 ? ["All Seasons"] : item.seasons;

	return embedResponse({
		title: item.name,
		url: item.wiki_url,
		color: seasonColor(item.seasons),
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields: [
			{
				name: "Source",
				value: item.source.length > 0 ? renderDotList(item.source) : "—",
				inline: true,
			},
			{ name: "Seasons", value: renderDotList(seasons), inline: true },
			{
				name: "Energy / Health",
				value: getEnergyHealthValues(item),
				inline: true,
			},
			{
				name: "Sells For",
				value: (() => {
					const boosts: string[] = [];
					if (item.tiller_boost)
						boosts.push("Tiller Profession (+10% sell value)");
					if (item.bears_knowledge_boost)
						boosts.push("Bear's Knowledge (3× sell value)");
					const base = formatPriceTiers(
						item.sell_price,
						item.sell_price_silver,
						item.sell_price_gold,
						item.sell_price_iridium,
					);
					return boosts.length > 0
						? `${base}\n\n**Boosts**\n${renderDotList(boosts)}`
						: base;
				})(),
				inline: true,
			},
			...(() => {
				const entries = Object.entries(item.artisan_prices);
				if (entries.length === 0) return [];
				const TYPE_ORDER = ["wine", "jelly", "dried_fruit"];
				const TIER_ORDER = ["base", "silver", "gold", "iridium"];
				const lines = entries
					.sort(([a], [b]) => {
						const [aTier, ...aType] = a.split("_");
						const [bTier, ...bType] = b.split("_");
						const aTypeKey = aType.join("_");
						const bTypeKey = bType.join("_");
						const typeCompare =
							(TYPE_ORDER.indexOf(aTypeKey) + 1 || TYPE_ORDER.length + 1) -
							(TYPE_ORDER.indexOf(bTypeKey) + 1 || TYPE_ORDER.length + 1);
						if (typeCompare !== 0) return typeCompare;
						return (
							TIER_ORDER.indexOf(aTier ?? "") - TIER_ORDER.indexOf(bTier ?? "")
						);
					})
					.map(([key, price]) => {
						const [tier, ...typeParts] = key.split("_");
						const type = typeParts
							.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
							.join(" ");
						const prefix =
							tier === "base"
								? ""
								: `${(tier ?? "").charAt(0).toUpperCase() + (tier ?? "").slice(1)}-Tier `;
						return `${prefix}${type}: ${price}g`;
					});
				return [
					{
						name: "Artisan Item Values",
						value: renderDotList(lines),
						inline: true,
					},
				];
			})(),
		],
		footer: item.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
				}
			: undefined,
	});
}

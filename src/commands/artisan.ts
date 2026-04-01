import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getArtisanGood } from "@/db";
import {
	embedResponse,
	formatPriceTiers,
	getOption,
	notFoundResponse,
} from "./utils";

export function handleArtisan(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getArtisanGood(sql, name);

	if (!item) {
		return notFoundResponse(
			`No artisan good named **${name}** found. Check the spelling (e.g. \`Wine\`, \`Pickles\`, \`Truffle Oil\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (item.machine) {
		fields.push({ name: "Machine", value: item.machine, inline: true });
	}

	fields.push({
		name: "Sells For",
		value: formatPriceTiers(
			item.sell_price,
			item.sell_price_silver,
			item.sell_price_gold,
			item.sell_price_iridium,
		),
		inline: true,
	});

	if (item.energy != null || item.health != null) {
		const val =
			item.energy != null && item.health != null
				? `${item.energy} energy / ${item.health} health`
				: item.energy != null
					? `${item.energy} energy`
					: `${item.health} health`;
		fields.push({ name: "Base Energy / Health", value: val, inline: true });
	}

	if (item.ingredients) {
		fields.push({
			name: "Ingredients",
			value: item.ingredients,
			inline: false,
		});
	}

	if (item.description) {
		fields.push({
			name: "Description",
			value: item.description,
			inline: false,
		});
	}

	const caskLines = [
		item.cask_days_to_silver != null
			? `Silver: ${item.cask_days_to_silver} days`
			: null,
		item.cask_days_to_gold != null
			? `Gold: ${item.cask_days_to_gold} days`
			: null,
		item.cask_days_to_iridium != null
			? `Iridium: ${item.cask_days_to_iridium} days`
			: null,
	].filter((l): l is string => l !== null);

	if (caskLines.length > 0) {
		fields.push({
			name: "Cask Aging",
			value: caskLines.join("\n"),
			inline: true,
		});
	}

	return embedResponse({
		title: item.name,
		url: item.wiki_url,
		color: DEFAULT_COLOR,
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields,
		footer: item.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
				}
			: undefined,
	});
}

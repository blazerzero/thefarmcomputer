import { formatDate } from "../constants";
import { getFish } from "../db";
import {
	embedResponse,
	formatPriceTiers,
	getOption,
	notFoundResponse,
	seasonColor,
} from "./utils";

export function handleFish(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const fish = getFish(sql, name);

	if (!fish) {
		return notFoundResponse(
			`No fish named **${name}** found. Check the spelling (e.g. \`Tuna\`, \`Salmon\`, \`Legend\`).`,
		);
	}

	const fields: { name: string; value: string; inline: boolean }[] = [
		{ name: "Category", value: fish.category, inline: true },
		{
			name: "Season",
			value: fish.seasons.length ? fish.seasons.join(", ") : "All Seasons",
			inline: true,
		},
	];

	if (fish.location) {
		fields.push({ name: "Location", value: fish.location, inline: true });
	}

	fields.push({ name: "Time", value: fish.time ?? "Anytime", inline: true });

	if (fish.weather) {
		fields.push({ name: "Weather", value: fish.weather, inline: true });
	}

	if (fish.min_size != null && fish.max_size != null) {
		fields.push({
			name: "Size",
			value:
				fish.min_size === fish.max_size
					? `${fish.min_size} inches`
					: `${fish.min_size}–${fish.max_size} inches`,
			inline: true,
		});
	}

	if (fish.difficulty != null) {
		fields.push({
			name: "Difficulty",
			value: fish.behavior
				? `${fish.difficulty} (${fish.behavior})`
				: `${fish.difficulty}`,
			inline: true,
		});
	}

	const sellValue = formatPriceTiers(
		fish.sell_price,
		fish.sell_price_silver,
		fish.sell_price_gold,
		fish.sell_price_iridium,
	);
	if (sellValue !== "—") {
		fields.push({ name: "Sells For", value: sellValue, inline: true });
	}

	return embedResponse({
		title: fish.name,
		url: fish.wiki_url,
		color: seasonColor(fish.seasons),
		thumbnail: fish.image_url ? { url: fish.image_url } : undefined,
		description: fish.description || undefined,
		fields,
		footer: fish.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(fish.last_updated)}`,
				}
			: undefined,
	});
}

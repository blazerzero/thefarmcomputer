import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getArtisanGood } from "@/db";
import {
	embedResponse,
	formatPriceTiers,
	getOption,
	notFoundResponse,
	renderDotList,
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

	if (item.ingredients) {
		const ingredients: string[] = JSON.parse(item.ingredients) || [];
		if (ingredients.length > 0) {
			fields.push({
				name: "Ingredients",
				value: renderDotList(ingredients),
				inline: true,
			});
		}
	}

	if (item.processing_time) {
		fields.push({
			name: "Processing Time",
			value: renderDotList(item.processing_time.split("\n")),
			inline: true,
		});
	}

	fields.push({
		name: "Base Sell Value",
		value: item.sell_price ? renderDotList(item.sell_price.split("\n")) : "N/A",
		inline: true,
	});

	if (item.energy) {
		fields.push({
			name: "Base Energy",
			value: item.energy,
			inline: true,
		});
	}

	if (item.health) {
		fields.push({
			name: "Base Health",
			value: item.health,
			inline: true,
		});
	}

	if (item.buffs) {
		let buffs: string[];
		try {
			buffs = JSON.parse(item.buffs);
		} catch {
			buffs = [item.buffs];
		}
		fields.push({
			name: "Buffs",
			value: renderDotList(buffs),
			inline: true,
		});
	}

	const caskLines = [
		item.cask_days_to_silver != null
			? `Silver: ${item.cask_days_to_silver} days (1.25x value)`
			: null,
		item.cask_days_to_gold != null
			? `Gold: ${item.cask_days_to_gold} days (1.5x value)`
			: null,
		item.cask_days_to_iridium != null
			? `Iridium: ${item.cask_days_to_iridium} days (2x value)`
			: null,
	].filter((l): l is string => l !== null);

	if (caskLines.length > 0) {
		fields.push({
			name: "Cask Aging",
			value: renderDotList(caskLines),
			inline: true,
		});
	}

	return embedResponse({
		title: item.name,
		description: item.description,
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

import pluralize from "pluralize";
import { formatDate } from "@/constants";
import { getCraftedItem } from "@/db";
import type { CraftIngredient } from "@/types";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

const CRAFT_COLOR = 0xd97706;

function formatIngredients(ingredients: CraftIngredient[]): string {
	return renderDotList(ingredients.map((i) => `${i.quantity}× ${i.name}`));
}

export function handleCraft(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const item = getCraftedItem(sql, name);

	if (!item) {
		return notFoundResponse(
			`No crafted item named **${name}** found. Check the spelling (e.g. \`Chest\`, \`Furnace\`, \`Sprinkler\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (item.duration_days !== null) {
		const seasons = item.duration_seasons;
		const lowEndSeason = seasons ? parseInt(seasons.split("-")[0] ?? "") : null;
		let seasonsText: string = "";
		if (lowEndSeason && !isNaN(lowEndSeason)) {
			const exactlyOneSeason = Boolean(
				lowEndSeason && seasons?.split("-").length === 1,
			);
			seasonsText = item.duration_seasons
				? ` (${item.duration_seasons} ${exactlyOneSeason ? "season" : "seasons"})`
				: "";
		}
		fields.push({
			name: "Duration",
			value: `${item.duration_days} ${pluralize("day", item.duration_days)}${seasonsText}`,
			inline: true,
		});
	}

	if (item.radius !== null) {
		fields.push({ name: "Radius", value: `${item.radius}`, inline: true });
	}

	if (item.ingredients.length > 0) {
		fields.push({
			name: "Ingredients",
			value: formatIngredients(item.ingredients),
			inline: false,
		});
	}

	if (item.energy !== null) {
		fields.push({ name: "Energy", value: `${item.energy}`, inline: true });
	}

	if (item.health !== null) {
		fields.push({ name: "Health", value: `${item.health}`, inline: true });
	}

	if (item.recipe_source !== null) {
		fields.push({
			name: "Recipe Source",
			value: item.recipe_source,
			inline: false,
		});
	}

	return embedResponse({
		title: item.name,
		url: item.wiki_url,
		color: CRAFT_COLOR,
		description: item.description ?? undefined,
		thumbnail: item.image_url ? { url: item.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}`,
		},
	});
}

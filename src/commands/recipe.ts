import { formatDate } from "../constants";
import { getRecipe } from "../db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

const RECIPE_COLOR = 0xe07b39;

export function handleRecipe(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const recipe = getRecipe(sql, name);

	if (!recipe) {
		return notFoundResponse(
			`No recipe named **${name}** found. Check the spelling (e.g. \`Fried Egg\`, \`Salad\`, \`Chowder\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (recipe.ingredients.length > 0) {
		fields.push({
			name: "Ingredients",
			value: renderDotList(
				recipe.ingredients.map((i) => `${i.quantity}× ${i.name}`),
			),
			inline: false,
		});
	}

	if (recipe.energy !== null) {
		fields.push({ name: "Energy", value: `${recipe.energy}`, inline: true });
	}

	if (recipe.health !== null) {
		fields.push({ name: "Health", value: `${recipe.health}`, inline: true });
	}

	if (recipe.buffs !== null) {
		fields.push({ name: "Buffs", value: recipe.buffs, inline: false });
	}

	if (recipe.buff_duration !== null) {
		fields.push({
			name: "Buff Duration",
			value: recipe.buff_duration,
			inline: true,
		});
	}

	if (recipe.sell_price !== null) {
		fields.push({
			name: "Sells For",
			value: `${recipe.sell_price.toLocaleString()}g`,
			inline: true,
		});
	}

	if (recipe.recipe_source !== null) {
		fields.push({
			name: "Recipe Source",
			value: recipe.recipe_source,
			inline: false,
		});
	}

	return embedResponse({
		title: recipe.name,
		url: recipe.wiki_url,
		color: RECIPE_COLOR,
		description: recipe.description ?? undefined,
		thumbnail: recipe.image_url ? { url: recipe.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(recipe.last_updated)}`,
		},
	});
}

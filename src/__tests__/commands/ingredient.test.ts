import { describe, expect, it } from "vitest";
import { handleIngredient } from "@/commands/ingredient";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

// getCraftedItemsByIngredient returns an array of CraftedItem objects
const fakeCopperOreRecipes = [
	{
		name: "Furnace",
		description: "Smelts ore and coal into metal bars.",
		duration_days: null,
		duration_seasons: null,
		radius: null,
		ingredients:
			'[{"name":"Copper Ore","quantity":20},{"name":"Stone","quantity":25}]',
		energy: null,
		health: null,
		recipe_source: "Clint (Introduction)",
		image_url: null,
		wiki_url: "https://stardewvalleywiki.com/Furnace",
		last_updated: "2024-03-01T00:00:00.000Z",
	},
	{
		name: "Copper Bar",
		description: null,
		duration_days: null,
		duration_seasons: null,
		radius: null,
		ingredients:
			'[{"name":"Copper Ore","quantity":5},{"name":"Coal","quantity":1}]',
		energy: null,
		health: null,
		recipe_source: null,
		image_url: null,
		wiki_url: "https://stardewvalleywiki.com/Copper_Bar",
		last_updated: "2024-03-01T00:00:00.000Z",
	},
];

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleIngredient", () => {
	it("returns an embed listing recipes that use the ingredient", async () => {
		const res = handleIngredient(
			makeInteraction("copper ore"),
			makeSql(fakeCopperOreRecipes),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toContain("recipe");
		expect(embed?.title).toContain("copper ore");
		expect(embed?.color).toBe(0xd97706);
	});

	it("includes a Recipes field listing each recipe with quantity", async () => {
		const res = handleIngredient(
			makeInteraction("copper ore"),
			makeSql(fakeCopperOreRecipes),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const recipesField = fields.find((f) => f.name === "Recipes");
		expect(recipesField).toBeDefined();
		expect(recipesField?.value).toContain("Furnace");
		expect(recipesField?.value).toContain("Copper Bar");
	});

	it("pluralizes 'recipe' correctly for multiple results", async () => {
		const res = handleIngredient(
			makeInteraction("copper ore"),
			makeSql(fakeCopperOreRecipes),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.title).toContain("2 recipes");
	});

	it("uses singular 'recipe' for a single result", async () => {
		const res = handleIngredient(
			makeInteraction("stone"),
			makeSql([fakeCopperOreRecipes[0]!]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.title).toContain("1 recipe");
	});

	it("returns an ephemeral error when no recipes use the ingredient", async () => {
		const res = handleIngredient(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No crafting recipes found");
	});
});

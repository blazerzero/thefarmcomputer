import { describe, expect, it } from "vitest";
import { handleRecipe } from "../../commands/recipe";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeRecipeRow = {
	name: "Fried Egg",
	description: "It's an egg, fried.",
	ingredients: '[{"name":"Egg","quantity":1}]',
	energy: 50,
	health: 22,
	buffs: null,
	buff_duration: "[]",
	recipe_source: "Starter",
	sell_price: 35,
	image_url: "https://example.com/fried_egg.png",
	wiki_url: "https://stardewvalleywiki.com/Fried_Egg",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeBuffedRecipeRow = {
	name: "Salad",
	description: "A healthy garden salad.",
	ingredients:
		'[{"name":"Leek","quantity":1},{"name":"Dandelion","quantity":1},{"name":"Vinegar","quantity":1}]',
	energy: 113,
	health: 50,
	buffs: "Defense +2",
	buff_duration: '["5m 35s"]',
	recipe_source: "Emily (3 hearts)",
	sell_price: 110,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Salad",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeMinimalRecipeRow = {
	name: "Strange Bun",
	description: "What's in this bun?",
	ingredients:
		'[{"name":"Wheat Flour","quantity":1},{"name":"Periwinkle","quantity":1},{"name":"Void Mayonnaise","quantity":1}]',
	energy: null,
	health: null,
	buffs: null,
	buff_duration: "[]",
	recipe_source: null,
	sell_price: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Strange_Bun",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleRecipe", () => {
	it("returns an embed with the recipe title, color, and url", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Fried Egg");
		expect(embed?.color).toBe(0xe07b39);
		expect(embed?.url).toBe("https://stardewvalleywiki.com/Fried_Egg");
	});

	it("includes the description", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.embeds?.[0]?.description).toBe("It's an egg, fried.");
	});

	it("includes the Ingredients field", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const ingredientsField = fields.find((f) => f.name === "Ingredients");
		expect(ingredientsField).toBeDefined();
		expect(ingredientsField?.value).toContain("Egg");
	});

	it("includes Energy and Health fields", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Energy", value: "50" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Health", value: "22" }),
		);
	});

	it("includes Buffs, Buff Duration, and Recipe Source for buffed recipes", async () => {
		const res = handleRecipe(
			makeInteraction("salad"),
			makeSql([fakeBuffedRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Buffs", value: "Defense +2" }),
		);
		const buffDurationField = fields.find((f) => f.name === "Buff Duration");
		expect(buffDurationField?.value).toContain("5m 35s");
		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Recipe Source(s)",
				value: "Emily (3 hearts)",
			}),
		);
	});

	it("includes Sells For field", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "35g" }),
		);
	});

	it("omits optional fields when they are null", async () => {
		const res = handleRecipe(
			makeInteraction("strange bun"),
			makeSql([fakeMinimalRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = (json.data.embeds?.[0]?.fields as EmbedField[]) ?? [];

		const fieldNames = fields.map((f) => f.name);
		expect(fieldNames).not.toContain("Energy");
		expect(fieldNames).not.toContain("Health");
		expect(fieldNames).not.toContain("Buffs");
		expect(fieldNames).not.toContain("Buff Duration");
		expect(fieldNames).not.toContain("Sells For");
		expect(fieldNames).not.toContain("Recipe Source");
	});

	it("includes Recipe Source when present", async () => {
		const res = handleRecipe(
			makeInteraction("fried egg"),
			makeSql([fakeRecipeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Recipe Source(s)", value: "Starter" }),
		);
	});

	it("returns an ephemeral error for an unknown recipe", async () => {
		const res = handleRecipe(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No recipe named");
	});
});

import { describe, expect, it } from "vitest";
import { handleCraft } from "@/commands/craft";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeCraftRow = {
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
	image_url: "https://example.com/furnace.png",
	wiki_url: "https://stardewvalleywiki.com/Furnace",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeSprinklerRow = {
	name: "Quality Sprinkler",
	description: null,
	duration_days: null,
	duration_seasons: null,
	radius: 3,
	ingredients:
		'[{"name":"Gold Bar","quantity":1},{"name":"Iron Bar","quantity":1}]',
	energy: null,
	health: null,
	recipe_source: "Farming (Level 6)",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Quality_Sprinkler",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeConsumableRow = {
	name: "Field Snack",
	description: "A quick snack.",
	duration_days: null,
	duration_seasons: null,
	radius: null,
	ingredients: '[{"name":"Mixed Seeds","quantity":1}]',
	energy: 45,
	health: 20,
	recipe_source: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Field_Snack",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleCraft", () => {
	it("returns an embed with the item title and color", async () => {
		const res = handleCraft(
			makeInteraction("furnace"),
			makeSql([fakeCraftRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Furnace");
		expect(embed?.color).toBe(0xd97706);
		expect(embed?.url).toBe("https://stardewvalleywiki.com/Furnace");
	});

	it("includes the Ingredients field listing components", async () => {
		const res = handleCraft(
			makeInteraction("furnace"),
			makeSql([fakeCraftRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const ingredientsField = fields.find((f) => f.name === "Ingredients");
		expect(ingredientsField).toBeDefined();
		expect(ingredientsField?.value).toContain("Copper Ore");
		expect(ingredientsField?.value).toContain("Stone");
	});

	it("includes the Recipe Source field", async () => {
		const res = handleCraft(
			makeInteraction("furnace"),
			makeSql([fakeCraftRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Recipe Source",
				value: "Clint (Introduction)",
			}),
		);
	});

	it("includes Radius field when present", async () => {
		const res = handleCraft(
			makeInteraction("quality sprinkler"),
			makeSql([fakeSprinklerRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Radius", value: "3" }),
		);
	});

	it("includes Energy and Health fields for consumables", async () => {
		const res = handleCraft(
			makeInteraction("field snack"),
			makeSql([fakeConsumableRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Energy", value: "45" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Health", value: "20" }),
		);
	});

	it("returns an ephemeral error for an unknown item", async () => {
		const res = handleCraft(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No crafted item named");
	});
});

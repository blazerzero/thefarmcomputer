import { describe, expect, it } from "vitest";
import { handleFruitTree } from "@/commands/fruitTree";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeFruitTreeRow = {
	name: "Apple Tree",
	season: "Fall",
	growth_days: 28,
	sapling_price: 4000,
	fruit_name: "Apple",
	sell_price: 100,
	sell_price_silver: 125,
	sell_price_gold: 150,
	sell_price_iridium: 200,
	image_url: "https://example.com/apple-tree.png",
	wiki_url: "https://stardewvalleywiki.com/Apple_Tree",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleFruitTree", () => {
	it("returns an embed with the tree title and Fall color", async () => {
		const res = handleFruitTree(
			makeInteraction("apple"),
			makeSql([fakeFruitTreeRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Apple Tree");
		expect(embed?.color).toBe(0xd2691e); // Fall brown
	});

	it("includes harvest season, growth time, sapling price, and fruit fields", async () => {
		const res = handleFruitTree(
			makeInteraction("apple"),
			makeSql([fakeFruitTreeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Harvest Season", value: "Fall" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Growth Time", value: "28 days" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sapling Price", value: "4,000g" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Fruit", value: "Apple" }),
		);
	});

	it("includes quality price tiers for the fruit", async () => {
		const res = handleFruitTree(
			makeInteraction("apple"),
			makeSql([fakeFruitTreeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const sellField = fields.find((f) => f.name === "Fruit Sells For");

		expect(sellField?.value).toContain("Normal: 100g");
		expect(sellField?.value).toContain("Iridium: 200g");
	});

	it("returns an ephemeral error for an unknown tree", async () => {
		const res = handleFruitTree(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No fruit tree named");
	});
});

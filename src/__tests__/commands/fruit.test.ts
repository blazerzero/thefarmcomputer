import { describe, expect, it } from "vitest";
import { handleFruit } from "@/commands/fruit";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeFruitRow = {
	name: "Apple",
	source: '["Fruit Tree"]',
	seasons: '["Fall"]',
	sell_price: 100,
	sell_price_silver: 125,
	sell_price_gold: 150,
	sell_price_iridium: 200,
	energy: 38,
	energy_silver: 50,
	energy_gold: 68,
	energy_iridium: 110,
	health: 17,
	health_silver: 22,
	health_gold: 30,
	health_iridium: 49,
	tiller_boost: 0,
	bears_knowledge_boost: 0,
	artisan_prices:
		'{"base_wine":400,"silver_wine":500,"gold_wine":600,"iridium_wine":800}',
	image_url: "https://example.com/apple.png",
	wiki_url: "https://stardewvalleywiki.com/Apple",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFarmingFruitRow = {
	name: "Blueberry",
	source: '["Farming"]',
	seasons: '["Summer"]',
	sell_price: 50,
	sell_price_silver: 62,
	sell_price_gold: 75,
	sell_price_iridium: 100,
	energy: null,
	energy_silver: null,
	energy_gold: null,
	energy_iridium: null,
	health: null,
	health_silver: null,
	health_gold: null,
	health_iridium: null,
	tiller_boost: 1,
	bears_knowledge_boost: 0,
	artisan_prices: "{}",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Blueberry",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleFruit", () => {
	it("returns an embed with the fruit title and Fall color", async () => {
		const res = handleFruit(makeInteraction("apple"), makeSql([fakeFruitRow]));
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Apple");
		expect(embed?.color).toBe(0xd2691e); // Fall brown
	});

	it("includes source, seasons, and sell price fields", async () => {
		const res = handleFruit(makeInteraction("apple"), makeSql([fakeFruitRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Source", value: "Fruit Tree" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Seasons", value: "Fall" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For" }),
		);
	});

	it("shows quality-tiered energy/health for non-Farming/Foraging sources", async () => {
		const res = handleFruit(makeInteraction("apple"), makeSql([fakeFruitRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const ehField = fields.find((f) => f.name === "Energy / Health");

		expect(ehField?.value).toContain("Normal:");
		expect(ehField?.value).toContain("Iridium:");
	});

	it("shows Inedible for Farming source with null energy/health", async () => {
		const res = handleFruit(
			makeInteraction("blueberry"),
			makeSql([fakeFarmingFruitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const ehField = fields.find((f) => f.name === "Energy / Health");

		expect(ehField?.value).toBe("Inedible");
	});

	it("shows Artisan Item Values field when artisan prices exist", async () => {
		const res = handleFruit(makeInteraction("apple"), makeSql([fakeFruitRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const artisanField = fields.find((f) => f.name === "Artisan Item Values");

		expect(artisanField?.value).toContain("Wine: 400g");
		expect(artisanField?.value).toContain("Iridium-Tier Wine: 800g");
	});

	it("omits Artisan Sells For field when artisan prices are empty", async () => {
		const res = handleFruit(
			makeInteraction("blueberry"),
			makeSql([fakeFarmingFruitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(
			fields.find((f) => f.name === "Artisan Item Values"),
		).toBeUndefined();
	});

	it("appends boosts to Sells For field when boost flags are set", async () => {
		const res = handleFruit(
			makeInteraction("blueberry"),
			makeSql([fakeFarmingFruitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const sellsForField = fields.find((f) => f.name === "Sells For");

		expect(sellsForField?.value).toContain("Tiller Profession");
		expect(sellsForField?.value).not.toContain("Bear's Knowledge");
		expect(fields.find((f) => f.name === "Boosts")).toBeUndefined();
	});

	it("omits Boosts field when no boost flags are set", async () => {
		const res = handleFruit(makeInteraction("apple"), makeSql([fakeFruitRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.find((f) => f.name === "Boosts")).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown fruit", async () => {
		const res = handleFruit(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No fruit named");
	});
});

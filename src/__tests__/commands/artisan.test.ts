import { describe, expect, it } from "vitest";
import { handleArtisan } from "@/commands/artisan";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeWineRow = {
	name: "Wine",
	machine: "Keg",
	description: "Drink in moderation.",
	ingredients: null,
	processing_time: null,
	sell_price: "400g",
	energy: null,
	health: null,
	buffs: null,
	cask_days_to_silver: 14,
	cask_days_to_gold: 28,
	cask_days_to_iridium: 56,
	image_url: "https://example.com/wine.png",
	wiki_url: "https://stardewvalleywiki.com/Wine",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeHoneyRow = {
	name: "Honey",
	machine: "Bee House",
	description: null,
	ingredients: null,
	processing_time: "4 Nights",
	sell_price: "Wild: 100g\nTulip: 160g\nFairy Rose: 680g",
	energy: null,
	health: null,
	buffs: null,
	cask_days_to_silver: null,
	cask_days_to_gold: null,
	cask_days_to_iridium: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Honey",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeMayonnaiseRow = {
	name: "Mayonnaise",
	machine: "Mayonnaise Machine",
	description: "It's a white, fluffy condiment.",
	ingredients: JSON.stringify(["Chicken Egg (1)"]),
	processing_time: "180m (3 Hours)",
	sell_price: "190g",
	energy: null,
	health: null,
	buffs: null,
	cask_days_to_silver: null,
	cask_days_to_gold: null,
	cask_days_to_iridium: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Mayonnaise",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeOilRow = {
	name: "Oil",
	machine: "Oil Maker",
	description: "All purpose cooking oil.",
	ingredients: JSON.stringify([
		"Corn (1)",
		"or",
		"Sunflower Seeds (1)",
		"or",
		"Sunflower (1)",
	]),
	processing_time:
		"Corn: 1000m (≈16 Hours)\nSunflower Seeds: 3200m (2 Days)\nSunflower: 60m (1 Hour)",
	sell_price: "100g",
	energy: "13",
	health: "5",
	buffs: null,
	cask_days_to_silver: null,
	cask_days_to_gold: null,
	cask_days_to_iridium: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Oil",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleArtisan", () => {
	it("returns an embed with the item title and wiki URL", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.title).toBe("Wine");
		expect(embed?.url).toBe("https://stardewvalleywiki.com/Wine");
	});

	it("includes Machine and Base Sell Value fields", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Machine", value: "Keg" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Base Sell Value", value: "400g" }),
		);
	});

	it("includes Cask Aging field when cask days are present", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const caskField = fields.find((f) => f.name === "Cask Aging");
		expect(caskField).toBeDefined();
		expect(caskField?.value).toContain("Silver: 14 days");
		expect(caskField?.value).toContain("Gold: 28 days");
		expect(caskField?.value).toContain("Iridium: 56 days");
	});

	it("omits Cask Aging field when all cask days are null", async () => {
		const res = handleArtisan(
			makeInteraction("honey"),
			makeSql([fakeHoneyRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.find((f) => f.name === "Cask Aging")).toBeUndefined();
	});

	it("includes Base Energy and Base Health fields when present", async () => {
		const res = handleArtisan(makeInteraction("oil"), makeSql([fakeOilRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Base Energy", value: "13" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Base Health", value: "5" }),
		);
	});

	it("omits Base Energy and Base Health fields when null", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.find((f) => f.name === "Base Energy")).toBeUndefined();
		expect(fields.find((f) => f.name === "Base Health")).toBeUndefined();
	});

	it("includes Ingredients field when present", async () => {
		const res = handleArtisan(
			makeInteraction("mayonnaise"),
			makeSql([fakeMayonnaiseRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Ingredients",
				value: "Chicken Egg (1)",
			}),
		);
	});

	it("renders multi-ingredient items with 'or' separators", async () => {
		const res = handleArtisan(makeInteraction("oil"), makeSql([fakeOilRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const ingField = fields.find((f) => f.name === "Ingredients");
		expect(ingField).toBeDefined();
		expect(ingField?.value).toContain("Corn (1)");
		expect(ingField?.value).toContain("or");
		expect(ingField?.value).toContain("Sunflower (1)");
	});

	it("renders multi-line processing time as a dot list", async () => {
		const res = handleArtisan(makeInteraction("oil"), makeSql([fakeOilRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const timeField = fields.find((f) => f.name === "Processing Time");
		expect(timeField).toBeDefined();
		expect(timeField?.value).toContain("• Corn:");
		expect(timeField?.value).toContain("• Sunflower Seeds:");
		expect(timeField?.value).toContain("• Sunflower:");
	});

	it("renders multi-line sell price as a dot list", async () => {
		const res = handleArtisan(
			makeInteraction("honey"),
			makeSql([fakeHoneyRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const sellField = fields.find((f) => f.name === "Base Sell Value");
		expect(sellField).toBeDefined();
		expect(sellField?.value).toContain("• Wild: 100g");
		expect(sellField?.value).toContain("• Tulip: 160g");
		expect(sellField?.value).toContain("• Fairy Rose: 680g");
	});

	it("omits Ingredients field when null", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.find((f) => f.name === "Ingredients")).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown artisan good", async () => {
		const res = handleArtisan(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No artisan good named");
	});
});

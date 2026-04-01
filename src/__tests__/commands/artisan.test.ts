import { describe, expect, it } from "vitest";
import { handleArtisan } from "@/commands/artisan";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeWineRow = {
	name: "Wine",
	machine: "Keg",
	description: "Drink in moderation.",
	ingredients: null,
	sell_price: 400,
	sell_price_silver: 500,
	sell_price_gold: 600,
	sell_price_iridium: 800,
	energy: null,
	health: null,
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
	sell_price: 100,
	sell_price_silver: null,
	sell_price_gold: null,
	sell_price_iridium: null,
	energy: 50,
	health: 20,
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
	ingredients: "Chicken Egg",
	sell_price: 190,
	sell_price_silver: null,
	sell_price_gold: null,
	sell_price_iridium: null,
	energy: null,
	health: null,
	cask_days_to_silver: null,
	cask_days_to_gold: null,
	cask_days_to_iridium: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Mayonnaise",
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

	it("includes Machine and Sells For fields", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Machine", value: "Keg" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For" }),
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

	it("includes Energy / Health field when energy is present", async () => {
		const res = handleArtisan(
			makeInteraction("honey"),
			makeSql([fakeHoneyRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Energy / Health",
				value: "50 energy / 20 health",
			}),
		);
	});

	it("omits Energy / Health field when energy and health are null", async () => {
		const res = handleArtisan(makeInteraction("wine"), makeSql([fakeWineRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.find((f) => f.name === "Energy / Health")).toBeUndefined();
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
				value: "Chicken Egg",
			}),
		);
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

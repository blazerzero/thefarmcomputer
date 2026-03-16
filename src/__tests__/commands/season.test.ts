import { describe, expect, it } from "vitest";
import { handleSeason } from "../../commands/season";
import { type DiscordResponse, makeSql } from "../helpers";

const springCropRows = [
	{
		name: "Parsnip",
		seasons: '["Spring"]',
		growth_days: 4,
		regrowth_days: null,
		sell_price: 35,
		wiki_url: "https://stardewvalleywiki.com/Parsnip",
	},
	{
		name: "Cauliflower",
		seasons: '["Spring"]',
		growth_days: 12,
		regrowth_days: null,
		sell_price: 175,
		wiki_url: "https://stardewvalleywiki.com/Cauliflower",
	},
];

function makeInteraction(season: string) {
	return { data: { options: [{ name: "season", value: season }] } };
}

describe("handleSeason", () => {
	it("returns an embed titled with the season name and count", async () => {
		const res = handleSeason(makeInteraction("Spring"), makeSql(springCropRows));
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Spring Crops (2)");
		expect(embed?.color).toBe(0x78b84a); // Spring green
	});

	it("lists crop names with growth info in the fields", async () => {
		const res = handleSeason(makeInteraction("Spring"), makeSql(springCropRows));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields;

		const allText = fields?.map((f) => f.value).join("\n") ?? "";
		expect(allText).toContain("Parsnip");
		expect(allText).toContain("Cauliflower");
		expect(allText).toContain("4d");
	});

	it("normalizes lowercase season input", async () => {
		const res = handleSeason(makeInteraction("spring"), makeSql(springCropRows));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.embeds?.[0]?.title).toBe("Spring Crops (2)");
	});

	it("returns an ephemeral error for an invalid season name", async () => {
		const res = handleSeason(makeInteraction("Monsoon"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("isn't a valid season");
	});

	it("returns an ephemeral error when no crops are found for the season", async () => {
		const res = handleSeason(makeInteraction("Winter"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No crops found for");
	});
});

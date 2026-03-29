import { describe, expect, it } from "vitest";
import { handleMineral } from "@/commands/mineral";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeQuartzRow = {
	name: "Quartz",
	category: "Foraged Mineral",
	description: "A clear crystal commonly found in caves and mines.",
	sell_price: 25,
	sell_price_gemologist: null,
	source: '["The Mines"]',
	used_in: '["Refined Quartz (smelter)","Lightning Rod"]',
	image_url: "https://example.com/quartz.png",
	wiki_url: "https://stardewvalleywiki.com/Quartz",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeGemRow = {
	...fakeQuartzRow,
	name: "Amethyst",
	category: "Gem",
	sell_price: 100,
	sell_price_gemologist: 130,
	source: '["Gem Nodes","Fishing Treasure Chests"]',
	used_in: "[]",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleMineral", () => {
	it("returns an embed with the mineral title and purple color", async () => {
		const res = handleMineral(
			makeInteraction("quartz"),
			makeSql([fakeQuartzRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Quartz");
		expect(embed?.color).toBe(0x8b5cf6);
		expect(embed?.description).toBe(
			"A clear crystal commonly found in caves and mines.",
		);
	});

	it("includes category, sell price, source, and used-in fields", async () => {
		const res = handleMineral(
			makeInteraction("quartz"),
			makeSql([fakeQuartzRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Category", value: "Foraged Mineral" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "25g" }),
		);

		const sourceField = fields.find((f) => f.name === "Source");
		expect(sourceField?.value).toContain("The Mines");

		const usedInField = fields.find((f) => f.name === "Used In");
		expect(usedInField?.value).toContain("Refined Quartz");
	});

	it("includes gemologist price for gems", async () => {
		const res = handleMineral(
			makeInteraction("amethyst"),
			makeSql([fakeGemRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Gemologist Price", value: "130g" }),
		);
	});

	it("omits gemologist price when null", async () => {
		const res = handleMineral(
			makeInteraction("quartz"),
			makeSql([fakeQuartzRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Gemologist Price");
	});

	it("returns an ephemeral error for an unknown mineral", async () => {
		const res = handleMineral(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No mineral named");
	});
});

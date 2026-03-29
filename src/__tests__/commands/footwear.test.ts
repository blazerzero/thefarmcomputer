import { describe, expect, it } from "vitest";
import { handleFootwear } from "../../commands/footwear";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeFootwearRow = {
	name: "Space Boots",
	stats: '["Defense +4","Immunity +2"]',
	description: "Boots from the far reaches of the galaxy.",
	purchase_price: 2000,
	sell_price: 500,
	source: '["Skull Cavern","Volcano Dungeon"]',
	image_url: "https://example.com/space-boots.png",
	wiki_url: "https://stardewvalleywiki.com/Space_Boots",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFootwearNulls = {
	...fakeFootwearRow,
	name: "Sneakers",
	stats: "[]",
	description: null,
	purchase_price: null,
	sell_price: null,
	source: "[]",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleFootwear", () => {
	it("returns an embed with the footwear title and DEFAULT_COLOR", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Space Boots");
		expect(embed?.color).toBe(0x5b8a3c);
		expect(embed?.description).toBe(
			"Boots from the far reaches of the galaxy.",
		);
	});

	it("renders Stats as a bullet list from the stats array", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const statsField = fields.find((f) => f.name === "Stats");
		expect(statsField?.value).toContain("Defense +4");
		expect(statsField?.value).toContain("Immunity +2");
		expect(statsField?.value).toContain("•");
	});

	it("shows N/A for Stats when stats array is empty", async () => {
		const res = handleFootwear(
			makeInteraction("sneakers"),
			makeSql([fakeFootwearNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Stats", value: "N/A" }),
		);
	});

	it("renders Source as a bullet list for multiple items", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const sourceField = fields.find((f) => f.name === "Source");
		expect(sourceField?.value).toContain("Skull Cavern");
		expect(sourceField?.value).toContain("Volcano Dungeon");
		expect(sourceField?.value).toContain("•");
	});

	it("shows N/A for Source when source array is empty", async () => {
		const res = handleFootwear(
			makeInteraction("sneakers"),
			makeSql([fakeFootwearNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Source", value: "N/A" }),
		);
	});

	it("shows purchase price when present", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "2000g" }),
		);
	});

	it("shows N/A for Purchase Price when purchase_price is null", async () => {
		const res = handleFootwear(
			makeInteraction("sneakers"),
			makeSql([fakeFootwearNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "N/A" }),
		);
	});

	it("shows N/A for Sells For when sell_price is null", async () => {
		const res = handleFootwear(
			makeInteraction("sneakers"),
			makeSql([fakeFootwearNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "N/A" }),
		);
	});

	it("shows sell price when present", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "500g" }),
		);
	});

	it("omits description when null", async () => {
		const res = handleFootwear(
			makeInteraction("sneakers"),
			makeSql([fakeFootwearNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.description).toBeUndefined();
	});

	it("returns an ephemeral error for unknown footwear", async () => {
		const res = handleFootwear(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No footwear named");
	});
});

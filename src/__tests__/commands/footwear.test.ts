import { describe, expect, it } from "vitest";
import { handleFootwear } from "../../commands/footwear";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeFootwearRow = {
	name: "Space Boots",
	defense: 4,
	immunity: 2,
	crit_chance: null,
	crit_power: null,
	weight: null,
	description: "Boots from the far reaches of the galaxy.",
	sell_price: 500,
	source: '["Skull Cavern","Volcano Dungeon"]',
	image_url: "https://example.com/space-boots.png",
	wiki_url: "https://stardewvalleywiki.com/Space_Boots",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFootwearNulls = {
	...fakeFootwearRow,
	name: "Sneakers",
	defense: null,
	immunity: null,
	description: null,
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
		expect(embed?.description).toBe("Boots from the far reaches of the galaxy.");
	});

	it("renders Stats as a bullet list using formatItemStats", async () => {
		const res = handleFootwear(
			makeInteraction("space boots"),
			makeSql([fakeFootwearRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const statsField = fields.find((f) => f.name === "Stats");
		expect(statsField?.value).toContain("Defense");
		expect(statsField?.value).toContain("+4");
		expect(statsField?.value).toContain("Immunity");
		expect(statsField?.value).toContain("+2");
	});

	it("shows N/A for Stats when all core stats are null", async () => {
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

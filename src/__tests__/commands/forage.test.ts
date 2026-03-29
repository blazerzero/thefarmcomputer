import { describe, expect, it } from "vitest";
import { handleForage } from "@/commands/forage";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeForageRow = {
	name: "Daffodil",
	seasons: '["Spring"]',
	locations: '["Pelican Town","Forest"]',
	sell_price: 30,
	sell_price_silver: 37,
	sell_price_gold: 45,
	sell_price_iridium: 60,
	energy: 22,
	health: 9,
	used_in: '["Dye Pots"]',
	image_url: "https://example.com/daffodil.png",
	wiki_url: "https://stardewvalleywiki.com/Daffodil",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeAllSeasonRow = {
	...fakeForageRow,
	name: "Artifact Spot",
	seasons: "[]",
	locations: "[]",
	used_in: "[]",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleForage", () => {
	it("returns an embed with the item title and Spring color", async () => {
		const res = handleForage(
			makeInteraction("daffodil"),
			makeSql([fakeForageRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Daffodil");
		expect(embed?.color).toBe(0x78b84a); // Spring green
	});

	it("includes season, locations, energy/health, and sell price fields", async () => {
		const res = handleForage(
			makeInteraction("daffodil"),
			makeSql([fakeForageRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Season", value: "Spring" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Energy / Health",
				value: "22 energy / 9 health",
			}),
		);

		const foundField = fields.find((f) => f.name === "Found");
		expect(foundField?.value).toContain("Pelican Town");
		expect(foundField?.value).toContain("Forest");

		const sellField = fields.find((f) => f.name === "Sells For");
		expect(sellField?.value).toContain("Normal: 30g");
	});

	it("includes Used In field when recipes are present", async () => {
		const res = handleForage(
			makeInteraction("daffodil"),
			makeSql([fakeForageRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Used In",
				value: expect.stringContaining("Dye Pots"),
			}),
		);
	});

	it("shows All Seasons when seasons array is empty", async () => {
		const res = handleForage(
			makeInteraction("artifact"),
			makeSql([fakeAllSeasonRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Season", value: "All Seasons" }),
		);
	});

	it("returns an ephemeral error for an unknown item", async () => {
		const res = handleForage(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No forageable item named");
	});
});

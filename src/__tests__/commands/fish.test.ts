import { describe, expect, it } from "vitest";
import { handleFish } from "../../commands/fish";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeFishRow = {
	name: "Tuna",
	category: "Fishing Pole",
	description: "A big fish.",
	sell_price: 100,
	sell_price_silver: 125,
	sell_price_gold: 150,
	sell_price_iridium: 200,
	location: "Ocean",
	time: "6am – 7pm",
	seasons: '["Summer","Fall"]',
	weather: "Any",
	min_size: 14,
	max_size: 50,
	difficulty: 70,
	behavior: "dart",
	base_xp: 7,
	image_url: "https://example.com/tuna.png",
	wiki_url: "https://stardewvalleywiki.com/Tuna",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeAllSeasonFishRow = {
	...fakeFishRow,
	name: "Crab",
	seasons: "[]",
	location: null,
	weather: null,
	min_size: null,
	max_size: null,
	difficulty: null,
	behavior: null,
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleFish", () => {
	it("returns an embed with the fish title and Summer color", async () => {
		const res = handleFish(makeInteraction("tuna"), makeSql([fakeFishRow]));
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Tuna");
		expect(embed?.color).toBe(0xe8c13a); // Summer yellow
		expect(embed?.description).toBe("A big fish.");
	});

	it("includes location, weather, size, and difficulty fields", async () => {
		const res = handleFish(makeInteraction("tuna"), makeSql([fakeFishRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Location", value: "Ocean" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Weather", value: "Any" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Size", value: "14–50 inches" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Difficulty", value: "70 (dart)" }),
		);
	});

	it("omits optional fields when data is null", async () => {
		const res = handleFish(
			makeInteraction("crab"),
			makeSql([fakeAllSeasonFishRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Location(s)");
		expect(fieldNames).not.toContain("Weather");
		expect(fieldNames).not.toContain("Size");
		expect(fieldNames).not.toContain("Difficulty");
	});

	it("shows All Seasons when seasons array is empty", async () => {
		const res = handleFish(
			makeInteraction("crab"),
			makeSql([fakeAllSeasonFishRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Season", value: "All Seasons" }),
		);
	});

	it("returns an ephemeral error for an unknown fish", async () => {
		const res = handleFish(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No fish named");
	});
});

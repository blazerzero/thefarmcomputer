import { describe, expect, it } from "vitest";
import { handleRing } from "@/commands/ring";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeLuckyRingRow = {
	name: "Lucky Ring",
	description: "Increases daily luck.",
	sell_price: 100,
	effects: "+1 Daily Luck",
	where_to_find: '["Fishing Treasure Chests","Skull Cavern"]',
	image_url: "https://example.com/lucky-ring.png",
	wiki_url: "https://stardewvalleywiki.com/Lucky_Ring",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeNaSellRow = {
	...fakeLuckyRingRow,
	name: "Iridium Band",
	description: "A powerful band combining all elemental rings.",
	sell_price: null,
	effects: "Combines Glow Ring, Magnet Ring, and Ruby Ring",
	where_to_find: '["Crafting"]',
};

const fakeNaEffectsRow = {
	...fakeLuckyRingRow,
	name: "Copper Ring",
	description: "A simple copper ring.",
	effects: null,
	where_to_find: '["The Mines (Floor 20+)","Monster Drops"]',
};

const fakeMultiSourceRow = {
	...fakeLuckyRingRow,
	name: "Glow Ring",
	description: "Emits a pleasant light.",
	where_to_find:
		'["The Mines (Floor 40+)","Fishing Treasure Chests","Monster Drops"]',
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleRing", () => {
	it("returns an embed with the ring title and gold color", async () => {
		const res = handleRing(
			makeInteraction("lucky ring"),
			makeSql([fakeLuckyRingRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Lucky Ring");
		expect(embed?.color).toBe(0xc89b3c);
		expect(embed?.description).toBe("Increases daily luck.");
	});

	it("includes sell price, effects, and where to find fields", async () => {
		const res = handleRing(
			makeInteraction("lucky ring"),
			makeSql([fakeLuckyRingRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "100g" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Effects", value: "+1 Daily Luck" }),
		);

		const whereField = fields.find((f) => f.name === "Where to Find");
		expect(whereField?.value).toContain("Fishing Treasure Chests");
		expect(whereField?.value).toContain("Skull Cavern");
	});

	it("displays N/A for sell price when null", async () => {
		const res = handleRing(
			makeInteraction("iridium band"),
			makeSql([fakeNaSellRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "N/A" }),
		);
	});

	it("still includes Sells For field when sell price is null", async () => {
		const res = handleRing(
			makeInteraction("iridium band"),
			makeSql([fakeNaSellRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).toContain("Sells For");
	});

	it("displays N/A for effects when null", async () => {
		const res = handleRing(
			makeInteraction("copper ring"),
			makeSql([fakeNaEffectsRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Effects", value: "N/A" }),
		);
	});

	it("still includes Effects field when effects is null", async () => {
		const res = handleRing(
			makeInteraction("copper ring"),
			makeSql([fakeNaEffectsRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).toContain("Effects");
	});

	it("renders multiple where-to-find sources as a dot list", async () => {
		const res = handleRing(
			makeInteraction("glow ring"),
			makeSql([fakeMultiSourceRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const whereField = fields.find((f) => f.name === "Where to Find");
		expect(whereField?.value).toContain("The Mines (Floor 40+)");
		expect(whereField?.value).toContain("Fishing Treasure Chests");
		expect(whereField?.value).toContain("Monster Drops");
	});

	it("returns an ephemeral error for an unknown ring", async () => {
		const res = handleRing(makeInteraction("xyz ring"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No ring named");
	});
});

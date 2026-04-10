import { describe, expect, it } from "vitest";
import { handleCrystalarium } from "@/commands/crystalarium";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeDiamondRow = {
	name: "Diamond",
	sell_price: 750,
	processing_time: "5d 20h",
	gold_per_day: 5.2,
	image_url: "https://example.com/diamond.png",
	wiki_url: "https://stardewvalleywiki.com/Diamond",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeAquamarineRow = {
	...fakeDiamondRow,
	name: "Aquamarine",
	sell_price: 180,
	processing_time: "1d 17h",
	gold_per_day: 4.3,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Aquamarine",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleCrystalarium", () => {
	it("returns an embed with the mineral title and crystal color", async () => {
		const res = handleCrystalarium(
			makeInteraction("diamond"),
			makeSql([fakeDiamondRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Diamond");
		expect(embed?.color).toBe(0xc084fc);
	});

	it("includes Sells For, Processing Time, and Gold/Day fields", async () => {
		const res = handleCrystalarium(
			makeInteraction("diamond"),
			makeSql([fakeDiamondRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "750g" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Processing Time", value: "5d 20h" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Gold/Day", value: "5.2g/day" }),
		);
	});

	it("omits Sells For when sell_price is null", async () => {
		const row = { ...fakeDiamondRow, sell_price: null };
		const res = handleCrystalarium(makeInteraction("diamond"), makeSql([row]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Sells For");
	});

	it("omits Processing Time when null", async () => {
		const row = { ...fakeDiamondRow, processing_time: null };
		const res = handleCrystalarium(makeInteraction("diamond"), makeSql([row]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Processing Time");
	});

	it("omits Gold/Day when null", async () => {
		const row = { ...fakeDiamondRow, gold_per_day: null };
		const res = handleCrystalarium(makeInteraction("diamond"), makeSql([row]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Gold/Day");
	});

	it("omits thumbnail when image_url is null", async () => {
		const res = handleCrystalarium(
			makeInteraction("aquamarine"),
			makeSql([fakeAquamarineRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.thumbnail).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown mineral", async () => {
		const res = handleCrystalarium(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No Crystalarium entry for");
	});
});

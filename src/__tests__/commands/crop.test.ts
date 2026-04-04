import { describe, expect, it } from "vitest";
import { handleCrop } from "@/commands/crop";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeCropRow = {
	name: "Parsnip",
	description: "A basic root vegetable that is prized for its speedy growth.",
	seasons: '["Spring"]',
	growth_days: 4,
	regrowth_days: null,
	sell_price: 35,
	sell_price_silver: 43,
	sell_price_gold: 52,
	sell_price_iridium: 70,
	buy_price: 20,
	is_trellis: 0,
	image_url: "https://example.com/parsnip.png",
	wiki_url: "https://stardewvalleywiki.com/Parsnip",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeTrellisRow = {
	...fakeCropRow,
	name: "Green Bean",
	seasons: '["Spring"]',
	is_trellis: 1,
	regrowth_days: 3,
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleCrop", () => {
	it("returns an embed with the crop title and Spring color", async () => {
		const res = handleCrop(makeInteraction("parsnip"), makeSql([fakeCropRow]));
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Parsnip");
		expect(embed?.color).toBe(0x78b84a); // Spring green
		expect(embed?.url).toBe("https://stardewvalleywiki.com/Parsnip");
	});

	it("includes growth time, seed price, and trellis fields", async () => {
		const res = handleCrop(makeInteraction("parsnip"), makeSql([fakeCropRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Growth Time", value: "4 days" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Seed Price", value: "20g" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Trellis", value: "No" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Regrowth", value: "Single harvest" }),
		);
	});

	it("shows trellis and regrowth for a trellis crop", async () => {
		const res = handleCrop(
			makeInteraction("green bean"),
			makeSql([fakeTrellisRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Trellis", value: "Yes" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Regrowth", value: "3 days" }),
		);
	});

	it("includes the description in the embed when present", async () => {
		const res = handleCrop(makeInteraction("parsnip"), makeSql([fakeCropRow]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.embeds?.[0]?.description).toBe(
			"A basic root vegetable that is prized for its speedy growth.",
		);
	});

	it("omits description from the embed when null", async () => {
		const res = handleCrop(
			makeInteraction("green bean"),
			makeSql([{ ...fakeTrellisRow, description: null }]),
		);
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.embeds?.[0]?.description).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown crop", async () => {
		const res = handleCrop(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No crop named");
	});
});

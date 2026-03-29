import { describe, expect, it } from "vitest";
import { handleBook } from "@/commands/book";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeBookRow = {
	name: "Price Catalogue",
	description: "Teaches you the sell prices of items.",
	subsequent_reading: null,
	location: '["Pierre\'s General Store"]',
	image_url: "https://example.com/price-catalogue.png",
	wiki_url: "https://stardewvalleywiki.com/Price_Catalogue",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeBookWithSubsequent = {
	...fakeBookRow,
	name: "Animal Catalogue",
	subsequent_reading: "Teaches you Marnie's phone number.",
	location: '["Marnie\'s Ranch","Traveling Cart"]',
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleBook", () => {
	it("returns an embed with the book title and description", async () => {
		const res = handleBook(
			makeInteraction("price catalogue"),
			makeSql([fakeBookRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Price Catalogue");
		expect(embed?.description).toBe("Teaches you the sell prices of items.");
	});

	it("includes the location field as a dot list", async () => {
		const res = handleBook(
			makeInteraction("price catalogue"),
			makeSql([fakeBookRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const locationField = fields.find((f) => f.name === "Location(s)");
		expect(locationField).toBeDefined();
		expect(locationField?.value).toContain("Pierre's General Store");
	});

	it("renders multiple locations as a list", async () => {
		const res = handleBook(
			makeInteraction("animal catalogue"),
			makeSql([fakeBookWithSubsequent]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const locationField = fields.find((f) => f.name === "Location(s)");
		expect(locationField?.value).toContain("Marnie's Ranch");
		expect(locationField?.value).toContain("Traveling Cart");
	});

	it("includes subsequent reading when present", async () => {
		const res = handleBook(
			makeInteraction("animal catalogue"),
			makeSql([fakeBookWithSubsequent]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Subsequent Reading",
				value: "Teaches you Marnie's phone number.",
			}),
		);
	});

	it("omits subsequent reading when null", async () => {
		const res = handleBook(
			makeInteraction("price catalogue"),
			makeSql([fakeBookRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.map((f) => f.name)).not.toContain("Subsequent Reading");
	});

	it("returns an ephemeral error for an unknown book", async () => {
		const res = handleBook(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No book named");
	});
});

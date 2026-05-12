import { describe, expect, it } from "vitest";
import { handleTackle } from "@/commands/tackle";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeTackleRow = {
	name: "Spinner",
	description: "The shape makes it spin around in the water.",
	notes: "Reduces maximum delay before a nibble by 3.75 seconds.",
	purchase_price: 500,
	crafting: '["Iron Bar (2)"]',
	image_url: "https://example.com/spinner.png",
	wiki_url: "https://stardewvalleywiki.com/Spinner",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeTackleNulls = {
	...fakeTackleRow,
	name: "Curiosity Lure",
	description: null,
	notes: null,
	purchase_price: null,
	crafting: "[]",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleTackle", () => {
	it("returns an embed with the tackle title and DEFAULT_COLOR", async () => {
		const res = handleTackle(
			makeInteraction("spinner"),
			makeSql([fakeTackleRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Spinner");
		expect(embed?.color).toBe(0x5b8a3c);
		expect(embed?.description).toBe(
			"The shape makes it spin around in the water.",
		);
	});

	it("renders Notes field with the notes text", async () => {
		const res = handleTackle(
			makeInteraction("spinner"),
			makeSql([fakeTackleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const notesField = fields.find((f) => f.name === "Notes");
		expect(notesField?.value).toContain("Reduces maximum delay");
	});

	it("shows N/A for Notes when notes is null", async () => {
		const res = handleTackle(
			makeInteraction("curiosity lure"),
			makeSql([fakeTackleNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Notes", value: "N/A" }),
		);
	});

	it("renders Crafting as a bullet list", async () => {
		const res = handleTackle(
			makeInteraction("spinner"),
			makeSql([fakeTackleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const craftingField = fields.find((f) => f.name === "Crafting");
		expect(craftingField?.value).toContain("Iron Bar (2)");
	});

	it("shows N/A for Crafting when crafting array is empty", async () => {
		const res = handleTackle(
			makeInteraction("curiosity lure"),
			makeSql([fakeTackleNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Crafting", value: "N/A" }),
		);
	});

	it("shows purchase price when present", async () => {
		const res = handleTackle(
			makeInteraction("spinner"),
			makeSql([fakeTackleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "500g" }),
		);
	});

	it("shows N/A for Purchase Price when purchase_price is null", async () => {
		const res = handleTackle(
			makeInteraction("curiosity lure"),
			makeSql([fakeTackleNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "N/A" }),
		);
	});

	it("omits description when null", async () => {
		const res = handleTackle(
			makeInteraction("curiosity lure"),
			makeSql([fakeTackleNulls]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.description).toBeUndefined();
	});

	it("returns an ephemeral error for unknown tackle", async () => {
		const res = handleTackle(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No tackle named");
	});
});

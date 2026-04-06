import { describe, expect, it } from "vitest";
import { handleDeconstruct } from "@/commands/deconstruct";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeItemRow = {
	name: "Sprinkler",
	sell_price: 100,
	deconstructed_items: JSON.stringify([
		{ name: "Iron Bar", quantity: 1 },
		{ name: "Gold Bar", quantity: 1 },
	]),
	image_url: "https://example.com/sprinkler.png",
	wiki_url: "https://stardewvalleywiki.com/Sprinkler",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeItemNoPrice = {
	...fakeItemRow,
	name: "Crab Pot",
	sell_price: null,
	deconstructed_items: JSON.stringify([{ name: "Wood", quantity: 3 }]),
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleDeconstruct", () => {
	it("returns an embed with the item title and color", async () => {
		const res = handleDeconstruct(
			makeInteraction("sprinkler"),
			makeSql([fakeItemRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Sprinkler");
		expect(embed?.color).toBe(0x607d8b);
	});

	it("includes Sells For and Deconstructed Into fields", async () => {
		const res = handleDeconstruct(
			makeInteraction("sprinkler"),
			makeSql([fakeItemRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "100g" }),
		);
		const outputField = fields.find((f) => f.name === "Deconstructed Into");
		expect(outputField?.value).toContain("Iron Bar");
		expect(outputField?.value).toContain("Gold Bar");
	});

	it("shows N/A for missing sell price", async () => {
		const res = handleDeconstruct(
			makeInteraction("crab pot"),
			makeSql([fakeItemNoPrice]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "N/A" }),
		);
	});

	it("returns an ephemeral error for an unknown item", async () => {
		const res = handleDeconstruct(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No item named");
	});
});

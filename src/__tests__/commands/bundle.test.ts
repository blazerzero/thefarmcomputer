import { describe, expect, it } from "vitest";
import { handleBundle } from "@/commands/bundle";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeSpringBundleRow = {
	name: "Spring Foraging Bundle",
	room: "Crafts Room",
	items:
		'[{"name":"Daffodil","quantity":1},{"name":"Dandelion","quantity":1},{"name":"Leek","quantity":1},{"name":"Wild Horseradish","quantity":1}]',
	items_required: 4,
	reward: "Spring Seeds ×30",
	description: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Spring_Foraging_Bundle",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeChoiceBundleRow = {
	name: "Chef's Bundle",
	room: "Bulletin Board",
	items:
		'[{"name":"Maple Syrup","quantity":1},{"name":"Fiddlehead Fern","quantity":1},{"name":"Truffle","quantity":1},{"name":"Poppy","quantity":1},{"name":"Maki Roll","quantity":1},{"name":"Fried Egg","quantity":1}]',
	items_required: 3,
	reward: "Pink Cake",
	description: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Chef%27s_Bundle",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeVaultBundleRow = {
	name: "25,000g Bundle",
	room: "Vault",
	items: '[{"name":"gold","quantity":25000}]',
	items_required: 1,
	reward: "Chocolate Cake",
	description: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/25%2C000g_Bundle",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleBundle", () => {
	it("returns an embed with the bundle title and Crafts Room color", async () => {
		const res = handleBundle(
			makeInteraction("spring foraging"),
			makeSql([fakeSpringBundleRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Spring Foraging Bundle");
		expect(embed?.color).toBe(0x78b84a); // Crafts Room green
	});

	it("includes room, reward, and items fields", async () => {
		const res = handleBundle(
			makeInteraction("spring foraging"),
			makeSql([fakeSpringBundleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Room", value: "Crafts Room" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Reward", value: "Spring Seeds ×30" }),
		);

		const itemsField = fields.find((f) => f.name === "Items Required");
		expect(itemsField?.value).toContain("Daffodil");
		expect(itemsField?.value).toContain("Dandelion");
	});

	it("labels field as choice when items_required < items.length", async () => {
		const res = handleBundle(
			makeInteraction("chef"),
			makeSql([fakeChoiceBundleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).toContainEqual(expect.stringMatching(/choose 3 of 6/));
	});

	it("uses gold amounts instead of item names for Vault bundles", async () => {
		const res = handleBundle(
			makeInteraction("25000g"),
			makeSql([fakeVaultBundleRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const purchaseField = fields.find((f) => f.name === "Purchase Cost");
		expect(purchaseField?.value).toContain("25,000g");
	});

	it("returns an ephemeral error for an unknown bundle", async () => {
		const res = handleBundle(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No bundle named");
	});
});

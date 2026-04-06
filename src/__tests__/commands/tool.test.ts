import { describe, expect, it } from "vitest";
import { handleTool } from "@/commands/tool";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeHoeRow = {
	name: "Copper Hoe",
	category: "Hoe",
	description: "A farming tool used to till the earth.",
	cost: null,
	ingredients: "5 Copper Bar (2,000g)",
	improvements: "Tills 2 columns (3 tiles)",
	location: null,
	requirements: null,
	image_url: "https://example.com/copper-hoe.png",
	wiki_url: "https://stardewvalleywiki.com/Copper_Hoe",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeRodRow = {
	name: "Iridium Rod",
	category: "Fishing Rod",
	description: "Can use both bait and tackle.",
	cost: "7,500g",
	ingredients: null,
	improvements: null,
	location: null,
	requirements: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Iridium_Rod",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakePanRow = {
	name: "Copper Pan",
	category: "Pan",
	description: "Used for panning for ore.",
	cost: null,
	ingredients: null,
	improvements: null,
	location: "Cindersap Forest (after fixing the glittering boulder)",
	requirements: null,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Copper_Pan",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleTool", () => {
	it("returns an embed with the tool title and color", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Copper Hoe");
		expect(embed?.color).toBe(0x8b6914);
		expect(embed?.description).toBe("A farming tool used to till the earth.");
	});

	it("includes Category field always", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Type", value: "Hoe" }),
		);
	});

	it("includes Ingredients when present", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Ingredients",
				value: "5 Copper Bar (2,000g)",
			}),
		);
	});

	it("omits Ingredients when null", async () => {
		const res = handleTool(
			makeInteraction("iridium rod"),
			makeSql([fakeRodRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields?.find((f) => f.name === "Ingredients")).toBeUndefined();
	});

	it("includes Improvements when present", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Improvements",
				value: "Tills 2 columns (3 tiles)",
			}),
		);
	});

	it("omits Improvements when null", async () => {
		const res = handleTool(
			makeInteraction("iridium rod"),
			makeSql([fakeRodRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields?.find((f) => f.name === "Improvements")).toBeUndefined();
	});

	it("includes Cost when present", async () => {
		const res = handleTool(
			makeInteraction("iridium rod"),
			makeSql([fakeRodRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Cost", value: "7,500g" }),
		);
	});

	it("omits Cost when null", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields?.find((f) => f.name === "Cost")).toBeUndefined();
	});

	it("includes Location when present", async () => {
		const res = handleTool(
			makeInteraction("copper pan"),
			makeSql([fakePanRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Location" }),
		);
		expect(
			fields?.find((f) => f.name === "Location")?.value,
		).toContain("Cindersap Forest");
	});

	it("omits Location when null", async () => {
		const res = handleTool(
			makeInteraction("copper hoe"),
			makeSql([fakeHoeRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields?.find((f) => f.name === "Location")).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown tool", async () => {
		const res = handleTool(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No tool named");
	});
});

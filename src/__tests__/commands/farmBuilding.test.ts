import { describe, expect, it } from "vitest";
import { handleFarmBuilding } from "@/commands/farmBuilding";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeCoopRow = {
	name: "Coop",
	description: "Houses 4 coop-dwelling animals.",
	animals_housed: "Chickens",
	cost: 4000,
	materials: '[{"name":"Wood","quantity":300},{"name":"Stone","quantity":100}]',
	size: "6x3",
	construction_time: "3 days",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Coop",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeWellRow = {
	name: "Well",
	description: "Provides a place for you to refill your watering can.",
	animals_housed: null,
	cost: 1000,
	materials: '[{"name":"Stone","quantity":75}]',
	size: "3x3",
	construction_time: "2 days",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Well",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleFarmBuilding", () => {
	it("returns an embed with the building title", async () => {
		const res = handleFarmBuilding(
			makeInteraction("coop"),
			makeSql([fakeCoopRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.title).toBe("Coop");
		expect(embed?.description).toContain("coop-dwelling");
	});

	it("includes cost, size, and construction time fields", async () => {
		const res = handleFarmBuilding(
			makeInteraction("coop"),
			makeSql([fakeCoopRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Cost", value: "4,000g" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Size", value: "6x3" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({
				name: "Construction Time",
				value: "3 days",
			}),
		);
	});

	it("includes materials in the fields", async () => {
		const res = handleFarmBuilding(
			makeInteraction("coop"),
			makeSql([fakeCoopRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const materialsField = fields.find((f) => f.name === "Materials");

		expect(materialsField?.value).toContain("Wood");
		expect(materialsField?.value).toContain("300");
	});

	it("includes the Houses field when animals_housed is set", async () => {
		const res = handleFarmBuilding(
			makeInteraction("coop"),
			makeSql([fakeCoopRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Houses", value: "Chickens" }),
		);
	});

	it("omits the Houses field when animals_housed is null", async () => {
		const res = handleFarmBuilding(
			makeInteraction("well"),
			makeSql([fakeWellRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).not.toContainEqual(
			expect.objectContaining({ name: "Houses" }),
		);
	});

	it("returns an ephemeral error for an unknown building", async () => {
		const res = handleFarmBuilding(makeInteraction("nonexistent"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No farm building named");
	});
});

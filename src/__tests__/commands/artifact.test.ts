import { describe, expect, it } from "vitest";
import { handleArtifact } from "@/commands/artifact";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeDwarvishHelmRow = {
	name: "Dwarvish Helm",
	description: "It's a dwarvish helm. The metal is of an unfamiliar type.",
	sell_price: 50,
	location: '["The Mines (Floors 40-80)","Artifact Spots"]',
	image_url: "https://example.com/dwarvish-helm.png",
	wiki_url: "https://stardewvalleywiki.com/Dwarvish_Helm",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeNoSellRow = {
	...fakeDwarvishHelmRow,
	name: "Ancient Sword",
	sell_price: null,
	location: '["Artifact Spots (Mountain)"]',
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleArtifact", () => {
	it("returns an embed with the artifact title and correct color", async () => {
		const res = handleArtifact(
			makeInteraction("dwarvish helm"),
			makeSql([fakeDwarvishHelmRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Dwarvish Helm");
		expect(embed?.color).toBe(0x8b6914);
		expect(embed?.description).toBe(
			"It's a dwarvish helm. The metal is of an unfamiliar type.",
		);
	});

	it("includes Sells For field when sell_price is non-null", async () => {
		const res = handleArtifact(
			makeInteraction("dwarvish helm"),
			makeSql([fakeDwarvishHelmRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "50g" }),
		);
	});

	it("omits Sells For field when sell_price is null", async () => {
		const res = handleArtifact(
			makeInteraction("ancient sword"),
			makeSql([fakeNoSellRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Sells For");
	});

	it("includes Location field with location text", async () => {
		const res = handleArtifact(
			makeInteraction("dwarvish helm"),
			makeSql([fakeDwarvishHelmRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const locationField = fields.find((f) => f.name === "Location");
		expect(locationField?.value).toContain("The Mines");
		expect(locationField?.value).toContain("Artifact Spots");
	});

	it("returns an ephemeral error for an unknown artifact", async () => {
		const res = handleArtifact(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No artifact named");
	});
});

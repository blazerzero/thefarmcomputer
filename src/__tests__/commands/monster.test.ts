import { describe, expect, it } from "vitest";
import { handleMonster } from "../../commands/monster";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeMonsterRow = {
	name: "Shadow Brute",
	location: "The Mines (Floors 80-119)",
	hp: "250",
	damage: "14-26",
	defense: "3",
	speed: "3",
	xp: "15",
	drops: '["Solar Essence (75%)","Void Essence (75%)","Monster Musk (2.5%)"]',
	image_url: "https://stardewvalleywiki.com/mediawiki/images/Shadow_Brute.png",
	wiki_url: "https://stardewvalleywiki.com/Shadow_Brute",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeMinimalMonsterRow = {
	name: "Green Slime",
	location: null,
	hp: "28",
	damage: null,
	defense: null,
	speed: null,
	xp: null,
	drops: "[]",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Slimes",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleMonster", () => {
	it("returns an embed with the monster title and color", async () => {
		const res = handleMonster(
			makeInteraction("shadow brute"),
			makeSql([fakeMonsterRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Shadow Brute");
		expect(embed?.color).toBe(0xc0392b);
		expect(embed?.url).toBe("https://stardewvalleywiki.com/Shadow_Brute");
	});

	it("includes stat fields HP, Damage, Defense, Speed, XP", async () => {
		const res = handleMonster(
			makeInteraction("shadow brute"),
			makeSql([fakeMonsterRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "HP", value: "250" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Damage", value: "14-26" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Defense", value: "3" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Speed", value: "3" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "XP", value: "15" }),
		);
	});

	it("includes Location and Drops fields", async () => {
		const res = handleMonster(
			makeInteraction("shadow brute"),
			makeSql([fakeMonsterRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const locationField = fields.find((f) => f.name === "Location(s)");
		expect(locationField?.value).toContain("The Mines");

		const dropsField = fields.find((f) => f.name === "Drops");
		expect(dropsField?.value).toContain("Solar Essence");
		expect(dropsField?.value).toContain("Void Essence");
	});

	it("omits null stat fields", async () => {
		const res = handleMonster(
			makeInteraction("green slime"),
			makeSql([fakeMinimalMonsterRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).toContain("HP");
		expect(fieldNames).not.toContain("Damage");
		expect(fieldNames).not.toContain("Defense");
		expect(fieldNames).not.toContain("Speed");
		expect(fieldNames).not.toContain("XP");
		expect(fieldNames).not.toContain("Location(s)");
		expect(fieldNames).not.toContain("Drops");
	});

	it("returns an ephemeral error for an unknown monster", async () => {
		const res = handleMonster(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No monster named");
	});
});

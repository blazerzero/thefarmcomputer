import { describe, expect, it } from "vitest";
import { handleGift } from "@/commands/gift";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeVillagerRow = {
	name: "Emily",
	birthday: "Spring 27",
	loved_gifts:
		'["Amethyst","Aquamarine","Cloth","Emerald","Jade","Ruby","Topaz","Wool"]',
	liked_gifts: '["Daffodil","Leek"]',
	neutral_gifts: '["Common Mushroom"]',
	disliked_gifts: '["Sugar","Wheat Flour"]',
	hated_gifts: '["Holly"]',
	wiki_url: "https://stardewvalleywiki.com/Emily",
	image_url: "https://example.com/emily.png",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(villager: string, tier?: string) {
	const options: Array<{ name: string; value: string }> = [
		{ name: "villager", value: villager },
	];
	if (tier) options.push({ name: "tier", value: tier });
	return { data: { options } };
}

describe("handleGift", () => {
	it("returns an embed with the villager name, color, and birthday", async () => {
		const res = handleGift(
			makeInteraction("emily"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Emily");
		expect(embed?.color).toBe(0xe8608a); // pink
		expect(embed?.description).toContain("Spring 27");
	});

	it("returns all gift tiers when no tier filter is given", async () => {
		const res = handleGift(
			makeInteraction("emily"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).toContainEqual(expect.stringContaining("Loved"));
		expect(fieldNames).toContainEqual(expect.stringContaining("Liked"));
		expect(fieldNames).toContainEqual(expect.stringContaining("Neutral"));
		expect(fieldNames).toContainEqual(expect.stringContaining("Disliked"));
		expect(fieldNames).toContainEqual(expect.stringContaining("Hated"));
	});

	it("returns only the requested tier when a filter is provided", async () => {
		const res = handleGift(
			makeInteraction("emily", "loved_gifts"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toHaveLength(1);
		expect(fields[0]?.name).toContain("Loved");
		expect(fields[0]?.value).toContain("Amethyst");
	});

	it("lists loved gifts in the Loved field", async () => {
		const res = handleGift(
			makeInteraction("emily"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const lovedField = fields.find((f) => f.name.includes("Loved"));

		expect(lovedField?.value).toContain("Amethyst");
		expect(lovedField?.value).toContain("Aquamarine");
	});

	it("returns an ephemeral error for an unknown villager", async () => {
		const res = handleGift(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No villager named");
	});
});

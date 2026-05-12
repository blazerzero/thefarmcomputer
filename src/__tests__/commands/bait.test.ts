import { describe, expect, it } from "vitest";
import { handleBait } from "@/commands/bait";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeWildBaitRow = {
	name: "Wild Bait",
	description:
		"A unique recipe from Linus that gives you a chance to catch two fish at once.",
	notes:
		"Decreases the time taken for fish to bite slightly more than standard bait.",
	purchase: null,
	ingredients: JSON.stringify([
		{ name: "Fiber", quantity: 10 },
		{ name: "Slime", quantity: 5 },
		{ name: "Bug Meat", quantity: 5 },
	]),
	image_url:
		"https://stardewvalleywiki.com/mediawiki/images/d/da/Wild_Bait.png",
	wiki_url: "https://stardewvalleywiki.com/Wild_Bait",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeBaitRow = {
	name: "Bait",
	description:
		"Causes fish to bite faster. Must first be attached to a fishing rod.",
	notes: "Default bait, decreases the time taken for fish to bite.",
	purchase: "5g",
	ingredients: JSON.stringify([{ name: "Bug Meat", quantity: 1 }]),
	image_url: "https://stardewvalleywiki.com/mediawiki/images/f/ff/Bait.png",
	wiki_url: "https://stardewvalleywiki.com/Bait_(item)",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleBait", () => {
	it("returns an embed with the bait title and description", async () => {
		const res = handleBait(
			makeInteraction("wild bait"),
			makeSql([fakeWildBaitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.title).toBe("Wild Bait");
		expect(embed?.description).toBe(
			"A unique recipe from Linus that gives you a chance to catch two fish at once.",
		);
	});

	it("includes Crafting and Notes fields for Wild Bait", async () => {
		const res = handleBait(
			makeInteraction("wild bait"),
			makeSql([fakeWildBaitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Crafting" }),
		);
		const craftingField = fields.find((f) => f.name === "Crafting");
		expect(craftingField?.value).toContain("Fiber (10)");
		expect(craftingField?.value).toContain("Slime (5)");
		expect(craftingField?.value).toContain("Bug Meat (5)");

		expect(fields).toContainEqual(expect.objectContaining({ name: "Notes" }));
	});

	it("omits Purchase field when purchase is null", async () => {
		const res = handleBait(
			makeInteraction("wild bait"),
			makeSql([fakeWildBaitRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];
		const fieldNames = fields.map((f) => f.name);

		expect(fieldNames).not.toContain("Purchase");
	});

	it("includes Purchase field when purchase is set", async () => {
		const res = handleBait(makeInteraction("bait"), makeSql([fakeBaitRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase", value: "5g" }),
		);
	});

	it("returns an ephemeral error for an unknown bait", async () => {
		const res = handleBait(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No bait named");
	});
});

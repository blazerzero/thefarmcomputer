import { describe, expect, it } from "vitest";
import { handleWeapon } from "../../commands/weapon";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeSwordRow = {
	name: "Infinity Blade",
	category: "Sword",
	min_damage: 80,
	max_damage: 100,
	speed: 0,
	defense: null,
	weight: null,
	crit_chance: 2,
	crit_power: 3,
	level: 15,
	sell_price: 1000,
	purchase_price: null,
	location: "Three-Sword Challenge",
	description: "The pinnacle of craftsmanship.",
	extra_stats: null,
	image_url: "https://example.com/infinity-blade.png",
	wiki_url: "https://stardewvalleywiki.com/Infinity_Blade",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeClubRow = {
	...fakeSwordRow,
	name: "Wood Club",
	category: "Club",
	min_damage: 7,
	max_damage: 15,
	speed: -1,
	defense: null,
	weight: 5,
	crit_chance: null,
	crit_power: null,
	level: 1,
	sell_price: 100,
	purchase_price: 500,
	location: "Carpenter Shop",
	description: null,
	extra_stats: null,
};

const fakeWeaponWithExtras = {
	...fakeSwordRow,
	name: "Galaxy Sword",
	extra_stats: JSON.stringify([{ name: "Knockback", value: "+1" }]),
};

function makeInteraction(name: string) {
	return { data: { options: [{ name: "name", value: name }] } };
}

describe("handleWeapon", () => {
	it("returns an embed with the weapon title and color", async () => {
		const res = handleWeapon(
			makeInteraction("infinity blade"),
			makeSql([fakeSwordRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Infinity Blade");
		expect(embed?.color).toBe(0xc0392b);
		expect(embed?.description).toBe("The pinnacle of craftsmanship.");
	});

	it("includes type, level, damage, stats, location, and price fields", async () => {
		const res = handleWeapon(
			makeInteraction("infinity blade"),
			makeSql([fakeSwordRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Type", value: "Sword" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Level", value: "15" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Damage", value: "80–100" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Location(s)", value: "Three-Sword Challenge" }),
		);
		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Sells For", value: "1000g" }),
		);
	});

	it("shows N/A for missing purchase price", async () => {
		const res = handleWeapon(
			makeInteraction("infinity blade"),
			makeSql([fakeSwordRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "N/A" }),
		);
	});

	it("renders purchase price when present", async () => {
		const res = handleWeapon(
			makeInteraction("wood club"),
			makeSql([fakeClubRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Purchase Price", value: "500g" }),
		);
	});

	it("renders damage as single value when min equals max", async () => {
		const sameRow = { ...fakeSwordRow, min_damage: 50, max_damage: 50 };
		const res = handleWeapon(makeInteraction("sword"), makeSql([sameRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toContainEqual(
			expect.objectContaining({ name: "Damage", value: "50" }),
		);
	});

	it("includes extra stats when present", async () => {
		const res = handleWeapon(
			makeInteraction("galaxy sword"),
			makeSql([fakeWeaponWithExtras]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		const otherStats = fields.find((f) => f.name === "Other Stats");
		expect(otherStats?.value).toContain("Knockback");
	});

	it("omits description when null", async () => {
		const res = handleWeapon(
			makeInteraction("wood club"),
			makeSql([fakeClubRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const embed = json.data.embeds?.[0];

		expect(embed?.description).toBeUndefined();
	});

	it("returns an ephemeral error for an unknown weapon", async () => {
		const res = handleWeapon(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No weapon named");
	});
});

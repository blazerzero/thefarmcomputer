import { describe, expect, it } from "vitest";
import { handleWebQuery } from "@/web";
import { makeSql, type WebApiResponse } from "./helpers";

const noopEnsure = async () => {
	/* no-op */
};

// ── Shared fake rows ──────────────────────────────────────────────────────────

const fakeCropRow = {
	name: "Parsnip",
	description: null,
	seasons: '["Spring"]',
	growth_days: 4,
	regrowth_days: null,
	sell_price: 35,
	sell_price_silver: 43,
	sell_price_gold: 52,
	sell_price_iridium: 70,
	buy_price: 20,
	is_trellis: 0,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Parsnip",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFishRow = {
	name: "Tuna",
	category: "Fishing Pole",
	description: null,
	sell_price: 100,
	sell_price_silver: 125,
	sell_price_gold: 150,
	sell_price_iridium: 200,
	location: "Ocean",
	time: "6am – 7pm",
	seasons: '["Summer"]',
	weather: "Any",
	min_size: 14,
	max_size: 50,
	difficulty: 70,
	behavior: "dart",
	base_xp: 7,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Tuna",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFruitTreeRow = {
	name: "Apple Tree",
	season: "Fall",
	growth_days: 28,
	sapling_price: 4000,
	fruit_name: "Apple",
	sell_price: 100,
	sell_price_silver: 125,
	sell_price_gold: 150,
	sell_price_iridium: 200,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Apple_Tree",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeForageRow = {
	name: "Daffodil",
	seasons: '["Spring"]',
	locations: '["Forest"]',
	sell_price: 30,
	sell_price_silver: 37,
	sell_price_gold: 45,
	sell_price_iridium: 60,
	energy: 22,
	health: 9,
	used_in: "[]",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Daffodil",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeBundleRow = {
	name: "Spring Foraging Bundle",
	room: "Crafts Room",
	items: '[{"name":"Daffodil","quantity":1}]',
	items_required: 1,
	reward: "Spring Seeds ×30",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Spring_Foraging_Bundle",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeMineralRow = {
	name: "Quartz",
	category: "Foraged Mineral",
	description: null,
	sell_price: 25,
	sell_price_gemologist: null,
	source: '["The Mines"]',
	used_in: "[]",
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Quartz",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeVillagerRow = {
	name: "Emily",
	birthday: "Spring 27",
	loved_gifts: '["Amethyst"]',
	liked_gifts: '["Daffodil"]',
	neutral_gifts: "[]",
	disliked_gifts: "[]",
	hated_gifts: "[]",
	wiki_url: "https://stardewvalleywiki.com/Emily",
	image_url: null,
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeMonsterRow = {
	name: "Shadow Brute",
	location: "The Mines (Floors 80-119)",
	hp: "250",
	damage: "14-26",
	defense: "3",
	speed: "3",
	xp: "15",
	drops: '["Solar Essence (75%)"]',
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Shadow_Brute",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeRecipeRow = {
	name: "Fried Egg",
	description: "It's an egg, fried.",
	ingredients: '[{"name":"Egg","quantity":1}]',
	energy: 50,
	health: 22,
	buffs: null,
	buff_duration: null,
	recipe_source: "Starter",
	sell_price: 35,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Fried_Egg",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeFootwearRow = {
	name: "Sneakers",
	defense: 0,
	immunity: 0,
	crit_chance: null,
	crit_power: null,
	weight: null,
	description: null,
	sell_price: 100,
	source: '["Krobus Shop"]',
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Sneakers",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeRingRow = {
	name: "Lucky Ring",
	description: "Increases daily luck.",
	sell_price: 100,
	effects: "+1 Daily Luck",
	where_to_find: '["Fishing Treasure Chests"]',
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Lucky_Ring",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeArtisanGoodRow = {
	name: "Wine",
	machine: "Keg",
	description: null,
	ingredients: null,
	processing_time: null,
	sell_price: "400g",
	energy: null,
	health: null,
	buffs: null,
	cask_days_to_silver: 14,
	cask_days_to_gold: 28,
	cask_days_to_iridium: 56,
	image_url: null,
	wiki_url: "https://stardewvalleywiki.com/Wine",
	last_updated: "2024-03-01T00:00:00.000Z",
};

const fakeStatusRow = { n: 10, last_updated: "2024-03-01T00:00:00.000Z" };

const springCropRow = {
	name: "Parsnip",
	description: null,
	seasons: '["Spring"]',
	growth_days: 4,
	regrowth_days: null,
	sell_price: 35,
	wiki_url: "https://stardewvalleywiki.com/Parsnip",
};

// ── Command routing tests ─────────────────────────────────────────────────────

describe("handleWebQuery — command routing", () => {
	it("routes 'artisan' and returns an embed with Machine field", async () => {
		const res = await handleWebQuery(
			"artisan wine",
			makeSql([fakeArtisanGoodRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Wine");
		expect(json.embed?.fields).toContainEqual(
			expect.objectContaining({ name: "Machine" }),
		);
	});

	it("routes 'crop' and returns an embed with the crop title", async () => {
		const res = await handleWebQuery(
			"crop parsnip",
			makeSql([fakeCropRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Parsnip");
	});

	it("routes 'fish' and returns an embed with the fish title", async () => {
		const res = await handleWebQuery(
			"fish tuna",
			makeSql([fakeFishRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Tuna");
	});

	it("routes 'fruit-tree' and returns an embed with the tree title", async () => {
		const res = await handleWebQuery(
			"fruit-tree apple",
			makeSql([fakeFruitTreeRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Apple Tree");
	});

	it("routes 'forage' and returns an embed with the item title", async () => {
		const res = await handleWebQuery(
			"forage daffodil",
			makeSql([fakeForageRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Daffodil");
	});

	it("routes 'bundle' and returns an embed with the bundle title", async () => {
		const res = await handleWebQuery(
			"bundle spring foraging",
			makeSql([fakeBundleRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Spring Foraging Bundle");
	});

	it("routes 'mineral' and returns an embed with the mineral title", async () => {
		const res = await handleWebQuery(
			"mineral quartz",
			makeSql([fakeMineralRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Quartz");
	});

	it("routes 'gift' and returns an embed with the villager title", async () => {
		const res = await handleWebQuery(
			"gift emily",
			makeSql([fakeVillagerRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Emily");
	});

	it("routes 'season' and returns an embed listing crops", async () => {
		const res = await handleWebQuery(
			"season Spring",
			makeSql([springCropRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toContain("Spring Crops");
	});

	it("routes 'footwear' and returns an embed with the footwear title", async () => {
		const res = await handleWebQuery(
			"footwear sneakers",
			makeSql([fakeFootwearRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Sneakers");
	});

	it("routes 'monster' and returns an embed with the monster title", async () => {
		const res = await handleWebQuery(
			"monster shadow brute",
			makeSql([fakeMonsterRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Shadow Brute");
	});

	it("routes 'recipe' and returns an embed with the recipe title", async () => {
		const res = await handleWebQuery(
			"recipe fried egg",
			makeSql([fakeRecipeRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Fried Egg");
	});

	it("routes 'ring' and returns an embed with the ring title", async () => {
		const res = await handleWebQuery(
			"ring lucky ring",
			makeSql([fakeRingRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Lucky Ring");
	});

	it("routes 'info' and returns an embed with the status title", async () => {
		const res = await handleWebQuery(
			"info",
			makeSql([fakeStatusRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("The Farm Computer — Status");
		expect(json.embed?.color).toBe(0x5b8a3c);
		expect(json.embed?.fields?.map((f) => f.name)).toContain(
			`Artisan Goods: 10`,
		);
	});
});

// ── Argument handling ─────────────────────────────────────────────────────────

describe("handleWebQuery — argument handling", () => {
	it("joins multi-word args into a single query value", async () => {
		const res = await handleWebQuery(
			"bundle spring foraging bundle",
			makeSql([fakeBundleRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.embed?.title).toBe("Spring Foraging Bundle");
	});

	it("passes tier as second argument to gift command", async () => {
		const res = await handleWebQuery(
			"gift emily loved_gifts",
			makeSql([fakeVillagerRow]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;
		const fields = json.embed?.fields ?? [];

		expect(fields).toHaveLength(1);
		expect(fields[0]?.name).toContain("Loved");
	});
});

// ── Error cases ───────────────────────────────────────────────────────────────

describe("handleWebQuery — error handling", () => {
	it("returns an error for an unknown command", async () => {
		const res = await handleWebQuery(
			"pizza margherita",
			makeSql([]),
			noopEnsure,
		);
		const json = (await res.json()) as WebApiResponse;

		expect(json.error).toContain("Unknown command");
		expect(json.error).toContain("pizza");
	});

	it("returns an error when the item is not found in the database", async () => {
		const res = await handleWebQuery("crop xyz", makeSql([]), noopEnsure);
		const json = (await res.json()) as WebApiResponse;

		expect(json.error).toContain("No crop named");
		expect(json.embed).toBeUndefined();
	});

	it("returns an error for an empty input string", async () => {
		const res = await handleWebQuery("", makeSql([]), noopEnsure);
		const json = (await res.json()) as WebApiResponse;

		expect(json.error).toContain("Unknown command");
	});
});

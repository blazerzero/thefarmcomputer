import { handleArtifact } from "@/commands/artifact";
import { handleArtisan } from "@/commands/artisan";
import { handleBook } from "@/commands/book";
import { handleBundle } from "@/commands/bundle";
import { handleCraft } from "@/commands/craft";
import { handleCrop } from "@/commands/crop";
import { handleCrystalarium } from "@/commands/crystalarium";
import { handleDeconstruct } from "@/commands/deconstruct";
import { handleFish } from "@/commands/fish";
import { handleFootwear } from "@/commands/footwear";
import { handleForage } from "@/commands/forage";
import { handleFruit } from "@/commands/fruit";
import { handleFruitTree } from "@/commands/fruitTree";
import { handleGift } from "@/commands/gift";
import { handleIngredient } from "@/commands/ingredient";
import { handleMineral } from "@/commands/mineral";
import { handleMonster } from "@/commands/monster";
import { handleRecipe } from "@/commands/recipe";
import { handleRing } from "@/commands/ring";
import { handleSchedule } from "@/commands/schedule";
import { handleSeason } from "@/commands/season";
import { handleTool } from "@/commands/tool";
import { handleWeapon } from "@/commands/weapon";
import { formatDate } from "@/constants";
import {
	countArtifacts,
	countArtisanGoods,
	countBooks,
	countBundles,
	countCraftedItems,
	countCrops,
	countCrystalariumItems,
	countDeconstructorItems,
	countFish,
	countFootwear,
	countForageables,
	countFruits,
	countFruitTrees,
	countMinerals,
	countMonsters,
	countRecipes,
	countRings,
	countTools,
	countVillagers,
	countWeapons,
	getStatus,
	initDb,
	upsertArtifact,
	upsertArtisanGood,
	upsertBook,
	upsertBundle,
	upsertCraftedItem,
	upsertCrop,
	upsertCrystalariumItem,
	upsertDeconstructorItem,
	upsertFish,
	upsertFootwear,
	upsertForageable,
	upsertFruit,
	upsertFruitTree,
	upsertMineral,
	upsertMonster,
	upsertRecipe,
	upsertRing,
	upsertTool,
	upsertVillager,
	upsertWeapon,
} from "@/db";
import type { Env } from "@/env";
import { scrapeArtifacts } from "@/scraper/artifacts";
import { scrapeArtisanGoods } from "@/scraper/artisanGoods";
import { scrapeBooks } from "@/scraper/books";
import { scrapeBundles } from "@/scraper/bundles";
import { scrapeCraftedItems } from "@/scraper/craftedItems";
import { scrapeCrops } from "@/scraper/crops";
import { scrapeCrystalariumItems } from "@/scraper/crystalariumItems";
import { scrapeDeconstructorItems } from "@/scraper/deconstructorItems";
import { scrapeFish } from "@/scraper/fish";
import { scrapeFootwear } from "@/scraper/footwear";
import { scrapeForageables } from "@/scraper/forageables";
import { scrapeFruits } from "@/scraper/fruits";
import { scrapeFruitTrees } from "@/scraper/fruitTrees";
import { scrapeMinerals } from "@/scraper/minerals";
import { scrapeMonsters } from "@/scraper/monsters";
import { scrapeRecipes } from "@/scraper/recipes";
import { scrapeRings } from "@/scraper/rings";
import { scrapeTools } from "@/scraper/tools";
import { scrapeVillagers } from "@/scraper/villagers";
import { scrapeWeapons } from "@/scraper/weapons";
import { Command, InteractionResponseType, InteractionType } from "@/types";
import { verifyDiscordRequest } from "@/verify";
import { handleWebQuery } from "@/web";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function refreshArtifacts(sql: SqlStorage): Promise<number> {
	const artifacts = await scrapeArtifacts();
	for (const a of artifacts) upsertArtifact(sql, a);
	return artifacts.length;
}

async function refreshArtisanGoods(sql: SqlStorage): Promise<number> {
	const items = await scrapeArtisanGoods();
	for (const item of items) upsertArtisanGood(sql, item);
	return items.length;
}

async function refreshBooks(sql: SqlStorage): Promise<number> {
	const books = await scrapeBooks();
	for (const book of books) upsertBook(sql, book);
	return books.length;
}

async function refreshDeconstructorItems(sql: SqlStorage): Promise<number> {
	const items = await scrapeDeconstructorItems();
	for (const item of items) upsertDeconstructorItem(sql, item);
	return items.length;
}

async function refreshCrops(sql: SqlStorage): Promise<number> {
	const crops = await scrapeCrops();
	for (const crop of crops) upsertCrop(sql, crop);
	return crops.length;
}

async function refreshCrystalariumItems(sql: SqlStorage): Promise<number> {
	const items = await scrapeCrystalariumItems();
	for (const item of items) upsertCrystalariumItem(sql, item);
	return items.length;
}

async function refreshFruitTrees(sql: SqlStorage): Promise<number> {
	const trees = await scrapeFruitTrees();
	for (const tree of trees) upsertFruitTree(sql, tree);
	return trees.length;
}

async function refreshFish(sql: SqlStorage): Promise<number> {
	const fishList = await scrapeFish();
	for (const f of fishList) upsertFish(sql, f);
	return fishList.length;
}

async function refreshBundles(sql: SqlStorage): Promise<number> {
	const bundles = await scrapeBundles();
	for (const bundle of bundles) upsertBundle(sql, bundle);
	return bundles.length;
}

async function refreshForageables(sql: SqlStorage): Promise<number> {
	const items = await scrapeForageables();
	for (const item of items) upsertForageable(sql, item);
	return items.length;
}

async function refreshFruits(sql: SqlStorage): Promise<number> {
	const fruits = await scrapeFruits(sql);
	for (const fruit of fruits) upsertFruit(sql, fruit);
	return fruits.length;
}

async function refreshMinerals(sql: SqlStorage): Promise<number> {
	const minerals = await scrapeMinerals();
	for (const m of minerals) upsertMineral(sql, m);
	return minerals.length;
}

async function refreshRings(sql: SqlStorage): Promise<number> {
	const rings = await scrapeRings();
	for (const r of rings) upsertRing(sql, r);
	return rings.length;
}

async function refreshCraftedItems(sql: SqlStorage): Promise<number> {
	const craftedItems = await scrapeCraftedItems();
	for (const item of craftedItems) upsertCraftedItem(sql, item);
	return craftedItems.length;
}

async function refreshMonsters(sql: SqlStorage): Promise<number> {
	const monsters = await scrapeMonsters();
	for (const m of monsters) upsertMonster(sql, m);
	return monsters.length;
}

async function refreshTools(sql: SqlStorage): Promise<number> {
	const tools = await scrapeTools();
	for (const t of tools) upsertTool(sql, t);
	return tools.length;
}

async function refreshWeapons(sql: SqlStorage): Promise<number> {
	const weapons = await scrapeWeapons();
	for (const w of weapons) upsertWeapon(sql, w);
	return weapons.length;
}

async function refreshRecipes(sql: SqlStorage): Promise<number> {
	const recipes = await scrapeRecipes();
	for (const r of recipes) upsertRecipe(sql, r);
	return recipes.length;
}

async function refreshFootwear(sql: SqlStorage): Promise<number> {
	const items = await scrapeFootwear();
	for (const item of items) upsertFootwear(sql, item);
	return items.length;
}

async function refreshVillagers(sql: SqlStorage): Promise<number> {
	const villagers = await scrapeVillagers();
	for (const v of villagers) upsertVillager(sql, v);
	return villagers.length;
}

async function refreshAll(sql: SqlStorage): Promise<void> {
	console.log("Wiki refresh starting…");
	try {
		const n = await refreshArtifacts(sql);
		console.log(`Updated ${n} artifacts`);
	} catch (err) {
		console.error("Artifact scrape failed:", err);
	}
	try {
		const n = await refreshCrops(sql);
		console.log(`Updated ${n} crops`);
	} catch (err) {
		console.error("Crop scrape failed:", err);
	}
	try {
		const n = await refreshCrystalariumItems(sql);
		console.log(`Updated ${n} crystalarium item entries`);
	} catch (err) {
		console.error("Crystalarium scrape failed:", err);
	}
	try {
		const n = await refreshForageables(sql);
		console.log(`Updated ${n} forageables`);
	} catch (err) {
		console.error("Forageables scrape failed:", err);
	}
	try {
		const n = await refreshFruitTrees(sql);
		console.log(`Updated ${n} fruit trees`);
	} catch (err) {
		console.error("Fruit tree scrape failed:", err);
	}
	try {
		const n = await refreshVillagers(sql);
		console.log(`Updated ${n} villagers`);
	} catch (err) {
		console.error("Villager scrape failed:", err);
	}
	try {
		const n = await refreshFish(sql);
		console.log(`Updated ${n} fish`);
	} catch (err) {
		console.error("Fish scrape failed:", err);
	}
	try {
		const n = await refreshBundles(sql);
		console.log(`Updated ${n} bundles`);
	} catch (err) {
		console.error("Bundle scrape failed:", err);
	}
	try {
		const n = await refreshFruits(sql);
		console.log(`Updated ${n} fruits`);
	} catch (err) {
		console.error("Fruits scrape failed:", err);
	}
	try {
		const n = await refreshMinerals(sql);
		console.log(`Updated ${n} minerals`);
	} catch (err) {
		console.error("Mineral scrape failed:", err);
	}
	try {
		const n = await refreshCraftedItems(sql);
		console.log(`Updated ${n} crafted items`);
	} catch (err) {
		console.error("Crafted items scrape failed:", err);
	}
	try {
		const n = await refreshMonsters(sql);
		console.log(`Updated ${n} monsters`);
	} catch (err) {
		console.error("Monster scrape failed:", err);
	}
	try {
		const n = await refreshBooks(sql);
		console.log(`Updated ${n} books`);
	} catch (err) {
		console.error("Book scrape failed:", err);
	}
	try {
		const n = await refreshWeapons(sql);
		console.log(`Updated ${n} weapons`);
	} catch (err) {
		console.error("Weapon scrape failed:", err);
	}
	try {
		const n = await refreshRecipes(sql);
		console.log(`Updated ${n} recipes`);
	} catch (err) {
		console.error("Recipe scrape failed:", err);
	}
	try {
		const n = await refreshFootwear(sql);
		console.log(`Updated ${n} footwear items`);
	} catch (err) {
		console.error("Footwear scrape failed:", err);
	}
	try {
		const n = await refreshRings(sql);
		console.log(`Updated ${n} rings`);
	} catch (err) {
		console.error("Ring scrape failed:", err);
	}
	try {
		const n = await refreshTools(sql);
		console.log(`Updated ${n} tools`);
	} catch (err) {
		console.error("Tools scrape failed:", err);
	}
	try {
		const n = await refreshArtisanGoods(sql);
		console.log(`Updated ${n} artisan goods`);
	} catch (err) {
		console.error("Artisan goods scrape failed:", err);
	}
	try {
		const n = await refreshDeconstructorItems(sql);
		console.log(`Updated ${n} deconstructor items`);
	} catch (err) {
		console.error("Deconstructor items scrape failed:", err);
	}
	console.log("Wiki refresh complete");
}

// ── Web query data-seeding ────────────────────────────────────────────────────

async function ensureWebData(command: string, sql: SqlStorage): Promise<void> {
	switch (command) {
		case Command.ARTIFACT:
			if (countArtifacts(sql) === 0) await refreshArtifacts(sql);
			break;
		case Command.ARTISAN:
			if (countArtisanGoods(sql) === 0) await refreshArtisanGoods(sql);
			break;
		case Command.BOOK:
			if (countBooks(sql) === 0) await refreshBooks(sql);
			break;
		case Command.BUNDLE:
			if (countBundles(sql) === 0) await refreshBundles(sql);
			break;
		case Command.CRAFT:
		case Command.INGREDIENT:
			if (countCraftedItems(sql) === 0) await refreshCraftedItems(sql);
			break;
		case Command.DECONSTRUCT:
			if (countDeconstructorItems(sql) === 0)
				await refreshDeconstructorItems(sql);
			break;
		case Command.CROP:
		case Command.SEASON:
			if (countCrops(sql) === 0) await refreshCrops(sql);
			break;
		case Command.CRYSTALARIUM:
			if (countCrystalariumItems(sql) === 0)
				await refreshCrystalariumItems(sql);
			break;
		case Command.FISH:
			if (countFish(sql) === 0) await refreshFish(sql);
			break;
		case Command.FOOTWEAR:
			if (countFootwear(sql) === 0) await refreshFootwear(sql);
			break;
		case Command.FORAGE:
			if (countForageables(sql) === 0) await refreshForageables(sql);
			break;
		case Command.FRUIT:
			if (countFruits(sql) === 0) await refreshFruits(sql);
			break;
		case Command.FRUIT_TREE:
			if (countFruitTrees(sql) === 0) await refreshFruitTrees(sql);
			break;
		case Command.GIFT:
		case Command.SCHEDULE:
			if (countVillagers(sql) === 0) await refreshVillagers(sql);
			break;
		case Command.MINERAL:
			if (countMinerals(sql) === 0) await refreshMinerals(sql);
			break;
		case Command.MONSTER:
			if (countMonsters(sql) === 0) await refreshMonsters(sql);
			break;
		case Command.RECIPE:
			if (countRecipes(sql) === 0) await refreshRecipes(sql);
			break;
		case Command.WEAPON:
			if (countWeapons(sql) === 0) await refreshWeapons(sql);
			break;
		case Command.RING:
			if (countRings(sql) === 0) await refreshRings(sql);
			break;
		case Command.TOOL:
			if (countTools(sql) === 0) await refreshTools(sql);
			break;
	}
}

// ── Durable Object ────────────────────────────────────────────────────────────

export class StardewDO implements DurableObject {
	private sql: SqlStorage;

	constructor(
		private state: DurableObjectState,
		_env: Env,
	) {
		this.sql = state.storage.sql;

		// Create tables on first boot (safe to call repeatedly — IF NOT EXISTS)
		initDb(this.sql);

		// Seed the DB if this is a brand-new instance
		state.blockConcurrencyWhile(async () => {
			if (
				countCrops(this.sql) === 0 &&
				countVillagers(this.sql) === 0 &&
				countFruitTrees(this.sql) === 0 &&
				countBundles(this.sql) === 0
			) {
				await refreshAll(this.sql);
			} else if (countFish(this.sql) === 0) {
				// Fish table was added in a later deploy — populate without full refresh
				await refreshFish(this.sql);
			} else if (countForageables(this.sql) === 0) {
				// Forageables table was added in a later deploy — populate without full refresh
				await refreshForageables(this.sql);
			} else if (countMinerals(this.sql) === 0) {
				// Minerals table was added in a later deploy — populate without full refresh
				await refreshMinerals(this.sql);
			} else if (countCraftedItems(this.sql) === 0) {
				// Crafted items table was added in a later deploy — populate without full refresh
				await refreshCraftedItems(this.sql);
			} else if (countMonsters(this.sql) === 0) {
				// Monsters table was added in a later deploy — populate without full refresh
				await refreshMonsters(this.sql);
			} else if (countBooks(this.sql) === 0) {
				// Books table was added in a later deploy — populate without full refresh
				await refreshBooks(this.sql);
			} else if (countWeapons(this.sql) === 0) {
				// Weapons table was added in a later deploy — populate without full refresh
				await refreshWeapons(this.sql);
			} else if (countRecipes(this.sql) === 0) {
				// Recipes table was added in a later deploy — populate without full refresh
				await refreshRecipes(this.sql);
			} else if (countFootwear(this.sql) === 0) {
				// Footwear table was added in a later deploy — populate without full refresh
				await refreshFootwear(this.sql);
			} else if (countRings(this.sql) === 0) {
				// Rings table was added in a later deploy — populate without full refresh
				await refreshRings(this.sql);
			} else if (countArtisanGoods(this.sql) === 0) {
				// Artisan goods table was added in a later deploy — populate without full refresh
				await refreshArtisanGoods(this.sql);
			} else if (countFruits(this.sql) === 0) {
				// Fruits table was added in a later deploy — populate without full refresh
				await refreshFruits(this.sql);
			} else if (countDeconstructorItems(this.sql) === 0) {
				// Deconstructor items table was added in a later deploy — populate without full refresh
				await refreshDeconstructorItems(this.sql);
			} else if (countTools(this.sql) === 0) {
				// Tools table was added in a later deploy — populate without full refresh
				await refreshTools(this.sql);
			} else if (countArtifacts(this.sql) === 0) {
				// Artifacts table was added in a later deploy — populate without full refresh
				await refreshArtifacts(this.sql);
			} else if (countCrystalariumItems(this.sql) === 0) {
				// Crystalarium items table was added in a later deploy — populate without full refresh
				await refreshCrystalariumItems(this.sql);
			}
		});
	}

	// Receives forwarded requests from the thin Worker
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/internal/bundles" && request.method === "GET") {
			const rows = this.sql
				.exec(
					"SELECT id, name, room, items, items_required, reward, image_url, wiki_url FROM bundles ORDER BY id",
				)
				.toArray();
			return Response.json(rows);
		}

		if (url.pathname === "/internal/artifacts" && request.method === "GET") {
			const rows = this.sql
				.exec(
					"SELECT id, name, description, location, image_url, wiki_url FROM artifacts ORDER BY name",
				)
				.toArray();
			return Response.json(rows);
		}

		if (url.pathname === "/internal/minerals" && request.method === "GET") {
			const rows = this.sql
				.exec(
					"SELECT id, name, category, description, source, image_url, wiki_url FROM minerals ORDER BY category, name",
				)
				.toArray();
			return Response.json(rows);
		}

		if (url.pathname === "/admin/refresh" && request.method === "POST") {
			this.state.waitUntil(refreshAll(this.sql));
			return Response.json({ ok: true });
		}

		if (request.method === "GET" && url.pathname === "/api/query") {
			const input = url.searchParams.get("input") ?? "";
			return handleWebQuery(input, this.sql, ensureWebData);
		}

		const body = await request.text();
		const interaction = JSON.parse(body) as Record<string, unknown>;
		const type = interaction.type as number;

		if (type === InteractionType.PING) {
			return Response.json({ type: InteractionResponseType.PONG });
		}

		if (type === InteractionType.APPLICATION_COMMAND) {
			const commandName = (interaction.data as Record<string, unknown>)
				?.name as string;

			if (commandName === Command.ARTIFACT) {
				if (countArtifacts(this.sql) === 0) await refreshArtifacts(this.sql);
				return handleArtifact(interaction, this.sql);
			}
			if (commandName === Command.ARTISAN) {
				if (countArtisanGoods(this.sql) === 0)
					await refreshArtisanGoods(this.sql);
				return handleArtisan(interaction, this.sql);
			}
			if (commandName === Command.BOOK) {
				if (countBooks(this.sql) === 0) await refreshBooks(this.sql);
				return handleBook(interaction, this.sql);
			}
			if (commandName === Command.BUNDLE) {
				if (countBundles(this.sql) === 0) await refreshBundles(this.sql);
				return handleBundle(interaction, this.sql);
			}
			if (commandName === Command.CRAFT) {
				if (countCraftedItems(this.sql) === 0)
					await refreshCraftedItems(this.sql);
				return handleCraft(interaction, this.sql);
			}
			if (commandName === Command.CRYSTALARIUM) {
				if (countCrystalariumItems(this.sql) === 0)
					await refreshCrystalariumItems(this.sql);
				return handleCrystalarium(interaction, this.sql);
			}
			if (commandName === Command.DECONSTRUCT) {
				if (countDeconstructorItems(this.sql) === 0)
					await refreshDeconstructorItems(this.sql);
				return handleDeconstruct(interaction, this.sql);
			}
			if (commandName === Command.CROP) {
				if (countCrops(this.sql) === 0) await refreshCrops(this.sql);
				return handleCrop(interaction, this.sql);
			}
			if (commandName === Command.FISH) {
				if (countFish(this.sql) === 0) await refreshFish(this.sql);
				return handleFish(interaction, this.sql);
			}
			if (commandName === Command.FORAGE) {
				if (countForageables(this.sql) === 0)
					await refreshForageables(this.sql);
				return handleForage(interaction, this.sql);
			}
			if (commandName === Command.FRUIT) {
				if (countFruits(this.sql) === 0) await refreshFruits(this.sql);
				return handleFruit(interaction, this.sql);
			}
			if (commandName === Command.FRUIT_TREE) {
				if (countFruitTrees(this.sql) === 0) await refreshFruitTrees(this.sql);
				return handleFruitTree(interaction, this.sql);
			}
			if (commandName === Command.GIFT) {
				if (countVillagers(this.sql) === 0) await refreshVillagers(this.sql);
				return handleGift(interaction, this.sql);
			}
			if (commandName === Command.INGREDIENT) {
				if (countCraftedItems(this.sql) === 0)
					await refreshCraftedItems(this.sql);
				return handleIngredient(interaction, this.sql);
			}
			if (commandName === Command.MINERAL) {
				if (countMinerals(this.sql) === 0) await refreshMinerals(this.sql);
				return handleMineral(interaction, this.sql);
			}
			if (commandName === Command.MONSTER) {
				if (countMonsters(this.sql) === 0) await refreshMonsters(this.sql);
				return handleMonster(interaction, this.sql);
			}
			if (commandName === Command.RECIPE) {
				if (countRecipes(this.sql) === 0) await refreshRecipes(this.sql);
				return handleRecipe(interaction, this.sql);
			}
			if (commandName === Command.FOOTWEAR) {
				if (countFootwear(this.sql) === 0) await refreshFootwear(this.sql);
				return handleFootwear(interaction, this.sql);
			}
			if (commandName === Command.TOOL) {
				if (countTools(this.sql) === 0) await refreshTools(this.sql);
				return handleTool(interaction, this.sql);
			}
			if (commandName === Command.WEAPON) {
				if (countWeapons(this.sql) === 0) await refreshWeapons(this.sql);
				return handleWeapon(interaction, this.sql);
			}
			if (commandName === Command.RING) {
				if (countRings(this.sql) === 0) await refreshRings(this.sql);
				return handleRing(interaction, this.sql);
			}
			if (commandName === Command.SCHEDULE) {
				if (countVillagers(this.sql) === 0) await refreshVillagers(this.sql);
				return handleSchedule(interaction, this.sql);
			}
			if (commandName === Command.SEASON) {
				if (countCrops(this.sql) === 0) await refreshCrops(this.sql);
				return handleSeason(interaction, this.sql);
			}

			if (commandName === Command.INFO) {
				const s = getStatus(this.sql);
				// const fmt = (ts: string | null) => (ts ? formatDate(ts) : "never");
				const lastUpdatedMs = Math.max(
					s.artifactsLastUpdated
						? new Date(s.artifactsLastUpdated).getTime()
						: 0,
					s.artisanGoodsLastUpdated
						? new Date(s.artisanGoodsLastUpdated).getTime()
						: 0,
					s.bundlesLastUpdated ? new Date(s.bundlesLastUpdated).getTime() : 0,
					s.craftedItemsLastUpdated
						? new Date(s.craftedItemsLastUpdated).getTime()
						: 0,
					s.cropsLastUpdated ? new Date(s.cropsLastUpdated).getTime() : 0,
					s.crystalariumItemsLastUpdated
						? new Date(s.crystalariumItemsLastUpdated).getTime()
						: 0,
					s.fishLastUpdated ? new Date(s.fishLastUpdated).getTime() : 0,
					s.forageablesLastUpdated
						? new Date(s.forageablesLastUpdated).getTime()
						: 0,
					s.fruitsLastUpdated ? new Date(s.fruitsLastUpdated).getTime() : 0,
					s.fruitTreesLastUpdated
						? new Date(s.fruitTreesLastUpdated).getTime()
						: 0,
					s.mineralsLastUpdated ? new Date(s.mineralsLastUpdated).getTime() : 0,
					s.monstersLastUpdated ? new Date(s.monstersLastUpdated).getTime() : 0,
					s.villagersLastUpdated
						? new Date(s.villagersLastUpdated).getTime()
						: 0,
					s.weaponsLastUpdated ? new Date(s.weaponsLastUpdated).getTime() : 0,
					s.recipesLastUpdated ? new Date(s.recipesLastUpdated).getTime() : 0,
					s.footwearLastUpdated ? new Date(s.footwearLastUpdated).getTime() : 0,
					s.booksLastUpdated ? new Date(s.booksLastUpdated).getTime() : 0,
					s.ringsLastUpdated ? new Date(s.ringsLastUpdated).getTime() : 0,
					s.deconstructorItemsLastUpdated
						? new Date(s.deconstructorItemsLastUpdated).getTime()
						: 0,
					s.toolsLastUpdated ? new Date(s.toolsLastUpdated).getTime() : 0,
				);
				const lastUpdated = lastUpdatedMs
					? formatDate(new Date(lastUpdatedMs).toISOString())
					: "never";
				return Response.json({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						embeds: [
							{
								title: "The Farm Computer — Status",
								color: 0x5b8a3c,
								fields: [
									{
										name: `Artisan Goods: ${s.artisanGoodCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Artifacts: ${s.artifactCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Books: ${s.bookCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Bundles: ${s.bundleCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Crafted Items: ${s.craftedItemCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Crops: ${s.cropCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Crystalarium Items: ${s.crystalariumItemCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Deconstructed Items: ${s.deconstructorItemCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Fish: ${s.fishCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Footwear: ${s.footwearCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Forageables: ${s.forageableCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Fruit Trees: ${s.fruitTreeCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Fruits: ${s.fruitCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Minerals: ${s.mineralCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Monsters: ${s.monsterCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Recipes: ${s.recipeCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Rings: ${s.ringCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Tools: ${s.toolCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Villagers: ${s.villagerCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Weapons: ${s.weaponCount}`,
										value: "",
										inline: false,
									},
								],
								footer: {
									text: `Last updated: ${lastUpdated}\nWiki data refreshes on the 1st of every month at 8 AM UTC`,
								},
							},
						],
					},
				});
			}
		}

		return new Response("Unknown interaction", { status: 400 });
	}
}

// ── Thin Worker (verifies signature, routes to DO) ────────────────────────────

import { routeUserApiRequest } from "@/router";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// User account system routes (auth, farms, invitations, bundle tracking)
		const userResponse = await routeUserApiRequest(
			request,
			env,
			url.pathname,
			request.method,
		);
		if (userResponse) return userResponse;

		if (url.pathname === "/admin/refresh" && request.method === "POST") {
			const auth = request.headers.get("Authorization");
			if (auth !== `Bearer ${env.BOT_OWNER_TOKEN}`) {
				return new Response("Unauthorized", { status: 401 });
			}
			const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
			return stub.fetch(
				new Request(request.url, { method: "POST", headers: request.headers }),
			);
		}

		if (request.method === "GET" && url.pathname.startsWith("/api/")) {
			const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
			return stub.fetch(request);
		}

		if (request.method === "GET") {
			const assetResponse = await env.ASSETS.fetch(request);
			if (assetResponse.status === 404) {
				return env.ASSETS.fetch(
					new Request(new URL("/", request.url).toString(), request),
				);
			}
			return assetResponse;
		}

		if (request.method !== "POST") {
			return new Response("Method Not Allowed", { status: 405 });
		}

		const body = await request.text();
		const signature = request.headers.get("X-Signature-Ed25519") ?? "";
		const timestamp = request.headers.get("X-Signature-Timestamp") ?? "";

		if (!env.OVERRIDE_DISCORD_AUTH || env.OVERRIDE_DISCORD_AUTH !== "true") {
			const valid = await verifyDiscordRequest(
				env.DISCORD_PUBLIC_KEY,
				signature,
				timestamp,
				body,
			);
			if (!valid) return new Response("Unauthorized", { status: 401 });
		}

		const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
		return stub.fetch(new Request(request.url, { method: "POST", body }));
	},

	async scheduled(
		_controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
		ctx.waitUntil(
			stub.fetch(
				new Request("https://internal/admin/refresh", {
					method: "POST",
					headers: { Authorization: `Bearer ${env.BOT_OWNER_TOKEN}` },
				}),
			),
		);
	},
} satisfies ExportedHandler<Env>;

import { handleBook } from "./commands/book";
import { handleBundle } from "./commands/bundle";
import { handleCraft } from "./commands/craft";
import { handleCrop } from "./commands/crop";
import { handleFish } from "./commands/fish";
import { handleFootwear } from "./commands/footwear";
import { handleForage } from "./commands/forage";
import { handleFruitTree } from "./commands/fruitTree";
import { handleGift } from "./commands/gift";
import { handleIngredient } from "./commands/ingredient";
import { handleMineral } from "./commands/mineral";
import { handleMonster } from "./commands/monster";
import { handleSchedule } from "./commands/schedule";
import { handleSeason } from "./commands/season";
import { handleWeapon } from "./commands/weapon";
import { formatDate } from "./constants";
import {
	countBooks,
	countBundles,
	countCraftedItems,
	countCrops,
	countFish,
	countFootwear,
	countForageables,
	countFruitTrees,
	countMinerals,
	countMonsters,
	countVillagers,
	countWeapons,
	getStatus,
	initDb,
	upsertBook,
	upsertBundle,
	upsertCraftedItem,
	upsertCrop,
	upsertFish,
	upsertFootwear,
	upsertForageable,
	upsertFruitTree,
	upsertMineral,
	upsertMonster,
	upsertVillager,
	upsertWeapon,
	villagersNeedScheduleRefresh,
} from "./db";
import { scrapeBooks } from "./scraper/books";
import { scrapeBundles } from "./scraper/bundles";
import { scrapeCraftedItems } from "./scraper/craftedItems";
import { scrapeCrops } from "./scraper/crops";
import { scrapeFish } from "./scraper/fish";
import { scrapeForageables } from "./scraper/forageables";
import { scrapeFruitTrees } from "./scraper/fruitTrees";
import { scrapeMinerals } from "./scraper/minerals";
import { scrapeMonsters } from "./scraper/monsters";
import { scrapeVillagers } from "./scraper/villagers";
import { scrapeFootwear } from "./scraper/footwear";
import { scrapeWeapons } from "./scraper/weapons";
import { type Env, InteractionResponseType, InteractionType } from "./types";
import { verifyDiscordRequest } from "./verify";
import { handleWebQuery } from "./web";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function refreshBooks(sql: SqlStorage): Promise<number> {
	const books = await scrapeBooks();
	for (const book of books) upsertBook(sql, book);
	return books.length;
}

async function refreshCrops(sql: SqlStorage): Promise<number> {
	const crops = await scrapeCrops();
	for (const crop of crops) upsertCrop(sql, crop);
	return crops.length;
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

async function refreshMinerals(sql: SqlStorage): Promise<number> {
	const minerals = await scrapeMinerals();
	for (const m of minerals) upsertMineral(sql, m);
	return minerals.length;
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

async function refreshWeapons(sql: SqlStorage): Promise<number> {
	const weapons = await scrapeWeapons();
	for (const w of weapons) upsertWeapon(sql, w);
	return weapons.length;
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
		const n = await refreshCrops(sql);
		console.log(`Updated ${n} crops`);
	} catch (err) {
		console.error("Crop scrape failed:", err);
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
		const n = await refreshForageables(sql);
		console.log(`Updated ${n} forageables`);
	} catch (err) {
		console.error("Forageables scrape failed:", err);
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
		const n = await refreshFootwear(sql);
		console.log(`Updated ${n} footwear items`);
	} catch (err) {
		console.error("Footwear scrape failed:", err);
	}
	console.log("Wiki refresh complete");
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
			} else if (countFootwear(this.sql) === 0) {
				// Footwear table was added in a later deploy — populate without full refresh
				await refreshFootwear(this.sql);
			} else if (villagersNeedScheduleRefresh(this.sql)) {
				// schedule column was added in a later deploy — re-scrape villagers to populate it
				const villagers = await scrapeVillagers();
				for (const v of villagers) upsertVillager(this.sql, v);
				console.log(
					`Re-scraped ${villagers.length} villagers (schedule migration)`,
				);
			}
		});
	}

	// Receives forwarded requests from the thin Worker
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/admin/refresh" && request.method === "POST") {
			this.state.waitUntil(refreshAll(this.sql));
			return Response.json({ ok: true });
		}

		if (request.method === "GET" && url.pathname === "/api/query") {
			const input = url.searchParams.get("input") ?? "";
			return handleWebQuery(input, this.sql);
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

			if (commandName === "book") {
				if (countBooks(this.sql) === 0) await refreshBooks(this.sql);
				return handleBook(interaction, this.sql);
			}
			if (commandName === "bundle") {
				if (countBundles(this.sql) === 0) await refreshBundles(this.sql);
				return handleBundle(interaction, this.sql);
			}
			if (commandName === "craft") {
				if (countCraftedItems(this.sql) === 0)
					await refreshCraftedItems(this.sql);
				return handleCraft(interaction, this.sql);
			}
			if (commandName === "crop") {
				if (countCrops(this.sql) === 0) await refreshCrops(this.sql);
				return handleCrop(interaction, this.sql);
			}
			if (commandName === "fish") {
				if (countFish(this.sql) === 0) await refreshFish(this.sql);
				return handleFish(interaction, this.sql);
			}
			if (commandName === "forage") {
				if (countForageables(this.sql) === 0)
					await refreshForageables(this.sql);
				return handleForage(interaction, this.sql);
			}
			if (commandName === "fruit-tree") {
				if (countFruitTrees(this.sql) === 0) await refreshFruitTrees(this.sql);
				return handleFruitTree(interaction, this.sql);
			}
			if (commandName === "gift") {
				if (countVillagers(this.sql) === 0) await refreshVillagers(this.sql);
				return handleGift(interaction, this.sql);
			}
			if (commandName === "ingredient") {
				if (countCraftedItems(this.sql) === 0)
					await refreshCraftedItems(this.sql);
				return handleIngredient(interaction, this.sql);
			}
			if (commandName === "mineral") {
				if (countMinerals(this.sql) === 0) await refreshMinerals(this.sql);
				return handleMineral(interaction, this.sql);
			}
			if (commandName === "monster") {
				if (countMonsters(this.sql) === 0) await refreshMonsters(this.sql);
				return handleMonster(interaction, this.sql);
			}
			if (commandName === "footwear") {
				if (countFootwear(this.sql) === 0) await refreshFootwear(this.sql);
				return handleFootwear(interaction, this.sql);
			}
			if (commandName === "weapon") {
				if (countWeapons(this.sql) === 0) await refreshWeapons(this.sql);
				return handleWeapon(interaction, this.sql);
			}
			if (commandName === "schedule") {
				if (countVillagers(this.sql) === 0) await refreshVillagers(this.sql);
				return handleSchedule(interaction, this.sql);
			}
			if (commandName === "season") {
				if (countCrops(this.sql) === 0) await refreshCrops(this.sql);
				return handleSeason(interaction, this.sql);
			}

			if (commandName === "info") {
				const s = getStatus(this.sql);
				// const fmt = (ts: string | null) => (ts ? formatDate(ts) : "never");
				const lastUpdatedMs = Math.max(
					s.bundlesLastUpdated ? new Date(s.bundlesLastUpdated).getTime() : 0,
					s.craftedItemsLastUpdated
						? new Date(s.craftedItemsLastUpdated).getTime()
						: 0,
					s.cropsLastUpdated ? new Date(s.cropsLastUpdated).getTime() : 0,
					s.fishLastUpdated ? new Date(s.fishLastUpdated).getTime() : 0,
					s.forageablesLastUpdated
						? new Date(s.forageablesLastUpdated).getTime()
						: 0,
					s.fruitTreesLastUpdated
						? new Date(s.fruitTreesLastUpdated).getTime()
						: 0,
					s.mineralsLastUpdated ? new Date(s.mineralsLastUpdated).getTime() : 0,
					s.monstersLastUpdated ? new Date(s.monstersLastUpdated).getTime() : 0,
					s.villagersLastUpdated
						? new Date(s.villagersLastUpdated).getTime()
						: 0,
					s.weaponsLastUpdated ? new Date(s.weaponsLastUpdated).getTime() : 0,
					s.footwearLastUpdated
						? new Date(s.footwearLastUpdated).getTime()
						: 0,
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
										name: `Crops: ${s.cropCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Fruit Trees: ${s.fruitTreeCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Fish: ${s.fishCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Villagers: ${s.villagerCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Bundles: ${s.bundleCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Forageables: ${s.forageableCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Minerals: ${s.mineralCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Crafted Items: ${s.craftedItemCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Monsters: ${s.monsterCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Weapons: ${s.weaponCount}`,
										value: "",
										inline: false,
									},
									{
										name: `Footwear: ${s.footwearCount}`,
										value: "",
										inline: false,
									},
								],
								footer: {
									text: `Last updated: ${lastUpdated}\nWiki data refreshes every Sunday at 8 AM UTC`,
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

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

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
			return env.ASSETS.fetch(request);
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

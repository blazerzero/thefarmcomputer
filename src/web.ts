import { handleArtifact } from "@/commands/artifact";
import { handleArtisan } from "@/commands/artisan";
import { handleBook } from "@/commands/book";
import { handleBundle } from "@/commands/bundle";
import { handleCraft } from "@/commands/craft";
import { handleCrystalarium } from "@/commands/crystalarium";
import { handleCrop } from "@/commands/crop";
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
import { getStatus } from "@/db";
import { Command } from "@/types";

function splitArgs(input: string): string[] {
	const args: string[] = [];
	const re = /(['"])(.*?)\1|(\S+)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(input)) !== null) {
		args.push(match[2] ?? match[3]!);
	}
	return args;
}

export async function handleWebQuery(
	input: string,
	sql: SqlStorage,
	ensureData: (command: string, sql: SqlStorage) => Promise<void>,
): Promise<Response> {
	const parts = splitArgs(input.trim());
	const command = parts[0]?.toLowerCase() ?? "";
	const args = parts.slice(1);

	await ensureData(command, sql);

	const makeInteraction = (
		options: Array<{ name: string; value: string }>,
	) => ({
		data: { options },
	});

	let handlerResponse: Response;

	switch (command) {
		case Command.ARTIFACT:
			handlerResponse = handleArtifact(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.ARTISAN:
			handlerResponse = handleArtisan(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.BOOK:
			handlerResponse = handleBook(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.CROP:
			handlerResponse = handleCrop(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.FISH:
			handlerResponse = handleFish(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.FOOTWEAR:
			handlerResponse = handleFootwear(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.FRUIT:
			handlerResponse = handleFruit(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.FRUIT_TREE:
			handlerResponse = handleFruitTree(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.FORAGE:
			handlerResponse = handleForage(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.BUNDLE:
			handlerResponse = handleBundle(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.MINERAL:
			handlerResponse = handleMineral(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.MONSTER:
			handlerResponse = handleMonster(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.CRAFT:
			handlerResponse = handleCraft(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.CRYSTALARIUM:
			handlerResponse = handleCrystalarium(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.DECONSTRUCT:
			handlerResponse = handleDeconstruct(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.INGREDIENT:
			handlerResponse = handleIngredient(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.GIFT: {
			const options: Array<{ name: string; value: string }> = [
				{ name: "villager", value: args[0] ?? "" },
			];
			if (args[1]) options.push({ name: "tier", value: args[1] });
			handlerResponse = handleGift(makeInteraction(options), sql);
			break;
		}
		case Command.SCHEDULE: {
			const options: Array<{ name: string; value: string }> = [
				{ name: "villager", value: args[0] ?? "" },
			];
			if (args[1]) options.push({ name: "day", value: args[1] });
			if (args[2]) options.push({ name: "season", value: args[2] });
			handlerResponse = handleSchedule(makeInteraction(options), sql);
			break;
		}
		case Command.SEASON:
			handlerResponse = handleSeason(
				makeInteraction([{ name: "season", value: args[0] ?? "" }]),
				sql,
			);
			break;
		case Command.RECIPE:
			handlerResponse = handleRecipe(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.TOOL:
			handlerResponse = handleTool(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.WEAPON:
			handlerResponse = handleWeapon(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.RING:
			handlerResponse = handleRing(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case Command.INFO: {
			const s = getStatus(sql);
			const lastUpdatedMs = Math.max(
				s.artifactsLastUpdated ? new Date(s.artifactsLastUpdated).getTime() : 0,
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
				s.villagersLastUpdated ? new Date(s.villagersLastUpdated).getTime() : 0,
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
				embed: {
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
						{ name: `Books: ${s.bookCount}`, value: "", inline: false },
						{ name: `Bundles: ${s.bundleCount}`, value: "", inline: false },
						{
							name: `Crafted Items: ${s.craftedItemCount}`,
							value: "",
							inline: false,
						},
						{ name: `Crops: ${s.cropCount}`, value: "", inline: false },
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
						{ name: `Fish: ${s.fishCount}`, value: "", inline: false },
						{ name: `Footwear: ${s.footwearCount}`, value: "", inline: false },
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
						{ name: `Minerals: ${s.mineralCount}`, value: "", inline: false },
						{ name: `Monsters: ${s.monsterCount}`, value: "", inline: false },
						{ name: `Recipes: ${s.recipeCount}`, value: "", inline: false },
						{ name: `Rings: ${s.ringCount}`, value: "", inline: false },
						{ name: `Tools: ${s.toolCount}`, value: "", inline: false },
						{ name: `Villagers: ${s.villagerCount}`, value: "", inline: false },
						{ name: `Weapons: ${s.weaponCount}`, value: "", inline: false },
					],
					footer: {
						text: `Last updated: ${lastUpdated}\nWiki data refreshes on the 1st of every month at 8 AM UTC`,
					},
				},
			});
		}
		default:
			return Response.json({
				error: `Unknown command "${command}". Try: artifact, artisan, book, bundle, craft, crystalarium, crop, deconstruct, fish, footwear, fruit, fruit-tree, forage, gift, ingredient, mineral, monster, recipe, ring, schedule, season, tool, weapon, info`,
			});
	}

	const data = (await handlerResponse.json()) as {
		data?: { embeds?: unknown[]; content?: string };
	};

	const embed = data.data?.embeds?.[0];
	if (embed) return Response.json({ embed });

	const content = data.data?.content;
	if (content) return Response.json({ error: content });

	return Response.json({ error: "No data found." });
}

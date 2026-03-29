import { handleBook } from "./commands/book";
import { handleRecipe } from "./commands/recipe";
import { handleBundle } from "./commands/bundle";
import { handleCraft } from "./commands/craft";
import { handleCrop } from "./commands/crop";
import { handleFish } from "./commands/fish";
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
import { getStatus } from "./db";

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
): Promise<Response> {
	const parts = splitArgs(input.trim());
	const command = parts[0]?.toLowerCase() ?? "";
	const args = parts.slice(1);

	const makeInteraction = (
		options: Array<{ name: string; value: string }>,
	) => ({
		data: { options },
	});

	let handlerResponse: Response;

	switch (command) {
		case "book":
			handlerResponse = handleBook(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "crop":
			handlerResponse = handleCrop(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "fish":
			handlerResponse = handleFish(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "fruit-tree":
			handlerResponse = handleFruitTree(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "forage":
			handlerResponse = handleForage(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "bundle":
			handlerResponse = handleBundle(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "mineral":
			handlerResponse = handleMineral(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "monster":
			handlerResponse = handleMonster(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "craft":
			handlerResponse = handleCraft(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "ingredient":
			handlerResponse = handleIngredient(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "gift": {
			const options: Array<{ name: string; value: string }> = [
				{ name: "villager", value: args[0] ?? "" },
			];
			if (args[1]) options.push({ name: "tier", value: args[1] });
			handlerResponse = handleGift(makeInteraction(options), sql);
			break;
		}
		case "schedule": {
			const options: Array<{ name: string; value: string }> = [
				{ name: "villager", value: args[0] ?? "" },
			];
			if (args[1]) options.push({ name: "day", value: args[1] });
			if (args[2]) options.push({ name: "season", value: args[2] });
			handlerResponse = handleSchedule(makeInteraction(options), sql);
			break;
		}
		case "season":
			handlerResponse = handleSeason(
				makeInteraction([{ name: "season", value: args[0] ?? "" }]),
				sql,
			);
			break;
		case "recipe":
			handlerResponse = handleRecipe(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "weapon":
			handlerResponse = handleWeapon(
				makeInteraction([{ name: "name", value: args.join(" ") }]),
				sql,
			);
			break;
		case "info": {
			const s = getStatus(sql);
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
				s.villagersLastUpdated ? new Date(s.villagersLastUpdated).getTime() : 0,
				s.weaponsLastUpdated ? new Date(s.weaponsLastUpdated).getTime() : 0,
				s.recipesLastUpdated ? new Date(s.recipesLastUpdated).getTime() : 0,
			);
			const lastUpdated = lastUpdatedMs
				? formatDate(new Date(lastUpdatedMs).toISOString())
				: "never";
			return Response.json({
				embed: {
					title: "The Farm Computer — Status",
					color: 0x5b8a3c,
					fields: [
						{ name: `Crops: ${s.cropCount}`, value: "", inline: false },
						{
							name: `Fruit Trees: ${s.fruitTreeCount}`,
							value: "",
							inline: false,
						},
						{ name: `Fish: ${s.fishCount}`, value: "", inline: false },
						{ name: `Villagers: ${s.villagerCount}`, value: "", inline: false },
						{ name: `Bundles: ${s.bundleCount}`, value: "", inline: false },
						{
							name: `Forageables: ${s.forageableCount}`,
							value: "",
							inline: false,
						},
						{ name: `Minerals: ${s.mineralCount}`, value: "", inline: false },
						{
							name: `Crafted Items: ${s.craftedItemCount}`,
							value: "",
							inline: false,
						},
						{ name: `Monsters: ${s.monsterCount}`, value: "", inline: false },
						{ name: `Recipes: ${s.recipeCount}`, value: "", inline: false },
						{ name: `Weapons: ${s.weaponCount}`, value: "", inline: false },
					],
					footer: {
						text: `Last updated: ${lastUpdated}\nWiki data refreshes every Sunday at 8 AM UTC`,
					},
				},
			});
		}
		default:
			return Response.json({
				error: `Unknown command "${command}". Try: book, crop, fish, fruit-tree, forage, bundle, mineral, craft, ingredient, gift, monster, recipe, weapon, schedule, season, info`,
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

import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { CraftIngredient, RecipeRow } from "../types";
import { fetchPage, getCol, WIKI_BASE } from "./wiki";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parseNumber(text: string): number | null {
	const m = text.match(/-?\d+(\.\d+)?/);
	return m ? parseFloat(m[0]!) : null;
}

/**
 * Parse an ingredients cell into a structured list.
 * Each ingredient span contains text like "Egg (1)" or "Oil (1)".
 */
function parseIngredients(cell: HTMLElement): CraftIngredient[] {
	const ingredients: CraftIngredient[] = [];
	const spans = cell.querySelectorAll(":scope > span") as unknown as HTMLElement[];

	for (const span of spans) {
		const text = span.text.trim().replace(/\s+/g, " ");
		if (!text) continue;
		const m = text.match(/^(.+)\s+\((\d+)\)$/);
		if (m) {
			ingredients.push({ name: m[1]!.trim(), quantity: parseInt(m[2]!, 10) });
		} else {
			ingredients.push({ name: text, quantity: 1 });
		}
	}

	return ingredients;
}

/**
 * Build a column index map from a header row, accounting for colspan.
 */
function buildColIdx(headerRow: HTMLElement): Record<string, number> {
	const colIdx: Record<string, number> = {};
	let colI = 0;

	const cells = headerRow.querySelectorAll(
		":scope > th",
	) as unknown as HTMLElement[];
	for (const th of cells) {
		const text = th.text.toLowerCase().trim().replace(/\s+/g, " ");
		const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);

		if (text === "image") colIdx.image = colI;
		else if (text === "name") colIdx.name = colI;
		else if (text === "description") colIdx.description = colI;
		else if (text === "ingredients") colIdx.ingredients = colI;
		else if (text.includes("restore")) colIdx.restores = colI;
		else if (text.startsWith("buff") && !text.includes("duration"))
			colIdx.buffs = colI;
		else if (text.includes("duration")) colIdx.buff_duration = colI;
		else if (text.includes("recipe source") || text.includes("source"))
			colIdx.recipe_source = colI;
		else if (text.includes("sell") || text.includes("price"))
			colIdx.sell_price = colI;

		colI += colspan;
	}

	return colIdx;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeRecipes(): Promise<
	Omit<RecipeRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Cooking");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	// Find the "Recipes" h2 heading
	const allH2s = content.querySelectorAll(
		"h2",
	) as unknown as HTMLElement[];
	const recipesH2 = allH2s.find(
		(h) =>
			(h.querySelector(".mw-headline")?.text.trim() ?? h.text.trim()) ===
			"Recipes",
	);
	if (!recipesH2) {
		console.error("Could not find 'Recipes' H2 on the Cooking wiki page");
		return [];
	}

	// Walk siblings from the Recipes h2 to find the first wikitable
	let sibling = recipesH2.nextElementSibling as HTMLElement | null;
	let table: HTMLElement | null = null;
	while (sibling) {
		if (
			sibling.tagName === "TABLE" &&
			sibling.classList.contains("wikitable")
		) {
			table = sibling;
			break;
		}
		sibling = sibling.nextElementSibling as HTMLElement | null;
	}

	if (!table) {
		console.error("Could not find recipes wikitable on the Cooking wiki page");
		return [];
	}

	const allRows = table.querySelectorAll(
		":scope > tbody > tr",
	) as unknown as HTMLElement[];
	if (allRows.length < 2) {
		console.error("Recipes table has fewer than 2 rows");
		return [];
	}

	const colIdx = buildColIdx(allRows[0]!);
	if (colIdx.name === undefined) {
		console.error("Could not find 'name' column in recipes table header");
		return [];
	}

	const items: Omit<RecipeRow, "id" | "last_updated">[] = [];
	const seenNameCells = new Set<HTMLElement>();

	for (let i = 1; i < allRows.length; i++) {
		const row = allRows[i]!;
		const cells = row.querySelectorAll(
			":scope > td",
		) as unknown as HTMLElement[];
		if (cells.length === 0) continue;

		// Name + wiki URL
		const nameCell = getCol(colIdx, cells, "name");
		if (!nameCell) continue;
		if (seenNameCells.has(nameCell)) continue;
		seenNameCells.add(nameCell);

		const nameLink = nameCell.querySelector("a") as unknown as HTMLElement | null;
		if (!nameLink) continue;
		const name = nameLink.text.trim();
		if (!name || name.toLowerCase() === "name") continue;

		const href = nameLink.getAttribute("href") ?? "";
		const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

		// Image
		let imageUrl: string | null = null;
		const imageCell = getCol(colIdx, cells, "image");
		if (imageCell) {
			const img = imageCell.querySelector("img") as unknown as HTMLElement | null;
			const src = img?.getAttribute("src") ?? "";
			if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
		}

		// Description
		const description =
			getCol(colIdx, cells, "description")
				?.text.trim()
				.replace(/\s+/g, " ") || null;

		// Ingredients
		const ingredientsCell = getCol(colIdx, cells, "ingredients");
		const ingredients: CraftIngredient[] = ingredientsCell
			? parseIngredients(ingredientsCell)
			: [];

		// Restores (energy + health)
		const restoresCell = getCol(colIdx, cells, "restores");
		const restoresText = restoresCell?.text ?? "";
		const energy = parseNumber(restoresText.split(/[\n/]/)[0] ?? "");
		const health = parseNumber(restoresText.split(/[\n/]/)[1] ?? "");

		// Buffs
		const buffsCell = getCol(colIdx, cells, "buffs");
		const buffs = buffsCell?.text.trim().replace(/\s+/g, " ") || null;

		// Buff duration
		const buffDurationCell = getCol(colIdx, cells, "buff_duration");
		const buffDuration =
			buffDurationCell?.text.trim().replace(/\s+/g, " ") || null;

		// Recipe source
		const recipeSourceCell = getCol(colIdx, cells, "recipe_source");
		const recipeSource =
			recipeSourceCell?.text.trim().replace(/\s+/g, " ") || null;

		// Sell price
		const sellPriceCell = getCol(colIdx, cells, "sell_price");
		const sellPrice = sellPriceCell ? parseNumber(sellPriceCell.text) : null;

		items.push({
			name,
			description,
			ingredients: JSON.stringify(ingredients),
			energy,
			health,
			buffs,
			buff_duration: buffDuration,
			recipe_source: recipeSource,
			sell_price: sellPrice,
			image_url: imageUrl,
			wiki_url: wikiUrl,
		});
	}

	console.log(`Scraped ${items.length} recipes`);
	return items;
}

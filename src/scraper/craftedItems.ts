import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { CraftedItemRow, CraftIngredient } from "../types";
import { fetchPage, getCol } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parseNumber(text: string): number | null {
	const m = text.match(/-?\d+(\.\d+)?/);
	return m ? parseFloat(m[0]!) : null;
}

/**
 * Parse an ingredients cell into a structured list.
 * The cell typically contains items like "50 Wood" separated by <br> tags or newlines,
 * sometimes with images before each item name.
 * Each entry starts with an optional quantity number followed by the ingredient name.
 */
function parseIngredients(cell: HTMLElement): CraftIngredient[] {
	const ingredients: CraftIngredient[] = [];

	// Collect text segments by splitting on <br> boundaries
	const segments: string[] = [];

	const ingredientElements = cell.querySelectorAll(":scope > span");

	for (const node of ingredientElements) {
		const text = node.text.trim();
		if (text) segments.push(text);
	}

	for (const seg of segments) {
		const clean = seg.replace(/\s+/g, " ").trim();
		if (!clean) continue;

		// Match leading number (quantity) followed by the rest as name
		// e.g. "50 Wood", "1 Iron Bar", "Battery Pack" (no quantity → 1)
		const m = clean.match(/^(.+)\s+\((\d+)\)$/);
		if (m) {
			ingredients.push({ name: m[1]!.trim(), quantity: parseInt(m[2]!, 10) });
		} else if (clean.length > 0) {
			ingredients.push({ name: clean, quantity: 1 });
		}
	}

	return ingredients;
}

/**
 * Build a column index map from a header row, accounting for colspan.
 * Returns a map of logical column name → physical cell index.
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
		else if (text === "duration") {
			// Duration spans 2 columns: Days and Seasons
			colIdx.duration_days = colI;
			colIdx.duration_seasons = colI + 1;
		} else if (text === "days") colIdx.duration_days = colI;
		else if (text === "seasons") colIdx.duration_seasons = colI;
		else if (text === "radius") colIdx.radius = colI;
		else if (text === "ingredients") colIdx.ingredients = colI;
		else if (text === "energy") colIdx.energy = colI;
		else if (text === "health") colIdx.health = colI;
		else if (text.includes("recipe source")) colIdx.recipe_source = colI;

		colI += colspan;
	}

	return colIdx;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeCraftedItems(): Promise<
	Omit<CraftedItemRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Crafting");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const items: Omit<CraftedItemRow, "id" | "last_updated">[] = [];
	const STOP_HEADINGS = new Set([
		"History",
		"References",
		"See also",
		"Navigation",
		"Notes",
	]);

	const elements = content.querySelectorAll(
		"h2, table.wikitable",
	) as unknown as HTMLElement[];

	for (const el of elements) {
		if (el.tagName === "H2") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			if (STOP_HEADINGS.has(text)) break;
			continue;
		}

		const allRows = el.querySelectorAll(
			":scope > tbody > tr",
		) as unknown as HTMLElement[];
		if (allRows.length < 2) continue;

		// Build column index from the first header row; if the table has a second header
		// row (e.g. sub-headers for Days/Seasons), merge those in too.
		let colIdx: Record<string, number> = {};
		let dataStartRow = 1;

		const firstRow = allRows[0]!;
		const firstRowHasTh =
			(firstRow.querySelectorAll(":scope > th") as unknown as HTMLElement[])
				.length > 0;
		if (!firstRowHasTh) continue;

		colIdx = buildColIdx(firstRow);

		// Check if second row is also a header row (sub-headers like "Days" / "Seasons")
		if (allRows.length > 2) {
			const secondRow = allRows[1]!;
			const secondRowTh = secondRow.querySelectorAll(
				":scope > th",
			) as unknown as HTMLElement[];
			if (secondRowTh.length > 0) {
				dataStartRow = 2;
			}
		}

		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = dataStartRow; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(
				":scope > td",
			) as unknown as HTMLElement[];
			if (cells.length === 0) continue;

			// Name
			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			const nameLink = nameCell.querySelector(
				"a",
			) as unknown as HTMLElement | null;
			if (!nameLink) continue;

			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const name = nameLink.text.trim();
			if (!name || name.toLowerCase() === "name") continue;

			const href = nameLink.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			// Image
			let imageUrl: string | null = null;
			const imageCell = getCol(colIdx, cells, "image");
			if (imageCell) {
				const img = imageCell.querySelector(
					"img",
				) as unknown as HTMLElement | null;
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			// Description
			const description =
				getCol(colIdx, cells, "description")
					?.text.trim()
					.replace(/\s+/g, " ") || null;

			// Duration (Days)
			const daysCell = getCol(colIdx, cells, "duration_days");
			const durationDays = daysCell ? parseNumber(daysCell.text) : null;

			// Duration (Seasons)
			const seasonsCell = getCol(colIdx, cells, "duration_seasons");
			const durationSeasons = seasonsCell
				? seasonsCell.text.trim().replace(/\s+/g, " ") || null
				: null;

			// Radius
			const radiusCell = getCol(colIdx, cells, "radius");
			const radius = radiusCell ? parseNumber(radiusCell.text) : null;

			// Ingredients
			const ingredientsCell = getCol(colIdx, cells, "ingredients");
			const ingredients: CraftIngredient[] = ingredientsCell
				? parseIngredients(ingredientsCell)
				: [];

			// Energy
			const energyCell = getCol(colIdx, cells, "energy");
			const energy = energyCell ? parseNumber(energyCell.text) : null;

			// Health
			const healthCell = getCol(colIdx, cells, "health");
			const health = healthCell ? parseNumber(healthCell.text) : null;

			// Recipe source
			const recipeSourceCell = getCol(colIdx, cells, "recipe_source");
			const recipeSource = recipeSourceCell
				? recipeSourceCell.text.trim().replace(/\s+/g, " ") || null
				: null;

			items.push({
				name,
				description,
				duration_days: durationDays,
				duration_seasons: durationSeasons,
				radius,
				ingredients: JSON.stringify(ingredients),
				energy,
				health,
				recipe_source: recipeSource,
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${items.length} crafted items`);
	return items;
}

import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { ToolRow } from "@/types";
import { fetchPage, getCol, parseListCell, WIKI_BASE } from "./wiki";

// Map H2/H3 heading text → canonical category name
const CATEGORY_MAP: Record<string, string> = {
	hoes: "Hoe",
	pickaxes: "Pickaxe",
	axes: "Axe",
	watering_cans: "Watering Can",
	fishing_rods: "Fishing Rod",
	"other tools": "Other",
};

// Stop parsing when these headings are reached
const SKIP_HEADINGS = new Set([
	"Enchantments",
	"History",
	"See also",
	"References",
]);

function headingToCategory(text: string): string | null {
	return CATEGORY_MAP[text.toLowerCase().trim()] ?? null;
}

/** Parse a gold price from text like "500g" or "1,500g"; returns null if absent. */
function parseGoldPrice(text: string): string | null {
	const m = text.match(/(\d[\d,]*)\s*g/i);
	return m ? `${m[1]!.replace(/,/g, ",")}g` : null;
}

// ── Main scraper ───────────────────────────────────────────────────────────────

export async function scrapeTools(): Promise<
	Omit<ToolRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Tools");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const tools: Omit<ToolRow, "id" | "last_updated">[] = [];
	let currentCategory: string | null = null;

	const elements = content.querySelectorAll("h2, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		// ── Section heading ────────────────────────────────────────────────────────
		if (tag === "H2") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			if (SKIP_HEADINGS.has(text)) {
				continue;
			}
			const cat = headingToCategory(text);
			if (cat) currentCategory = cat;
			continue;
		}

		// ── Tool data table ────────────────────────────────────────────────────────
		const allRows = el.querySelectorAll(":scope > tbody > tr");
		if (allRows.length < 2) continue;

		// Parse header row to build column index map
		const headerRow = allRows[0]!;
		const headerCells = headerRow.querySelectorAll(":scope > th");
		if (headerCells.length < 2) continue;

		const colIdx: Record<string, number> = {};
		let colI = 0;
		for (const th of headerCells) {
			const text = th.text.toLowerCase().trim();
			const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);

			if (text === "image") {
				colIdx.image = colI;
			} else if (text === "name") {
				colIdx.name = colI;
			} else if (text === "description") {
				colIdx.description = colI;
			} else if (text === "improvements" || text === "improvement") {
				colIdx.improvements = colI;
			} else if (text.includes("ingredients") || text.includes("materials")) {
				colIdx.ingredients = colI;
			} else if (
				text === "location" ||
				text === "source" ||
				text === "obtain" ||
				text === "obtained from" ||
				text === "how to obtain"
			) {
				colIdx.location = colI;
			} else if (text === "requirements" || text === "requirement") {
				colIdx.requirements = colI;
			} else if (
				text.includes("cost") ||
				text.includes("purchase") ||
				text.includes("buy") ||
				text === "price"
			) {
				colIdx.cost = colI;
			}

			colI += colspan;
		}

		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(":scope > td");

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			// Skip rows without a tool name link
			const nameLink = nameCell.querySelector("a");

			// Deduplicate rowspan'd name cells
			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const toolName = nameCell.text.trim();
			if (!toolName || toolName.toLowerCase() === "name") continue;

			const href = nameLink?.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			// Image
			let imageUrl: string | null = null;
			const imageCell = getCol(colIdx, cells, "image");
			if (imageCell) {
				const img = imageCell.querySelector("img");
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			// Description
			const description =
				getCol(colIdx, cells, "description")
					?.text.replace(/\s+/g, " ")
					.trim() || null;

			// Cost (purchase price for rods, etc.)
			const costCell = getCol(colIdx, cells, "cost");
			const cost = costCell
				? costCell.text.replace(/\s+/g, " ").trim() || null
				: null;

			// Ingredients (upgrade materials)
			const ingredientsCell = getCol(colIdx, cells, "ingredients");
			const ingredients = ingredientsCell ? parseListCell(ingredientsCell) : [];

			// Improvements
			const improvementsCell = getCol(colIdx, cells, "improvements");
			const improvements = improvementsCell
				? parseListCell(improvementsCell)
				: [];

			// Location
			const locationCell = getCol(colIdx, cells, "location");
			const location = locationCell ? parseListCell(locationCell) : null;

			// Requirements
			const requirementsCell = getCol(colIdx, cells, "requirements");
			const requirements = requirementsCell
				? parseListCell(requirementsCell)
				: null;

			// Skip if cost looks like just a gold price and we have no ingredients —
			// try to normalise it using parseGoldPrice for cleanliness
			const normalizedCost =
				cost && parseGoldPrice(cost) ? parseGoldPrice(cost) : cost;

			tools.push({
				name: toolName,
				category: currentCategory,
				description,
				cost: normalizedCost,
				ingredients: JSON.stringify(ingredients),
				improvements: JSON.stringify(improvements),
				location: JSON.stringify(location),
				requirements: JSON.stringify(requirements),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${tools.length} tools`);
	return tools;
}

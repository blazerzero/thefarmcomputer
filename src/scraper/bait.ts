import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { BaitRow, CraftIngredient } from "@/types";
import { fetchPage, getCol, parseListCell, WIKI_BASE } from "./wiki";

function parsePurchase(cell: HTMLElement): string | null {
	const text = cell.text.replace(/\s+/g, " ").trim();
	if (!text || text.toLowerCase() === "n/a" || text === "—") return null;

	// Qi Gem purchase (img alt="Qi Gem.png")
	if (cell.querySelector('img[alt="Qi Gem.png"]')) {
		const numMatch = text.match(/(\d+)/);
		return numMatch ? `${numMatch[1]} Qi Gems` : text;
	}

	// Gold purchase — read the .no-wrap span to avoid the hidden data-sort-value span
	// that pollutes cell.text with junk like "data-sort-value="5">".
	const noWrap = cell.querySelector(".no-wrap");
	if (noWrap) return noWrap.text.trim();

	// Fallback for plain-text prices like "0.2 × Fish Price"
	return text;
}

function parseIngredients(cell: HTMLElement): CraftIngredient[] {
	const text = cell.text.trim();
	if (!text || text.toLowerCase() === "n/a" || text === "—") return [];

	const ingredients: CraftIngredient[] = [];
	const spans = cell.querySelectorAll(".nametemplate");

	for (const span of spans) {
		const nameLink = span.querySelector("a");
		if (!nameLink) continue;
		const name = nameLink.text.trim();
		// Quantity is in the span text as "&nbsp;(N)" → " (N)"
		const spanText = span.text;
		const qtyMatch = spanText.match(/\((\d+)\)/);
		const quantity = qtyMatch ? parseInt(qtyMatch[1]!, 10) : 1;
		if (name) ingredients.push({ name, quantity });
	}

	return ingredients;
}

export async function scrapeBait(): Promise<
	Omit<BaitRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Bait");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const table = content.querySelector("table.wikitable");
	if (!table) {
		console.warn("scrapeBait: no wikitable found");
		return [];
	}

	const allRows = table.querySelectorAll(":scope > tbody > tr");
	if (allRows.length < 2) return [];

	// Build column index map from header row
	const headerRow = allRows[0]!;
	const headerCells = headerRow.querySelectorAll(":scope > th");
	const colIdx: Record<string, number> = {};
	let colI = 0;
	for (const th of headerCells) {
		const text = th.text.toLowerCase().trim();
		const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);
		if (text === "image") colIdx.image = colI;
		else if (text === "name") colIdx.name = colI;
		else if (text === "description") colIdx.description = colI;
		else if (text === "notes") colIdx.notes = colI;
		else if (text === "purchase") colIdx.purchase = colI;
		else if (text === "crafting") colIdx.crafting = colI;
		colI += colspan;
	}

	const items: Omit<BaitRow, "id" | "last_updated">[] = [];

	for (let i = 1; i < allRows.length; i++) {
		const row = allRows[i]!;
		const cells = row.querySelectorAll(":scope > td");

		const nameCell = getCol(colIdx, cells, "name");
		if (!nameCell) continue;

		const nameLink = nameCell.querySelector("a");
		if (!nameLink) continue;

		const name = nameLink.text.trim();
		if (!name) continue;

		const href = nameLink.getAttribute("href") ?? "";
		const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

		// Image
		const imageCell = getCol(colIdx, cells, "image");
		let imageUrl: string | null = null;
		if (imageCell) {
			const img = imageCell.querySelector("img");
			const src = img?.getAttribute("src") ?? "";
			if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
		}

		// Description
		const description =
			getCol(colIdx, cells, "description")?.text.trim().replace(/\s+/g, " ") ||
			null;

		// Notes — use parseListCell to preserve bullets and paragraph breaks
		const notesCell = getCol(colIdx, cells, "notes");
		const notesItems = notesCell ? parseListCell(notesCell) : [];
		const notes = notesItems.length > 0 ? JSON.stringify(notesItems) : null;

		// Purchase
		const purchaseCell = getCol(colIdx, cells, "purchase");
		const purchase = purchaseCell ? parsePurchase(purchaseCell) : null;

		// Crafting/Ingredients
		const craftingCell = getCol(colIdx, cells, "crafting");
		const ingredients = craftingCell ? parseIngredients(craftingCell) : [];

		items.push({
			name,
			description,
			notes,
			purchase,
			ingredients: JSON.stringify(ingredients),
			image_url: imageUrl,
			wiki_url: wikiUrl,
		});
	}

	console.log(`Scraped ${items.length} bait items`);
	return items;
}

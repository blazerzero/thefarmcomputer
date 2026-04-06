import { parse } from "node-html-parser";
import type { DeconstructorItemRow } from "@/types";
import { fetchPage, getCol, parseMaterials, WIKI_BASE } from "./wiki";

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeDeconstructorItems(): Promise<
	Omit<DeconstructorItemRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Deconstructor");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const items: Omit<DeconstructorItemRow, "id" | "last_updated">[] = [];

	const tables = content.querySelectorAll("table.wikitable");

	for (const table of tables) {
		const allRows = table.querySelectorAll(":scope > tbody > tr");
		if (allRows.length < 2) continue;

		// Build column index map from header row
		const headerRow = allRows[0]!;
		const headerCells = headerRow.querySelectorAll(":scope > th");
		if (headerCells.length < 3) continue;

		const colIdx: Record<string, number> = {};
		let colI = 0;
		for (const th of headerCells) {
			const text = th.text.toLowerCase().trim();
			const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);
			if (text === "image") colIdx.image = colI;
			else if (text === "name") colIdx.name = colI;
			else if (text.includes("sell")) colIdx.sell_price = colI;
			else if (
				text.includes("received") ||
				text.includes("output") ||
				text.includes("yield") ||
				text.includes("result")
			)
				colIdx.deconstructed_items = colI;
			colI += colspan;
		}

		if (colIdx.name === undefined) continue;

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(":scope > td");

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			const name = nameLink.text.trim();
			if (!name || name.toLowerCase() === "name") continue;

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

			// Sell price
			const sellPriceCell = getCol(colIdx, cells, "sell_price");
			const sellPrice = sellPriceCell
				? sellPriceCell.text.trim().replace(/\s+/g, " ") || null
				: null;

			// Deconstructed items
			const deconstructCell = getCol(colIdx, cells, "deconstructed_items");
			const deconstructedItems = deconstructCell
				? parseMaterials(deconstructCell)
				: [];

			items.push({
				name,
				sell_price: sellPrice,
				deconstructed_items: JSON.stringify(deconstructedItems),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${items.length} deconstructor items`);
	return items;
}

import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { FootwearRow } from "@/types";
import { fetchPage, getCol, parseListCell, WIKI_BASE } from "./wiki";

/** Parse a gold price from text like "500g" or "1,500g"; returns null if absent or N/A. */
function parseGoldPrice(text: string): number | null {
	const m = text.match(/(\d[\d,]*)\s*g/i);
	return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

// ── Main scraper ───────────────────────────────────────────────────────────────

export async function scrapeFootwear(): Promise<
	Omit<FootwearRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Footwear");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const footwear: Omit<FootwearRow, "id" | "last_updated">[] = [];

	const tables = content.querySelectorAll("table.wikitable");

	for (const table of tables) {
		const allRows = table.querySelectorAll(":scope > tbody > tr");
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

			if (text === "image" || text === "img") colIdx.image = colI;
			else if (text === "name") colIdx.name = colI;
			else if (text === "stats" || text.includes("stat")) colIdx.stats = colI;
			else if (text === "description" || text === "desc")
				colIdx.description = colI;
			else if (text.includes("purchase")) colIdx.purchase_price = colI;
			else if (text.includes("sell") || text === "price")
				colIdx.sell_price = colI;
			else if (text === "source" || text.includes("obtain"))
				colIdx.source = colI;

			colI += colspan;
		}

		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(":scope > td");

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			// Skip rows without a name link
			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			// Deduplicate rowspan'd name cells
			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const itemName = nameLink.text.trim();
			if (!itemName || itemName.toLowerCase() === "name") continue;

			const href = nameLink.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			// Image
			let imageUrl: string | null = null;
			const imageCell = getCol(colIdx, cells, "image");
			if (imageCell) {
				const img = imageCell.querySelector("img");
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			// Stats — parse bullet list from the stats cell
			let statsItems: string[] = [];
			const statsCell = getCol(colIdx, cells, "stats");
			if (statsCell) statsItems = parseListCell(statsCell);

			// Description
			const description =
				getCol(colIdx, cells, "description")
					?.text.replace(/\s+/g, " ")
					.trim() || null;

			// Purchase price
			const purchaseText =
				getCol(colIdx, cells, "purchase_price")?.text.trim() ?? "";
			const purchasePrice =
				purchaseText && !/n\/a/i.test(purchaseText)
					? parseGoldPrice(purchaseText)
					: null;

			// Sell price
			const sellText = getCol(colIdx, cells, "sell_price")?.text.trim() ?? "";
			const sellPrice =
				sellText && !/n\/a/i.test(sellText) ? parseGoldPrice(sellText) : null;

			// Source — try <ul><li> items first, fall back to parseListCell
			let sourceItems: string[] = [];
			const sourceCell = getCol(colIdx, cells, "source");
			if (sourceCell) sourceItems = parseListCell(sourceCell);

			footwear.push({
				name: itemName,
				stats: JSON.stringify(statsItems),
				description,
				purchase_price: purchasePrice,
				sell_price: sellPrice,
				source: JSON.stringify(sourceItems),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${footwear.length} footwear items`);
	return footwear;
}

import { parse } from "node-html-parser";
import type { TackleRow } from "@/types";
import { fetchPage, getCol, parseListCell, WIKI_BASE } from "./wiki";

/** Parse a gold price from text like "500g" or "1,500g"; returns null if absent or N/A. */
function parseGoldPrice(text: string): number | null {
	const m = text.match(/(\d[\d,]*)\s*g/i);
	return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

export async function scrapeTackle(): Promise<
	Omit<TackleRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Tackle");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const tackle: Omit<TackleRow, "id" | "last_updated">[] = [];

	const tables = content.querySelectorAll("table.wikitable");

	for (const table of tables) {
		const allRows = table.querySelectorAll(":scope > tbody > tr");
		if (allRows.length < 2) continue;

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
			else if (text === "description" || text === "desc")
				colIdx.description = colI;
			else if (text === "notes") colIdx.notes = colI;
			else if (text.includes("purchase")) colIdx.purchase_price = colI;
			else if (text === "crafting") colIdx.crafting = colI;

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

			const itemName = nameLink.text.trim();
			if (!itemName || itemName.toLowerCase() === "name") continue;

			const href = nameLink.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			let imageUrl: string | null = null;
			const imageCell = getCol(colIdx, cells, "image");
			if (imageCell) {
				const img = imageCell.querySelector("img");
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			const description =
				getCol(colIdx, cells, "description")
					?.text.replace(/\s+/g, " ")
					.trim() || null;

			const notesCell = getCol(colIdx, cells, "notes");
			const notesItems = notesCell ? parseListCell(notesCell) : [];
			const notes = notesItems.length > 0 ? JSON.stringify(notesItems) : null;

			const purchaseText =
				getCol(colIdx, cells, "purchase_price")?.text.trim() ?? "";
			const purchasePrice =
				purchaseText && !/n\/a/i.test(purchaseText)
					? parseGoldPrice(purchaseText)
					: null;

			let craftingItems: string[] = [];
			const craftingCell = getCol(colIdx, cells, "crafting");
			if (craftingCell) craftingItems = parseListCell(craftingCell);

			tackle.push({
				name: itemName,
				description,
				notes,
				purchase_price: purchasePrice,
				crafting:
					craftingItems.length > 0 ? JSON.stringify(craftingItems) : null,
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${tackle.length} tackle items`);
	return tackle;
}

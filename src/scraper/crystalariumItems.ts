import { parse } from "node-html-parser";
import type { CrystalariumRow } from "@/types";
import { fetchPage, getCol, parsePriceTiers, WIKI_BASE } from "./wiki";

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeCrystalariumItems(): Promise<
	Omit<CrystalariumRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Crystalarium");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const crystalariumItems: Omit<CrystalariumRow, "id" | "last_updated">[] = [];

	const table = content.querySelector("table.wikitable");
	if (!table) {
		console.warn("No wikitable found on Crystalarium page");
		return crystalariumItems;
	}

	const allRows = table.querySelectorAll(":scope > tbody > tr");
	if (allRows.length < 2) return crystalariumItems;

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
		else if (text.includes("sell")) colIdx.sell_price = colI;
		else if (text.includes("time")) colIdx.processing_time = colI;
		else if (text.includes("g") && text.includes("day"))
			colIdx.gold_per_day = colI;
		colI += colspan;
	}

	if (colIdx.name === undefined) {
		console.warn("Could not find 'name' column in Crystalarium table");
		return crystalariumItems;
	}

	for (let i = 1; i < allRows.length; i++) {
		const row = allRows[i]!;
		const cells = row.querySelectorAll(":scope > td");

		const nameCell = getCol(colIdx, cells, "name");
		if (!nameCell) continue;

		const nameLink = nameCell.querySelector("a");
		if (!nameLink) continue;

		const mineralName = nameLink.text.trim();
		if (!mineralName || mineralName.toLowerCase() === "name") continue;

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

		// Sell price — parsePriceTiers ignores "g/day" style values, safe to use
		const sellPriceCell = getCol(colIdx, cells, "sell_price");
		const sellPrice = sellPriceCell
			? (parsePriceTiers(sellPriceCell.text)[0] ?? null)
			: null;

		// Processing time — store as human-readable text
		const timeCell = getCol(colIdx, cells, "processing_time");
		const processingTime = timeCell
			? timeCell.text.trim().replace(/\s+/g, " ") || null
			: null;

		// Gold per day — parse first decimal number from cell text
		const goldCell = getCol(colIdx, cells, "gold_per_day");
		let goldPerDay: number | null = null;
		if (goldCell) {
			const m = goldCell.text.replace(/,/g, "").match(/[\d.]+/);
			if (m) goldPerDay = parseFloat(m[0]!);
		}

		crystalariumItems.push({
			name: mineralName,
			sell_price: sellPrice,
			processing_time: processingTime,
			gold_per_day: goldPerDay,
			image_url: imageUrl,
			wiki_url: wikiUrl,
		});
	}

	console.log(`Scraped ${crystalariumItems.length} crystalarium item entries`);
	return crystalariumItems;
}

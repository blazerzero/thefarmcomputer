import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { MineralRow } from "@/types";
import {
	fetchPage,
	getCol,
	parseListCell,
	parsePriceTiers,
	WIKI_BASE,
} from "./wiki";

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeMinerals(): Promise<
	Omit<MineralRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Minerals");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const minerals: Omit<MineralRow, "id" | "last_updated">[] = [];

	// Stop scraping when we hit these non-data H2 headings
	const STOP_HEADINGS = new Set([
		"History",
		"References",
		"See also",
		"Navigation",
		"Notes",
	]);

	// Singularize common plural section names for cleaner category labels
	const CATEGORY_NAMES: Record<string, string> = {
		"Foraged Minerals": "Foraged Mineral",
		Gems: "Gem",
		Geodes: "Geode",
	};

	let currentCategory: string | null = null;

	const elements = content.querySelectorAll("h2, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		// ── Section heading ───────────────────────────────────────────────────────
		if (tag === "H2") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			if (STOP_HEADINGS.has(text)) break;
			// Use the mapped name if available, otherwise use the heading text as-is
			currentCategory = CATEGORY_NAMES[text] ?? text;
			continue;
		}

		// ── Mineral data table ────────────────────────────────────────────────────
		if (!currentCategory) continue;

		const allRows = el.querySelectorAll(":scope > tbody > tr");
		if (allRows.length < 2) continue;

		// Parse header row to build column index map
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
			else if (text === "description") colIdx.description = colI;
			else if (text.includes("sell price") && !text.includes("gemologist"))
				colIdx.sell_price = colI;
			else if (text.includes("gemologist")) colIdx.sell_price_gemologist = colI;
			else if (text === "source") colIdx.source = colI;
			else if (text.includes("used in")) colIdx.used_in = colI;
			colI += colspan;
		}

		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(":scope > td");

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

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

			// Description
			const description =
				getCol(colIdx, cells, "description")
					?.text.trim()
					.replace(/\s+/g, " ") || null;

			// Sell price
			const sellPriceCell = getCol(colIdx, cells, "sell_price");
			const sellPrice = sellPriceCell
				? (parsePriceTiers(sellPriceCell.text)[0] ?? null)
				: null;

			// Gemologist sell price (absent for Geodes)
			const gemCell = getCol(colIdx, cells, "sell_price_gemologist");
			const sellPriceGemologist = gemCell
				? (parsePriceTiers(gemCell.text)[0] ?? null)
				: null;

			// Source
			const sourceCell = getCol(colIdx, cells, "source");
			const source = sourceCell ? parseListCell(sourceCell) : [];

			// Used in
			const usedInCell = getCol(colIdx, cells, "used_in");
			const usedIn = usedInCell ? parseListCell(usedInCell) : [];

			minerals.push({
				name: mineralName,
				category: currentCategory,
				description,
				sell_price: sellPrice,
				sell_price_gemologist: sellPriceGemologist,
				source: JSON.stringify(source),
				used_in: JSON.stringify(usedIn),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${minerals.length} minerals`);
	return minerals;
}

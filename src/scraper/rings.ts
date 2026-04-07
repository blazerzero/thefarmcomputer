import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { RingRow } from "@/types";
import {
	fetchPage,
	getCol,
	parseListCell,
	parsePriceTiers,
	WIKI_BASE,
} from "./wiki";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parseEffects(cell: HTMLElement): string | null {
	const text = cell.text.replace(/\s+/g, " ").trim();
	if (!text || text.toLowerCase() === "n/a" || text === "—") return null;
	return text;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeRings(): Promise<
	Omit<RingRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Rings");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const rings: Omit<RingRow, "id" | "last_updated">[] = [];

	const STOP_HEADINGS = new Set([
		"History",
		"References",
		"See also",
		"Navigation",
		"Notes",
	]);

	const elements = content.querySelectorAll("h2, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		if (tag === "H2") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			if (STOP_HEADINGS.has(text)) break;
			continue;
		}

		// ── Ring data table ───────────────────────────────────────────────────────
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
			else if (text.includes("sell")) colIdx.sell_price = colI;
			else if (
				text === "effects" ||
				text === "effect" ||
				text === "bonus" ||
				text === "buffs"
			)
				colIdx.effects = colI;
			else if (
				text.includes("where") ||
				text.includes("location") ||
				text === "obtained from" ||
				text === "obtain" ||
				text === "source"
			)
				colIdx.where_to_find = colI;
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

			const ringName = nameLink.text.trim();
			if (!ringName || ringName.toLowerCase() === "name") continue;

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

			// Effects
			const effectsCell = getCol(colIdx, cells, "effects");
			const effects = effectsCell ? parseEffects(effectsCell) : null;

			// Where to find
			const whereCell = getCol(colIdx, cells, "where_to_find");
			let whereToFind: string[];
			if (whereCell) {
				whereToFind = parseListCell(whereCell);
				if (whereToFind.length === 0) {
					const raw = whereCell.text.trim();
					whereToFind =
						raw && raw.toLowerCase() !== "n/a" && raw !== "—" ? [raw] : ["N/A"];
				}
			} else {
				whereToFind = ["N/A"];
			}

			rings.push({
				name: ringName,
				description,
				sell_price: sellPrice,
				effects,
				where_to_find: JSON.stringify(whereToFind),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${rings.length} rings`);
	return rings;
}

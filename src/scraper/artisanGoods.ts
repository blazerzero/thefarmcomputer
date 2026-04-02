import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { ArtisanGoodRow } from "@/types";
import { fetchPage, getCol, parseListCell, WIKI_BASE } from "./wiki";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parsePrices(cell: HTMLElement | null): string | null {
	if (!cell) return null;
	if (cell.firstChild?.rawTagName === "table") {
		const firstRow = (cell.firstChild as HTMLElement).querySelector(
			":scope > tbody > tr:first-child",
		);
		return firstRow?.text.trim() || null;
	} else {
		return cell.text.trim() || null;
	}
}

function parseEnergyHealthBuffs(
	cell: HTMLElement,
): [string | null, string | null, string | null] {
	let energy: string = "";
	let health: string = "";
	const buffs: string[] = [];
	if (cell.firstChild?.rawTagName === "table") {
		const firstRowCells = (cell.firstChild as HTMLElement)
			.querySelectorAll(":scope > tbody > tr:first-child > td")
			.filter((e) => Boolean(e.text.trim()));
		energy = firstRowCells[0]?.text.trim() || "";
		health = firstRowCells[1]?.text.trim() || "";
	} else {
		energy = cell.querySelector(".energytemplate")?.text.trim() || "";
		health = cell.querySelector(".healthtemplate")?.text.trim() || "";
		buffs.push(
			...cell.querySelectorAll(".nametemplate").map((e) => e.text.trim()),
		);
	}
	return [
		energy?.replace(/−/g, "-") || null,
		health?.replace(/−/g, "-") || null,
		buffs.length > 0 ? JSON.stringify(buffs) : null,
	];
}

function parseDaysForAging(cell: HTMLElement): number | null {
	const el = [...cell.querySelectorAll("p > i:first-child")].find((p) =>
		/^Aged:\s+\d+\s+Days?$/i.test(p.textContent.trim()),
	);
	if (!el) return null;
	const m = el.text.trim().match(/^Aged:\s+(\d+)\s+Days?$/i);
	return m ? parseInt(m[1]!, 10) : null;
}

// ── Column index builder ──────────────────────────────────────────────────────

/**
 * Build a column-key → cell-index map from the header row.
 *
 * isCask: when true, the Silver/Gold/Iridium columns represent days-to-age
 *         rather than sell prices; they are mapped to "daysSilver" etc.
 */
function buildColIdx(
	headerRow: HTMLElement,
	isCask: boolean,
): Record<string, number> {
	const colIdx: Record<string, number> = {};
	const headerCells = headerRow.querySelectorAll(
		":scope > th",
	) as unknown as HTMLElement[];

	let colI = 0;
	for (const th of headerCells) {
		const text = th.text.toLowerCase().trim().replace(/\s+/g, " ");
		const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);

		if (text.includes("image")) {
			colIdx.image = colI;
		} else if (text === "name") {
			colIdx.name = colI;
		} else if (text.includes("description")) {
			colIdx.description = colI;
		} else if (
			text.includes("ingredient") ||
			text.includes("input") ||
			text.includes("source item")
		) {
			colIdx.ingredients = colI;
		} else if (text.includes("processing")) {
			colIdx.processing_time = colI;
		} else if (text.includes("energy")) {
			colIdx.energy = colI;
		} else if (text.includes("silver")) {
			// In Cask tables these are day counts; elsewhere they are prices
			colIdx[isCask ? "daysSilver" : "silver"] = colI;
		} else if (text.includes("gold")) {
			colIdx[isCask ? "daysGold" : "gold"] = colI;
		} else if (text.includes("iridium")) {
			colIdx[isCask ? "daysIridium" : "iridium"] = colI;
		} else if (
			text === "normal" ||
			text === "base" ||
			text === "normal quality" ||
			text === "sell price" ||
			text === "base sell price" ||
			text === "price" ||
			text === "selling price"
		) {
			colIdx.sell = colI;
		}

		colI += colspan;
	}

	return colIdx;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeArtisanGoods(): Promise<
	Omit<ArtisanGoodRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Artisan_Goods");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	// Collect items in a map keyed by name so the Cask section can merge into existing entries
	const itemMap = new Map<
		string,
		Omit<ArtisanGoodRow, "id" | "last_updated">
	>();

	const elements = content.querySelectorAll(
		"h2, h3, table.wikitable",
	) as unknown as HTMLElement[];

	let currentMachine: string | null = null;
	let isCaskSection = false;
	let tableCountForSection = 0;

	for (const el of elements) {
		const tag = el.tagName;

		if (tag === "H2") {
			currentMachine = null;
			isCaskSection = false;
			tableCountForSection = 0;
			continue;
		}

		if (tag === "H3") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			currentMachine = text;
			isCaskSection = text.toLowerCase().includes("cask");
			tableCountForSection = 0;
			continue;
		}

		// wikitable
		if (!currentMachine) continue;
		tableCountForSection++;

		// First table per H3 is the machine definition — skip it
		if (tableCountForSection === 1) continue;
		// Only process the second table per section
		if (tableCountForSection > 2) continue;

		const allRows = el.querySelectorAll(
			":scope > tbody > tr",
		) as unknown as HTMLElement[];
		if (allRows.length < 2) continue;

		const headerRow = allRows[0]!;
		const colIdx = buildColIdx(headerRow, isCaskSection);

		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(
				":scope > td",
			) as unknown as HTMLElement[];
			if (cells.length === 0) continue;

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const itemName = nameLink.text.trim();
			if (!itemName || itemName.toLowerCase() === "name") continue;

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

			if (isCaskSection) {
				// ── Cask section: merge aging days into existing entries ───────────

				const caskDaysSilver = (() => {
					const c = getCol(colIdx, cells, "daysSilver");
					return c ? parseDaysForAging(c) : null;
				})();
				let caskDaysGold = (() => {
					const c = getCol(colIdx, cells, "daysGold");
					return c ? parseDaysForAging(c) : null;
				})();
				let caskDaysIridium = (() => {
					const c = getCol(colIdx, cells, "daysIridium");
					return c ? parseDaysForAging(c) : null;
				})();
				if (caskDaysSilver && caskDaysGold) caskDaysGold += caskDaysSilver;
				if (caskDaysGold && caskDaysIridium) caskDaysIridium += caskDaysGold;

				const sellCell = getCol(colIdx, cells, "sell");
				const sellPrice = parsePrices(sellCell);

				const existing = itemMap.get(itemName);
				if (existing) {
					existing.cask_days_to_silver = caskDaysSilver;
					existing.cask_days_to_gold = caskDaysGold;
					existing.cask_days_to_iridium = caskDaysIridium;
					// Only fill in prices if not already set by the producing machine
					if (existing.sell_price == null && sellPrice != null)
						existing.sell_price = sellPrice;
					if (!existing.image_url && imageUrl) existing.image_url = imageUrl;
				} else {
					itemMap.set(itemName, {
						name: itemName,
						machine: null,
						description: null,
						ingredients: null,
						processing_time: null,
						sell_price: sellPrice,
						energy: null,
						health: null,
						buffs: null,
						cask_days_to_silver: caskDaysSilver,
						cask_days_to_gold: caskDaysGold,
						cask_days_to_iridium: caskDaysIridium,
						image_url: imageUrl,
						wiki_url: wikiUrl,
					});
				}
			} else {
				// ── Normal artisan goods section ──────────────────────────────────

				const description =
					getCol(colIdx, cells, "description")?.text.trim() || null;

				const ingredientsCell = getCol(colIdx, cells, "ingredients");
				const ingredients = ingredientsCell
					? parseListCell(ingredientsCell)
					: null;

				const processingTimeCell = getCol(colIdx, cells, "processing_time");
				const processing_time = processingTimeCell
					? processingTimeCell.text.trim() || null
					: null;

				let sellPrice: string | null = null;

				const hasSeparateQualityCols =
					colIdx.silver !== undefined &&
					colIdx.gold !== undefined &&
					colIdx.iridium !== undefined;

				if (hasSeparateQualityCols) {
					const normalCell = getCol(colIdx, cells, "sell");
					if (normalCell) sellPrice = normalCell.text.trim();
				} else {
					const priceCell = getCol(colIdx, cells, "sell");
					sellPrice = parsePrices(priceCell);
				}

				// Energy / Health — base tier only
				let energy: string | null = null;
				let health: string | null = null;
				let buffs: string | null = null;
				const energyCell = getCol(colIdx, cells, "energy");
				if (energyCell)
					[energy, health, buffs] = parseEnergyHealthBuffs(energyCell);

				const existing = itemMap.get(itemName);
				if (existing) {
					itemMap.set(itemName, {
						...existing,
						machine: currentMachine,
						description,
						ingredients: JSON.stringify(ingredients),
						processing_time,
						sell_price: existing.sell_price || sellPrice,
						energy,
						health,
						buffs,
						image_url: existing.image_url || imageUrl,
					});
				} else {
					itemMap.set(itemName, {
						name: itemName,
						machine: currentMachine,
						description,
						ingredients: JSON.stringify(ingredients),
						processing_time,
						sell_price: sellPrice,
						energy,
						health,
						buffs,
						cask_days_to_silver: null,
						cask_days_to_gold: null,
						cask_days_to_iridium: null,
						image_url: imageUrl,
						wiki_url: wikiUrl,
					});
				}
			}
		}
	}

	const results = Array.from(itemMap.values());
	console.log(`Scraped ${results.length} artisan goods`);
	return results;
}

import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { ArtisanGoodRow } from "@/types";
import { fetchPage, getCol, WIKI_BASE } from "./wiki";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parsePrices(
	cell: HTMLElement,
): [number | null, number | null, number | null, number | null] {
	const text = cell.text;
	const matches = [...text.matchAll(/(\d[\d,]*)\s*g(?![\d/])/gi)].map((m) =>
		parseInt(m[1]!.replace(/,/g, ""), 10),
	);
	return [
		matches[0] ?? null,
		matches[1] ?? null,
		matches[2] ?? null,
		matches[3] ?? null,
	];
}

function parseSinglePrice(cell: HTMLElement): number | null {
	const m = cell.text.match(/(\d[\d,]*)\s*g(?![\d/])/i);
	return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

function parseEnergyHealth(cell: HTMLElement): [number | null, number | null] {
	let energy: string = "";
	let health: string = "";
	if (cell.firstChild?.rawTagName === "table") {
		const firstRowCells = (cell.firstChild as HTMLElement)
			.querySelectorAll(":scope > tbody > tr:first-child > td")
			.filter((e) => Boolean(e.text.trim()));
		energy = firstRowCells[0]?.text.trim() || "";
		health = firstRowCells[1]?.text.trim() || "";
	} else {
		energy = cell.querySelector(".energytemplate")?.text.trim() || "";
		health = cell.querySelector(".healthtemplate")?.text.trim() || "";
	}
	return [
		energy ? parseInt(energy.replace(/−/g, "-"), 10) : null,
		health ? parseInt(health.replace(/−/g, "-"), 10) : null,
	];
}

function parseDays(cell: HTMLElement): number | null {
	// Replace Unicode minus U+2212 with ASCII hyphen
	const text = cell.text.trim().replace(/\u2212/g, "-");
	if (!text || text === "—" || text === "-" || /n\/a/i.test(text)) return null;
	const m = text.match(/(\d+)/);
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
		} else if (text.includes("energy")) {
			colIdx.energy = colI;
		} else if (
			text === "silver" ||
			text === "silver quality" ||
			text.includes("to silver")
		) {
			// In Cask tables these are day counts; elsewhere they are prices
			colIdx[isCask ? "daysSilver" : "silver"] = colI;
		} else if (
			text === "gold" ||
			text === "gold quality" ||
			text.includes("to gold")
		) {
			colIdx[isCask ? "daysGold" : "gold"] = colI;
		} else if (
			text === "iridium" ||
			text === "iridium quality" ||
			text.includes("to iridium")
		) {
			colIdx[isCask ? "daysIridium" : "iridium"] = colI;
		} else if (
			text === "normal" ||
			text === "base" ||
			text === "normal quality" ||
			text === "sell price" ||
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
					return c ? parseDays(c) : null;
				})();
				const caskDaysGold = (() => {
					const c = getCol(colIdx, cells, "daysGold");
					return c ? parseDays(c) : null;
				})();
				const caskDaysIridium = (() => {
					const c = getCol(colIdx, cells, "daysIridium");
					return c ? parseDays(c) : null;
				})();

				// Sell prices from Cask table (may be in a "sell"/"normal" column)
				let sellPrice: number | null = null;
				let sellSilver: number | null = null;
				let sellGold: number | null = null;
				let sellIridium: number | null = null;

				const sellCell = getCol(colIdx, cells, "sell");
				if (sellCell) {
					[sellPrice, sellSilver, sellGold, sellIridium] =
						parsePrices(sellCell);
				}

				const existing = itemMap.get(itemName);
				if (existing) {
					existing.cask_days_to_silver = caskDaysSilver;
					existing.cask_days_to_gold = caskDaysGold;
					existing.cask_days_to_iridium = caskDaysIridium;
					// Only fill in prices if not already set by the producing machine
					if (existing.sell_price == null && sellPrice != null)
						existing.sell_price = sellPrice;
					if (existing.sell_price_silver == null && sellSilver != null)
						existing.sell_price_silver = sellSilver;
					if (existing.sell_price_gold == null && sellGold != null)
						existing.sell_price_gold = sellGold;
					if (existing.sell_price_iridium == null && sellIridium != null)
						existing.sell_price_iridium = sellIridium;
					if (!existing.image_url && imageUrl) existing.image_url = imageUrl;
				} else {
					itemMap.set(itemName, {
						name: itemName,
						machine: "Cask",
						description: null,
						ingredients: null,
						sell_price: sellPrice,
						sell_price_silver: sellSilver,
						sell_price_gold: sellGold,
						sell_price_iridium: sellIridium,
						energy: null,
						health: null,
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
					? ingredientsCell.text.replace(/\s+/g, " ").trim() || null
					: null;

				// Sell prices — separate quality columns take priority over single-cell
				let sellPrice: number | null = null;
				let sellSilver: number | null = null;
				let sellGold: number | null = null;
				let sellIridium: number | null = null;

				const hasSeparateQualityCols =
					colIdx.silver !== undefined &&
					colIdx.gold !== undefined &&
					colIdx.iridium !== undefined;

				if (hasSeparateQualityCols) {
					const normalCell = getCol(colIdx, cells, "sell");
					const silverCell = getCol(colIdx, cells, "silver");
					const goldCell = getCol(colIdx, cells, "gold");
					const iridiumCell = getCol(colIdx, cells, "iridium");
					if (normalCell) sellPrice = parseSinglePrice(normalCell);
					if (silverCell) sellSilver = parseSinglePrice(silverCell);
					if (goldCell) sellGold = parseSinglePrice(goldCell);
					if (iridiumCell) sellIridium = parseSinglePrice(iridiumCell);
				} else {
					const priceCell = getCol(colIdx, cells, "sell");
					if (priceCell)
						[sellPrice, sellSilver, sellGold, sellIridium] =
							parsePrices(priceCell);
				}

				// Energy / Health — base tier only
				let energy: number | null = null;
				let health: number | null = null;
				const energyCell = getCol(colIdx, cells, "energy");
				if (energyCell) [energy, health] = parseEnergyHealth(energyCell);

				itemMap.set(itemName, {
					name: itemName,
					machine: currentMachine,
					description,
					ingredients,
					sell_price: sellPrice,
					sell_price_silver: sellSilver,
					sell_price_gold: sellGold,
					sell_price_iridium: sellIridium,
					energy,
					health,
					cask_days_to_silver: null,
					cask_days_to_gold: null,
					cask_days_to_iridium: null,
					image_url: imageUrl,
					wiki_url: wikiUrl,
				});
			}
		}
	}

	const results = Array.from(itemMap.values());
	console.log(`Scraped ${results.length} artisan goods`);
	return results;
}

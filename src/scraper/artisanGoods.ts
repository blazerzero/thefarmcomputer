import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { ArtisanGoodRow } from "@/types";
import { fetchPage, parseListCell, WIKI_BASE } from "./wiki";

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

// ── Rowspan resolution ────────────────────────────────────────────────────────

/**
 * Expand a list of HTML table rows into a 2-D grid, filling in cells that
 * span multiple rows (rowspan) so every logical row has a cell at every
 * column index.  The same HTMLElement reference is reused for carried cells,
 * which lets callers detect them via identity comparison (===).
 */
function resolveRowspans(rows: HTMLElement[]): Array<(HTMLElement | null)[]> {
	const carries = new Map<number, { cell: HTMLElement; remaining: number }>();
	const grid: Array<(HTMLElement | null)[]> = [];

	for (const row of rows) {
		const rawCells = row.querySelectorAll(
			":scope > td",
		) as unknown as HTMLElement[];
		const resolved: (HTMLElement | null)[] = [];
		let rawIdx = 0;
		let col = 0;

		while (true) {
			const carry = carries.get(col);
			if (carry && carry.remaining > 0) {
				resolved[col] = carry.cell;
				carry.remaining--;
				col++;
			} else if (rawIdx < rawCells.length) {
				const cell = rawCells[rawIdx++]!;
				const rowspan = parseInt(cell.getAttribute("rowspan") ?? "1", 10);
				const colspan = parseInt(cell.getAttribute("colspan") ?? "1", 10);
				for (let c = col; c < col + colspan; c++) {
					resolved[c] = cell;
					if (rowspan > 1) {
						carries.set(c, { cell, remaining: rowspan - 1 });
					}
				}
				col += colspan;
			} else {
				break;
			}
		}

		grid.push(resolved);
	}

	return grid;
}

// ── Column index builder ──────────────────────────────────────────────────────

/**
 * Build a column-key → cell-index map from the header row.
 *
 * isCask: when true, the Silver/Gold/Iridium columns represent days-to-age
 *         rather than sell prices; they are mapped to "daysSilver" etc.
 *
 * When the sell-price header spans multiple columns (e.g. Bee House's
 * "Base Sell Price" with colspan=2), `sell` points to the rightmost column
 * (the actual price) and `sellLabel` points to the leftmost (the type label,
 * e.g. "Wild" / "Tulip").
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
			// The price is always the rightmost column of the sell section.
			// For colspan=1 this is the same as colI; for colspan=2 (e.g. Bee
			// House) the first column is a label (flower type) and the second
			// is the price.
			colIdx.sell = colI + colspan - 1;
			if (colspan > 1) colIdx.sellLabel = colI;
		}

		colI += colspan;
	}

	return colIdx;
}

// ── Grid helpers ──────────────────────────────────────────────────────────────

function stripHidden(cell: HTMLElement): void {
	cell
		.querySelectorAll('[style*="display: none"], style')
		.forEach((el) => el.remove());
}

function getGridCell(
	gridRow: (HTMLElement | null)[],
	colIdx: Record<string, number>,
	key: string,
): HTMLElement | null {
	const idx = colIdx[key];
	if (idx === undefined) return null;
	const cell = gridRow[idx] ?? null;
	if (cell) stripHidden(cell);
	return cell;
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

	// Variant data for multi-row items (e.g. Oil with three possible inputs,
	// Honey with flower-specific sell prices).
	type IngredientVariant = { ingredient: string; time: string };
	type SellVariant = { label: string; price: string };
	const ingredientVariantMap = new Map<string, IngredientVariant[]>();
	const sellVariantMap = new Map<string, SellVariant[]>();

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

		// Resolve rowspans so every grid row has every cell at its logical index.
		// Cells shared across rows via rowspan are the same HTMLElement reference,
		// which lets us detect sub-rows by identity comparison below.
		const grid = resolveRowspans(allRows.slice(1));

		// Track the first (main) grid row seen for each item name, per table.
		const mainGridRowByName = new Map<string, (HTMLElement | null)[]>();

		for (let i = 0; i < grid.length; i++) {
			const gridRow = grid[i]!;

			const nameCell = getGridCell(gridRow, colIdx, "name");
			if (!nameCell) continue;

			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			const itemName = nameLink.text.trim();
			if (!itemName || itemName.toLowerCase() === "name") continue;

			const href = nameLink.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			// Image (shared across sub-rows via rowspan, so only the first hit matters)
			const imageCell = getGridCell(gridRow, colIdx, "image");
			let imageUrl: string | null = null;
			if (imageCell) {
				const img = imageCell.querySelector("img");
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			const isSubRow = mainGridRowByName.has(itemName);

			if (isSubRow) {
				// ── Sub-row: collect variant data ─────────────────────────────────
				const mainRow = mainGridRowByName.get(itemName)!;

				// Ingredient variant (e.g. Oil: Corn / Sunflower Seeds / Sunflower)
				if (colIdx.ingredients !== undefined) {
					const ingCell = gridRow[colIdx.ingredients];
					if (ingCell && ingCell !== mainRow[colIdx.ingredients]) {
						stripHidden(ingCell);
						const timeIdx = colIdx.processing_time;
						const timeCell =
							timeIdx !== undefined ? (gridRow[timeIdx] ?? null) : null;
						if (timeCell) stripHidden(timeCell);

						const ingText = parseListCell(ingCell).join(", ");
						const time = timeCell?.text.trim() ?? "";

						const variants = ingredientVariantMap.get(itemName) ?? [];
						variants.push({ ingredient: ingText, time });
						ingredientVariantMap.set(itemName, variants);
					}
				}

				// Sell-price variant (e.g. Honey: 100g Wild / 160g Tulip / …)
				if (colIdx.sell !== undefined) {
					const priceCell = gridRow[colIdx.sell];
					if (priceCell && priceCell !== mainRow[colIdx.sell]) {
						stripHidden(priceCell);
						const labelIdx = colIdx.sellLabel;
						const labelCell =
							labelIdx !== undefined ? (gridRow[labelIdx] ?? null) : null;
						if (labelCell) stripHidden(labelCell);

						const price = parsePrices(priceCell) ?? "";
						const label =
							labelCell?.querySelector(".nametemplate a")?.text.trim() ??
							labelCell?.text.trim() ??
							"";

						const variants = sellVariantMap.get(itemName) ?? [];
						variants.push({ label, price });
						sellVariantMap.set(itemName, variants);
					}
				}

				continue;
			}

			// ── Main row ──────────────────────────────────────────────────────────
			mainGridRowByName.set(itemName, gridRow);

			if (isCaskSection) {
				// ── Cask section: merge aging days into existing entries ───────────

				const caskDaysSilver = (() => {
					const c = getGridCell(gridRow, colIdx, "daysSilver");
					return c ? parseDaysForAging(c) : null;
				})();
				let caskDaysGold = (() => {
					const c = getGridCell(gridRow, colIdx, "daysGold");
					return c ? parseDaysForAging(c) : null;
				})();
				let caskDaysIridium = (() => {
					const c = getGridCell(gridRow, colIdx, "daysIridium");
					return c ? parseDaysForAging(c) : null;
				})();
				if (caskDaysSilver && caskDaysGold) caskDaysGold += caskDaysSilver;
				if (caskDaysGold && caskDaysIridium) caskDaysIridium += caskDaysGold;

				const sellCell = getGridCell(gridRow, colIdx, "sell");
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
					getGridCell(gridRow, colIdx, "description")?.text.trim() || null;

				const ingredientsCell = getGridCell(gridRow, colIdx, "ingredients");
				const ingredients = ingredientsCell
					? parseListCell(ingredientsCell)
					: null;

				const processingTimeCell = getGridCell(
					gridRow,
					colIdx,
					"processing_time",
				);
				const processing_time = processingTimeCell
					? processingTimeCell.text.trim() || null
					: null;

				let sellPrice: string | null = null;

				const hasSeparateQualityCols =
					colIdx.silver !== undefined &&
					colIdx.gold !== undefined &&
					colIdx.iridium !== undefined;

				if (hasSeparateQualityCols) {
					const normalCell = getGridCell(gridRow, colIdx, "sell");
					if (normalCell) sellPrice = normalCell.text.trim();
				} else {
					const priceCell = getGridCell(gridRow, colIdx, "sell");
					sellPrice = parsePrices(priceCell);
				}

				// Energy / Health — base tier only
				let energy: string | null = null;
				let health: string | null = null;
				let buffs: string | null = null;
				const energyCell = getGridCell(gridRow, colIdx, "energy");
				if (energyCell)
					[energy, health, buffs] = parseEnergyHealthBuffs(energyCell);

				// Initialise ingredient variants for items that may have sub-rows
				// where the ingredient (and therefore processing time) differs per row.
				if (ingredients && ingredients.length > 0 && processing_time) {
					ingredientVariantMap.set(itemName, [
						{ ingredient: ingredients[0]!, time: processing_time },
					]);
				}

				// Initialise sell-price variants for tables with a multi-column sell
				// header (e.g. Bee House: label column + price column).
				if (colIdx.sellLabel !== undefined && sellPrice) {
					const labelIdx = colIdx.sellLabel;
					const labelCell = gridRow[labelIdx] ?? null;
					if (labelCell) stripHidden(labelCell);
					const label =
						labelCell?.querySelector(".nametemplate a")?.text.trim() ??
						labelCell?.text.trim() ??
						"";
					sellVariantMap.set(itemName, [{ label, price: sellPrice }]);
				}

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

	// ── Post-process multi-variant items ──────────────────────────────────────

	const stripQty = (s: string) => s.replace(/\s*\(\d+\)\s*$/, "").trim();

	// Items like Oil where the ingredient (and processing time) varies per input.
	// Rebuild ingredients as an array of all options and format processing_time
	// as one "Ingredient: Time" line per variant.
	for (const [itemName, variants] of ingredientVariantMap) {
		if (variants.length <= 1) continue;
		const item = itemMap.get(itemName);
		if (!item) continue;

		item.ingredients = JSON.stringify(
			variants.flatMap((v, i) =>
				i === 0 ? [v.ingredient] : ["or", v.ingredient],
			),
		);
		item.processing_time = variants
			.map((v) => `${stripQty(v.ingredient)}: ${v.time}`)
			.join("\n");
	}

	// Items like Honey where the sell price varies by input (nearby flower).
	// Collapse duplicates (same flower grows in multiple seasons) and format as
	// one "price (label)" line per unique variant.
	for (const [itemName, variants] of sellVariantMap) {
		if (variants.length <= 1) continue;
		const item = itemMap.get(itemName);
		if (!item) continue;

		const seen = new Set<string>();
		const unique = variants.filter((v) => {
			const key = `${v.label}:${v.price}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		item.sell_price = unique
			.map((v) => (v.label ? `${v.label}: ${v.price}` : v.price))
			.join("\n");
	}

	const results = Array.from(itemMap.values());
	console.log(`Scraped ${results.length} artisan goods`);
	return results;
}

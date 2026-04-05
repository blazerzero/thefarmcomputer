import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import { getCrop, getForageable } from "@/db";
import type { FruitRow } from "@/types";
import {
	fetchPage,
	getCol,
	parseEnergyHealthStats,
	parseListCell,
	parsePriceTiers,
	WIKI_BASE,
} from "./wiki";

// Known multi-word artisan item types, checked longest-first so "dried fruit"
// beats a single-word fallback. Keys use underscores to match the dict format.
const ARTISAN_TYPE_SUFFIXES: Array<[suffix: string, key: string]> = [
	["dried fruit", "dried_fruit"],
	["wine", "wine"],
	["jelly", "jelly"],
];

/**
 * Derive a dict key for an artisan item type from a .backimage img alt string.
 * Strips the .png extension, then matches known type suffixes (longest first)
 * against the lowercased remainder — e.g. "Light Blue Wine.png" → "wine",
 * "Orange Dried Fruit.png" → "dried_fruit". Falls back to the last word.
 */
function artisanTypeFromAlt(alt: string): string {
	const base = alt
		.replace(/\.png$/i, "")
		.trim()
		.toLowerCase();
	for (const [suffix, key] of ARTISAN_TYPE_SUFFIXES) {
		if (base.endsWith(suffix)) return key;
	}
	return base.split(/\s+/).pop() ?? "";
}

/**
 * Parse a cell containing one or more artisan products at potentially multiple
 * quality tiers. The item type comes from the .backimage img alt (e.g.
 * "Light Blue Wine.png" → "wine"); the quality tier from the .foreimage img
 * alt (absent = "base"). Returns a dict keyed as "{tier}_{type}".
 */
function parseArtisanCell(cell: HTMLElement): Record<string, number> {
	const result: Record<string, number> = {};
	for (const row of cell.querySelectorAll("tr") as unknown as HTMLElement[]) {
		// Item type from .backimage img alt
		const backImg = row.querySelector(".backimage img");
		const type = artisanTypeFromAlt(backImg?.getAttribute("alt") ?? "");
		if (!type) continue;

		// Quality tier from .foreimage img alt
		const foreImg = row.querySelector(".foreimage img");
		const foreAlt = (foreImg?.getAttribute("alt") ?? "").toLowerCase();
		const tier = foreAlt.includes("silver")
			? "silver"
			: foreAlt.includes("gold")
				? "gold"
				: foreAlt.includes("iridium")
					? "iridium"
					: "base";

		const [price] = parsePriceTiers(row.text);
		if (price === null) continue;

		result[`${tier}_${type}`] = price;
	}
	return result;
}

export async function scrapeFruits(
	sql: SqlStorage,
): Promise<Omit<FruitRow, "id" | "last_updated">[]> {
	const html = await fetchPage("/Fruits");
	const root = parse(html);

	const content = root.querySelector("#mw-content-text") ?? root;
	const results: Omit<FruitRow, "id" | "last_updated">[] = [];

	const tables = content.querySelectorAll("table.wikitable");

	for (const table of tables) {
		const rows = table.querySelectorAll(":scope > tbody > tr");
		if (rows.length < 2) continue;

		// Parse header row to find column indices
		const headerCells = rows[0]!.querySelectorAll(":scope > th, :scope > td");
		if (headerCells.length === 0) continue;
		const headers = headerCells.map((h) =>
			h.text.replace(/\s+/g, " ").trim().toLowerCase(),
		);

		const colIdx: Record<string, number> = {};
		headers.forEach((h, i) => {
			if (h.includes("image")) colIdx.image = i;
			if (h === "name" || h.includes("name")) colIdx.name = i;
			if (h.includes("source")) colIdx.source = i;
			if (h.includes("season")) colIdx.season = i;
			if (h.includes("energy")) colIdx.energy = i;
			// Sell price: prefer "base" column, fall back to first sell/price column
			if (h === "base") colIdx.sell = i;
			if (
				colIdx.sell === undefined &&
				(h.includes("sell") || h.includes("price"))
			)
				colIdx.sell = i;
			if (h.includes("tiller")) colIdx.tiller = i;
			if (
				colIdx.tiller === undefined &&
				(h.includes("sell") || h.includes("price"))
			)
				colIdx.tiller = i + 1;
			if (h.includes("bear")) colIdx.bears_knowledge = i;
			if (
				colIdx.bears_knowledge === undefined &&
				(h.includes("sell") || h.includes("price"))
			)
				colIdx.bears_knowledge = i + 2;
			if (h.includes("artisan")) colIdx.artisan = i + 2;
			if (colIdx.artisan === undefined && h.includes("base"))
				colIdx.artisan = i + 2;
		});

		// Skip tables that don't look like fruit data
		if (colIdx.name === undefined || colIdx.sell === undefined) continue;

		for (let r = 1; r < rows.length; r++) {
			const cells = rows[r]!.querySelectorAll(":scope > td");
			if (cells.length === 0) continue;

			// Name + wiki URL
			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			const nameLinks = nameCell.querySelectorAll("a");
			const nameLink = nameLinks.find(
				(a) => !a.getAttribute("href")?.startsWith("/File:"),
			);
			const name = (nameLink?.text ?? nameCell.text)
				.replace(/\s+/g, " ")
				.trim();
			if (!name) continue;

			const href = nameLink?.getAttribute("href");
			const wikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Fruits`;

			// Image URL
			const imgSrc =
				getCol(colIdx, cells, "image")
					?.querySelector("img")
					?.getAttribute("src") ?? null;
			const imageUrl = imgSrc ? WIKI_BASE + imgSrc : null;

			// Source
			const sourceCell = getCol(colIdx, cells, "source");
			const source = sourceCell ? parseListCell(sourceCell) : [];

			// Seasons
			const seasonCell = getCol(colIdx, cells, "season");
			const seasons: string[] = [];
			if (seasonCell) {
				let currentText = "";
				seasonCell.childNodes.forEach((node) => {
					if (node.rawTagName === "br") {
						seasons.push(currentText.trim());
						currentText = "";
					} else {
						currentText += node.text;
					}
				});
				if (currentText.trim()) {
					seasons.push(currentText.trim());
				}
			}

			// Sell prices — all "Xg" values in the Base column cell
			const sellPrices = parsePriceTiers(
				getCol(colIdx, cells, "sell")?.text ?? "",
			);

			// Energy / Health — skip for Farming/Foraging sources
			const isFarmableFruit = source.some((s) => s.toLowerCase() === "farming");
			const isForageableFruit = source.some(
				(s) => s.toLowerCase() === "foraging",
			);
			let qualityStats: ReturnType<typeof parseEnergyHealthStats>;
			if (isFarmableFruit) {
				const fruitAsCrop = getCrop(sql, name);
				qualityStats = fruitAsCrop
					? {
							energy: fruitAsCrop.energy,
							energy_silver: fruitAsCrop.energy_silver,
							energy_gold: fruitAsCrop.energy_gold,
							energy_iridium: fruitAsCrop.energy_iridium,
							health: fruitAsCrop.health,
							health_silver: fruitAsCrop.health_silver,
							health_gold: fruitAsCrop.health_gold,
							health_iridium: fruitAsCrop.health_iridium,
						}
					: parseEnergyHealthStats(getCol(colIdx, cells, "energy"));
			} else if (isForageableFruit) {
				const fruitAsForagedItem = getForageable(sql, name);
				qualityStats = fruitAsForagedItem
					? {
							energy: fruitAsForagedItem.energy,
							energy_silver: fruitAsForagedItem.energy_silver,
							energy_gold: fruitAsForagedItem.energy_gold,
							energy_iridium: fruitAsForagedItem.energy_iridium,
							health: fruitAsForagedItem.health,
							health_silver: fruitAsForagedItem.health_silver,
							health_gold: fruitAsForagedItem.health_gold,
							health_iridium: fruitAsForagedItem.health_iridium,
						}
					: parseEnergyHealthStats(getCol(colIdx, cells, "energy"));
			} else {
				qualityStats = parseEnergyHealthStats(getCol(colIdx, cells, "energy"));
			}

			// Profession / knowledge boosts — flagged by presence of content in the column
			const tillerBoostData = parsePriceTiers(
				getCol(colIdx, cells, "tiller")?.text ?? "",
			);
			const bearsKnowledgeBoostData = parsePriceTiers(
				getCol(colIdx, cells, "bears_knowledge")?.text ?? "",
			);

			// Artisan prices
			const artisanCell = getCol(colIdx, cells, "artisan");
			const artisanPrices = artisanCell ? parseArtisanCell(artisanCell) : {};

			results.push({
				name,
				source: JSON.stringify(source),
				seasons: JSON.stringify(seasons),
				sell_price: sellPrices[0] ?? null,
				sell_price_silver: sellPrices[1] ?? null,
				sell_price_gold: sellPrices[2] ?? null,
				sell_price_iridium: sellPrices[3] ?? null,
				...qualityStats,
				tiller_boost: Number(
					tillerBoostData.some((p, i) => Boolean(p) && p !== sellPrices[i]),
				),
				bears_knowledge_boost: Number(
					bearsKnowledgeBoostData.some(
						(p, i) => Boolean(p) && p !== sellPrices[i],
					),
				),
				artisan_prices: JSON.stringify(artisanPrices),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${results.length} fruits`);
	return results;
}

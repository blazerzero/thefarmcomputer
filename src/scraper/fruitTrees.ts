import { parse } from "node-html-parser";
import { SEASONS } from "@/constants";
import type { FruitTreeRow } from "@/types";
import { fetchPage, WIKI_BASE } from "./wiki";

function parseIntFrom(text: string): number | null {
	const m = text.replace(/,/g, "").match(/\d+/);
	return m ? parseInt(m[0]!, 10) : null;
}

export async function scrapeFruitTrees(): Promise<
	Omit<FruitTreeRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Fruit_Trees");
	const root = parse(html);

	const content = root.querySelector("#mw-content-text") ?? root;
	const trees: Omit<FruitTreeRow, "id" | "last_updated">[] = [];

	let currentSeason = "";
	let currentTreeName = "";
	let currentWikiUrl = "";
	let currentImageUrl: string | null = null;
	// 0 = expect stages table, 1 = expect data table
	let tableIndex = 0;
	let currentGrowthDays: number | null = null;

	const elements = content.querySelectorAll("h2, h3, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		// ── Season heading ──────────────────────────────────────────────────────
		if (tag === "H2") {
			const text =
				el.querySelector(".mw-headline")?.text.trim() ?? el.text.trim();
			if (SEASONS.includes(text)) currentSeason = text;
			continue;
		}

		// ── Tree name heading ───────────────────────────────────────────────────
		if (tag === "H3") {
			const headline = el.querySelector(".mw-headline") ?? el;
			const links = headline.querySelectorAll("a");
			const treeLink = links.find(
				(l) => !l.getAttribute("href")?.startsWith("/File:"),
			);
			currentTreeName = (treeLink?.text || headline.text)
				.replace(/\s+/g, " ")
				.trim();
			const href = treeLink?.getAttribute("href");
			currentWikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Fruit_Trees`;
			tableIndex = 0;
			currentGrowthDays = null;
			continue;
		}

		// ── Tables ──────────────────────────────────────────────────────────────
		if (!currentTreeName || !currentSeason) continue;

		const rows = el.querySelectorAll(":scope > tbody > tr");
		if (rows.length < 2) continue;

		if (tableIndex === 0) {
			// Growth stages table — find "Total: N Days"
			for (const row of rows) {
				if (!currentImageUrl) {
					const imgRow = row.querySelectorAll("td div img");
					if (imgRow.length > 0) {
						const harvestImage =
							imgRow[imgRow.length - 1]?.getAttribute("src") ?? null;
						if (harvestImage) {
							currentImageUrl = harvestImage.startsWith("http")
								? harvestImage
								: WIKI_BASE + harvestImage;
						}
					}
				}
				const cellText = row.text.replace(/\s+/g, " ").trim();
				const totalMatch = cellText.match(/total[^:]*:\s*(\d+)\s*day/i);
				if (totalMatch) {
					currentGrowthDays = parseInt(totalMatch[1]!, 10);
					break;
				}
			}
			tableIndex = 1;
			continue;
		}

		if (tableIndex === 1) {
			// Data table — Sapling | Pierre's Price | Traveling Cart Price | Fruit | Fruit Sell Price | …
			const headerCells = rows[0]!.querySelectorAll(":scope > th");
			if (headerCells.length === 0) {
				tableIndex++;
				continue;
			}
			const headers = headerCells.map((th) =>
				th.text.replace(/\s+/g, " ").trim().toLowerCase(),
			);

			const idxPierre = headers.findIndex((h) => h.includes("pierre"));
			const idxFruit = headers.findIndex((h) => h === "fruit");
			const idxSellPrice = headers.findIndex(
				(h) => h.includes("sell price") || h.includes("fruit sell"),
			);

			if (idxFruit === -1 || idxSellPrice === -1) {
				tableIndex++;
				continue;
			}

			const dataCells = rows[1]!.querySelectorAll(":scope > td");
			const cellText = (idx: number): string =>
				idx >= 0 && idx < dataCells.length
					? (dataCells[idx]?.text.replace(/\s+/g, " ").trim() ?? "")
					: "";

			// Pierre's price
			const pierreText = idxPierre >= 0 ? cellText(idxPierre) : "";
			const saplingPrice = pierreText ? parseIntFrom(pierreText) : null;

			// Fruit name — get the link text if available, else cell text
			const fruitCell =
				idxFruit >= 0 && idxFruit < dataCells.length
					? dataCells[idxFruit]
					: null;
			const fruitName =
				(fruitCell?.querySelector("a")?.text || fruitCell?.text || "")
					.replace(/\s+/g, " ")
					.trim() || null;

			// Sell prices — all Xg values in the sell price cell
			const sellText = cellText(idxSellPrice);
			const sellPrices = [...sellText.matchAll(/(\d[\d,]*)\s*g(?![\d/])/g)].map(
				(m) => parseIntFrom(m[1]!),
			);

			trees.push({
				name: currentTreeName,
				season: currentSeason,
				growth_days: currentGrowthDays,
				sapling_price: saplingPrice,
				fruit_name: fruitName,
				sell_price: sellPrices[0] ?? null,
				sell_price_silver: sellPrices[1] ?? null,
				sell_price_gold: sellPrices[2] ?? null,
				sell_price_iridium: sellPrices[3] ?? null,
				image_url: currentImageUrl,
				wiki_url: currentWikiUrl,
			});

			// Reset tree context
			currentTreeName = "";
			currentWikiUrl = "";
			currentImageUrl = null;
			currentGrowthDays = null;
			tableIndex = 0;
		}
	}

	console.log(`Scraped ${trees.length} fruit trees`);
	return trees;
}

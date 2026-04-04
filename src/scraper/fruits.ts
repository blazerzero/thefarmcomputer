import { HTMLElement, parse } from "node-html-parser";
import { SEASONS } from "@/constants";
import type { FruitRow } from "@/types";
import { fetchPage, parseQualityStats, WIKI_BASE } from "./wiki";

function parseIntFrom(text: string): number | null {
	const m = text.replace(/,/g, "").match(/\d+/);
	return m ? parseInt(m[0]!, 10) : null;
}

function parseUsedInCell(cell: HTMLElement): string[] {
	const items = cell.querySelectorAll(":scope > span, :scope > p");
	if (items.length > 0) {
		return items
			.map((item) => item.text.replace(/\s+/g, " ").trim())
			.filter((t) => t.length > 0);
	}
	return [];
}

export async function scrapeFruits(): Promise<
	Omit<FruitRow, "id" | "last_updated">[]
> {
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

		const idxImage = headers.findIndex((h) => h.includes("image"));
		const idxName = headers.findIndex((h) => h === "name" || h.includes("name"));
		const idxSource = headers.findIndex((h) => h.includes("source"));
		const idxSeason = headers.findIndex(
			(h) => h.includes("season") && !h.includes("source"),
		);
		// Sell price: prefer "base" column, fall back to first sell/price column
		let idxSell = headers.findIndex((h) => h === "base");
		if (idxSell === -1) {
			idxSell = headers.findIndex(
				(h) => h.includes("sell") || h.includes("price"),
			);
		}
		const idxEnergy = headers.findIndex((h) => h.includes("energy"));
		const idxUsedIn = headers.findIndex((h) => h.includes("used"));

		// Skip tables that don't look like fruit data
		if (idxName === -1 || idxSell === -1) continue;

		for (let r = 1; r < rows.length; r++) {
			const cells = rows[r]!.querySelectorAll(":scope > td");
			if (cells.length === 0) continue;

			const cellText = (idx: number): string =>
				idx >= 0 && idx < cells.length
					? cells[idx]!.text.replace(/\s+/g, " ").trim()
					: "";

			// Name + wiki URL
			const nameCell =
				idxName >= 0 && idxName < cells.length ? cells[idxName]! : null;
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
			let imageUrl: string | null = null;
			if (idxImage >= 0 && idxImage < cells.length) {
				const imgSrc =
					cells[idxImage]!.querySelector("img")?.getAttribute("src") ?? null;
				imageUrl = imgSrc ? WIKI_BASE + imgSrc : null;
			}

			// Source
			const source = cellText(idxSource) || null;

			// Seasons
			const seasonText = cellText(idxSeason);
			let seasons: string[];
			if (
				!seasonText ||
				seasonText === "—" ||
				seasonText.toLowerCase().includes("all")
			) {
				seasons = [];
			} else {
				seasons = SEASONS.filter((s) =>
					seasonText.toLowerCase().includes(s.toLowerCase()),
				);
			}

			// Sell prices — all "Xg" values in the Base column cell
			const sellText = cellText(idxSell);
			const sellPrices = [
				...sellText.matchAll(/(\d[\d,]*)\s*g(?![\d/])/g),
			].map((m) => parseIntFrom(m[1]!));

			// Energy / Health — skip for Farming/Foraging sources
			const sourceNorm = (source ?? "").toLowerCase();
			const skipEnergy =
				sourceNorm === "farming" || sourceNorm === "foraging";
			const qualityStats = skipEnergy
				? {
						energy: null,
						energy_silver: null,
						energy_gold: null,
						energy_iridium: null,
						health: null,
						health_silver: null,
						health_gold: null,
						health_iridium: null,
					}
				: parseQualityStats(
						idxEnergy >= 0 && idxEnergy < cells.length
							? (cells[idxEnergy] ?? null)
							: null,
					);

			// Used In
			let usedIn: string[] = [];
			if (idxUsedIn >= 0 && idxUsedIn < cells.length) {
				usedIn = parseUsedInCell(cells[idxUsedIn]!);
			}

			results.push({
				name,
				source,
				seasons: JSON.stringify(seasons),
				sell_price: sellPrices[0] ?? null,
				sell_price_silver: sellPrices[1] ?? null,
				sell_price_gold: sellPrices[2] ?? null,
				sell_price_iridium: sellPrices[3] ?? null,
				...qualityStats,
				used_in: JSON.stringify(usedIn),
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${results.length} fruits`);
	return results;
}

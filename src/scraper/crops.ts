import { parse } from "node-html-parser";
import { SEASONS } from "../constants";
import type { CropRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

function parseIntFrom(text: string): number | null {
	const m = text.replace(/,/g, "").match(/\d+/);
	return m ? parseInt(m[0]!, 10) : null;
}

function parseSeasons(text: string): string[] {
	const sentences = text.split(".").map((s) => s.trim().toLowerCase());
	const textToRead = sentences
		.filter(
			(s) => !s.includes("sale") && !s.includes("seed") && !s.includes("sell"),
		)
		.join(". ");
	if (textToRead.includes("all seasons") || textToRead.includes("any season")) {
		return [...SEASONS];
	}
	return SEASONS.filter(
		(s) =>
			textToRead.toLowerCase() === `${s.toLowerCase()} crops` ||
			textToRead.toLowerCase().includes(`in ${s.toLowerCase()}`) ||
			textToRead.toLowerCase().includes(`and ${s.toLowerCase()}`) ||
			textToRead.toLowerCase().includes(`or ${s.toLowerCase()}`),
	);
}

export async function scrapeCrops(): Promise<
	Omit<CropRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Crops");
	const root = parse(html);

	const content = root.querySelector("#mw-content-text") ?? root;
	const crops: Omit<CropRow, "id" | "last_updated">[] = [];

	// Context tracked as we walk the page in document order
	let currentSeasons: string[] = [];
	let currentCropName = "";
	let currentWikiUrl = "";
	let currentImageUrl: string | null = null;
	let currentIsTrellis = 0;
	// Overrides currentSeasons for a specific crop when a "Can be grown in…" paragraph
	// appears between its H3 heading and its data table.
	let currentCropSeasonOverride: string[] | null = null;

	// Walk h2 (seasons), h3 (crop names), p (trellis prose), and wikitables
	const elements = content.querySelectorAll("h2, h3, p, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		// ── Season heading ──────────────────────────────────────────────────────
		if (tag === "H2") {
			const text =
				el.querySelector(".mw-headline")?.text.trim() ?? el.text.trim();
			const matched = parseSeasons(text);
			if (matched.length > 0) currentSeasons = matched;
			else if (text === "Special Crops") currentSeasons = ["N/A"];
			continue;
		}

		// ── Crop name heading ───────────────────────────────────────────────────
		if (tag === "H3") {
			const headline = el.querySelector(".mw-headline") ?? el;
			// Find the crop page link (not the /File: image link)
			const links = headline.querySelectorAll("a");
			const cropLink = links.find(
				(l) => !l.getAttribute("href")?.startsWith("/File:"),
			);
			const fileLink = links.find((l) =>
				l.getAttribute("href")?.startsWith("/File:"),
			);
			currentCropName = (cropLink?.text || fileLink?.text || headline.text)
				.replace(/\s+/g, " ")
				.trim();
			const href = cropLink?.getAttribute("href");
			currentWikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Crops`;
			// Extract image URL from the img tag inside the h3
			const imgSrc = headline.querySelector("img")?.getAttribute("src") ?? null;
			currentImageUrl = imgSrc ? WIKI_BASE + imgSrc : null;
			currentIsTrellis = 0;
			currentCropSeasonOverride = null;
			continue;
		}

		// ── Prose between H3 and table ──────────────────────────────────────────
		if (tag === "P") {
			if (el.text.toLowerCase().includes("trellis")) currentIsTrellis = 1;
			// "Can be grown in Spring and Summer" — captures all seasons mentioned
			if (currentCropName) {
				const mentioned = parseSeasons(el.text);
				if (mentioned.length > 0) currentCropSeasonOverride = mentioned;
			}
			continue;
		}

		// ── Crop data table ─────────────────────────────────────────────────────
		if (!currentCropName || currentSeasons.length === 0) continue;

		const rows = el.querySelectorAll(":scope > tbody > tr");
		if (rows.length < 2) continue;

		// Header row: Seeds | Stage 1 | … | Harvest | Sells For | …
		const headerCells = rows[0]!.querySelectorAll(":scope > th");
		if (headerCells.length === 0) continue;
		const headers = headerCells.map((th) =>
			th.text.replace(/\s+/g, " ").trim().toLowerCase(),
		);

		const idxSeeds = headers.findIndex((h) => h.includes("seed"));
		const idxHarvest = headers.findIndex((h) => h.includes("harvest"));
		const harvestCell = headerCells[idxHarvest] ?? null;
		let idxSell = headers.findIndex((h) => h.includes("sell"));
		if (
			harvestCell?.attributes.colspan &&
			parseInt(harvestCell.attributes.colspan) >= 2
		) {
			// If the crop regrows, the Harvest header has both growth and regrowth info, pushing the Sell info one column to the right
			idxSell += parseInt(harvestCell.attributes.colspan) - 1;
		}

		// Skip tables that don't match the crop data shape
		if (idxHarvest === -1 || idxSell === -1) continue;

		// Data row immediately after the header
		const dataCells = rows[1]!.querySelectorAll(":scope > td");
		const adtlInfoCells = rows[2]!.querySelectorAll(":scope > td");
		const cellText = (idx: number, rowData = dataCells): string =>
			idx >= 0 && idx < rowData.length
				? (rowData[idx]?.text.replace(/\s+/g, " ").trim() ?? "")
				: "";

		const seedsText = cellText(idxSeeds);
		const growthText = cellText(idxHarvest - 1, adtlInfoCells);
		const regrowthText = cellText(idxHarvest, adtlInfoCells);
		const sellText = cellText(idxSell);

		// Buy price — prefer Pierre's, fall back to any price in the Seeds cell
		const pierreMatch = seedsText.match(/pierre[^:]*:\s*[^\d]*(\d[\d,]*)\s*g/i);
		const anyPriceMatch = seedsText.match(/(\d[\d,]*)\s*g/i);
		const buyPrice = pierreMatch
			? parseIntFrom(pierreMatch[1]!)
			: anyPriceMatch
				? parseIntFrom(anyPriceMatch[1]!)
				: null;

		// Growth/regrowth days — "Total: 10 days" / "Regrowth: 3 days"
		const totalMatch = growthText.match(/total[^:]*:\s*(\d+)\s*day/i);
		const regrowthMatch = regrowthText.match(/regrowth[^:]*:\s*(\d+)\s*day/i);
		const growthDays = totalMatch
			? parseInt(totalMatch[1]!, 10)
			: parseIntFrom(growthText);
		const regrowthDays = regrowthMatch ? parseInt(regrowthMatch[1]!, 10) : null;

		// Sell prices — all Xg values in the cell (base, silver, gold, iridium)
		// Exclude "g/" patterns like "7.2g/d"
		const sellPrices = [...sellText.matchAll(/(\d[\d,]*)\s*g(?![\d/])/g)].map(
			(m) => parseIntFrom(m[1]!),
		);

		crops.push({
			name: currentCropName,
			seasons: JSON.stringify(currentCropSeasonOverride ?? currentSeasons),
			growth_days: growthDays,
			regrowth_days: regrowthDays,
			sell_price: sellPrices[0] ?? null,
			sell_price_silver: sellPrices[1] ?? null,
			sell_price_gold: sellPrices[2] ?? null,
			sell_price_iridium: sellPrices[3] ?? null,
			buy_price: buyPrice,
			is_trellis: currentIsTrellis,
			image_url: currentImageUrl,
			wiki_url: currentWikiUrl,
		});

		// Reset crop context — this table has been consumed
		currentCropName = "";
		currentWikiUrl = "";
		currentImageUrl = null;
		currentIsTrellis = 0;
		currentCropSeasonOverride = null;
	}

	console.log(`Scraped ${crops.length} crops`);
	return crops;
}

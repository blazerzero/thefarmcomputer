import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import { SEASONS } from "@/constants";
import type { FishRow } from "@/types";
import { fetchPage, getCol, parsePriceTiers, WIKI_BASE } from "./wiki";

const SEASON_NAMES = new Set(SEASONS);

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parseSeasons(cell: HTMLElement): string[] {
	const results: string[] = [];

	// Collect season names from img alt attributes (wiki uses icons for seasons)
	for (const img of cell.querySelectorAll("img")) {
		const alt = img.getAttribute("alt")?.trim() ?? "";
		if (SEASON_NAMES.has(alt) && !results.includes(alt)) {
			results.push(alt);
		}
	}

	// Also check plain text for "All Seasons"
	const text = cell.text.trim();
	if (/all seasons/i.test(text) && !results.includes("All Seasons")) {
		results.push("All Seasons");
	}

	return results;
}

function parseWeather(cell: HTMLElement): string {
	const anchors = cell.querySelectorAll("a");
	const weathers = anchors
		.map((a) => a.text.trim())
		.filter((t) => t.length > 0);

	if (weathers.length > 0) {
		return [...new Set(weathers)].join(", ");
	}

	const text = cell.text.trim();
	return text || "Any";
}

function parseTime(cell: HTMLElement): string {
	const text = cell.text.trim().replace(/\s+/g, " ");
	if (!text || text === "—" || text === "-" || text.toLowerCase() === "anytime")
		return "Anytime";
	return text;
}

function parseSize(cell: HTMLElement | null): [number | null, number | null] {
	if (!cell) return [null, null];
	const text = cell.text.trim();
	const range = text.match(/(\d+)\s*[–-]\s*(\d+)/);
	if (range) return [parseInt(range[1]!, 10), parseInt(range[2]!, 10)];
	const single = text.match(/^(\d+)$/);
	if (single) {
		const n = parseInt(single[1]!, 10);
		return [n, n];
	}
	return [null, null];
}

function parseDifficultyBehavior(
	cell: HTMLElement | null,
): [number | null, string | null] {
	if (!cell) return [null, null];
	const text = cell.text.trim().toLowerCase();
	const m = text.match(/(\d+)\s+(dart|mixed|smooth|sinker|floater)/);
	if (!m) return [null, null];
	return [parseInt(m[1]!, 10), m[2]!];
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeFish(): Promise<
	Omit<FishRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Fish");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const fish: Omit<FishRow, "id" | "last_updated">[] = [];
	let currentCategory = "Fishing Pole";

	const elements = content.querySelectorAll("h2, h3, table.wikitable");

	for (const el of elements) {
		const tag = el.tagName;

		// ── Section heading ───────────────────────────────────────────────────────
		if (tag === "H2" || tag === "H3") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			if (text.includes("Other Catchables")) break; // stop — these aren't fish
			if (text.includes("Legendary Fish II")) {
				currentCategory = "Legendary II";
			} else if (text.includes("Legendary Fish")) {
				currentCategory = "Legendary";
			} else if (text.includes("Night Market")) {
				currentCategory = "Night Market";
			} else if (text.includes("Crab Pot")) {
				currentCategory = "Crab Pot";
			} else if (text.includes("Fishing Pole")) {
				currentCategory = "Fishing Pole";
			}
			continue;
		}

		// ── Fish data table ───────────────────────────────────────────────────────
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
			else if (text === "price") colIdx.price = colI;
			else if (text.includes("location")) colIdx.location = colI;
			else if (text === "time") colIdx.time = colI;
			else if (text.includes("season")) colIdx.season = colI;
			else if (text.includes("weather")) colIdx.weather = colI;
			else if (text.includes("size")) colIdx.size = colI;
			else if (text.includes("difficulty")) colIdx.difficulty = colI;
			else if (text.includes("base xp") || text === "xp") colIdx.xp = colI;
			colI += colspan;
		}

		if (colIdx.name === undefined || colIdx.price === undefined) continue;

		// Track seen name cells so continuation rows (from rowspan'd name cells) are skipped
		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(":scope > td");

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			// Skip continuation rows: the name cell won't have an <a> link in the right slot
			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			// Deduplicate by name cell reference (rowspan repeats the same DOM node)
			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const fishName = nameLink.text.trim();
			if (!fishName || fishName.toLowerCase() === "name") continue;

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
				getCol(colIdx, cells, "description")?.text.trim() || null;

			// Prices
			const priceCell = getCol(colIdx, cells, "price");
			const [sellPrice, sellSilver, sellGold, sellIridium] = priceCell
				? parsePriceTiers(priceCell.text)
				: [null, null, null, null];

			// Location
			let location: string | null =
				getCol(colIdx, cells, "location")?.text.trim().replace(/\s+/g, " ") ||
				null;

			// Time
			const timeCell = getCol(colIdx, cells, "time");
			let time = timeCell ? parseTime(timeCell) : "Anytime";

			// Season
			const seasonCell = getCol(colIdx, cells, "season");
			let seasons: string[];
			if (seasonCell) {
				seasons = parseSeasons(seasonCell);
				if (seasons.length === 0) seasons = ["All Seasons"];
			} else {
				seasons =
					currentCategory === "Night Market" ? ["Winter"] : ["All Seasons"];
			}

			// Weather
			const weatherCell = getCol(colIdx, cells, "weather");
			let weather: string | null = weatherCell
				? parseWeather(weatherCell)
				: null;

			// Night Market defaults (no location/time/weather columns in that table)
			if (currentCategory === "Night Market") {
				if (!location) location = "Night Market (submarine)";
				if (time === "Anytime") time = "5pm – 2am";
				if (!weather) weather = "Any";
			}

			// Size
			const [minSize, maxSize] = parseSize(getCol(colIdx, cells, "size"));

			// Difficulty & Behavior
			const [difficulty, behavior] = parseDifficultyBehavior(
				getCol(colIdx, cells, "difficulty"),
			);

			// Base XP
			const xpText = getCol(colIdx, cells, "xp")?.text.trim() ?? "";
			const baseXp = xpText ? parseInt(xpText, 10) || null : null;

			fish.push({
				name: fishName,
				category: currentCategory,
				description,
				sell_price: sellPrice,
				sell_price_silver: sellSilver,
				sell_price_gold: sellGold,
				sell_price_iridium: sellIridium,
				location,
				time,
				seasons: JSON.stringify(seasons),
				weather,
				min_size: minSize,
				max_size: maxSize,
				difficulty,
				behavior,
				base_xp: baseXp,
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${fish.length} fish`);
	return fish;
}

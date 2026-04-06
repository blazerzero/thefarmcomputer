import type { HTMLElement } from "node-html-parser";
import type { EnergyHealthStats } from "@/types";

export const WIKI_BASE = "https://stardewvalleywiki.com";
const USER_AGENT =
	"StardewBot/1.0 (Discord lookup bot; github.com/blazerzero/thefarmcomputer)";

/**
 * Fetch a wiki page with up to 3 retries and exponential backoff.
 * @param path  Wiki path, e.g. "/Crops" or "/Abigail"
 * @returns     HTML string
 */
/**
 * Retrieve a table cell by its logical column name, resolving the position
 * via a pre-built column-index map. Hidden child elements are stripped so
 * callers always see the visible text/content only.
 *
 * @param colIdx  Map of column key → zero-based cell index
 * @param cells   Array of `<td>` / `<th>` elements for the current row
 * @param key     Column key to look up
 */
export function getCol(
	colIdx: Record<string, number>,
	cells: HTMLElement[],
	key: string,
): HTMLElement | null {
	const idx = colIdx[key];
	const cell = idx !== undefined ? (cells[idx] ?? null) : null;
	cell
		?.querySelectorAll('[style*="display: none"], style')
		.forEach((el) => el.remove());
	return cell;
}

export function parseIntFrom(text: string): number | null {
	const m = text.replace(/,/g, "").match(/\d+/);
	return m ? parseInt(m[0]!, 10) : null;
}

/**
 * Extract up to four quality-tier sell prices from a cell's text.
 * Matches "Xg" patterns while ignoring rate-style values like "7g/d".
 * Returns [base, silver, gold, iridium], each null if not present.
 */
export function parsePriceTiers(
	text: string,
): [number | null, number | null, number | null, number | null] {
	const matches = [...text.matchAll(/(\d[\d,]*)\s*g(?![\d/])/g)].map((m) =>
		parseInt(m[1]!.replace(/,/g, ""), 10),
	);
	return [
		matches[0] ?? null,
		matches[1] ?? null,
		matches[2] ?? null,
		matches[3] ?? null,
	];
}

/**
 * Parse per-quality energy and health values from an Energy/Health cell.
 * Each quality tier is represented as a row in a nested table; the quality is
 * identified by the img alt text in the .foreimage div (empty = base quality).
 * Returns all-null if the cell says "Inedible" or is absent.
 */
export function parseEnergyHealthStats(
	cell: HTMLElement | null,
): EnergyHealthStats {
	const empty: EnergyHealthStats = {
		energy: null,
		energy_silver: null,
		energy_gold: null,
		energy_iridium: null,
		health: null,
		health_silver: null,
		health_gold: null,
		health_iridium: null,
	};
	if (!cell) return empty;
	if (cell.text.toLowerCase().includes("inedible")) return empty;

	const result = { ...empty };

	for (const row of cell.querySelectorAll("tr")) {
		const img = row.querySelector(".foreimage img");
		const alt = (img?.getAttribute("alt") ?? "").toLowerCase();

		const tier = alt.includes("silver")
			? "silver"
			: alt.includes("gold")
				? "gold"
				: alt.includes("iridium")
					? "iridium"
					: "base";

		const tds = row.querySelectorAll(":scope > td");
		const energyTd = tds[1] ?? null;
		const healthTd = tds[3] ?? null;
		if (!energyTd && !healthTd) continue;

		const energy = energyTd ? parseIntFrom(energyTd.text) : null;
		const health = healthTd ? parseIntFrom(healthTd.text) : null;

		if (tier === "base") {
			result.energy = energy;
			result.health = health;
		} else if (tier === "silver") {
			result.energy_silver = energy;
			result.health_silver = health;
		} else if (tier === "gold") {
			result.energy_gold = energy;
			result.health_gold = health;
		} else {
			result.energy_iridium = energy;
			result.health_iridium = health;
		}
	}

	return result;
}

export async function fetchPage(path: string): Promise<string> {
	const url = WIKI_BASE + path;
	const delays = [2000, 4000, 8000];

	let lastError: unknown;
	for (let attempt = 0; attempt <= delays.length; attempt++) {
		try {
			const resp = await fetch(url, {
				headers: { "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(15_000),
			});
			if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
			return await resp.text();
		} catch (err) {
			lastError = err;
			const delay = delays[attempt];
			if (delay !== undefined) {
				await new Promise((r) => setTimeout(r, delay));
			}
		}
	}

	throw new Error(`Failed to fetch ${url} after retries: ${lastError}`);
}

/**
 * Parse a table cell whose items are separated by <br> tags or other
 * non-anchor block elements (e.g. Source, Location, Used In columns).
 * Images are ignored; link text is preserved inline.
 */
export function parseListCell(cell: HTMLElement): string[] {
	const items = cell.childNodes;
	const parsedItems: string[] = [];
	let goToNewline = false;
	let text = "";

	const flush = () => {
		if (text.trim()) parsedItems.push(text.trim());
		text = "";
	};

	items.forEach((item, index) => {
		if (item.rawTagName === "ul") {
			parsedItems.push(...parseListCell(item as HTMLElement));
			return;
		}
		// <p> blocks each become a separate group of items
		if (item.rawTagName === "p") {
			if (item.text.startsWith("(")) {
				text += ` ${item.text}`; // parenthetical notes are kept inline with the preceding item
				return;
			}
			flush();
			parsedItems.push(...parseListCell(item as HTMLElement));
			return;
		}
		if (item.rawTagName === "img") return;
		// <br> flushes accumulated text immediately as a new item
		if (item.rawTagName === "br") {
			flush();
			return;
		}
		if (
			item.rawTagName &&
			!["a", "b", "i"].includes(item.rawTagName) &&
			(index === items.length - 1 || items[index + 1]?.rawTagName)
		) {
			// Only go to a newline if the current item has a tag and the next item has a different tag (or is the last item).
			// This prevents unnecessary newlines between consecutive text nodes or inline formatting tags, which are often used together without separators.
			goToNewline = true;
		}
		if (
			!item.rawTagName &&
			index < items.length - 1 &&
			items[index + 1]?.rawTagName === "ul"
		) {
			goToNewline = true;
		}
		const itemText = item.text.replace(/\s+/g, " ");
		text += itemText;
		if (goToNewline || index === items.length - 1) {
			flush();
			goToNewline = false;
		}
	});
	return parsedItems;
}

import type { HTMLElement } from "node-html-parser";

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
	items.forEach((item, index) => {
		if (item.rawTagName === "ul") {
			parsedItems.push(...parseListCell(item as HTMLElement));
			return;
		}
		if (item.rawTagName === "img") return;
		if (item.rawTagName && item.rawTagName !== "a") {
			goToNewline = true;
			if (item.rawTagName === "br") return;
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
			if (text.trim()) parsedItems.push(text.trim());
			text = "";
			goToNewline = false;
		}
	});
	return parsedItems;
}

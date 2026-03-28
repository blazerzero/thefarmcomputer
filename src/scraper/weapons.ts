import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { WeaponRow } from "../types";
import { fetchPage, getCol, WIKI_BASE } from "./wiki";

// Map plural heading text → singular category name
const CATEGORY_MAP: Record<string, string> = {
	swords: "Sword",
	daggers: "Dagger",
	clubs: "Club",
	hammers: "Hammer",
	spears: "Spear",
	staves: "Staff",
	scythes: "Scythe",
};

function headingToCategory(text: string): string | null {
	const key = text.toLowerCase().trim();
	return CATEGORY_MAP[key] ?? null;
}

/** Parse a damage cell that may contain a range like "5-10" or "5 – 10". */
function parseDamage(text: string): [number | null, number | null] {
	const range = text.match(/(\d+)\s*[–-]\s*(\d+)/);
	if (range) return [parseInt(range[1]!, 10), parseInt(range[2]!, 10)];
	const single = text.match(/^(\d+)$/);
	if (single) {
		const n = parseInt(single[1]!, 10);
		return [n, n];
	}
	return [null, null];
}

/** Parse crit chance from text like "+.02" or "0.02" → 2.0 (0–100 scale). */
function parseCritChance(text: string): number | null {
	const m = text.match(/([\d.]+)/);
	if (!m) return null;
	const val = parseFloat(m[1]!);
	if (isNaN(val)) return null;
	// Values like 0.02 need to be converted to 2.0; values already >1 are left as-is
	return val <= 1 ? Math.round(val * 10000) / 100 : val;
}

/** Parse a plain integer from a cell; returns null if absent or non-numeric. */
function parseIntOrNull(text: string): number | null {
	const m = text.match(/(-?\d+)/);
	if (!m) return null;
	const n = parseInt(m[1]!, 10);
	return isNaN(n) ? null : n;
}

/** Parse a gold price from a cell like "500g" or "1,500g"; returns null if absent. */
function parseGoldPrice(cell: HTMLElement): number | null {
	const m = cell.text.match(/(\d[\d,]*)\s*g/i);
	return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

/** Parse a float from a cell (for crit multiplier like "3" or "3.0"). */
function parseFloatOrNull(text: string): number | null {
	const m = text.match(/([\d.]+)/);
	if (!m) return null;
	const n = parseFloat(m[1]!);
	return isNaN(n) ? null : n;
}

/**
 * Parse a combined stats cell containing nametemplate spans, e.g.:
 *   <span class="nametemplate">Speed (−2)</span>
 *   <span class="nametemplate">Defense (+1)</span>
 *   <span class="nametemplate">Weight (+3)</span>
 * Known stats (speed, defense, weight) are returned as typed fields.
 * Everything else is collected in extra_stats as {name, value} pairs.
 */
function parseStatsCell(cell: HTMLElement): {
	speed: number | null;
	defense: number | null;
	weight: number | null;
	crit_chance: number | null;
	crit_power: number | null;
	extra_stats: Array<{ name: string; value: string }>;
} {
	const result = {
		speed: null as number | null,
		defense: null as number | null,
		weight: null as number | null,
		crit_chance: null as number | null,
		crit_power: null as number | null,
		extra_stats: [] as Array<{ name: string; value: string }>,
	};
	const elems = cell.querySelectorAll(
		"span.nametemplate, a[title='Forge']",
	) as unknown as HTMLElement[];

	for (const elem of elems) {
		const link = elem.tagName === "A" ? elem : elem.querySelector("a");
		if (!link) continue;
		const isEnchantment = elem.attributes.title === "Forge";
		let statName = link.text.trim();
		if (isEnchantment) statName = `Enchantment: ${statName}`;
		const statKey = statName.toLowerCase();
		// Normalize Unicode minus sign (U+2212) to ASCII hyphen before parsing
		const text = elem.text.replace(/\u2212/g, "-");
		// Extract raw value from parentheses
		const rawValue = text.match(/\(([^)]+)\)/)?.[1]?.trim() ?? "";

		const n = parseInt(rawValue, 10);
		if (statKey === "speed") {
			result.speed = isNaN(n) ? null : n;
		} else if (statKey === "defense") {
			result.defense = isNaN(n) ? null : n;
		} else if (statKey === "weight") {
			result.weight = isNaN(n) ? null : n;
		} else if (statKey === "crit. chance") {
			result.crit_chance = isNaN(n) ? null : n;
		} else if (statKey === "crit. power") {
			result.crit_power = isNaN(n) ? null : n;
		} else {
			result.extra_stats.push({ name: statName, value: rawValue });
		}
	}

	return result;
}

// ── Main scraper ───────────────────────────────────────────────────────────────

export async function scrapeWeapons(): Promise<
	Omit<WeaponRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Weapons");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const weapons: Omit<WeaponRow, "id" | "last_updated">[] = [];
	let currentCategory = "Sword";

	const elements = content.querySelectorAll(
		"h2, h3, table.wikitable",
	) as unknown as HTMLElement[];

	for (const el of elements) {
		const tag = el.tagName;

		// ── Section heading — update current category ──────────────────────────
		if (tag === "H2" || tag === "H3") {
			const text = (el.querySelector(".mw-headline") ?? el).text.trim();
			const cat = headingToCategory(text);
			if (cat) currentCategory = cat;
			continue;
		}

		// ── Weapon data table ──────────────────────────────────────────────────
		const allRows = el.querySelectorAll(
			":scope > tbody > tr",
		) as unknown as HTMLElement[];
		if (allRows.length < 2) continue;

		// Parse header row to build column index map
		const headerRow = allRows[0]!;
		const headerCells = headerRow.querySelectorAll(
			":scope > th",
		) as unknown as HTMLElement[];
		if (headerCells.length < 2) continue;

		const colIdx: Record<string, number> = {};
		let colI = 0;
		for (const th of headerCells) {
			const text = th.text.toLowerCase().trim();
			const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);

			if (text === "image" || text === "img") colIdx.image = colI;
			else if (text === "name") colIdx.name = colI;
			else if (text.includes("min") && text.includes("damage"))
				colIdx.min_damage = colI;
			else if (text.includes("max") && text.includes("damage"))
				colIdx.max_damage = colI;
			else if (
				text.includes("damage") &&
				!text.includes("min") &&
				!text.includes("max")
			)
				colIdx.damage = colI;
			else if (text === "stats" || text === "stat") colIdx.stats = colI;
			else if (text === "speed") colIdx.speed = colI;
			else if (text === "defense" || text === "def") colIdx.defense = colI;
			else if (text === "weight" || text === "knockback") colIdx.weight = colI;
			else if (text.includes("crit") && text.includes("chance"))
				colIdx.crit_chance = colI;
			else if (text.includes("crit") && text.includes("power"))
				colIdx.crit_power = colI;
			else if (text === "level" || text === "lvl") colIdx.level = colI;
			else if (text.includes("sell")) colIdx.sell_price = colI;
			else if (
				text.includes("purchase") ||
				text.includes("buy") ||
				text === "price"
			)
				colIdx.purchase_price = colI;
			else if (
				text.includes("location") ||
				text === "obtain" ||
				text === "obtained from"
			)
				colIdx.location = colI;
			else if (
				text === "description" ||
				text === "desc" ||
				text === "source" ||
				text === "notes"
			)
				colIdx.description = colI;

			colI += colspan;
		}

		// Must have at least a name column to be worth parsing
		if (colIdx.name === undefined) continue;

		const seenNameCells = new Set<HTMLElement>();

		for (let i = 1; i < allRows.length; i++) {
			const row = allRows[i]!;
			const cells = row.querySelectorAll(
				":scope > td",
			) as unknown as HTMLElement[];

			const nameCell = getCol(colIdx, cells, "name");
			if (!nameCell) continue;

			// Skip rows without a weapon name link
			const nameLink = nameCell.querySelector("a");
			if (!nameLink) continue;

			// Deduplicate rowspan'd name cells
			if (seenNameCells.has(nameCell)) continue;
			seenNameCells.add(nameCell);

			const weaponName = nameLink.text.trim();
			if (!weaponName || weaponName.toLowerCase() === "name") continue;

			const href = nameLink.getAttribute("href") ?? "";
			const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

			// Image
			let imageUrl: string | null = null;
			const imageCell = getCol(colIdx, cells, "image");
			if (imageCell) {
				const img = imageCell.querySelector("img");
				const src = img?.getAttribute("src") ?? "";
				if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
			}

			// Damage — handle separate min/max columns or a single range column
			let minDamage: number | null = null;
			let maxDamage: number | null = null;
			if (colIdx.min_damage !== undefined && colIdx.max_damage !== undefined) {
				minDamage = parseIntOrNull(
					getCol(colIdx, cells, "min_damage")?.text ?? "",
				);
				maxDamage = parseIntOrNull(
					getCol(colIdx, cells, "max_damage")?.text ?? "",
				);
			} else if (colIdx.damage !== undefined) {
				[minDamage, maxDamage] = parseDamage(
					getCol(colIdx, cells, "damage")?.text.trim() ?? "",
				);
			}

			// Stats — combined "Stats" cell takes precedence over individual columns
			let speed: number | null;
			let defense: number | null;
			let weight: number | null;
			let critChance: number | null;
			let critPower: number | null;
			let extraStats: Array<{ name: string; value: string }> = [];
			const statsCell = getCol(colIdx, cells, "stats");
			if (statsCell) {
				({
					speed,
					defense,
					weight,
					crit_chance: critChance,
					crit_power: critPower,
					extra_stats: extraStats,
				} = parseStatsCell(statsCell));
			} else {
				speed = parseIntOrNull(
					getCol(colIdx, cells, "speed")?.text.trim() ?? "",
				);
				defense = parseIntOrNull(
					getCol(colIdx, cells, "defense")?.text.trim() ?? "",
				);
				weight = parseFloatOrNull(
					getCol(colIdx, cells, "weight")?.text.trim() ?? "",
				);
				critChance = parseCritChance(
					getCol(colIdx, cells, "crit_chance")?.text.trim() ?? "",
				);
				critPower = parseFloatOrNull(
					getCol(colIdx, cells, "crit_power")?.text.trim() ?? "",
				);
			}
			const level = parseIntOrNull(
				getCol(colIdx, cells, "level")?.text.trim() ?? "",
			);

			// Prices
			const sellPriceCell = getCol(colIdx, cells, "sell_price");
			const sellPrice = sellPriceCell ? parseGoldPrice(sellPriceCell) : null;
			const purchasePriceCell = getCol(colIdx, cells, "purchase_price");
			const purchasePrice = purchasePriceCell
				? parseGoldPrice(purchasePriceCell)
				: null;

			// Location
			const location =
				getCol(colIdx, cells, "location")?.text.replace(/\s+/g, " ").trim() ||
				null;

			// Description / source
			const descText =
				getCol(colIdx, cells, "description")
					?.text.replace(/\s+/g, " ")
					.trim() || null;

			weapons.push({
				name: weaponName,
				category: currentCategory,
				min_damage: minDamage,
				max_damage: maxDamage,
				speed,
				defense,
				weight,
				crit_chance: critChance,
				crit_power: critPower,
				level,
				sell_price: sellPrice,
				purchase_price: purchasePrice,
				location,
				description: descText,
				extra_stats: extraStats.length > 0 ? JSON.stringify(extraStats) : null,
				image_url: imageUrl,
				wiki_url: wikiUrl,
			});
		}
	}

	console.log(`Scraped ${weapons.length} weapons`);
	return weapons;
}

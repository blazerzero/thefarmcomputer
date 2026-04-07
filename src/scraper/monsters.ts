import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { MonsterRow } from "@/types";
import { fetchPage, WIKI_BASE } from "./wiki";

// ── Cell parsers ──────────────────────────────────────────────────────────────

/** Parse the drops cell, returning an array of drop strings like "Sap (15%)". */
function parseDrops(cell: HTMLElement): string[] {
	const drops: string[] = [];
	let inlineHtml = "";

	// Flush any accumulated inline content (e.g. `<img> 1-2 <a>Bat Wings</a> (94%)`)
	// as a single drop entry.
	const flushInline = () => {
		const text = inlineHtml
			.replace(/<[^>]*>/g, "") // strip HTML tags
			.replace(/\[\d+\]/g, "") // strip footnote refs like [1]
			.replace(/\s+/g, " ")
			.trim();
		if (text && text !== "—") drops.push(text);
		inlineHtml = "";
	};

	// Walk direct children in document order so that <p> headers and spans are
	// interleaved correctly, and <i> cross-reference pointers are skipped.
	for (const child of cell.childNodes) {
		if (child.nodeType !== 1) {
			// Text node — accumulate as part of a potential inline item
			inlineHtml += child.text;
			continue;
		}

		const el = child as HTMLElement;
		const tag = (el.rawTagName ?? el.tagName ?? "").toLowerCase();

		if (tag === "i") {
			// Italicised cross-reference pointer (e.g. "See tables for specific
			// drops.") — flush any pending inline item, then skip this element.
			flushInline();
		} else if (tag === "p") {
			// Conditional context header (e.g. "If reached bottom of Mines:")
			flushInline();
			const text = el.text.replace(/\s+/g, " ").trim();
			if (text) drops.push(text);
		} else if (tag === "span") {
			flushInline();
			const cls = el.getAttribute("class") ?? "";
			if (cls.includes("nametemplate") || cls.includes("no-wrap")) {
				const text = el.text
					.replace(/\[\d+\]/g, "")
					.replace(/\s+/g, " ")
					.trim();
				if (text) drops.push(text);
			}
		} else if (tag === "sup") {
			// Footnote reference — discard entirely
		} else if (tag === "img" || tag === "a") {
			// Part of an inline drop (icon + name + percentage before any span)
			inlineHtml += el.outerHTML;
		}
		// link, style, br, etc. — ignore
	}

	flushInline();

	// ── Fallback: bulleted list or plain text ─────────────────────────────────
	if (drops.length === 0) {
		const lis = cell.querySelectorAll("li");
		if (lis.length > 0) {
			for (const li of lis) {
				const text = li.text
					.replace(/\[\d+\]/g, "")
					.replace(/\s+/g, " ")
					.trim();
				if (text) drops.push(text);
			}
		} else {
			const text = cell.text
				.replace(/\[\d+\]/g, "")
				.replace(/\s+/g, " ")
				.trim();
			if (text && text !== "—") drops.push(text);
		}
	}

	return drops;
}

/** Normalize text from a location or stat cell. */
function cellText(cell: HTMLElement): string | null {
	const text = cell.text.replace(/\s+/g, " ").trim();
	return text || null;
}

// ── Variations-table parser ────────────────────────────────────────────────────

interface MonsterVariation {
	name: string;
	hp: string | null;
	damage: string | null;
	defense: string | null;
	speed: string | null;
	xp: string | null;
	location: string | null;
	drops: string[];
	image_url: string | null;
}

/**
 * Parse a wikitable with style="text-align:center;" from a monster page.
 *
 * Handles two formats:
 *
 * Full format — 7-column table with per-variation name headers:
 *   <tr><th colspan="8">VariationName</th></tr>
 *   <tr><td rowspan="3"><img …></td></tr>
 *   <tr><td><b>HP</b></td><td><b>Damage</b></td>…<td><b>Drops</b></td></tr>
 *   <tr><td>hp_val</td>…<td>drops</td></tr>
 *
 * Short format — 4-column table (Image / Name / Location / Drops) used when
 * stats are stored in the infoboxtable instead (e.g. Bats). Stats will be
 * null in the returned variations; the caller should supplement from the
 * infobox via parseInfoboxVariations.
 */
function parseVariationsTable(table: HTMLElement): MonsterVariation[] {
	const ths = table.querySelectorAll("th");
	const headerTexts = ths.map((th) => th.text.trim().toLowerCase());

	// ── Short format: has a "Name" column but no "hp" column ─────────────────
	if (
		headerTexts.includes("name") &&
		!headerTexts.some((h) => h === "hp" || h === "base hp")
	) {
		const rows = table.querySelectorAll("tr");
		const variations: MonsterVariation[] = [];
		for (const row of rows) {
			if (row.querySelector("th")) continue;
			const tds = row.querySelectorAll(":scope > td");
			if (tds.length < 4) continue;
			const [imageTd, nameTd, locationTd, dropsTd] = tds;
			const img = imageTd!.querySelector("img");
			const src = img?.getAttribute("src") ?? null;
			const image_url = src
				? src.startsWith("http")
					? src
					: WIKI_BASE + src
				: null;
			const name = nameTd!.text.replace(/\s+/g, " ").trim();
			const location = cellText(locationTd!);
			const drops = parseDrops(dropsTd!);
			if (name)
				variations.push({
					name,
					hp: null,
					damage: null,
					defense: null,
					speed: null,
					xp: null,
					location,
					drops,
					image_url,
				});
		}
		return variations;
	}

	// ── Full format: <th colspan="7/8"> variation name headers ───────────────
	const rows = table.querySelectorAll("tr");
	const variations: MonsterVariation[] = [];
	let currentName: string | null = null;
	let pendingImage: string | null = null;

	for (const row of rows) {
		const th = row.querySelector("th");
		const tds = row.querySelectorAll(":scope > td");

		// ── Variation name header: <th colspan="8"> or <th colspan="7"> ──────
		if (th && !tds.length) {
			const colspan = th.getAttribute("colspan") ?? "";
			if (colspan === "8" || colspan === "7") {
				currentName = th.text.replace(/\[\d+\]/g, "").trim();
				pendingImage = null;
			}
			continue;
		}

		// ── Image row: single td with rowspan="3" ────────────────────────────
		if (tds.length === 1 && tds[0]!.getAttribute("rowspan") === "3") {
			const img = tds[0]!.querySelector("img");
			const src = img?.getAttribute("src") ?? null;
			pendingImage = src
				? src.startsWith("http")
					? src
					: WIKI_BASE + src
				: null;
			continue;
		}

		// ── Notes row: first td contains <b>Notes:</b> ───────────────────────
		if (tds.length > 0 && tds[0]!.querySelector("b")) {
			const bText = tds[0]!.querySelector("b")?.text.trim().toLowerCase() ?? "";
			if (bText.includes("note")) continue;
		}

		// ── Header row: 7 tds with <b> tags (HP / Damage / … / Drops) ────────
		if (tds.length >= 7 && tds.some((td) => td.querySelector("b"))) continue;

		// ── Data row: 7 tds with actual values ───────────────────────────────
		if (tds.length >= 7 && currentName) {
			const [hp, damage, defense, speed, xp, location, drops] = tds;
			variations.push({
				name: currentName,
				hp: cellText(hp!),
				damage: cellText(damage!),
				defense: cellText(defense!),
				speed: cellText(speed!),
				xp: cellText(xp!),
				location: cellText(location!),
				drops: drops ? parseDrops(drops) : [],
				image_url: pendingImage,
			});
		}
	}

	return variations;
}

// ── Infobox multi-variation parser ────────────────────────────────────────────

/**
 * Parse a detail cell where each variation is represented as an img+value pair:
 *   <img alt="Bat.png"> 24, <img alt="Frost Bat.png"> 36, …
 * Returns a map of variation name → value string.
 */
function parseMultiVariationCell(cell: HTMLElement): Map<string, string> {
	const result = new Map<string, string>();
	const imgs = cell.querySelectorAll("img");
	if (imgs.length <= 1) return result;

	// Split innerHTML on <img> tag boundaries.
	// segments[i+1] is the raw HTML sitting between imgs[i] and imgs[i+1].
	const segments = cell.innerHTML.split(/<img\b[^>]*>/i);
	const pendingNames: string[] = [];

	for (let i = 0; i < imgs.length; i++) {
		const alt = imgs[i]!.getAttribute("alt") ?? "";
		pendingNames.push(alt.replace(/\.png$/i, "").trim());

		// Strip any nested tags (e.g. <br>), then trim trailing comma/whitespace
		const raw = (segments[i + 1] ?? "")
			.replace(/<[^>]*>/g, "")
			.trim()
			.replace(/,\s*$/, "")
			.trim();

		if (raw) {
			const num = Number(raw);
			const stored = Number.isFinite(num) ? String(num) : raw;
			for (const name of pendingNames) result.set(name, stored);
			pendingNames.length = 0;
		}
		// No text yet → keep accumulating names (they share the next value)
	}

	return result;
}

/**
 * Handle infoboxes where each stat cell lists per-variation values via img+text
 * pairs (e.g. the Bat page). Returns one row per variation, or an empty array
 * if the infobox does not use this format.
 */
function parseInfoboxVariations(
	root: HTMLElement,
	wikiUrl: string,
): Omit<MonsterRow, "id" | "last_updated">[] {
	const infobox = root.querySelector("#infoboxtable");
	if (!infobox) return [];

	// Collect label → detail cell pairs
	const fields: Record<string, HTMLElement> = {};
	const rows = infobox.querySelectorAll("tr");
	for (const row of rows) {
		const tds = row.querySelectorAll("td");
		if (tds.length < 2) continue;
		const labelTd = tds[0]!;
		const valueTd = tds[1]!;
		if (labelTd.getAttribute("id") !== "infoboxsection") continue;
		if (valueTd.getAttribute("id") !== "infoboxdetail") continue;
		const label = labelTd.text.trim().toLowerCase().replace(/:$/, "").trim();
		fields[label] = valueTd;
	}

	// Only proceed if at least one stat cell has multiple img elements
	const statKeys = ["base hp", "base damage", "base def", "speed", "xp"];
	const hasMultiVariation = statKeys.some(
		(k) => (fields[k]?.querySelectorAll("img") ?? []).length > 1,
	);
	if (!hasMultiVariation) return [];

	// Parse per-variation values and collect images from stat cells.
	// Cells with a single value (0–1 imgs) become defaults for all variations.
	const statMaps: Record<string, Map<string, string>> = {};
	const statDefaults: Record<string, string> = {};
	const allNames: string[] = [];
	const seenNames = new Set<string>();
	const imageMap = new Map<string, string>();

	for (const key of statKeys) {
		const cell = fields[key];
		if (!cell) continue;
		const imgs = cell.querySelectorAll("img");
		// Collect images regardless of cell type
		for (const img of imgs) {
			const alt = img.getAttribute("alt") ?? "";
			const name = alt.replace(/\.png$/i, "").trim();
			if (!imageMap.has(name)) {
				const src = img.getAttribute("src") ?? null;
				if (src)
					imageMap.set(name, src.startsWith("http") ? src : WIKI_BASE + src);
			}
		}
		if (imgs.length > 1) {
			// Per-variation cell
			const map = parseMultiVariationCell(cell);
			statMaps[key] = map;
			for (const name of map.keys()) {
				if (!seenNames.has(name)) {
					seenNames.add(name);
					allNames.push(name);
				}
			}
		} else {
			// Single value shared by all variations
			const rawText = cell.text.trim();
			if (rawText && rawText !== "—") {
				const num = Number(rawText);
				statDefaults[key] = Number.isFinite(num) ? String(num) : rawText;
			}
		}
	}

	if (allNames.length === 0) return [];

	// Location is shared across all variations in this infobox format
	const spawnsIn = fields["spawns in"]?.text.trim() ?? null;
	const floors = fields["floors"]?.text.trim() ?? null;
	const location = spawnsIn
		? floors
			? `${spawnsIn} (Floors ${floors})`
			: spawnsIn
		: null;

	const drops = fields["drops"] ? parseDrops(fields["drops"]) : [];

	return allNames.map((name) => ({
		name,
		location,
		hp: statMaps["base hp"]?.get(name) ?? statDefaults["base hp"] ?? null,
		damage:
			statMaps["base damage"]?.get(name) ?? statDefaults["base damage"] ?? null,
		defense:
			statMaps["base def"]?.get(name) ?? statDefaults["base def"] ?? null,
		speed: statMaps["speed"]?.get(name) ?? statDefaults["speed"] ?? null,
		xp: statMaps["xp"]?.get(name) ?? statDefaults["xp"] ?? null,
		drops: JSON.stringify(drops),
		image_url: imageMap.get(name) ?? null,
		wiki_url: wikiUrl,
	}));
}

// ── Infobox parser ────────────────────────────────────────────────────────────

/**
 * Parse the #infoboxtable that appears on individual monster pages when there
 * is no multi-variation wikitable.  Returns null if no infobox is found.
 *
 * Infobox row structure:
 *   <tr><td id="infoboxsection">Label:</td><td id="infoboxdetail">Value</td></tr>
 * (The wiki reuses the same id on multiple rows, so we walk all rows manually.)
 */
function parseInfobox(
	root: HTMLElement,
	fallbackName: string,
): Omit<MonsterRow, "id" | "last_updated" | "wiki_url"> | null {
	const infobox = root.querySelector("#infoboxtable");
	if (!infobox) return null;

	// Monster name from the header cell
	const header = infobox.querySelector("#infoboxheader");
	const name = header?.text.trim() || fallbackName;

	// Image — first <img> inside the table
	const imgEl = infobox.querySelector("img");
	const imgSrc = imgEl?.getAttribute("src") ?? null;
	const image_url = imgSrc
		? imgSrc.startsWith("http")
			? imgSrc
			: WIKI_BASE + imgSrc
		: null;

	// Collect label → detail cell pairs by walking every row
	const fields: Record<string, HTMLElement> = {};
	const rows = infobox.querySelectorAll("tr");
	for (const row of rows) {
		const tds = row.querySelectorAll("td");
		if (tds.length < 2) continue;
		const labelTd = tds[0]!;
		const valueTd = tds[1]!;
		if (labelTd.getAttribute("id") !== "infoboxsection") continue;
		if (valueTd.getAttribute("id") !== "infoboxdetail") continue;
		const label = labelTd.text.trim().toLowerCase().replace(/:$/, "").trim();
		fields[label] = valueTd;
	}

	// Build location string by combining "spawns in" + "floors"
	const spawnsIn = fields["spawns in"]?.text.trim() ?? null;
	const floors = fields["floors"]?.text.trim() ?? null;
	const location = spawnsIn
		? floors
			? `${spawnsIn} (Floors ${floors})`
			: spawnsIn
		: null;

	const hp = fields["base hp"]?.text.trim() || null;
	const damage = fields["base damage"]?.text.trim() || null;
	const defense = fields["base def"]?.text.trim() || null;
	const speed = fields["speed"]?.text.trim() || null;
	const xp = fields["xp"]?.text.trim() || null;
	const drops = fields["drops"] ? parseDrops(fields["drops"]) : [];

	return {
		name,
		location,
		hp,
		damage,
		defense,
		speed,
		xp,
		drops: JSON.stringify(drops),
		image_url,
	};
}

// ── Page-link collector ────────────────────────────────────────────────────────

/**
 * Fetch /Monsters and return a Map of wiki-path → display-name for every
 * unique monster page linked from nametemplate spans.
 */
async function getMonsterPaths(): Promise<Map<string, string>> {
	const html = await fetchPage("/Monsters");
	const root = parse(html);
	const paths = new Map<string, string>();

	const spans = root.querySelectorAll(
		"span.nametemplate, span.nametemplateinline",
	);

	for (const span of spans) {
		const link = span.querySelector("a");
		if (!link) continue;

		const href = link.getAttribute("href") ?? "";
		// Keep only root wiki paths; skip anchors and external links
		if (!href.startsWith("/") || href.startsWith("//") || href.includes("#"))
			continue;

		const name = link.getAttribute("title") ?? link.text.trim();
		if (!paths.has(href)) paths.set(href, name);
	}

	return paths;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeMonsters(): Promise<
	Omit<MonsterRow, "id" | "last_updated">[]
> {
	const monsterPaths = await getMonsterPaths();
	console.log(`Found ${monsterPaths.size} unique monster page paths`);

	const allMonsters: Omit<MonsterRow, "id" | "last_updated">[] = [];
	const paths = Array.from(monsterPaths.entries());
	const BATCH_SIZE = 5;

	for (let i = 0; i < paths.length; i += BATCH_SIZE) {
		const batch = paths.slice(i, i + BATCH_SIZE);

		const results = await Promise.allSettled(
			batch.map(async ([path, fallbackName]) => {
				const wikiUrl = WIKI_BASE + path;

				let html: string;
				try {
					html = await fetchPage(path);
				} catch (err) {
					console.warn(`Failed to fetch monster page ${path}:`, err);
					return [];
				}

				const root = parse(html);
				const content = root.querySelector("#mw-content-text") ?? root;

				// Find all wikitables that use text-align:center (variation tables)
				const tables = content.querySelectorAll("table.wikitable");
				const pageMonsters: Omit<MonsterRow, "id" | "last_updated">[] = [];

				// Parse infobox once — needed when short tables are present.
				// Build two lookup maps: exact name and a normalized form that converts
				// "(dangerous)" → "Dangerous" to match infobox alt-text naming.
				const infoboxRows = parseInfoboxVariations(root, wikiUrl);
				const statsByName = new Map<
					string,
					Omit<MonsterRow, "id" | "last_updated">
				>();
				for (const row of infoboxRows) {
					statsByName.set(row.name, row);
					// Also index by the "(dangerous)" spelling that wikitables use
					const normalized = row.name.replace(/\s+Dangerous$/i, " (dangerous)");
					if (normalized !== row.name) statsByName.set(normalized, row);
				}
				const claimedInfoboxNames = new Set<string>();

				for (const table of tables) {
					const style = table.getAttribute("style") ?? "";
					if (
						!style.includes("text-align:center") &&
						!style.includes("text-align: center")
					)
						continue;

					const variations = parseVariationsTable(table);
					if (variations.length === 0) continue;

					// Short format: hp is null — supplement stats from infobox
					if (variations[0]!.hp === null) {
						// Shared base drops from the infobox (e.g. Sap, Slime) apply to
						// every variation on this page — grab them once from any infobox row.
						const sharedDrops: string[] =
							infoboxRows.length > 0
								? (JSON.parse(infoboxRows[0]!.drops) as string[])
								: [];

						for (const v of variations) {
							const stats = statsByName.get(v.name);
							const infoboxKey = infoboxRows.find(
								(r) => r.name === stats?.name,
							)?.name;
							if (infoboxKey) claimedInfoboxNames.add(infoboxKey);
							pageMonsters.push({
								name: v.name,
								location: v.location,
								hp: stats?.hp ?? null,
								damage: stats?.damage ?? null,
								defense: stats?.defense ?? null,
								speed: stats?.speed ?? null,
								xp: stats?.xp ?? null,
								drops: JSON.stringify([...v.drops, ...sharedDrops]),
								image_url: v.image_url, // prefer wikitable (animated) image
								wiki_url: wikiUrl,
							});
						}
					} else {
						// Full format: stats are in the wikitable
						for (const v of variations) {
							pageMonsters.push({
								name: v.name,
								location: v.location,
								hp: v.hp,
								damage: v.damage,
								defense: v.defense,
								speed: v.speed,
								xp: v.xp,
								drops: JSON.stringify(v.drops),
								image_url: v.image_url,
								wiki_url: wikiUrl,
							});
						}
					}
				}

				// Push infobox-only variations not covered by any wikitable row
				if (claimedInfoboxNames.size > 0) {
					for (const row of infoboxRows) {
						if (!claimedInfoboxNames.has(row.name)) {
							pageMonsters.push(row);
						}
					}
				}

				// Fallback: use already-parsed infobox variations, or a plain single-row
				// infobox parse for pages without a multi-variation format.
				if (pageMonsters.length === 0) {
					if (infoboxRows.length > 0) {
						pageMonsters.push(...infoboxRows);
					} else {
						const infoboxData = parseInfobox(root, fallbackName);
						if (infoboxData) {
							pageMonsters.push({ ...infoboxData, wiki_url: wikiUrl });
						}
					}
				}

				return pageMonsters;
			}),
		);

		for (const result of results) {
			if (result.status === "fulfilled") {
				allMonsters.push(...result.value);
			}
		}
	}

	console.log(`Scraped ${allMonsters.length} monsters`);
	return allMonsters;
}

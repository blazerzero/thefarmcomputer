import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { ArtifactRow } from "@/types";
import {
	fetchPage,
	getCol,
	parseListCell,
	parsePriceTiers,
	WIKI_BASE,
} from "./wiki";

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeArtifacts(): Promise<
	Omit<ArtifactRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Artifacts");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const artifacts: Omit<ArtifactRow, "id" | "last_updated">[] = [];

	const table = content.querySelector("table.wikitable");
	if (!table) {
		console.warn("No wikitable found on Artifacts page");
		return artifacts;
	}

	const allRows = table.querySelectorAll(":scope > tbody > tr");
	if (allRows.length < 2) return artifacts;

	// Parse header row to build column index map
	const headerRow = allRows[0]!;
	const headerCells = headerRow.querySelectorAll(":scope > th");

	const colIdx: Record<string, number> = {};
	let colI = 0;
	for (const th of headerCells) {
		const text = th.text.toLowerCase().trim();
		const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);
		if (text === "image") colIdx.image = colI;
		else if (text === "name") colIdx.name = colI;
		else if (text === "description") colIdx.description = colI;
		else if (text.includes("sell") || text.includes("price"))
			colIdx.sell_price = colI;
		else if (text === "location" || text.includes("found"))
			colIdx.location = colI;
		colI += colspan;
	}

	if (colIdx.name === undefined) return artifacts;

	const seenNameCells = new Set<HTMLElement>();
	// name → all artifact indices + their alt texts, for resolving duplicates
	const seenNames = new Map<
		string,
		{ indices: number[]; alts: (string | null)[] }
	>();

	for (let i = 1; i < allRows.length; i++) {
		const row = allRows[i]!;
		const cells = row.querySelectorAll(":scope > td");

		const nameCell = getCol(colIdx, cells, "name");
		if (!nameCell) continue;

		const nameLink = nameCell.querySelector("a");
		if (!nameLink) continue;

		if (seenNameCells.has(nameCell)) continue;
		seenNameCells.add(nameCell);

		const artifactName = nameLink.text.trim();
		if (!artifactName || artifactName.toLowerCase() === "name") continue;

		const href = nameLink.getAttribute("href") ?? "";
		const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

		// Image
		const imageCell = getCol(colIdx, cells, "image");
		let imageUrl: string | null = null;
		const img = imageCell?.querySelector("img") ?? null;
		if (img) {
			const src = img.getAttribute("src") ?? "";
			if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
		}

		// Resolve name: on any duplicate, use image alt text ("[Name].png") for all entries sharing that name
		const nameFromAlt = (imgEl: HTMLElement | null): string | null => {
			const alt = imgEl?.getAttribute("alt") ?? "";
			return alt.endsWith(".png") ? alt.slice(0, -4) : null;
		};

		const altName = nameFromAlt(img);
		let resolvedName = artifactName;
		const entry = seenNames.get(artifactName);
		if (entry) {
			// Fix all previously-pushed artifacts with this name
			for (let j = 0; j < entry.indices.length; j++) {
				const prevAlt = entry.alts[j];
				if (prevAlt) artifacts[entry.indices[j]!]!.name = prevAlt;
			}
			resolvedName = altName ?? artifactName;
			entry.indices.push(artifacts.length);
			entry.alts.push(altName);
		} else {
			seenNames.set(artifactName, {
				indices: [artifacts.length],
				alts: [altName],
			});
		}

		// Description
		const description =
			getCol(colIdx, cells, "description")?.text.trim().replace(/\s+/g, " ") ||
			null;

		// Sell price
		const sellPriceCell = getCol(colIdx, cells, "sell_price");
		const sellPrice = sellPriceCell
			? (parsePriceTiers(sellPriceCell.text)[0] ?? null)
			: null;

		// Location (bullet list)
		const locationCell = getCol(colIdx, cells, "location");
		const location = locationCell ? parseListCell(locationCell) : [];

		artifacts.push({
			name: resolvedName,
			description,
			sell_price: sellPrice,
			location: JSON.stringify(location),
			image_url: imageUrl,
			wiki_url: wikiUrl,
		});
	}

	console.log(`Scraped ${artifacts.length} artifacts`);
	return artifacts;
}

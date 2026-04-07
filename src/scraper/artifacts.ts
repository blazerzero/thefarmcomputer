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

	const table = content.querySelector("table.wikitable") as unknown as
		| HTMLElement
		| undefined;
	if (!table) {
		console.warn("No wikitable found on Artifacts page");
		return artifacts;
	}

	const allRows = table.querySelectorAll(
		":scope > tbody > tr",
	) as unknown as HTMLElement[];
	if (allRows.length < 2) return artifacts;

	// Parse header row to build column index map
	const headerRow = allRows[0]!;
	const headerCells = headerRow.querySelectorAll(
		":scope > th",
	) as unknown as HTMLElement[];

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

	for (let i = 1; i < allRows.length; i++) {
		const row = allRows[i]!;
		const cells = row.querySelectorAll(
			":scope > td",
		) as unknown as HTMLElement[];

		const nameCell = getCol(colIdx, cells, "name");
		if (!nameCell) continue;

		const nameLink = nameCell.querySelector(
			"a",
		) as unknown as HTMLElement | null;
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
		if (imageCell) {
			const img = imageCell.querySelector(
				"img",
			) as unknown as HTMLElement | null;
			const src = img?.getAttribute("src") ?? "";
			if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
		}

		// Description
		const description =
			getCol(colIdx, cells, "description")
				?.text.trim()
				.replace(/\s+/g, " ") || null;

		// Sell price
		const sellPriceCell = getCol(colIdx, cells, "sell_price");
		const sellPrice = sellPriceCell
			? (parsePriceTiers(sellPriceCell.text)[0] ?? null)
			: null;

		// Location (bullet list)
		const locationCell = getCol(colIdx, cells, "location");
		const location = locationCell ? parseListCell(locationCell) : [];

		artifacts.push({
			name: artifactName,
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

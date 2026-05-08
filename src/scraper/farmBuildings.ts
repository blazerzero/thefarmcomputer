import { parse } from "node-html-parser";
import type { FarmBuildingRow } from "@/types";
import type { CraftIngredient } from "@/types";
import { fetchPage, getCol, parseIntFrom, WIKI_BASE } from "./wiki";

export async function scrapeFarmBuildings(): Promise<
	Omit<FarmBuildingRow, "id" | "last_updated">[]
> {
	const html = await fetchPage("/Carpenter%27s_Shop");
	const root = parse(html);
	const content = root.querySelector("#mw-content-text") ?? root;

	const buildings: Omit<FarmBuildingRow, "id" | "last_updated">[] = [];

	// Find the Farm Buildings wikitable — it immediately follows the h2#Farm_Buildings heading
	const farmBuildingsHeading = content.querySelector("#Farm_Buildings");
	if (!farmBuildingsHeading) {
		console.warn("Could not find Farm Buildings heading");
		return buildings;
	}

	// Walk siblings to find the first wikitable after the heading
	let table = farmBuildingsHeading
		?.closest("h2")
		?.nextElementSibling?.querySelector("table.wikitable");
	if (!table) {
		// Try searching more broadly in the section
		const section = farmBuildingsHeading?.closest("h2")?.parentNode;
		table =
			section
				?.querySelectorAll("table.wikitable")
				.find((t) => t.text.includes("Barn")) ?? null;
	}
	if (!table) {
		console.warn("Could not find Farm Buildings wikitable");
		return buildings;
	}

	const rows = table.querySelectorAll(":scope > tbody > tr");
	if (rows.length < 2) return buildings;

	// Build column index from header row
	const headerCells = rows[0]!.querySelectorAll(":scope > th");
	const colIdx: Record<string, number> = {};
	headerCells.forEach((th, i) => {
		const key = th.text.replace(/\s+/g, " ").trim().toLowerCase();
		colIdx[key] = i;
	});

	// Column keys
	const COL_IMAGE = colIdx["image"] ?? 0;
	const COL_NAME = colIdx["name"] ?? 1;
	const COL_DESC = colIdx["description"] ?? 2;
	const COL_HOUSES = colIdx["houses"] ?? 3;
	const COL_COST = colIdx["cost"] ?? 4;
	const COL_SIZE = colIdx["size"] ?? 5;
	const COL_TIME = colIdx["construction time"] ?? 6;

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i]!;
		const cells = row.querySelectorAll(":scope > td");
		if (cells.length < 4) continue;

		// Image
		const imageCell = cells[COL_IMAGE] ?? null;
		const imgEl = imageCell?.querySelector("img") ?? null;
		const imgSrc = imgEl?.getAttribute("src") ?? null;
		const image_url = imgSrc
			? imgSrc.startsWith("http")
				? imgSrc
				: WIKI_BASE + imgSrc
			: null;

		// Name + wiki URL
		const nameCell = cells[COL_NAME] ?? null;
		const nameLink = nameCell?.querySelector("a") ?? null;
		const name = (nameLink?.text || nameCell?.text || "")
			.replace(/\s+/g, " ")
			.trim();
		const nameHref = nameLink?.getAttribute("href") ?? null;
		const wiki_url = nameHref
			? WIKI_BASE + nameHref
			: WIKI_BASE + "/Carpenter%27s_Shop";

		if (!name) continue;

		// Description
		const descCell = cells[COL_DESC] ?? null;
		const description = descCell?.text.replace(/\s+/g, " ").trim() || null;

		// Animals housed
		const housesCell = cells[COL_HOUSES] ?? null;
		const housesText = housesCell?.text.replace(/\s+/g, " ").trim() || null;
		const animals_housed = housesText || null;

		// Cost cell: gold amount + materials
		const costCell = cells[COL_COST] ?? null;
		let cost: number | null = null;
		const materials: CraftIngredient[] = [];

		if (costCell) {
			// Remove hidden spans before processing
			costCell
				.querySelectorAll('[style*="display: none"], link')
				.forEach((el) => el.remove());

			// Gold amount is in span.no-wrap
			const noWrapSpan = costCell.querySelector("span.no-wrap");
			if (noWrapSpan) {
				cost = parseIntFrom(noWrapSpan.text);
			} else {
				cost = parseIntFrom(costCell.text);
			}

			// Materials are in span.nametemplate elements
			const nametemplateSans = costCell.querySelectorAll("span.nametemplate");
			for (const span of nametemplateSans) {
				const text = span.text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
				if (!text) continue;
				const m = text.match(/^(.+?)\s+\((\d+)\)$/);
				if (m) {
					materials.push({
						name: m[1]!.trim(),
						quantity: parseInt(m[2]!, 10),
					});
				} else {
					materials.push({ name: text, quantity: 1 });
				}
			}
		}

		// Size — get just the bold text (e.g. "7x4"), not the diagram image
		const sizeCell = cells[COL_SIZE] ?? null;
		const sizeBold = sizeCell?.querySelector("b") ?? null;
		const size =
			(sizeBold?.text || sizeCell?.text || "")
				.replace(/\s+/g, " ")
				.trim()
				.split("\n")[0]
				?.trim() || null;

		// Construction time
		const timeCell = cells[COL_TIME] ?? null;
		const construction_time =
			timeCell?.text.replace(/\s+/g, " ").trim() || null;

		buildings.push({
			name,
			description,
			animals_housed,
			cost,
			materials: JSON.stringify(materials),
			size,
			construction_time,
			image_url,
			wiki_url,
		});
	}

	console.log(`Scraped ${buildings.length} farm buildings`);
	return buildings;
}

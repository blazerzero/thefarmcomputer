import { parse } from "node-html-parser";
import { fetchPage } from "./wiki.js";
import type { CropRow } from "../types.js";

const WIKI_BASE = "https://stardewvalleywiki.com";
const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;

function parseIntFrom(text: string): number | null {
  const m = text.replace(/,/g, "").match(/\d+/);
  return m ? parseInt(m[0]!, 10) : null;
}

function parseSeasons(text: string): string[] {
  return SEASONS.filter((s) => text.toLowerCase().includes(s.toLowerCase()));
}

function colIndex(headers: string[], keyword: string): number {
  const kw = keyword.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase().includes(kw));
}

export async function scrapeCrops(): Promise<Omit<CropRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Crops");
  const root = parse(html);

  // Find the crops wikitable (the one whose headers mention "Growth" and "Seed")
  const tables = root.querySelectorAll("table.wikitable");
  let targetTable = null;
  for (const table of tables) {
    const headerText = table.querySelectorAll("th").map((th) => th.text).join(" ").toLowerCase();
    if (headerText.includes("growth") && headerText.includes("seed")) {
      targetTable = table;
      break;
    }
  }

  if (!targetTable) {
    console.error("Could not find crops wikitable");
    return [];
  }

  const rows = targetTable.querySelectorAll("tr");
  if (!rows.length) return [];

  // Build column index map from the header row
  const headerCells = rows[0]!.querySelectorAll("th");
  const headers = headerCells.map((th) => th.text.replace(/\s+/g, " ").trim());

  const idxName     = Math.max(colIndex(headers, "crop"), 0);
  const idxSeasons  = colIndex(headers, "season");
  const idxGrowth   = colIndex(headers, "growth");
  const idxRegrowth = colIndex(headers, "re-grow") !== -1
    ? colIndex(headers, "re-grow")
    : colIndex(headers, "regrow");
  const idxSell     = colIndex(headers, "sell");
  const idxBuy      = colIndex(headers, "seed price") !== -1
    ? colIndex(headers, "seed price")
    : colIndex(headers, "seed");
  const idxTrellis  = colIndex(headers, "trellis");

  const crops: Omit<CropRow, "id" | "last_updated">[] = [];

  for (const row of rows.slice(1)) {
    const cells = row.querySelectorAll("td, th");
    if (cells.length < 3) continue;

    const cellText = (idx: number): string =>
      idx >= 0 && idx < cells.length
        ? cells[idx]!.text.replace(/\s+/g, " ").trim()
        : "";

    const nameCell = cells[idxName >= 0 ? idxName : 0];
    if (!nameCell) continue;
    const name = nameCell.text.replace(/\s+/g, " ").trim();
    if (!name) continue;

    const linkEl = nameCell.querySelector("a");
    const wikiUrl = linkEl?.getAttribute("href")
      ? WIKI_BASE + linkEl.getAttribute("href")!
      : WIKI_BASE + "/Crops";

    const seasonsText  = cellText(idxSeasons);
    const growthText   = cellText(idxGrowth);
    const regrowthText = idxRegrowth >= 0 ? cellText(idxRegrowth) : "";
    const sellText     = cellText(idxSell);
    const buyText      = idxBuy >= 0 ? cellText(idxBuy) : "";
    const trellisText  = idxTrellis >= 0 ? cellText(idxTrellis).toLowerCase() : "";

    crops.push({
      name,
      seasons:       JSON.stringify(parseSeasons(seasonsText)),
      growth_days:   parseIntFrom(growthText),
      regrowth_days: /\d/.test(regrowthText) ? parseIntFrom(regrowthText) : null,
      sell_price:    parseIntFrom(sellText),
      buy_price:     parseIntFrom(buyText),
      is_trellis:    trellisText.includes("yes") || trellisText.includes("✓") ? 1 : 0,
      wiki_url:      wikiUrl,
    });
  }

  console.log(`Scraped ${crops.length} crops`);
  return crops;
}

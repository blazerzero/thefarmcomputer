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

export async function scrapeCrops(): Promise<Omit<CropRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Crops");
  const root = parse(html);

  const content = root.querySelector("#mw-content-text") ?? root;
  const crops: Omit<CropRow, "id" | "last_updated">[] = [];

  // Context tracked as we walk the page in document order
  let currentSeasons: string[] = [];
  let currentCropName = "";
  let currentWikiUrl = "";
  let currentIsTrellis = 0;

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
      continue;
    }

    // ── Crop name heading ───────────────────────────────────────────────────
    if (tag === "H3") {
      const headline = el.querySelector(".mw-headline") ?? el;
      const link = headline.querySelector("a");
      currentCropName = (link?.text ?? headline.text)
        .replace(/\s+/g, " ")
        .trim();
      const href = link?.getAttribute("href");
      currentWikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Crops`;
      currentIsTrellis = 0;
      continue;
    }

    // ── Trellis prose ───────────────────────────────────────────────────────
    if (tag === "P") {
      if (el.text.toLowerCase().includes("trellis")) currentIsTrellis = 1;
      continue;
    }

    // ── Crop data table ─────────────────────────────────────────────────────
    if (!currentCropName || currentSeasons.length === 0) continue;

    const rows = el.querySelectorAll("tr");
    if (rows.length < 2) continue;

    // Header row: Seeds | Stage 1 | … | Harvest | Sells For | …
    const headerCells = rows[0]!.querySelectorAll("th");
    if (headerCells.length === 0) continue;
    const headers = headerCells.map((th) =>
      th.text.replace(/\s+/g, " ").trim().toLowerCase(),
    );

    const idxSeeds   = headers.findIndex((h) => h.includes("seed"));
    const idxHarvest = headers.findIndex((h) => h.includes("harvest"));
    const idxSell    = headers.findIndex((h) => h.includes("sell"));

    // Skip tables that don't match the crop data shape
    if (idxHarvest === -1 || idxSell === -1) continue;

    // Data row immediately after the header
    const dataCells = rows[1]!.querySelectorAll("td");
    const cellText = (idx: number): string =>
      idx >= 0 && idx < dataCells.length
        ? dataCells[idx]!.text.replace(/\s+/g, " ").trim()
        : "";

    const seedsText   = cellText(idxSeeds);
    const harvestText = cellText(idxHarvest);
    const sellText    = cellText(idxSell);

    // Buy price — prefer Pierre's, fall back to any price in the Seeds cell
    const pierreMatch = seedsText.match(/pierre[^:]*:\s*[^\d]*(\d[\d,]*)\s*g/i);
    const anyPriceMatch = seedsText.match(/(\d[\d,]*)\s*g/i);
    const buyPrice = pierreMatch
      ? parseIntFrom(pierreMatch[1]!)
      : anyPriceMatch
        ? parseIntFrom(anyPriceMatch[1]!)
        : null;

    // Growth/regrowth days — "Total: 10 days" / "Regrowth: 3 days"
    const totalMatch    = harvestText.match(/total[^:]*:\s*(\d+)\s*day/i);
    const regrowthMatch = harvestText.match(/regrowth[^:]*:\s*(\d+)\s*day/i);
    const growthDays  = totalMatch ? parseInt(totalMatch[1]!, 10) : parseIntFrom(harvestText);
    const regrowthDays = regrowthMatch ? parseInt(regrowthMatch[1]!, 10) : null;

    // Sell price — first gold amount in the cell is the base quality price
    const sellMatch = sellText.match(/(\d[\d,]*)\s*g(?!\/)/);
    const sellPrice = sellMatch ? parseIntFrom(sellMatch[1]!) : null;

    crops.push({
      name:          currentCropName,
      seasons:       JSON.stringify(currentSeasons),
      growth_days:   growthDays,
      regrowth_days: regrowthDays,
      sell_price:    sellPrice,
      buy_price:     buyPrice,
      is_trellis:    currentIsTrellis,
      wiki_url:      currentWikiUrl,
    });

    // Reset crop context — this table has been consumed
    currentCropName = "";
    currentWikiUrl = "";
    currentIsTrellis = 0;
  }

  console.log(`Scraped ${crops.length} crops`);
  return crops;
}

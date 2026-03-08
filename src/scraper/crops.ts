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

/** Normalize a table row label to a lookup key. */
function rowKey(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function scrapeCrops(): Promise<Omit<CropRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Crops");
  const root = parse(html);

  const content = root.querySelector("#mw-content-text") ?? root;
  const crops: Omit<CropRow, "id" | "last_updated">[] = [];
  let currentSeasons: string[] = [];

  // Walk h2 headings and wikitables in document order.
  // h2 headings tell us which season section we're in.
  // Each wikitable is an individual crop.
  const elements = content.querySelectorAll("h2, table.wikitable");

  for (const el of elements) {
    if (el.tagName === "H2") {
      const headlineText =
        el.querySelector(".mw-headline")?.text.trim() ?? el.text.trim();
      const matched = parseSeasons(headlineText);
      if (matched.length > 0) currentSeasons = matched;
      continue;
    }

    // --- crop table ---
    const rows = el.querySelectorAll("tr");
    if (rows.length < 2) continue;

    // First row: crop name in a <th> (often spans 2 cols)
    const nameCell = rows[0]!.querySelector("th");
    if (!nameCell) continue;

    const nameLink = nameCell.querySelector("a");
    const name = (nameLink?.text ?? nameCell.text).replace(/\s+/g, " ").trim();
    if (!name) continue;

    const href = nameLink?.getAttribute("href");
    const wikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Crops`;

    // Remaining rows: left cell = label, right cell = value
    const kv: Record<string, string> = {};
    for (const row of rows.slice(1)) {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const key = rowKey(cells[0]!.text);
        const value = cells[1]!.text.replace(/\s+/g, " ").trim();
        kv[key] = value;
      }
    }

    // Season: prefer value from the table itself, fall back to section heading
    const tableSeasonsText =
      kv["season"] ?? kv["seasons"] ?? kv["season(s)"] ?? "";
    const seasons = tableSeasonsText
      ? parseSeasons(tableSeasonsText)
      : currentSeasons;

    // Flexible key matching for the fields we care about
    const find = (...keys: string[]): string => {
      for (const k of keys) {
        const v = kv[k];
        if (v !== undefined) return v;
      }
      // partial match fallback
      for (const k of Object.keys(kv)) {
        if (keys.some((needle) => k.includes(needle))) return kv[k]!;
      }
      return "";
    };

    const growthText   = find("growth time", "growth");
    const regrowthText = find("regrowth time", "regrowth", "re-grow time", "re-grow");
    const sellText     = find("sell price", "sell");
    const buyText      = find("seed price", "buy price", "buy", "seed");
    const trellisText  = find("trellis").toLowerCase();

    // Skip tables that don't look like crop data
    if (!growthText && !sellText) continue;

    crops.push({
      name,
      seasons:       JSON.stringify(seasons),
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

import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { MineralRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

// ── Cell parsers ──────────────────────────────────────────────────────────────

function parseSellPrice(cell: HTMLElement): number | null {
  const text = cell.text;
  const m = text.match(/(\d[\d,]*)\s*g/i);
  return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

function parseUsedIn(cell: HTMLElement): string[] {
  // If the cell uses <li> items, those define line boundaries.
  const listItems = cell.querySelectorAll("li");
  if (listItems.length > 0) {
    return (listItems as unknown as HTMLElement[])
      .map(li => li.text.replace(/\s+/g, " ").trim())
      .filter(t => t.length > 0);
  }

  // Otherwise walk child nodes, grouping by <br> boundaries so that
  // comma-separated names like "Clint, Dwarf, Emily (Loved Gift)" stay as
  // one entry rather than being split per <a> tag.
  const items: string[] = [];
  let current = "";
  for (const node of cell.childNodes) {
    if (node.nodeType === 1) {
      const el = node as unknown as HTMLElement;
      if (el.tagName === "BR") {
        const trimmed = current.replace(/\s+/g, " ").trim();
        if (trimmed) items.push(trimmed);
        current = "";
      } else if (!el.getAttribute("href")?.startsWith("/File:")) {
        current += el.text ?? "";
      }
    } else if (node.nodeType === 3) {
      current += node.text;
    }
  }
  const trimmed = current.replace(/\s+/g, " ").trim();
  if (trimmed) items.push(trimmed);
  return items;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeMinerals(): Promise<Omit<MineralRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Minerals");
  const root = parse(html);
  const content = root.querySelector("#mw-content-text") ?? root;

  const minerals: Omit<MineralRow, "id" | "last_updated">[] = [];

  // Stop scraping when we hit these non-data H2 headings
  const STOP_HEADINGS = new Set(["History", "References", "See also", "Navigation", "Notes"]);

  // Singularize common plural section names for cleaner category labels
  const CATEGORY_NAMES: Record<string, string> = {
    "Foraged Minerals": "Foraged Mineral",
    "Gems": "Gem",
    "Geodes": "Geode",
  };

  let currentCategory: string | null = null;

  const elements = content.querySelectorAll("h2, table.wikitable") as unknown as HTMLElement[];

  for (const el of elements) {
    const tag = el.tagName;

    // ── Section heading ───────────────────────────────────────────────────────
    if (tag === "H2") {
      const text = (el.querySelector(".mw-headline") ?? el).text.trim();
      if (STOP_HEADINGS.has(text)) break;
      // Use the mapped name if available, otherwise use the heading text as-is
      currentCategory = CATEGORY_NAMES[text] ?? text;
      continue;
    }

    // ── Mineral data table ────────────────────────────────────────────────────
    if (!currentCategory) continue;

    const allRows = el.querySelectorAll(":scope > tbody > tr") as unknown as HTMLElement[];
    if (allRows.length < 2) continue;

    // Parse header row to build column index map
    const headerRow = allRows[0]!;
    const headerCells = headerRow.querySelectorAll(":scope > th") as unknown as HTMLElement[];
    if (headerCells.length < 3) continue;

    const colIdx: Record<string, number> = {};
    let colI = 0;
    for (const th of headerCells) {
      const text = th.text.toLowerCase().trim();
      const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);
      if (text === "image") colIdx.image = colI;
      else if (text === "name") colIdx.name = colI;
      else if (text === "description") colIdx.description = colI;
      else if (text.includes("sell price") && !text.includes("gemologist")) colIdx.sell_price = colI;
      else if (text.includes("gemologist")) colIdx.sell_price_gemologist = colI;
      else if (text === "source") colIdx.source = colI;
      else if (text.includes("used in")) colIdx.used_in = colI;
      colI += colspan;
    }

    if (colIdx.name === undefined) continue;

    const seenNameCells = new Set<HTMLElement>();

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i]!;
      const cells = row.querySelectorAll(":scope > td") as unknown as HTMLElement[];

      const get = (key: string): HTMLElement | null => {
        const idx = colIdx[key];
        return idx !== undefined ? (cells[idx] ?? null) : null;
      };

      const nameCell = get("name");
      if (!nameCell) continue;

      const nameLink = nameCell.querySelector("a") as unknown as HTMLElement | null;
      if (!nameLink) continue;

      if (seenNameCells.has(nameCell)) continue;
      seenNameCells.add(nameCell);

      const mineralName = nameLink.text.trim();
      if (!mineralName || mineralName.toLowerCase() === "name") continue;

      const href = nameLink.getAttribute("href") ?? "";
      const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

      // Image
      const imageCell = get("image");
      let imageUrl: string | null = null;
      if (imageCell) {
        const img = imageCell.querySelector("img") as unknown as HTMLElement | null;
        const src = img?.getAttribute("src") ?? "";
        if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
      }

      // Description
      const description = get("description")?.text.trim().replace(/\s+/g, " ") || null;

      // Sell price
      const sellPriceCell = get("sell_price");
      const sellPrice = sellPriceCell ? parseSellPrice(sellPriceCell) : null;

      // Gemologist sell price (absent for Geodes)
      const gemCell = get("sell_price_gemologist");
      const sellPriceGemologist = gemCell ? parseSellPrice(gemCell) : null;

      // Source
      const sourceCell = get("source");
      const source = sourceCell ? parseUsedIn(sourceCell) : [];

      // Used in
      const usedInCell = get("used_in");
      const usedIn = usedInCell ? parseUsedIn(usedInCell) : [];

      minerals.push({
        name: mineralName,
        category: currentCategory,
        description,
        sell_price: sellPrice,
        sell_price_gemologist: sellPriceGemologist,
        source: JSON.stringify(source),
        used_in: JSON.stringify(usedIn),
        image_url: imageUrl,
        wiki_url: wikiUrl,
      });
    }
  }

  console.log(`Scraped ${minerals.length} minerals`);
  return minerals;
}

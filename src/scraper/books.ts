import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { BookRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

// ── Cell parsers ──────────────────────────────────────────────────────────────

/**
 * Parse a table cell that may contain multiple locations separated by <br> tags
 * or other block-like elements. Mirrors the approach used in minerals.ts.
 */
function parseListCell(cell: HTMLElement): string[] {
  const items = cell.childNodes;
  const parsedItems: string[] = [];
  let goToNewline = false;
  let text = "";
  items.forEach((item, index) => {
    if (item.rawTagName === "img") return;
    if (item.rawTagName && item.rawTagName !== "a") {
      goToNewline = true;
      if (item.rawTagName === "br") return;
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

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeBooks(): Promise<Omit<BookRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Books");
  const root = parse(html);
  const content = root.querySelector("#mw-content-text") ?? root;

  const books: Omit<BookRow, "id" | "last_updated">[] = [];

  const STOP_HEADINGS = new Set(["History", "References", "See also", "Navigation", "Notes", "Lost Books"]);

  const elements = content.querySelectorAll("h2, table.wikitable") as unknown as HTMLElement[];

  let skip = false;

  for (const el of elements) {
    const tag = el.tagName;

    if (tag === "H2") {
      const text = (el.querySelector(".mw-headline") ?? el).text.trim();
      skip = STOP_HEADINGS.has(text);
      continue;
    }

    if (skip) continue;

    const allRows = el.querySelectorAll(":scope > tbody > tr") as unknown as HTMLElement[];
    if (allRows.length < 2) continue;

    // Parse header row to build column index map
    const headerRow = allRows[0]!;
    const headerCells = headerRow.querySelectorAll(":scope > th") as unknown as HTMLElement[];
    if (headerCells.length < 2) continue;

    const colIdx: Record<string, number> = {};
    let colI = 0;
    for (const th of headerCells) {
      const text = th.text.toLowerCase().trim();
      const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);
      if (text === "image") colIdx.image = colI;
      else if (text === "name") colIdx.name = colI;
      else if (text === "description") colIdx.description = colI;
      else if (text === "subsequent reading") colIdx.subsequent_reading = colI;
      else if (text === "location" || text === "source") colIdx.location = colI;
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

      const bookName = nameLink.text.trim();
      if (!bookName || bookName.toLowerCase() === "name") continue;

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

      // Subsequent reading (optional column)
      const subCell = get("subsequent_reading");
      const subsequentReading = subCell ? (subCell.text.trim().replace(/\s+/g, " ") || null) : null;

      // Location (may be a bulleted list)
      const locationCell = get("location");
      const locationList = locationCell ? parseListCell(locationCell) : [];

      books.push({
        name: bookName,
        description,
        subsequent_reading: subsequentReading,
        location: JSON.stringify(locationList),
        image_url: imageUrl,
        wiki_url: wikiUrl,
      });
    }
  }

  console.log(`Scraped ${books.length} books`);
  return books;
}

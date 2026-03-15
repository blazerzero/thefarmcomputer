import { HTMLElement, parse } from "node-html-parser";
import { rehype } from "rehype";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import strip from "strip-markdown";
import type { ForageableRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";
const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

function parseUsedInCell(cell: HTMLElement): string[] {
    const items = cell.querySelectorAll(":scope > span, :scope > p");
    if (items.length > 0) {
        return items
            .map(item => item.text.replace(/\s+/g, " ").trim())
            .filter(t => t.length > 0);
    }
    return [];
}

function parsePrices(text: string): [number | null, number | null, number | null, number | null] {
  // Match all "Xg" values (exclude "g/" patterns like "7.2g/d")
  const matches = [...text.matchAll(/(\d[\d,]*)\s*g(?![\d/])/g)].map((m) =>
    parseInt(m[1]!.replace(/,/g, ""), 10),
  );
  return [matches[0] ?? null, matches[1] ?? null, matches[2] ?? null, matches[3] ?? null];
}

function parseEnergyHealth(text: string): [number | null, number | null] {
  // Match signed integers in the cell (covers negative values like -50)
  const matches = [...text.matchAll(/-?\d+/g)].map((m) => parseInt(m[0]!, 10));
  return [matches[0] ?? null, matches[1] ?? null];
}

function parseLocations(text: string): string[] {
  // Bullet points are separated by newlines or "•"; split and clean
  return text
    .split(/[\n•]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const mdEngine = rehype()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemark)
  .use(remarkStringify)
  .use(strip, {keep: ["list", "listItem"]})

export async function scrapeForageables(): Promise<Omit<ForageableRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Foraging");
  const root = parse(html);

  const content = root.querySelector("#mw-content-text") ?? root;

  // Find the "Foraged Items" H2 to scope our walk
  const allH2s = content.querySelectorAll("h2");
  const forageH2 = allH2s.find(
    (h) => (h.querySelector(".mw-headline")?.text.trim() ?? h.text.trim()) === "Foraged Items",
  );
  if (!forageH2) {
    console.error("Could not find 'Foraged Items' H2 on the Foraging wiki page");
    return [];
  }

  // Collect all elements after the Foraged Items H2, stopping at the next H2
  const results: Omit<ForageableRow, "id" | "last_updated">[] = [];
  let active = false;
  let currentSeasons: string[] | null = null;
  let currentLocation: string | null = null;

  const elements = content.querySelectorAll("h2, h3, table.wikitable");

  for (const el of elements) {
    const tag = el.tagName;

    if (tag === "H2") {
      if (!active) {
        // Check if this is the Foraged Items section
        const text = el.querySelector(".mw-headline")?.text.trim() ?? el.text.trim();
        if (text === "Foraged Items") active = true;
      } else {
        // We've hit the next H2 section — stop
        break;
      }
      continue;
    }

    if (!active) continue;

    if (tag === "H3") {
      const text = (el.querySelector(".mw-headline")?.text ?? el.text).trim();
      if (SEASONS.includes(text)) {
        currentSeasons = [text];
        currentLocation = null;
      } else {
        currentLocation = text;
        currentSeasons = null;
      }
      continue;
    }

    // wikitable
    if (currentSeasons === null && currentLocation === null) continue;

    const rows = el.querySelectorAll(":scope > tbody > tr");
    if (rows.length < 2) continue;

    // Parse header row to find column indices
    const headerCells = rows[0]!.querySelectorAll(":scope > th, :scope > td");
    if (headerCells.length === 0) continue;
    const headers = headerCells.map((h) => h.text.replace(/\s+/g, " ").trim().toLowerCase());

    const idxImage   = headers.findIndex((h) => h.includes("image"));
    const idxName    = headers.findIndex((h) => h.includes("name"));
    const idxFound   = headers.findIndex((h) => h === "found");
    const idxSeason  = headers.findIndex((h) => h.includes("season"));
    const idxSell    = headers.findIndex((h) => h.includes("sell") || h.includes("price"));
    const idxEnergy  = headers.findIndex((h) => h.includes("energy"));
    const idxUsedIn  = headers.findIndex((h) => h.includes("used"));

    // Skip tables that don't look like forageable data (no name or sell column)
    if (idxName === -1 || idxSell === -1) continue;

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r]!.querySelectorAll(":scope > td");
      if (cells.length === 0) continue;

      const cellText = (idx: number): string =>
        idx >= 0 && idx < cells.length
          ? String(mdEngine.processSync(cells[idx]!.innerHTML)).replaceAll(/\*\s*/gm, "").trim()
          : "";
      
      let imageCell: HTMLElement | null = null;
      if (idxImage >= 0 && idxImage < cells.length) {
        imageCell = cells[idxImage]!;
      }

      // Name + wiki URL + image URL from the Name cell
      const nameCell = idxName >= 0 && idxName < cells.length ? cells[idxName]! : null;
      if (!nameCell) continue;

      const nameLinks = nameCell.querySelectorAll("a");
      const nameLink = nameLinks.find((a) => !a.getAttribute("href")?.startsWith("/File:"));
      const name = (nameLink?.text ?? nameCell.text).replace(/\s+/g, " ").trim();
      if (!name) continue;

      const href = nameLink?.getAttribute("href");
      const wikiUrl = href ? WIKI_BASE + href : `${WIKI_BASE}/Foraging`;

      const imgSrc = imageCell?.querySelector("img")?.getAttribute("src") ?? null;
      const imageUrl = imgSrc ? WIKI_BASE + imgSrc : null;

      // Sell prices
      const [sellPrice, sellSilver, sellGold, sellIridium] = parsePrices(cellText(idxSell));

      // Energy / Health
      const [energy, health] = idxEnergy >= 0 ? parseEnergyHealth(cellText(idxEnergy)) : [null, null];

      // Used In — split on real line boundaries (<li> or <br>) so that
      // comma-separated names like "Clint, Dwarf, Emily (Loved Gift)" remain
      // a single entry rather than being split per <a> tag.
      let usedIn: string[] = [];
      if (idxUsedIn >= 0 && idxUsedIn < cells.length) {
        usedIn = parseUsedInCell(cells[idxUsedIn]!);
      }

      // Seasons and locations depending on context
      let seasons: string[];
      let locations: string[];

      if (currentSeasons !== null) {
        // Seasonal section — "Found" column has the locations
        seasons = currentSeasons;
        locations = idxFound >= 0 ? parseLocations(cellText(idxFound)) : [];
      } else {
        // Location section — optional "Season Found" column
        locations = [currentLocation!];
        if (idxSeason >= 0) {
          const seasonText = cellText(idxSeason);
          if (
            seasonText.toLowerCase().includes("all") ||
            seasonText.trim() === "" ||
            seasonText === "—"
          ) {
            seasons = [];
          } else {
            seasons = SEASONS.filter((s) => seasonText.includes(s));
          }
        } else {
          seasons = []; // No season column = always available
        }
      }

      results.push({
        name,
        seasons:            JSON.stringify(seasons),
        locations:          JSON.stringify(locations),
        sell_price:         sellPrice,
        sell_price_silver:  sellSilver,
        sell_price_gold:    sellGold,
        sell_price_iridium: sellIridium,
        energy,
        health,
        used_in:            JSON.stringify(usedIn),
        image_url:          imageUrl,
        wiki_url:           wikiUrl,
      });
    }
  }

  console.log(`Scraped ${results.length} forageables`);
  return results;
}
